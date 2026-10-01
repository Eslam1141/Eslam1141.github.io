// Runs synchronously from <head> (no inline script: the CSP allows 'self' scripts only).
// 1. Old password-reset links (/?reset_token=...) belong to the app.
// 2. Returning users (local app state) go straight to the app, unless ?home.
//    The app sends Referrer-Policy: no-referrer, so a same-site referrer
//    check can't work; ?home is the explicit way to see the landing.
// 3. Language and direction are set before first paint.
(function () {
  var d = document.documentElement;
  var ls = null;
  try { ls = window.localStorage; } catch (e) {}
  var qs = location.search;
  if (/[?&]reset_token=/.test(qs)) { location.replace("/app/" + qs); return; }
  if (ls && !/[?&]home(=|&|$)/.test(qs) && (ls.getItem("gym_user_sub") || ls.getItem("gym_anon") === "1")) {
    location.replace("/app/");
    return;
  }
  var lang = ls && ls.getItem("gym_lang");
  if (lang !== "ar" && lang !== "en") lang = /^ar/i.test(navigator.language || "") ? "ar" : "en";
  d.lang = lang;
  d.dir = lang === "ar" ? "rtl" : "ltr";
  if (lang === "ar") d.classList.add("pending");
})();
