# Food logging UI (W2-B)

Frontend for the food catalog + meal log API merged in gym-be#13
(`internal/food`). Backend contract (read from `origin/main` in gym-be, not
guessed):

- `GET /api/v1/foods?q=&limit=` → `{foods: Food[]}`. 401 signed-out, 422
  `invalid_request` on bad `limit`/too-long `q`. No auth = no catalog.
- `GET /api/v1/foods/{id}` → `Food`. 404 `not_found`. (Not used by this UI —
  search results already carry the full Food.)
- `POST /api/v1/meals` body `{date, mealType, foodId, grams}` → 201 `Meal`.
  422 `invalid_request` (bad date/mealType/grams/unknown foodId) or
  `invalid_body` (unknown JSON field — `DisallowUnknownFields`).
- `GET /api/v1/meals?date=YYYY-MM-DD` → `{date, meals: Meal[]}` (date
  required, 422 if missing). Meals come back oldest-first.
- `DELETE /api/v1/meals/{id}` → 204. 404 `not_found` if not this user's meal.
- `Food`: `{id, nameEn, nameAr, aliases[], category, serving:{grams,labelEn,
  labelAr}, per100g:{kcal,protein,carbs,fat,fiber?}, source, approximate}`.
- `Meal`: `{id, date, mealType, foodId, nameEn, nameAr, grams,
  nutrients:{kcal,protein,carbs,fat,fiber?}, source, approximate, loggedAt}`
  — nutrients is an immutable snapshot already scaled to `grams`.
- `MealTypes` canonical order: `breakfast, lunch, dinner, snack, suhoor,
  iftar`. `GET /meals/summary` exists server-side but this UI computes
  totals/grouping client-side from the single `/meals?date=` list (fewer
  requests, and the list already has everything needed: per-entry ids for
  delete, nutrients, mealType).

Not building: `/meals/summary` call, offline caching of meal entries (data
lives server-side per date, unlike the gym_-prefixed localStorage-first
sync used elsewhere in this app), edit-in-place (delete + re-add only).

## UI

New "Food" tab (`data-tab="food"`) between Coach and More in `#appNav`,
`#screen-food`, added to `ui.js`'s `TABS` array. New self-contained module
`food.js` (mirrors `coach.js`'s shape: own `STR`/`s()`/`lang()`, own tiny
`h()` DOM helper, `mount()` into `#foodBody`, `window.GymFood.refresh()`
called from `ui.js navigate()` and `app.js applyLang()` the same way
`GymCoach.refresh()` already is).

- Signed-out: teaser card (reuse `.coach-teaser`/`.coach-bullets` classes)
  with a "Sign in with Google" button → `GymUI.promptSignIn()`.
- Signed-in:
  - Date switcher: `‹ [date label] ›`, defaults to today (local date, not
    UTC), re-fetches `/meals?date=` on change.
  - Daily totals row (kcal/protein/carbs/fat) computed client-side from the
    fetched meals. If `localStorage.gymcoach_last` has `.computed` (the
    last AI assessment's targets), show a kcal progress bar against
    `computed.targetKcal` — the "simple target" the app already has,
    per the Phase 3 plan note ("progress against calorie and macro targets
    from the last AI assessment"). No target present → totals only, no bar.
  - Search box (debounced ~350ms, min 2 chars) → `GET /foods?q=&limit=20`.
    Results list: name (localized), serving hint, kcal/100g. Tapping a
    result opens an inline "add" row: grams number input (default =
    `serving.grams` or 100), meal-type select (6 canonical types, default
    guessed from time of day), Add button → `POST /meals`.
  - Meals grouped by `mealType` in canonical order (only non-empty groups
    render); each row shows name, grams, kcal, and a delete (trash) icon
    button → `DELETE /meals/{id}`, optimistic removal with rollback on
    failure.
  - Loading: skeleton rows (reuse `.skeleton`). Error: inline banner + retry
    button, no console errors, no silent white screen.
  - All dynamic text (food names, error messages) via `textContent`/the
    `h()` helper's `text`/child-string path — never `innerHTML` with
    API/user data.

CSS: new `food-*` rules in `styles.css` using existing tokens
(`--accent`, `--panel`, `--line`, `--radius`, etc.) — no hardcoded colors,
since a parallel teal rebrand is in flight. Reuses `.coach-primary`,
`.coach-field`, `.coach-teaser`, `.coach-stats`/`.coach-stat`, `.skeleton`,
`.card-fx` where they already fit instead of duplicating.

i18n: new keys in `food.js`'s own `STR` table (same `[en, ar]` shape as
`app.js`'s `T`), read via `window.activeLang` — same pattern `coach.js`
already uses, so no risk of colliding with the parallel rebrand branch's
edits inside `app.js`'s `T` object.

## Tasks

1. `internal/food` contract review — done above, no code yet.
2. `food.js`: skeleton module, teaser (signed-out), date switcher, meals
   fetch + client-side grouping/totals, target progress bar.
3. `food.js`: search (debounced), add-meal flow (grams + mealType + POST).
4. `food.js`: delete-meal flow, loading/error states.
5. Wire into `index.html` (`#appNav` button, `#screen-food`, `<script
   src="food.js">`), `ui.js` (`TABS`, refresh-on-navigate), `app.js`
   (`applyLang` refresh hook).
6. `styles.css`: food-specific rules.
7. Update `Dockerfile` COPY + HASH `cat` list, `service-worker.js` `ASSETS`
   (food.js only — no new API caching, `/api/` is already excluded).
8. Playwright verification: local static server, route-mocked `/foods` +
   `/meals`, EN + AR/RTL, empty/loading/error states, no console errors.
9. PR against `main`.

Each task: `node --check food.js` (and any other touched `.js`), commit,
push, one dated line under `### W2-B` in `ROADMAP-PROGRESS.md`.
