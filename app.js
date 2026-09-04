// ---------------- DATA ----------------
const DAYS_MALE = [
  { id:"push", label:"Push", muscles:"Chest, Shoulders, Triceps", exercises:[
    {id:"push_bench", en:"Barbell Bench Press", sets:4, reps:"6-8", rest:150, vid:"0cXAp6WhSj4"},
    {id:"push_incline_db", en:"Incline Dumbbell Press", sets:3, reps:"8-10", rest:120, vid:"8fXfwG4ftaQ"},
    {id:"push_fly", en:"Cable Chest Fly", sets:3, reps:"12-15", rest:60, vid:"I-Ue34qLxc4"},
    {id:"push_cable_lateral", en:"Cable Lateral Raise", sets:3, reps:"15-20", rest:60, vid:"HCfU6LGpgMk"},
    {id:"push_oh_ext", en:"Overhead Cable Triceps Extension", sets:3, reps:"10-15", rest:60, vid:"tPIWaCKWFF8"},
    {id:"push_pushdown", en:"Cable Rope Pushdown", sets:3, reps:"12-15", rest:45, vid:"7OF77JMEXhM"},
  ]},
  { id:"pull", label:"Pull", muscles:"Back, Rear Delts, Biceps", exercises:[
    {id:"pull_lat", en:"Lat Pulldown / Pull-up", sets:4, reps:"8-10", rest:120, vid:"bNmvKpJSWKM"},
    {id:"pull_csrow", en:"Chest-Supported Row", sets:4, reps:"8-10", rest:90, vid:"uhwcRYpkjvc"},
    {id:"pull_cablerow", en:"Seated Cable Row", sets:3, reps:"10-12", rest:75, vid:"8QuMq1GMMng"},
    {id:"pull_reardelt", en:"Reverse Pec Deck (Rear Delt Fly)", sets:3, reps:"15-20", rest:45, vid:"v0CxZlWX9zQ"},
    {id:"pull_curl", en:"Barbell Curl", sets:3, reps:"10-12", rest:60, vid:"9_ijHhcwlkM"},
    {id:"pull_incline_curl", en:"Incline Dumbbell Curl", sets:3, reps:"10-12", rest:45, vid:"XhIsIcjIbCw"},
    {id:"pull_leg_raise", en:"Hanging Leg Raise (core)", sets:3, reps:"10-15", rest:45, vid:"0wSUjj5j1xo"},
  ]},
  { id:"legs", label:"Legs", muscles:"Quads, Hamstrings, Calves", exercises:[
    {id:"legs_squat", en:"Barbell Back Squat", sets:4, reps:"6-8", rest:150, vid:"tNUq6b5t11Q"},
    {id:"legs_press", en:"Leg Press", sets:3, reps:"10-12", rest:120, vid:"nDh_BlnLCGc"},
    {id:"legs_rdl", en:"Barbell Romanian Deadlift", sets:3, reps:"8-10", rest:90, vid:"zdip4iexlxg"},
    {id:"legs_curl", en:"Lying Leg Curl", sets:3, reps:"12-15", rest:60, vid:"bgfHeL6eR9Q"},
    {id:"legs_ext", en:"Leg Extension", sets:3, reps:"15-20", rest:60, vid:"iQ92TuvBqRo"},
    {id:"legs_calf", en:"Standing Calf Raise", sets:4, reps:"12-15", rest:45, vid:"B30JglFGx8Y"},
  ]},
  { id:"upper", label:"Upper", muscles:"Chest, Back, Delts, Arms", exercises:[
    {id:"upper_db_bench", en:"Dumbbell Bench Press", sets:3, reps:"8-10", rest:90, vid:"Gf65Yy0-wGI"},
    {id:"upper_tbar", en:"T-Bar Row", sets:3, reps:"8-10", rest:90, vid:"1iQSSqin3ro"},
    {id:"upper_shoulder", en:"Seated Dumbbell Shoulder Press", sets:3, reps:"8-12", rest:75, vid:"k6tzKisR3NY"},
    {id:"upper_pulldown", en:"Wide-grip Lat Pulldown", sets:3, reps:"10-12", rest:75, vid:"02Qci1-0Aao"},
    {id:"upper_lateral", en:"Dumbbell Lateral Raise", sets:3, reps:"15-20", rest:45, vid:"Kl3LEzQ5Zqs"},
    {id:"upper_arms", en:"Biceps + Triceps Superset", sets:3, reps:"12-15", rest:60, vid:"8UIbEovL-xU"},
    {id:"upper_pallof", en:"Pallof Press (core)", sets:3, reps:"12/side", rest:45, vid:"P1H4IzD9rbQ"},
  ]},
  { id:"lower", label:"Lower", muscles:"Quads, Glutes, Hamstrings, Abs", exercises:[
    {id:"lower_front", en:"Hack Squat", sets:4, reps:"8-10", rest:120, vid:"g9i05umL5vc"},
    {id:"lower_bss", en:"Bulgarian Split Squat", sets:3, reps:"10-12/leg", rest:75, vid:"uODWo4YqbT8"},
    {id:"lower_hipthrust", en:"Barbell Hip Thrust", sets:3, reps:"8-12", rest:90, vid:"GAZC6bt30Yg"},
    {id:"lower_curl", en:"Seated Leg Curl", sets:3, reps:"12-15", rest:60, vid:"xdbEG3xGLI8"},
    {id:"lower_calf", en:"Seated Calf Raise", sets:3, reps:"15-20", rest:45, vid:"NrHJPauB01I"},
    {id:"lower_crunch", en:"Weighted Cable Crunch (core)", sets:3, reps:"12-15", rest:45, vid:"Bvhz7Rfnrr4"},
  ]},
];

