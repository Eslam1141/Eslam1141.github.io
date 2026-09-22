# Coach Loading Widget (React/shadcn/Tailwind/TS toolchain) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the `ai-text-loading` component (shadcn/React/Tailwind/TypeScript, using the `motion` library) as the loading indicator while a coach plan is being generated, without converting the rest of the app — which stays deliberately build-step-free vanilla JS — to React.

**Architecture:** A small, self-contained Vite + React + TypeScript + Tailwind project lives at `web/coach-loading/`. It builds to a single self-invoking (IIFE) JS bundle plus a CSS file, committed to `widgets/coach-loading.js` / `widgets/coach-loading.css` at the repo root — the same "vendor the build output" pattern this repo already uses for everything else (no build step at deploy time). `index.html` loads that bundle like any other script; it exposes one global, `window.CoachLoadingWidget.mount(el)` / `.unmount(el)`, that `coach.js` calls. Nothing else in the app changes: no bundler, no TypeScript, no Tailwind anywhere outside `web/coach-loading/`.

**Tech Stack:** Vite 5, React 18, TypeScript 5, Tailwind CSS 3, the `motion` package (framer-motion's current name), Node 24 (matches the version already installed in this environment).

**Spec:** No separate spec document. Scoped directly from the user's request (integrate the given `ai-text-loading.tsx` component, explicitly opting for a real shadcn/React/Tailwind/TypeScript build over a vanilla-CSS equivalent) plus this repo's existing deploy architecture (`Dockerfile`, `docker/default.conf`, `.github/workflows/docker-image.yml`), read in full before writing this plan.

## Global Constraints

- The component's `"use client"` directive is a Next.js-only marker; this project isn't Next.js, so it must be dropped, not carried over verbatim.
- Tailwind's Preflight (base reset) is global by CSS-selector, not scoped to the widget — if bundled as-is it would silently override element defaults (headings, buttons, etc.) across the *entire* host app the widget is injected into. Preflight must be disabled (`corePlugins.preflight: false`); Tailwind's utility classes are fine to keep, since those only ever apply to elements that carry the class.
- The build output is committed to the repo (`widgets/coach-loading.js`, `widgets/coach-loading.css`) — this is a source-controlled artifact, not a gitignored one. `web/coach-loading/node_modules/` and `web/coach-loading/dist/` (Vite's own scratch outDir before it's copied) are gitignored.
- No CSP changes needed: the widget bundle is self-hosted (served from the same origin as everything else), and `docker/default.conf`'s `script-src 'self' ...` already covers it.
- `AITextLoading`'s internal `setInterval` (cycling the loading text) must be torn down when the app's own vanilla `mount()` helper (`coach.js:180`) rips the loading view's DOM out via `innerHTML = ""` — that helper has no concept of React and will never call an unmount function itself. The widget bridge must detect this and clean up on its own (see Task 3).

---

## File Structure

| Path | Responsibility |
|---|---|
| `web/coach-loading/package.json` | The sub-project's own dependencies and build script — isolated from the rest of the repo, which has no `package.json` at all today. |
| `web/coach-loading/tsconfig.json` | TypeScript compiler config for the widget source. |
| `web/coach-loading/tailwind.config.js`, `postcss.config.js` | Tailwind/PostCSS config, scoped to `web/coach-loading/src/`. |
| `web/coach-loading/components.json` | Documents the shadcn conventions this project follows (path aliases, base color) even though components are added by hand here, not via `npx shadcn add`. |
| `web/coach-loading/src/lib/utils.ts` | shadcn's standard `cn()` class-merging helper — every shadcn component assumes this exists at `@/lib/utils`. |
| `web/coach-loading/src/components/ui/ai-text-loading.tsx` | The component itself, copied in per the user's instructions, with `"use client"` dropped. |
| `web/coach-loading/src/index.css` | Tailwind entrypoint (utilities only, Preflight disabled). |
| `web/coach-loading/src/mount.tsx` | The vanilla-JS bridge: exposes `window.CoachLoadingWidget.mount/unmount`, owns the React root and its auto-cleanup. |
| `web/coach-loading/vite.config.ts` | Library-mode build producing the two committed `widgets/` files. |
| `widgets/coach-loading.js`, `widgets/coach-loading.css` | Committed build output, served as static files exactly like every other JS/CSS file in this repo. |
| `coach.js` | Modified: `renderLoading()` mounts the widget instead of a static "Generating…" paragraph. |
| `index.html` | Modified: loads `widgets/coach-loading.css` and `widgets/coach-loading.js`. |
| `Dockerfile` | Modified: copies `widgets/` into the image alongside `icons/`. |
| `.github/workflows/docker-image.yml` | Modified: builds the widget before the Docker build, and fails if the committed output is stale. |

---

### Task 1: Scaffold the Vite + React + TypeScript + Tailwind project

**Files:**
- Create: `web/coach-loading/package.json`
- Create: `web/coach-loading/tsconfig.json`
- Create: `web/coach-loading/tailwind.config.js`
- Create: `web/coach-loading/postcss.config.js`
- Create: `web/coach-loading/components.json`
- Create: `web/coach-loading/.gitignore`
- Create: `web/coach-loading/src/index.css`
- Create: `web/coach-loading/src/lib/utils.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: an `npm install`-able project at `web/coach-loading/` that later tasks add source files into. `cn()` from `src/lib/utils.ts` — signature `cn(...inputs: ClassValue[]): string` — is consumed by Task 2's component.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "coach-loading-widget",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc --noEmit && vite build",
    "dev": "vite"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "motion": "^11.11.17",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.4"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.3",
    "vite": "^5.4.10"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  corePlugins: {
    // Preflight is a global element-selector reset — bundling it would
    // leak into the host vanilla-CSS app this widget is injected into.
    // Utility classes are unaffected by this: they only apply to
    // elements that carry them.
    preflight: false,
  },
  theme: { extend: {} },
  plugins: [],
};
```

- [ ] **Step 4: Create `postcss.config.js`**

```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 5: Create `components.json`**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": false
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

- [ ] **Step 6: Create `.gitignore`**

```
node_modules/
dist/
```

- [ ] **Step 7: Create `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 8: Create `src/lib/utils.ts`**

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 9: Install and verify**

```bash
cd web/coach-loading
npm install
npx tsc --noEmit
```
Expected: `npm install` completes with no error; `tsc --noEmit` exits 0 (there's no source under `src/` yet besides `lib/utils.ts`, which is self-contained and type-checks cleanly on its own).

- [ ] **Step 10: Commit**

```bash
cd web/coach-loading
git add package.json package-lock.json tsconfig.json tailwind.config.js postcss.config.js components.json .gitignore src/index.css src/lib/utils.ts
git commit -m "$(cat <<'EOF'
feat: scaffold the coach-loading-widget Vite/React/TS/Tailwind project

A self-contained toolchain at web/coach-loading/ — the rest of the repo
stays build-step-free vanilla JS. Preflight is disabled in Tailwind
config since it's a global reset that would otherwise leak into the
vanilla-CSS host app this widget gets injected into.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Add the `ai-text-loading` component

**Files:**
- Create: `web/coach-loading/src/components/ui/ai-text-loading.tsx`

**Interfaces:**
- Consumes: `cn` from `@/lib/utils` (Task 1).
- Produces: `export default function AITextLoading(props: { texts?: string[]; className?: string; interval?: number })` — a React component. Task 3's `mount.tsx` renders `<AITextLoading />`.

- [ ] **Step 1: Create the component**

```tsx
/**
 * @author: @kokonutui
 * @description: AI Text Loading
 * @version: 1.0.0
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 *
 * Adapted for this project: dropped the Next.js "use client" directive
 * (meaningless outside Next — this is a plain Vite build) and the
 * import path for cn() now points at this project's own src/lib/utils.
 */

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface AITextLoadingProps {
  texts?: string[];
  className?: string;
  interval?: number;
}

export default function AITextLoading({
  texts = [
    "Thinking...",
    "Processing...",
    "Analyzing...",
    "Computing...",
    "Almost...",
  ],
  className,
  interval = 1500,
}: AITextLoadingProps) {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTextIndex((prevIndex) => (prevIndex + 1) % texts.length);
    }, interval);

    return () => clearInterval(timer);
  }, [interval, texts.length]);

  return (
    <div className="flex items-center justify-center p-8">
      <motion.div
        animate={{ opacity: 1 }}
        className="relative w-full px-4 py-2"
        initial={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            animate={{
              opacity: 1,
              y: 0,
              backgroundPosition: ["200% center", "-200% center"],
            }}
            className={cn(
              "flex min-w-max justify-center whitespace-nowrap bg-[length:200%_100%] bg-gradient-to-r from-neutral-950 via-neutral-400 to-neutral-950 bg-clip-text font-bold text-3xl text-transparent dark:from-white dark:via-neutral-600 dark:to-white",
              className
            )}
            exit={{ opacity: 0, y: -20 }}
            initial={{ opacity: 0, y: 20 }}
            key={currentTextIndex}
            transition={{
              opacity: { duration: 0.3 },
              y: { duration: 0.3 },
              backgroundPosition: {
                duration: 2.5,
                ease: "linear",
                repeat: Number.POSITIVE_INFINITY,
              },
            }}
          >
            {texts[currentTextIndex]}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
```

Note: the upstream component imports from `"motion/react"` — this is the `motion` package's React entrypoint (the package installed in Task 1 is `motion`, not a separate `framer-motion` package; `motion/react` is the correct subpath for that package's current API).

- [ ] **Step 2: Type-check**

```bash
cd web/coach-loading
npx tsc --noEmit
```
Expected: exits 0. If it fails on `"motion/react"` not being found, confirm `motion` is listed in `package.json` dependencies (Task 1, Step 1) and `npm install` was re-run.

- [ ] **Step 3: Commit**

```bash
cd web/coach-loading
git add src/components/ui/ai-text-loading.tsx
git commit -m "$(cat <<'EOF'
feat: add the ai-text-loading component

Copied in per the provided source, with "use client" dropped (this is
a plain Vite build, not Next.js) and cn() pointed at this project's own
src/lib/utils.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Build the vanilla-JS mount bridge and the library build

**Files:**
- Create: `web/coach-loading/src/mount.tsx`
- Create: `web/coach-loading/vite.config.ts`

**Interfaces:**
- Consumes: `AITextLoading` from `./components/ui/ai-text-loading` (Task 2); `./index.css` (Task 1).
- Produces: a global `window.CoachLoadingWidget` object with `mount(el: Element, opts?: { texts?: string[]; interval?: number }): void` and `unmount(el: Element): void`. Task 4's `coach.js` calls `window.CoachLoadingWidget.mount(...)`.

- [ ] **Step 1: Create `src/mount.tsx`**

```tsx
import { createRoot, type Root } from "react-dom/client";
import AITextLoading from "./components/ui/ai-text-loading";
import "./index.css";

const roots = new WeakMap<Element, Root>();
const observers = new WeakMap<Element, MutationObserver>();

function mount(el: Element, opts?: { texts?: string[]; interval?: number }) {
  const root = createRoot(el);
  roots.set(el, root);
  root.render(<AITextLoading texts={opts?.texts} interval={opts?.interval} />);

  // The vanilla app's own mount() helper (coach.js) replaces the whole
  // loading view via `container.innerHTML = ""` when the real result
  // arrives — it has no idea a React root lives inside `el` and will
  // never call unmount() for us. Left alone, AITextLoading's
  // setInterval keeps firing forever on a detached tree. Watch for `el`
  // leaving the document and clean up automatically, so every call
  // site that tears down the loading view is covered without having to
  // remember an explicit teardown call.
  const observer = new MutationObserver(() => {
    if (!document.contains(el)) {
      unmount(el);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  observers.set(el, observer);
}

function unmount(el: Element) {
  const observer = observers.get(el);
  if (observer) {
    observer.disconnect();
    observers.delete(el);
  }
  const root = roots.get(el);
  if (root) {
    root.unmount();
    roots.delete(el);
  }
}

declare global {
  interface Window {
    CoachLoadingWidget: { mount: typeof mount; unmount: typeof unmount };
  }
}

window.CoachLoadingWidget = { mount, unmount };
```

- [ ] **Step 2: Create `vite.config.ts`**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  build: {
    // Two levels up from web/coach-loading/ is the repo root.
    outDir: "../../widgets",
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, "src/mount.tsx"),
      name: "CoachLoadingWidget",
      formats: ["iife"],
      fileName: () => "coach-loading.js",
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) =>
          assetInfo.name === "style.css" ? "coach-loading.css" : (assetInfo.name ?? "[name][extname]"),
      },
    },
  },
});
```

- [ ] **Step 3: Build and verify the output**

```bash
cd web/coach-loading
npm run build
ls ../../widgets
```
Expected: `npm run build` exits 0 (runs `tsc --noEmit` then `vite build`); `widgets/` contains exactly `coach-loading.js` and `coach-loading.css`.

- [ ] **Step 4: Sanity-check the bundle's global export**

```bash
cd web/coach-loading
node -e "global.window = global; global.document = { contains: () => false }; require('../../widgets/coach-loading.js'); console.log(typeof window.CoachLoadingWidget, typeof window.CoachLoadingWidget.mount, typeof window.CoachLoadingWidget.unmount)"
```
Expected output: `object function function`. (This is a smoke check that the IIFE actually assigns `window.CoachLoadingWidget` with both functions present — it will throw before printing if React itself errors on this minimal fake DOM, which is fine and still proves the export assignment ran; if it throws, check the printed error is from React failing to find real DOM APIs, not from `CoachLoadingWidget` being undefined.)

- [ ] **Step 5: Commit**

```bash
cd web/coach-loading
git add src/mount.tsx vite.config.ts
git add ../../widgets/coach-loading.js ../../widgets/coach-loading.css
git commit -m "$(cat <<'EOF'
feat: add the vanilla-JS mount bridge and commit the built widget bundle

