/* workout-builder.js — the drag-and-drop "Build Your Own Plan" screen.
 *
 * Reads the `shape`, `shape2` and `tier` tags Task 1 added to every
 * exercise across DAYS_PREVIEW, DAYS_MALE, DAYS_FEMALE, DAYS_MALE_CAL and
 * DAYS_FEMALE_CAL (top-level `const`s declared in app.js, which loads
 * first and non-deferred, so they're already defined by the time this
 * deferred script runs) plus the MUSCLE_SHAPES catalog (also an app.js
 * const), and lets the user drag exercises into day cards while
 * enforcing one exercise per muscle "shape" across the whole plan
 * (canPlace()/shapesUsed()).
 *
 * Renders into #coachBody — the same mount point coach.js's own screen
 * uses. Task 3 (not yet done) wires an entry-point button inside the
 * Coach screen that calls GymWorkoutBuilder.open(), and defines
 * window.GymWorkoutBuilderSave (called from this screen's Save button).
 * Task 4 (not yet done) registers this file's <script> tag in index.html.
 * Loads after app.js (reads its DAYS_* and MUSCLE_SHAPES globals) and
 * after ui.js. No external deps.
 *
 * NOTE on i18n/DOM helpers: h()/lang()/s()/mount() are NOT shared globals
 * anywhere in this codebase — coach.js and calendar.js each define their
 * own local copies inside their own IIFE (verified by reading both files;
 * app.js's own string table is a *different* object, `const T`, read via
 * `t()`, used only for static data-i18n HTML bindings — no dynamically
 * rendered screen module reads from it). This module follows that same
 * established convention: its own local STR/s()/lang()/h(), matching
 * calendar.js's exact pattern, and its own local mount() into #coachBody,
 * matching coach.js's exact pattern.
 *
 * Public API: window.GymWorkoutBuilder = { open, exportAsWorkoutPlan }.
 * exportAsWorkoutPlan() -> { split: "Custom", days: [{day, exercises:
 * [{name, sets, reps, restSec}]}] } — the exact shape coach.js's
 * renderWorkout()/mapWorkout() already consume (coach.js:1045-1079).
 */