const DAYS_FEMALE = [
  { id:"f_lowerA", label:"Lower A", muscles:"Glutes & Quads", exercises:[
    {id:"fla_goblet", en:"Goblet Squat", sets:3, reps:"12-15", rest:60, vid:"0OWbS1WiUGU"},
    {id:"fla_rdl", en:"Dumbbell Romanian Deadlift", sets:3, reps:"12-15", rest:60, vid:"hu3jRvTc_po"},
    {id:"fla_lunge", en:"Reverse Lunge (Dumbbell)", sets:3, reps:"10-12/leg", rest:60, vid:"YXL_f378hLM"},
    {id:"fla_bridge", en:"Dumbbell Glute Bridge", sets:3, reps:"15-20", rest:45, vid:"12m6GW59LvQ"},
    {id:"fla_calf", en:"Standing Calf Raise", sets:3, reps:"15-20", rest:30, vid:"B30JglFGx8Y"},
    {id:"fla_deadbug", en:"Dead Bug (core)", sets:3, reps:"10-12/side", rest:30, vid:"XcYtWYMz39w"},
  ]},
  { id:"f_upperA", label:"Upper A", muscles:"Push focus", exercises:[
    {id:"fua_bench", en:"Dumbbell Bench Press", sets:3, reps:"10-12", rest:60, vid:"Gf65Yy0-wGI"},
    {id:"fua_row", en:"One-Arm Dumbbell Row", sets:3, reps:"12-15/arm", rest:45, vid:"H8jf3DwlIlo"},
    {id:"fua_press", en:"Seated Dumbbell Shoulder Press", sets:3, reps:"12-15", rest:45, vid:"k6tzKisR3NY"},
    {id:"fua_pullapart", en:"Band Pull-Apart", sets:3, reps:"15-20", rest:30, vid:"qi2y-eI_kuI"},
    {id:"fua_lateral", en:"Dumbbell Lateral Raise", sets:3, reps:"15-20", rest:30, vid:"Kl3LEzQ5Zqs"},
    {id:"fua_arms", en:"Biceps Curl + Triceps Extension (superset)", sets:3, reps:"12-15", rest:45, vid:"8UIbEovL-xU"},
  ]},
  { id:"f_lowerB", label:"Lower B", muscles:"Hamstrings & Glutes", exercises:[
    {id:"flb_sumo", en:"Dumbbell Sumo Squat", sets:3, reps:"12-15", rest:60, vid:"bRCjBCtBGIo"},
    {id:"flb_sldl", en:"Single-Leg Dumbbell RDL", sets:3, reps:"10-12/leg", rest:45, vid:"kQf5g0y0mO4"},
    {id:"flb_bss", en:"Bulgarian Split Squat", sets:3, reps:"10-12/leg", rest:60, vid:"uODWo4YqbT8"},
    {id:"flb_kickback", en:"Band Glute Kickback", sets:3, reps:"15-20/leg", rest:30, vid:"aw9WClmz5jw"},
    {id:"flb_calf", en:"Seated Calf Raise (Dumbbell)", sets:3, reps:"15-20", rest:30, vid:"NrHJPauB01I"},
    {id:"flb_legraise", en:"Lying Leg Raise (core)", sets:3, reps:"12-15", rest:30, vid:"jrSWj0huh5o"},
  ]},
  { id:"f_upperB", label:"Upper B", muscles:"Pull focus & core", exercises:[
    {id:"fub_incline", en:"Incline Dumbbell Press", sets:3, reps:"12-15", rest:60, vid:"8fXfwG4ftaQ"},
    {id:"fub_row", en:"Chest-Supported Dumbbell Row", sets:3, reps:"12-15", rest:45, vid:"09wri23R4SU"},
    {id:"fub_arnold", en:"Arnold Press", sets:3, reps:"12-15", rest:45, vid:"AjB-UXErljM"},
    {id:"fub_facepull", en:"Band Face Pull", sets:3, reps:"15-20", rest:30, vid:"C45c3fR4o28"},
    {id:"fub_hammer", en:"Hammer Curl", sets:3, reps:"12-15", rest:30, vid:"K9LiwcGuqA0"},
    {id:"fub_plank", en:"Plank (core)", sets:3, reps:"30-45s", rest:30, vid:"fWW5d1ZFhk4"},
  ]},
];

// ---- Military calisthenics: 3 days, no equipment (bands + a sturdy table). Shared moves, scaled reps. ----
const DAYS_MALE_CAL = [
  { id:"mc_push", label:"Push", muscles:"Push & Core", exercises:[
    {id:"mcp_pushup", en:"Push-ups", sets:4, reps:"12-20", rest:60, vid:"wD1M-f69Yy8"},
    {id:"mcp_pike", en:"Pike Push-ups", sets:3, reps:"8-12", rest:60, vid:"shEnAXgc9y4"},
    {id:"mcp_dips", en:"Bench Dips", sets:3, reps:"12-18", rest:45, vid:"ekgvqS_4Ee4"},
    {id:"mcp_plank", en:"Plank (core)", sets:3, reps:"45-60s", rest:30, vid:"fWW5d1ZFhk4"},
    {id:"mcp_hollow", en:"Hollow Body Hold", sets:3, reps:"25-40s", rest:30, vid:"Xk-JcNj6lfY"},
    {id:"mcp_mtn", en:"Mountain Climbers", sets:4, reps:"40s", rest:30, vid:"fpmWW6iXfes"},
  ]},
  { id:"mc_legs", label:"Legs", muscles:"Legs & Cardio", exercises:[
    {id:"mcl_squat", en:"Bodyweight Squats", sets:4, reps:"25-35", rest:45, vid:"3fl7uYmiMVw"},
    {id:"mcl_lunge", en:"Reverse Lunges", sets:3, reps:"12-16/leg", rest:45, vid:"ufjvjxrGyFM"},
    {id:"mcl_bridge", en:"Glute Bridge", sets:3, reps:"20-25", rest:30, vid:"12m6GW59LvQ"},
    {id:"mcl_jump", en:"Squat Jumps", sets:4, reps:"12-15", rest:45, vid:"dX9bNPQeQa8"},
    {id:"mcl_calf", en:"Standing Calf Raise", sets:3, reps:"25-30", rest:30, vid:"B30JglFGx8Y"},
    {id:"mcl_burpee", en:"Burpees", sets:5, reps:"10-15", rest:60, vid:"DNHWxCUp8MY"},
  ]},
  { id:"mc_pull", label:"Pull", muscles:"Pull & Total Body", exercises:[
    {id:"mcx_row", en:"Inverted Row (under a table)", sets:4, reps:"10-15", rest:60, vid:"VO-pt_XgFho"},
    {id:"mcx_pullapart", en:"Band Pull-Apart", sets:3, reps:"20-25", rest:30, vid:"qi2y-eI_kuI"},
    {id:"mcx_superman", en:"Superman", sets:3, reps:"15-20", rest:30, vid:"uexOGyxLr7E"},
    {id:"mcx_facepull", en:"Band Face Pull", sets:3, reps:"15-20", rest:30, vid:"C45c3fR4o28"},
    {id:"mcx_flutter", en:"Flutter Kicks", sets:4, reps:"40s", rest:30, vid:"pRZhSdw5Tqg"},
    {id:"mcx_bear", en:"Bear Crawl", sets:3, reps:"30s", rest:45, vid:"-9L3rTrYo4Q"},
  ]},
];

const DAYS_FEMALE_CAL = [
  { id:"fc_push", label:"Push", muscles:"Push & Core", exercises:[
    {id:"fcp_pushup", en:"Push-ups", sets:3, reps:"8-15", rest:60, vid:"wD1M-f69Yy8"},
    {id:"fcp_pike", en:"Pike Push-ups", sets:3, reps:"6-10", rest:60, vid:"shEnAXgc9y4"},
    {id:"fcp_dips", en:"Bench Dips", sets:3, reps:"8-12", rest:45, vid:"ekgvqS_4Ee4"},
    {id:"fcp_plank", en:"Plank (core)", sets:3, reps:"30-45s", rest:30, vid:"fWW5d1ZFhk4"},
    {id:"fcp_hollow", en:"Hollow Body Hold", sets:3, reps:"15-30s", rest:30, vid:"Xk-JcNj6lfY"},
    {id:"fcp_mtn", en:"Mountain Climbers", sets:3, reps:"30s", rest:30, vid:"fpmWW6iXfes"},
  ]},
  { id:"fc_legs", label:"Legs", muscles:"Legs & Cardio", exercises:[
    {id:"fcl_squat", en:"Bodyweight Squats", sets:3, reps:"20-30", rest:45, vid:"3fl7uYmiMVw"},
    {id:"fcl_lunge", en:"Reverse Lunges", sets:3, reps:"10-14/leg", rest:45, vid:"ufjvjxrGyFM"},
    {id:"fcl_bridge", en:"Glute Bridge", sets:3, reps:"15-20", rest:30, vid:"12m6GW59LvQ"},
    {id:"fcl_jump", en:"Squat Jumps", sets:3, reps:"8-12", rest:45, vid:"dX9bNPQeQa8"},
    {id:"fcl_calf", en:"Standing Calf Raise", sets:3, reps:"20-25", rest:30, vid:"B30JglFGx8Y"},
    {id:"fcl_burpee", en:"Burpees", sets:3, reps:"6-10", rest:60, vid:"DNHWxCUp8MY"},
  ]},
  { id:"fc_pull", label:"Pull", muscles:"Pull & Total Body", exercises:[
    {id:"fcx_row", en:"Inverted Row (under a table)", sets:3, reps:"6-12", rest:60, vid:"VO-pt_XgFho"},
    {id:"fcx_pullapart", en:"Band Pull-Apart", sets:3, reps:"15-20", rest:30, vid:"qi2y-eI_kuI"},
    {id:"fcx_superman", en:"Superman", sets:3, reps:"12-15", rest:30, vid:"uexOGyxLr7E"},
    {id:"fcx_facepull", en:"Band Face Pull", sets:3, reps:"15-20", rest:30, vid:"C45c3fR4o28"},
    {id:"fcx_flutter", en:"Flutter Kicks", sets:3, reps:"30s", rest:30, vid:"pRZhSdw5Tqg"},
    {id:"fcx_bear", en:"Bear Crawl", sets:3, reps:"20s", rest:45, vid:"-9L3rTrYo4Q"},
  ]},
];

