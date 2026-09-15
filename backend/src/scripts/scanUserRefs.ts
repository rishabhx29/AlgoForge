/**
 * Read-only: find every document referencing a given user id.
 * Run: node -r ts-node/register/transpile-only src/scripts/scanUserRefs.ts <userId>
 */
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();
const target = process.argv[2];

async function main() {
    if (!target) {
        console.error('usage: scanUserRefs.ts <userId>');
        process.exit(2);
    }
    console.log(`\nScanning references to user ${target}\n`);

    const checks: Array<[string, () => Promise<any>]> = [
        ['UserProgress (user_id)', () => prisma.userProgress.findMany({ where: { user_id: target } })],
        ['ForumPost (authorId)', () => prisma.forumPost.findMany({ where: { authorId: target } })],
        ['Reply (authorId)', () => prisma.reply.findMany({ where: { authorId: target } })],
        ['User (id itself)', () => prisma.user.findMany({ where: { id: target } })],
    ];

    let total = 0;
    for (const [label, fn] of checks) {
        try {
            const rows = await fn();
            total += rows.length;
            console.log(`${label.padEnd(26)} ${rows.length} document(s)`);
            if (rows.length && rows.length <= 5) {
                rows.forEach((r: any) =>
                    console.log(
                        '   ',
                        JSON.stringify({
                            id: r.id,
                            status: r.status,
                            title: r.title,
                            content: r.content ? String(r.content).slice(0, 40) : undefined,
                            problem_id: r.problem_id,
                        })
                    )
                );
            }
        } catch (e) {
            console.log(`${label.padEnd(26)} ERR ${String((e as Error).message).split('\n')[0]}`);
        }
    }

    console.log(`\ntotal referencing documents: ${total}`);

    // Also report what the KEEP account currently holds, for comparison.
    console.log('\n--- for comparison, the account being KEPT ---');
    try {
        const keep = await prisma.user.findUnique({ where: { id: '6a11ee8e3b0cefed32c844e8' } });
        if (keep) {
            console.log('  name:', keep.name);
            console.log('  email:', keep.email);
            console.log('  xp_points:', (keep as any).xp_points);
            console.log('  streak_days:', (keep as any).streak_days);
        }
    } catch (e) {
        console.log('  ERR', String((e as Error).message).split('\n')[0]);
    }

    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});
