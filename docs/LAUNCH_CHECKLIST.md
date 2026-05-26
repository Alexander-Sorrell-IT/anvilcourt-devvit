# Receipts — Launch Checklist

**Deadline: 2026-05-27 20:00 CDT.** App: `receipts` (product "Receipts").
**Listing:** https://developers.reddit.com/apps/receipts  •  **Test sub:** r/alexander_sorrell_it

## ✅ Done
- Full app built — 17 unit tests, `tsc --build` clean, esbuild build.
- Pipeline proven live: removal → reason from mod log → in-place explanation comment → audit log.
- Modmail delivery fixed (t2_ id → username).
- Mod settings screen (schema validated live). Welcome modmail on install. Mod menus (look up user, recent removals). Appeal loop.
- `devvit upload` (v0.0.2) + `devvit install` to the test sub (running persistently). README + about. Submission write-ups (`docs/SUBMISSION.md`).

---

## 🔴 REQUIRED to have a valid entry
- [ ] **Demo video (~60s)** *(Alex records — can be the same take as validation #2 below)*
- [ ] **2–3 screenshots** *(Alex)*
- [ ] **Submit on Devpost** before 2026-05-27 20:00 CDT *(Alex; write-ups in docs/SUBMISSION.md, listing link + username ready)*

## 🟠 Validate it works (Alex acts; I confirm via `devvit logs`)
- [ ] Welcome modmail arrived on install
- [ ] **Remove a post → explanation comment + modmail + "recent removals" entry** *(this is also the demo footage)*
- [ ] Reply to that modmail → appeal flagged
- [ ] Settings page renders
- [ ] *(Headline, optional)* AutoMod silent-filter path — needs an AutoMod rule + a 2nd account

## 🟡 Decision (Alex chooses, I execute)
- [ ] `devvit publish` to public App Directory (starts Reddit review) — or keep owner listing

## 🟢 Polish (optional, lifts score)
- [ ] App icon (`marketingAssets.icon`) *(Alex provides/approves image; I wire it)*
- [ ] Final wording pass *(essentially done)*

## ⭐ Bonus (optional)
- [ ] Feedback survey → $200 *(Alex)*
- [ ] Helper nomination if anyone helped *(Alex)*

## ⚙️ Housekeeping (me)
- [ ] Merge `build/receipts-v1` → main + final tag

---
**Bottom line:** the build is finished and live. Remaining real work = **one recorded test removal (validates + demos at once), screenshots, the publish call, and Submit.**
