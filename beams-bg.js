// beams-bg.js — vanilla-JS port of a React "BeamsBackground" canvas effect
// (source: web/coach-loading/src/components/ui/beams-background.tsx, an
// untracked local reference file, not shipped). Ported instead of the
// original's ctx.scale(dpr, dpr) — that call is cumulative across resizes
// (each resize scales again on top of the last), so this version calls
// ctx.setTransform(dpr, 0, 0, dpr, 0, 0) every time instead, which always
// resets to an absolute transform. All beam math is done in CSS-pixel
// space (matching the container's logical size), so the DPR scale is the
// only place device pixels enter the picture.
//
// Usage: RepVaneBeams.mount(containerEl, { intensity: "subtle"|"medium"|"strong" })
// -> { destroy() }. The container must be a positioned element (static
// containers get position:relative applied automatically); the canvas is
// inserted as its first child, absolutely filling it, behind existing
// content (see .beams-bg-canvas / .beams-bg-host in styles.css).
(function () {
  "use strict";

  // Hue band comes from the LIVE theme tokens (--accent / --accent-2 /
  // --accent-3 / --accent-tint), read via getComputedStyle at mount time —
  // never a baked-in hex/hue. That means this automatically follows
  // whichever plan theme is active (:root vs :root[data-plan="female"]),
  // instead of hard-coding the default teal palette.
  var FALLBACK_HUE_MIN = 150, FALLBACK_HUE_RANGE = 45; // teal, only if tokens can't be read at all
  var TOKEN_NAMES = ["--accent", "--accent-2", "--accent-3", "--accent-tint"];

  var MINIMUM_BEAMS = 20;
  var OPACITY_MAP = { subtle: 0.7, medium: 0.85, strong: 1 };

  var reduceMotionMQ = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;

  function prefersReducedMotion() {
    return !!(reduceMotionMQ && reduceMotionMQ.matches);
  }

  function hexToHue(hex) {
    if (!hex) return null;
    hex = hex.trim().replace(/^#/, "");
    if (hex.length === 3) hex = hex.split("").map(function (c) { return c + c; }).join("");
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
    var r = parseInt(hex.slice(0, 2), 16) / 255;
    var g = parseInt(hex.slice(2, 4), 16) / 255;
    var b = parseInt(hex.slice(4, 6), 16) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, h = 0;
    if (d !== 0) {
      if (max === r) h = 60 * (((g - b) / d) % 6);
      else if (max === g) h = 60 * ((b - r) / d + 2);
      else h = 60 * ((r - g) / d + 4);
    }
    if (h < 0) h += 360;
    return h;
  }

  // Reads the theme's own accent tokens and turns them into a {min, range}
  // hue band for the beams — padded a little so beams still show some
  // pulsing hue variety, but clamped so it can't blow out into a rainbow
  // spread when the theme's own accents are already far apart on the wheel.
  function computeHueRange(container) {
    var cs = window.getComputedStyle(container || document.documentElement);
    var hues = [];
    for (var i = 0; i < TOKEN_NAMES.length; i++) {
      var hue = hexToHue(cs.getPropertyValue(TOKEN_NAMES[i]));
      if (hue != null) hues.push(hue);
    }
    if (!hues.length) return { min: FALLBACK_HUE_MIN, range: FALLBACK_HUE_RANGE };
    var lo = Math.min.apply(null, hues), hi = Math.max.apply(null, hues);
    var pad = 12;
    lo -= pad; hi += pad;
    var range = hi - lo;
    if (range < 24) { var mid = (lo + hi) / 2; lo = mid - 12; range = 24; }
    if (range > 90) { var mid2 = (lo + hi) / 2; lo = mid2 - 45; range = 90; }
    return { min: lo, range: range };
  }

  function createBeam(width, height, hueRange) {
    return {
      x: Math.random() * width * 1.5 - width * 0.25,
      y: Math.random() * height * 1.5 - height * 0.25,
      width: 30 + Math.random() * 60,
      length: height * 2.5,
      angle: -35 + Math.random() * 10,
      speed: 0.6 + Math.random() * 1.2,
      opacity: 0.12 + Math.random() * 0.16,
      hue: hueRange.min + Math.random() * hueRange.range,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.02 + Math.random() * 0.03
    };
  }

  function resetBeam(beam, index, totalBeams, width, height, hueRange) {
    var column = index % 3;
    var spacing = width / 3;
    beam.y = height + 100;
    beam.x = column * spacing + spacing / 2 + (Math.random() - 0.5) * spacing * 0.5;
    beam.width = 100 + Math.random() * 100;
    beam.speed = 0.5 + Math.random() * 0.4;
    beam.hue = hueRange.min + (index * hueRange.range) / totalBeams;
    beam.opacity = 0.2 + Math.random() * 0.1;
    return beam;
  }

  function drawBeam(ctx, beam, opacityMul) {
    ctx.save();
    ctx.translate(beam.x, beam.y);
    ctx.rotate((beam.angle * Math.PI) / 180);

    var pulsingOpacity = beam.opacity * (0.8 + Math.sin(beam.pulse) * 0.2) * opacityMul;
    var hue = beam.hue;
    var gradient = ctx.createLinearGradient(0, 0, 0, beam.length);
    gradient.addColorStop(0, "hsla(" + hue + ", 85%, 65%, 0)");
    gradient.addColorStop(0.1, "hsla(" + hue + ", 85%, 65%, " + (pulsingOpacity * 0.5) + ")");
    gradient.addColorStop(0.4, "hsla(" + hue + ", 85%, 65%, " + pulsingOpacity + ")");
    gradient.addColorStop(0.6, "hsla(" + hue + ", 85%, 65%, " + pulsingOpacity + ")");
    gradient.addColorStop(0.9, "hsla(" + hue + ", 85%, 65%, " + (pulsingOpacity * 0.5) + ")");
    gradient.addColorStop(1, "hsla(" + hue + ", 85%, 65%, 0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length);
    ctx.restore();
  }

  function mount(container, opts) {
    var noop = { destroy: function () {} };
    if (!container || !container.getBoundingClientRect) return noop;
    opts = opts || {};
    var opacityMul = OPACITY_MAP[opts.intensity] || OPACITY_MAP.strong;

    var canvas = document.createElement("canvas");
    canvas.className = "beams-bg-canvas";
    canvas.setAttribute("aria-hidden", "true");
    container.classList.add("beams-bg-host");
    container.insertBefore(canvas, container.firstChild);

    var ctx = canvas.getContext("2d");
    if (!ctx) {
      return { destroy: function () { if (canvas.parentNode) canvas.parentNode.removeChild(canvas); } };
    }

    // Read once at mount: cheap, and the theme (data-plan) doesn't change
    // without a full re-render of the screen that owns this container.
    var hueRange = computeHueRange(container);

    var beams = [];
    var raf = 0;
    var destroyed = false;
    var staticMode = prefersReducedMotion();
    var w = 0, h = 0;

    function layout() {
      var rect = container.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      var dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      // Absolute reset every time — never compounds like ctx.scale() would
      // across repeated resizes.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var total = Math.round(MINIMUM_BEAMS * 1.5);
      beams = [];
      for (var i = 0; i < total; i++) beams.push(createBeam(w, h, hueRange));

      renderFrame();
    }

    function renderFrame() {
      ctx.clearRect(0, 0, w, h);
      ctx.filter = "blur(35px)";
      for (var i = 0; i < beams.length; i++) drawBeam(ctx, beams[i], opacityMul);
      ctx.filter = "none";
    }

    function animate() {
      if (destroyed) return;
      ctx.clearRect(0, 0, w, h);
      ctx.filter = "blur(35px)";
      var total = beams.length;
      for (var i = 0; i < total; i++) {
        var beam = beams[i];
        beam.y -= beam.speed;
        beam.pulse += beam.pulseSpeed;
        if (beam.y + beam.length < -100) resetBeam(beam, i, total, w, h, hueRange);
        drawBeam(ctx, beam, opacityMul);
      }
      ctx.filter = "none";
      raf = requestAnimationFrame(animate);
    }

    function start() {
      if (destroyed || staticMode || raf) return;
      raf = requestAnimationFrame(animate);
    }
    function stop() {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }

    function onVisibility() {
      if (document.hidden) stop(); else start();
    }
    function onReduceMotionChange() {
      staticMode = prefersReducedMotion();
      if (staticMode) { stop(); renderFrame(); } else { start(); }
    }
    function onResize() { layout(); }

    var ro = null;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(onResize);
      ro.observe(container);
    } else {
      window.addEventListener("resize", onResize);
    }
    document.addEventListener("visibilitychange", onVisibility);
    if (reduceMotionMQ) {
      if (reduceMotionMQ.addEventListener) reduceMotionMQ.addEventListener("change", onReduceMotionChange);
      else if (reduceMotionMQ.addListener) reduceMotionMQ.addListener(onReduceMotionChange);
    }

    layout();
    if (!staticMode && !document.hidden) start();

    return {
      destroy: function () {
        if (destroyed) return;
        destroyed = true;
        stop();
        if (ro) ro.disconnect(); else window.removeEventListener("resize", onResize);
        document.removeEventListener("visibilitychange", onVisibility);
        if (reduceMotionMQ) {
          if (reduceMotionMQ.removeEventListener) reduceMotionMQ.removeEventListener("change", onReduceMotionChange);
          else if (reduceMotionMQ.removeListener) reduceMotionMQ.removeListener(onReduceMotionChange);
        }
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        container.classList.remove("beams-bg-host");
      }
    };
  }

  window.RepVaneBeams = { mount: mount };
})();
