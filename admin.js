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
