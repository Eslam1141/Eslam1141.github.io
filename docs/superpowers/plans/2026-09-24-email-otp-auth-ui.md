# Email/Password/OTP Sign-in UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user sign up / log in / reset a password with email + password (+ emailed OTP) from the onboarding screen, landing in exactly the same signed-in state as Google sign-in.

**Architecture:** `sync.js` stays the single owner of the bearer token; it gains a source-agnostic `acceptToken(token, source)` (Google `onCredential` becomes a thin wrapper) plus local-token specifics (no GIS refresh; expiry/401 → "log in again"). All new UI + API calls live in a new `auth-email.js` (+ `auth-email.css`) that renders into a new `#obStepEmail` onboarding step. nginx gets a narrow `location = /reset-password` fallback to `index.html`.

**Tech Stack:** vanilla ES5-style JS (IIFE modules, no build), nginx 1.27, no test framework (verification = `node --check` + a throwaway node harness for pure functions + manual phone checklist).

**Spec:** gym-be `origin/worktree-email-password-otp-auth:docs/specs/2026-09-23-email-password-otp-auth.md` (Frontend design) + handlers `internal/api/localauth.go`, error sentinels `internal/localauth/service.go`.

## Global Constraints

- Endpoints under `GYM_API_BASE` (default `/api/v1`): `POST /auth/signup {email,password,phone,lang}` → 202; `POST /auth/verify-otp {email,code,password}` → `{token}`; `POST /auth/login {email,password}` → `{token}`; `POST /auth/request-reset {email,lang}` → 202; `POST /auth/reset-password {token,newPassword}` → 200 `{status}` (no token).
- Request bodies are decoded with `DisallowUnknownFields` → send exactly those fields.
- Error envelope: `{"error":{"code","message"}}`. Codes: 422 `invalid_request`/`invalid_body`; 409 `phone_already_registered` / `phone_conflict`; 429 `rate_limited` (1 email per 5 min, 3/day); 401 `unauthorized`; 503 `unavailable`.
- Password rule: ≥8 chars, ≥1 letter, ≥1 digit. Phone: `^\+[1-9]\d{7,14}$` (strip spaces/dashes/parens client-side first). OTP: 6 digits, 10 min.
- Local JWT: `iss:"gym-be"`, `sub` = user id, `email`, `exp` = +1h, no name/picture. No refresh endpoint.
- `lang` = `"ar"` when the app is Arabic, else `"en"`.
- Backend reset email link today: `https://gym-app.cloider.app/?reset_token=<tok>`; task brief says `/reset-password?token=<tok>` → support BOTH.
- W1-A edits the same repo concurrently: new code in new files; only minimal additive hooks in index.html / ui.js / sync.js; strings registered into app.js's `T` from auth-email.js (no app.js edit).
- Dockerfile COPY list, Dockerfile hash list, service-worker `ASSETS` must stay in sync.

## Review Focus

