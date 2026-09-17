# Frontend UI bug fixes & polish

## Context

Follow-on batch after the `sync.js` data-loss hotfix (separate branch/PR,
already shipped first). A friend beta-testing the gym PWA found a handful of
navigation/UX rough edges: a refresh-flash on the More screen, instant/jarring
tab switches, a rest timer that can still be started on a completed day,
"More" reading oddly as a tab name, the "My plans" link looking like a stray
hyperlink, workout-only mode still showing diet-only form fields and stats,
and the "Download PDF" button not producing a real shareable image.

This is a static, no-build-step PWA — there is no test framework. Verification
for every task below is manual, in a browser. Report exactly which manual
checks were run and what was observed.

## Global Constraints

- No build step. No test runner. No new external dependency without an
  explicit CDN `<script>` tag pinned to an exact version with a real
  Subresource Integrity hash (Task 6 only).
- Preserve existing i18n pattern (EN/AR via the `STR`/`s()`/`t()` helpers in
  `app.js`) for any new user-facing string.
- Preserve existing view-transition / reduced-motion patterns already in
  `ui.js`/`styles.css` — extend them, don't replace them with a new
  mechanism.

## Task 1: Rest-timer completion guard

**File:** `app.js`.

The whole-session "Start Workout" button (`sessionBtn`, lines ~980–998)
already blocks via `isDayComplete(activeDay)` — no change needed there. The
per-exercise rest timer (`startRestTimer(seconds, name)`, line 834, called
from `data-rest` buttons at lines 672–674) has no such guard.

**Fix:** add the guard inside `startRestTimer` itself (not at the call
site), so it's self-protecting regardless of how many places call it:

```js
function startRestTimer(seconds, name) {
  if (isDayComplete(activeDay)) { alert(t("dayAlreadyDone")); return; }
  // ...existing implementation unchanged...
}
```

Reuse `isDayComplete`/`dayProgress` (lines 716–730) and the existing
`t("dayAlreadyDone")` string exactly as the session button does, for
consistency.

**Verification:** mark all exercises in a day complete, click a rest-timer
button → same alert fires, no timer starts. Confirm rest timers still start
normally on an incomplete day, and the session button is unaffected.

## Task 2: "More" screen refresh flash/redirect

**Files:** `index.html` (inline pre-paint script, lines 196–214 — already
correctly hides `#screen-plan`/shows the target screen based on
`localStorage.gym_tab` before `ui.js` loads) and `ui.js` (`boot()` line 139
unconditionally re-runs `navigate(ls("gym_tab")||"plan", {instant:true,...})`
on `DOMContentLoaded` — a second, independent, unsynchronized read/apply of
the same key).

**Fix — `ui.js`, `boot()`:** check whether the DOM already reflects the
target tab (i.e. the inline script already did the work) before calling
`navigate()` again:

```js
const targetTab = ls("gym_tab") || "plan";
curTab = targetTab; // always initialize internal state
if (document.body.getAttribute("data-tab") !== targetTab) {
  navigate(targetTab, { instant: true, keepScroll: true });
}
```

No change needed to `index.html`'s inline script. Keep the check scoped to
`boot()` only — don't add a short-circuit inside `navigate()` itself, since
that's used for real tab-switch clicks elsewhere and a general short-circuit
there risks breaking legitimate same-tab re-navigation calls.

**Verification:** set `gym_tab` to `"more"`, reload, confirm no flash of the
plan screen. Click another nav tab afterward and confirm `curTab` was
correctly initialized (transition/instant logic still behaves right) —
proves skipping `navigate()` in `boot()` didn't leave state stale. Confirm
default boot (no `gym_tab` key) still works.

## Task 3: Smooth transitions between screens

**Files:** `styles.css` (lines ~696–719), `ui.js` (`navigate()` lines
33–67).