// ---------------- i18n ----------------
const AR_EX = {
  "Barbell Bench Press":"بنش بريس بالبار","Incline Dumbbell Press":"بنش عالي بالدمبل","Cable Chest Fly":"تفتيح صدر بالكابل",
  "Cable Lateral Raise":"رفرفة جانبي بالكابل","Overhead Cable Triceps Extension":"تمديد ترايسبس خلف الرأس بالكابل","Cable Rope Pushdown":"دفع ترايسبس بالحبل",
  "Lat Pulldown / Pull-up":"سحب أمامي / عقلة","Chest-Supported Row":"تجديف بإسناد الصدر","Seated Cable Row":"تجديف بالكابل جالساً",
  "Reverse Pec Deck (Rear Delt Fly)":"تفتيح خلفي عكسي (باي دلت)","Barbell Curl":"مرجحة بايسبس بالبار","Incline Dumbbell Curl":"مرجحة بايسبس على بنش مائل",
  "Hanging Leg Raise (core)":"رفع الرجلين معلقاً (بطن)","Barbell Back Squat":"سكوات خلفي بالبار","Leg Press":"مكبس الأرجل",
  "Barbell Romanian Deadlift":"رفعة رومانية بالبار","Lying Leg Curl":"ثني الرجلين مستلقياً","Leg Extension":"تمديد الرجلين",
  "Standing Calf Raise":"رفع السمانة واقفاً","Dumbbell Bench Press":"بنش بريس بالدمبل","T-Bar Row":"تجديف تي-بار",
  "Seated Dumbbell Shoulder Press":"ضغط كتف بالدمبل جالساً","Wide-grip Lat Pulldown":"سحب أمامي قبضة واسعة","Dumbbell Lateral Raise":"رفرفة جانبي بالدمبل",
  "Biceps + Triceps Superset":"سوبرست بايسبس + ترايسبس","Pallof Press (core)":"ضغط بالوف (ثبات البطن)","Hack Squat":"هاك سكوات",
  "Bulgarian Split Squat":"سكوات بلغاري","Barbell Hip Thrust":"دفع الحوض بالبار","Seated Leg Curl":"ثني الرجلين جالساً",
  "Seated Calf Raise":"رفع السمانة جالساً","Weighted Cable Crunch (core)":"كرنش بالكابل بوزن (بطن)","Goblet Squat":"سكوات جوبلت",
  "Dumbbell Romanian Deadlift":"رفعة رومانية بالدمبل","Reverse Lunge (Dumbbell)":"طعن خلفي بالدمبل","Dumbbell Glute Bridge":"جسر الألوية بالدمبل",
  "Dead Bug (core)":"الحشرة الميتة (بطن)","One-Arm Dumbbell Row":"تجديف بذراع واحدة بالدمبل","Band Pull-Apart":"شد الحبل المطاطي",
  "Biceps Curl + Triceps Extension (superset)":"مرجحة بايسبس + تمديد ترايسبس (سوبرست)","Dumbbell Sumo Squat":"سكوات سومو بالدمبل",
  "Single-Leg Dumbbell RDL":"رفعة رومانية برجل واحدة بالدمبل","Band Glute Kickback":"رفس خلفي للألوية بالمطاط","Seated Calf Raise (Dumbbell)":"رفع السمانة جالساً بالدمبل",
  "Lying Leg Raise (core)":"رفع الرجلين مستلقياً (بطن)","Chest-Supported Dumbbell Row":"تجديف دمبل بإسناد الصدر",
  "Arnold Press":"ضغط أرنولد","Band Face Pull":"سحب للوجه بالمطاط","Hammer Curl":"مرجحة مطرقة","Plank (core)":"بلانك (بطن)",
  "Push-ups":"تمرين الضغط","Pike Push-ups":"ضغط بايك (كتف)","Bench Dips":"غطس على مقعد (ترايسبس)","Hollow Body Hold":"ثبات الجسم المجوف",
  "Mountain Climbers":"تسلق الجبل","Bodyweight Squats":"سكوات بوزن الجسم","Reverse Lunges":"طعن خلفي","Glute Bridge":"جسر الألوية",
  "Squat Jumps":"قفز سكوات","Burpees":"بيربي","Inverted Row (under a table)":"تجديف مقلوب (تحت طاولة)","Superman":"سوبرمان (أسفل الظهر)",
  "Flutter Kicks":"رفرفة الرجلين","Bear Crawl":"زحف الدب"
};
const AR_DAY = {"Push":"دفع","Pull":"سحب","Legs":"أرجل","Upper":"علوي","Lower":"سفلي","Lower A":"سفلي أ","Upper A":"علوي أ","Lower B":"سفلي ب","Upper B":"علوي ب"};
const AR_MUS = {
  "Chest, Shoulders, Triceps":"صدر، أكتاف، ترايسبس","Back, Rear Delts, Biceps":"ظهر، أكتاف خلفية، بايسبس","Quads, Hamstrings, Calves":"أمامية الفخذ، خلفية الفخذ، سمانة",
  "Chest, Back, Delts, Arms":"صدر، ظهر، أكتاف، ذراعين","Quads, Glutes, Hamstrings, Abs":"أمامية الفخذ، ألوية، خلفية الفخذ، بطن","Glutes & Quads":"ألوية وأمامية الفخذ",
  "Push focus":"تركيز الدفع","Hamstrings & Glutes":"خلفية الفخذ والألوية","Pull focus & core":"تركيز السحب والبطن",
  "Push & Core":"دفع وبطن","Legs & Cardio":"أرجل وكارديو","Pull & Total Body":"سحب وكامل الجسم"
};
const T = {
  appTitle:["Muscle Building Plan","خطة بناء العضلات"],
  chooseTitle:["Choose your plan","اختر خطتك"],
  chooseSub:["You can switch anytime from the top of the app.","يمكنك التبديل في أي وقت من أعلى التطبيق."],
  male:["Male","رجالي"], maleSub:["5-day gym plan","خطة 5 أيام في الجيم"],
  female:["Female","نسائي"], femaleSub:["4-day home plan","خطة 4 أيام في المنزل"],
  styleGym:["Gym","جيم"], styleCal:["Calisthenics","كاليسثينكس"],
  langBtn:["العربية","English"],
  installTip:['<b>Add this app to your home screen:</b> open your browser menu and choose "Add to Home Screen" so it opens like a regular app.','<b>أضِف التطبيق إلى الشاشة الرئيسية:</b> افتح قائمة المتصفح واختر "إضافة إلى الشاشة الرئيسية" ليعمل كتطبيق عادي.'],
  workoutTimer:["Workout Timer","مؤقّت التمرين"],
  notStarted:["Not started yet","لم يبدأ بعد"],
  startWorkout:["Start Workout","ابدأ التمرين"],
  endWorkout:["End Workout","أنهِ التمرين"],
  inProgress:["In progress…","جارٍ التنفيذ…"],
  lastSession:["Last {d} session: {n} min","آخر جلسة {d}: {n} دقيقة"],
  warmupTitle:["Warm-up — do this first","الإحماء — ابدأ به أولاً"],
  video:["Video","فيديو"], hideVideo:["Hide video","إخفاء الفيديو"],
  warmup1:["<b>Raise your temperature</b> — 5 min easy cardio (bike, incline walk or rower) until you break a light sweat.","<b>ارفع حرارة جسمك</b> — 5 دقائق كارديو خفيف (دراجة، مشي بميل، أو تجديف) حتى يتصبب عرق خفيف."],
  warmup2:["<b>Loosen the day's joints</b> — 5-8 slow reps each. Upper-body days: band pull-aparts, shoulder dislocates, arm circles, cat-cow. Lower-body days: leg swings front & side, hip circles, 10 bodyweight squats, walking lunges.","<b>حرّك مفاصل اليوم</b> — 5-8 تكرارات بطيئة لكل حركة. أيام الجزء العلوي: شد المطاط، تدوير الكتف والذراعين، القطة-البقرة. أيام الجزء السفلي: أرجحة الساق أماماً وجانباً، تدوير الورك، 10 سكوات بوزن الجسم، طعنات مشي."],
  warmup3:["<b>Ramp up the first lift only</b> — empty bar ×10, then ~50% ×5, ~70% ×3, ~85% ×1. Rest 60-90 s and stop each set well short of effort.","<b>تدرّج في التمرين الأول فقط</b> — بار فارغ ×10، ثم ~50% ×5، ~70% ×3، ~85% ×1. استرِح 60-90 ثانية وأوقف كل مجموعة قبل الإجهاد. (في الكاليسثينكس: مجموعة خفيفة واحدة من الحركة الأولى.)"],
  warmup4:["<b>Start working set 1.</b> Isolation moves (raises, curls, extensions) need just one light feeder set.","<b>ابدأ المجموعة الأولى الفعلية.</b> تمارين العزل (الرفرفة، المرجحة، التمديد) تحتاج مجموعة تحضيرية خفيفة واحدة فقط."],
  sets:["sets","مجموعات"], reps:["reps","تكرار"], rest:["rest","راحة"],
  save:["Save","حفظ"], saved:["✓ Saved","✓ تم الحفظ"], restBtn:["Rest","راحة"],
  lastLog:["Last: {w} kg × {r}","الأخير: {w} كجم × {r}"],
  noLog:["No log yet","لا يوجد سجل بعد"],
  wtPH:["wt","وزن"], repPH:["rep","عدد"],
  resetChecklist:["Reset today's checklist","إعادة ضبط قائمة اليوم"],
  resetConfirm:["Reset today's checklist for this workout?","إعادة ضبط قائمة اليوم لهذا التمرين؟"],
  backup:["Back up progress","نسخة احتياطية"], restore:["Restore","استعادة"],
  backupHint:["Save the backup file to iCloud Drive / Files. Restore it if you clear your browser or switch phones.","احفظ ملف النسخة الاحتياطية في iCloud Drive / الملفات. استعِده إذا مسحت المتصفح أو غيّرت الهاتف."],
  notLookRight:["That file doesn't look like a backup.","هذا الملف لا يبدو نسخة احتياطية صحيحة."],
  noProgress:["No progress found in that file.","لم يُعثر على تقدم في هذا الملف."],
  restoreConfirm:["Restore backup from {when}?\nThis replaces the progress currently on this device.","استعادة النسخة الاحتياطية من {when}؟\nسيحل هذا محل التقدم الحالي على هذا الجهاز."],
  restoreDone:["Progress restored. Reloading…","تمت استعادة التقدم. إعادة التحميل…"],
  badFile:["Couldn't read that file — is it a valid backup?","تعذّرت قراءة الملف — هل هو نسخة احتياطية صحيحة؟"],
  notesTitle:["Important Notes","ملاحظات مهمة"],
  skip:["Skip","تخطٍّ"],
  restTimer:["Rest — {name}","راحة — {name}"],
  exVideo:["Exercise video","فيديو التمرين"],
  settings:["Settings","الإعدادات"],
  planLabel:["Plan","الخطة"],
  programLabel:["Program","البرنامج"],
  langLabel:["Language","اللغة"],
  daysLabel:["Days","الأيام"]
};
const NOTES = {
  male_gym:{ en:[
    "<b>Weekly schedule:</b> Sat Legs · Sun Push · Mon Pull · Tue rest (football) · Wed Lower · Thu Upper · Fri rest. Every muscle 2×/week with 3-4 days between.",
    "<b>Progressive overload:</b> add a little weight or a rep once you hit the top of the rep range with clean form — beat last session's numbers (shown on each card).",
    "<b>Train close to failure:</b> stop compound sets 1-3 reps short; isolation moves 0-1.",
    "<b>Warm-up:</b> follow the warm-up card before your first set.",
    "<b>Core 3×/week:</b> hanging leg raise (Pull), Pallof press (Upper), cable crunch (Lower). Brace as if bracing for a punch.",
    "<b>Recover:</b> 7-9 h sleep. Football counts as leg load — keep it to Tuesday.",
    "<b>Deload</b> every 5-8 weeks: an easy week at ~⅔ the weight or half the sets.",
    "<b>Protein:</b> 1.6-2.2 g per kg body weight daily.",
    "Data is saved on this device only. Tap <b>Back up progress</b> every week or two."
  ], ar:[
    "<b>الجدول الأسبوعي:</b> السبت أرجل · الأحد دفع · الاثنين سحب · الثلاثاء راحة (كرة قدم) · الأربعاء سفلي · الخميس علوي · الجمعة راحة. كل عضلة مرتين أسبوعياً بفارق 3-4 أيام.",
    "<b>الزيادة التدريجية:</b> أضِف وزناً بسيطاً أو تكراراً عند بلوغ أعلى نطاق التكرار بأداء نظيف — تجاوز أرقام الجلسة السابقة (تظهر على كل بطاقة).",
    "<b>اقترب من الفشل:</b> أوقف تمارين المركّب قبل الفشل بـ1-3 تكرارات، وتمارين العزل بـ0-1.",
    "<b>الإحماء:</b> اتبع بطاقة الإحماء قبل مجموعتك الأولى.",
    "<b>البطن 3 مرات أسبوعياً:</b> رفع الرجلين معلقاً (سحب)، ضغط بالوف (علوي)، كرنش بالكابل (سفلي). شُدّ البطن كأنك تتلقى لكمة.",
    "<b>الاستشفاء:</b> نوم 7-9 ساعات. كرة القدم تُحسب حِملاً على الأرجل — اجعلها يوم الثلاثاء.",
    "<b>أسبوع تخفيف</b> كل 5-8 أسابيع: أسبوع سهل بثلثي الوزن أو نصف المجموعات تقريباً.",
    "<b>البروتين:</b> 1.6-2.2 جم لكل كجم من وزن الجسم يومياً.",
    "البيانات محفوظة على هذا الجهاز فقط. اضغط <b>نسخة احتياطية</b> كل أسبوع أو اثنين."
  ]},
  female_gym:{ en:[
    "<b>Weekly layout:</b> Sat Lower A · Sun Upper A · Tue Lower B · Wed Upper B. Other days: rest or a walk.",
    "<b>Goal — lean & tone:</b> the lifting keeps your muscle while a modest calorie deficit drives fat loss. Keep reps controlled.",
    "<b>Conditioning:</b> 7-9k steps a day plus 2-3 brisk/incline walks of 25-35 min. Optional 6-8 min finisher after Lower B or Upper B.",
    "<b>Progression:</b> add reps to the top of the range first, then a little weight. Keep 1-2 reps in reserve.",
    "<b>Form first:</b> single-leg moves are about control — go light until balance is steady.",
    "<b>Warm-up:</b> follow the warm-up card before your first set.",
    "<b>Nutrition:</b> follow your meal-timing plan; ~1.6-2 g protein per kg body weight daily.",
    "Data is saved on this device only. Tap <b>Back up progress</b> every week or two."
  ], ar:[
    "<b>التوزيع الأسبوعي:</b> السبت سفلي أ · الأحد علوي أ · الثلاثاء سفلي ب · الأربعاء علوي ب. باقي الأيام: راحة أو مشي.",
    "<b>الهدف — رشاقة وشدّ:</b> التمرين يحافظ على العضلات بينما عجز سعرات بسيط يحرق الدهون. حافظي على تحكّم في التكرارات.",
    "<b>الكارديو:</b> 7-9 آلاف خطوة يومياً مع 2-3 جلسات مشي سريع أو بميل 25-35 دقيقة. اختياري: خاتمة 6-8 دقائق بعد سفلي ب أو علوي ب.",
    "<b>التدرّج:</b> زيدي التكرارات لأعلى النطاق أولاً ثم وزناً بسيطاً. اتركي 1-2 تكرار احتياطياً.",
    "<b>الأداء أولاً:</b> تمارين الرجل الواحدة تتعلق بالتحكّم — ابدئي خفيفاً حتى يثبت التوازن.",
    "<b>الإحماء:</b> اتبعي بطاقة الإحماء قبل مجموعتك الأولى.",
    "<b>التغذية:</b> اتبعي خطة توقيت الوجبات؛ ~1.6-2 جم بروتين لكل كجم يومياً.",
    "البيانات محفوظة على هذا الجهاز فقط. اضغطي <b>نسخة احتياطية</b> كل أسبوع أو اثنين."
  ]},
  male_cal:{ en:[
    "<b>Weekly plan:</b> 3 days — Push · Legs · Pull. Run them on non-consecutive days (e.g. Sat / Mon / Wed).",
    "<b>Circuit style:</b> rest is short on purpose. The listed rest is the maximum, not a target — keep moving.",
    "<b>Reps:</b> take most sets close to failure but stop with 1-2 clean reps left. Add reps each week before adding difficulty.",
    "<b>Progress the hard moves:</b> when push-ups feel easy slow the lowering, then elevate the feet; for pike push-ups raise the hips higher.",
    "<b>Conditioning:</b> add a 20-30 min run, ruck or fast walk on 1-2 off days. Optional finisher: 5 rounds of 30 s burpees / 30 s rest.",
    "<b>Core is built in</b> (plank, hollow hold, flutter kicks, mountain climbers) — brace hard, don't hold your breath.",
    "<b>No pull-up bar needed:</b> inverted rows use a sturdy table edge; swap for band bent-over rows if that's easier.",
    "Data is saved on this device only. Back it up every week or two."
  ], ar:[
    "<b>الخطة الأسبوعية:</b> 3 أيام — دفع · أرجل · سحب. نفّذها في أيام غير متتالية (مثلاً السبت / الاثنين / الأربعاء).",
    "<b>أسلوب الدوائر:</b> الراحة قصيرة عن قصد. الراحة المذكورة حدّ أقصى وليست هدفاً — استمر في الحركة.",
    "<b>التكرارات:</b> اقترب من الفشل في معظم المجموعات مع ترك 1-2 تكرار نظيف. زِد التكرارات أسبوعياً قبل زيادة الصعوبة.",
    "<b>تدرّج في الحركات الصعبة:</b> عندما يسهل الضغط، أبطئ النزول ثم ارفع القدمين؛ ولضغط البايك ارفع الحوض أكثر.",
    "<b>الكارديو:</b> أضِف جري أو مشي سريع 20-30 دقيقة في يوم أو يومين راحة. اختياري: 5 جولات 30 ث بيربي / 30 ث راحة.",
    "<b>البطن مدمج</b> (بلانك، ثبات مجوف، رفرفة الرجلين، تسلق الجبل) — شُدّ البطن ولا تحبس نفسك.",
    "<b>لا حاجة لعقلة:</b> التجديف المقلوب يستخدم حافة طاولة ثابتة؛ بدّله بتجديف بالمطاط إن كان أسهل.",
    "البيانات محفوظة على هذا الجهاز فقط. اعمل نسخة احتياطية كل أسبوع أو اثنين."
  ]},
  female_cal:{ en:[
    "<b>Weekly plan:</b> 3 days — Push · Legs · Pull, on non-consecutive days (e.g. Sat / Mon / Wed).",
    "<b>Circuit style:</b> short rests on purpose — the listed rest is a maximum. Keep the pace up for the fat-loss effect.",
    "<b>Scale to your level:</b> drop to your knees or hands on a bench for push-ups until you can do 8+ clean reps; do step-back burpees with no jump.",
    "<b>Reps:</b> stop each set with 1-2 clean reps left; add reps weekly before making a move harder.",
    "<b>Conditioning:</b> 7-9k steps a day plus a 20-30 min brisk walk or light jog on 1-2 off days.",
    "<b>Core is built in</b> (plank, hollow hold, flutter kicks, mountain climbers) — brace, breathe, no yanking with the hip flexors.",
    "<b>No bar needed:</b> inverted rows use a sturdy table; a band bent-over row works too.",
    "Data is saved on this device only. Back it up every week or two."
  ], ar:[
    "<b>الخطة الأسبوعية:</b> 3 أيام — دفع · أرجل · سحب، في أيام غير متتالية (مثلاً السبت / الاثنين / الأربعاء).",
    "<b>أسلوب الدوائر:</b> الراحة قصيرة عن قصد — المذكور حدّ أقصى. حافظي على الإيقاع لتحقيق حرق الدهون.",
    "<b>عدّلي حسب مستواكِ:</b> انزلي على الركبتين أو ضعي اليدين على مقعد في الضغط حتى تؤدّي 8+ تكرارات نظيفة؛ ونفّذي البيربي بخطوة للخلف دون قفز.",
    "<b>التكرارات:</b> أنهي كل مجموعة وأنتِ تملكين 1-2 تكرار نظيف؛ زيدي التكرارات أسبوعياً قبل زيادة الصعوبة.",
    "<b>الكارديو:</b> 7-9 آلاف خطوة يومياً مع مشي سريع أو هرولة خفيفة 20-30 دقيقة في يوم أو يومين راحة.",
    "<b>البطن مدمج</b> (بلانك، ثبات مجوف، رفرفة الرجلين، تسلق الجبل) — شُدّي البطن، تنفّسي، دون شدّ بعضلات الورك.",
    "<b>لا حاجة لعقلة:</b> التجديف المقلوب يستخدم طاولة ثابتة؛ ويصلح أيضاً تجديف بالمطاط.",
    "البيانات محفوظة على هذا الجهاز فقط. اعملي نسخة احتياطية كل أسبوع أو اثنين."
  ]}
};

