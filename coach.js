/* coach.js — the AI Coach screen (Track D).
 *
 * Renders into #coachBody. Anonymous/signed-out users see a teaser; signed-in
 * users get a profile form that POSTs to the gym-assistant service and a
 * rendered diet + workout plan. Loads after app.js (uses the global t()/
 * activeLang only as a fallback) and after ui.js. No external deps.
 *
 * Local keys (NOT synced — deliberately not gym_-prefixed):
 *   gymcoach_form  last-used form values
 *   gymcoach_last  last successful result (pinned so the screen reopens to it)
 */
(function () {
  "use strict";

  var ASSIST_BASE = (window.GYM_API_BASE || "/api/v1").replace(/\/+$/, "") + "/assistant";
  var CALL_TIMEOUT_MS = 35000;
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
    age: ["Age", "العمر"], sex: ["Sex", "الجنس"],
    male: ["Male", "ذكر"], female: ["Female", "أنثى"],
    heightCm: ["Height (cm)", "الطول (سم)"], weightKg: ["Weight (kg)", "الوزن (كجم)"],
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
    notes: ["Anything else? (injuries, schedule…)", "أي شيء آخر؟ (إصابات، جدول…)"],
    generate: ["Generate my plan", "أنشئ خطتي"],
    generating: ["Building your plan… this takes ~15s", "جارٍ بناء خطتك… تستغرق ~15 ثانية"],
    fix: ["Please check the highlighted fields.", "يرجى مراجعة الحقول المميّزة."],
    ageMin: ["The coach is for ages 16 and up.", "المدرّب متاح لمن أعمارهم 16 عاماً فأكثر."],
    // result
    resSummary: ["Summary", "الملخّص"],
    resTargets: ["Your numbers", "أرقامك"],
    bmi: ["BMI", "مؤشر الكتلة"], bmr: ["BMR", "الأيض الأساسي"], tdee: ["TDEE", "الحرق اليومي"],
    target: ["Target", "الهدف"], protein: ["Protein", "بروتين"], fat: ["Fat", "دهون"], carb: ["Carbs", "كارب"],
    kcal: ["kcal", "سعرة"], gram: ["g", "جم"], perDay: ["/day", "/يوم"],
    resDiet: ["Diet plan", "خطة التغذية"], resWorkout: ["Workout plan", "خطة التمرين"],
    meals: ["Meals", "الوجبات"], swaps: ["Easy swaps", "بدائل سهلة"], hydration: ["Water", "الماء"],
    liters: ["L", "لتر"], split: ["Split", "التقسيم"], progression: ["Progression", "التدرّج"],
    cardio: ["Cardio", "كارديو"], setsReps: ["sets × reps", "مجموعات × تكرار"], restS: ["rest", "راحة"],
    disclaimers: ["Good to know", "معلومة مهمة"],
    btnNew: ["New assessment", "تقييم جديد"],
    btnDetail: ["More detail", "تفاصيل أكثر"],
    btnApply: ["Use workout as my plan", "استخدم التمرين كخطتي"],
    btnHistory: ["History", "السجل"],
    applied: ["Added to your plans →", "أُضيفت إلى خططك ←"],
    quotaTitle: ["Daily limit reached", "بلغت الحد اليومي"],
    quotaBody: ["You've used today's assessments. Try again after {t}.", "لقد استخدمت تقييمات اليوم. حاول مجدداً بعد {t}."],
    errTitle: ["Couldn't reach the coach", "تعذّر الوصول إلى المدرّب"],
    errBody: ["Something went wrong generating the plan.", "حدث خطأ أثناء إنشاء الخطة."],
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
  }

  // ---------------- state ----------------
  var ENUMS = {
    sex: ["male", "female"],
    goal: ["lose_fat", "gain_muscle", "maintain", "recomp"],
    activityLevel: ["sedentary", "light", "moderate", "active", "athlete"],
    equipment: ["full_gym", "home_minimal", "bodyweight"],
    dietPreference: ["balanced", "high_protein", "keto", "mediterranean", "vegetarian", "vegan", "halal", "low_carb"]
  };
  var RANGE = {
    age: [10, 100], heightCm: [120, 230], weightKg: [35, 250], trainingDaysPerWeek: [1, 6],
    bodyFatPct: [3, 60], skeletalMuscleMassKg: [10, 80], visceralFatLevel: [1, 30], bmrKcal: [500, 5000]
  };

  function loadJSON(k, fb) { try { return JSON.parse(localStorage.getItem(k)) || fb; } catch (e) { return fb; } }
  function saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  function defaultForm() {
    var plan = null;
    try { plan = localStorage.getItem("gym_plan"); } catch (e) {}
    return {
      want: "both",
      age: "", sex: plan === "female" ? "female" : "male",
      heightCm: "", weightKg: "",
      goal: "lose_fat", activityLevel: "moderate",
      trainingDaysPerWeek: "4", equipment: "full_gym",
      dietPreference: "balanced", allergies: [], dislikes: [],
      inbodyOpen: false, bodyFatPct: "", skeletalMuscleMassKg: "", visceralFatLevel: "", bmrKcal: "",
      notes: ""
    };
  }

  // ---------------- network ----------------
  function fetchTimeout(url, opts) {
    opts = opts || {};
    var c = new AbortController();
    var timer = setTimeout(function () { c.abort(); }, CALL_TIMEOUT_MS);
    opts.signal = c.signal;
    return fetch(url, opts).finally(function () { clearTimeout(timer); });
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
  function field(labelKey, control) {
    return h("label", { class: "coach-field" }, h("span", {}, s(labelKey)), control);
  }
  function numInput(name, value, extra) {
    var a = { type: "number", inputmode: "decimal", name: name, value: value == null ? "" : value };
    if (extra) Object.keys(extra).forEach(function (k) { a[k] = extra[k]; });
    return h("input", a);
  }
  function selectInput(name, value) {
    var opts = ENUMS[name].map(function (v) {
      return h("option", { value: v, selected: v === value ? "selected" : false }, s(v));
    });
    return h.apply(null, ["select", { name: name }].concat(opts));
  }
  function chipsInput(name, values) {
    var arr = (values || []).slice();
    var wrap = h("div", { class: "coach-chips" });
    var input = h("input", { type: "text", placeholder: s("chipHint"), "data-chips": name });
    function redraw() {
      wrap.querySelectorAll(".coach-chip").forEach(function (c) { c.remove(); });
      arr.forEach(function (val, i) {
        var chip = h("span", { class: "coach-chip" }, val,
          h("button", {
            type: "button", "aria-label": "remove",
            on: { click: function () { arr.splice(i, 1); redraw(); } }
          }, "×"));
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
        redraw();
      } else if (e.key === "Backspace" && !input.value && arr.length) {
        arr.pop(); redraw();
      }
    });
    wrap.appendChild(input);
    redraw();
    return wrap;
  }

  function renderForm(prefill) {
    var f = prefill || Object.assign(defaultForm(), loadJSON(FORM_KEY, {}));
    if (!ENUMS.sex.includes(f.sex)) f.sex = "male";

    var form = h("form", { class: "coach-form", novalidate: "novalidate" });

    // want — segmented
    var wantWrap = h("div", { class: "seg", role: "group" });
    ["both", "diet", "workout"].forEach(function (w) {
      var b = h("button", {
        type: "button", "data-want": w,
        "aria-pressed": w === f.want ? "true" : "false",
        on: { click: function () {
          f.want = w;
          wantWrap.querySelectorAll("button").forEach(function (x) {
            x.setAttribute("aria-pressed", x.getAttribute("data-want") === w ? "true" : "false");
          });
        } }
      }, s(w === "both" ? "wantBoth" : w === "diet" ? "wantDiet" : "wantWorkout"));
      wantWrap.appendChild(b);
    });
    form.appendChild(h("div", { class: "coach-field" }, h("span", {}, s("want")), wantWrap));

    // You
    form.appendChild(h("fieldset", { class: "coach-group" },
      h("legend", {}, s("grpYou")),
      h("div", { class: "coach-row" },
        field("age", numInput("age", f.age, { min: 10, max: 100, step: 1 })),
        field("sex", selectInput("sex", f.sex))),
      h("div", { class: "coach-row" },
        field("heightCm", numInput("heightCm", f.heightCm, { min: 120, max: 230 })),
        field("weightKg", numInput("weightKg", f.weightKg, { min: 35, max: 250, step: "0.1" })))));

    // Goal
    form.appendChild(h("fieldset", { class: "coach-group" },
      h("legend", {}, s("grpGoal")),
      field("goal", selectInput("goal", f.goal)),
      field("activityLevel", selectInput("activityLevel", f.activityLevel))));

    // Training
    form.appendChild(h("fieldset", { class: "coach-group" },
      h("legend", {}, s("grpTraining")),
      h("div", { class: "coach-row" },
        field("trainingDaysPerWeek", numInput("trainingDaysPerWeek", f.trainingDaysPerWeek, { min: 1, max: 6, step: 1 })),
        field("equipment", selectInput("equipment", f.equipment)))));

    // Diet
    var allergies = chipsInput("allergies", f.allergies);
    var dislikes = chipsInput("dislikes", f.dislikes);
    form.appendChild(h("fieldset", { class: "coach-group" },
      h("legend", {}, s("grpDiet")),
      field("dietPreference", selectInput("dietPreference", f.dietPreference)),
      field("allergies", allergies),
      field("dislikes", dislikes)));

    // InBody (collapsible)
    var ibBody = h("div", { class: "coach-ib-body" },
      h("div", { class: "coach-row" },
        field("bodyFatPct", numInput("bodyFatPct", f.bodyFatPct, { min: 3, max: 60, step: "0.1" })),
        field("skeletalMuscleMassKg", numInput("skeletalMuscleMassKg", f.skeletalMuscleMassKg, { step: "0.1" }))),
      h("div", { class: "coach-row" },
        field("visceralFatLevel", numInput("visceralFatLevel", f.visceralFatLevel, { step: 1 })),
        field("bmrKcal", numInput("bmrKcal", f.bmrKcal, { min: 500, max: 5000, step: 1 }))));
    ibBody.hidden = !f.inbodyOpen;
    var ibToggle = h("button", {
      type: "button", class: "coach-ib-toggle", "aria-expanded": f.inbodyOpen ? "true" : "false",
      on: { click: function () {
        ibBody.hidden = !ibBody.hidden;
        ibToggle.setAttribute("aria-expanded", ibBody.hidden ? "false" : "true");
      } }
    }, s("grpInBody"));
    form.appendChild(h("fieldset", { class: "coach-group" }, ibToggle, ibBody));

    // notes
    var notes = h("textarea", { name: "notes", maxlength: "300", rows: "3" });
    notes.value = f.notes || "";
    form.appendChild(h("fieldset", { class: "coach-group" }, h("legend", {}, s("notes")), notes));

    var err = h("p", { class: "coach-err", hidden: "hidden" });
    var submit = h("button", { type: "submit", class: "coach-primary" }, s("generate"));
    form.appendChild(err);
    form.appendChild(submit);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      form.querySelectorAll(".bad").forEach(function (x) { x.classList.remove("bad"); });
      err.hidden = true;

      var data = readForm(form, { allergies: allergies, dislikes: dislikes });
      var problems = validate(data, form);
      if (problems.length) {
        err.textContent = problems[0] === "ageMin" ? s("ageMin") : s("fix");
        err.hidden = false;
        return;
      }
      saveJSON(FORM_KEY, formToStore(data, !ibBody.hidden));
      runAssessment(buildRequest(data), false);
    });

    mount(h("div", {}, form));
  }

  function readForm(form, chips) {
    function g(n) { var el = form.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ""; }
    var wantBtn = form.querySelector('[data-want][aria-pressed="true"]');
    var d = {
      want: wantBtn ? wantBtn.getAttribute("data-want") : "both",
      age: g("age"), sex: g("sex"), heightCm: g("heightCm"), weightKg: g("weightKg"),
      goal: g("goal"), activityLevel: g("activityLevel"),
      trainingDaysPerWeek: g("trainingDaysPerWeek"), equipment: g("equipment"),
      dietPreference: g("dietPreference"),
      allergies: (chips.allergies._values || []).slice(),
      dislikes: (chips.dislikes._values || []).slice(),
      bodyFatPct: g("bodyFatPct"), skeletalMuscleMassKg: g("skeletalMuscleMassKg"),
      visceralFatLevel: g("visceralFatLevel"), bmrKcal: g("bmrKcal"),
      notes: g("notes")
    };
    return d;
  }
  function formToStore(d, inbodyOpen) {
    var c = Object.assign({}, d); c.inbodyOpen = !!inbodyOpen; return c;
  }

  function markBad(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    if (el) (el.closest(".coach-field") || el).classList.add("bad");
  }
  function validate(d, form) {
    var bad = [];
    function reqRange(name) {
      var v = parseFloat(d[name]);
      var r = RANGE[name];
      if (isNaN(v) || v < r[0] || v > r[1]) { markBad(form, name); bad.push(name); }
      return v;
    }
    var age = reqRange("age");
    reqRange("heightCm"); reqRange("weightKg"); reqRange("trainingDaysPerWeek");
    if (!ENUMS.sex.includes(d.sex)) { markBad(form, "sex"); bad.push("sex"); }
    if (!ENUMS.goal.includes(d.goal)) { markBad(form, "goal"); bad.push("goal"); }
    if (!ENUMS.activityLevel.includes(d.activityLevel)) { markBad(form, "activityLevel"); bad.push("activityLevel"); }
    if (!ENUMS.equipment.includes(d.equipment)) { markBad(form, "equipment"); bad.push("equipment"); }
    if (!ENUMS.dietPreference.includes(d.dietPreference)) { markBad(form, "dietPreference"); bad.push("dietPreference"); }
    ["bodyFatPct", "skeletalMuscleMassKg", "visceralFatLevel", "bmrKcal"].forEach(function (n) {
      if (d[n] === "") return;
      var v = parseFloat(d[n]); var r = RANGE[n];
      if (isNaN(v) || v < r[0] || v > r[1]) { markBad(form, n); bad.push(n); }
    });
    if ((d.notes || "").length > 300) { markBad(form, "notes"); bad.push("notes"); }
    if (!bad.length && !isNaN(age) && age < 16) return ["ageMin"];
    return bad;
  }

  function buildRequest(d) {
    var num = function (x) { return x === "" || x == null ? undefined : parseFloat(x); };
    var profile = {
      age: parseInt(d.age, 10),
      sex: d.sex,
      heightCm: num(d.heightCm),
      weightKg: num(d.weightKg),
      goal: d.goal,
      activityLevel: d.activityLevel,
      trainingDaysPerWeek: parseInt(d.trainingDaysPerWeek, 10),
      equipment: d.equipment,
      dietPreference: d.dietPreference
    };
    if (d.allergies && d.allergies.length) profile.allergies = d.allergies;
    if (d.dislikes && d.dislikes.length) profile.dislikes = d.dislikes;
    if (d.notes) profile.notes = d.notes;
    var ib = {};
    if (d.bodyFatPct !== "") ib.bodyFatPct = num(d.bodyFatPct);
    if (d.skeletalMuscleMassKg !== "") ib.skeletalMuscleMassKg = num(d.skeletalMuscleMassKg);
    if (d.visceralFatLevel !== "") ib.visceralFatLevel = num(d.visceralFatLevel);
    if (d.bmrKcal !== "") ib.bmrKcal = num(d.bmrKcal);
    if (Object.keys(ib).length) profile.inbody = ib;
    return { want: d.want, lang: lang(), profile: profile };
  }

  // ---------------- run + result ----------------
  function renderLoading() {
    var rows = [];
    for (var i = 0; i < 5; i++) rows.push(h("div", { class: "skeleton", style: "height:56px;margin-bottom:10px" }));
    mount(h("div", { class: "coach-loading" },
      h("div", { class: "coach-spin", "aria-hidden": "true" }),
      h("p", {}, s("generating")),
      h("div", {}, rows)));
  }

  function runAssessment(reqBody, strong) {
    var token = window.GymSync && GymSync.token ? GymSync.token() : null;
    if (!token) { if (window.GymUI) GymUI.promptSignIn(); return; }
    renderLoading();
    var url = ASSIST_BASE + "/assessment" + (strong ? "?model=strong" : "");
    fetchTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify(reqBody)
    }).then(function (res) {
      if (res.status === 401) { if (window.GymUI) GymUI.promptSignIn(); return null; }
      if (res.status === 429) {
        var reset = res.headers.get("X-RateLimit-Reset");
        renderQuota(reset); return null;
      }
      return res.json().then(function (body) { return { status: res.status, body: body }; });
    }).then(function (r) {
      if (!r) return;
      if (r.status === 200) {
        r.body._reqStrong = strong;
        saveJSON(LAST_KEY, r.body);
        renderResult(r.body);
      } else if (r.status === 422) {
        renderRefusal((r.body && r.body.error && r.body.error.message) || "");
      } else {
        renderError(reqBody, strong);
      }
    }).catch(function () { renderError(reqBody, strong); });
  }

  function statTile(labelKey, value, unit) {
    return h("div", { class: "coach-stat" },
      h("div", { class: "coach-stat-v" }, String(value), unit ? h("span", {}, " " + unit) : null),
      h("div", { class: "coach-stat-l" }, s(labelKey)));
  }

  function renderResult(r) {
    var c = r.computed || {};
    var stats = h("div", { class: "coach-stats" },
      statTile("bmi", round(c.bmi, 1) + (c.bmiClass ? "" : ""), c.bmiClass ? s(c.bmiClass) || c.bmiClass : ""),
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
        on: { click: function () { runAssessment(buildRequest(Object.assign(defaultForm(), loadJSON(FORM_KEY, {}))), true); } }
      }, s("btnDetail")),
      r.workoutPlan && r.workoutPlan.days && r.workoutPlan.days.length ? h("button", {
        type: "button", class: "coach-primary",
        on: { click: function (e) {
          if (window.GymApplyCoachPlan) {
            window.GymApplyCoachPlan(mapWorkout(r.workoutPlan));
            e.target.textContent = s("applied");
            e.target.disabled = true;
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
    if (wp.daysPerWeek) meta.push(wp.daysPerWeek + " " + s("trainingDaysPerWeek").toLowerCase());
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
          return {
            id: "coach_" + i + "_" + j,
            en: e.name,
            sets: e.sets || 3,
            reps: e.reps || "",
            rest: e.restSec || 90
          };
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
  function renderError(reqBody, strong) {
    mount(h("div", { class: "coach-state card-fx" },
      h("h2", {}, s("errTitle")),
      h("p", {}, s("errBody")),
      h("div", { class: "coach-actions" },
        h("button", { type: "button", class: "coach-primary", on: { click: function () { runAssessment(reqBody, strong); } } }, s("retry")),
        h("button", { type: "button", class: "coach-secondary", on: { click: function () { renderForm(); } } }, s("btnNew")))));
  }
  function renderRefusal(msg) {
    mount(h("div", { class: "coach-state card-fx" },
      h("h2", {}, s("refusedTitle")),
      h("p", {}, msg || s("errBody")),
      h("button", { type: "button", class: "coach-secondary", on: { click: function () { renderForm(); } } }, s("back"))));
  }

  function renderHistory() {
    var token = window.GymSync && GymSync.token ? GymSync.token() : null;
    if (!token) { if (window.GymUI) GymUI.promptSignIn(); return; }
    mount(h("div", { class: "coach-loading" }, h("div", { class: "coach-spin" })));
    fetchTimeout(ASSIST_BASE + "/history?limit=20", {
      headers: { "Authorization": "Bearer " + token }
    }).then(function (r) { return r.json(); }).then(function (doc) {
      var items = (doc && doc.items) || [];
      var list = items.length ? items.map(function (it) {
        var when = it.createdAt;
        try { when = new Date(it.createdAt).toLocaleDateString(lang() === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric" }); } catch (e) {}
        return h("div", { class: "coach-hist-row" },
          h("span", {}, when + "  ·  " + (it.want || "") + "  ·  " + (it.model || "")),
          h("button", {
            type: "button", class: "coach-link",
            on: { click: function () { openHistory(it.id); } }
          }, s("histOpen")));
      }) : [h("p", { class: "coach-sub-line" }, s("histEmpty"))];
      mount(h.apply(null, ["div", { class: "coach-hist" },
        h("button", { type: "button", class: "coach-secondary", on: { click: function () { refresh(); } } }, s("back"))
      ].concat(list)));
    }).catch(function () { renderError(null, false); });
  }
  function openHistory(id) {
    var token = window.GymSync && GymSync.token ? GymSync.token() : null;
    if (!token) return;
    mount(h("div", { class: "coach-loading" }, h("div", { class: "coach-spin" })));
    fetchTimeout(ASSIST_BASE + "/assessment/" + encodeURIComponent(id), {
      headers: { "Authorization": "Bearer " + token }
    }).then(function (r) { return r.json(); }).then(function (body) {
      if (body && body.computed) renderResult(body);
      else renderError(null, false);
    }).catch(function () { renderError(null, false); });
  }

  function round(v, n) {
    var p = Math.pow(10, n || 0);
    return Math.round((parseFloat(v) || 0) * p) / p;
  }

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