A working mechanism already exists: `navigate()` calls
`document.startViewTransition(swap)` when available (not on `instant`/
reduced-motion), and CSS already names each screen individually —
`#screen-plan{view-transition-name:screen-plan}` etc. — with
`::view-transition-old(screen-plan|screen-coach|screen-more)` /
`::view-transition-new(...)` keyframes (`screen-fade-out`/`screen-fade-in`,
opacity + translateY, using `--dur-med`/`--ease`). The only real gaps: (a) it
reads as a flat fade, not a gradient effect, and (b) there's no fallback at
all for browsers without `document.startViewTransition` (the `else {
swap(); }` branch, line 60, is instant with zero animation).

**Fix:**

1. Extend the *existing* per-screen keyframes (keep the real names —
   `screen-plan`/`screen-coach`/`screen-more`, not a made-up single
   selector) to layer a gradient sweep via `mask-image` alongside the
   current opacity/translateY, still driven by `--dur-med`/`--ease` so it
   matches the rest of the app's motion language:

   ```css
   @keyframes screen-fade-out{
     to{ opacity:0; transform:translateY(-8px); mask-image:linear-gradient(90deg,black 0%,transparent 100%); }
   }
   @keyframes screen-fade-in{
     from{ opacity:0; transform:translateY(8px); mask-image:linear-gradient(90deg,transparent 0%,black 100%); }
     to{ mask-image:none; }
   }
   ```

   (Exact easing/spread is a visual-polish detail to eyeball live — the
   structural point is reusing the existing three named transitions and
   duration/easing tokens, not introducing a new mechanism.)

2. Add a CSS-transition fallback for non-Chromium browsers, reusing the same
   keyframes as plain classes, gated behind the same `prefers-reduced-motion`
   check already used in the View Transitions branch:

   ```js
   // ui.js navigate(), replacing the bare `else { swap(); }` at line 60
   } else if (!reduce) {
     var outgoing = document.querySelector('.screen:not([hidden])');
     if (outgoing) outgoing.classList.add('screen-fade-out-fallback');
     setTimeout(function () {
       swap();
       var incoming = document.querySelector('.screen:not([hidden])');
       if (incoming) {
         incoming.classList.add('screen-fade-in-fallback');
         incoming.addEventListener('animationend', function () {
           incoming.classList.remove('screen-fade-in-fallback');
         }, { once: true });
       }
       if (outgoing) outgoing.classList.remove('screen-fade-out-fallback');
     }, FALLBACK_DUR_MS); // read from --dur-med via getComputedStyle, or hardcode matching value
   } else {
     swap();
   }
   ```

   ```css
   .screen-fade-out-fallback{ animation:screen-fade-out var(--dur-med) var(--ease) both; }
   .screen-fade-in-fallback{ animation:screen-fade-in var(--dur-med) var(--ease) both; }
   ```

**Verification:** Chromium — tab switches show the richer transition (not on
`instant:true` boot nav). Firefox/Safari (no View Transitions) — confirm the
new fallback animates instead of instantly snapping, and that both screens
never visibly overlap/double-render mid-transition. OS reduced-motion on —
confirm both paths skip straight to instant `swap()`.

## Task 4: Nav rename "More" → "Profile", "My plans" link → icon

**Files:** `app.js` (STR table, `navMore:["More","المزيد"]`), `index.html`
(line 73 bottom-nav `<span data-i18n="navMore">`, line 158 More-screen
`<h1 data-i18n="navMore">` — same key drives both, confirmed), `coach.js`
(two "My plans" text-link locations: `renderForm()` lines 601–607 right
after the submit button, and `renderResult()`'s `links` row lines 837–843 —
both `<button class="coach-link coach-myplans-link">`, styled as an
underlined hyperlink via `styles.css` ~822–825, calling `renderMyPlans()`).

**Fix:**

1. Rename: `app.js` line 306 → `navMore: ["Profile", "الملف الشخصي"]`.
   One-line change renames both the bottom-nav label and the More-screen's
   own heading at once, since both reference the same i18n key. Leave
   `data-tab="more"`, `#screen-more`, and the `gym_tab` localStorage value
   `"more"` untouched — this is a label-only rename; touching the internal
   id/value would ripple into `ui.js` navigation (Task 2), and the sync code
   (which reads/writes `gym_tab`), for no user-visible benefit.
