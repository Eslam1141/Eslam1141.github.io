# Hotfix: sync meta data-loss bug

## Context

A friend beta-testing the gym PWA found that deleting one "cache-looking"
localStorage key (`gym_meta_updatedAt`) wipes other, unrelated saved data on
the next refresh/sync. This ships as its own hotfix PR ahead of the rest of
the frontend UI-polish batch, since it's a live data-loss bug.

## Global Constraints

- Public API of `sync.js` stays the same: `onLocalWrite`, `buildEntries`,
  `applyMerged`, `syncNow` all keep their existing signatures.
- No test framework exists in this repo (static PWA, no build step) —
  verification is manual, via the browser/devtools repro steps below. Do not
  introduce a test runner or build step to "add tests" for this fix.

## Task 1: Fix sync meta data-loss on missing/deleted meta key

**File:** `sync.js`

**Root cause:** one shared bookkeeping key, `gym_meta_updatedAt` (`META_KEY`),
holds every synced key's last-local-write timestamp. Its name looks like
disposable cache metadata, so it's exactly the kind of key someone poking
around DevTools → Local Storage would delete. `buildEntries()` stamps a
missing per-key entry as `m[k] || 0` (epoch 0), and `applyMerged()` does
`remoteMs > localMs`. Delete `gym_meta_updatedAt` and reload while signed in:
every key's `localMs` becomes 0, so the server's (possibly stale) value wins
for *every* `gym_*` key on the next sync — even keys never touched — and
`syncNow()` falls back to `location.reload()`, which is exactly the "I
refreshed and it was gone" symptom.

**Fix (targeted logic change, same public API):**

1. `buildEntries()`: distinguish "key genuinely never recorded" from "known
   old" — use
   `Object.prototype.hasOwnProperty.call(m, k) ? m[k] : undefined` instead of
   `m[k] || 0`.
2. `applyMerged()`: when `localMs` is `undefined` for a key that already has
   a local value, don't blindly let remote win — keep local and backfill
   `m[k] = Date.now()` so future syncs are correct; only take remote outright
   when there's no local value at all for that key.
3. Add an anomaly guard where sync is kicked off (`syncNow()` or its
   caller): if `readMeta()` is empty but `gym_*` keys with real values
   already exist in localStorage, treat that as "meta got wiped, data
   didn't" — backfill `meta` for every existing `gym_*` key to `Date.now()`
   and `writeMeta()` immediately, *before* the first
   `buildEntries()`/push of this session, so the push looks fresh instead of
   stale.

**Verification (manual, in-browser):**

- Populate several `gym_*` keys, delete only `gym_meta_updatedAt` in
  DevTools → Application → Local Storage, reload while signed in, confirm
  data is **not** overwritten (currently it is — this is the repro for the
  bug).
- Regression: two profiles/tabs editing the same key with meta intact still
  resolves via genuine last-writer-wins (don't break normal sync).
- Confirm `syncNow()`'s `location.reload()` path doesn't loop after the meta
  backfill write.

Report exactly which of these manual checks you ran and what you observed —
this repo has no automated test suite, so the report's manual-verification
notes are the evidence of correctness.

## Critical Files

- `sync.js` — `buildEntries()`, `applyMerged()`, `syncNow()` (and whatever
  function currently calls `syncNow()`/reads `readMeta()` at sync start)
