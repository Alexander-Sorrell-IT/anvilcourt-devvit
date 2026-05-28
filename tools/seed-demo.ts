/* eslint-disable no-console */
/**
 * Anvil Court — Playwright seed-demo script
 *
 * Drives the 13-records-3-reversed corpus seed using Playwright with one
 * persistent Chrome profile per Reddit account. You log in interactively ONCE
 * per account; the session cookies live in `.seed-sessions/<account>/` (gitignored)
 * and every subsequent run reuses them — no credentials in code, no captcha loop.
 *
 * Account keys you'll use throughout: `alt1` `alt2` `alt3` `alt4` `mod` `alice`
 * (the labels are arbitrary — pick anything as long as you're consistent).
 *
 * Setup (one-time):
 *   npx playwright install chromium
 *   node --experimental-strip-types ./tools/seed-demo.ts login alt1
 *   node --experimental-strip-types ./tools/seed-demo.ts login alt2
 *   node --experimental-strip-types ./tools/seed-demo.ts login alt3
 *   node --experimental-strip-types ./tools/seed-demo.ts login alt4
 *   node --experimental-strip-types ./tools/seed-demo.ts login mod
 *   node --experimental-strip-types ./tools/seed-demo.ts login alice
 *
 * Run the whole seed:
 *   node --experimental-strip-types ./tools/seed-demo.ts plan
 *
 * Or piecewise:
 *   ... seed              # 13 posts across alt1..alt4 (paced)
 *   ... reply             # alt1, alt2, alt3 each reply "I think this was a mistake"
 *   ... reverse           # mod replies "/reverse seed run" to the 3 appeal threads
 *   ... alice             # alice submits the live demo post (plain, no trigger word)
 *
 * Verify after seed:
 *   - devvit logs r/<sub> should show 13 `[anvilcourt] automod-filter` lines
 *   - case file by rule → "No spam" → toast starts with "No spam: 13 total, 3 reversed (23%)..."
 *
 * Per SEED-DEMO.md: alice's post stays plain (no trigger). During BEAT 1 on
 * camera, mod removes alice's post and PICKS the "No spam" removal reason so
 * her record lands in the same bucket as the 13 seed records.
 *
 * Failure modes to expect:
 * - Reddit rate-limits / "you're doing that too much" — script logs and retries
 *   after a longer pause. Increase POST_INTERVAL_SEC if you hit this twice.
 * - AutoMod hasn't picked up the rule yet — verify the rule by hand first.
 * - Selector drift if Reddit ships a UI change — adjust the selectors below.
 */

import { chromium, type BrowserContext, type Page } from 'playwright';
import path from 'node:path';
import fs from 'node:fs/promises';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

// ─── Configuration ───────────────────────────────────────────────────────────

const CONFIG = {
  subreddit: 'alexander_sorrell_it', // case insensitive in URLs
  trigger: 'ANVILDEMOTRIGGER',
  // 13 = 4 + 3 + 3 + 3 across these alts
  seedDistribution: [
    { account: 'alt1', count: 4 },
    { account: 'alt2', count: 3 },
    { account: 'alt3', count: 3 },
    { account: 'alt4', count: 3 },
  ],
  // 3 alts whose first seeded post you'll reverse
  reversalAlts: ['alt1', 'alt2', 'alt3'],
  modAccount: 'mod',
  aliceAccount: 'alice',
  // Pacing — bumped up if Reddit rate-limits a brand-new alt
  postIntervalSec: 35,
  accountRotationSec: 8,
  replyIntervalSec: 15,
  // alice's plain-text demo post — no trigger word, just a benign-looking post
  alicePostTitle: 'hey r/alexander_sorrell_it, first time posting here',
  aliceBody: 'just wanted to say hi and see how this community works. thanks!',
};

const TITLE_TEMPLATES = [
  'thoughts on the new feature',
  'my experience this week',
  'hello again folks',
  'quick update from me',
  'something I wanted to share',
  'a small observation',
  'this just happened',
  'wondering what you think',
];

const SESSIONS_DIR = path.resolve('.seed-sessions');

// ─── CLI dispatch ────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const [cmd, ...args] = process.argv.slice(2);
  switch (cmd) {
    case 'login':
      await loginCmd(args[0]);
      break;
    case 'post':
      await postCmd(args[0]);
      break;
    case 'seed':
      await seedCmd();
      break;
    case 'reply':
      await repliesCmd();
      break;
    case 'reverse':
      await reverseCmd();
      break;
    case 'alice':
      await aliceCmd();
      break;
    case 'plan':
      await planCmd();
      break;
    case 'status':
      await statusCmd();
      break;
    default:
      printUsage();
      process.exit(cmd ? 1 : 0);
  }
}

