import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/db';
import { calculateLevel } from '../config/xpConfig';
import { getOrSet, TTL } from '../utils/cache';

// @desc    Get leaderboard data
// @route   GET /api/users/leaderboard
// @access  Public
export const getLeaderboard = async (req: Request, res: Response) => {
    try {
        const { limit = 10, sortBy = 'xp' } = req.query;
        const limitNum = Math.min(Number(limit) || 10, 100);
        const sortKey = sortBy === 'solved' || sortBy === 'streak' ? sortBy : 'xp';

        // Cached for 30s: the leaderboard is read by every visitor but only
        // changes when someone solves a problem. A short TTL keeps ranks fresh
        // while turning repeated scans into a single query per interval.
        const formatted = await getOrSet(`leaderboard:${sortKey}:${limitNum}`, TTL.LEADERBOARD, async () => {
            // Sort on the raw field BEFORE projecting. Sorting after $project
            // (previous behavior) forces Mongo to materialize every user doc
            // in memory; sorting first lets an index on the sort field drive
            // the query. Only the computed `solvedCount` sort still needs the
            // project-first path.
            let pipeline: any[] = [];

            if (sortKey === 'xp') {
                pipeline.push({ $sort: { xp_points: -1 } });
            } else if (sortKey === 'streak') {
                pipeline.push({ $sort: { streak_days: -1 } });
            }

            pipeline.push({
                $project: {
                    name: 1,
                    pid: 1,
                    xp_points: 1,
                    streak_days: 1,
                    solvedProblems: 1,
                    avatar: 1,
                    solvedCount: { $size: { $ifNull: ["$solvedProblems", []] } }
                }
            });

            if (sortKey === 'solved') {
                pipeline.push({ $sort: { solvedCount: -1 } });
            }

            pipeline.push({ $limit: limitNum });

            const leaderboard = await prisma.user.aggregateRaw({ pipeline }) as unknown as any[];

            // Ensure every ranked user has a public surrogate key. Users created
            // before `pid` existed get one lazily (backfill-on-read). The pid is
            // random and stored — never derived from the ObjectId.
            for (const row of leaderboard as any[]) {
                if (!row.pid) {
                    const pid = randomPid();
                    try {
                        await prisma.user.updateMany({
                            where: { id: String(row._id?.$oid || row._id), pid: null },
                            data: { pid }
                        });
                        row.pid = pid;
                    } catch {
                        // Unique-collision (astronomically unlikely) or lost race —
                        // re-read the row so we still return a valid key.
                        const fresh = await prisma.user.findUnique({
                            where: { id: String(row._id?.$oid || row._id) },
                            select: { pid: true }
                        });
                        row.pid = fresh?.pid || pid;
                    }
                }
            }

            return leaderboard.map((user: any, index: number) => ({
                // Public surrogate key: the raw Mongo ObjectId is never exposed,
                // so harvested ids cannot be replayed as JWT subjects.
                pid: user.pid,
                name: user.name,
                avatar: user.avatar || (user.name ? user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'U'),
                xp: user.xp_points || 0,
                streak: user.streak_days || 0,
                solved: user.solvedCount || 0,
                rank: index + 1
            }));
        });

        res.status(200).json(formatted);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

function randomPid(): string {
    const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const bytes = crypto.randomBytes(12);
    let out = '';
    for (let i = 0; i < 12; i++) out += alphabet[bytes[i] % alphabet.length];
    return 'u_' + out;
}

// @desc    Get dashboard stats for logged-in user (rank, streak, weekly activity)
// @route   GET /api/users/dashboard-stats
// @access  Private
export const getDashboardStats = async (req: Request | any, res: Response) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const usersWithMoreXP = await prisma.user.count({ where: { xp_points: { gt: user.xp_points || 0 } } });
        const rank = usersWithMoreXP + 1;
        const totalUsers = await prisma.user.count();
        const topPercent = totalUsers > 0 ? Math.round((rank / totalUsers) * 100) : 100;

        // ─────────────────────────────────────────────
        // UTC-based streak validation for dashboard display
        // ─────────────────────────────────────────────
        // Reset streak to 0 if last_active is not today or yesterday (UTC).
        // This handles cases where the user missed a UTC day.
        // All date comparisons use UTC via toISOString().split('T')[0].
        // ─────────────────────────────────────────────
        let currentStreak = user.streak_days || 0;
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const lastActiveStr = user.last_active ? new Date(user.last_active).toISOString().split('T')[0] : null;

        if (lastActiveStr !== todayStr && lastActiveStr !== yesterdayStr) {
            currentStreak = 0;
        }

        const weekDays: string[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            weekDays.push(d.toISOString().split('T')[0]);
        }

        const activityLog = user.activityLog || [];
        const weeklyActivity = weekDays.map((dateStr: string) => {
            const entry = activityLog.find((log: any) => log.date === dateStr);
            return {
                date: dateStr,
                count: entry ? entry.count : 0
            };
        });

        res.status(200).json({
            rank,
            totalUsers,
            topPercent,
            currentStreak,
            weeklyActivity
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
// @desc    Get the authenticated user's leaderboard rank (by XP)
// @route   GET /api/users/leaderboard/me
// @access  Private
export const getMyRank = async (req: Request | any, res: Response) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { xp_points: true }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Rank = number of users with strictly more XP, plus one.
        const usersWithMoreXP = await prisma.user.count({
            where: { xp_points: { gt: user.xp_points || 0 } }
        });

        res.status(200).json({ rank: usersWithMoreXP + 1 });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Resolve a public profile surrogate key (pid) to a user id
// @route   GET /api/users/profile-key/:pid
// @access  Public
// The public leaderboard exposes only the surrogate pid — never raw Mongo
// ObjectIds — so clients resolve the pid here before loading the profile.
export const resolveProfileKey = async (req: Request, res: Response) => {
    try {
        const { pid } = req.params;
        const user = await prisma.user.findFirst({
            where: { pid },
            select: { id: true }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ userId: user.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get public profile for a user
// @route   GET /api/users/:userId/profile
// @access  Public
export const getUserProfile = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                avatar: true,
                avatarUrl: true,
                bio: true,
                xp_points: true,
                streak_days: true,
                solvedProblems: true,
                createdAt: true,
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            id: user.id,
            name: user.name,
            avatar: user.avatarUrl || user.avatar || null,
            bio: user.bio || '',
            xp: user.xp_points || 0,
            streak: user.streak_days || 0,
            solved: user.solvedProblems?.length || 0,
            level: calculateLevel(user.xp_points || 0),
            memberSince: user.createdAt,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};


export const updateUserProfile = async (req: Request | any, res: Response) => {
    try {
        const userId = req.params.userId;
        const { bio, avatarUrl } = req.body;

        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (req.user.id !== userId) {
            return res.status(403).json({ message: 'You can only edit your own profile' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                bio: bio !== undefined ? bio : user.bio,
                avatarUrl: avatarUrl !== undefined ? avatarUrl : user.avatarUrl,
            },
        });

        res.status(200).json({
            id: updatedUser.id,
            name: updatedUser.name,
            avatar: updatedUser.avatarUrl || updatedUser.avatar || null,
            bio: updatedUser.bio || '',
            xp: updatedUser.xp_points,
            streak: updatedUser.streak_days,
            solved: updatedUser.solvedProblems?.length || 0,
            level: calculateLevel(updatedUser.xp_points || 0),
            memberSince: updatedUser.createdAt,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};