# Custom Workout Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-in-or-anon user drag exercises onto days to build their own workout plan, constrained to one exercise per muscle "shape" (a sub-region like upper/mid/lower chest), as an opt-in alternative alongside the existing preset programs.

**Architecture:** A new vanilla-JS IIFE module (`workout-builder.js`, following this repo's existing `calendar.js`/`chat.js` module pattern — no framework, no build step) owns a shape-tagged exercise index (derived from `app.js`'s existing catalog, now tagged with `shape`/`tier` fields), a drag-and-drop builder screen, and a save path that wraps the built plan into the exact same "coach result" shape `coach.js` already renders and stores in `gym_coach_saved` — so the builder needs zero new backend, zero new storage key, and reuses `coach.js`'s existing `renderResult`/`addSaved`/"My plans" UI verbatim.

**Tech Stack:** Vanilla JS (ES5-compatible style matching this repo), no build step, no framework — matches every other module in this app.

**Spec:** `docs/superpowers/specs/2026-09-23-custom-workout-builder-design.md` (read it in full — it has the complete muscle-shape taxonomy, the full exercise curation table, and every design decision this plan implements).

## Global Constraints

- One exercise per muscle "shape" per plan (not per muscle group — per the finer sub-region defined in the spec's taxonomy table).
- "Easy" means a different, easier ALTERNATE exercise tagged for that shape — never the same exercise with reduced sets/load.
- The custom builder is additive: `DAYS_MALE`/`DAYS_FEMALE`/`DAYS_MALE_CAL`/`DAYS_FEMALE_CAL`/`DAYS_PREVIEW` in `app.js` must not be removed, renamed, or have their existing exercise objects' existing fields changed — only new `shape`/`tier` fields are added alongside what's already there.
- A saved custom plan must reuse `coach.js`'s existing `gym_coach_saved` (`SAVED_KEY`) storage and its existing `SAVED_MAX` cap — no new storage key, no new backend endpoint, no separate slot count.
- An empty shape (today: Chest — Lower has zero exercises, per the spec) must render as an explicit "no exercises yet" state in the builder UI, never hidden/omitted and never crash the shape-selection logic.
- This repo has no test framework (vanilla JS, no `npm test`) — verification throughout is `node -c <file>.js` for syntax plus manual/Playwright interaction checks, matching every other task in this repo's history.

---

### Task 1: Curate the exercise catalog with shape + tier tags

**Files:**
- Modify: `app.js` (the 5 `DAYS_*` arrays, lines 4-153 in the pre-task file)
- Modify: `app.js` (add a new `MUSCLE_SHAPES` constant near the top of the DATA section, after the `DAYS_FEMALE_CAL` array)

**Interfaces:**
- Consumes: nothing (this task only adds data).
- Produces: every exercise object across `DAYS_PREVIEW`/`DAYS_MALE`/`DAYS_FEMALE`/`DAYS_MALE_CAL`/`DAYS_FEMALE_CAL` gains two new fields: `shape: "<shapeId>"` (a string key into `MUSCLE_SHAPES`, e.g. `"chest_mid"`) and `tier: "easy"|"medium"|"hard"`. Some exercises (the Romanian Deadlift per the spec) gain a `shape2` field for their secondary shape instead of a second full tag. A new top-level `const MUSCLE_SHAPES = [...]` array — one entry per shape, `{id, group, label, labelAr}` — id is the same string keys used in every exercise's `shape`/`shape2` field. Task 2 consumes `MUSCLE_SHAPES` and every exercise's `shape`/`tier` fields.

- [ ] **Step 1: Add the `MUSCLE_SHAPES` constant**

Insert immediately after the `DAYS_FEMALE_CAL` array closes (after the line that is currently the blank line before `// ---------------- i18n ----------------`):

```js
// ---- muscle "shapes" (sub-regions) for the custom workout builder ----
// id is referenced by every exercise's shape/shape2 field below.
const MUSCLE_SHAPES = [
  { id:"chest_upper", group:"Chest", label:"Upper chest", labelAr:"صدر علوي" },
  { id:"chest_mid", group:"Chest", label:"Mid chest", labelAr:"صدر أوسط" },
  { id:"chest_lower", group:"Chest", label:"Lower chest", labelAr:"صدر سفلي" },
  { id:"back_lats", group:"Back", label:"Lats (width)", labelAr:"عضلات ظهرية (اتساع)" },
  { id:"back_mid", group:"Back", label:"Mid-back / rhomboids (thickness)", labelAr:"وسط الظهر (سماكة)" },
  { id:"back_lower", group:"Back", label:"Lower back / traps", labelAr:"أسفل الظهر / كتفية" },
  { id:"shoulder_front", group:"Shoulders", label:"Front delt", labelAr:"كتف أمامي" },
  { id:"shoulder_side", group:"Shoulders", label:"Side delt", labelAr:"كتف جانبي" },
  { id:"shoulder_rear", group:"Shoulders", label:"Rear delt", labelAr:"كتف خلفي" },
  { id:"biceps_long", group:"Biceps", label:"Long head (outer)", labelAr:"الرأس الطويل (خارجي)" },
  { id:"biceps_short", group:"Biceps", label:"Short head (inner)", labelAr:"الرأس القصير (داخلي)" },
  { id:"triceps_long", group:"Triceps", label:"Long head", labelAr:"الرأس الطويل" },
  { id:"triceps_lateral", group:"Triceps", label:"Lateral/medial head", labelAr:"الرأس الجانبي/الأوسط" },
  { id:"quads", group:"Quads", label:"Quads", labelAr:"أمامية الفخذ" },
  { id:"hamstrings", group:"Hamstrings", label:"Hamstrings", labelAr:"خلفية الفخذ" },
  { id:"glutes", group:"Glutes", label:"Glutes", labelAr:"الألوية" },
  { id:"calves", group:"Calves", label:"Calves", labelAr:"السمانة" },
  { id:"core_upper", group:"Core", label:"Upper abs", labelAr:"بطن علوي" },
  { id:"core_lower", group:"Core", label:"Lower abs", labelAr:"بطن سفلي" },
  { id:"core_obliques", group:"Core", label:"Obliques", labelAr:"عضلات جانبية (بطن)" },
];
```

- [ ] **Step 2: Tag every exercise in `DAYS_MALE`**

Apply these `shape`/`tier` (and `shape2` where noted) fields to each exercise object in `DAYS_MALE`, matching by `id` (each `id` is unique even where the same `en` name repeats elsewhere in the file):

```
cta_bench     -> shape:"chest_mid",     tier:"hard"
cta_incline   -> shape:"chest_upper",   tier:"medium"
cta_fly       -> shape:"chest_mid",     tier:"easy"
cta_ohext     -> shape:"triceps_long",  tier:"medium"
cta_pushdown  -> shape:"triceps_lateral", tier:"easy"
cta_squat     -> shape:"quads",         tier:"hard"
cta_legpress  -> shape:"quads",         tier:"easy"
cta_core      -> shape:"core_lower",    tier:"hard"
bba_lat       -> shape:"back_lats",     tier:"medium"
bba_csrow     -> shape:"back_mid",      tier:"medium"
bba_cablerow  -> shape:"back_mid",      tier:"easy"
bba_curl      -> shape:"biceps_short",  tier:"medium"
bba_inclcurl  -> shape:"biceps_long",   tier:"medium"
bba_rdl       -> shape:"hamstrings", shape2:"back_lower", tier:"hard"
bba_legcurl   -> shape:"hamstrings",    tier:"easy"
bba_core      -> shape:"core_obliques", tier:"medium"
ctb_dbbench   -> shape:"chest_mid",     tier:"medium"
ctb_pushup    -> shape:"chest_mid",     tier:"easy"
ctb_fly       -> shape:"chest_mid",     tier:"easy"
ctb_dips      -> shape:"triceps_lateral", tier:"easy"
ctb_super     -> shape:"triceps_lateral", tier:"medium"
ctb_hack      -> shape:"quads",         tier:"medium"
ctb_legext    -> shape:"quads",         tier:"easy"
ctb_core      -> shape:"core_upper",    tier:"medium"
bbb_tbar      -> shape:"back_mid",      tier:"hard"
bbb_onearm    -> shape:"back_mid",      tier:"medium"
bbb_csdbrow   -> shape:"back_mid",      tier:"easy"
bbb_hammer    -> shape:"biceps_short",  tier:"medium"
bbb_super     -> shape:"biceps_short",  tier:"medium"
bbb_bss       -> shape:"quads",         tier:"hard"
bbb_seatcurl  -> shape:"hamstrings",    tier:"easy"
bbb_core      -> shape:"core_obliques", tier:"easy"
```

Example of the resulting object shape (`cta_bench`, before → after):
```js
// before
{id:"cta_bench", en:"Barbell Bench Press", sets:4, reps:"6-8", rest:150, vid:"0cXAp6WhSj4"},
// after
{id:"cta_bench", en:"Barbell Bench Press", sets:4, reps:"6-8", rest:150, vid:"0cXAp6WhSj4", shape:"chest_mid", tier:"hard"},
```
And the one dual-shape example (`bba_rdl`):
```js
{id:"bba_rdl", en:"Barbell Romanian Deadlift", sets:3, reps:"8-10", rest:90, vid:"zdip4iexlxg", shape:"hamstrings", shape2:"back_lower", tier:"hard"},
```

- [ ] **Step 3: Tag every exercise in `DAYS_FEMALE`**

```
fla_goblet    -> shape:"quads",         tier:"easy"
fla_rdl       -> shape:"hamstrings",    tier:"medium"
fla_lunge     -> shape:"quads",         tier:"medium"
fla_bridge    -> shape:"glutes",        tier:"easy"
fla_calf      -> shape:"calves",        tier:"easy"
fla_deadbug   -> shape:"core_obliques", tier:"easy"
fua_bench     -> shape:"chest_mid",     tier:"medium"
fua_row       -> shape:"back_mid",      tier:"medium"
fua_press     -> shape:"shoulder_front",tier:"medium"
fua_pullapart -> shape:"shoulder_rear", tier:"easy"
fua_lateral   -> shape:"shoulder_side", tier:"easy"
fua_arms      -> shape:"biceps_short",  tier:"medium"
flb_sumo      -> shape:"quads",         tier:"medium"
flb_sldl      -> shape:"hamstrings",    tier:"hard"
flb_bss       -> shape:"quads",         tier:"hard"
flb_kickback  -> shape:"glutes",        tier:"easy"
flb_calf      -> shape:"calves",        tier:"easy"
flb_legraise  -> shape:"core_lower",    tier:"medium"
fub_incline   -> shape:"chest_upper",   tier:"medium"
fub_row       -> shape:"back_mid",      tier:"easy"
fub_arnold    -> shape:"shoulder_front",tier:"medium"
fub_facepull  -> shape:"shoulder_rear", tier:"easy"
fub_hammer    -> shape:"biceps_short",  tier:"medium"
fub_plank     -> shape:"core_upper",    tier:"medium"
```

- [ ] **Step 4: Tag every exercise in `DAYS_MALE_CAL` and `DAYS_FEMALE_CAL`**

Both arrays share the same exercise `en` names (only sets/reps differ), so apply the same tags to both by `id` prefix (`mc*`/`fc*` share the same suffix — e.g. `mcp_pushup` and `fcp_pushup` both get the same tag):

```
mcp_pushup / fcp_pushup   -> shape:"chest_mid",     tier:"easy"
mcp_pike   / fcp_pike     -> shape:"shoulder_front", tier:"medium"
mcp_dips   / fcp_dips     -> shape:"triceps_lateral",tier:"easy"
mcp_plank  / fcp_plank    -> shape:"core_upper",     tier:"medium"
mcp_hollow / fcp_hollow   -> shape:"core_upper",     tier:"medium"
mcp_mtn    / fcp_mtn      -> shape:"core_lower",     tier:"medium"
mcl_squat  / fcl_squat    -> shape:"quads",          tier:"easy"
mcl_lunge  / fcl_lunge    -> shape:"quads",          tier:"easy"
mcl_bridge / fcl_bridge   -> shape:"glutes",         tier:"easy"
mcl_jump   / fcl_jump     -> shape:"quads",          tier:"hard"
mcl_calf   / fcl_calf     -> shape:"calves",         tier:"easy"
mcl_burpee / fcl_burpee   -> shape:"core_lower",     tier:"hard"
mcx_row       / fcx_row       -> shape:"back_lats",     tier:"medium"
mcx_pullapart / fcx_pullapart -> shape:"shoulder_rear", tier:"easy"
mcx_superman  / fcx_superman  -> shape:"back_lower",    tier:"easy"
mcx_facepull  / fcx_facepull  -> shape:"shoulder_rear", tier:"easy"
mcx_flutter   / fcx_flutter   -> shape:"core_lower",    tier:"easy"
mcx_bear      / fcx_bear      -> shape:"core_obliques", tier:"medium"
```

- [ ] **Step 5: Tag `DAYS_PREVIEW`**

```
pv_legpress  -> shape:"quads",       tier:"easy"
pv_dbbench   -> shape:"chest_mid",   tier:"medium"
pv_cablerow  -> shape:"back_mid",    tier:"easy"
pv_ohp       -> shape:"shoulder_front", tier:"medium"
pv_legcurl   -> shape:"hamstrings",  tier:"easy"
pv_plank     -> shape:"core_upper",  tier:"medium"
```

- [ ] **Step 6: Verify every exercise across all 5 arrays got tagged**

```bash
node -e "
$(sed -n '/^const DAYS_PREVIEW/,/^const MUSCLE_SHAPES/p' app.js | sed '$d')
var all = [].concat(DAYS_PREVIEW, DAYS_MALE, DAYS_FEMALE, DAYS_MALE_CAL, DAYS_FEMALE_CAL);
var missing = [];
all.forEach(function(d){ d.exercises.forEach(function(e){ if(!e.shape || !e.tier) missing.push(e.id); }); });
console.log(missing.length ? 'MISSING TAGS: ' + missing.join(', ') : 'all exercises tagged OK');
"
```
Expected: `all exercises tagged OK`. If anything prints under `MISSING TAGS`, go back and tag it using the tables above (cross-check the `en` name against the curation table in the spec doc).

- [ ] **Step 7: Syntax check and commit**

```bash
node -c app.js
```
Expected: exits 0, no output.

```bash
git add app.js
git commit -m "$(cat <<'EOF'
feat: tag every catalog exercise with a muscle shape + difficulty tier

Adds MUSCLE_SHAPES (21 sub-regions across 10 muscle groups) and
shape/tier fields to every exercise across DAYS_PREVIEW/DAYS_MALE/
DAYS_FEMALE/DAYS_MALE_CAL/DAYS_FEMALE_CAL, per the curation table in
docs/superpowers/specs/2026-09-23-custom-workout-builder-design.md.
One exercise (Barbell Romanian Deadlift) carries a secondary shape2
tag (back_lower) since it genuinely trains both regions and fills an
otherwise-empty shape. Existing fields (id/en/sets/reps/rest/vid) are
unchanged — this is a pure additive tagging pass.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Build the shape/exercise query layer and the drag-and-drop builder screen

**Files:**
- Create: `workout-builder.js`

**Interfaces:**
- Consumes: `MUSCLE_SHAPES`, and every exercise's `shape`/`shape2`/`tier` fields (Task 1) — read directly off `DAYS_MALE`/`DAYS_FEMALE`/`DAYS_MALE_CAL`/`DAYS_FEMALE_CAL`/`DAYS_PREVIEW` (all already global `const`s in `app.js`, loaded before this file per existing script order). `h()` DOM-builder helper and `lang()`/i18n pattern (both already global, defined in `ui.js`/`app.js` — follow the existing `calendar.js` module's exact usage pattern for both, it's the closest analog in this codebase).
- Produces: `window.GymWorkoutBuilder = { open, exportAsWorkoutPlan }`. `open()` mounts the builder screen (takes no arguments, call it from a button's click handler). `exportAsWorkoutPlan()` returns `{ split: "Custom", days: [{day: "<name>", exercises: [{name, sets, reps, restSec}]}] }` — this exact shape matches what `coach.js`'s `renderWorkout(wp)`/`mapWorkout(wp)` already consume (verified by reading `coach.js:1045-1079` — `wp.days[].exercises[]` needs `name`/`sets`/`reps`/`restSec`, not `en`/`rest`). Task 3 calls `exportAsWorkoutPlan()`.

- [ ] **Step 1: Build the unique exercise index, deduplicated by shape**

At the top of the IIFE, build a lookup once at load time:

```js
(function () {
  "use strict";

  // one entry per unique exercise (by id), deduplicated across all 5 day
  // arrays — the same exercise appears under multiple ids/day-variants,
  // but each id is unique, so dedupe by `en` name instead (two different
  // ids for the same en name are the same exercise, tagged identically
  // by construction in Task 1).
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
```

- [ ] **Step 2: Build plan state (days + placed exercises) and the one-per-shape constraint**

```js
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
```

- [ ] **Step 3: Build the palette UI (grouped by muscle group, one section per shape)**

```js
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
```

- [ ] **Step 4: Build the day-builder UI with drop targets, day add/rename/remove**

```js
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
```

- [ ] **Step 5: Wire the screen mount/rerender and the public `open()`/`exportAsWorkoutPlan()` API**

```js
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
```

Note: `mount()` here is the same global DOM-mount helper `coach.js`/`calendar.js` already use (replaces the current screen's contents) — confirm its exact global name/signature by reading `ui.js` or `app.js` before writing this step (it's referenced as a bare `mount(...)` call throughout `coach.js`, e.g. `coach.js:953` — use the same one, don't invent a second mount helper).

- [ ] **Step 6: Add the 4 new i18n strings this module needs**

In `app.js`'s existing i18n string table (the same `const STR`/language-table pattern already used for `navMore` etc. — find it via `grep -n "navMore" app.js` and add these alongside it, following its exact `key:["English","Arabic"]` format):

```js
wbTitle: ["Build Your Own Plan", "ابنِ خطتك الخاصة"],
wbEasy: ["easy", "سهل"],
wbNoExercisesYet: ["No exercises yet for this area", "لا توجد تمارين لهذه المنطقة بعد"],
wbAddDay: ["+ Add day", "+ أضف يوم"],
wbRemoveDay: ["Remove day", "إزالة اليوم"],
wbSaveBtn: ["Save this plan", "حفظ هذه الخطة"],
```

- [ ] **Step 7: Syntax check and commit**

```bash
node -c workout-builder.js
node -c app.js
```
Expected: both exit 0.

```bash
git add workout-builder.js app.js
git commit -m "$(cat <<'EOF'
feat: add the drag-and-drop custom workout builder screen

New workout-builder.js module: a shape-grouped exercise palette (drag
source), a day-builder area (drop target) enforcing one-exercise-per-
shape via canPlace()/shapesUsed(), and add/rename/remove-day controls.
window.GymWorkoutBuilder.exportAsWorkoutPlan() produces the exact
{split, days:[{day, exercises:[{name,sets,reps,restSec}]}]} shape
coach.js's renderWorkout()/mapWorkout() already consume.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Wire the entry point and the save-to-account path

**Files:**
- Modify: `coach.js`
- Modify: wherever the Plan screen's top-level actions/buttons are rendered (search `ui.js` for the Plan screen's render function — likely near where the Program/Style toggle buttons live, since that's the most natural place for a "Customize your own plan" entry point per the spec's "exact placement is an implementation detail" note)

**Interfaces:**
- Consumes: `window.GymWorkoutBuilder.open()` / `.exportAsWorkoutPlan()` (Task 2); `coach.js`'s existing `addSaved(res)` / `SAVED_MAX` / `SAVED_KEY` (already defined, `coach.js:30,197-218` — do not modify these, only call `addSaved`).
- Produces: `window.GymWorkoutBuilderSave(workoutPlan)` — a new global function `workout-builder.js`'s save button calls (already referenced in Task 2 Step 5 as `window.GymWorkoutBuilderSave`). Wraps `workoutPlan` into a minimal valid "coach result" object and calls `coach.js`'s existing `addSaved`.

- [ ] **Step 1: Add `window.GymWorkoutBuilderSave` to `coach.js`**

Add near the existing `addSaved`/`isSaved` functions (`coach.js:196-218`), after `removeSaved`:

```js
  // Entry point for the custom workout builder (workout-builder.js) — wraps
  // its plain {split, days} shape into the same minimal "coach result"
  // object addSaved()/renderResult() already know how to store and render.
  // Only workoutPlan is populated; dietPlan/computed/summary are correctly
  // absent (renderResult already guards every section on presence — see
  // coach.js:897-901 — so an absent dietPlan/computed just means no
  // stats/diet section renders, which is exactly right for a workout-only
  // custom plan).
  window.GymWorkoutBuilderSave = function (workoutPlan) {
    var res = {
      id: "custom_" + Date.now(),
      createdAt: Date.now(),
      want: "workout",
      model: "Custom",
      workoutPlan: workoutPlan
    };
    if (addSaved(res)) {
      renderMyPlans();
      return true;
    }
    return false;
  };
```

(`renderMyPlans` is already defined in this file, referenced at `coach.js:944` — confirm its exact name via `grep -n "function renderMyPlans" coach.js` before writing this step; call it so the user immediately sees their new plan in the My Plans list after saving, the same way saving an AI-generated plan does.)

- [ ] **Step 2: Add the "Customize your own plan" entry-point button**

Read the Plan screen's render function in `ui.js` first (`grep -n "screen-plan\|renderPlan" ui.js` to find it) to see its exact existing button-row pattern, then add one button that calls `window.GymWorkoutBuilder && window.GymWorkoutBuilder.open()`, following the exact same `h("button", {...}, ...)` style as its neighboring buttons. Add the matching i18n string alongside the others from Task 2 Step 6:

```js
wbEntryBtn: ["Customize your own plan", "خصص خطتك الخاصة"],
```

- [ ] **Step 3: Syntax check**

```bash
node -c coach.js
node -c ui.js
```
Expected: both exit 0.

- [ ] **Step 4: Verify end-to-end with Playwright against a local static server**

```bash
python -m http.server 8000
```
Then, via Playwright MCP tools (or manual browser check if unavailable): navigate to the Plan screen, click "Customize your own plan," drag one exercise from a shape onto Day 1, confirm the shape's other options in that same group become visually disabled, click "Save this plan," and confirm it appears in "My Plans" (`coach.js`'s existing screen) showing the workout section (day name + the one exercise) with no diet/stats section (since none was provided) and no console errors.

- [ ] **Step 5: Commit**

```bash
git add coach.js ui.js
git commit -m "$(cat <<'EOF'
feat: wire the custom workout builder's entry point and save path

window.GymWorkoutBuilderSave wraps the builder's plain {split, days}
output into the minimal coach-result shape addSaved()/renderResult()
already handle (dietPlan/computed absent, which the existing renderer
already guards on presence — so only the workout section renders, no
half-populated diet/stats UI). New "Customize your own plan" entry
point button on the Plan screen opens the builder.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: App-wide wiring — script registration, service-worker precache, CI path filter

**Files:**
- Modify: `index.html`
- Modify: `service-worker.js`
- Modify: `.github/workflows/docker-image.yml`
- Modify: `styles.css` (minimal layout rules for the new `.wb-*` classes used in Task 2 — palette/day-list layout, the disabled/easy exercise-chip states, drag-over affordance)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing consumed by later tasks (this is the last task).

- [ ] **Step 1: Register the script in `index.html`**

Find the existing `<script src="calendar.js" defer></script>` tag (or equivalent — `grep -n "calendar.js" index.html`) and add immediately after it:
```html
<script src="workout-builder.js" defer></script>
```
(`defer` matches every other app script; load order after `app.js` — which defines `DAYS_MALE` etc. and `MUSCLE_SHAPES` — and after `ui.js`/`coach.js` is required since `workout-builder.js` calls `mount()` and reads `s()`/`lang()`; confirm the exact existing script order via `grep -n "<script src=" index.html` and insert in the matching position relative to those dependencies, not necessarily right after `calendar.js` if the real order differs.)

- [ ] **Step 2: Add to the service worker's precache list**

In `service-worker.js`'s `ASSETS` array (`grep -n "const ASSETS" service-worker.js`), add `"./workout-builder.js"` following the exact existing entries' format (relative path style, matching neighbors like `"./calendar.js"`).

- [ ] **Step 3: Add to the CI path filter and Dockerfile**

In `.github/workflows/docker-image.yml`'s `push.paths` list (the array that currently lists `"coach.js"`, `"calendar.js"`, etc. — this is the SAME file Task 5 of the coach-loading-widget plan and the CI image-promotion plan both already modified this session, now on `main`), add `"workout-builder.js"` alongside the other top-level `.js` files.

In `Dockerfile`'s `COPY --chown=101:101 index.html styles.css app.js ui.js coach.js chat.js sync.js calendar.js hero-video.js metallic-button.js service-worker.js manifest.json config.js /usr/share/nginx/html/` line, add `workout-builder.js` to that space-separated file list (any position, matching the existing convention of listing JS files roughly in load order).

- [ ] **Step 4: Add minimal layout CSS**

Add to `styles.css` (following its existing class-naming/formatting conventions — read a nearby block like the `.cal-*` rules added for the calendar feature, `grep -n "\.cal-" styles.css`, and match that style):

```css
.wb-layout{display:flex;gap:16px;flex-wrap:wrap}
.wb-palette{flex:1 1 280px;min-width:240px}
.wb-days{flex:1 1 280px;min-width:240px}
.wb-group{margin-bottom:16px}
.wb-shape{margin-bottom:8px}
.wb-shape-label{font-size:.85em;opacity:.75;margin-bottom:4px}
.wb-shape-options{display:flex;flex-wrap:wrap;gap:6px}
.wb-ex{padding:6px 10px;border:1px solid var(--border,#333);border-radius:8px;cursor:grab;font-size:.9em}
.wb-ex-easy{border-color:#2ecc71}
.wb-ex-disabled{opacity:.35;cursor:not-allowed}
.wb-ex-empty{opacity:.5;font-size:.85em;font-style:italic}
.wb-day{border:1px dashed var(--border,#333);border-radius:10px;padding:10px;margin-bottom:12px}
.wb-day-name{background:transparent;border:none;font-weight:600;font-size:1.05em;margin-bottom:8px;width:100%}
.wb-placed-ex{display:flex;justify-content:space-between;align-items:center;padding:4px 0}
.wb-remove-btn{background:transparent;border:none;cursor:pointer;font-size:1.1em;opacity:.6}
.wb-remove-day,.wb-add-day{margin-top:6px}
```
(Adjust the `var(--border,#333)` fallback and any other CSS custom-property names to whatever this file's existing theme variables are actually called — check the top of `styles.css` for its `:root`/theme variable names before assuming `--border` exists; use real existing variables, don't introduce new ones for this small addition.)

- [ ] **Step 5: Full verification pass**

```bash
node -c index.html 2>/dev/null; echo "(harmless — node -c doesn't parse HTML)"
node -c service-worker.js
grep -c "workout-builder.js" index.html service-worker.js .github/workflows/docker-image.yml Dockerfile
```
Expected: the last command shows a count ≥1 for every file.

If Docker is available in this environment, also run `docker build .` from the repo root to confirm the new file is picked up by the existing `COPY` line and the widget/CI path-filter changes don't break the build (this repo's CI-promotion workflow's own drift-check-adjacent smoke tests would otherwise be the first place this breaks — better to catch it here).

- [ ] **Step 6: Commit**

```bash
git add index.html service-worker.js .github/workflows/docker-image.yml Dockerfile styles.css
git commit -m "$(cat <<'EOF'
build: register workout-builder.js in the script tag, SW precache, and CI

Adds the new module to index.html's script order, service-worker.js's
ASSETS precache list, docker-image.yml's push-path filter, and the
Dockerfile's COPY list — same registration every other top-level JS
module in this app already goes through. Also adds the .wb-* layout
CSS the builder screen (Task 2) needs.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:** every design decision in the spec has a task — taxonomy → Task 1's `MUSCLE_SHAPES`; curation table → Task 1's per-exercise tagging; builder UI (palette, drag-drop, one-per-shape constraint, day management, empty-shape handling) → Task 2; storage reuse (`gym_coach_saved`, no new backend) → Task 3, using the exact `workoutPlan` shape confirmed against `coach.js:1045-1079`'s real `renderWorkout`/`mapWorkout` consumers; app-wide registration (script tag, SW precache, CI, Dockerfile — the same 4 places every prior feature this session touched) → Task 4.

**Placeholder scan:** every step has literal code or literal commands with expected output; no "add appropriate X" language. The two spots that say "confirm the exact existing X before writing this" (Task 2 Step 5's `mount()` helper name, Task 3 Step 1's `renderMyPlans` name, Task 3 Step 2's button-row pattern, Task 4 Step 1's script load order, Task 4 Step 4's CSS variable names) are deliberate — they point at a concrete `grep` command to run and a concrete existing pattern to match, not an open-ended judgment call, since this plan's author did not have every one of those exact names in hand at write time and it would be worse to guess wrong than to point at the 1-line grep that confirms it.

**Type consistency:** `workout-builder.js`'s `exportAsWorkoutPlan()` return shape (Task 2 Step 5) matches exactly what Task 3 Step 1's `GymWorkoutBuilderSave` wraps into `res.workoutPlan`, which matches exactly what `coach.js`'s existing `renderWorkout(wp)`/`mapWorkout(wp)` (unmodified, read directly from the current file) already expect: `wp.days[].{day, exercises[].{name,sets,reps,restSec}}`. `window.GymWorkoutBuilder`/`window.GymWorkoutBuilderSave` names are used identically in both Task 2 (defines `GymWorkoutBuilder`, calls `GymWorkoutBuilderSave`) and Task 3 (defines `GymWorkoutBuilderSave`).

---

Plan complete and saved to `docs/superpowers/plans/2026-09-23-custom-workout-builder.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