// ---------------- PLAN + STYLE + LANG STATE ----------------
let activePlan  = localStorage.getItem("gym_plan");                 // "male" | "female" | null (first run)
let activeStyle = localStorage.getItem("gym_style") || "gym";       // "gym" | "cal"
let activeLang  = localStorage.getItem("gym_lang")  || "en";        // "en" | "ar"

function pickDays(){
  const fem = activePlan === "female";
  if(activeStyle === "cal") return fem ? DAYS_FEMALE_CAL : DAYS_MALE_CAL;
  return fem ? DAYS_FEMALE : DAYS_MALE;
}
let DAYS = pickDays();

function t(key){ const e = T[key]; return e ? (e[activeLang === "ar" ? 1 : 0]) : key; }
function exName(ex){ return activeLang === "ar" ? (AR_EX[ex.en] || ex.en) : ex.en; }
function dayLabel(d){ return activeLang === "ar" ? (AR_DAY[d.label] || d.label) : d.label; }
function musLabel(d){ return activeLang === "ar" ? (AR_MUS[d.muscles] || d.muscles) : d.muscles; }
function notesKey(){ return (activePlan === "female" ? "female" : "male") + "_" + (activeStyle === "cal" ? "cal" : "gym"); }
function activeDayStoreKey(){ return "gym_active_day_" + (activePlan || "male") + "_" + activeStyle; }