2. Icon: move the "My plans" control out of the form body and into the
   form's header area, next to the `want` segmented control (`renderForm()`,
   ~line 519, right after
   `form.appendChild(h("div", {class:"coach-field"}, ..., wantWrap))`).
   Build it as an icon button (reuse `coach.js`'s existing inline-SVG
   pattern from `mascot()` for visual consistency — a small icon glyph, not
   new iconography) with `aria-label`/`title` from the existing
   `s("myPlansN")` string, `onclick: renderMyPlans` unchanged:

   ```js
   if (loadSaved().length > 0) {
     formHeaderRow.appendChild(h("button", {
       type: "button", class: "coach-icon-btn coach-myplans-icon",
       "aria-label": s("myPlansN"), title: s("myPlansN"),
       on: { click: renderMyPlans }
     }, [ /* small icon element, reuse mascot()'s inline-SVG pattern */ ]));
   }
   ```

   Remove the old text-link block at lines 601–607. Replace the second
   occurrence in `renderResult()`'s `links` row (837–843) with the same
   icon-button pattern for consistency between the form and result views.
   Add a `.coach-icon-btn` CSS rule near the existing `.coach-link` block
   (~822–825) — check `styles.css` for any existing icon-button class to
   match visual conventions (size ≥44px hit target, hover/focus states)
   before inventing new ones; remove the old `.coach-myplans-link` rule only
   if nothing else still uses `.coach-link` for this purpose (grep first).

**Verification:** toggle EN/AR, confirm both the nav label and the
More-screen heading read "Profile"/"الملف الشخصي" together. Confirm
`#screen-more` navigation and `gym_tab` storage are unaffected. Confirm the
new icon button in both locations still opens the same "My plans" list and
has an `aria-label` (it no longer has visible text).

## Task 5: Hide diet-only UI when want="workout"

**File:** `coach.js`. Two confirmed gaps:

- `renderForm()`'s `want` segmented-control click handler (~lines 504–519)
  already toggles `ibGroup.hidden = (w === "workout")` but the Diet
  fieldset (built inline, unnamed, lines 557–564) has no equivalent toggle,
  so it — and its `required: true` `dietPreference` field — stays
  visible/required even in workout-only mode.
- `renderResult()` (lines 776–799): the `stats` block (BMI/BMR/TDEE/target/
  protein/fat/carb tiles under "Your numbers") is pushed into `sections`
  unconditionally at line 794, regardless of `r.want`.

**Fix:**

1. Capture the Diet fieldset into a variable instead of an anonymous
   `form.appendChild(...)` expression:

   ```js
   var dietGroup = h("fieldset", { class: "coach-group" },
     h("legend", {}, s("grpDiet")),
     field("dietPreference", "dietPreference", selectInput("dietPreference", st.dietPreference), { required: true }),
     field("allergies", "allergies", allergies),
     field("dislikes", "dislikes", dislikes));
   dietGroup.hidden = st.want === "workout"; // initial render, mirrors ibGroup's line 586
   form.appendChild(dietGroup);
   ```

   In the `want` click handler (~line 514, next to the existing `ibGroup`
   line): add `dietGroup.hidden = (w === "workout");`.

2. `validate(st)` (lines 301–322) already takes `st` as a parameter — no
   signature change needed. In the `ENUMS` loop (lines 316–318), skip
   `dietPreference` for workout-only:

   ```js
   Object.keys(ENUMS).forEach(function (name) {
     if (name === "dietPreference" && st.want === "workout") return;
     if (ENUMS[name].indexOf(st[name]) === -1) errors[name] = ["vRequired"];
   });
   ```

   (`dietPreference` is the only `ENUMS` member inside the Diet fieldset —
   `allergies`/`dislikes` are free-text chip inputs, not enums, and have no
   required-validation to skip.)

