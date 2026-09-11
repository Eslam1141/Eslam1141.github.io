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

  // ---------------- navigation ----------------
  var TABS = ["plan", "coach", "more"];
  var curTab = "plan";

  function screenEl(tab) { return el("screen-" + tab); }

  function navigate(tab, opts) {
    if (TABS.indexOf(tab) === -1) tab = "plan";
    opts = opts || {};
    curTab = tab;
    set("gym_tab", tab);

    var swap = function () {
      TABS.forEach(function (name) {
        var s = screenEl(name);
        if (s) s.hidden = (name !== tab);
      });
      var nav = el("appNav");
      if (nav) {
        nav.querySelectorAll("button[data-tab]").forEach(function (b) {
          var on = b.getAttribute("data-tab") === tab;
          if (on) b.setAttribute("aria-current", "page");
          else b.removeAttribute("aria-current");
        });
      }
      document.body.setAttribute("data-tab", tab);
    };

    var reduce = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!opts.instant && !reduce && document.startViewTransition) {
      document.startViewTransition(swap);
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
  }
  function hideOnboarding() {
    if (ob) ob.hidden = true;
    document.body.classList.remove("onboarding-open");
    document.body.style.overflow = "";
  }

  function rebuild() {
    try { if (typeof window.GymAppRebuild === "function") window.GymAppRebuild(); }
    catch (e) { if (window.console) console.warn("app rebuild failed", e); }
  }
  function refreshCoach() {
    try { if (window.GymCoach && typeof GymCoach.refresh === "function") GymCoach.refresh(); }
    catch (e) { if (window.console) console.warn("coach refresh failed", e); }
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
    wireNav();
    navigate(ls("gym_tab") || "plan", { instant: true, keepScroll: true });

    var cont = el("obContinueBtn");
    if (cont) cont.addEventListener("click", startAnon);
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
