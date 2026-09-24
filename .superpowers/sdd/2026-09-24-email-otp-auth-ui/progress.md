# W1-B email/OTP auth UI — progress ledger
- 2026-09-24 worktree created (feat/email-otp-auth-ui from origin/main 38a4907)
- 2026-09-24 read spec + localauth.go/service.go; contract verified (verify-otp needs password; errors {error:{code,message}})
- Ruling: backend reset email links to /?reset_token=… (service.go:633) while brief says /reset-password?token=… → frontend supports both; nginx gets /reset-password fallback.
- Ruling: strings live in auth-email.js and are merged into app.js's global T at load (avoids editing app.js concurrently with W1-A).
- Ruling: OTP password kept in memory only; after a reload the OTP view re-asks for it.
- 2026-09-24 plan written: docs/superpowers/plans/2026-09-24-email-otp-auth-ui.md
- 2026-09-24 Task 1 done: sync.js token-source-agnostic (acceptToken/signInWithToken/authMethod, local expiry->re-login, signOut clears gymauth_method/email); node --check + scratch vm harness (6 scenarios) pass