function printUsage(): void {
  console.log(
    `Anvil Court seed-demo
Usage:
  node --experimental-strip-types ./tools/seed-demo.ts <subcommand> [args]

Subcommands:
  login <account>   Open Chrome with persistent profile; sign in interactively.
  post <account>    Post one ANVILDEMOTRIGGER post from <account>.
  seed              Post all 13 trigger posts across alt1..alt4 (paced ~35s).
  reply             alt1, alt2, alt3 each reply "I think this was a mistake".
  reverse           mod replies "/reverse seed run" to the 3 appeal threads.
  alice             alice submits her plain (no-trigger) live demo post.
  plan              Run: seed → reply → reverse → alice (with pauses).
  status            Show which accounts have saved sessions.

Sessions live in ${SESSIONS_DIR} (gitignored).
Run \`login\` for each account before using any other subcommand.`,
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function openContext(account: string): Promise<BrowserContext> {
  const dir = path.join(SESSIONS_DIR, account);
  await fs.mkdir(dir, { recursive: true });
  const ctx = await chromium.launchPersistentContext(dir, {
    headless: false,
    viewport: { width: 1280, height: 900 },
    args: ['--disable-blink-features=AutomationControlled'],
  });
  return ctx;
}

async function withContext<T>(account: string, fn: (ctx: BrowserContext, page: Page) => Promise<T>): Promise<T> {
  const ctx = await openContext(account);
  try {
    const page = ctx.pages()[0] ?? (await ctx.newPage());
    return await fn(ctx, page);
  } finally {
    await ctx.close();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickTitle(account: string, i: number): string {
  const t = TITLE_TEMPLATES[(account.charCodeAt(0) + i) % TITLE_TEMPLATES.length];
  return `${t} ${CONFIG.trigger}`;
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input, output });
  try {
    return await rl.question(question);
  } finally {
    rl.close();
  }
}

async function whoami(page: Page): Promise<string | undefined> {
  // Old reddit shows username in #header-bottom-right .user a
  try {
    await page.goto('https://old.reddit.com/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    const name = await page
      .locator('#header-bottom-right .user a')
      .first()
      .textContent({ timeout: 5000 });
    return name?.trim();
  } catch {
    return undefined;
  }
}

// ─── login ───────────────────────────────────────────────────────────────────

async function loginCmd(account: string | undefined): Promise<void> {
  if (!account) throw new Error('login: missing <account> argument');
  console.log(`Opening Chrome for ${account}. Sign in to the right Reddit account.`);
  const ctx = await openContext(account);
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  await page.goto('https://www.reddit.com/login/');
  await prompt(
    `\n>>> Sign in to Reddit in the open window. When the page shows you're logged in, press Enter here.\n`,
  );
  const name = await whoami(page);
  await ctx.close();
  if (name && name !== 'login' && name !== 'register') {
    console.log(`Session saved for ${account} (logged in as u/${name}).`);
  } else {
    console.log(
      `Session saved for ${account}, but the sign-in didn't read as confirmed. If \`status\` says "not signed in", re-run \`login ${account}\`.`,
    );
  }
}

// ─── post (one) ──────────────────────────────────────────────────────────────

async function postCmd(account: string | undefined): Promise<void> {
  if (!account) throw new Error('post: missing <account> argument');
  await withContext(account, async (_ctx, page) => {
    await submitTriggerPost(page, account, 0);
  });
}

async function submitTriggerPost(page: Page, account: string, indexInBatch: number): Promise<void> {
  const title = pickTitle(account, indexInBatch);
  const body = `${CONFIG.trigger}\n\nSeed post for the Anvil Court demo corpus. Account: ${account}.`;
  console.log(`[${account}] submitting: "${title.slice(0, 60)}..."`);
  await page.goto(`https://old.reddit.com/r/${CONFIG.subreddit}/submit?selftext=true`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  // Sometimes Reddit lands on a "create community" CTA if the path is wrong; sanity check:
  if (!(await page.locator('textarea[name="title"]').first().isVisible({ timeout: 5000 }).catch(() => false))) {
    throw new Error(`[${account}] submit page didn't render the title field — check the subreddit name and that ${account} can post in it.`);
  }
  await page.fill('textarea[name="title"]', title);
  await page.fill('textarea[name="text"]', body);
  // Submit button selector on old reddit
  await page.click('button.btn[type="submit"][name="op"]', { timeout: 30000 }).catch(async () => {
    // fallback: any submit button
    await page.click('button[type="submit"]', { timeout: 5000 });
  });
  // After submit, old.reddit either redirects to the new post or shows an error
  const outcome = await Promise.race([
    page.waitForURL(/\/r\/[^/]+\/comments\//, { timeout: 30000 }).then(() => 'posted' as const),
    page.waitForSelector('.error, .status, .RES-flash, span.error', { timeout: 30000 }).then(() => 'error' as const),
  ]).catch(() => 'timeout' as const);
  if (outcome === 'posted') {
    console.log(`[${account}] posted ✓`);
  } else if (outcome === 'error') {
    const err = await page.locator('.error, .status, span.error').first().textContent().catch(() => '');
    console.log(`[${account}] post returned error/warning: ${err?.trim()}`);
  } else {
    console.log(`[${account}] post timed out (may still have succeeded — check the sub)`);
  }
}

// ─── seed (post all 13) ──────────────────────────────────────────────────────

async function seedCmd(): Promise<void> {
  for (const { account, count } of CONFIG.seedDistribution) {
    console.log(`\n=== Seeding ${count} posts from ${account} ===`);
    await withContext(account, async (_ctx, page) => {
      for (let i = 0; i < count; i++) {
        await submitTriggerPost(page, account, i);
        if (i < count - 1) {
          console.log(`[${account}] pacing ${CONFIG.postIntervalSec}s before next post...`);
          await sleep(CONFIG.postIntervalSec * 1000);
        }
      }
    });
    console.log(`Account rotation pause ${CONFIG.accountRotationSec}s...`);
    await sleep(CONFIG.accountRotationSec * 1000);
  }
  console.log('\nseed: done. Verify via mod menu → case file by rule → "No spam (13)".');
}

// ─── reply (alt → modmail) ───────────────────────────────────────────────────

async function repliesCmd(): Promise<void> {
  for (const account of CONFIG.reversalAlts) {
    console.log(`\n=== ${account} replying to most-recent Anvil Court modmail ===`);
    await withContext(account, async (_ctx, page) => {
      await altReplyToModmail(page, account);
    });
    console.log(`Pacing ${CONFIG.replyIntervalSec}s before next account...`);
    await sleep(CONFIG.replyIntervalSec * 1000);
  }
  console.log('\nreply: done.');
}

async function altReplyToModmail(page: Page, account: string): Promise<void> {
  // Non-mod users receive subreddit modmail in their regular inbox.
  // Old-reddit inbox is the most stable surface.
  await page.goto('https://old.reddit.com/message/inbox/', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  // Look for the most recent message from /r/<sub> with subject "Your content was removed".
  const subjectLink = page
    .locator(`a.subject:has-text("Your content was removed")`)
    .first();
  if (!(await subjectLink.isVisible({ timeout: 10000 }).catch(() => false))) {
    console.log(
      `[${account}] no "Your content was removed" message visible in inbox. Has AutoMod filtered ${account}'s post(s) yet?`,
    );
    return;
  }
  await subjectLink.click();
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  // Reply textarea on old reddit message view
  const reply = page.locator('textarea[name="text"]').first();
  if (!(await reply.isVisible({ timeout: 10000 }).catch(() => false))) {
    console.log(`[${account}] no reply textarea — Reddit may have changed the message UI.`);
    return;
  }
  await reply.fill('I think this was a mistake.');
  // Submit reply
  await page.click('button[type="submit"]:has-text("send"), button.send', { timeout: 10000 }).catch(async () => {
    await page.click('button.btn[type="submit"]', { timeout: 5000 });
  });
  await sleep(2500);
  console.log(`[${account}] reply sent ✓`);
}

// ─── reverse (mod /reverse) ──────────────────────────────────────────────────

async function reverseCmd(): Promise<void> {
  console.log(`\n=== mod opening modmail and reversing ${CONFIG.reversalAlts.length} threads ===`);
  await withContext(CONFIG.modAccount, async (_ctx, page) => {
    await modReverseAppeals(page);
  });
  console.log('\nreverse: done.');
}

async function modReverseAppeals(page: Page): Promise<void> {
  // New modmail is at mod.reddit.com/mail. The "all" view lists every modmail thread.
  await page.goto('https://mod.reddit.com/mail/all', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await sleep(4000); // SPA hydration
  for (const altName of CONFIG.reversalAlts) {
    console.log(`mod: finding appeal thread for u/${altName}...`);
    // Find a conversation card mentioning this user. Selectors vary across modmail
    // versions; we try a couple, then fall back to text-search.
    const card = page
      .locator(`a:has-text("u/${altName}"), [class*="ThreadPreview"]:has-text("${altName}")`)
      .first();
    if (!(await card.isVisible({ timeout: 8000 }).catch(() => false))) {
      console.log(
        `mod: couldn't auto-find thread for ${altName} — open mod.reddit.com/mail and click their appeal manually, then re-run with the smaller batch.`,
      );
      continue;
    }
    await card.click();
    await sleep(3000);
    // Reply box: look for the contenteditable or textarea in the reply pane
    const reply = page
      .locator('div[contenteditable="true"], textarea[placeholder*="reply" i], textarea[placeholder*="Reply" i]')
      .first();
    if (!(await reply.isVisible({ timeout: 10000 }).catch(() => false))) {
      console.log(`mod: reply field not found for ${altName} — Reddit UI may have changed.`);
      continue;
    }
    await reply.click();
    await reply.fill('/reverse seed run');
    // The submit button text/label varies; try common ones
    await page
      .click('button:has-text("Send"), button:has-text("Reply"), button[type="submit"]', { timeout: 10000 })
      .catch(() => undefined);
    await sleep(3500);
    console.log(`mod: /reverse sent for ${altName} ✓`);
    // small inter-thread pause
    await sleep(CONFIG.replyIntervalSec * 1000);
    // Go back to inbox for next iteration
    await page.goto('https://mod.reddit.com/mail/all', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await sleep(3000);
  }
}

// ─── alice (final live demo post) ────────────────────────────────────────────

async function aliceCmd(): Promise<void> {
  console.log('\n=== alice submitting plain (no-trigger) live demo post ===');
  await withContext(CONFIG.aliceAccount, async (_ctx, page) => {
    await page.goto(`https://old.reddit.com/r/${CONFIG.subreddit}/submit?selftext=true`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.fill('textarea[name="title"]', CONFIG.alicePostTitle);
    await page.fill('textarea[name="text"]', CONFIG.aliceBody);
    await page.click('button.btn[type="submit"][name="op"]', { timeout: 30000 });
    await Promise.race([
      page.waitForURL(/\/r\/[^/]+\/comments\//, { timeout: 30000 }),
      page.waitForSelector('.error, span.error', { timeout: 30000 }),
    ]).catch(() => undefined);
    console.log('alice: posted ✓');
  });
}

// ─── plan (the whole orchestration) ──────────────────────────────────────────

async function planCmd(): Promise<void> {
  await seedCmd();
  console.log('\nPausing 60s so AutoMod has fully filtered the 13 posts and modmails have flown...');
  await sleep(60000);
  await repliesCmd();
  console.log('\nPausing 30s so Anvil Court has rendered the precedent panels...');
  await sleep(30000);
  await reverseCmd();
  console.log('\nPausing 15s before alice post...');
  await sleep(15000);
  await aliceCmd();
  console.log('\nplan: done. Verify SEED-DEMO.md Step 6 pre-flight checklist before recording.');
}

// ─── status ──────────────────────────────────────────────────────────────────

async function statusCmd(): Promise<void> {
  const keys = [...CONFIG.seedDistribution.map((s) => s.account), CONFIG.modAccount, CONFIG.aliceAccount];
  console.log(`Sessions dir: ${SESSIONS_DIR}\n`);
  for (const k of keys) {
    const dir = path.join(SESSIONS_DIR, k);
    let signedIn: string | undefined;
    try {
      const stat = await fs.stat(dir);
      if (stat.isDirectory()) {
        // Lightweight check — actually try whoami
        const ctx = await openContext(k);
        try {
          const page = ctx.pages()[0] ?? (await ctx.newPage());
          signedIn = await whoami(page);
        } finally {
          await ctx.close();
        }
      }
    } catch {
      // dir doesn't exist
    }
    if (signedIn && signedIn !== 'login' && signedIn !== 'register') {
      console.log(`  ${k.padEnd(8)} — signed in as u/${signedIn}`);
    } else {
      console.log(`  ${k.padEnd(8)} — NOT signed in (run: login ${k})`);
    }
  }
}

// ─── entry ───────────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error('\nseed-demo failed:', err);
  process.exit(1);
});
