# Profile + Notifications UI (gym-ui) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared top-right header (streak badge + notification bell + avatar menu), a Profile screen (photo, editable stats, streak/days trained) and an in-app notification inbox to the vanilla-JS PWA, and remove the old web-push opt-in UI.

**Architecture:** Three new self-contained IIFE files — `header.js` (owns the `#topBar` container, the cached `GET /me` doc, the authenticated fetch helper and the avatar/streak UI), `notifications.js` (bell + badge + panel, reads `GET /notifications?limit=50`), `profile.js` (the `#screen-profile` screen). They communicate through `window.GymHeader` and two DOM events emitted by `sync.js` (`gym:authchange`, `gym:synctick`) so polling rides the existing GymSync cadence (2-min interval / tab visible / online / sign-in) instead of a new timer. Edits to shared files (index.html, app.js, ui.js, sync.js) are small and additive because stream W1-B edits auth/onboarding concurrently.

**Tech Stack:** Vanilla ES5-style JS (same as calendar.js), CSS custom properties, nginx static container.

**Spec:** `gym-be` `origin/worktree-profile-photo-streak:docs/specs/2026-09-23-profile-photo-streak.md` (Frontend design) and `gym-be` `origin/main:docs/specs/2026-09-23-in-app-notifications.md` (Frontend design).

## Global Constraints

- API base: `(window.GYM_API_BASE || "/api/v1").replace(/\/+$/, "")`; auth: `"Authorization": "Bearer " + GymSync.token()`; 8 s AbortController timeout (calendar.js `fetchTimeout` pattern).
- `GET /me` → `{id,email,name,picture,trainingDays,displayName,weightKg?,heightCm?,currentStreak,totalDaysTrained,photoURL}`; `photoURL` is `""` or `"/me/photo"` (relative to API base).
- `PUT /me/profile` body exactly `{displayName, weightKg, heightCm}` (unknown fields → 422). All three required: displayName 1–50 chars trimmed, weightKg 20–400, heightCm 50–250. Bad values → 422 `{error:{...message}}`.
- `POST /me/photo`: RAW body (not multipart), `Content-Type: image/jpeg` or `image/png` only (else 422), 5 MiB cap (`5<<20`, else 413), success 204.
- `GET /me/photo`: authenticated, 404 when none. CSP `img-src 'self' data: https:` has no `blob:` → convert the blob to a `data:` URL with FileReader.
- `GET /notifications?limit=50` → `{items:[{id,title,body,url,createdAt,readAt?}], unreadCount}` newest first. `POST /notifications/{id}/read` → 204 (idempotent), 404 if not the caller's.
- Header container hidden when not signed in (anonymous mode included), during onboarding and the plan chooser. Streak badge only when `currentStreak > 0`.
- Strings: every user-visible string in both EN and AR via app.js `T = { key: [en, ar] }` / global `t(key)`; layout mirrors in RTL.
- New JS files must be listed in: Dockerfile `COPY` line, Dockerfile hash `cat` list, service-worker `ASSETS` (all three in sync).
- Use existing tokens (`--accent`, `--panel`, `--line`, `--paper`, `--paper-dim`, `--green`); no rename of "Athlex", no color changes.
- Do not collide with the ≥900px left rail (`--side-w`): the header sits at the inline-END edge; the rail is at the inline-START edge.

## Review Focus

1. Token expires / 401 mid-session → header helpers must not throw or loop; hide gracefully and let sync.js's existing auth-lost path route to login.
2. Backend without the profile branch deployed (`/me` lacks new fields, `/me/profile` 404/405) → header still renders (no streak, default avatar), profile save shows a generic error rather than crashing.
3. Language toggled while panel/profile open → text re-renders in the new language (MutationObserver on `<html lang>`).
4. Sign-out from the avatar menu while the notifications panel is open → panel closes, cached `/me` + notifications cleared so the next account never sees the previous one's data.
5. Photo > 5 MiB, wrong type (HEIC/GIF/PDF), 413/422 from server → clear localized message, no upload for client-rejected files.

---

### Task 1: Shared header container (header.js) + plumbing

**Files:**
- Create: `header.js`, `icons/avatar-default.svg`
- Modify: `index.html` (add `<div id="topBar" hidden>` after `#appNav`; `<script src="header.js" defer>` after calendar.js), `sync.js` (emit `gym:authchange` at top of `renderAuthUI()`, emit `gym:synctick` from `syncNow()` for non-debounce reasons), `app.js` (T keys block), `styles.css` (append `#topBar` styles), `Dockerfile`, `service-worker.js`

**Interfaces — Produces:**
- `window.GymHeader.api(path, opts) -> Promise<Response>` (rejects `Error("signed-out")` without a token; adds Bearer + timeout)
- `GymHeader.me() -> object|null`, `GymHeader.refreshMe() -> Promise<object|null>`, `GymHeader.setMe(patch)`
- `GymHeader.photo() -> string|null` (data: URL), `GymHeader.reloadPhoto() -> Promise`
- `GymHeader.onChange(fn)` — fn called after `/me`/photo/auth changes
- `GymHeader.slot("bell") -> HTMLElement|null` — container element reserved for notifications.js
- `GymHeader.str(key, params) -> string` — `t()` wrapper with `{n}` substitution
- Events on `document`: `gym:authchange`, `gym:synctick` (detail = reason)

