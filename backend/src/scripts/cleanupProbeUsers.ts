/**
 * cleanupProbeUsers — remove throwaway accounts created by `scripts/probe-signup-race.cjs`.
 *
 * SAFETY
 * Matches on TWO conditions that can only ever describe a synthetic probe account:
 *   - the local part starts with `race-probe-`, and
 *   - the domain is `example.invalid` (a reserved, non-routable TLD).
 * It can therefore never touch a real user.
 *
 * Because the probe exercises the progress endpoints, probe users DO accumulate
 * `UserProgress` rows — so those are deleted first (and logged), before the user.
 * The count is printed either way so a surprising number is visible, not silent.
 *
 * Dry run by default; pass `--apply` to delete.
 *
 * USAGE
 *   node -r ts-node/register/transpile-only src/scripts/cleanupProbeUsers.ts
 *   node -r ts-node/register/transpile-only src/scripts/cleanupProbeUsers.ts --apply
 */
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

const isProbeEmail = (email: string | null | undefined): boolean =>
    !!email && email.startsWith('race-probe-') && email.endsWith('@example.invalid');

async function main() {
    console.log(`\ncleanupProbeUsers — ${APPLY ? 'APPLY (will delete)' : 'DRY RUN'}\n`);

    const all = await prisma.user.findMany({
        select: { id: true, name: true, email: true, xp_points: true },
    });
    const probes = all.filter((u) => isProbeEmail(u.email));

    if (probes.length === 0) {
        console.log('No probe accounts found. Nothing to do.\n');
        await prisma.$disconnect();
        return;
    }

    for (const p of probes) {
        const progressRows = await prisma.userProgress.findMany({
            where: { user_id: p.id },
            select: { id: true, problem_id: true, status: true },
        });
        console.log(`  ${p.id}  ${p.email}  xp=${p.xp_points}  progressRows=${progressRows.length}`);
        for (const r of progressRows) {
            console.log(`      progress ${r.id}  problem=${r.problem_id}  status=${r.status}`);
        }
        if (!APPLY) continue;

        const deleted = await prisma.userProgress.deleteMany({ where: { user_id: p.id } });
        console.log(`    deleted ${deleted.count} progress row(s)`);
        await prisma.user.delete({ where: { id: p.id } });
        console.log('    deleted user');
    }

    if (!APPLY) console.log('\nDry run only — re-run with --apply to delete.');

    const remaining = (await prisma.user.findMany({ select: { email: true } })).filter((u) =>
        isProbeEmail(u.email)
    ).length;
    console.log(`\nprobe accounts remaining: ${remaining}\n`);

    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error('cleanup failed:', e);
    await prisma.$disconnect();
    process.exit(1);
});
