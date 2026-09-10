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
  var META_KEY = "gym_meta_updatedAt";
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

  function readMeta() {
    try { return JSON.parse(localStorage.getItem(META_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function writeMeta(m) {
    try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch (e) {}
  }

  // Every gym_* key currently in localStorage, excluding the meta key itself.
  function gymKeys() {
    var out = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf("gym_") === 0 && k !== META_KEY) out.push(k);
    }
    return out;
  }

  function nowMs() { return Date.now(); }

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
      if (k.indexOf("gym_") !== 0 || k === META_KEY) return;
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

    // First sign-in on this browser: record the account and push whatever local
    // progress exists up to it (syncNow already sends every gym_* key; the
    // server merge is last-write-wins so this is a safe one-way migration).
    var firstSignIn = false;
    try {
      if (p.sub && localStorage.getItem("gym_user_sub") !== p.sub) {
        localStorage.setItem("gym_user_sub", p.sub);
        firstSignIn = true;
      }
    } catch (e) {}

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
    var panel = document.getElementById("sidePanel");
    if (!panel) return null;
    var box = document.getElementById("gymSyncBox");
    if (!box) {
      box = document.createElement("div");
      box.className = "sp-group";
      box.id = "gymSyncBox";
      panel.appendChild(box);
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
        google.accounts.id.prompt();
      } catch (e) { log("[sync] GIS init failed", e && e.message); }
    };
    s.onerror = function () { log("[sync] GIS script failed to load"); };
    document.head.appendChild(s);
  }

  window.GymSync = {
    onLocalWrite: onLocalWrite,
    syncNow: function (r) { return syncNow(r || "manual"); },
    isSignedIn: isSignedIn,
    signOut: signOut,
    _debug: { gymKeys: gymKeys, readMeta: readMeta, buildEntries: buildEntries }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAuth);
  } else {
    initAuth();
  }
})();
