import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { calculateLevel } from '../config/xpConfig';

// ─── In-memory leaderboard cache (60s TTL) ───
const leaderboardCache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

function getCachedLeaderboard(key: string) {
    const entry = leaderboardCache.get(key);
    if (entry && Date.now() < entry.expiresAt) return entry.data;
    leaderboardCache.delete(key);
    return null;
}

function setCachedLeaderboard(key: string, data: any) {
    leaderboardCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// @desc    Get leaderboard data
// @route   GET /api/users/leaderboard
// @access  Public
export const getLeaderboard = async (req: Request, res: Response) => {
    try {
        const { limit = 10, sortBy = 'xp' } = req.query;
        const cacheKey = `lb:${sortBy}:${limit}`;

        const cached = getCachedLeaderboard(cacheKey);
        if (cached) {
            res.setHeader('X-Cache', 'HIT');
            return res.status(200).json(cached);
        }

        let pipeline: any[] = [];

        // Filter out users who opted out of the leaderboard
        pipeline.push({
            $match: { isPublic: { $ne: false } }
        });

        pipeline.push({
            $project: {
                name: 1,
                xp_points: 1,
                streak_days: 1,
                solvedProblems: 1,
                avatar: 1,
                solvedCount: { $size: { $ifNull: ["$solvedProblems", []] } }
            }
        });

        if (sortBy === 'solved') {
            pipeline.push({ $sort: { solvedCount: -1 } });
        } else if (sortBy === 'streak') {
            pipeline.push({ $sort: { streak_days: -1 } });
        } else {
            pipeline.push({ $sort: { xp_points: -1 } });
        }

        pipeline.push({ $limit: Number(limit) });

        const leaderboard = await prisma.user.aggregateRaw({ pipeline }) as unknown as any[];

        const formattedLeaderboard = leaderboard.map((user: any, index: number) => ({
            id: user._id?.$oid || user._id,
            name: user.name,
            avatar: user.avatar || (user.name ? user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'U'),
            xp: user.xp_points || 0,
            streak: user.streak_days || 0,
            solved: user.solvedCount || 0,
            rank: index + 1
        }));

        setCachedLeaderboard(cacheKey, formattedLeaderboard);
        res.setHeader('X-Cache', 'MISS');
        res.status(200).json(formattedLeaderboard);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get authenticated user's own rank (always shown, even if isPublic: false)
// @route   GET /api/users/leaderboard/me
// @access  Private
export const getMyLeaderboardRank = async (req: Request | any, res: Response) => {
    try {
        const userId = req.user.id;
        const { sortBy = 'xp' } = req.query;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Count how many public users rank above this user
        const sortField = sortBy === 'solved' ? 'solvedProblems' : sortBy === 'streak' ? 'streak_days' : 'xp_points';

        let rankPipeline: any[] = [
            { $match: { isPublic: { $ne: false } } },
        ];

        if (sortBy === 'solved') {
            rankPipeline.push({
                $addFields: { solvedCount: { $size: { $ifNull: ["$solvedProblems", []] } } }
            });
            rankPipeline.push({ $match: { solvedCount: { $gt: user.solvedProblems?.length || 0 } } });
        } else {
            const userVal = user[sortField as keyof typeof user] as number || 0;
            rankPipeline.push({ $match: { [sortField]: { $gt: userVal } } });
        }

        rankPipeline.push({ $count: 'above' });

        const rankResult = await prisma.user.aggregateRaw({ pipeline: rankPipeline }) as unknown as any[];
        const rank = (rankResult[0]?.above || 0) + 1;

        const solvedCount = user.solvedProblems?.length || 0;

        res.status(200).json({
            id: user.id,
            name: user.name,
            avatar: user.avatar || (user.name ? user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'U'),
            xp: user.xp_points || 0,
            streak: user.streak_days || 0,
            solved: solvedCount,
            rank,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

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
        const { bio, avatarUrl, isPublic } = req.body;

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
                isPublic: isPublic !== undefined ? Boolean(isPublic) : user.isPublic,
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