- [ ] Step 1: add `<div id="topBar" hidden aria-label="Account"></div>` and script tag; T keys; sync.js two event emits.
- [ ] Step 2: write header.js: render `[streak][bell slot][avatar button + dropdown(Go to profile, Sign out)]`; show only when `GymSync.isSignedIn()`; refresh `/me` on authchange + synctick; clear caches on sign-out; re-render on `<html lang>` change; close dropdown on outside click / Escape.
- [ ] Step 3: CSS: fixed at `top: calc(env(safe-area-inset-top) + 10px)`, `inset-inline-end: 12px`, z-index 110 (below nav 120 / modals); hidden with `body.onboarding-open` and `body:has(#planChooser:not([hidden]))`.
- [ ] Step 4: add header.js + icons/avatar-default.svg to Dockerfile COPY (icons/ dir already copied), hash list, SW ASSETS.
- [ ] Step 5: `node --check header.js sync.js app.js service-worker.js`; commit.

### Task 2: Notifications bell + panel (notifications.js)

**Files:** Create `notifications.js`; modify `index.html` (script tag), `styles.css`, `app.js` (T keys already in Task 1 block), Dockerfile/SW lists.

**Interfaces — Consumes:** `GymHeader.api`, `GymHeader.slot("bell")`, `GymHeader.str`, events. **Produces:** `window.GymNotifications = { refresh(), open(), close() }`.

- [ ] Step 1: bell button in slot with badge (`unreadCount`, "9+" cap); `aria-label` includes unread count.
- [ ] Step 2: panel (dialog, backdrop) lists items newest first: title, body, relative time (`Intl.RelativeTimeFormat` in the active locale, fallback to T strings), unread dot; empty + error states; textContent only (no innerHTML of server data).
- [ ] Step 3: tap → optimistic mark read (`readAt`, decrement badge), `POST /notifications/{id}/read`; then follow `url` only if same-origin and not the current page, else just close.
- [ ] Step 4: refresh on synctick, authchange (clear on sign-out), and every panel open.
- [ ] Step 5: pure helper `relTime(iso, nowMs)` smoke-tested with node; `node --check`; commit.

### Task 3: Profile screen (profile.js)

**Files:** Create `profile.js`; modify `index.html` (`<div id="screen-profile" class="screen" hidden>` + script tag), `ui.js` (add `"profile"` to `TABS`), `styles.css`, Dockerfile/SW lists.

**Interfaces — Consumes:** `GymHeader.*`, `GymUI.navigate("profile")`, `GymSync.signOut()`. **Produces:** `window.GymProfile = { refresh() }`.

- [ ] Step 1: screen: photo (current/default) + "Change photo" (`<input type=file accept="image/jpeg,image/png">`), form (display name, weight, height), progress card (streak "N-day streak" / none, total days trained), sign-out button; signed-out state → sign-in prompt button (`GymUI.promptSignIn`).
- [ ] Step 2: photo flow: type check (jpeg/png) → downscale to ≤1024px JPEG via FileReader→Image→canvas (fallback: original) → size check ≤ 5 MiB → raw POST; 413/422/other → localized message; success → `GymHeader.reloadPhoto()`.
- [ ] Step 3: form: client validation mirrors server bounds; PUT; 422 → show server-bound message for the field; success → `GymHeader.setMe(...)`.
- [ ] Step 4: refresh when the screen becomes visible (MutationObserver on `hidden`) and on lang change.
- [ ] Step 5: pure `validateProfile(name, w, h)` smoke-tested with node; `node --check`; commit.

### Task 4: Remove web-push opt-in UI

**Files:** Modify `calendar.js` (delete push section, `pushHost`, `reconcilePushSubscription`, `enablePush` export, reminder strings, header comment; one-time `localStorage.removeItem("gym_push_endpoint")`), `index.html` (drop `#morePush`), `styles.css` (drop `.cal-push-btn`), `service-worker.js` (drop `push`/`notificationclick`/`pushsubscriptionchange` handlers), `config.js` + `docker/40-render-config.sh` (drop `GYM_VAPID_PUBLIC_KEY`), `sync.js` (comment only; keep `gym_push_endpoint` in LOCAL_ONLY so stale values on other devices never sync).

- [ ] Step 1: edits; `grep -n -i "push\|vapid"` shows only the kept LOCAL_ONLY entry/comment + unrelated exercise names.
- [ ] Step 2: `node --check calendar.js service-worker.js sync.js config.js`; `sh -n docker/40-render-config.sh`; commit.

### Task 5: Verify, push, PR

- [ ] Step 1: `node --check` on every changed JS; confirm the three asset lists match (script diff).
- [ ] Step 2: self-review diff against Global Constraints + Review Focus.
- [ ] Step 3: push branch, `gh pr create` with summary, phone checks, test plan.
