/* ui.js — app shell: bottom/side navigation + first-run onboarding + anon state.
 *
 * Loads before app.js. Owns:
 *   - #appNav (Plan / Coach / More) and screen switching via navigate(tab)
 *   - the #onboarding screen and the gym_onboarded / gym_anon local flags
 *
 * app.js reads gym_anon directly for content gating and exposes
 * window.GymAppRebuild() to re-render after a state change. sync.js calls
 * GymUI.completeSignIn() on a successful sign-in. coach.js (optional) exposes
 * window.GymCoach.refresh(). None of the ui.js flags are ever synced. */
(function () {
  "use strict";

  function ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function el(id) { return document.getElementById(id); }

  function isAuthed() {
    return !!(window.GymSync && typeof GymSync.isSignedIn === "function" && GymSync.isSignedIn());
  }
  function isAnon() { return ls("gym_anon") === "1"; }
  function onboarded() { return ls("gym_onboarded") === "1"; }

  var ob = null;
  var heroVideo = null;

  // ---------------- navigation ----------------
  var TABS = ["plan", "coach", "more"];
  var curTab = "plan";

  function screenEl(tab) { return el("screen-" + tab); }

  // Sets aria-current="page" on the #appNav button matching `tab` and clears
  // it on the others. Shared by navigate()'s swap() (real tab-switch clicks)
  // and boot()'s skip-branch (when the inline pre-paint script already put
  // the DOM in the right state and navigate() itself is skipped), so the
  // nav-bar highlight is always correct without duplicating this logic.
  function updateNavHighlight(tab) {
    var nav = el("appNav");
    if (!nav) return;
    nav.querySelectorAll("button[data-tab]").forEach(function (b) {
      var on = b.getAttribute("data-tab") === tab;
      if (on) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
  }

  // Reads --dur-med (e.g. ".28s" or "280ms") off the root element so the
  // fallback's setTimeout stays in lockstep with the CSS animation-duration
  // actually applied by .screen-fade-out-fallback, instead of a hardcoded
  // value that could drift from the token. Falls back to 280ms (the
  // current --dur-med value) if the property can't be read/parsed.
  function fallbackDurMs() {
    try {
      var raw = getComputedStyle(document.documentElement)
        .getPropertyValue("--dur-med").trim();
      var ms = raw.indexOf("ms") !== -1 ? parseFloat(raw) : parseFloat(raw) * 1000;
      if (!isNaN(ms) && ms > 0) return ms;
    } catch (e) {}
    return 280;
  }

  // In-flight state for the CSS-class fallback (setTimeout-based swap, used
  // when document.startViewTransition isn't available). Native View
  // Transitions auto-supersede a still-running transition when a new one
  // starts; the fallback needs to replicate that explicitly, or two nav
  // calls landing within one --dur-med window (e.g. two rapid taps) can (a)
  // let the FIRST call's stale scheduled swap fire and briefly show a
  // screen nobody asked for, and (b) leave a fade-in class stuck forever on
  // a screen that gets hidden (which cancels its animation without firing
  // `animationend`) before its fade-in finishes.
  var pendingFallbackTimer = null;
  var pendingFallbackIncoming = null;
  var pendingFallbackIncomingCleanup = null;

  // Cancels any scheduled-but-not-yet-fired fallback swap, and if a
  // previous fallback swap already fired and is still mid-fade-in, finishes
  // it synchronously (removes the class + detaches its animationend
  // listener) so nothing about a superseded navigate() call remains
  // visible or attached. Safe to call unconditionally at the top of every
  // navigate(), whether or not a fallback is actually pending.
  function cancelPendingFallback() {
    if (pendingFallbackTimer !== null) {
      clearTimeout(pendingFallbackTimer);
      pendingFallbackTimer = null;
    }
    if (pendingFallbackIncoming) {
      pendingFallbackIncoming.classList.remove("screen-fade-in-fallback");
      if (pendingFallbackIncomingCleanup) {
        pendingFallbackIncoming.removeEventListener("animationend", pendingFallbackIncomingCleanup);
      }
      pendingFallbackIncoming = null;
      pendingFallbackIncomingCleanup = null;
    }
    var stillFadingOut = document.querySelector(".screen-fade-out-fallback");
    if (stillFadingOut) stillFadingOut.classList.remove("screen-fade-out-fallback");
  }

  function navigate(tab, opts) {
    if (TABS.indexOf(tab) === -1) tab = "plan";
    opts = opts || {};
    curTab = tab;
    set("gym_tab", tab);
    cancelPendingFallback();

    var swap = function () {
      TABS.forEach(function (name) {
        var s = screenEl(name);
        if (s) s.hidden = (name !== tab);
      });
      updateNavHighlight(tab);
      document.body.setAttribute("data-tab", tab);
    };

    var reduce = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!opts.instant && !reduce && document.startViewTransition) {
      document.startViewTransition(swap);
    } else if (!opts.instant && !reduce) {
      // Fallback for browsers without the View Transitions API (Firefox/
      // Safari): fade the outgoing screen out, swap the DOM once it's
      // invisible, then fade the incoming screen in. swap() itself is
      // synchronous (just toggles `hidden`), so old/new are never both
      // visible at once — no overlap/double-render mid-transition.
      var outgoing = document.querySelector(".screen:not([hidden])");
      if (outgoing) outgoing.classList.add("screen-fade-out-fallback");
      pendingFallbackTimer = setTimeout(function () {
        pendingFallbackTimer = null;
        swap();
        var incoming = document.querySelector(".screen:not([hidden])");
        if (incoming) {
          incoming.classList.add("screen-fade-in-fallback");
          pendingFallbackIncoming = incoming;
          pendingFallbackIncomingCleanup = function () {
            incoming.classList.remove("screen-fade-in-fallback");
            pendingFallbackIncoming = null;
            pendingFallbackIncomingCleanup = null;
          };
          incoming.addEventListener("animationend", pendingFallbackIncomingCleanup, { once: true });
        }
        if (outgoing) outgoing.classList.remove("screen-fade-out-fallback");
      }, fallbackDurMs());
    } else {
      swap();
    }

    if (!opts.keepScroll) { try { window.scrollTo(0, 0); } catch (e) {} }
    if (tab === "coach" && window.GymCoach && typeof GymCoach.refresh === "function") {
      try { GymCoach.refresh(); } catch (e) { if (window.console) console.warn("coach refresh failed", e); }
    }
  }

  function wireNav() {
    var nav = el("appNav");
    if (!nav) return;
    nav.querySelectorAll("button[data-tab]").forEach(function (b) {
      b.addEventListener("click", function () { navigate(b.getAttribute("data-tab")); });
    });
  }

  // ---------------- onboarding ----------------
  function showOnboarding() {
    if (!ob) return;
    ob.hidden = false;
    document.body.classList.add("onboarding-open");
    var pc = el("planChooser"); if (pc) pc.hidden = true;
    document.body.style.overflow = "hidden";
    window.scrollTo(0, 0);
    if (heroVideo) { heroVideo.start(); heroVideo.play(); }
  }
  function hideOnboarding() {
    if (ob) ob.hidden = true;
    document.body.classList.remove("onboarding-open");
    document.body.style.overflow = "";
    if (heroVideo) heroVideo.pause();
  }

  function rebuild() {
    try { if (typeof window.GymAppRebuild === "function") window.GymAppRebuild(); }
    catch (e) { if (window.console) console.warn("app rebuild failed", e); }
  }
  function refreshCoach() {
    try { if (window.GymCoach && typeof GymCoach.refresh === "function") GymCoach.refresh(); }
    catch (e) { if (window.console) console.warn("coach refresh failed", e); }
    try { if (window.GymCalendar && typeof GymCalendar.refresh === "function") GymCalendar.refresh(); }
    catch (e) { if (window.console) console.warn("calendar refresh failed", e); }
  }

  function startAnon() {
    set("gym_onboarded", "1");
    set("gym_anon", "1");
    hideOnboarding();
    rebuild();
    refreshCoach();
    navigate("plan", { instant: true });
  }

  // Called by sync.js from onCredential once a Google token is in hand.
  function completeSignIn() {
    set("gym_onboarded", "1");
    del("gym_anon");
    hideOnboarding();
    rebuild();
    refreshCoach();
  }

  // A locked control asks the user to sign in: bring the hero back so the
  // Google button is reachable.
  function promptSignIn() { showOnboarding(); }

  window.GymUI = {
    isAuthed: isAuthed,
    isAnon: isAnon,
    onboarded: onboarded,
    startAnon: startAnon,
    completeSignIn: completeSignIn,
    promptSignIn: promptSignIn,
    navigate: navigate,
    currentTab: function () { return curTab; }
  };

  function boot() {
    ob = el("onboarding");
    if (window.HeroVideo) heroVideo = window.HeroVideo.init(".ob-video");
    wireNav();
    // The inline pre-paint script in index.html already applied gym_tab to
    // the DOM before this ran (to avoid a flash of #screen-plan). Only call
    // navigate() here if the DOM doesn't already reflect the target tab —
    // otherwise this is a second, redundant application of the same key
    // that itself caused a visible flash/redirect on refresh. curTab is
    // still always initialized so later same-tab clicks behave correctly.
    var targetTab = ls("gym_tab") || "plan";
    curTab = targetTab;
    if (document.body.getAttribute("data-tab") !== targetTab) {
      navigate(targetTab, { instant: true, keepScroll: true });
    } else {
      // navigate()/swap() were skipped, but swap() is also the only thing
      // that sets aria-current on the #appNav buttons — without this, the
      // nav bar would stay highlighted on "Plan" (the static HTML default)
      // until the user's first tap, even though the correct screen is shown.
      updateNavHighlight(targetTab);
    }

    var cont = el("obContinueBtn");
    if (cont) cont.addEventListener("click", startAnon);
    if (cont && window.MetallicButton) {
      window.MetallicButton.enhance(cont, { shellClass: "metallic-shell--ob", idleSpeed: 0.35, hoverSpeed: 0.7 });
    }
    var whyToggle = el("obWhyToggle");
    var why = el("obWhy");
    if (whyToggle && why) {
      whyToggle.addEventListener("click", function () {
        var open = why.classList.toggle("open");
        whyToggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
    if (!onboarded()) showOnboarding();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
