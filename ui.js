/* ui.js — app shell: first-run onboarding and anonymous/auth state.
 *
 * Loads before app.js. Owns the #onboarding screen and the gym_onboarded /
 * gym_anon local flags (never synced). app.js reads gym_anon directly for
 * content gating and exposes window.GymAppRebuild() to re-render after a
 * state change. sync.js calls GymUI.completeSignIn() on a successful sign-in. */
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

  function rebuild() { if (typeof window.GymAppRebuild === "function") window.GymAppRebuild(); }

  function startAnon() {
    set("gym_onboarded", "1");
    set("gym_anon", "1");
    hideOnboarding();
    rebuild();
    window.scrollTo(0, 0);
  }

  // Called by sync.js from onCredential once a Google token is in hand.
  function completeSignIn() {
    set("gym_onboarded", "1");
    del("gym_anon");
    hideOnboarding();
    rebuild();
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
    promptSignIn: promptSignIn
  };

  function boot() {
    ob = el("onboarding");
    if (!ob) return;
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
