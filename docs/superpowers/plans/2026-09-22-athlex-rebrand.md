# Athlex Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every remaining user-visible "Muscle Building Plan" / "Gym Plan" string with "Athlex", now that the Athlex icon/logo is already live, so the app's name matches its brand mark everywhere a user or search engine sees it.

**Architecture:** This is a content-only rename across two repos: `Eslam1141.github.io` (the PWA frontend — manifest, static HTML, the `T.appTitle` i18n string that JS applies at runtime) and `gym-be` (a checked-in seed-data mirror of that same `appTitle` string, embedded via `go:embed` and served — but read-only-once — through `/api/v1/plans`). No new files, no new dependencies, no behavior change beyond the strings and two manifest color fields chosen to match the already-shipped icon's background.

**Tech Stack:** Vanilla JS PWA (no build step), `manifest.json` (Web App Manifest spec), Go (`gym-be`, `encoding/json`, `go:embed`), `go test`.

**Spec:** No separate spec document — this plan is scoped directly from the user's request ("rename to Athlex everything") plus the codebase's own already-committed Athlex branding work (icons, `athlex-design-philosophy.md`) from earlier in this session.

## Global Constraints

- Brand name "Athlex" is used verbatim in both the English and Arabic locale strings (it is a coined brand name, not a translatable word — the same convention already used for the Athlex wordmark in the icon artwork).
- Out of scope: `gym-be/docs/specs/2026-09-09-gym-platform-design.md` and `gym-be/docs/superpowers/plans/2026-09-09-gym-ui-container-and-sync.md` — these are historical plan/spec records already committed to the repo; this project's convention (established earlier in this session) is to never rewrite historical plan docs after the fact.
- Out of scope: `maleSub`/`femaleSub`-style copy like `"4-day gym plan"` in `app.js`/`index.html` — that is describing a workout program, not the app's brand name, and must not be touched.
- `gym-be/internal/plans/plans.seed.json`'s `data.i18n.strings.appTitle` mirror is seeded into MongoDB **only once**, by `SeedIfEmpty` (`internal/store/plans.go:43`), which is a no-op if the `plans` collection already has a document — which it does in production. Editing this file changes the checked-in source of truth (what a fresh environment or a manual reseed would get) but does **not** change what's already live in the production database. This plan does not attempt a live-data migration — flag it to the user separately if they want the already-seeded production copy corrected too (that needs either a one-off authenticated write against the running Mongo instance, or a new admin/reseed code path — both out of scope here).

---

## File Structure

| File | Responsibility |
|---|---|
| `Eslam1141.github.io/manifest.json` | PWA install metadata: app name shown on the home-screen/app-drawer, and the theme/splash-screen colors. |
| `Eslam1141.github.io/index.html` | Static (pre-JS-paint) `<title>`, iOS home-screen label, and the `<h1>` fallback text shown before `app.js` runs. |
| `Eslam1141.github.io/app.js` | The single runtime source of truth for the visible title (`T.appTitle`, applied via `document.title` / `#appTitleEl.textContent` in `boot()` and elsewhere). |
| `Eslam1141.github.io/service-worker.js` | Caches the above files; its `CACHE_NAME` must be bumped whenever their content changes, per this repo's existing convention (v21→v22→v23 bumps already in history). |
| `gym-be/internal/plans/plans.seed.json` | A checked-in mirror of `T.appTitle`, embedded into the Go binary and served (once, on first Mongo seed) through `/api/v1/plans`. |
| `gym-be/internal/plans/handler_test.go` | Existing test file for the `plans` package; gets one new test locking in the renamed title. |

---

### Task 1: PWA manifest branding

**Files:**
- Modify: `Eslam1141.github.io/manifest.json`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing consumed by later tasks — this is a leaf content change.

- [ ] **Step 1: Edit the name, short name, and theme colors**

Open `Eslam1141.github.io/manifest.json`. It currently starts:

```json
{
  "name": "Muscle Building Plan",
  "short_name": "Gym Plan",
  "description": "Workout plans with weight tracking, rest timer and form videos",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0d1117",
  "theme_color": "#0d1117",
```

Change it to:

```json
{
  "name": "Athlex",
  "short_name": "Athlex",
  "description": "Workout plans with weight tracking, rest timer and form videos",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#090a10",
  "theme_color": "#090a10",
```

`background_color`/`theme_color` change from `#0d1117` to `#090a10` (the exact near-black used as the background in `icons/logo.svg`, `icons/icon-*.png` and `icons/icon-maskable-*.png`) so the PWA splash screen and browser chrome no longer show a visibly different dark shade than the icon itself. Leave every other key (`icons`, `dir`, `lang`, `description`) untouched.

