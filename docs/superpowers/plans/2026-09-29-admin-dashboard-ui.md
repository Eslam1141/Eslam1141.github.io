# Admin Dashboard — gym-ui Implementation Plan (3 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `admin.html` (overview stats, user management, activity log) for admins, an "Admin" link in the avatar menu, and a clean sign-out with a message when a blocked account uses the app.

**Architecture:** `admin.html` is a separate, standalone page (`admin.js` + `admin.css`, plus the shared `styles.css` tokens and `config.js`). It does **not** load `sync.js`: it reads the session `sync.js` already stored in `sessionStorage["gymauth_session"]` (same tab → same sessionStorage), so the admin page never runs sync/migration code. The service worker never caches it. All authorization is enforced by gym-be; the page only reacts to 401/403.

**Tech Stack:** Vanilla JS (ES5-style IIFE like the rest of the app), CSS custom properties from `styles.css`, inline SVG chart, nginx, Playwright (playwright-core, as used by earlier agents) for verification.

**Spec:** `gym-be/docs/specs/2026-09-29-admin-dashboard.md` §3.3 (blocked UX) and §5. API contract: `gym-be/docs/superpowers/plans/2026-09-29-admin-dashboard-gym-be.md` Task 8.

**Worktree:** `Eslam1141.github.io/.claude/worktrees/admin-dashboard`, branch `feat/admin-dashboard`.

## Global Constraints

- API base: `(window.GYM_API_BASE || "/api/v1").replace(/\/+$/, "")` — same as `sync.js`/`header.js`.
- Session: `JSON.parse(sessionStorage.getItem("gymauth_session"))` → `{token, exp, profile, source}`; valid only if `exp*1000 > Date.now() + 30000`.
- Language: `localStorage.getItem("gym_lang") || "en"`; Arabic sets `<html lang="ar" dir="rtl">`.
- Every string exists in EN and AR. No `innerHTML` with API data — use `textContent` / DOM building (user names/emails are untrusted).
- The app is dark-theme only (tokens in `styles.css :root`); admin uses those tokens. (Spec said "dark/light" — there is no light theme in the app today; follow the app.)
- Layout works at 390 px with no horizontal page scroll; users table becomes a card list below 700 px.
- `admin.html`, `admin.js`, `admin.css` are in the Dockerfile `COPY` line but **not** in `service-worker.js` `ASSETS` nor in the Dockerfile cache-hash `cat` list; the SW fetch handler skips `/admin*`.
- Delete button stays disabled until the typed email equals the user's email (trimmed, case-insensitive).
- Commit after each task; message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Opening `/admin.html` in a new tab (no sessionStorage) must show a clear "open from the app" message, not a blank page or a JS error. Test: Task 5 scenario "no session".
2. A name/email containing HTML (`<img src=x onerror=alert(1)>`) must render as text. Test: Task 5 scenario "xss".
3. Session expiring while the page is open (API → 401) must show "session expired" with a link back, not spin forever. Test: Task 5 scenario "401 mid-session".
4. Delete of a user when gym-assistant is down (502 `assistant_delete_failed`) must show the error and keep the user in the list. Test: Task 5 scenario "delete 502".
5. Arabic/RTL at 390 px: no horizontal scroll, detail panel and dialog usable. Test: Task 5 scenario "ar-390".

---

## File Structure

| File | Responsibility |
|---|---|
| `app.js` (modify) | new strings `hdrAdmin`, `hdrBlocked` |
| `header.js` (modify) | Admin menu item when `me.isAdmin`; blocked → sign out + toast |
| `sync.js` (modify) | `/progress` 403 `account_blocked` → same blocked handler |
| `auth-email.js` (modify) | login/OTP 403 `account_blocked` → `aeErrBlocked` |
| `admin.html` (create) | page shell |
| `admin.css` (create) | admin-only layout |
| `admin.js` (create) | session, API, i18n, tabs, overview, users, activity |
| `service-worker.js` (modify) | bypass `/admin*` |
| `Dockerfile`, `docker/default.conf` (modify) | ship files; `no-cache` + `noindex` for admin |

---

### Task 1: Blocked-account handling + Admin menu link in the app

**Files:** Modify `app.js`, `header.js`, `sync.js`, `auth-email.js`.

**Interfaces:**
- Consumes: gym-be `GET /me` → `isAdmin: bool`; any API → `403 {"error":{"code":"account_blocked"}}`.
- Produces: `window.GymHeader.onBlocked()` — signs out and shows the blocked toast (used by `sync.js`).

- [ ] **Step 1: Strings** — in `app.js`'s `T` table next to `hdrGoProfile` (line ~302):
```js
  hdrAdmin:["Admin dashboard","لوحة الإدارة"],
  hdrBlocked:["This account has been disabled. Contact support if you think this is a mistake.","تم تعطيل هذا الحساب. تواصل مع الدعم إذا كنت تعتقد أن هذا خطأ."],
```
In `auth-email.js`'s string table next to `aeErrGeneric`:
```js
    aeErrBlocked: ["This account has been disabled.", "تم تعطيل هذا الحساب."],
```
and at the top of `errorKey` (after the `!st` check):
```js
    if (st === 403 && code === "account_blocked") return "aeErrBlocked";
```

- [ ] **Step 2: header.js** — in `build()`'s markup, between `tbMenuProfile` and `tbMenuSignOut`:
```js
      '    <button type="button" role="menuitem" id="tbMenuAdmin" hidden></button>' +
```
wire it next to the other menu handlers:
```js
    document.getElementById("tbMenuAdmin").addEventListener("click", function () {
      setMenuOpen(false);
      window.location.href = "/admin.html"; // same tab: sessionStorage session carries over
    });
```
in `render()` next to the other menu labels:
```js
    var adminItem = document.getElementById("tbMenuAdmin");
    adminItem.hidden = !(me && me.isAdmin === true);
    adminItem.textContent = str("hdrAdmin");
```
Add the blocked handler:
```js
  var blockedShown = false;
  function onBlocked() {
    if (blockedShown) return;
    blockedShown = true;
    if (window.GymSync && typeof GymSync.signOut === "function") GymSync.signOut();
    if (window.GymToast) GymToast.show({ message: str("hdrBlocked"), duration: 10000 });
    setTimeout(function () { blockedShown = false; }, 3000);
  }
```
In `refreshMe()`, replace `if (!res.ok) throw new Error("me " + res.status);` with:
```js
        if (res.status === 403) {
          return res.json().catch(function () { return {}; }).then(function (b) {
            if (b && b.error && b.error.code === "account_blocked") onBlocked();
            throw new Error("me 403");
          });
        }
        if (!res.ok) throw new Error("me " + res.status);
```
and export `onBlocked: onBlocked` on `window.GymHeader`.