window.CoachLoadingWidget.mount/unmount is the only surface the vanilla
app touches. mount() also watches for its host element leaving the
document (via MutationObserver) and self-unmounts then, since coach.js's
own mount() helper tears down the loading view with innerHTML = "" and
has no way to call an explicit unmount for us — without this, the
component's setInterval would leak forever on every generated plan.

Build output (widgets/coach-loading.js, widgets/coach-loading.css) is
committed, same as every other static asset in this repo — there is no
build step at deploy time.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Wire the widget into the coach plan loading screen

**Files:**
- Modify: `Eslam1141.github.io/index.html`
- Modify: `Eslam1141.github.io/coach.js`

**Interfaces:**
- Consumes: `window.CoachLoadingWidget.mount/unmount` (Task 3).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Load the widget's CSS and JS in `index.html`**

Line 18 currently:
```html
<link rel="stylesheet" href="styles.css">
```
Change to:
```html
<link rel="stylesheet" href="styles.css">
<link rel="stylesheet" href="widgets/coach-loading.css">
```

Line 309 currently:
```html
<script src="coach.js" defer></script>
```
Change to:
```html
<script src="widgets/coach-loading.js" defer></script>
<script src="coach.js" defer></script>
```
(Both are `defer`, so they execute in document order regardless of load timing — the widget bundle is guaranteed to have set `window.CoachLoadingWidget` before `coach.js` runs.)

