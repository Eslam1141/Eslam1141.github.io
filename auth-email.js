/* auth-email.js — email/password/OTP sign-in for the onboarding screen.
 *
 * Talks to gym-be's pre-auth endpoints (POST {API}/auth/signup, verify-otp,
 * login, request-reset, reset-password) and, on success, hands the returned
 * gym-be JWT to sync.js (GymSync.signInWithToken) — sync.js stays the single
 * owner of the session, so everything built on GymSync.token()/isSignedIn()
 * works the same as after Google sign-in.
 *
 * Renders into #obStepEmail (a step inside #onboarding's .ob-step-stack);
 * ui.js's showObStep("email") shows it. Strings are registered into app.js's
 * global T table and translated here via data-ae-i18n (re-applied whenever
 * <html lang> changes). Nothing here is ever written under a gym_ key, so none
 * of it syncs. The password is only ever held in memory. */
(function () {
  "use strict";

  var API_BASE = (window.GYM_API_BASE || "/api/v1").replace(/\/+$/, "");
  var FETCH_TIMEOUT_MS = 15000;
  var COOLDOWN_MS = 5 * 60 * 1000;          // gym-be: 1 email per address per 5 min
  var OTP_KEY = "gymauth_otp";              // sessionStorage: {email} of a sign-up awaiting its code
  var COOLDOWN_KEY = "gymauth_cooldown";    // sessionStorage: {email, until}

  var STR = {
    aeContinueEmail: ["Continue with email", "المتابعة بالبريد الإلكتروني"],
    aeLoginTitle: ["Log in with email", "تسجيل الدخول بالبريد الإلكتروني"],
    aeSignupTitle: ["Create your account", "أنشئ حسابك"],
    aeOtpTitle: ["Check your email", "تحقّق من بريدك الإلكتروني"],
    aeForgotTitle: ["Reset your password", "إعادة تعيين كلمة المرور"],
    aeResetTitle: ["Set a new password", "تعيين كلمة مرور جديدة"],
    aeEmail: ["Email", "البريد الإلكتروني"],
    aePassword: ["Password", "كلمة المرور"],
    aeNewPassword: ["New password", "كلمة المرور الجديدة"],
    aeConfirmPassword: ["Confirm new password", "تأكيد كلمة المرور الجديدة"],
    aePhone: ["Phone number", "رقم الهاتف"],
    aePwHint: ["At least 8 characters, with a letter and a number.", "8 أحرف على الأقل، تتضمن حرفًا ورقمًا."],
    aePhoneHint: ["Include your country code, e.g. ‎+201001234567.", "أدخل رمز الدولة، مثل ‎+201001234567."],
    aeLoginBtn: ["Log in", "تسجيل الدخول"],
    aeSignupBtn: ["Create account", "إنشاء الحساب"],
    aeVerifyBtn: ["Verify", "تحقّق"],
    aeSendLink: ["Send reset link", "إرسال رابط إعادة التعيين"],
    aeResetBtn: ["Save new password", "حفظ كلمة المرور الجديدة"],
    aeForgotLink: ["Forgot password?", "نسيت كلمة المرور؟"],
    aeToSignup: ["New here? Create an account", "جديد هنا؟ أنشئ حسابًا"],
    aeToLogin: ["Already have an account? Log in", "لديك حساب بالفعل؟ سجّل الدخول"],
    aeBackToLogin: ["Back to log in", "العودة لتسجيل الدخول"],
    aeBack: ["Other sign-in options", "خيارات تسجيل دخول أخرى"],
    aeOtpSent: ["We sent a 6-digit code to", "أرسلنا رمزًا من 6 أرقام إلى"],
    aeOtpCode: ["Verification code", "رمز التحقق"],
    aeOtpExpiry: ["The code expires in 10 minutes.", "تنتهي صلاحية الرمز خلال 10 دقائق."],
    aeOtpPwNeeded: ["Enter the password you chose at sign-up.", "أدخل كلمة المرور التي اخترتها عند التسجيل."],
    aeResend: ["Resend code", "إعادة إرسال الرمز"],
    aeResendIn: ["Resend available in", "إعادة الإرسال متاحة بعد"],
    aeResendNeedsSignup: ["To get a new code, fill in the sign-up form again.", "للحصول على رمز جديد، املأ نموذج التسجيل مرة أخرى."],
    aeChangeEmail: ["Use a different email", "استخدم بريدًا آخر"],
    aeCodeResent: ["A new code is on its way.", "رمز جديد في الطريق إليك."],
    aeForgotSub: ["Enter your account email and we'll send you a link to set a new password.", "أدخل بريد حسابك وسنرسل لك رابطًا لتعيين كلمة مرور جديدة."],
    aeForgotSent: ["If an account exists for that email, a reset link is on its way. Check your inbox (and spam).", "إذا كان هناك حساب بهذا البريد، فسيصلك رابط إعادة التعيين. تحقّق من بريدك (والرسائل غير المرغوب فيها)."],
    aeResetDone: ["Password updated. Log in with your new password.", "تم تحديث كلمة المرور. سجّل الدخول بكلمة المرور الجديدة."],
    aeExpired: ["Your session has expired. Please log in again.", "انتهت صلاحية جلستك. يُرجى تسجيل الدخول مجددًا."],
    aeWorking: ["Please wait…", "يُرجى الانتظار…"],
    aeErrNetwork: ["Couldn't reach the server. Check your connection and try again.", "تعذّر الاتصال بالخادم. تحقّق من اتصالك وحاول مجددًا."],
    aeErrRateLimit: ["Too many attempts. Please wait 5 minutes and try again.", "محاولات كثيرة جدًا. يُرجى الانتظار 5 دقائق ثم المحاولة مجددًا."],
    aeErrPhoneTaken: ["This phone number is already registered to another account.", "رقم الهاتف هذا مسجّل بالفعل لحساب آخر."],
    aeErrPhoneConflict: ["This account already has a different phone number on file. Use that number.", "هذا الحساب مسجّل برقم هاتف مختلف. استخدم ذلك الرقم."],
    aeErrUnavailable: ["Email sign-in isn't available yet. Please use Google or continue without signing in.", "تسجيل الدخول بالبريد الإلكتروني غير متاح بعد. استخدم Google أو تابع بدون تسجيل الدخول."],
    aeErrLogin: ["Wrong email or password — or this email hasn't been verified yet (finish sign-up with the emailed code).", "البريد الإلكتروني أو كلمة المرور غير صحيحة — أو لم يتم التحقق من هذا البريد بعد (أكمل التسجيل بالرمز المُرسل)."],
    aeErrOtp: ["That code is wrong or has expired, or the password doesn't match. Check it, or request a new code.", "الرمز غير صحيح أو منتهي الصلاحية، أو كلمة المرور غير مطابقة. تحقّق منه أو اطلب رمزًا جديدًا."],
    aeErrResetToken: ["This reset link is invalid or has expired. Request a new one.", "رابط إعادة التعيين غير صالح أو منتهي الصلاحية. اطلب رابطًا جديدًا."],
    aeErrEmail: ["Enter a valid email address.", "أدخل بريدًا إلكترونيًا صالحًا."],
    aeErrPassword: ["Password must be at least 8 characters and include a letter and a number.", "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل وتتضمن حرفًا ورقمًا."],
    aeErrPhone: ["Enter your phone number with the country code, e.g. ‎+201001234567.", "أدخل رقم هاتفك مع رمز الدولة، مثل ‎+201001234567."],
    aeErrCode: ["Enter the 6-digit code from the email.", "أدخل الرمز المكوّن من 6 أرقام من البريد."],
    aeErrMismatch: ["The passwords don't match.", "كلمتا المرور غير متطابقتين."],
    aeErrPwRequired: ["Enter your password.", "أدخل كلمة المرور."],
    aeErrGeneric: ["Something went wrong. Please try again.", "حدث خطأ ما. يُرجى المحاولة مجددًا."]
  };

  // Register into app.js's shared string table (a global `const T` from a
  // classic script — visible here by name, not as window.T). Never overwrite
  // a key app.js already defines.
  try {
    if (typeof T === "object" && T) {
      Object.keys(STR).forEach(function (k) { if (!Object.prototype.hasOwnProperty.call(T, k)) T[k] = STR[k]; });
    }
  } catch (e) {}

  function isAr() { return (document.documentElement.getAttribute("lang") || "").toLowerCase().indexOf("ar") === 0; }
  function curLang() { return isAr() ? "ar" : "en"; }
  function tr(key) { var e = STR[key]; return e ? e[isAr() ? 1 : 0] : key; }

  // ---------------- pure helpers ----------------
  // Arabic-Indic (٠-٩) and Extended Arabic-Indic (۰-۹) digits -> ASCII, so a
  // code/phone typed on an Arabic keyboard still validates.
  function asciiDigits(s) {
    return String(s == null ? "" : s).replace(/[٠-٩۰-۹]/g, function (c) {
      var n = c.charCodeAt(0);
      return String(n >= 0x06F0 ? n - 0x06F0 : n - 0x0660);
    });
  }
  function normEmail(s) { return String(s == null ? "" : s).trim(); }
  // "+20 100-123 4567", "(+20) 1001234567", "0020 100..." -> "+201001234567".
  function normPhone(s) {
    var p = asciiDigits(s).replace(/[\s\-().‎‏]/g, "");
    if (p.indexOf("00") === 0) p = "+" + p.slice(2);
    return p;
  }
  function normCode(s) { return asciiDigits(s).replace(/\s/g, ""); }
  function validEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }
  function validPassword(s) { return typeof s === "string" && s.length >= 8 && /[A-Za-z]/.test(s) && /[0-9]/.test(s); }
  function validPhone(s) { return /^\+[1-9]\d{7,14}$/.test(s); }   // same shape gym-be enforces
  function validOtp(s) { return /^\d{6}$/.test(s); }

  // Maps an api() result to a string key. ctx picks the 401 wording, since the
  // backend deliberately returns one generic 401 per flow.
  function errorKey(res, ctx) {
    var st = res && res.status, code = (res && res.code) || "", msg = ((res && res.message) || "").toLowerCase();
    if (!st) return "aeErrNetwork";
    if (st === 429) return "aeErrRateLimit";
    if (st === 503) return "aeErrUnavailable";
    if (st === 409) {
      if (code === "phone_already_registered") return "aeErrPhoneTaken";
      if (code === "phone_conflict") return "aeErrPhoneConflict";
      return "aeErrGeneric";
    }
    if (st === 401) {
      if (ctx === "login") return "aeErrLogin";
      if (ctx === "otp") return "aeErrOtp";
      if (ctx === "reset") return "aeErrResetToken";
      return "aeErrGeneric";
    }
    if (st === 422) {
      if (msg.indexOf("phone") !== -1) return "aeErrPhone";
      if (msg.indexOf("password") !== -1) return "aeErrPassword";
      if (msg.indexOf("email") !== -1) return "aeErrEmail";
      return "aeErrGeneric";
    }
    return "aeErrGeneric";
  }

  // POST {API}/auth/<path>. Never rejects: resolves {ok, status, code,
  // message, data}; status 0 = network failure/timeout.
  function api(path, body) {
    var ctrl = typeof AbortController === "function" ? new AbortController() : null;
    var tm = ctrl ? setTimeout(function () { ctrl.abort(); }, FETCH_TIMEOUT_MS) : null;
    var opts = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
    if (ctrl) opts.signal = ctrl.signal;
    return fetch(API_BASE + "/auth/" + path, opts)
      .then(function (res) {
        return res.text().then(function (txt) {
          var data = null;
          try { data = txt ? JSON.parse(txt) : null; } catch (e) {}
          var err = (data && data.error) || {};
          return { ok: res.ok, status: res.status, code: err.code || "", message: err.message || "", data: data };
        });
      })
      .catch(function () { return { ok: false, status: 0, code: "", message: "", data: null }; })
      .then(function (r) { if (tm) clearTimeout(tm); return r; });
  }

  // ---------------- small state ----------------
  function ssGet(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function ssDel(k) { try { sessionStorage.removeItem(k); } catch (e) {} }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  // In-memory only: what the OTP step needs to verify / resend.
  var pending = null;      // {email, password, phone}
  var resetToken = null;
  var view = null;
  var tick = null;

  function startCooldown(email) { ssSet(COOLDOWN_KEY, { email: email, until: Date.now() + COOLDOWN_MS }); }
  function cooldownLeft(email) {
    var c = ssGet(COOLDOWN_KEY);
    if (!c || c.email !== email) return 0;
    return Math.max(0, c.until - Date.now());
  }

  window.GymAuthEmail = {
    onSessionExpired: function (email) { open("login", { email: email || lsGet("gymauth_email") || "", notice: "aeExpired" }); },
    open: function (v, o) { open(v, o); },
    _test: { normPhone: normPhone, normCode: normCode, normEmail: normEmail, validEmail: validEmail, validPassword: validPassword,
             validPhone: validPhone, validOtp: validOtp, errorKey: errorKey, tr: tr, curLang: curLang, STR: STR }
  };
})();