- [ ] **Step 3: sync.js** — in `syncNow`'s `.then(function (res) {` add before the `!res.ok` throw:
```js
        if (res.status === 403) {
          return res.json().catch(function () { return {}; }).then(function (b) {
            if (b && b.error && b.error.code === "account_blocked" && window.GymHeader && GymHeader.onBlocked) GymHeader.onBlocked();
            return null;
          });
        }
```
(the following `.then(function (doc) { if (!doc) return false; ...` already handles `null`).

- [ ] **Step 4: Verify** — `node --check app.js header.js sync.js auth-email.js`. Serve the worktree (`python -m http.server 8793`, pick a free port and confirm with `netstat -ano | findstr :8793` that nothing else is bound), and with Playwright + `page.route` mocks:
  - `/api/v1/me` → `{"id":"u1","email":"a@x","isAdmin":true,...}` → avatar menu shows "Admin dashboard"; with `isAdmin:false` it's hidden.
  - `/api/v1/me` → 403 `{"error":{"code":"account_blocked","message":"x"}}` → user is signed out (login screen) and the toast text matches `hdrBlocked` in EN and AR.
  - `/api/v1/auth/login` → 403 account_blocked → error text "This account has been disabled."
  Use the sign-in stubbing approach the earlier food/check-in agents used (harness page stubbing `window.GymSync`, or `GymSync._debug.onCredential` on a non-prod origin). Zero app console errors.

- [ ] **Step 5: Commit** — `feat(ui): admin menu link and blocked-account sign-out`

---

### Task 2: Admin page shell, styles, and shipping

**Files:** Create `admin.html`, `admin.css`; modify `service-worker.js`, `Dockerfile`, `docker/default.conf`.

- [ ] **Step 1: `admin.html`**
```html
<!doctype html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>RepVane Admin</title>
  <link rel="icon" href="icons/favicon-32-dv.png">
  <link rel="stylesheet" href="styles.css">
  <link rel="stylesheet" href="admin.css">
  <script src="config.js"></script>
</head>
<body class="adm">
  <header class="adm-top">
    <a class="adm-back" id="admBack" href="/"></a>
    <h1 id="admTitle"></h1>
    <span class="adm-who" id="admWho"></span>
  </header>
  <nav class="adm-tabs" role="tablist" id="admTabs" hidden>
    <button role="tab" data-tab="overview" id="tabOverview"></button>
    <button role="tab" data-tab="users" id="tabUsers"></button>
    <button role="tab" data-tab="activity" id="tabActivity"></button>
  </nav>
  <main id="admMain" aria-live="polite"></main>
  <div class="adm-panel-backdrop" id="admPanelBackdrop" hidden></div>
  <aside class="adm-panel" id="admPanel" role="dialog" aria-modal="true" aria-labelledby="admPanelTitle" hidden></aside>
  <script src="admin.js" defer></script>
</body>
</html>
```

- [ ] **Step 2: `admin.css`** (tokens from `styles.css`; logical properties so RTL works without overrides):
```css
body.adm{background:var(--bg);color:var(--paper);min-height:100vh;margin:0;font-size:var(--text-base)}
.adm-top{display:flex;align-items:center;gap:12px;padding:14px 16px;border-block-end:1px solid var(--line);position:sticky;top:0;background:var(--bg);z-index:5}
.adm-top h1{font-size:var(--text-lg);margin:0;flex:1}
.adm-back{color:var(--accent-tint);text-decoration:none;font-weight:700}
.adm-who{color:var(--paper-dim);font-size:var(--text-sm);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:40vw}
.adm-tabs{display:flex;gap:4px;padding:8px 16px;border-block-end:1px solid var(--line);overflow-x:auto}
.adm-tabs button{background:none;border:0;color:var(--paper-dim);padding:10px 14px;border-radius:var(--radius);font:inherit;font-weight:700;cursor:pointer;min-height:44px}
.adm-tabs button[aria-selected="true"]{background:var(--panel2);color:var(--paper)}
#admMain{padding:16px;max-width:1100px;margin:0 auto}
.adm-msg{padding:32px 16px;text-align:center;color:var(--paper-dim)}
.adm-msg a{color:var(--accent-tint)}
.adm-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-block-end:20px}
.adm-card{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:14px}
.adm-card b{display:block;font-size:var(--text-2xl);font-weight:900}
.adm-card span{color:var(--paper-dim);font-size:var(--text-sm)}
.adm-section{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:14px;margin-block-end:16px}
.adm-section h2{font-size:var(--text-md);margin:0 0 10px}
.adm-chart{width:100%;height:auto;display:block}
.adm-chart rect.bar{fill:var(--accent-tint)}
.adm-chart text{fill:var(--paper-dim);font-size:10px}
.adm-bars{display:grid;gap:8px}
.adm-bars div{display:grid;grid-template-columns:90px 1fr 48px;align-items:center;gap:8px}
.adm-bars i{display:block;height:10px;border-radius:5px;background:var(--accent-tint)}
.adm-tools{display:flex;flex-wrap:wrap;gap:8px;margin-block-end:12px}
.adm-tools input,.adm-tools select,.adm-form input{background:var(--panel2);border:1px solid var(--line);color:var(--paper);border-radius:10px;padding:10px 12px;font:inherit;min-height:44px;box-sizing:border-box}
.adm-tools input{flex:1;min-width:0}
.adm-list{display:grid;gap:8px}
.adm-row{display:grid;grid-template-columns:40px 1.6fr 1fr 1fr 1fr 90px;gap:10px;align-items:center;background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:10px 12px;cursor:pointer;text-align:start;color:inherit;font:inherit;width:100%}
.adm-row:hover,.adm-row:focus-visible{border-color:var(--accent-tint)}
.adm-av{width:36px;height:36px;border-radius:50%;object-fit:cover;background:var(--panel2)}
.adm-email{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.adm-sub{color:var(--paper-dim);font-size:var(--text-sm)}
.adm-badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:var(--text-xs);font-weight:700;background:var(--panel2)}
.adm-badge.blocked{background:#5a1d1d;color:#ffb4b4}
.adm-pager{display:flex;justify-content:space-between;align-items:center;margin-block-start:12px;gap:8px}
.adm-btn{background:var(--panel2);border:1px solid var(--line);color:var(--paper);border-radius:10px;padding:10px 14px;font:inherit;font-weight:700;cursor:pointer;min-height:44px}
.adm-btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}
.adm-btn.danger{background:#8b1e1e;border-color:#8b1e1e;color:#fff}
.adm-btn:disabled{opacity:.45;cursor:not-allowed}
.adm-panel-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:20}
.adm-panel{position:fixed;inset-block:0;inset-inline-end:0;width:min(440px,100vw);background:var(--bg-alt);border-inline-start:1px solid var(--line);z-index:21;overflow-y:auto;padding:16px;box-sizing:border-box}
.adm-panel h2{margin:0 0 4px;font-size:var(--text-lg);word-break:break-word}
.adm-kv{display:grid;grid-template-columns:auto 1fr;gap:6px 12px;margin:12px 0;font-size:var(--text-sm)}
.adm-kv dt{color:var(--paper-dim)}
.adm-kv dd{margin:0;word-break:break-word}
.adm-form{display:grid;gap:10px;margin:12px 0}
.adm-form label{display:grid;gap:4px;font-size:var(--text-sm);color:var(--paper-dim)}
.adm-actions{display:flex;flex-wrap:wrap;gap:8px;margin-block-start:12px}
.adm-err{color:#ff8a8a;font-size:var(--text-sm);min-height:1.2em}
.adm-ok{color:var(--green);font-size:var(--text-sm)}
.adm-audit{display:grid;gap:6px}
.adm-audit div{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px 12px;font-size:var(--text-sm);word-break:break-word}
@media (max-width:700px){
  .adm-row{grid-template-columns:40px 1fr auto}
  .adm-row .adm-col-hide{display:none}
}
```

