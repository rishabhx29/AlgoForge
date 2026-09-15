/**
 * Single-write diagnostic: register a user, apply ONE SOLVED status, read back the
 * progress row and XP. Separates "the XP logic is broken" from "concurrency breaks it".
 *
 * Run:  node backend/scripts/diag-single-solve.cjs
 */
const BASE = process.env.AF_API || 'http://localhost:5000';

const json = async (path, opts = {}) => {
    // `headers` merged and applied LAST — see the note in probe-progress-race.cjs.
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
    const email = `race-probe-diag-${Date.now()}@example.invalid`;
    const reg = await json('/api/users', {
        method: 'POST',
        body: JSON.stringify({ name: 'Diag Probe', email, password: 'Probe-Password-123!' }),
    });
    if (reg.status !== 201) {
        console.error('register failed', reg.status, reg.body);
        process.exit(2);
    }
    const token = reg.body.token;
    const auth = { Authorization: `Bearer ${token}` };
    console.log('registered', reg.body._id, 'xp=', reg.body.xp_points);

    const problems = await json('/api/content/problems');
    const list = Array.isArray(problems.body) ? problems.body : problems.body?.problems || [];
    const problemId = list[0].id || list[0]._id;

    const write = await json(`/api/user-actions/problems/${problemId}/status`, {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ status: 'SOLVED' }),
    });
    console.log('write status:', write.status, 'returned row:', JSON.stringify(write.body));

    const progress = await json('/api/user-actions/progress', { headers: auth });
    console.log('progress rows:', JSON.stringify(progress.body));

    const me = await json('/api/users/me', { headers: auth });
    console.log('me.xp_points:', me.body?.xp_points);
    console.log('me.solvedProblems:', JSON.stringify(me.body?.solvedProblems));
    console.log('me.streak_days:', me.body?.streak_days);

    console.log('\nPROBE_EMAIL=' + email);
})().catch((e) => {
    console.error('diag crashed:', e);
    process.exit(2);
});
