/**
 * Transition matrix for `updateProblemStatus`.
 *
 * Verifies every status transition the client can produce, plus the concurrency case,
 * because the handler was restructured to award XP via an atomic conditional write.
 *
 *   1. TODO      -> SOLVED     expect +25
 *   2. SOLVED    -> SOLVED     expect no change (re-save must not double-award)
 *   3. SOLVED    -> TODO       expect -25
 *   4. TODO      -> ATTEMPTED  expect no change (not an XP-bearing transition)
 *   5. ATTEMPTED -> SOLVED     expect +25
 *   6. 6x concurrent SOLVED    expect +25 exactly once
 *   7. invalid status value    expect 400
 *
 * Uses three different problems so the cases cannot interfere, and a throwaway
 * `example.invalid` account removed afterwards by `cleanupProbeUsers.ts`.
 *
 * Run:  node backend/scripts/probe-status-transitions.cjs
 */
const BASE = process.env.AF_API || 'http://localhost:5000';

const json = async (path, opts = {}) => {
    const { headers, ...rest } = opts;
    const res = await fetch(`${BASE}${path}`, {
        ...rest,
        headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    });
    let body = null;
    try {
        body = await res.json();
    } catch {
        /* ignore */
    }
    return { status: res.status, body };
};

(async () => {
    const email = `race-probe-matrix-${Date.now()}@example.invalid`;
    const reg = await json('/api/users', {
        method: 'POST',
        body: JSON.stringify({ name: 'Matrix Probe', email, password: 'Probe-Password-123!' }),
    });
    if (reg.status !== 201) {
        console.error('register failed', reg.status, reg.body);
        process.exit(2);
    }
    const auth = { Authorization: `Bearer ${reg.body.token}` };

    const problemsRes = await json('/api/content/problems');
    const list = Array.isArray(problemsRes.body)
        ? problemsRes.body
        : problemsRes.body?.problems || [];
    if (list.length < 3) {
        console.error('need at least 3 problems to run the matrix');
        process.exit(2);
    }
    const [pA, pB, pC] = list.map((p) => p.id || p._id);
    console.log(`problems: A=${pA}  B=${pB}  C=${pC}\n`);

    const xp = async () => (await json('/api/users/me', { headers: auth })).body?.xp_points;
    const setStatus = (pid, status) =>
        json(`/api/user-actions/problems/${pid}/status`, {
            method: 'POST',
            headers: auth,
            body: JSON.stringify({ status }),
        });
    const rowsFor = async (pid) => {
        const r = await json('/api/user-actions/progress', { headers: auth });
        return (r.body || []).filter((p) => p.problem_id === pid);
    };

    const results = [];
    const step = async (label, fn, expected) => {
        const before = await xp();
        await fn();
        const after = await xp();
        const delta = after - before;
        const pass = delta === expected;
        results.push([`${label} (expected ${expected >= 0 ? '+' : ''}${expected}, got ${delta >= 0 ? '+' : ''}${delta})`, pass]);
        return { before, after, delta };
    };

    console.log('=== transition matrix ===');
    await step('TODO -> SOLVED', () => setStatus(pA, 'SOLVED'), 25);
    await step('SOLVED -> SOLVED (re-save)', () => setStatus(pA, 'SOLVED'), 0);
    await step('SOLVED -> TODO', () => setStatus(pA, 'TODO'), -25);
    await step('TODO -> ATTEMPTED', () => setStatus(pB, 'ATTEMPTED'), 0);
    await step('ATTEMPTED -> SOLVED', () => setStatus(pB, 'SOLVED'), 25);

    console.log('\n=== concurrency ===');
    await step(
        '6x concurrent SOLVED on a fresh problem',
        () => Promise.all(Array.from({ length: 6 }, () => setStatus(pC, 'SOLVED'))),
        25
    );

    console.log('\n=== invalid input ===');
    const bad = await setStatus(pC, 'NOT_A_STATUS');
    results.push([`invalid status rejected with 400 (got ${bad.status})`, bad.status === 400]);

    console.log('\n=== row integrity ===');
    for (const [label, pid] of [['A', pA], ['B', pB], ['C', pC]]) {
        const rows = await rowsFor(pid);
        results.push([`exactly one row for problem ${label} (got ${rows.length})`, rows.length === 1]);
    }

    const me = await json('/api/users/me', { headers: auth });
    const solvedIds = (me.body?.solvedProblems || []).map((s) => s.problemId);
    const uniqueSolved = new Set(solvedIds).size === solvedIds.length;
    results.push([`solvedProblems has no duplicates (${solvedIds.length} entries)`, uniqueSolved]);

    console.log('\n=== assertions ===');
    results.forEach(([label, pass]) => console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label}`));

    console.log(`\nfinal xp: ${me.body?.xp_points}`);
    console.log(`solvedProblems: ${JSON.stringify(me.body?.solvedProblems)}`);
    console.log(`streak_days: ${me.body?.streak_days}`);
    console.log(`last_active: ${me.body?.last_active}`);

    console.log('\nPROBE_EMAIL=' + email);
    process.exit(results.every(([, p]) => p) ? 0 : 1);
})().catch((e) => {
    console.error('matrix crashed:', e);
    process.exit(2);
});
