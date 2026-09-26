# Custom Workout Builder (Muscle-Shape Drag-and-Drop) — Design

**Spec/plan:** No separate spec document preceded this — scoped directly from a user request plus an interactive brainstorming pass (2026-09-22/23 session) that resolved every open design question below through direct Q&A. This document is that resolved design, written up for implementation.

## Goal

Let a user build their own workout plan by dragging exercises onto days, with one constraint that keeps the result balanced: at most one exercise per muscle **sub-region** ("shape") per plan — e.g. a plan can include one upper-chest exercise and one mid-chest exercise, but not two mid-chest exercises. Each shape can offer an "easy" alternative so a user can pick something more approachable for a given area of their body.

This is **additive**, not a replacement: the existing preset programs (`DAYS_MALE`, `DAYS_FEMALE`, `DAYS_MALE_CAL`, `DAYS_FEMALE_CAL`, `DAYS_PREVIEW` in `app.js`) stay exactly as they are, as the default/quick-start path. The builder is a new, explicit opt-in entry point.

## Decisions already made (resolved in brainstorming, binding for this design)

1. **Mode:** Add-alongside, not replace. Presets remain the default.
2. **"Shape"** = an anatomical sub-region within a muscle group (user's own example: chest → upper/mid/lower chest), not the muscle group itself and not a training-split archetype.
3. **"Easy"** = a different, easier ALTERNATE exercise tagged for that shape (not the same exercise with reduced sets/load). Per shape, exercises carry a difficulty tier (`easy` / `medium` / `hard`); the builder can flag or filter to the easy-tier option.
4. **Constraint:** one exercise per shape per custom plan (not per muscle group — per the finer sub-region).
5. **Storage:** a custom-built plan shares the EXISTING "save up to 3 plans" slot system (`gym_coach_saved`, already localStorage-synced cross-device). No new backend endpoint, no separate cap.
6. **Taxonomy:** approved as-is (below), no changes requested.

## Muscle-shape taxonomy (approved)

| Muscle Group | Shapes |
|---|---|
| Chest | Upper chest, Mid chest, Lower chest |
| Back | Lats (width), Mid-back/rhomboids (thickness), Lower back/traps |
| Shoulders | Front delt, Side delt, Rear delt |
| Biceps | Long head (outer), Short head (inner) |
| Triceps | Long head, Lateral/medial head |
| Quads | Quads (single shape) |
| Hamstrings | Hamstrings (single shape) |
| Glutes | Glutes (single shape) |
| Calves | Calves (single shape) |
| Core | Upper abs, Lower abs, Obliques |

21 shapes total.

## Exercise curation (this session's output — the actual tagging pass)

Every exercise currently in `app.js`'s `DAYS_MALE` / `DAYS_FEMALE` / `DAYS_MALE_CAL` / `DAYS_FEMALE_CAL` / `DAYS_PREVIEW` arrays, deduplicated by `en` name (the same exercise appears under multiple `id`s across different day variants — every occurrence of that name gets the same tag), tagged with `shape` and `tier`. Tier heuristic used: bodyweight/machine/cable-stabilized movements → `easy`; dumbbell/moderate free-weight or single-limb movements → `medium`; barbell compound lifts and the most technically demanding movements → `hard`. This is a pragmatic convention, not a clinical assessment — a user can always add an explicit "difficulty" override later if this ever needs to be user-tunable.

| Exercise (`en`) | Shape | Tier | Notes |
|---|---|---|---|
| Barbell Bench Press | Chest — Mid | hard | |
| Dumbbell Bench Press | Chest — Mid | medium | |
| Incline Dumbbell Press | Chest — Upper | medium | |
| Cable Chest Fly | Chest — Mid | easy | |
| Push-ups | Chest — Mid | easy | |
| Overhead Cable Triceps Extension | Triceps — Long head | medium | overhead position biases long head |
| Cable Rope Pushdown | Triceps — Lateral/medial head | easy | |
| Bench Dips | Triceps — Lateral/medial head | easy | |
| Biceps + Triceps Superset | Triceps — Lateral/medial head | medium | combo move; tagged by its triceps half |
| Biceps Curl + Triceps Extension (superset) | Biceps — Short head | medium | combo move; tagged by its biceps half (see also below) |
| Lat Pulldown / Pull-up | Back — Lats | medium | |
| Inverted Row (under a table) | Back — Lats | medium | |
| Chest-Supported Row | Back — Mid-back/rhomboids | medium | |
| Seated Cable Row | Back — Mid-back/rhomboids | easy | |
| T-Bar Row | Back — Mid-back/rhomboids | hard | |
| One-Arm Dumbbell Row | Back — Mid-back/rhomboids | medium | |
| Chest-Supported Dumbbell Row | Back — Mid-back/rhomboids | easy | |
| Barbell Curl | Biceps — Short head | medium | |
| Incline Dumbbell Curl | Biceps — Long head | medium | stretched/behind-body position biases long head |
| Hammer Curl | Biceps — Short head | medium | pragmatic simplification — hammer curl is brachialis/brachioradialis-dominant, no dedicated shape exists for that in this taxonomy |
| Seated Dumbbell Shoulder Press | Shoulders — Front delt | medium | |
| Arnold Press | Shoulders — Front delt | medium | |
| Pike Push-ups | Shoulders — Front delt | medium | |
| Dumbbell Lateral Raise | Shoulders — Side delt | easy | |
| Band Pull-Apart | Shoulders — Rear delt | easy | |
| Band Face Pull | Shoulders — Rear delt | easy | |
| Barbell Back Squat | Quads | hard | |
| Leg Press | Quads | easy | |
| Hack Squat | Quads | medium | |
| Leg Extension | Quads | easy | |
| Bulgarian Split Squat | Quads | hard | |
| Goblet Squat | Quads | easy | |
| Reverse Lunge (Dumbbell) | Quads | medium | |
| Dumbbell Sumo Squat | Quads | medium | |
| Bodyweight Squats | Quads | easy | |
| Reverse Lunges | Quads | easy | |
| Squat Jumps | Quads | hard | |
| Barbell Romanian Deadlift | Hamstrings (primary) + Back — Lower back/traps (secondary) | hard | dual-tagged — RDL is genuinely both; also fills the otherwise-empty Lower back/traps shape |
| Dumbbell Romanian Deadlift | Hamstrings | medium | |
| Single-Leg Dumbbell RDL | Hamstrings | hard | |
| Lying Leg Curl | Hamstrings | easy | |
| Seated Leg Curl | Hamstrings | easy | |
| Dumbbell Glute Bridge | Glutes | easy | |
| Glute Bridge | Glutes | easy | |
| Band Glute Kickback | Glutes | easy | |
| Standing Calf Raise | Calves | easy | |
| Seated Calf Raise (Dumbbell) | Calves | easy | |
| Hanging Leg Raise (core) | Core — Lower abs | hard | |
| Lying Leg Raise (core) | Core — Lower abs | medium | |
| Flutter Kicks | Core — Lower abs | easy | |
| Mountain Climbers | Core — Lower abs | medium | full-body/cardio movement, tagged by its dominant core action |
| Weighted Cable Crunch (core) | Core — Upper abs | medium | |
| Hollow Body Hold | Core — Upper abs | medium | |
| Pallof Press (core) | Core — Obliques | medium | |
| Dead Bug (core) | Core — Obliques | easy | |
| Bear Crawl | Core — Obliques | medium | full-body movement, tagged by its dominant core-stability action |
| Superman | Back — Lower back/traps | easy | targets spinal erectors, moved here from "core" — fills the Lower back/traps shape alongside the RDL |
| Burpees | Core — Lower abs (secondary tag) | hard | full-body conditioning move; this tag is a pragmatic catalog-completeness choice, not an anatomically precise classification |

**Known gap, disclosed rather than papered over:** the catalog has no dedicated **Chest — Lower** exercise (would need a decline press variant, which has no demo video in this catalog today). That shape will show empty in the builder until a lower-chest exercise + video is added to the catalog in a future pass — this is expected, not a bug, and the builder UI must handle an empty shape gracefully (see below) rather than assuming every shape has at least one option.

## Builder UI

A new screen, reached via an explicit "Customize your own plan" entry point (exact placement — e.g. a button on the existing Plan screen or in the plan-chooser flow — is an implementation detail for the plan, not re-litigated here).

- **Layout:** a shape palette (grouped by muscle group, collapsible) on one side; a day-builder area on the other. The palette lists each shape's tagged exercises, with an "easy" badge on easy-tier options.
- **Interaction:** drag an exercise from the palette onto a day slot. Once an exercise from a given shape is placed anywhere in the plan, that shape's OTHER exercise options in the palette become disabled/grayed (the one-per-shape constraint). Removing the placed exercise re-enables its shape's other options.
- **Days:** no fixed day templates required — a day is just a user-named bucket of dragged-in exercises. Default to suggesting "Day 1 / Day 2 / ..." starting structure the user can rename/rearrange/add/remove.
- **Empty shapes** (e.g. Chest — Lower today): show in the palette with an explicit "no exercises yet for this area" state, not hidden and not silently omitted — so the gap is visible/honest rather than confusing.

## Storage / persistence

A custom-built plan is saved into the exact same `gym_coach_saved` slot system that already backs "Save up to 3 plans" (see `[[ai-assistant-relaunch-progress]]` for that feature's history — `Eslam1141.github.io#7`). No new backend endpoint, no new sync key, no separate cap — it competes for the same 3 slots as preset-derived saved plans. The saved-plan object's shape just needs to be compatible with whatever the existing "My plans" screen already renders (day list + exercises) — the builder's output should conform to that existing shape rather than introducing a parallel format.

## Open items explicitly deferred (not blocking this design, flagged for the implementer)

- Exact placement/wording of the "Customize your own plan" entry point.
- Whether building/saving a custom plan should fire an in-app notification (stream G, notifications, is a separate not-yet-designed piece of this same session's larger backlog) — not decided, not in scope for this plan.
- The Chest — Lower gap (no exercise exists) — explicitly left empty, not a blocker.

## Self-review (placeholder scan, consistency, ambiguity check)

- No "TBD"/"TODO" placeholders remain — every open question from the brainstorming session was resolved via direct user answers, captured above as "Decisions already made."
- Internal consistency: the curation table's shapes are all drawn from the approved taxonomy; no shape name drift.
- Scope: focused enough for a single implementation plan (curation — mechanical; builder UI — one new screen; storage — reuses an existing system). Not decomposed further.
- Ambiguity: the one real ambiguity (RDL/Superman filling the "Lower back/traps" gap via dual-tagging or reassignment) is made explicit above rather than left implicit.
