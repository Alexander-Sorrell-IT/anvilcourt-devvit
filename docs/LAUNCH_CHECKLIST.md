# Receipts — Launch Checklist

**Deadline: 2026-05-27 20:00 CDT.** App: `grantscribe` (product "Receipts"). Test sub: r/alexander_sorrell_IT.

## ✅ Done
- Core engine + 16 unit tests; `tsc --build` clean; esbuild build green.
- App registered + installed live; mod-removal path proven live (detect → reason from mod-log → in-place comment → audit).
- Mod menus (look up user, recent removals). README. Modmail author-id→username fix.

---

## 🔴 MUST-HAVE — a complete, working, winning submission

### 1. Validate every path live (needs Alex to act in the sub; I read the logs)
- [ ] **Modmail fix retest** — remove a *fresh* item → confirm log shows `comment+modmail`.
- [ ] **Post removal** (not just comment) → in-place comment + modmail.
- [ ] **Removal with NO reason** → friendly generic message (tier `generic`).
- [ ] **AutoMod silent-filter path (THE HERO)** — add an AutoMod `filter` rule, trip it (needs a 2nd account or non-mod content, since AutoMod exempts mods) → confirm the author gets an explanation. This is our net-new headline; it must be shown working.
- [ ] **Appeal loop** — reply to the modmail as the user → confirm audit flips to `appealed`.
- [ ] **Dedup** — confirm one removal = one delivery (no doubles).

### 2. Mod settings screen (configurability is explicitly judged — "Reliable UX")
- [ ] Add subreddit settings to `devvit.json` (delivery channel; appeals on/off; message template; per-source toggles; per-reason opt-out) + confirm schema validates on upload. *(me)*

### 3. Publish / App Directory listing — REQUIRED for the submission; START EARLY (review latency is the #1 schedule risk)
- [ ] `devvit upload` a clean version (sets the about from README).
- [ ] `devvit publish` → triggers Reddit review. **Do this by ~May 25–26 so review can finish before the deadline.**
- [ ] Capture the developer.reddit.com listing link (the submission needs it).

---

## 🟡 SHOULD-HAVE — lifts the polish score
- [ ] Welcome modmail to mods on install (`onAppInstall`) explaining the app is active + how to configure. *(me)*
- [ ] App icon (`marketingAssets.icon`) — needs an image. *(Alex provides or we make one)*
- [ ] Polish the explanation message wording + branding. *(me)*
- [ ] Confirm the app "about" text renders from README. *(me, on upload)*

---

## 🟢 SUBMISSION (Devpost — the actual entry)
- [ ] **Tool Overview** — detailed write-up of functionality + how mods/users use it. *(me draft, Alex post)*
- [ ] **Project Impact** — 1–3 communities + concrete time-savings numbers. *(me draft)*
- [ ] **~60s demo video** — the gasp: remove something → author instantly gets the explanation + appeal → mod sees the audit entry. *(Alex records screen)*
- [ ] **Screenshots** for the listing + Devpost. *(Alex captures)*
- [ ] Reddit username(s): **u/AlexanderSorrell-IT**.
- [ ] **Submit on Devpost before 2026-05-27 20:00 CDT.** *(Alex)*

---

## ⭐ BONUS (optional, low effort, real money)
- [ ] Developer satisfaction survey → Feedback Award ($200). *(Alex, ~10 min)*
- [ ] Helper nomination, if anyone in r/Devvit/Discord helped → Helper Award.

---

## Suggested order (3 days)
**Day 1 (today):** finish path validation (1) + start settings (2) + first `devvit upload`.
**Day 2:** settings done + polish (welcome modmail, wording, icon) + `devvit publish` (start review) + draft Devpost write-ups.
**Day 3:** record demo + screenshots, final QA, merge to main, submit on Devpost (with buffer before 8pm CDT).
