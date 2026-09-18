import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { SOLVE_XP } from '../config/xpConfig';

/**
 * Progress status values shared by the progress endpoints.
 * Only these values are valid; anything else is rejected with 400.
 */
const PROGRESS_STATUSES = ['TODO', 'SOLVED', 'ATTEMPTED'] as const;
export type ProgressStatus = (typeof PROGRESS_STATUSES)[number];
function isProgressStatus(value: unknown): value is ProgressStatus {
    return typeof value === 'string' && (PROGRESS_STATUSES as readonly string[]).includes(value);
}

/** Total XP earned by user `user`, floored at 0. */
function xpAfter(previousXp: number, delta: number): number {
    return Math.max(0, previousXp + delta);
}

export const updateProblemStatus = async (req: Request, res: Response) => {
    try {
        const { problemId } = req.params;
        const { status: rawStatus } = req.body;
        const userId = req.user.id;

        if (!isProgressStatus(rawStatus)) {
            res.status(400).json({ message: 'Invalid status. Expected one of TODO, SOLVED, ATTEMPTED.' });
            return;
        }
        const status = rawStatus;

        let progress = await prisma.userProgress.findUnique({
            where: { user_id_problem_id: { user_id: userId, problem_id: problemId } }
        });
        const previousStatus = progress ? progress.status : 'TODO';

        if (progress) {
            progress = await prisma.userProgress.update({
                where: { id: progress.id },
                data: { status }
            });
        } else {
            progress = await prisma.userProgress.create({
                data: {
                    user_id: userId,
                    problem_id: problemId,
                    status,
                    is_bookmarked: false,
                    notes: ''
                }
            });
        }

        // Sync with User model for Leaderboard & Profile
        if (status === 'SOLVED' && previousStatus !== 'SOLVED') {
            const userDoc = await prisma.user.findUnique({ where: { id: userId } });
            if (userDoc) {
                // UTC-based streak logic. Dates are UTC calendar dates: unchanged today,
                // +1 from yesterday, reset to 1 after 2+ days or for new users.
                // Streak resets at midnight UTC regardless of the user's timezone.
                const today = new Date();
                const todayStr = today.toISOString().split('T')[0];
                const lastActiveStr = userDoc.last_active ? new Date(userDoc.last_active).toISOString().split('T')[0] : null;

                let newStreak = userDoc.streak_days;
                if (lastActiveStr === todayStr) {
                    // Same day — streak unchanged
                } else if (lastActiveStr) {
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];
                    if (lastActiveStr === yesterdayStr) {
                        newStreak = (newStreak || 0) + 1;
                    } else {
                        newStreak = 1;
                    }
                } else {
                    newStreak = 1;
                }

                const activityLog = [...(userDoc.activityLog || [])];
                const todayLogIndex = activityLog.findIndex((log) => log.date === todayStr);
                if (todayLogIndex > -1) {
                    activityLog[todayLogIndex].count += 1;
                } else {
                    activityLog.push({ date: todayStr, count: 1 });
                }

                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        xp_points: { increment: SOLVE_XP },
                        solvedProblems: { push: [{ problemId, solvedAt: today }] },
                        streak_days: newStreak,
                        last_active: today,
                        activityLog: activityLog
                    }
                });
            }
        } else if (status !== 'SOLVED' && previousStatus === 'SOLVED') {
            const userDoc = await prisma.user.findUnique({ where: { id: userId } });
            if (userDoc) {
                const updatedSolvedProblems = userDoc.solvedProblems.filter(p => p.problemId !== problemId);
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        // Absolute value rather than `decrement`, so XP can never go
                        // negative if it was already below one problem's reward.
                        xp_points: xpAfter(userDoc.xp_points ?? 0, -SOLVE_XP),
                        solvedProblems: updatedSolvedProblems
                    }
                });
            }
        }

        res.json(progress);
    } catch (error) {
        console.error("Error updating status:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const toggleBookmark = async (req: Request, res: Response) => {
    try {
        const { problemId } = req.params;
        const userId = req.user.id;

        let progress = await prisma.userProgress.findUnique({
            where: { user_id_problem_id: { user_id: userId, problem_id: problemId } }
        });
        
        let isBookmarked = false;

        if (progress) {
            progress = await prisma.userProgress.update({
                where: { id: progress.id },
                data: { is_bookmarked: !progress.is_bookmarked }
            });
            isBookmarked = progress.is_bookmarked;
        } else {
            progress = await prisma.userProgress.create({
                data: {
                    user_id: userId,
                    problem_id: problemId,
                    status: 'TODO',
                    is_bookmarked: true,
                    notes: ''
                }
            });
            isBookmarked = true;
        }

        // Sync with User model
        const userDoc = await prisma.user.findUnique({ where: { id: userId } });
        if (userDoc) {
            let bookmarks = [...userDoc.bookmarks];
            if (isBookmarked) {
                if (!bookmarks.includes(problemId)) bookmarks.push(problemId);
            } else {
                bookmarks = bookmarks.filter(id => id !== problemId);
            }
            await prisma.user.update({
                where: { id: userId },
                data: { bookmarks }
            });
        }

        res.json(progress);
    } catch (error) {
        console.error("Error toggling bookmark:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const updateNotes = async (req: Request, res: Response) => {
    try {
        const { problemId } = req.params;
        const { notes } = req.body;
        const userId = req.user.id;

        let progress = await prisma.userProgress.findUnique({
            where: { user_id_problem_id: { user_id: userId, problem_id: problemId } }
        });

        if (progress) {
            progress = await prisma.userProgress.update({
                where: { id: progress.id },
                data: { notes }
            });
        } else {
            progress = await prisma.userProgress.create({
                data: {
                    user_id: userId,
                    problem_id: problemId,
                    status: 'TODO',
                    is_bookmarked: false,
                    notes
                }
            });
        }

        res.json(progress);
    } catch (error) {
        console.error('Error updating notes:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const getUserProgress = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;
        const progress = await prisma.userProgress.findMany({ where: { user_id: userId } });
        res.json(progress);
    } catch (error) {
        console.error('Error fetching progress:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
