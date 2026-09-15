/**
 * createIndexes — create the database indexes the Prisma schema declares.
 *
 * WHY THIS EXISTS
 * On MongoDB, Prisma's `@unique` is only a *schema declaration*; enforcement lives in a
 * real database index, created only when `prisma db push` / `prisma migrate` is run.
 * That never happened here, so every collection had only the default `_id_` index and
 * the schema's uniqueness guarantees were unenforced (see `auditConstraints.ts`).
 *
 * SCOPE
 * All seven indexes the schema declares are now created. The two `User` unique indexes
 * were originally withheld because duplicate documents existed (MongoDB refuses to build
 * a unique index over violating data); they were added on 2026-09-13 after the duplicate
 * account pair was merged by `mergeDuplicateUser.ts`.
 *
 * Order matters: if you ever restore from an older dump, run `auditConstraints.ts` first.
 * A unique index cannot be built while violating data exists.
 *
 * Idempotent: re-running is safe, an existing index with the same name is reported and
 * skipped rather than treated as an error.
 *
 * USAGE
 *   node -r ts-node/register/transpile-only src/scripts/createIndexes.ts
 */
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

interface IndexSpec {
    collection: string;
    keys: Record<string, 1 | -1>;
    name: string;
    unique?: boolean;
    /**
     * Exclude documents that are MISSING the indexed field. This is the right construct
     * for an optional unique field: MongoDB indexes a missing value as null, so a plain
     * unique index collides across every document that lacks it.
     *
     * Do NOT use `partialFilterExpression` here even though it also works — a filter
     * containing `$type` makes the whole collection unreadable through Prisma:
     * `listIndexes` throws "Unknown tagged value" because Prisma's Extended-JSON
     * deserializer cannot round-trip `$type`. That silently broke introspection on the
     * `User` collection until the index was dropped. `sparse` is a plain boolean and
     * round-trips cleanly.
     *
     * Precondition: the field must be genuinely absent (not present-and-null) on the
     * documents that lack it, otherwise they are still indexed and still collide.
     */
    sparse?: boolean;
    /** Why this index is safe to create now. */
    rationale: string;
}

const INDEXES: IndexSpec[] = [
    {
        collection: 'Topic',
        keys: { id: 1 },
        name: 'id_unique',
        unique: true,
        rationale: 'slug maps to DB field `id`; 31 docs, 0 duplicate / 0 missing values',
    },
    {
        collection: 'LearningPath',
        keys: { id: 1 },
        name: 'id_unique',
        unique: true,
        rationale: 'slug maps to DB field `id`; 6 docs, 0 duplicate / 0 missing values',
    },
    {
        collection: 'UserProgress',
        keys: { user_id: 1, problem_id: 1 },
        name: 'user_id_problem_id_unique',
        unique: true,
        rationale: 'schema @@unique([user_id, problem_id]); 138 rows, 138 distinct pairs',
    },
    {
        collection: 'ForumPost',
        keys: { category: 1, createdAt: -1 },
        name: 'category_createdAt_idx',
        rationale: 'schema @@index([category, createdAt(sort: Desc)]) — query performance',
    },
    {
        collection: 'ForumPost',
        keys: { createdAt: -1 },
        name: 'createdAt_idx',
        rationale: 'schema @@index([createdAt(sort: Desc)]) — query performance',
    },
    {
        // Unblocked on 2026-09-13 after the duplicate account was merged.
        collection: 'User',
        keys: { email: 1 },
        name: 'email_unique',
        unique: true,
        rationale: 'schema email String @unique; 32 docs, 32 distinct values, none missing',
    },
    {
        // Unblocked on 2026-09-13 after the duplicate account was merged.
        // MUST be sparse: 10 of 32 users have no googleId at all, and MongoDB indexes a
        // missing value as null — a plain unique index would collide across all of them.
        // Verified those 10 have the field genuinely absent (not present-and-null).
        collection: 'User',
        keys: { googleId: 1 },
        name: 'googleId_unique_sparse',
        unique: true,
        sparse: true,
        rationale: 'schema googleId String? @unique; sparse over the 22 docs that have a value',
    },
];

async function existingIndexNames(collection: string): Promise<string[]> {
    try {
        const r = (await prisma.$runCommandRaw({ listIndexes: collection })) as any;
        return (r?.cursor?.firstBatch || []).map((i: any) => i.name);
    } catch {
        return [];
    }
}

async function main() {
    console.log('\nCreating declared indexes (verified-clean set only)\n');

    for (const spec of INDEXES) {
        const before = await existingIndexNames(spec.collection);
        if (before.includes(spec.name)) {
            console.log(`SKIP    ${spec.collection}.${spec.name} (already exists)`);
            continue;
        }
        try {
            await prisma.$runCommandRaw({
                createIndexes: spec.collection,
                indexes: [
                    {
                        key: spec.keys,
                        name: spec.name,
                        ...(spec.unique ? { unique: true } : {}),
                        ...(spec.sparse ? { sparse: true } : {}),
                    },
                ],
            });
            console.log(
                `CREATED ${spec.collection}.${spec.name}  ${JSON.stringify(spec.keys)}` +
                    `${spec.unique ? ' UNIQUE' : ''}` +
                    `${spec.sparse ? ' SPARSE' : ''}`
            );
            console.log(`        ${spec.rationale}`);
        } catch (e) {
            console.log(`FAILED  ${spec.collection}.${spec.name}`);
            console.log(`        ${String((e as Error).message).split('\n')[0]}`);
        }
    }

    console.log('\nFinal index state:\n');
    for (const c of ['User', 'Topic', 'LearningPath', 'Problem', 'UserProgress', 'ForumPost', 'Reply']) {
        const idx = await existingIndexNames(c);
        console.log(`  ${c.padEnd(16)} ${idx.join(', ')}`);
    }
    console.log('');

    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error('Index creation failed:', e);
    await prisma.$disconnect();
    process.exit(1);
});
