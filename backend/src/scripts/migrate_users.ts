import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { config } from '../config/env';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const uri = config.MONGO_URI as string;

/** Read either a raw id string or a Mongo extended-JSON `{ $oid }` wrapper. */
function recordId(value: unknown): string {
    const wrapped = value as { $oid?: string } | undefined;
    return wrapped?.$oid ?? (value as string);
}

/** Read either a raw date or a Mongo extended-JSON `{ $date }` wrapper. */
function recordDate(value: unknown): Date {
    if (!value) return new Date();
    const wrapped = value as { $date?: unknown };
    return new Date((wrapped.$date ?? value) as string);
}

type LegacyRecord = Record<string, any>;

/** Map a legacy `test.users` document onto the Prisma User shape. */
function mapLegacyUser(user: LegacyRecord) {
    return {
        id: recordId(user._id),
        name: user.name,
        email: user.email,
        password: user.password,
        googleId: user.googleId,
        role: user.role || 'user',
        isBanned: user.isBanned || false,
        avatar: user.avatar,
        xp_points: user.xp_points || 0,
        streak_days: user.streak_days || 0,
        last_active: recordDate(user.last_active),
        createdAt: recordDate(user.createdAt),
        updatedAt: recordDate(user.updatedAt),
        bookmarks: user.bookmarks || []
    };
}

/** Map a legacy `test.userprogress(es)` document onto the Prisma UserProgress shape. */
function mapLegacyProgress(progress: LegacyRecord) {
    return {
        id: recordId(progress._id),
        user_id: recordId(progress.user_id),
        problem_id: recordId(progress.problem_id),
        status: progress.status || 'TODO',
        is_bookmarked: progress.is_bookmarked || false,
        notes: progress.notes || '',
        createdAt: recordDate(progress.createdAt),
        updatedAt: recordDate(progress.updatedAt),
    };
}

/** Insert a legacy user if not already present; logs and skips invalid records. */
async function insertUserIfMissing(algoforgePrisma: PrismaClient, user: LegacyRecord) {
    const exists = await algoforgePrisma.user.findUnique({
        where: { id: recordId(user._id) }
    }).catch(() => null);

    if (exists) return;

    try {
        await algoforgePrisma.user.create({ data: mapLegacyUser(user) });
    } catch (e) {
        console.error('Skipped a user due to validation error:', user.email, e);
    }
}

/** Insert a legacy progress record if not already present; logs and skips orphans. */
async function insertProgressIfMissing(algoforgePrisma: PrismaClient, progress: LegacyRecord) {
    const exists = await algoforgePrisma.userProgress.findUnique({
        where: { id: recordId(progress._id) }
    }).catch(() => null);

    if (exists) return;

    try {
        await algoforgePrisma.userProgress.create({ data: mapLegacyProgress(progress) });
    } catch (e) {
        console.log('Skipped a progress record due to missing user/problem relation.', e);
    }
}

async function migrate() {
    console.log("Starting migration using Prisma engine to bypass DNS issues...");

    // 1. Connect to the 'test' database using Prisma
    const testDbUri = uri.replace('/algoforge', '/test');
    const testPrisma = new PrismaClient({
        datasources: { db: { url: testDbUri } }
    });

    // 2. Connect to the 'algoforge' database
    const algoforgePrisma = new PrismaClient({
        datasources: { db: { url: uri } }
    });

    try {
        console.log("Fetching old users from 'test' database...");

        // Find users from test db using raw command
        const usersResult = await testPrisma.$runCommandRaw({
            find: "users",
            filter: {}
        }) as any;

        const oldUsers = usersResult?.cursor?.firstBatch || [];
        console.log(`Found ${oldUsers.length} old users.`);

        for (const user of oldUsers) {
            await insertUserIfMissing(algoforgePrisma, user);
        }
        console.log("Users migrated successfully!");

        console.log("Fetching old UserProgress from 'test' database...");

        // Find user progress from test db (collection name varies by deployment)
        const progressResult = await testPrisma.$runCommandRaw({
            find: "userprogresses",
            filter: {}
        }) as any;
        const oldProgress1 = progressResult?.cursor?.firstBatch || [];

        const progressResultFallback = await testPrisma.$runCommandRaw({
            find: "userprogress",
            filter: {}
        }) as any;
        const oldProgress2 = progressResultFallback?.cursor?.firstBatch || [];

        const allOldProgress = [...oldProgress1, ...oldProgress2];
        console.log(`Found ${allOldProgress.length} progress records.`);

        for (const progress of allOldProgress) {
            await insertProgressIfMissing(algoforgePrisma, progress);
        }
        console.log("UserProgress migrated successfully!");

        console.log("\nMigration completed! You can now run your Prisma app.");

    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await testPrisma.$disconnect();
        await algoforgePrisma.$disconnect();
    }
}

migrate();