- [ ] **Step 3: Service worker bypass** — in `service-worker.js` fetch handler, extend the early-return condition:
```js
  if (url.pathname.startsWith("/api/") ||
      url.pathname.startsWith("/admin") ||
      url.hostname.endsWith("googleapis.com") ||
      url.hostname === "accounts.google.com") {
    return;
  }
```
Do **not** add admin files to `ASSETS`.

- [ ] **Step 4: Dockerfile + nginx** — append ` admin.html admin.js admin.css` to the first `COPY --chown=101:101 index.html ...` file list (not to the hash `cat` list). In `docker/default.conf`, next to the `location = /index.html` line:
```nginx
    location ~ ^/admin\.(html|js|css)$ { add_header Cache-Control "no-store"; add_header X-Robots-Tag "noindex, nofollow"; }
```
If `default.conf` sets security headers (CSP etc.) at `server` level, nginx drops them inside a location with its own `add_header` (see the comment near `location = /reset-password`) — copy that block's pattern (repeat the server-level headers inside this location) exactly.

- [ ] **Step 5: Verify + commit** — `docker build -t gymui-admin-test .` succeeds; `docker run --rm gymui-admin-test ls /usr/share/nginx/html | grep admin` lists the 3 files; `docker run --rm gymui-admin-test grep -c admin /usr/share/nginx/html/service-worker.js` ≥ 1 (bypass) and `CACHE_NAME` is a real hash. Commit: `feat(ui): admin page shell, styles, SW bypass and nginx headers`. (admin.js arrives in Task 3; the page will 404 it until then — fine inside the branch.)

---

### Task 3: `admin.js` core — session, API, i18n, tabs, Overview

**Files:** Create `admin.js`.

**Interfaces:**
- Consumes: gym-be `GET /admin/stats` (JSON per spec §3.4).
- Produces (internal to admin.js, used by Task 4): `api(path, opts) → Promise<{ok,status,code,message,data}>`, `s(key, params)`, `el(tag, attrs, children)`, `fmtDate(iso)`, `render(tab)`, `showMsg(key, withLink)`, `state`.

