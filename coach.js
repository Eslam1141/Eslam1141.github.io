/* coach.js — the AI Coach screen (Track D).
 *
 * Renders into #coachBody. Anonymous/signed-out users see a teaser; signed-in
 * users get a profile form that POSTs to the gym-assistant service and a
 * rendered diet + workout plan. Loads after app.js (reads the global
 * activeLang / gym_plan) and after ui.js. No external deps.
 *
 * Local keys (NOT synced — deliberately not gym_-prefixed):
 *   gymcoach_form  live form values (saved on every edit, restored on return)
 *   gymcoach_last  last successful result (pinned so the screen reopens to it)
 */
(function () {
  "use strict";

  var ASSIST_BASE = (window.GYM_API_BASE || "/api/v1").replace(/\/+$/, "") + "/assistant";
  var CALL_TIMEOUT_MS = 45000;
  var FORM_KEY = "gymcoach_form";
  var LAST_KEY = "gymcoach_last";

  // ---------------- i18n ----------------
  function lang() {
    try { if (window.activeLang === "ar") return "ar"; } catch (e) {}
    try { return localStorage.getItem("gym_lang") === "ar" ? "ar" : "en"; } catch (e) { return "en"; }
  }
  var STR = {
    teaseTitle: ["Meet your AI coach", "تعرّف على مدرّبك الذكي"],
    teaseBody: ["A diet and training plan calculated from your body numbers and goal — then filled in by Claude. Free with a Google account.",
      "خطة تغذية وتمرين تُحسب من أرقام جسمك وهدفك، ثم يكملها كلود. مجانية مع حساب جوجل."],
    teaseB1: ["Calorie & macro targets from your stats", "أهداف السعرات والماكروز من بياناتك"],
    teaseB2: ["A weekly split for your equipment & days", "تقسيم أسبوعي حسب معدّاتك وأيامك"],
    teaseB3: ["Swap-friendly meals for your diet", "وجبات قابلة للتبديل حسب نظامك"],
    signIn: ["Sign in with Google", "سجّل الدخول عبر جوجل"],
    want: ["I want", "أريد"],
    wantBoth: ["Both", "الاثنين"], wantDiet: ["Diet", "تغذية"], wantWorkout: ["Workout", "تمرين"],
    grpYou: ["You", "أنت"],
    grpGoal: ["Goal", "الهدف"],
    grpTraining: ["Training", "التمرين"],
    grpDiet: ["Diet", "التغذية"],
    grpInBody: ["InBody / DEXA (optional)", "InBody / DEXA (اختياري)"],
    grpNotes: ["Anything else? (injuries, schedule…)", "أي شيء آخر؟ (إصابات، جدول…)"],
    age: ["Age", "العمر"], sex: ["Sex", "الجنس"],
    male: ["Male", "ذكر"], female: ["Female", "أنثى"],
    sexFromPlan: ["From your plan — change it on the Plan screen", "من خطتك — غيّرها من شاشة الخطة"],
    heightCm: ["Height", "الطول"], weightKg: ["Weight", "الوزن"],
    goal: ["Goal", "الهدف"],
    lose_fat: ["Lose fat", "خسارة دهون"], gain_muscle: ["Build muscle", "بناء عضل"],
    maintain: ["Maintain", "محافظة"], recomp: ["Recomposition", "إعادة تكوين"],
    activityLevel: ["Daily activity", "النشاط اليومي"],
    sedentary: ["Sedentary", "خامل"], light: ["Lightly active", "نشاط خفيف"],
    moderate: ["Moderately active", "نشاط متوسط"], active: ["Very active", "نشيط جداً"],
    athlete: ["Athlete", "رياضي"],
    trainingDaysPerWeek: ["Training days / week", "أيام التمرين / الأسبوع"],
    equipment: ["Equipment", "المعدّات"],
    full_gym: ["Full gym", "جيم كامل"], home_minimal: ["Home basics", "أساسيات منزلية"],
    bodyweight: ["Bodyweight only", "وزن الجسم فقط"],
    dietPreference: ["Eating style", "نمط الأكل"],
    balanced: ["Balanced", "متوازن"], high_protein: ["High protein", "بروتين عالٍ"],
    keto: ["Keto", "كيتو"], mediterranean: ["Mediterranean", "متوسطي"],
    vegetarian: ["Vegetarian", "نباتي"], vegan: ["Vegan", "نباتي صِرف"],
    halal: ["Halal", "حلال"], low_carb: ["Low carb", "قليل الكارب"],
    allergies: ["Allergies", "حساسية"], dislikes: ["Foods to avoid", "أطعمة يجب تجنّبها"],
    chipHint: ["Type and press Enter", "اكتب واضغط Enter"],
    bodyFatPct: ["Body fat %", "نسبة الدهون %"],
    skeletalMuscleMassKg: ["Skeletal muscle (kg)", "الكتلة العضلية (كجم)"],
    visceralFatLevel: ["Visceral fat level", "مستوى الدهون الحشوية"],
    bmrKcal: ["Measured BMR (kcal)", "معدل الأيض المُقاس (سعرة)"],
    notes: ["Notes", "ملاحظات"],
    generate: ["Generate my plan", "أنشئ خطتي"],
    generating: ["Building your plan… this can take 15–30s", "جارٍ بناء خطتك… قد تستغرق 15–30 ثانية"],
    // validation
    vRequired: ["Required", "مطلوب"],
    vRange: ["Enter {min}–{max}", "أدخل {min}–{max}"],
    vRangeU: ["Enter {min}–{max} {u}", "أدخل {min}–{max} {u}"],
    vAgeMin: ["Must be 16 or older", "يجب أن يكون العمر 16 عاماً فأكثر"],
    vInt: ["Whole number only", "رقم صحيح فقط"],
    vNotesMax: ["Max 300 characters", "الحد الأقصى 300 حرف"],
    vFixTop: ["Fill the required fields to continue", "أكمل الحقول المطلوبة للمتابعة"],
    // result
    resSummary: ["Summary", "الملخّص"],
    resTargets: ["Your numbers", "أرقامك"],
    bmi: ["BMI", "مؤشر الكتلة"], bmr: ["BMR", "الأيض الأساسي"], tdee: ["TDEE", "الحرق اليومي"],
    target: ["Target", "الهدف"], protein: ["Protein", "بروتين"], fat: ["Fat", "دهون"], carb: ["Carbs", "كارب"],
    kcal: ["kcal", "سعرة"], gram: ["g", "جم"], perDay: ["/day", "/يوم"],
    resDiet: ["Diet plan", "خطة التغذية"], resWorkout: ["Workout plan", "خطة التمرين"],
    swaps: ["Easy swaps", "بدائل سهلة"], hydration: ["Water", "الماء"],
    liters: ["L", "لتر"], split: ["Split", "التقسيم"], progression: ["Progression", "التدرّج"],
    cardio: ["Cardio", "كارديو"], restS: ["rest", "راحة"], daysWk: ["days/week", "أيام/أسبوع"],
    disclaimers: ["Good to know", "معلومة مهمة"],
    btnNew: ["New assessment", "تقييم جديد"],
    btnDetail: ["More detail", "تفاصيل أكثر"],
    btnApply: ["Use workout as my plan", "استخدم التمرين كخطتي"],
    btnHistory: ["History", "السجل"],
    applied: ["Added to your plans →", "أُضيفت إلى خططك ←"],
    quotaTitle: ["Daily limit reached", "بلغت الحد اليومي"],
    quotaBody: ["You've used today's assessments. Try again after {t}.", "لقد استخدمت تقييمات اليوم. حاول مجدداً بعد {t}."],
    errTitle: ["Couldn't reach the coach", "تعذّر الوصول إلى المدرّب"],
    errBody: ["The coach service isn't responding right now. Please try again in a moment.", "خدمة المدرّب لا تستجيب حالياً. يرجى المحاولة بعد قليل."],
    err502: ["The AI service is temporarily unavailable. Please try again shortly.", "خدمة الذكاء الاصطناعي غير متاحة مؤقتاً. حاول بعد قليل."],
    retry: ["Try again", "أعد المحاولة"],
    refusedTitle: ["Let's keep this safe", "لنُبقِ الأمر آمناً"],
    histEmpty: ["No past assessments yet.", "لا توجد تقييمات سابقة بعد."],
    histOpen: ["Open", "افتح"],
    back: ["Back", "رجوع"]
  };
  function s(k) {
    var e = STR[k];
    return e ? e[lang() === "ar" ? 1 : 0] : k;
  }

  // ---------------- tiny DOM helper ----------------
  function h(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") node.className = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else if (k === "on" && attrs[k]) {
          Object.keys(attrs[k]).forEach(function (ev) { node.addEventListener(ev, attrs[k][ev]); });
        } else if (attrs[k] != null && attrs[k] !== false) node.setAttribute(k, attrs[k]);
      });
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      if (Array.isArray(c)) c.forEach(function (x) { if (x != null) node.appendChild(typeof x === "string" ? document.createTextNode(x) : x); });
      else node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return node;
  }
  function mount(el) {
    var body = document.getElementById("coachBody");
    if (!body) return;
    body.innerHTML = "";
    body.appendChild(el);
    try { window.scrollTo(0, 0); } catch (e) {}
  }

  function loadJSON(k, fb) { try { return JSON.parse(localStorage.getItem(k)) || fb; } catch (e) { return fb; } }
  function saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  // ---------------- field spec (drives render + validation) ----------------
  var ENUMS = {
    goal: ["lose_fat", "gain_muscle", "maintain", "recomp"],
    activityLevel: ["sedentary", "light", "moderate", "active", "athlete"],
    equipment: ["full_gym", "home_minimal", "bodyweight"],
    dietPreference: ["balanced", "high_protein", "keto", "mediterranean", "vegetarian", "vegan", "halal", "low_carb"]
  };
  // num fields: {min,max,int,unit}. required unless optional:true (InBody).
  var NUM = {
    age: { min: 16, max: 100, int: true, hardMin: 10 },
    heightCm: { min: 120, max: 230, unit: "cm" },
    weightKg: { min: 35, max: 250, unit: "kg", step: "0.1" },
    trainingDaysPerWeek: { min: 1, max: 6, int: true, unit: s("daysWk") },
    bodyFatPct: { min: 3, max: 60, unit: "%", step: "0.1", optional: true },
    skeletalMuscleMassKg: { min: 10, max: 80, unit: "kg", step: "0.1", optional: true },
    visceralFatLevel: { min: 1, max: 30, int: true, optional: true },
    bmrKcal: { min: 500, max: 5000, int: true, optional: true }
  };

  function planSex() {
    try {
      var p = localStorage.getItem("gym_plan");
      return p === "male" || p === "female" ? p : "";
    } catch (e) { return ""; }
  }

  function defaultState() {
    return {
      want: "both",
      age: "", sex: planSex() || "male",
      heightCm: "", weightKg: "",
      goal: "lose_fat", activityLevel: "moderate",
      trainingDaysPerWeek: "4", equipment: "full_gym",
      dietPreference: "balanced", allergies: [], dislikes: [],
      inbodyOpen: false, bodyFatPct: "", skeletalMuscleMassKg: "", visceralFatLevel: "", bmrKcal: "",
      notes: ""
    };
  }
  function loadState() {
    var st = Object.assign(defaultState(), loadJSON(FORM_KEY, {}));
    var ps = planSex();
    if (ps) st.sex = ps;                       // plan is authoritative for sex
    if (["both", "diet", "workout"].indexOf(st.want) === -1) st.want = "both";
    ["allergies", "dislikes"].forEach(function (k) { if (!Array.isArray(st[k])) st[k] = []; });
    return st;
  }

  // ---------------- validation ----------------
  // Returns { errors: {field: msgKey|[msgKey,params]}, ok: bool }
  function validate(st) {
    var errors = {};
    Object.keys(NUM).forEach(function (name) {
      var spec = NUM[name];
      var raw = (st[name] == null ? "" : String(st[name])).trim();
      if (raw === "") { if (!spec.optional) errors[name] = ["vRequired"]; return; }
      var v = Number(raw);
      if (!isFinite(v)) { errors[name] = ["vRequired"]; return; }
      if (spec.int && !Number.isInteger(v)) { errors[name] = ["vInt"]; return; }
      if (name === "age" && v >= (spec.hardMin || 0) && v < spec.min) { errors[name] = ["vAgeMin"]; return; }
      if (v < spec.min || v > spec.max) {
        errors[name] = spec.unit ? ["vRangeU", { min: spec.min, max: spec.max, u: spec.unit }]
          : ["vRange", { min: spec.min, max: spec.max }];
      }
    });
    Object.keys(ENUMS).forEach(function (name) {
      if (ENUMS[name].indexOf(st[name]) === -1) errors[name] = ["vRequired"];
    });
    if (!(st.sex === "male" || st.sex === "female")) errors.sex = ["vRequired"];
    if ((st.notes || "").length > 300) errors.notes = ["vNotesMax"];
    return { errors: errors, ok: Object.keys(errors).length === 0 };
  }
  function msg(entry) {
    if (!entry) return "";
    var t = s(entry[0]), p = entry[1] || {};
    return t.replace(/\{(\w+)\}/g, function (_, k) { return p[k] != null ? p[k] : ""; });
  }

  // ---------------- network ----------------
  function fetchTimeout(url, opts) {
    opts = opts || {};
    var c = new AbortController();
    var timer = setTimeout(function () { c.abort(); }, CALL_TIMEOUT_MS);
    opts.signal = c.signal;
    return fetch(url, opts).finally(function () { clearTimeout(timer); });
  }
  function authToken() {
    return window.GymSync && GymSync.token ? GymSync.token() : null;
  }

  // ---------------- teaser ----------------
  function mascot(size) {
    var px = size || 96;
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 64 64");
    svg.setAttribute("width", px); svg.setAttribute("height", px);
    svg.setAttribute("class", "coach-mascot"); svg.setAttribute("aria-hidden", "true");
    svg.innerHTML =
      '<defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-2)"/>' +
      '</linearGradient></defs>' +
      '<rect x="10" y="16" width="34" height="30" rx="10" fill="url(#cg)"/>' +
      '<circle cx="32" cy="10" r="3" fill="var(--accent-3)"/>' +
      '<rect x="31" y="12" width="2" height="5" fill="var(--paper-dim)"/>' +
      '<circle cx="22" cy="30" r="4" fill="#fff"/><circle cx="22" cy="30" r="2" fill="#1b2430"/>' +
      '<circle cx="36" cy="30" r="4" fill="#fff"/><circle cx="36" cy="30" r="2" fill="#1b2430"/>' +
      '<path d="M23 39c3 3 9 3 12 0" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      '<rect x="38" y="30" width="18" height="24" rx="3" fill="var(--panel2)" stroke="var(--line)" stroke-width="1.5"/>' +
      '<rect x="44" y="27" width="6" height="5" rx="1.5" fill="var(--paper-dim)"/>' +
      '<path d="M41 38h9M41 43h12M41 48h8" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/>';
    return svg;
  }

  function renderTeaser() {
    var bullets = h("ul", { class: "coach-bullets" },
      h("li", {}, s("teaseB1")), h("li", {}, s("teaseB2")), h("li", {}, s("teaseB3")));
    var btn = h("button", {
      class: "coach-primary", type: "button",
      on: { click: function () { if (window.GymUI) GymUI.promptSignIn(); } }
    }, s("signIn"));
    mount(h("div", { class: "coach-teaser card-fx" },
      mascot(112),
      h("h2", {}, s("teaseTitle")),
      h("p", { class: "coach-tease-body" }, s("teaseBody")),
      bullets, btn));
  }

  // ---------------- form ----------------
  function numInput(name, value) {
    var spec = NUM[name];
    var a = { type: "number", inputmode: spec.int ? "numeric" : "decimal", name: name,
      value: value == null ? "" : value, min: spec.min, max: spec.max };
    if (spec.step) a.step = spec.step;
    else if (spec.int) a.step = "1";
    return h("input", a);
  }
  function selectInput(name, value) {
    var opts = ENUMS[name].map(function (v) {
      return h("option", { value: v, selected: v === value ? "selected" : false }, s(v));
    });
    return h.apply(null, ["select", { name: name }].concat(opts));
  }
  function field(labelKey, name, control, opts) {
    opts = opts || {};
    var lbl = h("span", { class: "coach-field-l" }, s(labelKey));
    if (opts.required) lbl.appendChild(h("span", { class: "req", "aria-hidden": "true" }, " *"));
    var fe = h("small", { class: "coach-fe", role: "alert", "data-fe": name || "" });
    var wrap = h("label", { class: "coach-field", "data-field": name || "" }, lbl, control, fe);
    if (opts.hint) wrap.appendChild(h("small", { class: "coach-hint" }, opts.hint));
    return wrap;
  }

  function chipsInput(name, values, onchange) {
    var arr = (values || []).slice();
    var wrap = h("div", { class: "coach-chips" });
    var input = h("input", { type: "text", placeholder: s("chipHint"), "data-chips": name });
    function redraw() {
      wrap.querySelectorAll(".coach-chip").forEach(function (c) { c.remove(); });
      arr.forEach(function (val, i) {
        var chip = h("span", { class: "coach-chip" }, val,
          h("button", { type: "button", "aria-label": "remove",
            on: { click: function () { arr.splice(i, 1); redraw(); if (onchange) onchange(arr.slice()); } } }, "×"));
        wrap.insertBefore(chip, input);
      });
      wrap._values = arr;
    }
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        var v = input.value.trim().replace(/,+$/, "");
        if (v && v.length <= 40 && arr.length < 10 && arr.indexOf(v) === -1) arr.push(v);
        input.value = "";
        redraw(); if (onchange) onchange(arr.slice());
      } else if (e.key === "Backspace" && !input.value && arr.length) {
        arr.pop(); redraw(); if (onchange) onchange(arr.slice());
      }
    });
    input.addEventListener("blur", function () {
      var v = input.value.trim().replace(/,+$/, "");
      if (v && v.length <= 40 && arr.length < 10 && arr.indexOf(v) === -1) { arr.push(v); input.value = ""; redraw(); if (onchange) onchange(arr.slice()); }
    });
    wrap.appendChild(input);
    redraw();
    return wrap;
  }

  function renderForm(preState) {
    var st = preState || loadState();
    var form = h("form", { class: "coach-form", novalidate: "novalidate" });

    function persist() { saveJSON(FORM_KEY, st); }
    function refreshValidity() {
      var v = validate(st);
      form.querySelectorAll("[data-field]").forEach(function (fEl) {
        var nm = fEl.getAttribute("data-field");
        var feEl = fEl.querySelector(".coach-fe");
        if (v.errors[nm]) { fEl.classList.add("bad"); if (feEl) feEl.textContent = msg(v.errors[nm]); }
        else { fEl.classList.remove("bad"); if (feEl) feEl.textContent = ""; }
      });
      submit.disabled = !v.ok;
      submit.classList.toggle("is-dim", !v.ok);
      topErr.hidden = v.ok;
      return v.ok;
    }
    // one delegated listener for every native control
    form.addEventListener("input", function (e) {
      var el = e.target;
      if (!el.name || !(el.name in st)) return;
      st[el.name] = el.value;
      persist(); refreshValidity();
    });
    form.addEventListener("change", function (e) {
      var el = e.target;
      if (!el.name || !(el.name in st)) return;
      st[el.name] = el.value;
      persist(); refreshValidity();
    });

    // want — segmented
    var wantWrap = h("div", { class: "seg", role: "group", "aria-label": s("want") });
    ["both", "diet", "workout"].forEach(function (w) {
      wantWrap.appendChild(h("button", {
        type: "button", "data-want": w, "aria-pressed": w === st.want ? "true" : "false",
        on: { click: function () {
          st.want = w;
          wantWrap.querySelectorAll("button").forEach(function (x) {
            x.setAttribute("aria-pressed", x.getAttribute("data-want") === w ? "true" : "false");
          });
          persist();
        } }
      }, s(w === "both" ? "wantBoth" : w === "diet" ? "wantDiet" : "wantWorkout")));
    });
    form.appendChild(h("div", { class: "coach-field" }, h("span", { class: "coach-field-l" }, s("want")), wantWrap));

    // sex control — locked to the plan when there is one
    var ps = planSex();
    var sexControl;
    if (ps) {
      st.sex = ps;
      sexControl = h("div", { class: "coach-locked" }, s(ps),
        h("input", { type: "hidden", name: "sex", value: ps }));
    } else {
      sexControl = h.apply(null, ["select", { name: "sex" },
        h("option", { value: "male", selected: st.sex === "male" ? "selected" : false }, s("male")),
        h("option", { value: "female", selected: st.sex === "female" ? "selected" : false }, s("female"))]);
    }

    // You
    form.appendChild(h("fieldset", { class: "coach-group" },
      h("legend", {}, s("grpYou")),
      h("div", { class: "coach-row" },
        field("age", "age", numInput("age", st.age), { required: true }),
        field("sex", "sex", sexControl, { required: !ps, hint: ps ? s("sexFromPlan") : "" })),
      h("div", { class: "coach-row" },
        field("heightCm", "heightCm", numInput("heightCm", st.heightCm), { required: true }),
        field("weightKg", "weightKg", numInput("weightKg", st.weightKg), { required: true }))));

    // Goal
    form.appendChild(h("fieldset", { class: "coach-group" },
      h("legend", {}, s("grpGoal")),
      field("goal", "goal", selectInput("goal", st.goal), { required: true }),
      field("activityLevel", "activityLevel", selectInput("activityLevel", st.activityLevel), { required: true })));

    // Training
    form.appendChild(h("fieldset", { class: "coach-group" },
      h("legend", {}, s("grpTraining")),
      h("div", { class: "coach-row" },
        field("trainingDaysPerWeek", "trainingDaysPerWeek", numInput("trainingDaysPerWeek", st.trainingDaysPerWeek), { required: true }),
        field("equipment", "equipment", selectInput("equipment", st.equipment), { required: true }))));

    // Diet
    var allergies = chipsInput("allergies", st.allergies, function (a) { st.allergies = a; persist(); });
    var dislikes = chipsInput("dislikes", st.dislikes, function (a) { st.dislikes = a; persist(); });
    form.appendChild(h("fieldset", { class: "coach-group" },
      h("legend", {}, s("grpDiet")),
      field("dietPreference", "dietPreference", selectInput("dietPreference", st.dietPreference), { required: true }),
      field("allergies", "allergies", allergies),
      field("dislikes", "dislikes", dislikes)));

    // InBody (collapsible, optional)
    var ibBody = h("div", { class: "coach-ib-body" },
      h("div", { class: "coach-row" },
        field("bodyFatPct", "bodyFatPct", numInput("bodyFatPct", st.bodyFatPct)),
        field("skeletalMuscleMassKg", "skeletalMuscleMassKg", numInput("skeletalMuscleMassKg", st.skeletalMuscleMassKg))),
      h("div", { class: "coach-row" },
        field("visceralFatLevel", "visceralFatLevel", numInput("visceralFatLevel", st.visceralFatLevel)),
        field("bmrKcal", "bmrKcal", numInput("bmrKcal", st.bmrKcal))));
    ibBody.hidden = !st.inbodyOpen;
    var ibToggle = h("button", {
      type: "button", class: "coach-ib-toggle", "aria-expanded": st.inbodyOpen ? "true" : "false",
      on: { click: function () {
        st.inbodyOpen = ibBody.hidden;
        ibBody.hidden = !ibBody.hidden;
        ibToggle.setAttribute("aria-expanded", st.inbodyOpen ? "true" : "false");
        persist();
      } }
    }, s("grpInBody"));
    form.appendChild(h("fieldset", { class: "coach-group" }, ibToggle, ibBody));

    // notes
    var notes = h("textarea", { name: "notes", maxlength: "300", rows: "3" });
    notes.value = st.notes || "";
    form.appendChild(h("fieldset", { class: "coach-group" },
      h("legend", {}, s("grpNotes")),
      field("notes", "notes", notes)));

    var topErr = h("p", { class: "coach-err", hidden: "hidden" }, s("vFixTop"));
    var submit = h("button", { type: "submit", class: "coach-primary" }, s("generate"));
    form.appendChild(topErr);
    form.appendChild(submit);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!refreshValidity()) {
        var firstBad = form.querySelector(".coach-field.bad");
        if (firstBad && firstBad.scrollIntoView) firstBad.scrollIntoView({ block: "center", behavior: "smooth" });
        return;
      }
      persist();
      runAssessment(buildRequest(st), false);
    });

    mount(h("div", {}, form));
    refreshValidity();          // dim submit + show hints on first paint
  }

  function buildRequest(st) {
    var n = function (x) { return x === "" || x == null ? undefined : Number(x); };
    var profile = {
      age: parseInt(st.age, 10),
      sex: st.sex,
      heightCm: n(st.heightCm),
      weightKg: n(st.weightKg),
      goal: st.goal,
      activityLevel: st.activityLevel,
      trainingDaysPerWeek: parseInt(st.trainingDaysPerWeek, 10),
      equipment: st.equipment,
      dietPreference: st.dietPreference
    };
    if (st.allergies && st.allergies.length) profile.allergies = st.allergies;
    if (st.dislikes && st.dislikes.length) profile.dislikes = st.dislikes;
    if (st.notes) profile.notes = st.notes;
    var ib = {};
    ["bodyFatPct", "skeletalMuscleMassKg", "visceralFatLevel", "bmrKcal"].forEach(function (k) {
      if (st[k] !== "" && st[k] != null) ib[k] = n(st[k]);
    });
    if (Object.keys(ib).length) profile.inbody = ib;
    return { want: st.want, lang: lang(), profile: profile };
  }

  // ---------------- run + result ----------------
  function renderLoading() {
    var rows = [];
    for (var i = 0; i < 4; i++) rows.push(h("div", { class: "skeleton", style: "height:56px;margin-bottom:10px" }));
    mount(h("div", { class: "coach-loading" },
      h("div", { class: "coach-spin", "aria-hidden": "true" }),
      h("p", {}, s("generating")),
      h("div", {}, rows)));
  }

  function runAssessment(reqBody, strong) {
    var token = authToken();
    if (!token) { if (window.GymUI) GymUI.promptSignIn(); return; }
    renderLoading();
    var url = ASSIST_BASE + "/assessment" + (strong ? "?model=strong" : "");
    fetchTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify(reqBody)
    }).then(function (res) {
      if (res.status === 401) { if (window.GymUI) GymUI.promptSignIn(); return null; }
      if (res.status === 429) { renderQuota(res.headers.get("X-RateLimit-Reset")); return null; }
      return res.json().then(function (body) { return { status: res.status, body: body }; })
        .catch(function () { return { status: res.status, body: null }; });
    }).then(function (r) {
      if (!r) return;
      if (r.status === 200 && r.body) {
        r.body._reqStrong = strong;
        saveJSON(LAST_KEY, r.body);
        renderResult(r.body);
      } else if (r.status === 422) {
        renderRefusal((r.body && r.body.error && r.body.error.message) || "");
      } else {
        if (window.console) console.warn("[coach] assessment failed", r.status, r.body);
        renderError(reqBody, strong, r.status);
      }
    }).catch(function (err) {
      if (window.console) console.warn("[coach] assessment error", err && err.message);
      renderError(reqBody, strong, 0);
    });
  }

  function statTile(labelKey, value, unit) {
    return h("div", { class: "coach-stat" },
      h("div", { class: "coach-stat-v" }, String(value), unit ? h("span", {}, " " + unit) : null),
      h("div", { class: "coach-stat-l" }, s(labelKey)));
  }

  function renderResult(r) {
    var c = r.computed || {};
    var stats = h("div", { class: "coach-stats" },
      statTile("bmi", round(c.bmi, 1), c.bmiClass ? (s(c.bmiClass) || c.bmiClass) : ""),
      statTile("bmr", Math.round(c.bmrKcal || 0), s("kcal")),
      statTile("tdee", Math.round(c.tdeeKcal || 0), s("kcal")),
      statTile("target", Math.round(c.targetKcal || 0), s("kcal") + s("perDay")),
      statTile("protein", Math.round(c.proteinG || 0), s("gram")),
      statTile("fat", Math.round(c.fatG || 0), s("gram")),
      statTile("carb", Math.round(c.carbG || 0), s("gram")));

    var sections = [
      h("div", { class: "coach-res-head" },
        mascot(48),
        h("div", {},
          h("div", { class: "coach-res-model" }, r.model || ""),
          h("h2", {}, s("resTargets")))),
      stats
    ];
    if (r.summary) sections.push(h("div", { class: "coach-block card-fx" },
      h("h3", {}, s("resSummary")), h("p", {}, r.summary)));
    if (r.dietPlan) sections.push(renderDiet(r.dietPlan));
    if (r.workoutPlan) sections.push(renderWorkout(r.workoutPlan));
    if (r.disclaimers && r.disclaimers.length) {
      sections.push(h("div", { class: "coach-disc" },
        h("h3", {}, s("disclaimers")),
        h.apply(null, ["ul", {}].concat(r.disclaimers.map(function (d) { return h("li", {}, d); })))));
    }

    var actions = h("div", { class: "coach-actions" },
      h("button", { type: "button", class: "coach-secondary", on: { click: function () { renderForm(); } } }, s("btnNew")),
      r._reqStrong ? null : h("button", {
        type: "button", class: "coach-secondary",
        on: { click: function () { runAssessment(buildRequest(loadState()), true); } }
      }, s("btnDetail")),
      (r.workoutPlan && r.workoutPlan.days && r.workoutPlan.days.length) ? h("button", {
        type: "button", class: "coach-primary",
        on: { click: function (e) {
          if (window.GymApplyCoachPlan) {
            window.GymApplyCoachPlan(mapWorkout(r.workoutPlan));
            e.target.textContent = s("applied"); e.target.disabled = true;
          }
        } }
      }, s("btnApply")) : null,
      h("button", { type: "button", class: "coach-link", on: { click: renderHistory } }, s("btnHistory")));

    sections.push(actions);
    mount(h.apply(null, ["div", { class: "coach-result" }].concat(sections)));
  }

  function renderDiet(dp) {
    var kids = [h("h3", {}, s("resDiet"))];
    if (dp.styleLabel) kids.push(h("div", { class: "coach-tag" }, dp.styleLabel));
    (dp.meals || []).forEach(function (m) {
      kids.push(h("div", { class: "coach-meal card-fx" },
        h("div", { class: "coach-meal-top" },
          h("b", {}, m.name),
          h("span", {}, Math.round(m.kcal || 0) + " " + s("kcal") + (m.proteinG ? "  ·  " + m.proteinG + s("gram") + " " + s("protein") : ""))),
        h.apply(null, ["ul", {}].concat((m.items || []).map(function (it) { return h("li", {}, it); })))));
    });
    if (dp.hydrationL) kids.push(h("p", { class: "coach-sub-line" }, s("hydration") + ": " + dp.hydrationL + " " + s("liters")));
    if (dp.swaps && dp.swaps.length) kids.push(h("div", { class: "coach-sub" },
      h("b", {}, s("swaps")),
      h.apply(null, ["ul", {}].concat(dp.swaps.map(function (x) { return h("li", {}, x); })))));
    if (dp.notes && dp.notes.length) kids.push(h.apply(null, ["ul", { class: "coach-notelist" }].concat(dp.notes.map(function (x) { return h("li", {}, x); }))));
    return h.apply(null, ["div", { class: "coach-block" }].concat(kids));
  }

  function renderWorkout(wp) {
    var kids = [h("h3", {}, s("resWorkout"))];
    var meta = [];
    if (wp.split) meta.push(s("split") + ": " + wp.split);
    if (wp.daysPerWeek) meta.push(wp.daysPerWeek + " " + s("daysWk"));
    if (meta.length) kids.push(h("div", { class: "coach-tag" }, meta.join("  ·  ")));
    (wp.days || []).forEach(function (d) {
      var ex = (d.exercises || []).map(function (e) {
        return h("div", { class: "coach-ex" },
          h("span", { class: "coach-ex-n" }, e.name),
          h("span", { class: "coach-ex-m" }, (e.sets || "") + " × " + (e.reps || "") + "  ·  " + (e.restSec || 0) + "s " + s("restS")));
      });
      kids.push(h.apply(null, ["div", { class: "coach-wday card-fx" }, h("b", {}, d.day || "")].concat(ex)));
    });
    if (wp.progression) kids.push(h("p", { class: "coach-sub-line" }, s("progression") + ": " + wp.progression));
    if (wp.cardio) kids.push(h("p", { class: "coach-sub-line" }, s("cardio") + ": " + wp.cardio));
    if (wp.notes && wp.notes.length) kids.push(h.apply(null, ["ul", { class: "coach-notelist" }].concat(wp.notes.map(function (x) { return h("li", {}, x); }))));
    return h.apply(null, ["div", { class: "coach-block" }].concat(kids));
  }

  function mapWorkout(wp) {
    return (wp.days || []).map(function (d, i) {
      return {
        id: "coach_" + i,
        label: d.day || ("Day " + (i + 1)),
        muscles: wp.split || "",
        exercises: (d.exercises || []).map(function (e, j) {
          return { id: "coach_" + i + "_" + j, en: e.name, sets: e.sets || 3, reps: e.reps || "", rest: e.restSec || 90 };
        })
      };
    });
  }

  function renderQuota(resetIso) {
    var when = resetIso;
    try { when = new Date(resetIso).toLocaleString(lang() === "ar" ? "ar-EG" : "en-US"); } catch (e) {}
    mount(h("div", { class: "coach-state card-fx" },
      h("h2", {}, s("quotaTitle")),
      h("p", {}, s("quotaBody").replace("{t}", when)),
      h("button", { type: "button", class: "coach-secondary", on: { click: function () { renderForm(); } } }, s("btnNew"))));
  }
  function renderError(reqBody, strong, status) {
    mount(h("div", { class: "coach-state card-fx" },
      h("h2", {}, s("errTitle")),
      h("p", {}, status === 502 ? s("err502") : s("errBody")),
      h("div", { class: "coach-actions" },
        reqBody ? h("button", { type: "button", class: "coach-primary", on: { click: function () { runAssessment(reqBody, strong); } } }, s("retry")) : null,
        h("button", { type: "button", class: "coach-secondary", on: { click: function () { renderForm(); } } }, s("btnNew")))));
  }
  function renderRefusal(m) {
    mount(h("div", { class: "coach-state card-fx" },
      h("h2", {}, s("refusedTitle")),
      h("p", {}, m || s("errBody")),
      h("button", { type: "button", class: "coach-secondary", on: { click: function () { renderForm(); } } }, s("back"))));
  }

  function renderHistory() {
    var token = authToken();
    if (!token) { if (window.GymUI) GymUI.promptSignIn(); return; }
    mount(h("div", { class: "coach-loading" }, h("div", { class: "coach-spin" })));
    fetchTimeout(ASSIST_BASE + "/history?limit=20", { headers: { "Authorization": "Bearer " + token } })
      .then(function (r) { return r.json(); }).then(function (doc) {
        var items = (doc && doc.items) || [];
        var list = items.length ? items.map(function (it) {
          var when = it.createdAt;
          try { when = new Date(it.createdAt).toLocaleDateString(lang() === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric" }); } catch (e) {}
          return h("div", { class: "coach-hist-row" },
            h("span", {}, when + "  ·  " + (it.want || "") + "  ·  " + (it.model || "")),
            h("button", { type: "button", class: "coach-link", on: { click: function () { openHistory(it.id); } } }, s("histOpen")));
        }) : [h("p", { class: "coach-sub-line" }, s("histEmpty"))];
        mount(h.apply(null, ["div", { class: "coach-hist" },
          h("button", { type: "button", class: "coach-secondary", on: { click: function () { refresh(); } } }, s("back"))
        ].concat(list)));
      }).catch(function () { renderError(null, false, 0); });
  }
  function openHistory(id) {
    var token = authToken();
    if (!token) return;
    mount(h("div", { class: "coach-loading" }, h("div", { class: "coach-spin" })));
    fetchTimeout(ASSIST_BASE + "/assessment/" + encodeURIComponent(id), { headers: { "Authorization": "Bearer " + token } })
      .then(function (r) { return r.json(); }).then(function (body) {
        if (body && body.computed) renderResult(body); else renderError(null, false, 0);
      }).catch(function () { renderError(null, false, 0); });
  }

  function round(v, n) { var p = Math.pow(10, n || 0); return Math.round((parseFloat(v) || 0) * p) / p; }

  // ---------------- entry ----------------
  function refresh() {
    if (!document.getElementById("coachBody")) return;
    var authed = window.GymUI && GymUI.isAuthed && GymUI.isAuthed();
    if (!authed) { renderTeaser(); return; }
    var last = loadJSON(LAST_KEY, null);
    if (last && last.computed) renderResult(last);
    else renderForm();
  }

  window.GymCoach = { refresh: refresh };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      if (document.body.getAttribute("data-tab") === "coach") refresh();
    });
  } else if (document.body.getAttribute("data-tab") === "coach") {
    refresh();
  }
})();
