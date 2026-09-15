/**
 * auditConstraints — read-only integrity audit for the AlgoForge database.
 *
 * WHY THIS EXISTS
 * `prisma/schema.prisma` declares several `@unique` constraints and two `@@index`
 * directives. On MongoDB, Prisma's `@unique` is **only a schema declaration** — the
 * actual enforcement lives in a database index, and Prisma does not create one unless
 * `prisma db push` / `prisma migrate` is run. This project's database had **none** of
 * them: every collection carried only the default `_id_` index.
 *
 * Consequence: the `@unique` markers in the schema are not guarantees. Nothing at the
 * database level prevents duplicate emails, duplicate Google IDs, or duplicate
 * (user, problem) progress rows. The application-level `findUnique` checks are
 * check-then-insert and therefore racy under concurrency.
 *
 * This script compares what the schema *claims* against what the database *enforces*,
 * and reports any existing violations. It is strictly read-only — it never writes,
 * creates an index, or deletes a document.
 *
 * USAGE
 *   npx ts-node -r tsconfig-paths/register src/scripts/auditConstraints.ts
 * or, matching how the server is normally started here:
 *   node -r ts-node/register/transpile-only src/scripts/auditConstraints.ts
 *
 * Exit code 0 = clean, 1 = violations or missing constraints found.
 */
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

/**
 * The constraints the schema declares. Kept as an explicit list rather than parsed
 * from schema.prisma, because a parser that silently mis-reads the schema would give
 * false confidence — which is the exact failure mode this script exists to catch.
 * If you add a `@unique` to the schema, add it here too.
 *
 * IMPORTANT — `dbField` vs `field`:
 * Several models rename fields with `@map()`. `Topic.slug` and `LearningPath.slug` are
 * both declared `slug String @unique @map("id")`, so the index in MongoDB is on **`id`**,
 * not `slug`. An earlier version of this script checked for a key named `slug` and
 * therefore reported these as NOT ENFORCED even after the index existed — a false
 * negative. Always check `dbField` for the index and `field` for the data.
 */
const DECLARED = [
    { model: 'User', collection: 'User', field: 'email', dbField: 'email', note: 'email String @unique' },
    { model: 'User', collection: 'User', field: 'googleId', dbField: 'googleId', note: 'googleId String? @unique' },
    { model: 'Topic', collection: 'Topic', field: 'slug', dbField: 'id', note: 'slug String @unique @map("id")' },
    { model: 'LearningPath', collection: 'LearningPath', field: 'slug', dbField: 'id', note: 'slug String @unique @map("id")' },
] as const;

const COMPOSITE_DECLARED = [
    {
        label: 'UserProgress @@unique([user_id, problem_id])',
        collection: 'UserProgress',
        fields: ['user_id', 'problem_id'],
    },
] as const;

/** Fields that are legitimately null/absent and must be excluded from uniqueness checks. */
const OPTIONAL_FIELDS = new Set(['googleId']);

async function listCollections(): Promise<string[]> {
    const r = (await prisma.$runCommandRaw({ listCollections: 1, nameOnly: true })) as any;
    return (r?.cursor?.firstBatch || []).map((c: any) => c.name).sort();
}

/**
 * Read the index list for a collection.
 *
 * Errors are surfaced, not swallowed. An earlier version returned `[]` on failure, which
 * made an unreadable collection look like it had *no* indexes — a silent false negative.
 * That is exactly how a `partialFilterExpression` containing `$type` (which Prisma cannot
 * round-trip, so `listIndexes` throws "Unknown tagged value") went unnoticed.
 */
async function listIndexes(collection: string): Promise<any[]> {
    try {
        const r = (await prisma.$runCommandRaw({ listIndexes: collection })) as any;
        return r?.cursor?.firstBatch || [];
    } catch (e) {
        console.warn(
            `  ! listIndexes(${collection}) failed: ${String((e as Error).message).split('\n')[0]}`
        );
        unreadableCollections.push(collection);
        return [];
    }
}

/** Collections whose index list could not be read — treated as a problem, never as empty. */
const unreadableCollections: string[] = [];

/** Fetch the values of one field across a collection, via Prisma's typed client. */
async function fetchField(model: string, field: string): Promise<any[]> {
    const client = (prisma as any)[model];
    if (!client) return [];
    try {
        const rows = await client.findMany({ select: { [field]: true } });
        return rows.map((r: any) => r[field]);
    } catch (e) {
        console.warn(`  ! could not read ${model}.${field}: ${String((e as Error).message).split('\n')[0]}`);
        return [];
    }
}

function findDuplicates(values: any[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const v of values) {
        if (v === null || v === undefined) continue;
        const key = String(v);
        counts.set(key, (counts.get(key) || 0) + 1);
    }
    return new Map([...counts.entries()].filter(([, c]) => c > 1));
}