- [ ] **Step 1: Write `admin.js` part 1**
```js
/* admin.js — RepVane admin dashboard (admin.html only).
 * Reads the session sync.js stored in this tab's sessionStorage; never loads
 * sync.js. gym-be enforces admin rights on every call — this page only
 * reacts to 401/403. All API data is rendered with textContent. */
(function () {
  "use strict";
  var API_BASE = (window.GYM_API_BASE || "/api/v1").replace(/\/+$/, "");
  var LANG = (function () { try { return localStorage.getItem("gym_lang") === "ar" ? "ar" : "en"; } catch (e) { return "en"; } })();
  var AR = LANG === "ar";

  var STR = {
    title: ["Admin dashboard", "لوحة الإدارة"],
    back: ["← Back to app", "→ العودة إلى التطبيق"],
    tabOverview: ["Overview", "نظرة عامة"],
    tabUsers: ["Users", "المستخدمون"],
    tabActivity: ["Activity", "النشاط"],
    noSession: ["Open this page from the app's avatar menu while signed in.", "افتح هذه الصفحة من قائمة الصورة الرمزية في التطبيق بعد تسجيل الدخول."],
    expired: ["Your session expired. Go back to the app, then open Admin again.", "انتهت جلستك. عد إلى التطبيق ثم افتح لوحة الإدارة مرة أخرى."],
    notAdmin: ["Not authorized. This page is for admins only.", "غير مصرح. هذه الصفحة للمسؤولين فقط."],
    loadErr: ["Could not load. Check your connection and try again.", "تعذر التحميل. تحقق من اتصالك وحاول مرة أخرى."],
    retry: ["Retry", "إعادة المحاولة"],
    loading: ["Loading…", "جارٍ التحميل…"],
    cTotal: ["Total users", "إجمالي المستخدمين"],
    cToday: ["New today", "جدد اليوم"],
    c7: ["New · 7 days", "جدد · 7 أيام"],
    c30: ["New · 30 days", "جدد · 30 يومًا"],
    cA7: ["Active · 7 days", "نشطون · 7 أيام"],
    cA30: ["Active · 30 days", "نشطون · 30 يومًا"],
    cBlocked: ["Blocked", "محظورون"],
    chartTitle: ["Signups per day (last 90 days)", "التسجيلات يوميًا (آخر 90 يومًا)"],
    chartAlt: ["{n} signups in the last 90 days; busiest day {d} with {m}.", "{n} تسجيلًا في آخر 90 يومًا؛ أكثر يوم {d} بعدد {m}."],
    provTitle: ["Sign-in methods", "طرق تسجيل الدخول"],
    pGoogle: ["Google", "Google"],
    pPassword: ["Email & password", "البريد وكلمة المرور"],
    pBoth: ["Both", "كلاهما"]
  };
  function s(key, params) {
    var v = STR[key] ? STR[key][AR ? 1 : 0] : key;
    if (params) v = v.replace(/\{(\w+)\}/g, function (_, k) { return params[k] != null ? String(params[k]) : ""; });
    return v;
  }
  function addStrings(extra) { for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) STR[k] = extra[k]; }

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k) || attrs[k] == null || attrs[k] === false) continue;
      if (k === "text") n.textContent = attrs[k];
      else if (k === "class") n.className = attrs[k];
      else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k] === true ? "" : attrs[k]);
    }
    (children || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function fmtDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d)) return "—";
    try { return d.toLocaleDateString(AR ? "ar" : "en", { year: "numeric", month: "short", day: "numeric" }); } catch (e) { return iso.slice(0, 10); }
  }
  function fmtNum(n) { try { return Number(n || 0).toLocaleString(AR ? "ar" : "en"); } catch (e) { return String(n || 0); } }

  // ---- session + api ----
  function session() {
    try {
      var x = JSON.parse(sessionStorage.getItem("gymauth_session"));
      if (x && x.token && x.exp && x.exp * 1000 > Date.now() + 30000) return x;
    } catch (e) {}
    return null;
  }
  function api(path, opts) {
    var sess = session();
    if (!sess) return Promise.resolve({ ok: false, status: 401, code: "no_session" });
    opts = opts || {};
    var headers = { "Authorization": "Bearer " + sess.token };
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 15000);
    return fetch(API_BASE + "/admin" + path, {
      method: opts.method || "GET", headers: headers, signal: ctrl.signal,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
    }).then(function (res) {
      clearTimeout(timer);
      if (res.status === 204) return { ok: true, status: 204 };
      var ct = res.headers.get("Content-Type") || "";
      if (ct.indexOf("application/json") < 0) return { ok: res.ok, status: res.status, blob: res };
      return res.json().then(function (j) {
        if (res.ok) return { ok: true, status: res.status, data: j };
        return { ok: false, status: res.status, code: j && j.error && j.error.code, message: j && j.error && j.error.message };
      });
    }).catch(function () { clearTimeout(timer); return { ok: false, status: 0, code: "network" }; });
  }
  // Global auth failures replace the page with a message.
  function authFailed(r) {
    if (r.status === 401) { showMsg(session() ? "expired" : "noSession", true); return true; }
    if (r.status === 403 && (r.code === "forbidden" || r.code === "account_blocked")) { showMsg("notAdmin", true); return true; }
    return false;
  }

  // ---- shell ----
  var main, state = { tab: "overview" };
  function showMsg(key, withLink) {
    document.getElementById("admTabs").hidden = true;
    main.textContent = "";
    main.appendChild(el("div", { class: "adm-msg" }, [
      el("p", { text: s(key) }),
      withLink ? el("a", { href: "/", text: s("back") }) : null
    ]));
  }
  function showError(retryFn) {
    main.textContent = "";
    main.appendChild(el("div", { class: "adm-msg" }, [
      el("p", { text: s("loadErr") }),
      el("button", { class: "adm-btn", text: s("retry"), onclick: retryFn })
    ]));
  }
  function setTab(tab) {
    state.tab = tab;
    ["overview", "users", "activity"].forEach(function (t) {
      var b = document.querySelector('[data-tab="' + t + '"]');
      b.setAttribute("aria-selected", t === tab ? "true" : "false");
    });
    try { history.replaceState(null, "", "#" + tab); } catch (e) {}
    render(tab);
  }
  var views = {}; // tab -> function(main)
  function render(tab) {
    main.textContent = "";
    main.appendChild(el("p", { class: "adm-msg", text: s("loading") }));
    views[tab](main);
  }

  // ---- overview ----
  views.overview = function () {
    api("/stats").then(function (r) {
      if (authFailed(r)) return;
      if (!r.ok) return showError(function () { render("overview"); });
      var st = r.data;
      main.textContent = "";
      var cards = [
        ["cTotal", st.totalUsers], ["cToday", st.newUsers.today], ["c7", st.newUsers.d7], ["c30", st.newUsers.d30],
        ["cA7", st.activeUsers.d7], ["cA30", st.activeUsers.d30], ["cBlocked", st.blockedUsers]
      ];
      main.appendChild(el("div", { class: "adm-cards" }, cards.map(function (c) {
        return el("div", { class: "adm-card" }, [el("b", { text: fmtNum(c[1]) }), el("span", { text: s(c[0]) })]);
      })));
      main.appendChild(el("section", { class: "adm-section" }, [el("h2", { text: s("chartTitle") }), chart(st.signupsPerDay || [])]));
      var p = st.providers, total = (p.google + p.password + p.both) || 1;
      main.appendChild(el("section", { class: "adm-section" }, [
        el("h2", { text: s("provTitle") }),
        el("div", { class: "adm-bars" }, [["pGoogle", p.google], ["pPassword", p.password], ["pBoth", p.both]].map(function (x) {
          var bar = el("i"); bar.style.width = Math.round(100 * x[1] / total) + "%";
          return el("div", null, [el("span", { text: s(x[0]) }), el("span", null, [bar]), el("span", { text: fmtNum(x[1]) })]);
        }))
      ]));
    });
  };
  function chart(series) {
    var W = 900, H = 180, pad = 22, n = series.length || 1;
    var max = series.reduce(function (m, d) { return Math.max(m, d.count); }, 0);
    var sum = series.reduce(function (a, d) { return a + d.count; }, 0);
    var peak = series.reduce(function (b, d) { return d.count > (b ? b.count : -1) ? d : b; }, null);
    var NS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("class", "adm-chart");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", s("chartAlt", { n: fmtNum(sum), d: peak ? peak.date : "—", m: peak ? peak.count : 0 }));
    if (AR) svg.setAttribute("transform", "scale(-1,1)"); // oldest on the right in RTL
    var bw = (W - pad * 2) / n;
    series.forEach(function (d, i) {
      var h = max ? Math.max(d.count ? 2 : 0, (H - pad * 2) * d.count / max) : 0;
      var r = document.createElementNS(NS, "rect");
      r.setAttribute("class", "bar");
      r.setAttribute("x", pad + i * bw + 1);
      r.setAttribute("y", H - pad - h);
      r.setAttribute("width", Math.max(1, bw - 2));
      r.setAttribute("height", h);
      var t = document.createElementNS(NS, "title");
      t.textContent = d.date + ": " + d.count;
      r.appendChild(t);
      svg.appendChild(r);
    });
    var lbl = document.createElementNS(NS, "text");
    lbl.setAttribute("x", pad); lbl.setAttribute("y", 14);
    lbl.textContent = "max " + max;
    if (!AR) svg.appendChild(lbl);
    return svg;
  }

  // Task 4 adds views.users; Task 5 adds views.activity.
  window.__admin = { api: api, s: s, addStrings: addStrings, el: el, fmtDate: fmtDate, fmtNum: fmtNum, authFailed: authFailed, showError: showError, views: views, render: render, state: state, AR: AR, API_BASE: API_BASE, session: session };

  function init() {
    document.documentElement.lang = LANG;
    document.documentElement.dir = AR ? "rtl" : "ltr";
    main = document.getElementById("admMain");
    document.getElementById("admTitle").textContent = s("title");
    document.getElementById("admBack").textContent = s("back");
    document.getElementById("tabOverview").textContent = s("tabOverview");
    document.getElementById("tabUsers").textContent = s("tabUsers");
    document.getElementById("tabActivity").textContent = s("tabActivity");
    document.title = "RepVane — " + s("title");
    var sess = session();
    if (!sess) return showMsg("noSession", true);
    document.getElementById("admWho").textContent = (sess.profile && sess.profile.email) || "";
    document.getElementById("admTabs").hidden = false;
    document.getElementById("admTabs").addEventListener("click", function (e) {
      var t = e.target.closest("[data-tab]");
      if (t) setTab(t.getAttribute("data-tab"));
    });
    var h = (location.hash || "").slice(1);
    setTab(views[h] ? h : "overview");
  }
  // Defer init until admin.js has registered every view (single file, so
  // DOMContentLoaded is enough: the whole script has run by then).
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else setTimeout(init, 0);
})();
```

