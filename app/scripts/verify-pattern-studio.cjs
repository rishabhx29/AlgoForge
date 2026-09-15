'use strict';
/* Visual verification for the Pattern Studio migration.
 *
 * Creates a THROWAWAY probe account (race-probe-visual@example.invalid), drives
 * the REAL API to build genuine progress, then screenshots the dashboard in a
 * real browser. Cleanup is handled by the project's own cleanupProbeUsers.ts,
 * which matches exactly this email pattern and removes progress rows first.
 *
 * No fixture data, no mocked components: everything rendered comes from the API.
 */
const { chromium } = require('C:/Rishabh/AlgoForge/app/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const API = 'http://127.0.0.1:5000';
const APP = 'http://localhost:5173';
const OUT = 'C:/Rishabh/AlgoForge/design-mockups';
/* Unique per run. A reused probe account carries progress from the previous
 * run, and because marking an already-SOLVED problem is a no-op (the claim
 * matches zero rows) the "most recent topic" never moves — which silently
 * invalidates anything that depends on which pattern is active. */
const EMAIL = `race-probe-visual-${Date.now().toString(36)}@example.invalid`;
const PASSWORD = 'VisualProbe!2026';

const json = async (url, opts = {}) => {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
};

(async () => {
  const log = [];
  let browser;
  try {
    // ── 1. Probe account (register is idempotent-safe: 400 if it exists) ──
    const reg = await json(`${API}/api/users`, {
      method: 'POST',
      body: JSON.stringify({ email: EMAIL, password: PASSWORD, name: 'Visual Probe' }),
    });
    log.push({ step: 'register', status: reg.status });

    const login = await json(`${API}/api/users/login`, {
      method: 'POST',
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    if (login.status !== 200 || !login.body?.token) throw new Error('login failed: ' + JSON.stringify(login));
    const token = login.body.token;
    const auth = { Authorization: `Bearer ${token}` };
    log.push({ step: 'login', status: login.status });

    // ── 2. Real progress through the real endpoints ──
    const problems = (await json(`${API}/api/content/problems`)).body;
    const topics = (await json(`${API}/api/content/topics`)).body;
    if (!Array.isArray(problems) || !problems.length) throw new Error('no problems returned');

    // The raw API keys topics by `topic_slug` (the app normalises it to
    // `topic_id` at its API boundary). Read the raw field here.
    const slugOf = (p) => p.topic_slug ?? p.topic_id;
    const byTopic = {};
    for (const p of problems) {
      const s = slugOf(p);
      if (s) (byTopic[s] ||= []).push(p);
    }
    const preferred =
      topics.find((t) => /pointer|window|sliding/i.test(t.title) && (byTopic[t.id] || []).length) ||
      topics.slice().sort((a, b) => (byTopic[b.id]?.length || 0) - (byTopic[a.id]?.length || 0))[0];
    if (!preferred) throw new Error('no topics returned');

    // Seed progress the way a real learner accumulates it: deeply into ONE
    // path, with the rest untouched. That exercises the sheet's collapsed-by-
    // default behaviour for untouched paths (a flat spread across every path
    // would leave nothing to collapse and hide that branch entirely).
    const dsa = topics.filter((t) => t.path_slug === 'dsa');
    const solved = [];
    for (const t of dsa) {
      const list = (byTopic[t.id] ?? []).slice().sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
      const take = Math.round(list.length * 0.7);
      for (const p of list.slice(0, take)) {
        const r = await json(`${API}/api/user-actions/problems/${p.id}/status`, {
          method: 'POST', headers: auth, body: JSON.stringify({ status: 'SOLVED' }),
        });
        if (r.status !== 200) log.push({ step: 'solve', problem: p.title, status: r.status });
        solved.push(p.title);
        await new Promise((r2) => setTimeout(r2, 25));
      }
    }

    // Land the most recent solve inside the focus topic, so the identity band
    // shows a pointer pattern and the stepping explainer is the plate.
    for (const p of (byTopic[preferred.id] ?? []).slice(0, 3)) {
      await json(`${API}/api/user-actions/problems/${p.id}/status`, {
        method: 'POST', headers: auth, body: JSON.stringify({ status: 'SOLVED' }),
      });
      await new Promise((r2) => setTimeout(r2, 40));
    }
    log.push({ step: 'solved', count: solved.length, focusTopic: preferred.title });

    // ── 3. Render in a real browser with that session ──
    browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    await ctx.addInitScript((t) => window.localStorage.setItem('token', t), token);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

    await page.goto(`${APP}/#dashboard`, { waitUntil: 'load' });
    // Wait for the identity band and the sheet — elements that ONLY exist once
    // the dashboard's four queries have resolved. A generic "is there an h1"
    // check passes on the route skeleton and screenshots the loading state.
    await page.waitForSelector('.ember-band', { timeout: 40000 });
    await page.waitForSelector('.sheet-cell', { timeout: 40000 });
    await page.waitForTimeout(1800);

    const state = await page.evaluate(() => ({
      bodyWidth: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
      scrollHeight: document.documentElement.scrollHeight,
      fonts: document.fonts.status,
      hasEmberBand: !!document.querySelector('.ember-band'),
      sheetGroups: document.querySelectorAll('.sheet-group').length,
      groupTitles: [...document.querySelectorAll('.sheet-group-title')].map((e) => e.textContent),
      sheetRows: document.querySelectorAll('.sheet-row').length,
      cells: document.querySelectorAll('.sheet-cell').length,
      solvedCells: document.querySelectorAll('.sheet-cell[data-solved="true"]').length,
      hasDiagram: !!document.querySelector('svg[role="img"][aria-label*="pattern"]'),
      h1: document.querySelector('h1')?.textContent?.trim(),
    }));
    if (state.bodyWidth > state.viewport + 1) throw new Error('desktop horizontal overflow');
    if (state.sheetRows === 0) throw new Error('curriculum sheet rendered no rows');
    if (state.cells === 0) throw new Error('curriculum sheet rendered no cells');
    if (state.solvedCells === 0) throw new Error('no solved cells — progress is not reaching the sheet');
    await page.screenshot({ path: path.join(OUT, 'ps-dashboard.png') });
    await page.screenshot({ path: path.join(OUT, 'ps-dashboard-full.png'), fullPage: true });
    log.push({ step: 'dashboard-desktop', ...state });

    // ── The stepping explainer must be CORRECT, not merely present ──
    // Container With Most Water over [1,8,6,2,5,4,8,3,7] has a known answer of
    // 49. If the trace were authored rather than computed, this is where it
    // would drift from the real algorithm.
    const explainer = await page.$('.tpe');
    if (explainer) {
      const start = await page.$eval('.tpe-readout', (e) => e.textContent);
      let guard = 0;
      while (guard < 30) {
        const label = await page.$eval('.tpe-btn-primary', (e) => e.textContent.trim());
        if (label === 'Run again') break;
        await page.click('.tpe-btn-primary');
        await page.waitForTimeout(90);
        guard += 1;
      }
      const endText = await page.$eval('.tpe-note', (e) => e.textContent);
      const bests = await page.$$eval('.tpe-readout .tpe-val', (els) => els.map((e) => e.textContent));
      const finalBest = Number(bests[3]);
      if (finalBest !== 49) throw new Error(`explainer final best area was ${finalBest}, expected 49`);
      if (!/49/.test(endText)) throw new Error('explainer closing note does not report 49: ' + endText);
      await page.screenshot({ path: path.join(OUT, 'ps-explainer-done.png') });
      log.push({ step: 'explainer', steps: guard, finalBest, startReadout: start.trim(), closingNote: endText.trim() });
    } else {
      log.push({ step: 'explainer', note: 'not shown for this topic (non-pointer pattern)' });
    }

    // ── Collapse: untouched paths must start closed ──
    const collapse = await page.evaluate(() => {
      const heads = [...document.querySelectorAll('.sheet-group-head')];
      return {
        groups: heads.length,
        expanded: heads.filter((h) => h.getAttribute('aria-expanded') === 'true').length,
        collapsed: heads.filter((h) => h.getAttribute('aria-expanded') === 'false').length,
        rowsVisible: document.querySelectorAll('.sheet-row').length,
      };
    });
    if (collapse.collapsed === 0) throw new Error('no path started collapsed — untouched paths are not being hidden');
    log.push({ step: 'collapse', ...collapse });

    // ── Every pattern explainer must render AND reach its known answer ──
    // Each is driven by a real algorithm, so each has a checkable result.
    const EXPLAINERS = [
      { topic: /two pointer/i, label: 'two-pointers', expect: /holds 49/, shot: 'ps-exp-two-pointers.png' },
      { topic: /sliding window/i, label: 'sliding-window', expect: /is 3 characters/, shot: 'ps-exp-sliding-window.png' },
      { topic: /searching algorithms/i, label: 'binary-search', expect: /Found 21 at index 10/, shot: 'ps-exp-binary-search.png' },
      { topic: /bfs|graph/i, label: 'bfs', expect: /All 7 nodes visited/, shot: 'ps-exp-bfs.png' },
    ];

    for (const target of EXPLAINERS) {
      const topic = topics.find((t) => target.topic.test(t.title));
      if (!topic) {
        log.push({ step: 'explainer-' + target.label, note: 'no matching topic in this catalogue' });
        continue;
      }
      // Make this topic the most RECENT one, which is what the band ranks on.
      const candidates = (byTopic[topic.id] ?? []).slice().reverse();
      let solvedOne = false;
      for (const p of candidates) {
        const r = await json(`${API}/api/user-actions/problems/${p.id}/status`, {
          method: 'POST', headers: auth, body: JSON.stringify({ status: 'SOLVED' }),
        });
        if (r.status === 200) { solvedOne = true; break; }
      }
      if (!solvedOne) {
        log.push({ step: 'explainer-' + target.label, note: 'no unsolved problem left in ' + topic.title });
        continue;
      }

      // A full reload, not goto: navigating to the same URL + hash is a
      // same-document navigation, so the app would neither remount nor refetch
      // and the previous pattern would still be on screen.
      await page.reload({ waitUntil: 'load' });
      await page.waitForSelector('.tpe', { timeout: 40000 });
      await page.waitForTimeout(1200);

      // Confirm the band is showing the pattern we expect, not a stale one.
      const shownTopic = await page.$eval('.tpe-chart', (e) => e.getAttribute('aria-label') || '');
      const bandTopic = await page.evaluate(() => {
        const el = document.querySelector('.ember-band .font-mono');
        return el ? el.textContent.trim() : '';
      });
      log.push({ step: 'explainer-band-' + target.label, bandTopic, ariaSample: shownTopic.slice(0, 60) });

      // Step a few times first, so the showcase screenshot shows the pattern
      // mid-flight rather than the settled final state.
      for (let i = 0; i < 3; i += 1) {
        await page.click('.tpe-btn-primary');
        await page.waitForTimeout(120);
      }
      await page.screenshot({ path: path.join(OUT, target.shot) });

      // Then run it out and assert the closing note.
      let guard = 3;
      while (guard < 40) {
        const label = await page.$eval('.tpe-btn-primary', (e) => e.textContent.trim());
        if (label === 'Run again') break;
        await page.click('.tpe-btn-primary');
        await page.waitForTimeout(70);
        guard += 1;
      }
      const closing = (await page.$eval('.tpe-note', (e) => e.textContent)).trim();
      if (!target.expect.test(closing)) {
        throw new Error(`${target.label} closing note did not match ${target.expect}: "${closing}"`);
      }
      await page.screenshot({ path: path.join(OUT, target.shot.replace('.png', '-final.png')) });
      log.push({ step: 'explainer-' + target.label, topic: topic.title, steps: guard, closing });
    }

    // Problems list — the densest migrated surface
    await page.goto(`${APP}/#problems`, { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(OUT, 'ps-problems.png') });

    // Leaderboard — the hard case for a competitive screen
    await page.goto(`${APP}/#leaderboard`, { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(OUT, 'ps-leaderboard.png') });

    // Mobile dashboard
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${APP}/#dashboard`, { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    const mobile = await page.evaluate(() => ({
      bodyWidth: document.documentElement.scrollWidth, viewport: window.innerWidth,
    }));
    await page.screenshot({ path: path.join(OUT, 'ps-dashboard-mobile.png'), fullPage: true });
    if (mobile.bodyWidth > 391) throw new Error('mobile horizontal overflow: ' + JSON.stringify(mobile));
    log.push({ step: 'mobile', ...mobile });

    log.push({ step: 'errors', consoleErrors: errors });
    fs.writeFileSync(path.join(OUT, 'ps-verify.json'), JSON.stringify(log, null, 2));
    console.log(JSON.stringify({ result: errors.length ? 'PASS_WITH_CONSOLE_ERRORS' : 'PASS', log }, null, 2));
  } catch (e) {
    console.error('VERIFY FAILED:', e.message);
    console.error(JSON.stringify(log, null, 2));
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
})();
