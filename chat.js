/* chat.js — floating live nutrition/fitness chat bubble.
 *
 * A small circular "AI coach" button, visible on every screen except while
 * the workout timer is running, that opens a lightweight chat drawer backed
 * by POST /assistant/chat. Idle, it occasionally shows a short static tip
 * (no network call). Anonymous taps prompt sign-in, same as the Coach tab.
 *
 * Local keys (NOT synced — deliberately not gym_-prefixed, device-local):
 *   gymchat_history   the visible transcript (trimmed), restored on reopen
 */
(function () {
  "use strict";

  var ASSIST_BASE = (window.GYM_API_BASE || "/api/v1").replace(/\/+$/, "") + "/assistant";
  var CALL_TIMEOUT_MS = 30000;
  var HIST_KEY = "gymchat_history";
  var HIST_MAX = 30;      // kept for display
  var SEND_WINDOW = 8;    // most recent turns actually sent to the API
  var MSG_MAX = 600;      // mirrors the backend's per-message cap
  var TIP_FIRST_MS = 9000;
  var TIP_INTERVAL_MS = 75000;
  var TIP_SHOW_MS = 7000;

  // ---------------- i18n ----------------
  function lang() {
    try { if (window.activeLang === "ar") return "ar"; } catch (e) {}
    try { return localStorage.getItem("gym_lang") === "ar" ? "ar" : "en"; } catch (e) { return "en"; }
  }
  var STR = {
    fabLabel: ["Ask the nutrition coach", "اسأل مدرّب التغذية"],
    title: ["Nutrition & fitness chat", "دردشة التغذية واللياقة"],
    placeholder: ["Ask a quick question…", "اسأل سؤالاً سريعاً…"],
    signInBody: ["Sign in to chat with your AI coach.", "سجّل الدخول للدردشة مع مدرّبك الذكي."],
    thinking: ["Thinking…", "يفكّر…"],
    quota: ["You've reached today's chat limit. Try again after {t}.", "بلغت حد الدردشة اليومي. حاول بعد {t}."],
    err: ["Couldn't reach the coach. Try again.", "تعذّر الوصول إلى المدرّب. حاول مرة أخرى."],
    retry: ["Retry", "أعد المحاولة"],
    refused: ["Let's keep this to nutrition & training — for anything medical, please see a professional.",
      "لنُبقِ الحديث عن التغذية والتمرين — لأي أمر طبي، يُرجى مراجعة مختص."]
  };
  function s(k) { var e = STR[k]; return e ? e[lang() === "ar" ? 1 : 0] : k; }
  function fmt(t, params) { return t.replace(/\{(\w+)\}/g, function (_, k) { return params[k] != null ? params[k] : ""; }); }

  var TIPS = [
    ["Protein at every meal helps curb cravings and preserves muscle in a deficit.", "تناول بروتين في كل وجبة يقلّل الرغبة الشديدة في الطعام ويحافظ على العضلات أثناء نقص السعرات."],
    ["Aim for 7–9 hours of sleep — recovery drives most of your progress.", "احرص على 7-9 ساعات نوم — الاستشفاء هو محرك معظم تقدّمك."],
    ["Progressive overload beats a perfect program: add a little weight or a rep each week.", "الزيادة التدريجية أهم من برنامج مثالي: أضف وزناً أو تكراراً بسيطاً كل أسبوع."],
    ["Hydration affects strength and focus — sip water through the day, not just at the gym.", "الترطيب يؤثر على القوة والتركيز — اشرب الماء طوال اليوم لا فقط في الجيم."],
    ["A short walk after meals can help blood sugar and digestion.", "المشي القصير بعد الوجبات يساعد سكر الدم والهضم."],
    ["Fiber-rich carbs (oats, veggies, legumes) keep you fuller for the same calories.", "الكارب الغني بالألياف (شوفان، خضار، بقوليات) يشبعك أكثر بنفس عدد السعرات."],
    ["Consistency beats intensity — a doable plan you repeat wins over a perfect one you quit.", "الثبات أهم من الشدة — خطة قابلة للتنفيذ تكررها أفضل من خطة مثالية تتوقف عنها."],
    ["Warm up the specific lift, not just cardio — light sets of the first exercise reduce injury risk.", "سخّن للتمرين المحدد لا الكارديو فقط — مجموعات خفيفة من أول تمرين تقلّل خطر الإصابة."]
  ];

  // ---------------- tiny DOM helper (mirrors coach.js) ----------------
  function h(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") node.className = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else if (k === "on" && attrs[k]) {
          Object.keys(attrs[k]).forEach(function (ev) { node.addEventListener(ev, attrs[k][ev]); });
        } else if (attrs[k] != null && attrs[k] !== false) node.setAttribute(k, attrs[k]);
      });
    }
    var put = function (x) {
      if (x == null || x === false) return;
      if (typeof x === "string") node.appendChild(document.createTextNode(x));
      else if (x && x.nodeType) node.appendChild(x);
      else node.appendChild(document.createTextNode(String(x)));
    };
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (Array.isArray(c)) c.forEach(put);
      else put(c);
    }
    return node;
  }

  function mascotIcon() {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 64 64");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML =
      '<circle cx="32" cy="10" r="3" fill="var(--accent-3)"/>' +
      '<rect x="31" y="12" width="2" height="5" fill="var(--paper-dim)"/>' +
      '<rect x="10" y="16" width="34" height="30" rx="10" fill="#fff" fill-opacity=".18"/>' +
      '<circle cx="22" cy="30" r="4" fill="#fff"/><circle cx="22" cy="30" r="2" fill="#1b2430"/>' +
      '<circle cx="36" cy="30" r="4" fill="#fff"/><circle cx="36" cy="30" r="2" fill="#1b2430"/>' +
      '<path d="M23 39c3 3 9 3 12 0" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
    return svg;
  }

  function loadJSON(k, fb) { try { return JSON.parse(localStorage.getItem(k)) || fb; } catch (e) { return fb; } }
  function saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  function authToken() { return window.GymSync && GymSync.token ? GymSync.token() : null; }
  function isAuthed() { return window.GymUI && GymUI.isAuthed && GymUI.isAuthed(); }

  function fetchTimeout(url, opts) {
    opts = opts || {};
    var c = new AbortController();
    var timer = setTimeout(function () { c.abort(); }, CALL_TIMEOUT_MS);
    opts.signal = c.signal;
    return fetch(url, opts).finally(function () { clearTimeout(timer); });
  }

  // ---------------- state ----------------
  var history = loadJSON(HIST_KEY, []); // [{role:'user'|'assistant', content}]
  var open = false;
  var sending = false;
  var tipTimer = null;
  var tipHideTimer = null;

  var fab, fabTip, chat, backdrop, closeBtn, msgsEl, form, input, sendBtn, iconHost, titleEl;

  function els() {
    fab = document.getElementById("coachFab");
    fabTip = document.getElementById("coachFabTip");
    chat = document.getElementById("coachChat");
    backdrop = document.getElementById("coachChatBackdrop");
    closeBtn = document.getElementById("coachChatClose");
    msgsEl = document.getElementById("coachChatMsgs");
    form = document.getElementById("coachChatForm");
    input = document.getElementById("coachChatInput");
    sendBtn = document.getElementById("coachChatSend");
    iconHost = document.getElementById("coachChatIcon");
    titleEl = document.getElementById("coachChatTitle");
    return !!(fab && chat && form && input);
  }

  // ---------------- timer-aware visibility ----------------
  // The FAB stays out of the way while a rest timer is actively shown —
  // #timerBar / #miniTimer already occupy that same bottom area.
  function timerActive() {
    var tb = document.getElementById("timerBar");
    var mt = document.getElementById("miniTimer");
    return !!((tb && tb.classList.contains("show")) || (mt && mt.classList.contains("show")));
  }
  function refreshFabVisibility() {
    if (!fab) return;
    var hide = open || timerActive() || document.body.classList.contains("onboarding-open");
    fab.hidden = hide;
    if (hide && fabTip) hideTip();
  }
  function watchTimers() {
    ["timerBar", "miniTimer"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || !window.MutationObserver) return;
      new MutationObserver(refreshFabVisibility).observe(el, { attributes: true, attributeFilter: ["class"] });
    });
  }

  // ---------------- idle tips ----------------
  function showTip() {
    if (open || !fab || fab.hidden || !fabTip) return;
    var pick = TIPS[Math.floor(Math.random() * TIPS.length)];
    fabTip.textContent = pick[lang() === "ar" ? 1 : 0];
    fabTip.hidden = false;
    requestAnimationFrame(function () { fabTip.classList.add("show"); });
    if (tipHideTimer) clearTimeout(tipHideTimer);
    tipHideTimer = setTimeout(hideTip, TIP_SHOW_MS);
  }
  function hideTip() {
    if (!fabTip) return;
    fabTip.classList.remove("show");
    setTimeout(function () { if (!fabTip.classList.contains("show")) fabTip.hidden = true; }, 220);
  }
  function startTipCycle() {
    setTimeout(function () {
      showTip();
      tipTimer = setInterval(showTip, TIP_INTERVAL_MS);
    }, TIP_FIRST_MS);
  }

  // ---------------- drawer ----------------
  function renderStatic() {
    titleEl.textContent = s("title");
    iconHost.appendChild(mascotIcon());
    input.placeholder = s("placeholder");
    fab.setAttribute("aria-label", s("fabLabel"));
    fab.innerHTML = "";
    fab.appendChild(mascotIcon());
  }

  function bubble(role, text) {
    return h("div", { class: "coach-chat-msg " + role }, text);
  }
  function systemBubble(text, opts) {
    opts = opts || {};
    var kids = [text];
    if (opts.retry) {
      kids.push(h("button", { type: "button", class: "coach-chat-retry", on: { click: opts.retry } }, s("retry")));
    }
    return h.apply(null, ["div", { class: "coach-chat-msg system" }].concat(kids));
  }
  function typingBubble() {
    return h("div", { class: "coach-chat-msg assistant typing", id: "coachChatTyping" },
      h("span", {}), h("span", {}), h("span", {}));
  }

  function renderHistory() {
    msgsEl.innerHTML = "";
    if (!history.length) {
      msgsEl.appendChild(h("div", { class: "coach-chat-empty" }, s("placeholder")));
    }
    history.forEach(function (m) { msgsEl.appendChild(bubble(m.role, m.content)); });
    scrollToBottom();
  }
  function scrollToBottom() { try { msgsEl.scrollTop = msgsEl.scrollHeight; } catch (e) {} }

  function pushHistory(role, content) {
    history.push({ role: role, content: content });
    if (history.length > HIST_MAX) history = history.slice(history.length - HIST_MAX);
    saveJSON(HIST_KEY, history);
  }

  function openChat() {
    if (!isAuthed()) { if (window.GymUI) GymUI.promptSignIn(); return; }
    open = true;
    chat.hidden = false;
    requestAnimationFrame(function () { chat.classList.add("show"); });
    fab.setAttribute("aria-expanded", "true");
    refreshFabVisibility();
    renderHistory();
    setTimeout(function () { try { input.focus({ preventScroll: true }); } catch (e) {} }, 60);
  }
  function closeChat() {
    open = false;
    chat.classList.remove("show");
    fab.setAttribute("aria-expanded", "false");
    setTimeout(function () { if (!open) chat.hidden = true; }, 220);
    refreshFabVisibility();
  }

  function setSending(v) {
    sending = v;
    sendBtn.disabled = v;
    input.disabled = v;
  }

  function sendMessage(text) {
    var token = authToken();
    if (!token) { if (window.GymUI) GymUI.promptSignIn(); return; }
    pushHistory("user", text);
    msgsEl.querySelector(".coach-chat-empty") && (msgsEl.innerHTML = "");
    msgsEl.appendChild(bubble("user", text));
    scrollToBottom();
    setSending(true);
    msgsEl.appendChild(typingBubble());
    scrollToBottom();

    var recent = history.slice(-SEND_WINDOW).map(function (m) { return { role: m.role, content: m.content }; });
    var body = { lang: lang(), messages: recent };
    var profile = window.GymCoach && GymCoach.currentProfile ? GymCoach.currentProfile() : null;
    if (profile) body.profile = profile;

    fetchTimeout(ASSIST_BASE + "/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify(body)
    }).then(function (res) {
      var typing = document.getElementById("coachChatTyping");
      if (typing) typing.remove();
      if (res.status === 401) { setSending(false); if (window.GymUI) GymUI.promptSignIn(); return null; }
      if (res.status === 429) {
        var reset = res.headers.get("X-RateLimit-Reset");
        var when = reset;
        try { when = new Date(reset).toLocaleString(lang() === "ar" ? "ar-EG" : "en-US"); } catch (e) {}
        msgsEl.appendChild(systemBubble(fmt(s("quota"), { t: when })));
        scrollToBottom(); setSending(false);
        return null;
      }
      return res.json().then(function (b) { return { status: res.status, body: b }; })
        .catch(function () { return { status: res.status, body: null }; });
    }).then(function (r) {
      if (!r) return;
      setSending(false);
      if (r.status === 200 && r.body && r.body.reply) {
        pushHistory("assistant", r.body.reply);
        msgsEl.appendChild(bubble("assistant", r.body.reply));
        scrollToBottom();
      } else {
        if (window.console) console.warn("[chat] failed", r.status, r.body);
        msgsEl.appendChild(systemBubble(s("err"), { retry: function () { sendMessage(text); } }));
        scrollToBottom();
      }
    }).catch(function (err) {
      var typing = document.getElementById("coachChatTyping");
      if (typing) typing.remove();
      if (window.console) console.warn("[chat] error", err && err.message);
      setSending(false);
      msgsEl.appendChild(systemBubble(s("err"), { retry: function () { sendMessage(text); } }));
      scrollToBottom();
    });
  }

  function wire() {
    renderStatic();
    fab.addEventListener("click", function () {
      if (!isAuthed()) { if (window.GymUI) GymUI.promptSignIn(); return; }
      hideTip();
      openChat();
    });
    fabTip.addEventListener("click", function () {
      hideTip();
      if (!isAuthed()) { if (window.GymUI) GymUI.promptSignIn(); return; }
      openChat();
    });
    closeBtn.addEventListener("click", closeChat);
    backdrop.addEventListener("click", closeChat);
    document.addEventListener("keydown", function (e) { if (open && e.key === "Escape") closeChat(); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (sending) return;
      var v = (input.value || "").trim();
      if (!v) return;
      if (v.length > MSG_MAX) v = v.slice(0, MSG_MAX);
      input.value = "";
      sendMessage(v);
    });

    watchTimers();
    refreshFabVisibility();
    startTipCycle();

    document.addEventListener("gym:lang-changed", renderStatic);
  }

  function boot() {
    if (!els()) return;
    wire();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