3. `renderResult()`, line 794: gate the stats push —

   ```js
   if (r.want !== "workout" && r.dietPlan) sections.push(stats);
   ```

   (checking both `want` and `dietPlan` truthiness is extra defense against
   a known backend bug where a `both` response could come back missing
   `dietPlan` — that path has separately been fixed server-side, but this
   guard costs nothing and prevents blank/NaN stat tiles either way.)

**Verification:** select "workout" in the form → diet fieldset disappears
alongside the already-working InBody fieldset; submitting without
`dietPreference` no longer blocks. Select "diet"/"both" → diet fieldset and
its required validation still work as before. View a workout-only result →
no stats tiles. View diet/both results → stats tiles render as before.

## Task 6: Rework "Download PDF" into a real shareable image

**Files:** `coach.js` (`downloadPdf()`, lines 219–231, wired to a button in
`renderResult()` at line 826), `index.html` (new CDN script), `styles.css`
(existing `@media print` rules, ~1170–1179 — kept as fallback, not removed).

No screenshot/canvas code exists anywhere today — `downloadPdf()` is just
`window.print()` with a temporary `document.title` swap.

**Fix — html2canvas via CDN** (this static, no-build-step PWA already loads
Google Identity Services the same way, so this matches existing convention):

1. `index.html`: add, pinned to an exact version with a Subresource
   Integrity hash. **The SRI hash must be the real hash of the actual pinned
   file** — fetch `https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js`,
   compute its real sha384 (e.g. `curl -s <url> | openssl dgst -sha384
   -binary | openssl base64 -A`), and use that exact value. Do not
   fabricate or guess a hash — a wrong hash silently breaks the script for
   every visitor (SRI mismatch blocks it from executing). If the file can't
   be fetched in this environment to compute the hash, flag this as a
   concern in the report rather than inventing one.

   ```html
   <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js" integrity="sha384-<real-generated-hash>" crossorigin="anonymous" defer></script>
   ```

2. `coach.js`: rename current `downloadPdf()` → `downloadPdfFallback()`
   (logic unchanged, kept for offline/CDN-failure use), add:

   ```js
   async function downloadResultImage() {
     var card = document.querySelector(/* renderResult()'s root card selector */);
     if (!card || typeof html2canvas !== "function") return downloadPdfFallback();
     try {
       var canvas = await html2canvas(card, { backgroundColor: "#ffffff", scale: 2 });
       canvas.toBlob(function (blob) {
         var url = URL.createObjectURL(blob);
         var a = document.createElement("a");
         a.href = url; a.download = "coach-plan-" + Date.now() + ".png";
         document.body.appendChild(a); a.click(); a.remove();
         URL.revokeObjectURL(url);
       }, "image/png");
     } catch (e) { downloadPdfFallback(); }
   }
   ```

   Because it captures the live DOM, this automatically respects Task 5's
   hidden-stats-for-workout-only fix — nothing extra needed there.

3. Update the button at line 826: handler → `downloadResultImage`, label →
   a new `s("shareImage")` STR entry ("Save Image" / "حفظ كصورة"), icon
   consistent with Task 4's icon-button styling.

**Verification:** online — click the button, confirm a PNG downloads
matching what's on screen (respecting want-based section visibility).
Offline / CDN blocked via devtools throttling — confirm graceful fallback to
`window.print()`, not a silent failure. Arabic/RTL — confirm the exported
image renders RTL text correctly (the main risk area for html2canvas).
Spot-check at a couple of viewport widths, and confirm the download actually
saves (not just opens) on at least one mobile browser if available.

## Critical Files

- `app.js` — `startRestTimer()`, `isDayComplete()`/`dayProgress()`, `STR`
  table (`navMore`)
- `ui.js` — `boot()`, `navigate()`
- `index.html` — inline pre-paint script, nav/More-screen markup, new CDN
  tag
- `styles.css` — view-transition keyframes, `.coach-link`/new
  `.coach-icon-btn`
- `coach.js` — `renderForm()`, `validate()`, `renderResult()`,
  `downloadPdf()`
