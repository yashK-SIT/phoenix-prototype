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
  { role: 'S', pid: 'p6', expectSec: ['Sponsorship', 'Always available'], mustNav: ['My projects', 'Applications', 'Approved evidence'], banNav: [/pitch/i, /tranche/i, /seat utilisation/i, /approved initiatives/i, /funder-safe reports/i, /invoices/i] },
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
      // JF-90: four labelled metric layers, no composite score, outcome indicators complete, pilot-learning label.
      if (r.role === 'A') {
        const pilot = 'Pilot learning, not impact proof';
        const homeTxt = await page.locator('main').innerText();
        if (!homeTxt.includes(pilot)) fails.push('A: home metrics card missing the pilot-learning label');
        const reg = await page.evaluate(() => ({
          live: metricRegistryProblems(),
          unlayered: S.metrics.filter((m) => !['workflow', 'evidence', 'outputs'].includes(m.layer)).map((m) => m.name),
          composite: metricRegistryProblems([{ name: 'Programme coherence', layer: 'workflow', def: 'Weighted blend of all metrics' }]).length,
          combined: metricRegistryProblems([{ name: 'Blend', layer: 'workflow', def: 'x', combines: ['m1', 'm7'] }]).length,
          derivedOutcome: metricRegistryProblems([{ name: 'Outcome from activity', layer: 'outcomes', def: 'x' }]).length,
          incomplete: outcomeMissing({ name: 'x', def: 'y' }).length,
        }));
        if (reg.live.length) fails.push('A: metric registry breaks the no-composite rule: ' + reg.live.join('; '));
        if (reg.unlayered.length) fails.push('A: metrics without a derived layer: ' + reg.unlayered.join(', '));
        if (!reg.composite || !reg.combined || !reg.derivedOutcome) fails.push('A: no-composite check did not reject a composite, combined or activity-derived outcome metric');
        if (reg.incomplete !== 7) fails.push('A: outcome completeness check expected 7 missing fields, got ' + reg.incomplete);
        await page.click('aside.side a.nav[data-r="metrics"]');
        await page.waitForSelector('.adm-report', { timeout: 5000 });
        const rep = await page.locator('main').innerText();
        const layers = ['1 · Workflow activity', '2 · Evidence confidence and review', '3 · Project outputs and visible wins', '4 · Real-world outcomes'];
        const miss = layers.filter((l) => !rep.includes(l));
        if (miss.length) fails.push('A: reports missing layers ' + miss.join(', '));
        if (!rep.includes(pilot)) fails.push('A: reports missing the pilot-learning label');
        if (/composite score:|coherence score:|impact score:/i.test(rep)) fails.push('A: reports show a composite score');
        // the outcome form refuses an indicator with missing fields
        const before = await page.evaluate(() => S.outcomes.length);
        await page.click('[data-a="ocNew"]');
        await page.click('form[data-f="oc"] button[type="submit"]');
        const errs = await page.locator('form[data-f="oc"] .emsg').count();
        const after = await page.evaluate(() => S.outcomes.length);
        if (errs < 9 || after !== before) fails.push(`A: outcome form accepted an incomplete indicator (errors ${errs}, saved ${after - before})`);
        else ok.push('A: four metric layers shown, pilot label present, no composite score, incomplete outcome refused');
      }
      if (r.role === 'S') {
        // Seat utilisation, approved initiatives, funder-safe reports and invoices are removed from the Sponsor home.
        const homeTxt = await page.locator('main').innerText();
        const gone = ['Seat utilisation', 'Approved initiatives', 'Funder-safe reports', 'Invoices and receipts'].filter((t) => homeTxt.includes(t));
        if (gone.length) fails.push('S: home still shows removed modules: ' + gone.join(', '));
        else ok.push('S: removed modules absent from sidebar and home');
      }
      if (r.role === 'P') {
        await page.click('aside.side a.nav[data-r="board"]');
        await page.waitForSelector('#board-feed', { timeout: 5000 });
        const board = await page.locator('main').innerText();
        if (/How items get onto this board|Sponsor’s name not shown/.test(board)) fails.push('P: Explore board still shows the removed guidance text');
        else ok.push('P: Explore board clean (no guidance rail, no sponsor-name note)');
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
