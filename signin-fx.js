/* signin-fx.js — visual layer for the onboarding/sign-in screen (#onboarding).
 *
 * Builds the decorative left panel (concentric ripple rings + orbiting gym
 * icons + gradient headline; shown by signin-fx.css at >=1024px only), drives
 * the input mouse-glow (--x/--y) and the password show/hide eye. Purely
 * presentational: no auth logic, no IDs the auth flow relies on. All motion
 * is CSS keyframes (transform/opacity), paused for free because
 * #onboarding[hidden] is display:none. */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  // lucide-style icons (24x24, 2px round stroke), inline so nothing loads.
  var ICONS = {
    dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    timer: '<path d="M10 2h4M12 14l3-3"/><circle cx="12" cy="14" r="8"/>',
    trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
    apple: '<path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"/><path d="M10 2c1 .5 2 2 2 5"/>',
    bike: '<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'
  };
  // [icon, orbit radius px, start angle deg, seconds per turn, reverse]
  var ORBITS = [
    ["dumbbell", 120, 0, 18, 0], ["heart", 120, 180, 18, 0],
    ["flame", 190, 60, 26, 1], ["timer", 190, 240, 26, 1],
    ["trophy", 260, 0, 34, 0], ["apple", 260, 120, 34, 0], ["bike", 260, 240, 34, 0],
    ["activity", 330, 90, 44, 1], ["zap", 330, 210, 44, 1], ["target", 330, 330, 44, 1]
  ];
  var RINGS = 9, RING_BASE = 210, RING_STEP = 70;

  function build(stage) {
    var rings = stage.querySelector(".fx-rings");
    var orbits = stage.querySelector(".fx-orbits");
    if (!rings || !orbits || rings.firstChild) return;
    var i, frag = document.createDocumentFragment();
    for (i = 0; i < RINGS; i++) {
      var r = document.createElement("span");
      r.className = "fx-ring" + (i === RINGS - 1 ? " fx-ring-dash" : "");
      var size = RING_BASE + i * RING_STEP;
      r.style.cssText = "--s:" + size + "px;--o:" + (1 - i / (RINGS + 1)).toFixed(2) + ";--d:" + (i * 0.12).toFixed(2) + "s";
      frag.appendChild(r);
    }
    rings.appendChild(frag);
    frag = document.createDocumentFragment();
    ORBITS.forEach(function (o) {
      var w = document.createElement("span");
      w.className = "fx-orb" + (o[4] ? " fx-orb-rev" : "");
      w.style.cssText = "--r:" + o[1] + "px;--a:" + o[2] + ";--t:" + o[3] + "s";
      var svg = document.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("aria-hidden", "true");
      svg.innerHTML = ICONS[o[0]];
      w.appendChild(svg);
      frag.appendChild(w);
    });
    orbits.appendChild(frag);
  }

  function init() {
    var ob = document.getElementById("onboarding");
    if (!ob) return;
    var stage = ob.querySelector(".ob-stage");
    if (stage) build(stage);

    // Mouse-follow glow: only sets two custom properties; the visible radius
    // (0 -> 100px on :hover) is pure CSS.
    var glowEl = null, glowX = 0, glowY = 0, glowRaf = 0;
    function paintGlow() {
      glowRaf = 0;
      var b = glowEl.getBoundingClientRect();
      glowEl.style.setProperty("--x", (glowX - b.left) + "px");
      glowEl.style.setProperty("--y", (glowY - b.top) + "px");
    }
    ob.addEventListener("mousemove", function (e) {
      var g = e.target.closest && e.target.closest(".ae-glow");
      if (!g) return;
      glowEl = g; glowX = e.clientX; glowY = e.clientY;
      if (!glowRaf) glowRaf = requestAnimationFrame(paintGlow);
    }, { passive: true });

    ob.addEventListener("click", function (e) {
      var btn = e.target.closest && e.target.closest(".ae-eye");
      if (!btn) return;
      var input = btn.parentNode.querySelector("input");
      if (!input) return;
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.setAttribute("aria-pressed", show ? "true" : "false");
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