- [ ] **Step 2: Mount the widget in `renderLoading()`**

`coach.js`'s `renderLoading()` (around line 779) currently:
```javascript
  function renderLoading() {
    var rows = [];
    for (var i = 0; i < 4; i++) rows.push(h("div", { class: "skeleton", style: "height:56px;margin-bottom:10px" }));
    mount(h("div", { class: "coach-loading" },
      h("div", { class: "coach-spin", "aria-hidden": "true" }),
      h("p", {}, s("generating")),
      h("div", {}, rows)));
  }
```
Change to:
```javascript
  function renderLoading() {
    var rows = [];
    for (var i = 0; i < 4; i++) rows.push(h("div", { class: "skeleton", style: "height:56px;margin-bottom:10px" }));
    var aiLoadingHost = h("div", { class: "coach-ai-loading" });
    mount(h("div", { class: "coach-loading" },
      h("div", { class: "coach-spin", "aria-hidden": "true" }),
      aiLoadingHost,
      h("div", {}, rows)));
    // coach.js's own mount() above has already attached aiLoadingHost to
    // the live DOM by the time we get here (it's synchronous), so it's
    // safe to hand it to the widget now.
    if (window.CoachLoadingWidget) {
      window.CoachLoadingWidget.mount(aiLoadingHost);
    } else {
      aiLoadingHost.textContent = s("generating");
    }
  }
```
(Dropped the old `h("p", {}, s("generating"))` line — the widget replaces it. The `else` branch is the fallback if `widgets/coach-loading.js` ever fails to load, matching this file's existing defensive style elsewhere.)

- [ ] **Step 3: Syntax-check**

```bash
node -c index.html 2>/dev/null; node -c coach.js
```
(The first command is expected to fail — `node -c` doesn't parse HTML; it's harmless noise, the real check is `coach.js`.) Actual check:
```bash
node -c coach.js
```
Expected: exits 0, no output.

- [ ] **Step 4: Verify the wiring by inspection**

```bash
grep -n "coach-loading" index.html
grep -n "CoachLoadingWidget" coach.js
```
Expected: `index.html` shows the two new tags from Step 1; `coach.js` shows the `mount`/fallback block from Step 2.

- [ ] **Step 5: Commit**

```bash
git add index.html coach.js
git commit -m "$(cat <<'EOF'
feat: show the AI-text-loading widget while a coach plan generates

renderLoading() now mounts window.CoachLoadingWidget into the loading
view instead of a static "Generating..." paragraph, with a plain-text
fallback if the widget bundle didn't load.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Wire the build into the Dockerfile and CI

**Files:**
- Modify: `Eslam1141.github.io/Dockerfile`
- Modify: `Eslam1141.github.io/.github/workflows/docker-image.yml`

**Interfaces:**
- Consumes: `widgets/coach-loading.js`, `widgets/coach-loading.css` (Task 3, committed to the repo).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Copy `widgets/` into the image**

`Dockerfile` currently:
```dockerfile
COPY --chown=101:101 index.html styles.css app.js ui.js coach.js chat.js sync.js calendar.js hero-video.js metallic-button.js service-worker.js manifest.json config.js /usr/share/nginx/html/
COPY --chown=101:101 icons/ /usr/share/nginx/html/icons/
```
Change to:
```dockerfile
COPY --chown=101:101 index.html styles.css app.js ui.js coach.js chat.js sync.js calendar.js hero-video.js metallic-button.js service-worker.js manifest.json config.js /usr/share/nginx/html/
COPY --chown=101:101 icons/ /usr/share/nginx/html/icons/
COPY --chown=101:101 widgets/ /usr/share/nginx/html/widgets/
```

- [ ] **Step 2: Add a CI job that rebuilds the widget and fails on drift**

`.github/workflows/docker-image.yml` currently starts:
```yaml
name: gym-ui image
on:
  push:
    branches: [main]
    paths:
      - "index.html"
      - "app.js"
      - "ui.js"
      - "coach.js"
      - "chat.js"
      - "sync.js"
      - "calendar.js"
      - "hero-video.js"
      - "metallic-button.js"
      - "styles.css"
      - "service-worker.js"
      - "manifest.json"
      - "config.js"
      - "icons/**"
      - "docker/**"
      - "Dockerfile"
      - ".github/workflows/docker-image.yml"
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    permissions: { contents: read, packages: write }
    steps:
      - uses: actions/checkout@v7.0.1
      - uses: docker/setup-buildx-action@v4.4.1
```
Change to:
```yaml
name: gym-ui image
on:
  push:
    branches: [main]
    paths:
      - "index.html"
      - "app.js"
      - "ui.js"
      - "coach.js"
      - "chat.js"
      - "sync.js"
      - "calendar.js"
      - "hero-video.js"
      - "metallic-button.js"
      - "styles.css"
      - "service-worker.js"
      - "manifest.json"
      - "config.js"
      - "icons/**"
      - "widgets/**"
      - "web/coach-loading/**"
      - "docker/**"
      - "Dockerfile"
      - ".github/workflows/docker-image.yml"
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    permissions: { contents: read, packages: write }
    steps:
      - uses: actions/checkout@v7.0.1
      - uses: actions/setup-node@v4
        with:
          node-version: "24"
          cache: "npm"
          cache-dependency-path: web/coach-loading/package-lock.json
      - name: Build coach-loading widget and check for drift
        run: |
          cd web/coach-loading
          npm ci
          npm run build
          cd ../..
          if ! git diff --quiet -- widgets/; then
            echo "::error::widgets/ is out of date with web/coach-loading/src — run 'npm run build' in web/coach-loading and commit the result."
            git diff -- widgets/
            exit 1
          fi
      - uses: docker/setup-buildx-action@v4.4.1
```
(Everything after `docker/setup-buildx-action` — the existing Docker build/smoke/push steps and the whole `deploy` job — is unchanged. The new step runs before the Docker build so a stale `widgets/` fails fast, before spending time on a Docker build that would ship it.)

- [ ] **Step 3: Verify the workflow YAML is still well-formed**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/docker-image.yml'))" 2>/dev/null || node -e "require('js-yaml')" 2>/dev/null; echo "if neither printed an error above, or if both commands were simply unavailable, visually re-read the diff for indentation consistency with the surrounding steps"
```
(This repo has no YAML linter wired in; the pragmatic check is a parser sanity pass if one is available locally, otherwise a careful re-read — same standard the rest of this workflow file has always been held to.)

- [ ] **Step 4: Commit**

```bash
git add Dockerfile .github/workflows/docker-image.yml
git commit -m "$(cat <<'EOF'
build: rebuild the coach-loading widget in CI and fail on drift

Dockerfile now copies widgets/ alongside icons/. CI installs Node,
rebuilds web/coach-loading, and fails the run if the committed
widgets/ output doesn't match a fresh build — catching a source change
that was pushed without also running `npm run build`.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:** every file the user's `ai-text-loading.tsx` integration instructions named (the component, its `motion` dependency, and the "steps to integrate") has a task. The `demo.tsx` the instructions also pasted is a dev-only usage example for a page that doesn't exist in this project (no Next.js app router to drop it into) — intentionally not created; nothing in this plan needs it, and inventing a page for it would be scope creep. The user's "Questions to Ask" (props/state/assets/responsive/placement) are answered directly in this plan rather than left open: props flow through unchanged from the component's own defaults; no new state beyond the component's own; no image assets needed; responsive behavior is inherited from the component's own `flex`/`w-full` classes; placement is `coach.js`'s existing loading view, per the user's explicit "for generating the coach plan use that."

**Placeholder scan:** every step has literal file content or a literal runnable command with its expected output; no "add appropriate X" language anywhere.

**Type consistency:** `window.CoachLoadingWidget.mount(el, opts?)` / `.unmount(el)` (Task 3) is called with exactly that shape in Task 4's `coach.js` change — single-element first argument, optional second argument omitted since Task 4 doesn't need custom `texts`/`interval`.

---

Plan complete and saved to `docs/superpowers/plans/2026-09-22-coach-loading-widget-toolchain.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
