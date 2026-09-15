/**
 * mergeDuplicateUser — consolidate two User documents that share an email/googleId.
 *
 * CONTEXT
 * `User.email` and `User.googleId` were never enforced by a database index (Prisma's
 * `@unique` is only a declaration on MongoDB), so one person ended up with two accounts:
 * an older password signup and a newer Google signup, sharing an email and a googleId.
 *
 * The two accounts hold DISJOINT progress, so deleting either outright would destroy data.
 * This script consolidates them onto the KEEP account:
 *   - re-points the REMOVE account's UserProgress rows onto KEEP
 *   - rebuilds KEEP.solvedProblems from the union of both accounts' SOLVED rows
 *   - unions the bookmark arrays
 *   - recomputes xp_points from the merged solved count (XP is a pure +25 per solve)
 *   - carries over the password hash if KEEP has none (otherwise email login breaks)
 *   - takes max() for streak_days and last_active
 *   - then deletes the REMOVE document
 *
 * SAFETY
 *   - Default is a DRY RUN. Nothing is written without `--apply`.
 *   - Always writes a JSON backup of both user documents and every re-pointed
 *     UserProgress row before the first write.
 *   - `UserProgress @@unique([user_id, problem_id])` now exists, so an accidental
 *     overlap would abort rather than create duplicates.
 *
 * USAGE
 *   node -r ts-node/register/transpile-only src/scripts/mergeDuplicateUser.ts            # dry run
 *   node -r ts-node/register/transpile-only src/scripts/mergeDuplicateUser.ts --apply    # execute
 */
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

/** Account to keep (newer Google signup — the active login). */
const KEEP = '6a11ee8e3b0cefed32c844e8';
/** Account to fold in and then remove (older password signup). */
const REMOVE = '69865a7f0661b479f33fe959';

const APPLY = process.argv.includes('--apply');
const SOLVE_XP = 25;
const BACKUP_DIR = 'C:/Rishabh/_backup_algoforge';

async function rawFind(collection: string, filter: any) {
    const r = (await prisma.$runCommandRaw({ find: collection, filter })) as any;
    return r?.cursor?.firstBatch || [];
}

/**
 * `$runCommandRaw` returns MongoDB Extended JSON, so a date arrives as `{ $date: "..." }`
 * rather than a JS Date. Passing that straight to `new Date()` yields Invalid Date.
 * This unwraps either shape.
 */
function toDate(value: any): Date {
    if (value instanceof Date) return value;
    if (value && typeof value === 'object' && '$date' in value) return new Date(value.$date);
    return new Date(value);
}

function isoOrNull(value: any): string | null {
    const d = toDate(value);
    return isNaN(d.getTime()) ? null : d.toISOString();
}