- [ ] **Step 2: Verify** — `node --check admin.js`. Serve the worktree; in Playwright set `sessionStorage.gymauth_session` via `page.addInitScript` to `{"token":"t","exp":<now+3600>,"profile":{"email":"boss@x.test"},"source":"google"}` and mock `**/api/v1/admin/stats` with a realistic body (90-day series). Check: 7 cards, chart has 90 `rect.bar`, provider bars, no console errors; unmocked session → "Open this page from the app's avatar menu…"; stats → 403 `forbidden` → "Not authorized…".

- [ ] **Step 3: Commit** — `feat(ui): admin overview (stats cards, 90-day chart, providers)`

---

### Task 4: Users tab — list, search, detail panel, actions

**Files:** Modify `admin.js` (insert before the `window.__admin = …` line so it shares the closure; do **not** create a second file).

**Interfaces:**
- Consumes: gym-be `GET /admin/users`, `GET /admin/users/{id}`, `GET /admin/users/{id}/photo`, `PATCH /admin/users/{id}`, `POST .../reset-password|block|unblock`, `DELETE /admin/users/{id}` (contract: gym-be plan Task 8).

- [ ] **Step 1: Strings** — add to `STR`:
```js
    search: ["Search by email or name", "ابحث بالبريد أو الاسم"],
    sortNew: ["Newest first", "الأحدث أولًا"],
    sortSeen: ["Recently active", "النشطون مؤخرًا"],
    colJoined: ["Joined", "انضم"],
    colSeen: ["Last active", "آخر نشاط"],
    colMethod: ["Sign-in", "الدخول"],
    blocked: ["Blocked", "محظور"],
    admin: ["Admin", "مسؤول"],
    none: ["No users found.", "لا يوجد مستخدمون."],
    prev: ["Previous", "السابق"],
    next: ["Next", "التالي"],
    pageOf: ["Page {p} of {n} · {t} users", "صفحة {p} من {n} · {t} مستخدم"],
    close: ["Close", "إغلاق"],
    kvEmail: ["Email", "البريد"], kvId: ["User ID", "معرّف المستخدم"], kvVerified: ["Email verified", "البريد موثّق"],
    kvStreak: ["Streak", "السلسلة"], kvDays: ["Days trained", "أيام التمرين"], kvWorkouts: ["Workouts logged", "التمارين المسجلة"],
    kvMeals: ["Meals logged", "الوجبات المسجلة"], kvBlockedAt: ["Blocked since", "محظور منذ"],
    yes: ["Yes", "نعم"], no: ["No", "لا"],
    editTitle: ["Edit profile", "تعديل الملف"],
    fName: ["Display name", "الاسم الظاهر"], fWeight: ["Weight (kg)", "الوزن (كجم)"], fHeight: ["Height (cm)", "الطول (سم)"],
    fVerified: ["Email verified", "البريد موثّق"],
    save: ["Save", "حفظ"], saved: ["Saved.", "تم الحفظ."],
    reset: ["Send password reset", "إرسال إعادة تعيين كلمة المرور"], resetSent: ["Reset email sent.", "تم إرسال بريد إعادة التعيين."],
    block: ["Block", "حظر"], unblock: ["Unblock", "إلغاء الحظر"],
    blockConfirm: ["Block {e}? They will be signed out everywhere.", "حظر {e}؟ سيتم تسجيل خروجه من كل مكان."],
    del: ["Delete account", "حذف الحساب"],
    delTitle: ["Delete this account permanently?", "حذف هذا الحساب نهائيًا؟"],
    delBody: ["This deletes the account and all its data (workouts, meals, photos, AI coach history). It cannot be undone. Type the user's email to confirm:", "سيؤدي هذا إلى حذف الحساب وكل بياناته (التمارين، الوجبات، الصور، سجل المدرب الذكي). لا يمكن التراجع. اكتب بريد المستخدم للتأكيد:"],
    delGo: ["Delete permanently", "حذف نهائي"], cancel: ["Cancel", "إلغاء"],
    deleted: ["Account deleted.", "تم حذف الحساب."],
    eCannotAdmin: ["Admin accounts can't be changed here.", "لا يمكن تعديل حسابات المسؤولين من هنا."],
    eNoPassword: ["This account signs in with Google only.", "هذا الحساب يسجّل الدخول عبر Google فقط."],
    eMismatch: ["The email doesn't match.", "البريد غير مطابق."],
    eAssistant: ["Couldn't delete AI coach data, so nothing was deleted. Try again later.", "تعذر حذف بيانات المدرب الذكي، لذلك لم يُحذف شيء. حاول لاحقًا."],
    eUnavailable: ["This action isn't configured on the server yet.", "هذا الإجراء غير مُعدّ على الخادم بعد."],
    eNotFound: ["User not found.", "المستخدم غير موجود."],
    eGeneric: ["Something went wrong. Try again.", "حدث خطأ. حاول مرة أخرى."]
```
and helpers:
```js
  function errText(r) {
    switch (r.code) {
      case "cannot_modify_admin": return s("eCannotAdmin");
      case "no_password": return s("eNoPassword");
      case "confirm_mismatch": return s("eMismatch");
      case "assistant_delete_failed": return s("eAssistant");
      case "delete_unavailable": case "reset_unavailable": return s("eUnavailable");
      case "not_found": return s("eNotFound");
      case "invalid_request": return r.message || s("eGeneric");
      default: return s("eGeneric");
    }
  }
  function provLabel(p) { return s(p === "google" ? "pGoogle" : p === "both" ? "pBoth" : "pPassword"); }
  var DEFAULT_AV = "icons/avatar-default.svg";
  function avatar(u, big) {
    var img = el("img", { class: "adm-av", alt: "", width: big ? 64 : 36, height: big ? 64 : 36, referrerpolicy: "no-referrer", loading: "lazy" });
    img.src = u.picture || DEFAULT_AV;
    img.addEventListener("error", function () { if (img.src.indexOf(DEFAULT_AV) < 0) img.src = DEFAULT_AV; });
    return img;
  }
```

