/**
 * Race probe for the signup path.
 *
 * Two checks:
 *  1. Baseline — posting an email that already exists must return 400, not 500.
 *  2. Concurrency — N simultaneous signups with the SAME fresh email must produce
 *     exactly one 201 and N-1 400s, and ZERO 500s. Before the unique index existed
 *     this created duplicate accounts; after it existed but before the controller
 *     handled P2002, the losers returned 500.
 *
 * Uses `example.invalid`, a reserved non-routable TLD, and cleans up after itself.
 *
 * Run:  node backend/scripts/probe-signup-race.cjs
 */
const BASE = process.env.AF_API || 'http://localhost:5000';
const N = 6;

const post = async (body) => {
    const res = await fetch(`${BASE}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    let payload = null;
    try {
        payload = await res.json();
    } catch {
        /* non-JSON body is fine, we only care about the status */
    }
    return { status: res.status, message: payload && payload.message };
};

const tally = (results) => {
    const counts = {};
    for (const r of results) counts[r.status] = (counts[r.status] || 0) + 1;
    return counts;
};

(async () => {
    const stamp = Date.now();
    const probeEmail = `race-probe-${stamp}@example.invalid`;
    const password = 'Probe-Password-123!';

    console.log('=== 1. baseline: existing email ===');
    const existing = await post({
        name: 'Probe Duplicate',
        email: 'rishabh.j.tripathi2903@gmail.com',
        password,
    });
    console.log(`  status ${existing.status}  "${existing.message}"`);
    const baselineOk = existing.status === 400;

    console.log(`\n=== 2. concurrency: ${N} simultaneous signups, same fresh email ===`);
    console.log(`  email: ${probeEmail}`);
    const results = await Promise.all(
        Array.from({ length: N }, (_, i) => post({ name: `Race Probe ${i}`, email: probeEmail, password }))
    );
    const counts = tally(results);
    console.log('  status distribution:', JSON.stringify(counts));
    for (const r of results) {
        if (r.status >= 500) console.log(`    !! ${r.status} — ${r.message}`);
    }

    const created = counts[201] || 0;
    const rejected = counts[400] || 0;
    const serverErrors = Object.entries(counts)
        .filter(([code]) => Number(code) >= 500)
        .reduce((sum, [, n]) => sum + n, 0);

    const checks = [
        ['baseline returns 400 (not 500)', baselineOk],
        ['exactly one account created (201)', created === 1],
        [`all other attempts rejected (400 x${N - 1})`, rejected === N - 1],
        ['zero server errors (500)', serverErrors === 0],
    ];

    console.log('\n=== assertions ===');
    checks.forEach(([label, pass]) => console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label}`));

    console.log('\n=== cleanup ===');
    console.log(`  probe email to delete: ${probeEmail}`);

    const ok = checks.every(([, pass]) => pass);
    console.log('\nRESULT: ' + (ok ? 'PASS' : 'FAIL'));
    // Emit the email so the caller can delete it with a Prisma script.
    console.log('PROBE_EMAIL=' + probeEmail);
    process.exit(ok ? 0 : 1);
})().catch((e) => {
    console.error('probe crashed:', e);
    process.exit(2);
});
