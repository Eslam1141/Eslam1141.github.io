# W2-A: RepVane teal rebrand + onboarding + Premium-coming-soon

Worktree: `.claude/worktrees/rebrand-teal`, branch `feat/rebrand-teal` off `origin/main` (a298050).
Source: Phase 2 of `C:\Users\L\.claude\plans\elegant-gathering-thunder.md`, user's teal pick `#0B7A75`,
ROADMAP-PROGRESS.md Wave 2 line ("Premium coming soon", no Paymob).

Note: the app has no light/dark theme toggle (it's a single dark UI with a male/female accent-color
variant). "Check contrast in light and dark" is interpreted as: verify the teal accent against the
app's actual surfaces — the dark panels (`--bg`/`--panel`/`--panel2`) and any full-white text on a
solid teal fill — since there is no light surface in this app to test against.

## Task 1 — Color tokens (styles.css)
- `--accent: #0B7A75` (primary — fills, buttons, gradients, logo).
- `--accent-hover` / `--accent-pressed`: darker derived shades for explicit hover/press states.
- `--accent-tint`: a lighter, WCAG-safe derivative for TEXT/icon color on dark panels (raw `#0B7A75`
  on `--panel2` measures ~2.9:1, below AA; the tint measures ~6:1). Swap the handful of
  `color:var(--accent)` text/heading rules to `--accent-tint`; leave background/fill usages (white
  text on top) on `--accent` (~5.2:1, passes).
- `--rust` becomes an alias of `--accent` (same teal) since historically `--rust`/`--accent` were
  kept in sync as one brand color; `--rust-soft` recolored to a dark teal tint.
- `--accent-2` / `--accent-3`: teal -> emerald gradient shades (2-3 shades per the brand memory).
- `--glow` recolored to the teal.
- Fix hard-coded `#pcMale{ border-color:#3d8bfd; }`.
- Leave the female persona theme's pink alone (separate persona accent, not the brand mark).

## Task 2 — Strings + identity
- `index.html` title/meta/`#appTitleEl`, `app.js` `T.appTitle`, `coach.js` `T.pdfTitle` + comment,
  `manifest.json` name/short_name, `service-worker.js` `CACHE_NAME` prefix -> `repvane-`.
- grep -ri athlex must return nothing outside docs/plans after this task.

## Task 3 — Logo + PWA icons ("Dial Vane", concept G)
- New `icons/logo-rv.svg`: 12-tick rep-counter ring (5 top-right ticks accent, 7 ink @ 22% opacity),
  dumbbell-arrow needle pointing NE (ink shaft + dumbbell tail, accent arrowhead), accent pivot dot,
  ink `#14161B` / paper `#F3F0E8` / accent `#0B7A75`, rounded-square paper background.
- Rasterize the same artwork (no cairo/inkscape available in this environment; hand-rolled a
  PIL-based rasterizer matching the SVG geometry exactly) to `icon-192-rv.png`, `icon-512-rv.png`,
  `icon-maskable-192-rv.png`, `icon-maskable-512-rv.png` (content stays within the 80% maskable safe
  zone) and `apple-touch-icon-rv.png` (180px, flattened, no alpha).
- New filenames (not overwriting `logo.svg`/`icon-*.png`) because `docker/default.conf` serves
  `/icons/` with `Cache-Control: public, max-age=31536000, immutable` — reusing old filenames would
  leave existing installs on the old mark for up to a year.
- Update every reference: `manifest.json` icons array, `index.html` (`<link rel="icon">`,
  `apple-touch-icon`, the four `<img src="icons/logo.svg">` spots), `service-worker.js` ASSETS,
  `Dockerfile` COPY + hash list. Delete the old icon files.

## Task 4 — Onboarding fixes (Phase 2 list)
- New EN/AR `obTitle`/`obSub` headline naming the AI coach + InBody.
- Metallic shine: idle-speed 0 on the onboarding start button so it only animates on hover (still
  layered behind the label via existing z-index stacking).
- Google sign-in / "continue without signing in" / "continue with email" visible on the first
  screen: `showOnboarding()` now opens directly on the `choices` step instead of gating them behind
  the "Start Changing Yourself" tap.

## Task 5 — Premium "coming soon" card
- Static `.more-group` card on the More screen (`#screen-more`), after the existing groups: title,
  3-4 perk bullets (higher AI-coach limits, Ramadan mode, priority support), a disabled
  `aria-disabled="true"` "Coming soon" button/badge. EN+AR via existing `T`/`data-i18n`. No payment
  code.

## Task 6 — Verification
- `node --check` every changed `.js`.
- Playwright smoke test against a local static server: EN+LTR and AR+RTL, onboarding screen
  (choices visible immediately), More screen (Premium card + coming-soon button), no console errors.
  Screenshots into `.superpowers/`.

## Task 7 — PR
- Open PR against `main`, do not merge. Log progress in `ROADMAP-PROGRESS.md` under `### W2-A` after
  each task.
