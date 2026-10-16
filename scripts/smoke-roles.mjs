/**
 * Smoke: clear storage, demo-login each role, assert sectioned sidebar.
 * Usage: node scripts/smoke-roles.mjs
 * Requires: npx playwright, server on PHOENIX_URL (default http://127.0.0.1:8765)
 */
import { chromium } from 'playwright';

const BASE = process.env.PHOENIX_URL || 'http://127.0.0.1:8765';

// DEMO list order in public.js — click by pid
const ROLES = [
  { role: 'P', pid: 'p1', expectSec: ['Orient', 'Work', 'Discover', 'Records', 'Always available'], mustNav: ['Pathway', 'Projects', 'Circles', 'Match Briefs', 'Evidence', 'Repository', 'Learning Harvests', 'Profile', 'Explore board', 'My collaborations'] },
  { role: 'M', pid: 'p3', expectSec: ['Work', 'Discover', 'Records', 'Always available'], mustNav: ['My people & requests', 'Shared pathways', 'Profile'] },
  { role: 'F', pid: 'p2', expectSec: ['Work', 'Records', 'Always available'], mustNav: ['Circles', 'Review inbox', 'Match Briefs', 'Learning Harvests', 'Evidence review'], banSec: ['Discover'] },
  { role: 'C', pid: 'p4', expectSec: ['Work', 'Discover', 'Records', 'Always available'], mustNav: ['Organisation & mandate', 'Opportunities', 'Match Briefs'] },
  { role: 'O', pid: 'p5', expectSec: ['Organisation', 'Always available'], mustNav: ['People & cohorts', 'Programme progress'] },
  { role: 'S', pid: 'p6', expectSec: ['Sponsorship', 'Always available'], mustNav: ['Seat utilisation', 'Approved initiatives', 'Funder-safe reports'], banNav: [/pitch/i, /tranche/i] },
  { role: 'A', pid: 'p7', expectSec: ['Administration', 'Always available'], mustNav: ['Approval inbox', 'Users & roles', 'Template library'] },
  { role: 'T', pid: 'p8', expectSec: [], mustNav: ['System health', 'Contexts & tenants', 'Audit & logs'] },
];

async function demoLogin(page, pid) {
  await page.goto(BASE + '/index.html');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await page.waitForSelector(`button.demo-acc[data-pid="${pid}"], details.auth-demo`, { timeout: 10000 });
  // open demo list if collapsed
  const summary = page.locator('details.auth-demo summary');
  if (await summary.count()) {
    const open = await page.locator('details.auth-demo[open]').count();
    if (!open) await summary.click();
  }
  await page.click(`button.demo-acc[data-pid="${pid}"]`);
  await page.waitForSelector('aside.side .side-nav, aside.side nav', { timeout: 10000 });
}

async function main() {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage();
  const fails = [];
  const ok = [];

  for (const r of ROLES) {
    try {
      await demoLogin(page, r.pid);
      const secs = await page.locator('.navsec span').allTextContents();
      const navText = await page.locator('aside.side a.nav .t').allTextContents();
      const missingSec = (r.expectSec || []).filter((s) => !secs.includes(s));
      if (missingSec.length) fails.push(`${r.role}: missing sections ${missingSec.join(', ')} (got: ${secs.join(' | ') || '(none)'})`);
      else ok.push(`${r.role}: sections [${secs.join(' → ') || '—'}] · ${navText.length} items`);
      // Section headers must appear once each (no Work → Discover → Work)
      const dup = secs.filter((s, i) => secs.indexOf(s) !== i);
      if (dup.length) fails.push(`${r.role}: duplicated sections ${[...new Set(dup)].join(', ')} in [${secs.join(' → ')}]`);
      for (const ban of r.banSec || []) {
        if (secs.includes(ban)) fails.push(`${r.role}: must not show section “${ban}”`);
      }

      for (const must of r.mustNav || []) {
        if (!navText.includes(must)) fails.push(`${r.role}: nav missing “${must}” (got: ${navText.join(', ')})`);
      }
      for (const ban of r.banNav || []) {
        if (navText.some((t) => ban.test(t))) fails.push(`${r.role}: banned nav matched ${ban}`);
      }

      const journey = await page.locator('section.journey').count();
      if (!journey) fails.push(`${r.role}: role journey rail missing on home`);
      else {
        const jlabels = await page.locator('section.journey .jlabel').allTextContents();
        ok.push(`${r.role} journey: ${jlabels.map((x) => x.trim()).filter(Boolean).join(' → ')}`);
      }
      if (r.role === 'P') {
        await page.click('aside.side a.nav[data-r="board"]');
        await page.waitForSelector('section.board-how', { timeout: 5000 });
        const how = await page.locator('section.board-how').count();
        if (!how) fails.push('P: Explore board missing “how to add” guidance');
        else ok.push('P: Explore board howto present');
      }
    } catch (e) {
      fails.push(`${r.role} (pid ${r.pid}): ${e.message}`);
    }
  }

  await browser.close();
  console.log(ok.join('\n'));
  if (fails.length) {
    console.error('\nFAILS:\n' + fails.join('\n'));
    process.exit(1);
  }
  console.log('\nAll role sidebar smokes passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
