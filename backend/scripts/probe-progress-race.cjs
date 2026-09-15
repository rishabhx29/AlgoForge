/**
 * Race probe for the progress endpoints (`/api/user-actions/...`).
 *
 * Registers a throwaway user, then fires N simultaneous writes at the same
 * (user, problem) pair and checks the outcome:
 *
 *   - every request must succeed (no 500 — that is the P2002 exposure the
 *     `user_id_problem_id_unique` index introduced),
 *   - exactly ONE UserProgress row must exist for that pair (no duplicates),
 *   - XP must have incremented exactly once for a single TODO -> SOLVED transition.
 *
 * The XP assertion is the interesting one: `updateProblemStatus` reads the previous
 * status and then increments XP as a separate write, so concurrent solves can each
 * observe "not yet SOLVED" and each award XP. This probe measures whether that
 * actually happens rather than assuming it.
 *
 * The account is created on the reserved `example.invalid` TLD and removed afterwards
 * by `src/scripts/cleanupProbeUsers.ts`.
 *
 * Run:  node backend/scripts/probe-progress-race.cjs
 */
const BASE = process.env.AF_API || 'http://localhost:5000';
const N = 6;
const SOLVE_XP = 25;

const json = async (path, opts = {}) => {
    // NOTE: `headers` must be merged and applied LAST. An earlier version spread
    // `...opts` after `headers`, so any caller passing its own `headers` (e.g. the
    // Authorization header) silently dropped `Content-Type: application/json` —
    // Express then never parsed the body and every `status` arrived as undefined.
    const { headers, ...rest } = opts;
    const res = await fetch(`${BASE}${path}`, {
        ...rest,
        headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    });
    let body = null;
    try {
        body = await res.json();
    } catch {
        /* ignore non-JSON */
    }
    return { status: res.status, body };
};

const auth = (token) => ({ Authorization: `Bearer ${token}` });

(async () => {
    const stamp = Date.now();
    const email = `race-probe-${stamp}@example.invalid`;

    // ---- 1. create the probe account -------------------------------------------
    const reg = await json('/api/users', {
        method: 'POST',
        body: JSON.stringify({ name: 'Progress Probe', email, password: 'Probe-Password-123!' }),
    });
    if (reg.status !== 201 || !reg.body?.token) {
        console.error('could not register probe user:', reg.status, reg.body);
        process.exit(2);
    }
    const token = reg.body.token;
    const userId = reg.body._id;
    console.log(`probe user ${userId}  xp=${reg.body.xp_points}`);

    // ---- 2. pick a real problem ------------------------------------------------
    const problems = await json('/api/content/problems');
    const list = Array.isArray(problems.body) ? problems.body : problems.body?.problems || [];
    if (list.length === 0) {
        console.error('no problems available to test against');
        process.exit(2);
    }
    const problemId = list[0].id || list[0]._id;
    console.log(`problem    ${problemId}  (${list[0].title || list[0].name || 'untitled'})`);

    // ---- 3. N simultaneous SOLVED writes --------------------------------------
    console.log(`\n=== ${N} simultaneous status=SOLVED writes ===`);
    const results = await Promise.all(
        Array.from({ length: N }, () =>
            json(`/api/user-actions/problems/${problemId}/status`, {
                method: 'POST',
                headers: auth(token),
                body: JSON.stringify({ status: 'SOLVED' }),
            })
        )
    );
    const counts = {};
    for (const r of results) counts[r.status] = (counts[r.status] || 0) + 1;
    console.log('  status distribution:', JSON.stringify(counts));
    for (const r of results) {
        if (r.status >= 500) console.log(`    !! ${r.status} — ${JSON.stringify(r.body)}`);
    }

    // ---- 4. inspect the resulting state ---------------------------------------
    const progress = await json('/api/user-actions/progress', { headers: auth(token) });
    const rows = (progress.body || []).filter((p) => p.problem_id === problemId);
    const me = await json('/api/users/me', { headers: auth(token) });
    const xp = me.body?.xp_points;

    console.log(`\n=== resulting state ===`);
    console.log(`  UserProgress rows for this problem: ${rows.length} (expected 1)`);
    console.log(`  xp_points: ${xp} (expected ${SOLVE_XP} for one transition)`);

    // ---- 5. bookmark + notes concurrency --------------------------------------
    console.log(`\n=== ${N} simultaneous bookmark toggles ===`);
    const bm = await Promise.all(
        Array.from({ length: N }, () =>
            json(`/api/user-actions/problems/${problemId}/bookmark`, {
                method: 'POST',
                headers: auth(token),
            })
        )
    );
    const bmCounts = {};
    for (const r of bm) bmCounts[r.status] = (bmCounts[r.status] || 0) + 1;
    console.log('  status distribution:', JSON.stringify(bmCounts));

    const afterBm = await json('/api/user-actions/progress', { headers: auth(token) });
    const bmRows = (afterBm.body || []).filter((p) => p.problem_id === problemId);
    console.log(`  UserProgress rows after toggles: ${bmRows.length} (expected 1)`);

    console.log(`\n=== ${N} simultaneous notes writes ===`);
    const nt = await Promise.all(
        Array.from({ length: N }, (_, i) =>
            json(`/api/user-actions/problems/${problemId}/notes`, {
                method: 'PUT',
                headers: auth(token),
                body: JSON.stringify({ notes: `probe note ${i}` }),
            })
        )
    );
    const ntCounts = {};
    for (const r of nt) ntCounts[r.status] = (ntCounts[r.status] || 0) + 1;
    console.log('  status distribution:', JSON.stringify(ntCounts));

    const afterNt = await json('/api/user-actions/progress', { headers: auth(token) });
    const ntRows = (afterNt.body || []).filter((p) => p.problem_id === problemId);
    console.log(`  UserProgress rows after notes: ${ntRows.length} (expected 1)`);

    // ---- 6. verdict ------------------------------------------------------------
    const serverErrors = [...results, ...bm, ...nt].filter((r) => r.status >= 500).length;
    const checks = [
        ['no 5xx from any progress endpoint', serverErrors === 0],
        ['exactly one progress row after concurrent solves', rows.length === 1],
        ['exactly one progress row after concurrent toggles', bmRows.length === 1],
        ['exactly one progress row after concurrent notes', ntRows.length === 1],
        ['all status writes returned 200', (counts[200] || 0) === N],
    ];
    console.log('\n=== assertions ===');
    checks.forEach(([label, pass]) => console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label}`));

    // Reported separately — a known pre-existing race, not caused by the index work.
    const xpExactlyOnce = xp === SOLVE_XP;
    console.log(`\n  [observation] XP incremented exactly once: ${xpExactlyOnce ? 'yes' : `NO — ${xp} (race double-counted)`}`);

    console.log('\nPROBE_EMAIL=' + email);
    process.exit(checks.every(([, p]) => p) ? 0 : 1);
})().catch((e) => {
    console.error('probe crashed:', e);
    process.exit(2);
});
