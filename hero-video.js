/* hero-video.js — vanilla port of the "scroll-locked video hero" component,
 * adapted for #onboarding: that section is a fixed full-screen overlay, not
 * a scrollable page, so there is nothing to scroll-scrub. Instead this plays
 * a muted, looping ambient background video behind the existing onboarding
 * card and fades it in once the first frame is ready, with the same iOS
 * "kickstart" autoplay trick the original component used (iOS Safari often
 * won't buffer any video data until playback actually starts).
 */
(function () {
  "use strict";

  function initHeroVideo(selector) {
    var video = document.querySelector(selector);
    if (!video) return null;

    var reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    // The 9.8MB clip is only worth fetching where it is visible and cheap:
    // hidden at >=1024px (signin-fx.css), skipped on Save-Data, slow links and
    // reduced motion. Until then the gradient overlay is the fallback.
    function allowed() {
      if (reduced) return false;
      if (window.matchMedia && window.matchMedia("(min-width:1024px)").matches) return false;
      var c = navigator.connection;
      if (c && (c.saveData || /(^|-)2g$|^3g$/.test(c.effectiveType || ""))) return false;
      return true;
    }
    function load() {
      if (video.getAttribute("src") || !video.dataset.src || !allowed()) return false;
      video.src = video.dataset.src;
      return true;
    }

    function markReady() { video.classList.add("is-ready"); }
    video.addEventListener("loadeddata", markReady);
    if (video.readyState >= 2) markReady();

    function kickstartLoad() {
      if (!allowed()) return;
      load();
      var p = video.play();
      if (p && typeof p.then === "function") {
        p.then(function () { if (reduced) video.pause(); }).catch(function () {});
      } else if (reduced) {
        video.pause();
      }
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { try { video.pause(); } catch (e) {} }
      else if (!video.closest("[hidden]")) api.play();
    });

    var api = {
      play: function () {
        if (!allowed() || !video.getAttribute("src") || document.hidden) return;
        try { var p = video.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
      },
      pause: function () {
        try { video.pause(); } catch (e) {}
      },
      start: function () {
        // After first paint so the 9.8MB fetch never competes with render.
        requestAnimationFrame(function () { setTimeout(kickstartLoad, 0); });
      }
    };
    return api;
  }

  window.HeroVideo = { init: initHeroVideo };
})();