- [ ] **Step 2: List view**
```js
  state.users = { q: "", sort: "created", page: 1 };
  var searchTimer = null;
  views.users = function () {
    var u = state.users;
    main.textContent = "";
    var input = el("input", { type: "search", placeholder: s("search"), "aria-label": s("search"), maxlength: "100", value: u.q });
    input.addEventListener("input", function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { u.q = input.value.trim(); u.page = 1; loadList(); }, 300);
    });
    var sel = el("select", { "aria-label": s("sortNew") }, [
      el("option", { value: "created", text: s("sortNew") }), el("option", { value: "lastSeen", text: s("sortSeen") })
    ]);
    sel.value = u.sort;
    sel.addEventListener("change", function () { u.sort = sel.value; u.page = 1; loadList(); });
    main.appendChild(el("div", { class: "adm-tools" }, [input, sel]));
    var host = el("div", { id: "admListHost" });
    main.appendChild(host);
    loadList();
  };
  var listSeq = 0;
  function loadList() {
    var u = state.users, seq = ++listSeq;
    var host = document.getElementById("admListHost");
    if (!host) return;
    var qs = "?page=" + u.page + "&pageSize=25&sort=" + encodeURIComponent(u.sort) + (u.q ? "&q=" + encodeURIComponent(u.q) : "");
    api("/users" + qs).then(function (r) {
      if (seq !== listSeq) return; // a newer search superseded this one
      if (authFailed(r)) return;
      host.textContent = "";
      if (!r.ok) { host.appendChild(el("p", { class: "adm-err", role: "alert", text: s("loadErr") })); return; }
      var d = r.data;
      if (!d.users.length) { host.appendChild(el("p", { class: "adm-msg", text: s("none") })); return; }
      host.appendChild(el("div", { class: "adm-list" }, d.users.map(function (x) {
        return el("button", { type: "button", class: "adm-row", onclick: function () { openUser(x.id); } }, [
          avatar(x),
          el("span", null, [el("div", { class: "adm-email", text: x.email }), el("div", { class: "adm-sub", text: x.displayName || x.name || "" })]),
          el("span", { class: "adm-sub adm-col-hide", text: s("colJoined") + ": " + fmtDate(x.createdAt) }),
          el("span", { class: "adm-sub adm-col-hide", text: s("colSeen") + ": " + fmtDate(x.lastSeenAt) }),
          el("span", { class: "adm-sub adm-col-hide", text: provLabel(x.provider) }),
          x.blocked ? el("span", { class: "adm-badge blocked", text: s("blocked") }) : el("span")
        ]);
      })));
      var pages = Math.max(1, Math.ceil(d.total / d.pageSize));
      host.appendChild(el("div", { class: "adm-pager" }, [
        el("button", { class: "adm-btn", text: s("prev"), disabled: u.page <= 1, onclick: function () { u.page--; loadList(); } }),
        el("span", { class: "adm-sub", text: s("pageOf", { p: u.page, n: pages, t: fmtNum(d.total) }) }),
        el("button", { class: "adm-btn", text: s("next"), disabled: u.page >= pages, onclick: function () { u.page++; loadList(); } })
      ]));
    });
  }
```