- [ ] **Step 2: Verify the file is still valid JSON**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8')); console.log('manifest.json: valid JSON')"
```
Expected output: `manifest.json: valid JSON`

- [ ] **Step 3: Commit**

```bash
git add manifest.json
git commit -m "$(cat <<'EOF'
rebrand: rename PWA manifest to Athlex

name/short_name were still "Muscle Building Plan"/"Gym Plan" from before
the Athlex icon shipped. Also align background_color/theme_color to the
icon's own #090a10 so the splash screen and browser chrome match it.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Static HTML branding

**Files:**
- Modify: `Eslam1141.github.io/index.html`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing consumed by later tasks — `app.js` (Task 3) overwrites `#appTitleEl`/`document.title` at runtime regardless of this file's static text, so the two tasks are independent, not sequential.

- [ ] **Step 1: Edit the static `<title>`, Apple home-screen label, and `<h1>` fallback**

In `Eslam1141.github.io/index.html`:

Line 6 — change:
```html
<title>Muscle Building Plan</title>
```
to:
```html
<title>Athlex</title>
```

Line 15 — change:
```html
<meta name="apple-mobile-web-app-title" content="Gym Plan">
```
to:
```html
<meta name="apple-mobile-web-app-title" content="Athlex">
```

Line 92 — change:
```html
<h1 id="appTitleEl">Muscle Building Plan</h1>
```
to:
```html
<h1 id="appTitleEl">Athlex</h1>
```

This `<h1>` text is immediately overwritten by `app.js`'s `boot()` (`document.getElementById("appTitleEl").textContent = t("appTitle")`), so it is only ever seen for a frame before JS runs, or with JS disabled — but it must still say Athlex, both for that split second and for any tool that reads the raw HTML (crawlers, view-source, no-JS fallback).

- [ ] **Step 2: Verify no old strings remain in this file**

Run:
```bash
grep -n "Muscle Building Plan\|Gym Plan" index.html
```
Expected: no output (grep exits 1, meaning zero matches).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
rebrand: rename static HTML branding to Athlex

<title>, the Apple home-screen label, and the pre-JS <h1> fallback all
still said the old name.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Runtime i18n title + service-worker cache bump

**Files:**
- Modify: `Eslam1141.github.io/app.js`
- Modify: `Eslam1141.github.io/service-worker.js`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing consumed by later tasks.

**Context:** `T.appTitle` (an `[en, ar]` pair) is the actual string a signed-in user sees — `app.js` applies it to `document.title` and `#appTitleEl.textContent` in three places (`boot()`, and the plan-switch re-render). The service worker caches `app.js`/`index.html`/`manifest.json` and is network-first (falls back to cache only when offline — see the comment already in `service-worker.js`), so bumping `CACHE_NAME` is not required for users to see this change on their next load, but every prior branding-affecting deploy in this repo's history (v21→v22→v23) bumped it anyway, so a stale offline cache never serves the old name; this task keeps that convention.

- [ ] **Step 1: Edit `T.appTitle`**

In `Eslam1141.github.io/app.js`, find:
```javascript
const T = {
  appTitle:["Muscle Building Plan","خطة بناء العضلات"],
```
Change to:
```javascript
const T = {
  appTitle:["Athlex","Athlex"],
```

- [ ] **Step 2: Bump the service-worker cache name**

In `Eslam1141.github.io/service-worker.js`, find:
```javascript
const CACHE_NAME = "gym-plan-v23";
```
Change to:
```javascript
const CACHE_NAME = "athlex-v1";
```

(The `gym-plan-vNN` counter resets here deliberately — `athlex-v1` marks this as the point the app's identity actually became Athlex everywhere; the exact number carries no other meaning, the service worker only needs it to differ from the previous deploy's value.)

- [ ] **Step 3: Syntax-check both files**

Run:
```bash
node -c app.js && node -c service-worker.js && echo "syntax OK"
```
Expected output: `syntax OK`

- [ ] **Step 4: Verify no old strings remain in either file**

Run:
```bash
grep -n "Muscle Building Plan\|Gym Plan\|gym-plan-v" app.js service-worker.js
```
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add app.js service-worker.js
git commit -m "$(cat <<'EOF'
rebrand: rename runtime app title to Athlex, bump SW cache

T.appTitle is what boot() actually writes to document.title and
#appTitleEl — the last remaining "Muscle Building Plan" a signed-in user
would see. Bump CACHE_NAME per this repo's existing per-deploy convention
so an offline install's cached fallback can't keep serving the old name.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: gym-be seed-data mirror + regression test

