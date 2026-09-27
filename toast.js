/* toast.js — shared bottom "toast / undo bar" component (P1-8, §4.6).
 *
 * Replaces native confirm()/alert() for low-stakes destructive actions
 * (reset-checklist today, and future delete-plan/sign-out flows): the
 * action happens immediately, and this offers a few seconds to undo it
 * instead of asking first. Dependency-free, RTL-safe (centered, no
 * direction-specific positioning needed), respects prefers-reduced-motion
 * via styles.css.
 *
 * API: window.GymToast.show({ message, actionLabel, onAction, duration })
 *   message      — string, required.
 *   actionLabel  — string, optional (e.g. "Undo"). Omit for a plain toast.
 *   onAction     — function, called once if the action is tapped before
 *                  the toast auto-dismisses. Not called on auto-dismiss.
 *   duration     — ms before auto-dismiss, default 5500.
 * Only one toast shows at a time; calling show() again replaces whatever's
 * currently up (its own onAction is simply dropped, never fired late). */
(function () {
  "use strict";

  var root = null;
  var hideTimer = null;

  function ensureRoot() {
    if (root) return root;
    root = document.createElement("div");
    root.id = "gymToast";
    root.className = "gym-toast";
    root.setAttribute("role", "status");
    root.setAttribute("aria-live", "polite");
    document.body.appendChild(root);
    return root;
  }

  function hide() {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    if (root) root.classList.remove("show");
  }

  function show(opts) {
    opts = opts || {};
    var el = ensureRoot();
    if (hideTimer) clearTimeout(hideTimer);
    el.innerHTML = "";

    var msg = document.createElement("span");
    msg.className = "gym-toast-msg";
    msg.textContent = opts.message || "";
    el.appendChild(msg);

    if (opts.actionLabel && typeof opts.onAction === "function") {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "gym-toast-action";
      btn.textContent = opts.actionLabel;
      btn.onclick = function () {
        hide();
        try { opts.onAction(); } catch (e) { if (window.console) console.warn("[toast] action failed", e); }
      };
      el.appendChild(btn);
    }

    // Re-trigger the show transition even if a previous toast was still
    // showing (class already present) — drop to hidden for a frame first.
    el.classList.remove("show");
    requestAnimationFrame(function () { el.classList.add("show"); });

    hideTimer = setTimeout(hide, opts.duration || 5500);
  }

  window.GymToast = { show: show, hide: hide };
})();
