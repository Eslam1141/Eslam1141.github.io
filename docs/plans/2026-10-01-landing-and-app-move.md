# Etqadem landing at `/`, web app moves to `/app/`

**Goal:** a bilingual (EN/AR, full RTL) marketing landing page at the site root; the existing PWA keeps working, unchanged, at `/app/`. Main CTA "Start free" opens the app's sign-in at `/app/`.

**Depends on:** gym-ui#68 (`feat/logo-etqadem`, the `-etq` icon set). This branch is cut from it; rebase on `main` once #68 merges.

## Decision: where the app lives

| Option | Change | Verdict |
|---|---|---|
| A. Move every app file into `app/` in the repo | Touches every file path, git history, tools, docs | Too invasive |
| B. Keep files flat, nginx `alias /app/ -> /` | No repo moves, but the app's `index.html` and the landing's `index.html` collide at the image root | Fragile |
| **C. Keep the repo flat, lay the image out in two folders** | Repo: app files stay at the root (local dev unchanged), landing lives in `landing/`. Dockerfile copies the app into `/usr/share/nginx/html/app/` and `landing/` into the html root | **Chosen** |

Why C: the app already uses relative URLs almost everywhere (`styles.css`, `service-worker.js`, `manifest.json`, `icons/...`), so served from `/app/` it resolves everything under `/app/` with no rewrites. Only four absolute paths need fixing (below). The landing is a separate small page with its own CSS/JS, so it cannot regress the app.

## App fixes for the new base path

- `header.js`: admin link `"/admin.html"` -> `"admin.html"`.
- `admin.html` / `admin.js`: "back" links `href="/"` -> `href="./"` (back to `/app/`).
- `auth-email.js`: `location.pathname === "/reset-password"` -> `endsWith("/reset-password")`.
- `service-worker.js`: admin bypass `startsWith("/admin")` -> also `/app/admin`; secret check `pathname === "/reset-password"` -> `endsWith`.
- `manifest.json`: `start_url` `./` (resolves to `/app/`), `scope` `./`, plus `"id": "/index.html"` so the browser can treat it as the same app the old manifest installed (old app id = old start_url `/index.html`). Harmless for fresh installs; on Chrome it lets an installed WebAPK pick up the new start_url/scope instead of becoming a second app.
- API base (`/api/v1` default) and notification URLs (`./`, relative, from gym-be) need no change.

## Old installs and old links (migration)

- **Old installed PWAs** have `start_url=/index.html`, `scope=/`. nginx: `/index.html` -> `301 /app/` (query kept). `/app/` is inside the old scope, so the standalone window stays standalone.
- **Old service worker at scope `/`** (network-first, caches every GET). `landing/service-worker.js` is a retire worker served at the same URL `/service-worker.js`: `skipWaiting`, then on activate it unregisters itself and reloads the windows it controlled. Browsers re-check the root SW on any navigation inside `/` (landing or `/app/`), so it retires on the first visit after deploy. It deletes no caches: the new `/app/` worker's activate already deletes every cache key that is not its own, and deleting from the retire worker could race the new app cache. The landing itself registers no worker, so nothing can hijack `/` again.
- **Returning users on old bookmarks** (`/`): `landing/boot.js` (sync, in `<head>`, no inline script because of CSP) sends anyone with local app state (`gym_user_sub` or `gym_anon=1`) straight to `/app/`, unless they arrived from inside the site (same-origin referrer) or added `?home`. The bearer session is in `sessionStorage` (per tab), so "has app data" is the only signal a new tab has.
- **Password reset emails** (gym-be sends `https://repvane.cloider.app/?reset_token=...`): nginx `location = /` returns `302 /app/?reset_token=...` when the arg is present; `boot.js` repeats this for static servers. `/reset-password?token=` -> `302 /app/reset-password?token=`. No gym-be change required; a follow-up can point the email at `/app/` directly.
- `/manifest.json` -> `301 /app/manifest.json`; `/admin.html` -> `301 /app/admin.html`.
- **Google Sign-In:** GSI (`google.accounts.id`, popup/FedCM, no `login_uri`, no `ux_mode: redirect`) validates the JavaScript origin only. Origin is unchanged, so **no Google console change is required**. USER TO-DO (optional): none for the path move; still open from the rename: OAuth consent-screen app name -> Etqadem.

## nginx

- Security headers move into one snippet, `docker/security-headers.conf`, copied to `/etc/nginx/snippets/` and included at server level **and** inside every location that sets its own `add_header` (nginx drops inherited headers there). This also fixes an existing gap: `location = /index.html` set only Cache-Control, so the app's HTML was served without the CSP.
- No-cache: `/` (landing), `/service-worker.js`, `/app/index.html`, `/app/service-worker.js`, `/app/manifest.json`, `/app/config.js` (alias to `/tmp/gym-config/config.js`), `/app/reset-password` (`try_files /app/index.html`).
- `/app/admin.(html|js|css)`: `no-store`, `noindex`.
- Immutable one-year cache: `^/(app/)?icons/` and `/assets/` (landing images and fonts, new filenames on change).
- CSP stays as is; the landing needs only `'self'` (self-hosted Alexandria font, self-hosted photo and screenshots, no inline scripts). `font-src` falls back to `default-src 'self'`.

## Dockerfile

- `COPY` app files to `/usr/share/nginx/html/app/`, `icons/` to `/app/icons/` and to `/icons/` (landing favicon/logo), `widgets/` to `/app/widgets/`, `landing/` to the html root, the header snippet to `/etc/nginx/snippets/`.
- Cache-hash step runs in `/usr/share/nginx/html/app` with the same file list (unchanged names). The landing is not precached and not hashed.

## Landing page (`landing/`)

`index.html`, `landing.css`, `landing.js` (language toggle), `boot.js` (redirects, language before paint), `service-worker.js` (retire worker), `assets/` (photo, app screenshots, Alexandria woff2 subsets). Language uses the app's own key, `localStorage.gym_lang` (`en`/`ar`), so a choice on the landing carries into the app. Strings live in one dictionary in `landing.js` with `data-i18n` keys like the app; `<html lang dir>` flips together.

Content rules (PRODUCT.md): only shipped features; no stats, testimonials, ratings, store badges; InBody/body assessment present but not the centre; never presented as paid.

## Tasks

1. Plan (this file) + surface brief contract.
2. Path fixes in the app + manifest.
3. nginx + Dockerfile + retire worker + local nginx-like dev server (`tools/serve-like-nginx.mjs`).
4. Landing page: assets (photo, screenshots, font), markup, CSS, i18n.
5. Verify (see below), screenshots to `Gym_repo/brand/landing-preview/`, draft PR.

## Verification

`node --check` on changed JS; Docker image build if a daemon is available, otherwise `tools/serve-like-nginx.mjs` (mirrors the nginx rules above) and say so; Playwright: landing EN/AR at 390 and 1440, Start free -> `/app/` sign-in, app header logo, offline reload at `/app/`, old root-SW retirement (register the old worker at `/` first, then load the new build); image weight and layout shift.
