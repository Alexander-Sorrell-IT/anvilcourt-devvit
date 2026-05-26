# Anvil Court — Launch Checklist

**Deadline: 2026-05-27 20:00 CDT.** App: `anvilcourt` (product "Anvil Court").
**Listing:** https://developers.reddit.com/apps/anvilcourt (after upload)  •  **Test sub:** r/alexander_sorrell_it

## ✅ Done
- Full app built — 56 unit tests, `tsc --build` clean, esbuild bundle clean.
- Pipeline proven live (under prior `receipts` slug, pre-rename): removal → reason → in-place explanation comment + modmail → audit log.
- Modmail delivery fixed (t2_ id → username resolution).
- **Case-law layer (round 1):** precedent panel on appeal, `/reverse` + `/uphold` mod commands, Case File by rule menu, `/my-receipts` user keyword.
- **Round 2 hardening:** Mod Mirror (public anonymized wiki page), cold-start backfill from modlog (90d), per-author daily rate cap on AutoMod silent-filter explanations, precedent panel headline-above-the-fold, "36+ Devvit apps" claim rephrased to defensible.
- **Round 3:** *Anvil Court: precedent for this item* per-post/comment mod menu (triage surface). `docs/RECORDING.md` demo prescription with required seed-data setup.
- App icon (1024×1024, `marketingAssets.icon` wired). Settings screen schema-validated.
- Renamed from scaffold-inherited `receipts` to brand `anvilcourt` (code + docs + slug). Public repo at https://github.com/Alexander-Sorrell-IT/anvilcourt-devvit (after repo rename).

---

## 🔴 REQUIRED to have a valid entry
- [ ] **`npm run build && devvit upload`** *(may need fallback slug if `anvilcourt` is taken — try `anvil-court` or `reddit-anvilcourt`)*
- [ ] **`devvit install r/alexander_sorrell_it`** *(install fresh under new slug; the old `receipts` install becomes orphaned and can be uninstalled later)*
- [ ] **Seed the demo data per `docs/RECORDING.md` section 5** — 13 prior removals on the same rule, reverse 3 → headline reads `23% (3/13)`
- [ ] **Demo video (~60s)** following `docs/RECORDING.md` beat-by-beat
- [ ] **2–3 screenshots** *(see RECORDING.md §7 for exact frames)*
- [ ] **Submit on Devpost** before 2026-05-27 20:00 CDT *(write-ups ready in `docs/SUBMISSION.md`)*

## 🟠 Validate it works (Alex acts; I confirm via `devvit logs`)
- [ ] Welcome modmail arrived on install (mentions Anvil Court + all 3 surfaces)
- [ ] **Remove a post → explanation comment + modmail + Case File entry** *(part of demo recording)*
- [ ] Reply to that modmail → appeal flagged + precedent panel renders as internal note with REVERSAL RATE headline
- [ ] Reply `/reverse posted in error` → item approved, reversal DM lands, audit shows overturned
- [ ] *Anvil Court: precedent for this item* on a removed post → toast shows rule stats
- [ ] *Anvil Court: publish public mirror* → `/wiki/anvil-court` updates
- [ ] *(Optional)* AutoMod silent-filter path — needs an AutoMod rule + a 2nd account

## 🟡 Decision (Alex chooses, I execute)
- [ ] `devvit publish` to public App Directory (starts Reddit review) — or keep owner listing for submission

## ⭐ Bonus (optional)
- [ ] Feedback survey → $200 *(Alex)*
- [ ] Helper nomination if anyone helped *(Alex)*

## ⚙️ Housekeeping (me)
- [ ] Rename GitHub repo `receipts-devvit` → `anvilcourt-devvit` (GitHub auto-redirects old URL)
- [ ] Update local git remote URL after rename
- [ ] Merge `build/receipts-v1` → main + final tag (consider renaming the branch too)

---
**Bottom line:** the code is finished, rebranded, and pushed. Remaining work = **`devvit upload` under the new slug, seed 13 demo records, record the 60s demo, screenshot, submit.**