**Files:**
- Modify: `gym-be/internal/plans/plans.seed.json`
- Modify: `gym-be/internal/plans/handler_test.go`
- Test: `gym-be/internal/plans/handler_test.go` (same file — this repo keeps unit tests alongside the handler, not in a separate `_test` tree)

**Interfaces:**
- Consumes: nothing from Tasks 1–3 (different repo, no shared code).
- Produces: nothing consumed elsewhere — this is a leaf content change plus its own regression test.

**Context:** `plans.seed.json` has, at `data.i18n.strings.appTitle`, a byte-for-byte mirror of the same `[en, ar]` pair `app.js` defines as `T.appTitle` (confirmed: `app.js` line 3 carries the comment `// Mirrors data.preview in gym-be/internal/plans/plans.seed.json.` documenting this as an intentional, maintained duplication). It is embedded via `//go:embed plans.seed.json` in `internal/plans/seed.go` and reachable through `SeedDocument()` → `GET /api/v1/plans`. Per the Global Constraints above, editing it only affects the checked-in source of truth, not the already-seeded production database.

- [ ] **Step 1: Write the failing test**

Open `gym-be/internal/plans/handler_test.go`. After the existing `TestSeedDocument_Parses` test (it ends around line 82 with the `preview.exercises` check), add:

```go
func TestSeedDocument_AppTitleIsAthlex(t *testing.T) {
	doc, err := SeedDocument()
	if err != nil {
		t.Fatalf("SeedDocument: %v", err)
	}
	var data struct {
		I18n struct {
			Strings struct {
				AppTitle []string `json:"appTitle"`
			} `json:"strings"`
		} `json:"i18n"`
	}
	if err := json.Unmarshal(doc.Data, &data); err != nil {
		t.Fatalf("data not valid json: %v", err)
	}
	if len(data.I18n.Strings.AppTitle) != 2 {
		t.Fatalf("i18n.strings.appTitle = %v, want a 2-element [en, ar] pair", data.I18n.Strings.AppTitle)
	}
	if data.I18n.Strings.AppTitle[0] != "Athlex" || data.I18n.Strings.AppTitle[1] != "Athlex" {
		t.Fatalf("i18n.strings.appTitle = %v, want [\"Athlex\", \"Athlex\"]", data.I18n.Strings.AppTitle)
	}
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
go test ./internal/plans/... -run TestSeedDocument_AppTitleIsAthlex -v
```
Expected: FAIL — `i18n.strings.appTitle = [Muscle Building Plan ...], want ["Athlex", "Athlex"]`

- [ ] **Step 3: Edit the seed JSON**

In `gym-be/internal/plans/plans.seed.json`, find (under `data.i18n.strings`):
```json
        "appTitle": [
          "Muscle Building Plan",
          "خطة بناء العضلات"
        ],
```
Change to:
```json
        "appTitle": [
          "Athlex",
          "Athlex"
        ],
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
go test ./internal/plans/... -v
```
Expected: PASS for every test in the package, including `TestSeedDocument_AppTitleIsAthlex` and the pre-existing `TestSeedDocument_Parses` (still checks `plans`/`preview.exercises`, unaffected by this change).

- [ ] **Step 5: Commit**

```bash
git add internal/plans/plans.seed.json internal/plans/handler_test.go
git commit -m "$(cat <<'EOF'
rebrand: rename seeded appTitle mirror to Athlex, add regression test

Keeps plans.seed.json's data.i18n.strings.appTitle in sync with
frontend app.js's T.appTitle, per the "Mirrors data.preview in
gym-be/..." contract documented at the top of app.js. Note: SeedIfEmpty
only inserts when the plans collection is empty, so this updates the
checked-in source of truth for fresh/dev environments — it does not
retroactively change the already-seeded production document.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:** every remaining occurrence of "Muscle Building Plan" / "Gym Plan" found by repo-wide search (`manifest.json`, `index.html` ×3, `app.js`, `gym-be/internal/plans/plans.seed.json`) has a task. The two historical-doc occurrences and the `maleSub`/`femaleSub` "4-day gym plan" occurrences are explicitly excluded in Global Constraints with a reason.

**Placeholder scan:** no TBD/TODO; every step has literal before/after content or a literal runnable command with its expected output.

**Type consistency:** `T.appTitle` stays a 2-element `[en, ar]` array (Task 3) matching the shape the new Go test asserts (Task 4) and the shape `app.js`'s own `t()` helper already expects elsewhere in the file — no signature or shape changes anywhere.

---

Plan complete and saved to `Eslam1141.github.io/docs/superpowers/plans/2026-09-22-athlex-rebrand.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