(function () {
  "use strict";

  // ---------------- i18n (same local pattern as coach.js/calendar.js) ----------------
  function lang() {
    try { if (window.activeLang === "ar") return "ar"; } catch (e) {}
    try { return localStorage.getItem("gym_lang") === "ar" ? "ar" : "en"; } catch (e) { return "en"; }
  }
  var STR = {
    wbTitle: ["Build Your Own Plan", "ابنِ خطتك الخاصة"],
    wbEasy: ["easy", "سهل"],
    wbNoExercisesYet: ["No exercises yet for this area", "لا توجد تمارين لهذه المنطقة بعد"],
    wbAddDay: ["+ Add day", "+ أضف يوم"],
    wbRemoveDay: ["Remove day", "إزالة اليوم"],
    wbSaveBtn: ["Save this plan", "حفظ هذه الخطة"]
  };
  function s(k) {
    var e = STR[k];
    return e ? e[lang() === "ar" ? 1 : 0] : k;
  }

  // ---------------- tiny DOM helper (same pattern as coach.js's h()) ----------------
  function h(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") node.className = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else if (k === "on" && attrs[k]) {
          Object.keys(attrs[k]).forEach(function (ev) { node.addEventListener(ev, attrs[k][ev]); });
        } else if (attrs[k] != null && attrs[k] !== false) node.setAttribute(k, attrs[k]);
      });
    }
    var put = function (x) {
      if (x == null || x === false) return;
      if (typeof x === "string") node.appendChild(document.createTextNode(x));
      else if (x && x.nodeType) node.appendChild(x);
      else node.appendChild(document.createTextNode(String(x))); // tolerate odd model output
    };
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (Array.isArray(c)) c.forEach(put);
      else put(c);
    }
    return node;
  }

  // ---------------- exercise index, deduplicated by shape ----------------
  // one entry per unique exercise (by `en` name) — the same exercise
  // appears under multiple ids/day-variants across the 5 day arrays, but
  // each id is unique, so dedupe by `en` name instead (two different ids
  // for the same en name are the same exercise, tagged identically by
  // construction in Task 1).
  function buildExerciseIndex() {
    var byName = {};
    var order = [];
    [DAYS_PREVIEW, DAYS_MALE, DAYS_FEMALE, DAYS_MALE_CAL, DAYS_FEMALE_CAL].forEach(function (set) {
      set.forEach(function (day) {
        day.exercises.forEach(function (ex) {
          if (byName[ex.en]) return;
          byName[ex.en] = ex;
          order.push(ex.en);
        });
      });
    });
    return order.map(function (name) { return byName[name]; });
  }

  var EXERCISES = buildExerciseIndex();

  function exercisesForShape(shapeId) {
    return EXERCISES.filter(function (e) { return e.shape === shapeId || e.shape2 === shapeId; });
  }

  // ---------------- plan state + one-per-shape constraint ----------------
  var plan = null; // { days: [{ name, exercises: [exerciseObj, ...] }] } while the builder is open

  function newPlan() {
    return { days: [{ name: "Day 1", exercises: [] }] };
  }

  function shapesUsed() {
    var used = {};
    plan.days.forEach(function (d) {
      d.exercises.forEach(function (e) {
        used[e.shape] = true;
        if (e.shape2) used[e.shape2] = true;
      });
    });
    return used;
  }

  function canPlace(ex) {
    var used = shapesUsed();
    if (used[ex.shape]) return false;
    if (ex.shape2 && used[ex.shape2]) return false;
    return true;
  }

  function placeExercise(dayIndex, ex) {
    if (!canPlace(ex)) return false;
    plan.days[dayIndex].exercises.push(ex);
    return true;
  }

  function removeExercise(dayIndex, exIndex) {
    plan.days[dayIndex].exercises.splice(exIndex, 1);
  }

  // ---------------- palette UI (grouped by muscle group, one section per shape) ----------------
  function paletteEl() {
    var groups = {};
    MUSCLE_SHAPES.forEach(function (shape) {
      groups[shape.group] = groups[shape.group] || [];
      groups[shape.group].push(shape);
    });
    var used = shapesUsed();
    var sections = Object.keys(groups).map(function (groupName) {
      var shapeEls = groups[groupName].map(function (shape) {
        var options = exercisesForShape(shape.id);
        var disabled = !!used[shape.id];
        var optionEls = options.length
          ? options.map(function (ex) {
              return h("div", {
                class: "wb-ex" + (ex.tier === "easy" ? " wb-ex-easy" : "") + (disabled ? " wb-ex-disabled" : ""),
                draggable: disabled ? "false" : "true",
                "data-ex-name": ex.en,
                on: disabled ? {} : {
                  dragstart: function (e) { e.dataTransfer.setData("text/plain", ex.en); }
                }
              }, ex.en + (ex.tier === "easy" ? " (" + s("wbEasy") + ")" : ""));
            })
          : [h("div", { class: "wb-ex-empty" }, s("wbNoExercisesYet"))];
        return h("div", { class: "wb-shape" },
          h("div", { class: "wb-shape-label" }, lang() === "ar" ? shape.labelAr : shape.label),
          h.apply(null, ["div", { class: "wb-shape-options" }].concat(optionEls)));
      });
      return h("div", { class: "wb-group" }, h("h4", {}, groupName), h.apply(null, ["div", {}].concat(shapeEls)));
    });
    return h.apply(null, ["div", { class: "wb-palette" }].concat(sections));
  }

  // ---------------- day-builder UI (drop targets, day add/rename/remove) ----------------
  function dayEl(day, dayIndex) {
    var exList = day.exercises.map(function (ex, exIndex) {
      return h("div", { class: "wb-placed-ex" },
        h("span", {}, ex.en),
        h("button", { type: "button", class: "wb-remove-btn", on: { click: function () { removeExercise(dayIndex, exIndex); rerender(); } } }, "×"));
    });
    return h("div", {
      class: "wb-day",
      on: {
        dragover: function (e) { e.preventDefault(); },
        drop: function (e) {
          e.preventDefault();
          var name = e.dataTransfer.getData("text/plain");
          var ex = EXERCISES.filter(function (x) { return x.en === name; })[0];
          if (ex && placeExercise(dayIndex, ex)) rerender();
        }
      }
    },
      h("input", {
        class: "wb-day-name", value: day.name,
        on: { input: function (e) { day.name = e.target.value; } }
      }),
      h.apply(null, ["div", { class: "wb-day-list" }].concat(exList)),
      plan.days.length > 1 ? h("button", {
        type: "button", class: "wb-remove-day", on: { click: function () { plan.days.splice(dayIndex, 1); rerender(); } }
      }, s("wbRemoveDay")) : null);
  }

  function daysEl() {
    var dayEls = plan.days.map(function (d, i) { return dayEl(d, i); });
    var addBtn = h("button", {
      type: "button", class: "wb-add-day",
      on: { click: function () { plan.days.push({ name: "Day " + (plan.days.length + 1), exercises: [] }); rerender(); } }
    }, s("wbAddDay"));
    return h.apply(null, ["div", { class: "wb-days" }].concat(dayEls).concat([addBtn]));
  }

  // ---------------- mount (same pattern as coach.js's mount(): replaces #coachBody) ----------------
  function mount(el) {
    var body = document.getElementById("coachBody");
    if (!body) return;
    body.innerHTML = "";
    body.appendChild(el);
    try { window.scrollTo(0, 0); } catch (e) {}
  }

  function rerender() {
    mount(screenEl());
  }

  function screenEl() {
    return h("div", { class: "wb-screen" },
      h("h2", {}, s("wbTitle")),
      h("div", { class: "wb-layout" }, paletteEl(), daysEl()),
      h("button", {
        type: "button", class: "coach-primary", on: { click: function () {
          if (window.GymWorkoutBuilderSave) window.GymWorkoutBuilderSave(exportAsWorkoutPlan());
        } }
      }, s("wbSaveBtn")));
  }

  // ---------------- public API ----------------
  function open() {
    plan = newPlan();
    rerender();
  }

  function exportAsWorkoutPlan() {
    return {
      split: "Custom",
      days: plan.days.map(function (d) {
        return {
          day: d.name,
          exercises: d.exercises.map(function (ex) {
            return { name: ex.en, sets: ex.sets, reps: ex.reps, restSec: ex.rest };
          })
        };
      })
    };
  }

  window.GymWorkoutBuilder = { open: open, exportAsWorkoutPlan: exportAsWorkoutPlan };
})();
