import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { SOLVE_XP } from '../config/xpConfig';
import { isUniqueViolation } from '../utils/prismaErrors';

/** The statuses the client may set. Mirrors the union in `app/src/api/userActions.ts`. */
const VALID_STATUSES = ['TODO', 'SOLVED', 'ATTEMPTED'] as const;
type ValidStatus = (typeof VALID_STATUSES)[number];

const isStatus = (v: unknown): v is ValidStatus =>
    typeof v === 'string' && (VALID_STATUSES as readonly string[]).includes(v);

export const updateProblemStatus = async (req: Request | any, res: Response) => {
    try {
        const { problemId } = req.params;
        const { status } = req.body;
        const userId = req.user.id;

        if (!isStatus(status)) {
            res.status(400).json({
                message: `status must be one of: ${VALID_STATUSES.join(', ')}`
            });
            return;
        }

        // ─────────────────────────────────────────────────────────────────────────
        // Awarding XP exactly once under concurrency
        // ─────────────────────────────────────────────────────────────────────────
        // The previous shape read the current status, wrote the new one, then decided
        // whether to award XP. That is check-then-act, and it cannot be correct under
        // concurrency: N simultaneous requests all read the same pre-transition value,
        // all conclude "this is a real transition", and all award XP. Measured: six
        // concurrent SOLVED writes on one problem awarded 150 XP instead of 25.
        //
        // The fix is to let the DATABASE decide, with one conditional write whose filter
        // encodes the transition that carries an XP consequence. Exactly one concurrent
        // request can match it; the rest match zero rows and award nothing.
        // ─────────────────────────────────────────────────────────────────────────

        // 1. Ensure the row exists. Concurrent first-writes collide on the
        //    `user_id_problem_id_unique` index; the loser is expected, not an error.
        try {
            await prisma.userProgress.create({
                data: {
                    user_id: userId,
                    problem_id: problemId,
                    status: 'TODO',
                    is_bookmarked: false,
                    notes: ''
                }
            });
        } catch (error) {
            if (!isUniqueViolation(error)) throw error;
        }

        // 2. Apply the status AND claim the XP delta in one atomic operation.
        //    `updateMany` reports how many documents it changed — precisely the "did
        //    THIS request perform the transition?" signal we need, and unlike a read it
        //    cannot be observed by two requests at the same time.
        const claim = await prisma.userProgress.updateMany({
            where: {
                user_id: userId,
                problem_id: problemId,
                status: status === 'SOLVED' ? { not: 'SOLVED' } : 'SOLVED'
            },
            data: { status }
        });

        // 3. When no XP-relevant transition occurred the status still has to be written,
        //    but only for a non-SOLVED target: a SOLVED target that did not match is
        //    already SOLVED, so there is nothing to write.
        if (claim.count === 0 && status !== 'SOLVED') {
            await prisma.userProgress.updateMany({
                where: { user_id: userId, problem_id: problemId },
                data: { status }
            });
        }

        // Only the single request that won the claim above may touch XP, the solved
        // list, the streak, or the activity log.
        const xpDelta = claim.count === 1 ? (status === 'SOLVED' ? SOLVE_XP : -SOLVE_XP) : 0;

        // Sync with User model for Leaderboard & Profile
        if (xpDelta > 0) {
            const userDoc = await prisma.user.findUnique({ where: { id: userId } });
            if (userDoc) {
                // ─────────────────────────────────────────────
                // UTC-based streak logic
                // ─────────────────────────────────────────────
                // All date comparisons use UTC via toISOString().split('T')[0].
                // Streak rules (all dates are UTC calendar dates):
                //   1. If last_active is today (UTC) → streak unchanged
                //   2. If last_active is yesterday (UTC) → streak increments by 1
                //   3. If last_active is 2+ days ago (UTC) → streak resets to 1
                //   4. If no last_active (new user) → streak starts at 1
                // Streak resets at midnight UTC regardless of user's local timezone.
                // ─────────────────────────────────────────────
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
        } else if (xpDelta < 0) {
            const userDoc = await prisma.user.findUnique({ where: { id: userId } });
            if (userDoc) {
                const updatedSolvedProblems = userDoc.solvedProblems.filter(p => p.problemId !== problemId);
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        xp_points: { decrement: SOLVE_XP },
                        solvedProblems: updatedSolvedProblems
                    }
                });
            }
        }

        // Re-read so the response is the committed row, whatever branch wrote it.
        const progress = await prisma.userProgress.findUnique({
            where: { user_id_problem_id: { user_id: userId, problem_id: problemId } }
        });

        res.json(progress);
    } catch (error) {
        console.error("Error updating status:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const toggleBookmark = async (req: Request | any, res: Response) => {
    try {
        const { problemId } = req.params;
        const userId = req.user.id;

        const existing = await prisma.userProgress.findUnique({
            where: { user_id_problem_id: { user_id: userId, problem_id: problemId } }
        });

        let progress;
        let isBookmarked;

        if (existing) {
            progress = await prisma.userProgress.update({
                where: { id: existing.id },
                data: { is_bookmarked: !existing.is_bookmarked }
            });
            isBookmarked = progress.is_bookmarked;
        } else {
            try {
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
            } catch (error) {
                // `upsert` cannot express a toggle — the value written depends on the value
                // read — so this path keeps the read and recovers from the race instead.
                // A concurrent request may have created the row between our read and our
                // create; with `user_id_problem_id_unique` in place that raises P2002.
                // Re-read the row the winner wrote and toggle from its real current value.
                if (!isUniqueViolation(error)) throw error;

                const winner = await prisma.userProgress.findUnique({
                    where: { user_id_problem_id: { user_id: userId, problem_id: problemId } }
                });
                if (!winner) throw error;

                progress = await prisma.userProgress.update({
                    where: { id: winner.id },
                    data: { is_bookmarked: !winner.is_bookmarked }
                });
                isBookmarked = progress.is_bookmarked;
            }
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

export const updateNotes = async (req: Request | any, res: Response) => {
    try {
        const { problemId } = req.params;
        const { notes } = req.body;
        const userId = req.user.id;

        // No pre-read needed — nothing here depends on the previous value, so `upsert`
        // replaces the whole check-then-insert block with one atomic operation.
        const progress = await prisma.userProgress.upsert({
            where: { user_id_problem_id: { user_id: userId, problem_id: problemId } },
            update: { notes },
            create: {
                user_id: userId,
                problem_id: problemId,
                status: 'TODO',
                is_bookmarked: false,
                notes
            }
        });

        res.json(progress);
    } catch (error) {
        console.error("Error updating notes:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const getUserProgress = async (req: Request | any, res: Response) => {
    try {
        const userId = req.user.id;
        const progress = await prisma.userProgress.findMany({ where: { user_id: userId } });
        res.json(progress);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