- Refresh during OTP entry: password lives only in memory → OTP view must re-ask for the password when it's missing (sessionStorage keeps only the email).
- Local token expiring while the app is open / after a reload: must land on the email login view with "session expired", never the 8s GIS "resolving…" hold (GIS can't restore a local session).
- Phone typed with spaces/dashes or without `+` → normalize/validate client-side with a clear message, not a raw 422.
- Reset link opened on a device that is currently signed in / anon → reset view must still show; URL param must be scrubbed via `history.replaceState` so reload doesn't re-trigger.
- Sign-out after local sign-in must clear the cached token, `gymauth_method`, remembered email, and not show "session expired".

---

### Task 1: Token-source-agnostic auth layer in sync.js

**Files:** Modify `sync.js`.

**Interfaces — Produces:**
- `GymSync.signInWithToken(token)` → `boolean` (false if token unparseable/expired). Local JWT.
- `GymSync.authMethod()` → `"google" | "local" | null`.
- Calls optional `window.GymAuthEmail.onSessionExpired(email)` when a LOCAL session is lost to expiry/401.
- Device-local keys (not `gym_`-prefixed → never synced): `gymauth_method` (`"local"` while the last session on this device was local), `gymauth_email` (email to prefill re-login).

- [ ] Step 1: add `source` var; `saveCachedSession` stores `source`; restore reads it (default `"google"`).
- [ ] Step 2: extract `acceptToken(token, source)` from `onCredential` (same switch-detection + first-sign-in migration using JWT `sub`). For `source==="local"` in the account-switch branch: wipe, set `gym_user_sub`, set token + `saveCachedSession()` and reload (no `gym_switch` flag — the cached session restores it, GIS isn't involved).
- [ ] Step 3: `scheduleTokenRefresh`: local → timer at `exp-30s` calls `handleAuthLost("expired")`; google unchanged.
- [ ] Step 4: `handleAuthLost(reason)`: remember `wasLocal`; clear cached session on local loss; after `promptSignIn()`, if `reason==="expired" && wasLocal` call `GymAuthEmail.onSessionExpired(email)`. 401 in `syncNow` passes `"expired"`. `signOut` passes nothing and removes `gymauth_method`/`gymauth_email`.
- [ ] Step 5: `shouldResolveSilently`: cold-start branch returns false when `gymauth_method==="local"`. `initAuth`: restore cached session BEFORE the `!CLIENT_ID` early return.
- [ ] Step 6: `node --check sync.js`; commit.

### Task 2: auth-email.js core (API client, errors, strings) + build wiring

**Files:** Create `auth-email.js`, `auth-email.css` (empty-ish shell here); Modify `index.html` (script/link tags), `Dockerfile` (COPY + hash list), `service-worker.js` (ASSETS).

**Interfaces — Produces (inside auth-email.js):**
- `STR` object `{key:[en,ar]}` merged into global `T` at load (`Object.assign(T, STR)` guarded by `typeof T`).
- `tr(key)` → uses global `t()` if present else STR.
- `api(path, body)` → `Promise<{ok, status, code, message, data}>` (never rejects; network error → status 0).
- `errorText(res, ctx)` where ctx ∈ `"signup"|"otp"|"login"|"forgot"|"reset"` → localized string.
- `normPhone(s)`, `validEmail(s)`, `validPassword(s)`, `validPhone(s)`, `validOtp(s)`.
- `curLang()` → `"ar"|"en"`.

- [ ] Step 1: write the module with the pure helpers exported on `window.GymAuthEmail._test`.
- [ ] Step 2: node harness in the scratchpad (not committed) stubbing `window`/`document`, asserting: `normPhone("+20 100-123 4567")==="+201001234567"`, `validPhone("01001234567")===false`, `validPassword("abcdefg1")===true`, `validPassword("abcdefgh")===false`, `errorText({status:409,code:"phone_already_registered"},"signup")` is the phone-taken string, 429 → cooldown string, 503 → unavailable string, 401+login → bad-credentials string, 0 → network string.
- [ ] Step 3: run harness, `node --check`; wire Dockerfile/SW/index.html; commit.

### Task 3: Onboarding email views (login / sign-up / OTP / forgot)

**Files:** Modify `index.html` (button in `#obStepChoices`, empty `#obStepEmail` step), `ui.js` (`showObStep` knows `"email"`; expose `GymUI.showObStep`), `auth-email.js` (views), `auth-email.css`.

- [ ] Step 1: `ui.js showObStep`: `var email = el("obStepEmail"); if (email) email.inert = step !== "email";` and toggle `#onboarding.ob-email-mode`; export `showObStep`.
- [ ] Step 2: views rendered into `#obStepEmail` with `data-i18n` labels (re-translated by app.js `applyStaticI18n` on language switch). Submit handlers: client validation → `api()` → `errorText()` inline in an `aria-live` region; busy state disables the submit button.
  - signup → 202 → OTP view (email in sessionStorage `gymauth_otp_email`, password kept in a closure var).
  - OTP → `{token}` → `GymSync.signInWithToken(token)`; resend = re-POST signup (needs phone+password in memory; otherwise tell user to sign up again), 5-min client cooldown after send/429.
  - login → `{token}` → signInWithToken; 401 message mentions unverified accounts.
  - forgot → always shows the neutral "if an account exists…" message (429 shows cooldown).
- [ ] Step 3: `GymAuthEmail.onSessionExpired(email)` + DOMContentLoaded init: if not signed in and `gymauth_method==="local"` and onboarding is showing → open login with notice + prefilled email.
- [ ] Step 4: `node --check` all changed JS; commit.

### Task 4: Password-reset route (nginx + app)

**Files:** Modify `docker/default.conf`, `auth-email.js`.

- [ ] Step 1: nginx: `location = /reset-password { add_header Cache-Control "no-cache"; try_files /index.html =404; }` + repeat the security `add_header`s inside it (nginx drops server-level add_header in any location that sets its own).
- [ ] Step 2: app: at init, token = `?reset_token=` on any path or `?token=` on `/reset-password`; if present → show onboarding in email mode with reset view; `history.replaceState(null,"","/")`; submit → POST reset-password → login view with "password updated" notice. index.html uses relative asset URLs (`styles.css`, `app.js`), which resolve fine from `/reset-password` (same directory level `/`).
- [ ] Step 3: `node --check`; commit.

### Task 5: Finish

- [ ] Full `node --check` pass, review diff, push, `gh pr create` with manual phone checklist, update ledger + ROADMAP-PROGRESS.
