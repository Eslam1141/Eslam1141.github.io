/* sync.js — offline-first background sync for workout progress.
 *
 * localStorage stays the source of truth. This layer mirrors gym_* keys to the
 * gym-be backend when the user is signed in with Google and online. Every
 * network path fails silently: with no GOOGLE_CLIENT_ID, or offline, or on any
 * error, the app behaves exactly as it does without this file. */
(function () {
  "use strict";

  var API_BASE = (window.GYM_API_BASE || "/api/v1").replace(/\/+$/, "");
  var CLIENT_ID = window.GOOGLE_CLIENT_ID || "";
  // _debug.onCredential lets a caller hand sync.js an arbitrary, unverified
  // credential string and have it trusted as a real signed-in identity (real
  // sign-in only ever gets here via a signature Google's own SDK already
  // checked) — invaluable for testing, but not something to leave reachable
  // by any script on the real site real users visit. Gate it (and the
  // account-data wipe it can trigger) off the production origin.
  var IS_PROD = (function () {
    try { return location.hostname === "gym-app.cloider.app"; } catch (e) { return false; }
  })();
  var META_KEY = "gym_meta_updatedAt";
  // Device-local cache of the last Google ID token (NOT gym_-prefixed => never
  // synced). Without this, every reload started signed-out and waited on a
  // fresh Google round-trip (GIS auto-select / One Tap) to sign back in —
  // slow, and unreliable on mobile browsers that restrict third-party/FedCM
  // prompts, so it looked like "asks me to sign in again on every refresh."
  // Restoring it instantly on load fixes that; GIS still silently renews it
  // in the background before it expires.
  var SESSION_KEY = "gymauth_session";
  // Device-local keys that must NEVER round-trip through the server. gym_user_sub
  // especially: if a stale value comes back down it flips the "account switched"
  // check on the next load and can wedge the app in a reload loop.
  var LOCAL_ONLY = { gym_meta_updatedAt: 1, gym_user_sub: 1, gym_tab: 1, gym_anon: 1 };
  function syncable(k) { return k && k.indexOf("gym_") === 0 && !LOCAL_ONLY[k]; }
  var FETCH_TIMEOUT_MS = 8000;
  var DEBOUNCE_MS = 3000;
  var INTERVAL_MS = 120000;

  var idToken = null;        // current Google ID token
  var tokenExpEpoch = 0;     // seconds since epoch
  var profile = null;        // { email, name }
  var debounceTimer = null;
  var intervalId = null;
  var refreshTimer = null;
  var syncing = false;
  var triggersStarted = false;

  function log() {
    if (window.console && console.debug) console.debug.apply(console, arguments);
  }

  // sessionStorage, not localStorage: this holds a live bearer credential.
  // sessionStorage still survives a reload (fixes "signs out on refresh")
  // but is cleared when the tab/browser closes, instead of sitting on disk
  // indefinitely on a shared/public device.
  function loadCachedSession() {
    try {
      var s = JSON.parse(sessionStorage.getItem(SESSION_KEY));
      // 30s safety margin, same as isSignedIn()'s own check
      if (s && s.token && s.exp && s.exp * 1000 > nowMs() + 30000) return s;
    } catch (e) {}
    return null;
  }
  function saveCachedSession() {
    try {
      if (idToken && tokenExpEpoch) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token: idToken, exp: tokenExpEpoch, profile: profile }));
      }
    } catch (e) {}
  }
  function clearCachedSession() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  function readMeta() {
    try { return JSON.parse(localStorage.getItem(META_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function writeMeta(m) {
    try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch (e) {}
  }

  // Every syncable gym_* key currently in localStorage (device-local keys excluded).
  function gymKeys() {
    var out = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (syncable(k)) out.push(k);
    }
    return out;
  }

  function nowMs() { return Date.now(); }

  // Wipe this browser's per-user data so a different account doesn't inherit it.
  // Keeps device/UI-only prefs. Called on sign-out and on an account switch.
  function clearUserData() {
    clearCachedSession(); // don't let a stale cached token restore the old account
    var keep = { gym_onboarded: 1, gym_lang: 1, gym_tab: 1, gym_anon: 1 };
    try {
      var rm = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k) continue;
        if ((k.indexOf("gym_") === 0 && !keep[k]) || k.indexOf("gymcoach_") === 0) rm.push(k);
      }
      rm.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) {}
  }

  function isSignedIn() {
    return !!idToken && (tokenExpEpoch === 0 || tokenExpEpoch * 1000 > nowMs() + 30000);
  }

  // ---- called by app.js on every gym_* write ----
  function onLocalWrite(key) {
    var m = readMeta();
    m[key] = nowMs();
    writeMeta(m);
    scheduleDebouncedSync();
  }

  function scheduleDebouncedSync() {
    if (!isSignedIn()) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () { syncNow("debounce"); }, DEBOUNCE_MS);
  }

  // ---- reconcile ----
  function buildEntries() {
    var m = readMeta();
    var entries = {};
    gymKeys().forEach(function (k) {
      var v = localStorage.getItem(k);
      if (v === null) return;
      entries[k] = { value: v, updatedAt: new Date(m[k] || 0).toISOString() };
    });
    return entries;
  }

  function applyMerged(entries) {
    if (!entries) return false;
    var m = readMeta();
    var changed = false;
    Object.keys(entries).forEach(function (k) {
      if (!syncable(k)) return;
      var remote = entries[k];
      var remoteMs = Date.parse(remote.updatedAt) || 0;
      var localMs = m[k] || 0;
      var localVal = localStorage.getItem(k);
      if (remoteMs > localMs || (remoteMs === localMs && localVal !== remote.value)) {
        try { localStorage.setItem(k, remote.value); } catch (e) { return; }
        m[k] = remoteMs;
        changed = true;
      }
    });
    if (changed) writeMeta(m);
    return changed;
  }

  function fetchWithTimeout(url, opts) {
    opts = opts || {};
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, FETCH_TIMEOUT_MS);
    opts.signal = ctrl.signal;
    return fetch(url, opts).finally(function () { clearTimeout(t); });
  }

  function syncNow(reason) {
    if (syncing || !isSignedIn()) return Promise.resolve(false);
    syncing = true;
    log("[sync] start", reason);
    var body = JSON.stringify({ entries: buildEntries() });
    return fetchWithTimeout(API_BASE + "/progress", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + idToken },
      body: body
    })
      .then(function (res) {
        if (res.status === 401) { handleAuthLost(); return null; }
        if (!res.ok) throw new Error("progress PUT " + res.status);
        return res.json();
      })
      .then(function (doc) {
        if (!doc) return false;
        var changed = applyMerged(doc.entries);
        if (changed && typeof window.GymApplyExternalUpdate === "function") {
          window.GymApplyExternalUpdate();
        } else if (changed) {
          location.reload();
        }
        log("[sync] ok, changed=", changed);
        return changed;
      })
      .catch(function (e) { log("[sync] failed", e && e.message); return false; })
      .finally(function () { syncing = false; });
  }

  function startTriggers() {
    if (triggersStarted) return;
    triggersStarted = true;
    window.addEventListener("online", function () { syncNow("online"); });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") syncNow("visible");
    });
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(function () {
      if (document.visibilityState === "visible") syncNow("interval");
    }, INTERVAL_MS);
  }

  // ---- auth (Google Identity Services) ----
  function parseJwt(jwt) {
    try {
      var payload = JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      return { exp: payload.exp || 0, email: payload.email || "", name: payload.name || "", sub: payload.sub || "" };
    } catch (e) { return { exp: 0, email: "", name: "", sub: "" }; }
  }

  function onCredential(response) {
    if (!response || !response.credential) return;
    idToken = response.credential;
    var p = parseJwt(idToken);
    tokenExpEpoch = p.exp;
    profile = { email: p.email, name: p.name };

    var storedSub = null;
    try { storedSub = localStorage.getItem("gym_user_sub"); } catch (e) {}

    // Account switch on a shared browser: the previous user's data is still in
    // localStorage and would otherwise be shown to — and pushed up for — the
    // new account. Wipe it and reload once; GIS auto-select signs the new
    // account straight back in and its data is pulled fresh. A sessionStorage
    // flag prevents a second wipe+reload if GIS bounces between accounts.
    if (p.sub && storedSub && storedSub !== p.sub) {
      var justSwitched = false;
      try { justSwitched = sessionStorage.getItem("gym_switch") === "1"; } catch (e) {}
      if (justSwitched) {
        try { localStorage.setItem("gym_user_sub", p.sub); } catch (e) {}
        try { sessionStorage.removeItem("gym_switch"); } catch (e) {}
      } else {
        clearUserData();
        try { localStorage.setItem("gym_user_sub", p.sub); } catch (e) {}
        try { localStorage.removeItem("gym_anon"); } catch (e) {}
        try { sessionStorage.setItem("gym_switch", "1"); } catch (e) {}
        location.reload();
        return;
      }
    } else {
      try { sessionStorage.removeItem("gym_switch"); } catch (e) {}
    }

    // First sign-in on this browser: record the account and push whatever local
    // (anonymous) progress exists up to it — a safe one-way LWW migration.
    var firstSignIn = false;
    try {
      if (p.sub && storedSub !== p.sub) {
        localStorage.setItem("gym_user_sub", p.sub);
        firstSignIn = true;
      }
    } catch (e) {}

    saveCachedSession();
    if (window.GymUI && typeof GymUI.completeSignIn === "function") GymUI.completeSignIn();
    renderAuthUI();
    startTriggers();
    syncNow(firstSignIn ? "signin-migrate" : "signin");
    scheduleTokenRefresh();
  }

  function scheduleTokenRefresh() {
    if (refreshTimer) clearTimeout(refreshTimer);
    if (!tokenExpEpoch) return;
    var ms = tokenExpEpoch * 1000 - nowMs() - 120000;
    if (ms < 10000) ms = 10000;
    refreshTimer = setTimeout(function () {
      if (window.google && google.accounts && google.accounts.id) {
        google.accounts.id.prompt();
      }
    }, ms);
  }

  function handleAuthLost() {
    idToken = null; tokenExpEpoch = 0; profile = null;
    renderAuthUI();
  }

  function signOut() {
    handleAuthLost();
    clearUserData();                            // don't leave this account's data for the next person
    try {
      localStorage.setItem("gym_anon", "1");   // back to the gated preview
      localStorage.removeItem("gym_user_sub");
    } catch (e) {}
    try {
      if (window.google && google.accounts && google.accounts.id) {
        google.accounts.id.disableAutoSelect();
      }
    } catch (e) {}
    if (typeof window.GymAppRebuild === "function") window.GymAppRebuild();
  }

  function ensureAuthContainer() {
    var host = document.getElementById("moreAccount");
    if (!host) return null;
    var box = document.getElementById("gymSyncBox");
    if (!box) {
      box = document.createElement("div");
      box.id = "gymSyncBox";
      host.appendChild(box);
    }
    return box;
  }

  function renderGoogleButton(target, opts) {
    if (!target || !(window.google && google.accounts && google.accounts.id)) return;
    try {
      target.innerHTML = "";
      google.accounts.id.renderButton(target, opts);
    } catch (e) {}
  }

  function renderAuthUI() {
    var signedIn = isSignedIn();

    // The onboarding hero's Google button (primary sign-in surface).
    var ob = document.getElementById("obGoogleBtn");
    if (ob && !signedIn) {
      renderGoogleButton(ob, { theme: "filled_blue", size: "large", type: "standard", shape: "pill", width: 260 });
    }

    var box = ensureAuthContainer();
    if (!box) return;
    if (signedIn) {
      box.innerHTML =
        '<div class="sp-label">Sync</div>' +
        '<div class="sync-signed">Signed in as <b></b></div>' +
        '<button id="gymSyncOut">Sign out</button>';
      box.querySelector(".sync-signed b").textContent = (profile && profile.email) || "";
      box.querySelector("#gymSyncOut").onclick = signOut;
    } else {
      box.innerHTML =
        '<div class="sp-label">Sync</div>' +
        '<div id="gymSyncBtn"></div>' +
        '<p class="sync-hint">Sign in to back up progress across devices.</p>';
      renderGoogleButton(box.querySelector("#gymSyncBtn"),
        { theme: "outline", size: "medium", type: "standard" });
    }
  }

  function initAuth() {
    if (!CLIENT_ID) { log("[sync] no GOOGLE_CLIENT_ID, sync disabled"); return; }

    // Restore a still-valid session immediately, before the Google script even
    // loads — the app should look signed-in on the very first paint of a
    // reload, not flash "signed out" while GIS does a network round-trip.
    var cached = loadCachedSession();
    if (cached) {
      idToken = cached.token;
      tokenExpEpoch = cached.exp;
      profile = cached.profile || null;
      if (window.GymUI && typeof GymUI.completeSignIn === "function") GymUI.completeSignIn();
      renderAuthUI();
      startTriggers();
      scheduleTokenRefresh();
    }

    var s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true; s.defer = true;
    s.onload = function () {
      try {
        google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: onCredential,
          auto_select: true,
          use_fedcm_for_prompt: true
        });
        renderAuthUI();
        // Only auto-prompt (One Tap) when we don't already have a live
        // session. Firing it unconditionally alongside the onboarding
        // screen's own explicit "Sign in with Google" button is what made a
        // first-time visit show two separate sign-in prompts.
        if (!isSignedIn()) google.accounts.id.prompt();
      } catch (e) { log("[sync] GIS init failed", e && e.message); }
    };
    s.onerror = function () { log("[sync] GIS script failed to load"); };
    document.head.appendChild(s);
  }

  window.GymSync = {
    onLocalWrite: onLocalWrite,
    syncNow: function (r) { return syncNow(r || "manual"); },
    isSignedIn: isSignedIn,
    // Current Google ID token for auth..."Bearer" calls to gym-be / gym-assistant.
    // null when signed out or the token is within 30s of expiry.
    token: function () { return isSignedIn() ? idToken : null; },
    profile: function () { return profile ? { email: profile.email, name: profile.name } : null; },
    signOut: signOut,
    _debug: {
      gymKeys: gymKeys, readMeta: readMeta, buildEntries: buildEntries,
      loadCachedSession: loadCachedSession, clearCachedSession: clearCachedSession,
      // identity-forging / data-wiping hooks: test builds only, never on the
      // real production origin (see IS_PROD above).
      onCredential: IS_PROD ? undefined : onCredential,
      clearUserData: IS_PROD ? undefined : clearUserData
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAuth);
  } else {
    initAuth();
  }
})();