- [ ] **Step 3: Detail panel + actions**
```js
  var panel, backdrop, lastFocus;
  function closePanel() {
    panel.hidden = true; backdrop.hidden = true; panel.textContent = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function openUser(id) {
    panel = document.getElementById("admPanel"); backdrop = document.getElementById("admPanelBackdrop");
    lastFocus = document.activeElement;
    panel.hidden = false; backdrop.hidden = false;
    backdrop.onclick = closePanel;
    panel.textContent = "";
    panel.appendChild(el("p", { class: "adm-msg", text: s("loading") }));
    api("/users/" + encodeURIComponent(id)).then(function (r) {
      if (authFailed(r)) { closePanel(); return; }
      if (!r.ok) { panel.textContent = ""; panel.appendChild(el("p", { class: "adm-err", text: errText(r) })); panel.appendChild(el("button", { class: "adm-btn", text: s("close"), onclick: closePanel })); return; }
      drawUser(r.data);
    });
  }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && panel && !panel.hidden) closePanel(); });

  function drawUser(u) {
    panel.textContent = "";
    var status = el("p", { class: "adm-err", role: "status", "aria-live": "polite" });
    function done(r, okText) {
      if (authFailed(r)) { closePanel(); return false; }
      if (!r.ok) { status.className = "adm-err"; status.textContent = errText(r); return false; }
      status.className = "adm-ok"; status.textContent = okText || "";
      return true;
    }
    var img = avatar(u, true);
    if (u.hasPhoto) {
      api("/users/" + encodeURIComponent(u.id) + "/photo").then(function (r) {
        if (r.ok && r.blob) r.blob.blob().then(function (b) { img.src = URL.createObjectURL(b); });
      });
    }
    var badges = el("div", null, [
      u.isAdmin ? el("span", { class: "adm-badge", text: s("admin") }) : null,
      u.blocked ? el("span", { class: "adm-badge blocked", text: s("blocked") }) : null,
      el("span", { class: "adm-badge", text: provLabel(u.provider) })
    ]);
    var kv = el("dl", { class: "adm-kv" });
    [["kvEmail", u.email], ["kvId", u.id], ["colJoined", fmtDate(u.createdAt)], ["colSeen", fmtDate(u.lastSeenAt)],
     ["kvVerified", s(u.emailVerified ? "yes" : "no")], ["kvStreak", fmtNum(u.currentStreak)], ["kvDays", fmtNum(u.totalDaysTrained)],
     ["kvWorkouts", fmtNum(u.workouts)], ["kvMeals", fmtNum(u.meals)], u.blocked ? ["kvBlockedAt", fmtDate(u.blockedAt)] : null
    ].forEach(function (p) { if (p) { kv.appendChild(el("dt", { text: s(p[0]) })); kv.appendChild(el("dd", { text: p[1] })); } });

    var fName = el("input", { type: "text", maxlength: "50", value: u.displayName || u.name || "" });
    var fW = el("input", { type: "number", min: "20", max: "400", step: "0.1", value: u.weightKg || "" });
    var fH = el("input", { type: "number", min: "50", max: "250", step: "0.1", value: u.heightCm || "" });
    var fV = el("input", { type: "checkbox" }); fV.checked = !!u.emailVerified;
    var form = el("form", { class: "adm-form" }, [
      el("h3", { text: s("editTitle") }),
      el("label", null, [s("fName"), fName]), el("label", null, [s("fWeight"), fW]), el("label", null, [s("fHeight"), fH]),
      u.provider !== "google" && !u.isAdmin ? el("label", null, [fV, " ", s("fVerified")]) : null,
      el("button", { class: "adm-btn primary", type: "submit", text: s("save") })
    ]);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var body = {};
      if (fName.value.trim() !== (u.displayName || u.name || "")) body.displayName = fName.value.trim();
      if (fW.value !== "" && Number(fW.value) !== u.weightKg) body.weightKg = Number(fW.value);
      if (fH.value !== "" && Number(fH.value) !== u.heightCm) body.heightCm = Number(fH.value);
      if (fV.isConnected && fV.checked !== !!u.emailVerified) body.emailVerified = fV.checked;
      if (!Object.keys(body).length) { status.className = "adm-ok"; status.textContent = s("saved"); return; }
      api("/users/" + encodeURIComponent(u.id), { method: "PATCH", body: body }).then(function (r) {
        if (done(r, s("saved"))) { drawUser(r.data); loadList(); }
      });
    });

    var actions = el("div", { class: "adm-actions" });
    if (u.hasPassword) actions.appendChild(el("button", { class: "adm-btn", text: s("reset"), onclick: function () {
      api("/users/" + encodeURIComponent(u.id) + "/reset-password", { method: "POST", body: { lang: LANG } }).then(function (r) { done(r, s("resetSent")); });
    } }));
    if (!u.isAdmin) {
      actions.appendChild(el("button", { class: "adm-btn", text: s(u.blocked ? "unblock" : "block"), onclick: function () {
        if (!u.blocked && !window.confirm(s("blockConfirm", { e: u.email }))) return;
        api("/users/" + encodeURIComponent(u.id) + "/" + (u.blocked ? "unblock" : "block"), { method: "POST" }).then(function (r) {
          if (done(r)) { drawUser(r.data); loadList(); }
        });
      } }));
      actions.appendChild(el("button", { class: "adm-btn danger", text: s("del"), onclick: function () { deleteDialog(u, status); } }));
    }

    panel.appendChild(el("button", { class: "adm-btn", text: s("close"), onclick: closePanel, style: "float:inline-end" }));
    panel.appendChild(img);
    panel.appendChild(el("h2", { id: "admPanelTitle", text: u.displayName || u.name || u.email }));
    panel.appendChild(badges);
    panel.appendChild(kv);
    panel.appendChild(form);
    panel.appendChild(actions);
    panel.appendChild(status);
    panel.querySelector("button").focus();
  }

  function deleteDialog(u, status) {
    var input = el("input", { type: "email", autocomplete: "off", "aria-label": s("kvEmail") });
    var go = el("button", { class: "adm-btn danger", text: s("delGo"), disabled: true });
    var err = el("p", { class: "adm-err", role: "alert" });
    var box = el("div", { class: "adm-section", role: "alertdialog", "aria-labelledby": "admDelTitle" }, [
      el("h2", { id: "admDelTitle", text: s("delTitle") }),
      el("p", { text: s("delBody") }),
      el("p", null, [el("b", { text: u.email })]),
      input, err,
      el("div", { class: "adm-actions" }, [go, el("button", { class: "adm-btn", text: s("cancel"), onclick: function () { box.remove(); } })])
    ]);
    input.addEventListener("input", function () {
      go.disabled = input.value.trim().toLowerCase() !== String(u.email || "").trim().toLowerCase();
    });
    go.addEventListener("click", function () {
      go.disabled = true;
      api("/users/" + encodeURIComponent(u.id), { method: "DELETE", body: { confirmEmail: input.value.trim() } }).then(function (r) {
        if (authFailed(r)) { closePanel(); return; }
        if (!r.ok) { err.textContent = errText(r); go.disabled = false; return; }
        closePanel();
        loadList();
        var note = el("p", { class: "adm-ok", role: "status", text: s("deleted") });
        main.insertBefore(note, main.firstChild);
        setTimeout(function () { note.remove(); }, 5000);
      });
    });
    panel.appendChild(box);
    input.focus();
  }
```