async function main() {
    console.log(`\nmergeDuplicateUser — ${APPLY ? 'APPLY' : 'DRY RUN (pass --apply to execute)'}\n`);

    // ── 1. Load both accounts ────────────────────────────────────────────────
    const keepDoc = (await rawFind('User', { _id: { $oid: KEEP } }))[0];
    const removeDoc = (await rawFind('User', { _id: { $oid: REMOVE } }))[0];

    if (!keepDoc || !removeDoc) {
        console.error(`ABORT — could not load both users (keep=${!!keepDoc}, remove=${!!removeDoc}).`);
        console.error('If REMOVE is already gone, the merge has already run.');
        process.exit(1);
    }

    // ── 2. Guard: both must genuinely be the same identity ───────────────────
    if (keepDoc.email !== removeDoc.email) {
        console.error(`ABORT — emails differ ("${keepDoc.email}" vs "${removeDoc.email}").`);
        process.exit(1);
    }

    const removeRows = await prisma.userProgress.findMany({ where: { user_id: REMOVE } });
    const keepRows = await prisma.userProgress.findMany({ where: { user_id: KEEP } });

    const keepProblems = new Set(keepRows.map((r) => r.problem_id));
    const overlap = removeRows.filter((r) => keepProblems.has(r.problem_id));
    if (overlap.length > 0) {
        console.error(`ABORT — ${overlap.length} problem(s) exist on both accounts; merging would`);
        console.error('violate UserProgress @@unique([user_id, problem_id]). Resolve manually.');
        overlap.slice(0, 5).forEach((r) => console.error('   ' + r.problem_id));
        process.exit(1);
    }

    // ── 3. Compute the merged state ──────────────────────────────────────────
    const keepSolved = keepRows.filter((r) => r.status === 'SOLVED');
    const removeSolved = removeRows.filter((r) => r.status === 'SOLVED');

    // Preserve existing solvedAt where present; derive from the row's updatedAt otherwise
    // (verified: solvedAt mirrors UserProgress.updatedAt).
    const solvedAtByProblem = new Map<string, string>();
    for (const s of (keepDoc.solvedProblems || [])) {
        if (s?.problemId) {
            const iso = isoOrNull(s.solvedAt);
            if (iso) solvedAtByProblem.set(s.problemId, iso);
        }
    }
    for (const r of removeSolved) {
        if (!solvedAtByProblem.has(r.problem_id)) {
            const iso = isoOrNull(r.updatedAt);
            if (iso) solvedAtByProblem.set(r.problem_id, iso);
        }
    }
    for (const r of keepSolved) {
        if (!solvedAtByProblem.has(r.problem_id)) {
            const iso = isoOrNull(r.updatedAt);
            if (iso) solvedAtByProblem.set(r.problem_id, iso);
        }
    }

    const mergedSolved = [...solvedAtByProblem.entries()]
        .map(([problemId, solvedAt]) => ({ problemId, solvedAt: new Date(solvedAt) }))
        .sort((a, b) => a.solvedAt.getTime() - b.solvedAt.getTime());

    // Bookmarks: the user document's array plus any row flagged is_bookmarked.
    const mergedBookmarks = new Set<string>([
        ...((keepDoc.bookmarks as string[]) || []),
        ...((removeDoc.bookmarks as string[]) || []),
        ...keepRows.filter((r) => r.is_bookmarked).map((r) => r.problem_id),
        ...removeRows.filter((r) => r.is_bookmarked).map((r) => r.problem_id),
    ]);

    const mergedXp = mergedSolved.length * SOLVE_XP;
    const mergedStreak = Math.max(keepDoc.streak_days || 0, removeDoc.streak_days || 0);
    const mergedLastActive =
        toDate(keepDoc.last_active) > toDate(removeDoc.last_active)
            ? keepDoc.last_active
            : removeDoc.last_active;

    // Carry the password hash over only if KEEP has none — otherwise email login is lost.
    const carryPassword = !keepDoc.password && !!removeDoc.password;

    console.log('PLAN');
    console.log('-'.repeat(66));
    console.log(`  keep    ${KEEP}  (${keepDoc.name})`);
    console.log(`  remove  ${REMOVE}  (${removeDoc.name})`);
    console.log('');
    console.log(`  UserProgress rows re-pointed   ${removeRows.length}`);
    console.log(`  solvedProblems                 ${(keepDoc.solvedProblems || []).length} -> ${mergedSolved.length}`);
    console.log(`  bookmarks                      ${(keepDoc.bookmarks || []).length} -> ${mergedBookmarks.size}`);
    console.log(`  xp_points                      ${keepDoc.xp_points} -> ${mergedXp}`);
    console.log(`  streak_days                    ${keepDoc.streak_days} -> ${mergedStreak}`);
    console.log(`  last_active                    -> ${toDate(mergedLastActive).toISOString()}`);
    console.log(`  password hash carried over     ${carryPassword ? 'YES (keep has none)' : 'no (keep already has one)'}`);
    console.log(`  avatar                         kept as-is (${keepDoc.avatar ? 'has value' : 'none'})`);
    console.log(`  delete document                ${REMOVE}`);

    if (!APPLY) {
        console.log('\nDry run complete — nothing was written. Re-run with --apply to execute.\n');
        await prisma.$disconnect();
        return;
    }

    // ── 4. Backup before the first write ─────────────────────────────────────
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `user-merge-${stamp}.json`);
    fs.writeFileSync(
        backupPath,
        JSON.stringify(
            {
                mergedAt: new Date().toISOString(),
                keep: keepDoc,
                remove: removeDoc,
                rePointedProgressRows: removeRows,
                keepProgressRows: keepRows,
            },
            null,
            2
        )
    );
    console.log(`\nbackup written: ${backupPath}`);

    // ── 5. Re-point the progress rows ────────────────────────────────────────
    const upd = (await prisma.$runCommandRaw({
        update: 'UserProgress',
        updates: [
            {
                q: { user_id: { $oid: REMOVE } },
                u: { $set: { user_id: { $oid: KEEP } } },
                multi: true,
            },
        ],
    })) as any;
    const modified = upd?.nModified ?? upd?.n ?? '?';
    console.log(`re-pointed UserProgress rows: ${modified} (expected ${removeRows.length})`);
    if (modified !== removeRows.length) {
        console.error('WARNING — modified count does not match expectation. Investigate before continuing.');
    }

    // ── 6. Update the surviving account ──────────────────────────────────────
    await prisma.user.update({
        where: { id: KEEP },
        data: {
            solvedProblems: mergedSolved,
            bookmarks: [...mergedBookmarks],
            xp_points: mergedXp,
            streak_days: mergedStreak,
            last_active: toDate(mergedLastActive),
            ...(carryPassword ? { password: removeDoc.password as string } : {}),
        },
    });
    console.log('updated surviving account');

    // ── 7. Remove the duplicate ──────────────────────────────────────────────
    await prisma.user.delete({ where: { id: REMOVE } });
    console.log(`deleted ${REMOVE}`);

    console.log('\nmerge complete\n');
    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error('merge failed:', e);
    await prisma.$disconnect();
    process.exit(1);
});