// ---------------- STATE ----------------
const todayStr = new Date().toISOString().slice(0,10);
let activeDay = localStorage.getItem(activeDayStoreKey()) || DAYS[0].id;
if(!DAYS.some(d=>d.id===activeDay)) activeDay = DAYS[0].id;
let openVideoId = null; // which exercise currently has an inline player mounted

function loadJSON(key, fallback){
  try { return JSON.parse(localStorage.getItem(key)) || fallback; }
  catch(e){ return fallback; }
}
function saveJSON(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

let checks = loadJSON("gym_checks", {});
let weights = loadJSON("gym_weights", {});
let sessions = loadJSON("gym_sessions", {});
let activeSession = loadJSON("gym_session_active", null);

function sessionKey(dayId){ return todayStr + "_" + dayId; }

// ---------------- RENDER ----------------
const exList = document.getElementById("exList");
const dayMuscles = document.getElementById("dayMuscles");
const progressPill = document.getElementById("progressPill");
const barFill = document.getElementById("barFill");
const todayLabel = document.getElementById("todayLabel");

function renderDate(){
  const loc = activeLang === "ar" ? "ar-EG" : "en-US";
  todayLabel.textContent = new Date().toLocaleDateString(loc, { weekday:"long", day:"numeric", month:"long" });
}

function lastLog(exId){
  const arr = weights[exId];
  if(!arr || !arr.length) return null;
  return arr[arr.length-1];
}

function ytEmbedSrc(vid, autoplay){
  return `https://www.youtube-nocookie.com/embed/${vid}?rel=0&modestbranding=1&playsinline=1${autoplay ? '&autoplay=1' : ''}`;
}

function renderExercises(){
  const day = DAYS.find(d=>d.id===activeDay);
  dayMuscles.textContent = dayLabel(day) + " — " + musLabel(day);
  const key = sessionKey(day.id);
  const dayChecks = checks[key] || {};

  exList.innerHTML = "";
  day.exercises.forEach((ex, i)=>{
    const done = !!dayChecks[ex.id];
    const isOpen = openVideoId === ex.id;
    const card = document.createElement("div");
    card.className = "ex-card" + (done ? " done" : "");
    card.style.animationDelay = (i * 45) + "ms";

    const last = lastLog(ex.id);
    const lastText = last ? t("lastLog").replace("{w}", last.w).replace("{r}", last.r) : t("noLog");
    const nm = exName(ex);

    card.innerHTML = `
      <div class="ex-top">
        <div class="check ${done?'on':''}" data-id="${ex.id}">
          <svg viewBox="0 0 24 24"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>
        </div>
        <div class="ex-title">
          <div class="en">${nm}</div>
        </div>
      </div>
      <div class="ex-meta">
        <span><b>${ex.sets}</b> ${t("sets")}</span>
        <span><b>${ex.reps}</b> ${t("reps")}</span>
        <span><b>${ex.rest}s</b> ${t("rest")}</span>
      </div>
      <div class="ex-actions">
        <div class="log-box">
          <input type="number" inputmode="decimal" placeholder="${last?last.w:t('wtPH')}" data-w="${ex.id}" style="width:38px">
          <span class="unit">kg</span>
          <input type="number" inputmode="numeric" placeholder="${last?last.r:t('repPH')}" data-r="${ex.id}" style="width:32px">
        </div>
        <button class="btn-sm" data-save="${ex.id}">
          <svg viewBox="0 0 24 24"><path d="M17 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>
          ${t("save")}
        </button>
        <button class="btn-sm rest" data-rest="${ex.rest}" data-name="${nm}">
          <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 11H8v-2h3V7h2z"/></svg>
          ${t("restBtn")}
        </button>
        <button class="btn-sm video-toggle ${isOpen?'on':''}" data-video="${ex.id}">
          <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          ${isOpen ? t('hideVideo') : t('video')}
        </button>
      </div>
      <div class="video-wrap ${isOpen?'open':''}" id="vwrap-${ex.id}">
        <div class="video-frame" id="vframe-${ex.id}">
          ${isOpen ? `<iframe src="${ytEmbedSrc(ex.vid,false)}" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
          <button class="expand-btn" data-expand="${ex.id}">
            <svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7zm-2-4h2V7h3V5H5zm12 7h-3v2h5v-5h-2zM14 5v2h3v3h2V5z"/></svg>
          </button>` : ''}
        </div>
      </div>
      <div class="lastlog">${lastText}</div>
    `;
    exList.appendChild(card);
  });

  exList.querySelectorAll(".check").forEach(el=>{
    el.onclick = ()=>{
      const id = el.dataset.id;
      const key = sessionKey(activeDay);
      checks[key] = checks[key] || {};
      checks[key][id] = !checks[key][id];
      saveJSON("gym_checks", checks);
      renderExercises();
      updateProgress();
    };
  });

  exList.querySelectorAll("[data-save]").forEach(btn=>{
    btn.onclick = ()=>{
      const id = btn.dataset.save;
      const wInput = exList.querySelector(`[data-w="${id}"]`);
      const rInput = exList.querySelector(`[data-r="${id}"]`);
      const w = wInput.value || wInput.placeholder;
      const r = rInput.value || rInput.placeholder;
      if(!w || w===t("wtPH")) return;
      weights[id] = weights[id] || [];
      const todayEntryIdx = weights[id].findIndex(e=>e.date===todayStr);
      const entry = { date: todayStr, w, r };
      if(todayEntryIdx >= 0) weights[id][todayEntryIdx] = entry;
      else weights[id].push(entry);
      saveJSON("gym_weights", weights);
      btn.innerHTML = t("saved");
      setTimeout(()=>renderExercises(), 700);
    };
  });

  exList.querySelectorAll("[data-rest]").forEach(btn=>{
    btn.onclick = ()=> startRestTimer(parseInt(btn.dataset.rest), btn.dataset.name);
  });

  exList.querySelectorAll("[data-video]").forEach(btn=>{
    btn.onclick = ()=>{
      const id = btn.dataset.video;
      openVideoId = (openVideoId === id) ? null : id;
      renderExercises();
    };
  });

  exList.querySelectorAll("[data-expand]").forEach(btn=>{
    btn.onclick = (e)=>{
      e.stopPropagation();
      openVideoModal(day.exercises.find(x=>x.id===btn.dataset.expand));
    };
  });
}

function renderNotes(){
  const list = document.getElementById("notesList");
  const arr = (NOTES[notesKey()] || NOTES.male_gym)[activeLang === "ar" ? "ar" : "en"];
  list.innerHTML = arr.map(li=>`<li>${li}</li>`).join("");
}

function updateProgress(){
  const day = DAYS.find(d=>d.id===activeDay);
  const key = sessionKey(day.id);
  const dayChecks = checks[key] || {};
  const total = day.exercises.length;
  const done = day.exercises.filter(ex=>dayChecks[ex.id]).length;
  progressPill.textContent = `${done}/${total}`;
  progressPill.classList.toggle("done", done===total && total>0);
  barFill.style.width = total ? (done/total*100)+"%" : "0%";
}

function renderAll(){
  renderTitle();
  renderDate();
  renderDaysPanel();
  renderExercises();
  updateProgress();
  updateSessionUI();
  renderNotes();
}

document.getElementById("resetLink").onclick = ()=>{
  if(!confirm(t("resetConfirm"))) return;
  delete checks[sessionKey(activeDay)];
  saveJSON("gym_checks", checks);
  renderAll();
};

// ---------------- EXPANDED VIDEO MODAL (stays on page) ----------------
const videoModal = document.getElementById("videoModal");
const modalFrame = document.getElementById("modalFrame");
const modalTitle = document.getElementById("modalTitle");

function openVideoModal(ex){
  modalTitle.textContent = exName(ex);
  modalFrame.innerHTML = `<iframe src="${ytEmbedSrc(ex.vid,true)}" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
  videoModal.classList.add("show");
}
function closeVideoModal(){
  modalFrame.innerHTML = ""; // stop playback
  videoModal.classList.remove("show");
}
document.getElementById("modalClose").onclick = closeVideoModal;
videoModal.addEventListener("click", (e)=>{ if(e.target === videoModal) closeVideoModal(); });

// ---------------- REST TIMER (between sets) ----------------
let restInterval = null;
const timerBar = document.getElementById("timerBar");
const timerTime = document.getElementById("timerTime");
const timerLabel = document.getElementById("timerLabel");
const timerFill = document.getElementById("timerFill");

function startRestTimer(seconds, name){
  clearInterval(restInterval);
  let remaining = seconds;
  const total = seconds;
  timerLabel.textContent = t("restTimer").replace("{name}", name);
  timerBar.classList.add("show");
  renderRestTime(remaining, total);

  restInterval = setInterval(()=>{
    remaining -= 1;
    renderRestTime(remaining, total);
    if(remaining <= 0){
      clearInterval(restInterval);
      timerBar.classList.remove("show");
      if(navigator.vibrate) navigator.vibrate([200,100,200]);
      beep();
    }
  }, 1000);
}
function renderRestTime(remaining, total){
  const m = Math.max(0,Math.floor(remaining/60)).toString().padStart(2,"0");
  const s = Math.max(0,remaining%60).toString().padStart(2,"0");
  timerTime.textContent = `${m}:${s}`;
  timerFill.style.width = Math.max(0,(remaining/total*100))+"%";
}
document.getElementById("timerSkip").onclick = ()=>{
  clearInterval(restInterval);
  timerBar.classList.remove("show");
};
function beep(){
  try{
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    o.start();
    o.stop(ctx.currentTime + 0.35);
  }catch(e){}
}

// ---------------- SESSION TIMER (whole workout) ----------------
const sessionCard = document.getElementById("sessionCard");
const sessionTimeEl = document.getElementById("sessionTime");
const sessionHintEl = document.getElementById("sessionHint");
const sessionBtn = document.getElementById("sessionBtn");
let sessionInterval = null;

function fmtHMS(totalSec){
  const h = Math.floor(totalSec/3600).toString().padStart(2,"0");
  const m = Math.floor((totalSec%3600)/60).toString().padStart(2,"0");
  const s = Math.floor(totalSec%60).toString().padStart(2,"0");
  return `${h}:${m}:${s}`;
}

function lastSessionFor(dayId){
  const arr = sessions[dayId];
  if(!arr || !arr.length) return null;
  return arr[arr.length-1];
}

function updateSessionUI(){
  clearInterval(sessionInterval);
  const isThisDayActive = activeSession && activeSession.dayId === activeDay;

  if(isThisDayActive){
    sessionCard.classList.add("active");
    sessionBtn.textContent = t("endWorkout");
    sessionBtn.classList.add("stop");
    sessionHintEl.textContent = t("inProgress");
    tickSession();
    sessionInterval = setInterval(tickSession, 1000);
  } else {
    sessionCard.classList.remove("active");
    sessionBtn.textContent = t("startWorkout");
    sessionBtn.classList.remove("stop");
    const last = lastSessionFor(activeDay);
    const dObj = DAYS.find(d=>d.id===activeDay);
    sessionTimeEl.textContent = "00:00:00";
    sessionHintEl.textContent = last
      ? t("lastSession").replace("{d}", dayLabel(dObj)).replace("{n}", Math.round(last.durationSec/60))
      : t("notStarted");
  }
}

function tickSession(){
  if(!activeSession) return;
  const elapsed = Math.floor((Date.now() - activeSession.startTime)/1000);
  sessionTimeEl.textContent = fmtHMS(elapsed);
}

sessionBtn.onclick = ()=>{
  if(activeSession && activeSession.dayId === activeDay){
    const durationSec = Math.floor((Date.now() - activeSession.startTime)/1000);
    sessions[activeDay] = sessions[activeDay] || [];
    sessions[activeDay].push({ date: todayStr, durationSec });
    saveJSON("gym_sessions", sessions);
    activeSession = null;
    localStorage.removeItem("gym_session_active");
  } else {
    activeSession = { dayId: activeDay, startTime: Date.now() };
    saveJSON("gym_session_active", activeSession);
  }
  updateSessionUI();
};

// ---------------- INSTALL TIP ----------------
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
if(!isStandalone){
  document.getElementById("installTip").classList.add("show");
}

// ---------------- SERVICE WORKER ----------------
if("serviceWorker" in navigator){
  window.addEventListener("load", ()=>{
    navigator.serviceWorker.register("service-worker.js").catch(()=>{});
  });
}

// ---------------- PERSISTENT STORAGE + BACKUP ----------------
// Ask the browser not to auto-evict our data (iOS/Safari can clear it otherwise).
if(navigator.storage && navigator.storage.persist){
  navigator.storage.persist().catch(()=>{});
}

function gymKeys(){ return Object.keys(localStorage).filter(k=>k.indexOf("gym_") === 0); }

function collectBackup(){
  const data = {};
  gymKeys().forEach(k=>{
    const v = localStorage.getItem(k);
    if(v !== null) data[k] = v;
  });
  return { app:"muscle-building-plan", version:2, exportedAt:new Date().toISOString(), data };
}

async function doBackup(){
  const payload = JSON.stringify(collectBackup(), null, 2);
  const fname = "gym-progress-" + todayStr + ".json";
  try {
    const file = new File([payload], fname, { type:"application/json" });
    if(navigator.canShare && navigator.canShare({ files:[file] })){
      await navigator.share({ files:[file], title:"Gym progress backup" });
      return;
    }
  } catch(e){
    if(e && e.name === "AbortError") return; // user cancelled the share sheet
  }
  const url = URL.createObjectURL(new Blob([payload], { type:"application/json" }));
  const a = document.createElement("a");
  a.href = url; a.download = fname;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 4000);
}

function applyRestore(obj){
  if(!obj || typeof obj !== "object" || !obj.data || typeof obj.data !== "object"){
    alert(t("notLookRight")); return;
  }
  const keys = Object.keys(obj.data).filter(k=>k.indexOf("gym_") === 0);
  if(!keys.length){ alert(t("noProgress")); return; }
  const when = obj.exportedAt ? new Date(obj.exportedAt).toLocaleString() : "?";
  if(!confirm(t("restoreConfirm").replace("{when}", when))) return;
  keys.forEach(k=>{
    const v = obj.data[k];
    if(typeof v === "string") localStorage.setItem(k, v);
  });
  alert(t("restoreDone"));
  location.reload();
}

document.getElementById("backupBtn").onclick = doBackup;
document.getElementById("restoreBtn").onclick = ()=> document.getElementById("restoreInput").click();
document.getElementById("restoreInput").onchange = (e)=>{
  const f = e.target.files && e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try { applyRestore(JSON.parse(reader.result)); }
    catch(err){ alert(t("badFile")); }
  };
  reader.readAsText(f);
  e.target.value = "";
};

// ---------------- WARM-UP VIDEO ----------------
const warmupBtn = document.getElementById("warmupVidBtn");
if(warmupBtn){
  warmupBtn.onclick = ()=>{
    const wrap = document.getElementById("warmupWrap");
    const frame = document.getElementById("warmupFrame");
    const open = !wrap.classList.contains("open");
    wrap.classList.toggle("open", open);
    warmupBtn.classList.toggle("on", open);
    frame.innerHTML = open
      ? `<iframe src="${ytEmbedSrc('gDSRFzs6k_s', false)}" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
      : "";
    warmupBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> ${open ? t('hideVideo') : t('video')}`;
  };
}

// ---------------- BACK TO TOP ----------------
const toTopBtn = document.getElementById("toTop");
window.addEventListener("scroll", ()=>{
  toTopBtn.classList.toggle("show", window.scrollY > 260);
}, { passive:true });
toTopBtn.onclick = ()=>{
  try { window.scrollTo({ top:0, behavior:"smooth" }); }
  catch(e){ window.scrollTo(0,0); }
};

// ---------------- i18n APPLY ----------------
function applyStaticI18n(){
  document.querySelectorAll("[data-i18n]").forEach(el=>{ el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-html]").forEach(el=>{ el.innerHTML = t(el.dataset.i18nHtml); });
  document.title = t("appTitle");
  document.getElementById("langBtn").textContent = t("langBtn");
}
function applyLang(lang, persist){
  activeLang = lang;
  if(persist) localStorage.setItem("gym_lang", lang);
  document.documentElement.lang = lang === "ar" ? "ar" : "en";
  document.documentElement.dir  = lang === "ar" ? "rtl" : "ltr";
  applyStaticI18n();
  renderAll();
}

// ---------------- PLAN + STYLE ----------------
function applyState(persist){
  DAYS = pickDays();
  document.documentElement.dataset.plan = activePlan || "male";
  const tc = document.querySelector('meta[name="theme-color"]');
  if(tc) tc.setAttribute("content", activePlan === "female" ? "#17121a" : "#0d1117");
  activeDay = localStorage.getItem(activeDayStoreKey()) || DAYS[0].id;
  if(!DAYS.some(d=>d.id===activeDay)) activeDay = DAYS[0].id;
  openVideoId = null;
  document.querySelectorAll("[data-plan-btn]").forEach(b=> b.classList.toggle("on", b.dataset.planBtn === (activePlan || "male")));
  document.querySelectorAll("[data-style-btn]").forEach(b=> b.classList.toggle("on", b.dataset.styleBtn === activeStyle));
  if(persist && activePlan) localStorage.setItem("gym_plan", activePlan);
  if(persist) localStorage.setItem("gym_style", activeStyle);
  renderAll();
}

// ---------------- SLIDE-IN PANELS (settings + days) ----------------
const sidePanel = document.getElementById("sidePanel");
const daysPanel = document.getElementById("daysPanel");
const panelScrim = document.getElementById("panelScrim");
let openPanelEl = null;
function openPanel(el){
  openPanelEl = el;
  panelScrim.hidden = false;
  requestAnimationFrame(()=>{ panelScrim.classList.add("show"); el.classList.add("open"); });
  el.setAttribute("aria-hidden", "false");
}
function closePanel(){
  panelScrim.classList.remove("show");
  [sidePanel, daysPanel].forEach(p=>{ p.classList.remove("open"); p.setAttribute("aria-hidden", "true"); });
  openPanelEl = null;
  setTimeout(()=>{ panelScrim.hidden = true; }, 300);
}
document.getElementById("menuBtn").onclick = ()=> openPanel(sidePanel);
document.getElementById("daysBtn").onclick = ()=> openPanel(daysPanel);
document.querySelectorAll(".panelClose").forEach(b=> b.onclick = closePanel);
panelScrim.onclick = closePanel;

function renderDaysPanel(){
  const list = document.getElementById("daysList");
  list.innerHTML = "";
  DAYS.forEach(d=>{
    const b = document.createElement("button");
    b.textContent = dayLabel(d);
    if(d.id === activeDay) b.classList.add("active");
    b.onclick = ()=>{
      activeDay = d.id;
      localStorage.setItem(activeDayStoreKey(), activeDay);
      openVideoId = null;
      closePanel();
      window.scrollTo(0, 0);
      renderAll();
    };
    list.appendChild(b);
  });
}

function renderTitle(){
  const planWord  = t(activePlan === "female" ? "female" : "male");
  const styleWord = t(activeStyle === "cal" ? "styleCal" : "styleGym");
  const full = t("appTitle") + " · " + planWord + " · " + styleWord;
  document.getElementById("appTitleEl").textContent = full;
  document.title = t("appTitle") + " · " + planWord + " · " + styleWord;
}

document.querySelectorAll("[data-choose]").forEach(b=>{
  b.onclick = ()=>{
    activePlan = b.dataset.choose;
    applyState(true);
    document.getElementById("planChooser").hidden = true;
    document.body.style.overflow = "";
    window.scrollTo(0, 0);           // start at the top of the app, not mid-page
  };
});
document.querySelectorAll("[data-plan-btn]").forEach(b=>{
  b.onclick = ()=>{ activePlan = b.dataset.planBtn; applyState(true); closePanel(); window.scrollTo(0, 0); };
});
document.querySelectorAll("[data-style-btn]").forEach(b=>{
  b.onclick = ()=>{ activeStyle = b.dataset.styleBtn; applyState(true); closePanel(); window.scrollTo(0, 0); };
});
document.getElementById("langBtn").onclick = ()=> applyLang(activeLang === "ar" ? "en" : "ar", true);

// ---------------- INIT ----------------
document.documentElement.lang = activeLang === "ar" ? "ar" : "en";
document.documentElement.dir  = activeLang === "ar" ? "rtl" : "ltr";
applyStaticI18n();
if(activePlan){
  applyState(false);
} else {
  document.getElementById("planChooser").hidden = false;
  document.body.style.overflow = "hidden"; // lock scroll behind the chooser
  applyState(false); // render behind the chooser (defaults to male / gym)
}