- [ ] **Step 4: Verify** — `node --check admin.js`; Playwright with mocks for list/detail/patch/block/delete (routes by method+path): search debounce issues one request; pagination buttons; panel opens/closes (Esc, backdrop); Save sends only changed fields; Block asks confirm (`page.on('dialog', d => d.accept())`) and badge appears; Delete button disabled until email typed (case-insensitive), 204 → panel closes + "Account deleted."; admin user shows no Block/Delete; Google-only user shows no reset button.

- [ ] **Step 5: Commit** — `feat(ui): admin users tab with detail, edit, reset, block and delete`

---

### Task 5: Activity tab, full browser verification, PR

**Files:** Modify `admin.js`.

- [ ] **Step 1: Activity view** — strings:
```js
    actBlock: ["blocked", "حظر"], actUnblock: ["unblocked", "ألغى حظر"], actEdit: ["edited", "عدّل"],
    actReset: ["sent a password reset to", "أرسل إعادة تعيين كلمة المرور إلى"], actDelete: ["deleted", "حذف"],
    noActivity: ["No admin actions yet.", "لا توجد إجراءات إدارية بعد."], more: ["Load more", "تحميل المزيد"]
```
view:
```js
  views.activity = function () {
    var page = 1, list = el("div", { class: "adm-audit" }), more = el("button", { class: "adm-btn", text: s("more") });
    var ACT = { block: "actBlock", unblock: "actUnblock", edit: "actEdit", reset_password: "actReset", delete: "actDelete" };
    function load() {
      more.disabled = true;
      api("/audit?page=" + page + "&pageSize=50").then(function (r) {
        if (authFailed(r)) return;
        if (!r.ok) { list.appendChild(el("p", { class: "adm-err", text: s("loadErr") })); more.disabled = false; return; }
        var es = r.data.entries || [];
        if (page === 1) { main.textContent = ""; main.appendChild(list); main.appendChild(more); }
        if (page === 1 && !es.length) { list.appendChild(el("p", { class: "adm-msg", text: s("noActivity") })); more.remove(); return; }
        es.forEach(function (e) {
          var when = new Date(e.at);
          var line = fmtDate(e.at) + " " + (isNaN(when) ? "" : when.toLocaleTimeString(AR ? "ar" : "en", { hour: "2-digit", minute: "2-digit" })) +
            " — " + e.adminEmail + " " + s(ACT[e.action] || "actEdit") + " " + (e.targetEmail || e.targetId);
          var fields = e.details ? Object.keys(e.details).join(", ") : "";
          list.appendChild(el("div", null, [line, fields ? el("div", { class: "adm-sub", text: fields }) : null]));
        });
        if (es.length < 50) more.remove(); else { page++; more.disabled = false; }
      });
    }
    more.addEventListener("click", load);
    load();
  };
```

- [ ] **Step 2: Full Playwright pass** — one script (kept in the scratchpad, not committed), each scenario asserting zero app console errors:
  1. **no session** → message + link to `/`.
  2. **forbidden** → "Not authorized".
  3. **overview** EN 1440 px and AR 390 px — cards, 90 bars, `document.documentElement.scrollWidth <= innerWidth`.
  4. **xss** — list/detail mock with `email: "<img src=x onerror=window.__x=1>@x.test"` and same for displayName; assert `window.__x` undefined and the literal text is visible.
  5. **401 mid-session** — stats OK, then `/users` → 401 → "Your session expired…".
  6. **delete 502** — DELETE → 502 `assistant_delete_failed` → error text shown, panel stays open, user still in list.
  7. **ar-390** — users tab + open panel + delete dialog at 390×844 in Arabic: no horizontal scroll, panel fills width, buttons ≥ 44 px tall.
  8. **activity** — 50 entries then "Load more" → page 2 request; empty → "No admin actions yet."
  9. **app side (Task 1)** — re-run Task 1's three checks on the final branch.
  Take screenshots of 3, 6, 7 for the PR.

- [ ] **Step 3: Docker check** — `docker build .`; confirm the three admin files are served and `curl -sI localhost:<port>/admin.html` shows `Cache-Control: no-store` and `X-Robots-Tag` (run the image with `-p <port>:8080`).

- [ ] **Step 4: Commit + PR** — commit `feat(ui): admin activity log`; push `feat/admin-dashboard`; `gh pr create` with summary, screenshots, "depends on gym-be admin API PR", body ending `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Do not merge.
