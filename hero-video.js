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

    function markReady() { video.classList.add("is-ready"); }
    video.addEventListener("loadeddata", markReady);
    if (video.readyState >= 2) markReady();

    function kickstartLoad() {
      var p = video.play();
      if (p && typeof p.then === "function") {
        p.then(function () { if (reduced) video.pause(); }).catch(function () {});
      } else if (reduced) {
        video.pause();
      }
    }

    return {
      play: function () {
        if (reduced) return;
        try { var p = video.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
      },
      pause: function () {
        try { video.pause(); } catch (e) {}
      },
      start: function () {
        kickstartLoad();
      }
    };
  }

  window.HeroVideo = { init: initHeroVideo };
})();