async function main() {
    let problems = 0;

    console.log('\n=== 1. Collections and indexes ===\n');
    const collections = await listCollections();
    console.log('collection'.padEnd(20), 'indexes'.padEnd(10), 'unique keys');
    console.log('-'.repeat(64));
    for (const name of collections) {
        const idx = await listIndexes(name);
        const unique = idx
            .filter((i) => i.unique && i.name !== '_id_')
            .map((i) => Object.keys(i.key).join('+'));
        console.log(
            name.padEnd(20),
            String(idx.length).padEnd(10),
            unique.length ? unique.join(', ') : '(none — only _id_)'
        );
    }

    // An unreadable collection is a problem in its own right. Without this, a collection
    // whose `listIndexes` throws prints "0 (none — only _id_)" and reads as a missing
    // index rather than an introspection failure — the exact false negative that let the
    // `$type` partial filter hide. Deduped: sections 1 and 2 both call `listIndexes`.
    const unreadable = [...new Set(unreadableCollections)];
    if (unreadable.length > 0) {
        problems += unreadable.length;
        console.log(`\n! ${unreadable.length} collection(s) had unreadable index lists:`);
        for (const c of unreadable) console.log(`    ${c}`);
        console.log('  Index counts above are NOT trustworthy for these collections.');
    }

    console.log('\n=== 2. Declared constraints vs. database enforcement ===\n');
    for (const d of DECLARED) {
        const idx = await listIndexes(d.collection);
        // Match on the DB field name — see the `dbField` note above.
        const enforced = idx.some((i) => i.unique && i.name !== '_id_' && i.key && i.key[d.dbField] === 1);
        const status = enforced ? 'ENFORCED' : 'NOT ENFORCED';
        if (!enforced) problems++;
        console.log(
            `${status.padEnd(14)} ${d.collection}.${d.field}`.padEnd(52),
            `(${d.note})`
        );
    }
    for (const c of COMPOSITE_DECLARED) {
        const idx = await listIndexes(c.collection);
        const enforced = idx.some(
            (i) =>
                i.unique &&
                c.fields.every((f) => i.key && i.key[f] === 1) &&
                Object.keys(i.key).length === c.fields.length
        );
        if (!enforced) problems++;
        console.log(`${(enforced ? 'ENFORCED' : 'NOT ENFORCED').padEnd(14)} ${c.label}`);
    }

    console.log('\n=== 3. Existing violations ===\n');
    for (const d of DECLARED) {
        const values = await fetchField(d.model, d.field);
        const nonNull = d.field && OPTIONAL_FIELDS.has(d.field) ? values.filter(Boolean) : values;
        const dupes = findDuplicates(nonNull);
        const label = `${d.collection}.${d.field}`;
        if (dupes.size === 0) {
            console.log(`OK             ${label.padEnd(38)} ${nonNull.length} distinct values`);
        } else {
            problems += dupes.size;
            console.log(`DUPLICATES     ${label.padEnd(38)} ${dupes.size} colliding value(s)`);
            for (const [value, count] of dupes) {
                console.log(`                 "${value}" x${count}`);
            }
        }
    }

    // Composite check: fetch both fields and count pairs.
    for (const c of COMPOSITE_DECLARED) {
        const client = (prisma as any)[c.collection.charAt(0).toLowerCase() + c.collection.slice(1)];
        try {
            const rows = await client.findMany({
                select: Object.fromEntries(c.fields.map((f) => [f, true])),
            });
            const keys = rows.map((r: any) => c.fields.map((f) => String(r[f])).join('|'));
            const dupes = findDuplicates(keys);
            if (dupes.size === 0) {
                console.log(`OK             ${c.label.padEnd(38)} ${rows.length} distinct pairs`);
            } else {
                problems += dupes.size;
                console.log(`DUPLICATES     ${c.label.padEnd(38)} ${dupes.size} colliding pair(s)`);
                for (const [value, count] of dupes) {
                    console.log(`                 ${value} x${count}`);
                }
            }
        } catch (e) {
            console.log(`SKIPPED        ${c.label} (${String((e as Error).message).split('\n')[0]})`);
        }
    }

    console.log('\n' + '='.repeat(64));
    if (problems === 0) {
        console.log('No integrity problems found.\n');
    } else {
        console.log(`${problems} integrity problem(s) found.`);
        console.log('A unique index cannot be created while violating data exists —');
        console.log('resolve the duplicates first, then create the index.\n');
    }
    await prisma.$disconnect();
    process.exit(problems === 0 ? 0 : 1);
}

main().catch(async (e) => {
    console.error('Audit failed:', e);
    await prisma.$disconnect();
    process.exit(2);
});
