
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/config/db', () => ({
    prisma: {
        userProgress: {
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            findMany: vi.fn(),
        },
        user: {
            findUnique: vi.fn(),
            update: vi.fn(),
        }
    }
}));

import { updateProblemStatus } from '../src/controllers/userActionController';
import { prisma } from '../src/config/db';

beforeEach(() => {
    vi.clearAllMocks();
});
import { toggleBookmark, updateNotes, getUserProgress } from '../src/controllers/userActionController';

const mockRes = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

const mockReq = (params: object, body: object, userId = '507f1f77bcf86cd799439011') => ({
    params,
    body,
    user: { id: userId }
} as any);

const baseUser = {
    id: '507f1f77bcf86cd799439011',
    xp_points: 100,
    streak_days: 3,
    last_active: null,
    solvedProblems: [],
    bookmarks: [],
    activityLog: []
};

// ── Streak tests ──────────────────────────────────────────────

describe('streak logic in updateProblemStatus', () => {
    it('increments streak when last active was yesterday', async () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        (prisma.userProgress.findUnique as any).mockResolvedValue(null);
        (prisma.userProgress.create as any).mockResolvedValue({ id: 'p1', status: 'SOLVED' });
        (prisma.user.findUnique as any).mockResolvedValue({
            ...baseUser,
            last_active: yesterday,
            streak_days: 3
        });
        (prisma.user.update as any).mockResolvedValue({});

        const req = mockReq({ problemId: 'prob1' }, { status: 'SOLVED' });
        const res = mockRes();

        await updateProblemStatus(req, res);

        expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ streak_days: 4 })
        }));
    });

    it('resets streak to 1 when last active was 2+ days ago', async () => {
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        (prisma.userProgress.findUnique as any).mockResolvedValue(null);
        (prisma.userProgress.create as any).mockResolvedValue({ id: 'p1', status: 'SOLVED' });
        (prisma.user.findUnique as any).mockResolvedValue({
            ...baseUser,
            last_active: twoDaysAgo,
            streak_days: 5
        });
        (prisma.user.update as any).mockResolvedValue({});

        const req = mockReq({ problemId: 'prob1' }, { status: 'SOLVED' });
        const res = mockRes();

        await updateProblemStatus(req, res);

        expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ streak_days: 1 })
        }));
    });

    it('keeps streak unchanged when already active today', async () => {
        const today = new Date();

        (prisma.userProgress.findUnique as any).mockResolvedValue(null);
        (prisma.userProgress.create as any).mockResolvedValue({ id: 'p1', status: 'SOLVED' });
        (prisma.user.findUnique as any).mockResolvedValue({
            ...baseUser,
            last_active: today,
            streak_days: 7
        });
        (prisma.user.update as any).mockResolvedValue({});

        const req = mockReq({ problemId: 'prob1' }, { status: 'SOLVED' });
        const res = mockRes();

        await updateProblemStatus(req, res);

        expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ streak_days: 7 })
        }));
    });

    // ── UTC timezone edge-case tests ──────────────────────────────

    it('starts streak at 1 for new user with no last_active', async () => {
        (prisma.userProgress.findUnique as any).mockResolvedValue(null);
        (prisma.userProgress.create as any).mockResolvedValue({ id: 'p1', status: 'SOLVED' });
        (prisma.user.findUnique as any).mockResolvedValue({
            ...baseUser,
            last_active: null,
            streak_days: 0
        });
        (prisma.user.update as any).mockResolvedValue({});

        const req = mockReq({ problemId: 'prob1' }, { status: 'SOLVED' });
        const res = mockRes();

        await updateProblemStatus(req, res);

        expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ streak_days: 1 })
        }));
    });

    it('uses UTC date for comparison (same UTC day despite different local hours)', async () => {
        // Simulate: last_active was at 23:30 UTC today (same UTC day as now)
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const lastActiveAt2330UTC = new Date(`${todayStr}T23:30:00.000Z`);

        (prisma.userProgress.findUnique as any).mockResolvedValue(null);
        (prisma.userProgress.create as any).mockResolvedValue({ id: 'p1', status: 'SOLVED' });
        (prisma.user.findUnique as any).mockResolvedValue({
            ...baseUser,
            last_active: lastActiveAt2330UTC,
            streak_days: 5
        });
        (prisma.user.update as any).mockResolvedValue({});

        const req = mockReq({ problemId: 'prob1' }, { status: 'SOLVED' });
        const res = mockRes();

        await updateProblemStatus(req, res);

        // Same UTC day → streak unchanged
        expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ streak_days: 5 })
        }));
    });

    it('increments streak when last active was previous UTC day', async () => {
        // Simulate: last_active was 23:59 UTC yesterday
        const now = new Date();
        const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
        const lastActiveAt2359UTC = new Date(`${yesterdayStr}T23:59:00.000Z`);

        (prisma.userProgress.findUnique as any).mockResolvedValue(null);
        (prisma.userProgress.create as any).mockResolvedValue({ id: 'p1', status: 'SOLVED' });
        (prisma.user.findUnique as any).mockResolvedValue({
            ...baseUser,
            last_active: lastActiveAt2359UTC,
            streak_days: 10
        });
        (prisma.user.update as any).mockResolvedValue({});

        const req = mockReq({ problemId: 'prob1' }, { status: 'SOLVED' });
        const res = mockRes();

        await updateProblemStatus(req, res);

        // Previous UTC day → streak increments
        expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ streak_days: 11 })
        }));
    });

    it('resets streak when last active was 3 days ago (UTC)', async () => {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        (prisma.userProgress.findUnique as any).mockResolvedValue(null);
        (prisma.userProgress.create as any).mockResolvedValue({ id: 'p1', status: 'SOLVED' });
        (prisma.user.findUnique as any).mockResolvedValue({
            ...baseUser,
            last_active: threeDaysAgo,
            streak_days: 15
        });
        (prisma.user.update as any).mockResolvedValue({});

        const req = mockReq({ problemId: 'prob1' }, { status: 'SOLVED' });
        const res = mockRes();

        await updateProblemStatus(req, res);

        expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ streak_days: 1 })
        }));
    });
});

// ── XP tests ──────────────────────────────────────────────────

describe('XP logic in updateProblemStatus', () => {
    it('increments XP by 25 when problem newly solved', async () => {
        (prisma.userProgress.findUnique as any).mockResolvedValue(null);
        (prisma.userProgress.create as any).mockResolvedValue({ id: 'p1', status: 'SOLVED' });
        (prisma.user.findUnique as any).mockResolvedValue({ ...baseUser, last_active: null });
        (prisma.user.update as any).mockResolvedValue({});

        const req = mockReq({ problemId: 'prob1' }, { status: 'SOLVED' });
        const res = mockRes();

        await updateProblemStatus(req, res);

        expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ xp_points: { increment: 25 } })
        }));
    });

    it('decrements XP by 25 when problem un-solved', async () => {
        (prisma.userProgress.findUnique as any).mockResolvedValue({ id: 'p1', status: 'SOLVED' });
        (prisma.userProgress.update as any).mockResolvedValue({ id: 'p1', status: 'TODO' });
        (prisma.user.findUnique as any).mockResolvedValue({
            ...baseUser,
            solvedProblems: [{ problemId: 'prob1', solvedAt: new Date() }]
        });
        (prisma.user.update as any).mockResolvedValue({});

        const req = mockReq({ problemId: 'prob1' }, { status: 'TODO' });
        const res = mockRes();

        await updateProblemStatus(req, res);

        // baseUser has 100 XP → 100 - 25 = 75. Written as an absolute value
        // (not `decrement`) so the result can never dip below zero.
        expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ xp_points: 75 })
        }));
    });

    it('clamps XP at 0 instead of going negative when un-solving', async () => {
        (prisma.userProgress.findUnique as any).mockResolvedValue({ id: 'p1', status: 'SOLVED' });
        (prisma.userProgress.update as any).mockResolvedValue({ id: 'p1', status: 'TODO' });
        (prisma.user.findUnique as any).mockResolvedValue({
            ...baseUser,
            xp_points: 10,
            solvedProblems: [{ problemId: 'prob1', solvedAt: new Date() }]
        });
        (prisma.user.update as any).mockResolvedValue({});

        const req = mockReq({ problemId: 'prob1' }, { status: 'TODO' });
        const res = mockRes();

        await updateProblemStatus(req, res);

        expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ xp_points: 0 })
        }));
    });

    it('returns 400 for an unrecognized status value', async () => {
        const req = mockReq({ problemId: 'prob1' }, { status: 'NOT_A_STATUS' });
        const res = mockRes();

        await updateProblemStatus(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(prisma.userProgress.findUnique).not.toHaveBeenCalled();
    });

    it('does not change XP when status changes between non-SOLVED states', async () => {
        (prisma.userProgress.findUnique as any).mockResolvedValue({ id: 'p1', status: 'TODO' });
        (prisma.userProgress.update as any).mockResolvedValue({ id: 'p1', status: 'ATTEMPTED' });

        const req = mockReq({ problemId: 'prob1' }, { status: 'ATTEMPTED' });
        const res = mockRes();

        await updateProblemStatus(req, res);

        // user.update should NOT be called for XP changes
        expect(prisma.user.update).not.toHaveBeenCalled();
    });
});

// ── Activity log tests ────────────────────────────────────────

describe('activity log in updateProblemStatus', () => {
    it('adds new date entry to activity log when first solve of the day', async () => {
        const todayStr = new Date().toISOString().split('T')[0];

        (prisma.userProgress.findUnique as any).mockResolvedValue(null);
        (prisma.userProgress.create as any).mockResolvedValue({ id: 'p1', status: 'SOLVED' });
        (prisma.user.findUnique as any).mockResolvedValue({
            ...baseUser,
            activityLog: [],
            last_active: null
        });
        (prisma.user.update as any).mockResolvedValue({});

        const req = mockReq({ problemId: 'prob1' }, { status: 'SOLVED' });
        const res = mockRes();

        await updateProblemStatus(req, res);

        expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                activityLog: [{ date: todayStr, count: 1 }]
            })
        }));
    });

    it('increments count on existing date entry', async () => {
        const todayStr = new Date().toISOString().split('T')[0];

        (prisma.userProgress.findUnique as any).mockResolvedValue(null);
        (prisma.userProgress.create as any).mockResolvedValue({ id: 'p1', status: 'SOLVED' });
        (prisma.user.findUnique as any).mockResolvedValue({
            ...baseUser,
            activityLog: [{ date: todayStr, count: 2 }],
            last_active: new Date()
        });
        (prisma.user.update as any).mockResolvedValue({});

        const req = mockReq({ problemId: 'prob2' }, { status: 'SOLVED' });
        const res = mockRes();

        await updateProblemStatus(req, res);

        expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                activityLog: [{ date: todayStr, count: 3 }]
            })
        }));
    });
});

// ── toggleBookmark ────────────────────────────────────────────

describe('toggleBookmark', () => {
    it('creates progress and adds bookmark when none exists', async () => {
        (prisma.userProgress.findUnique as any).mockResolvedValue(null);
        (prisma.userProgress.create as any).mockResolvedValue({ id: 'p1', is_bookmarked: true });
        (prisma.user.findUnique as any).mockResolvedValue({ ...baseUser, bookmarks: [] });
        (prisma.user.update as any).mockResolvedValue({});

        const req = mockReq({ problemId: 'prob1' }, {});
        const res = mockRes();

        await toggleBookmark(req, res);

        expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ bookmarks: ['prob1'] })
        }));
        expect(res.json).toHaveBeenCalled();
    });

    it('toggles off bookmark when already bookmarked', async () => {
        (prisma.userProgress.findUnique as any).mockResolvedValue({ id: 'p1', is_bookmarked: true });
        (prisma.userProgress.update as any).mockResolvedValue({ id: 'p1', is_bookmarked: false });
        (prisma.user.findUnique as any).mockResolvedValue({ ...baseUser, bookmarks: ['prob1'] });
        (prisma.user.update as any).mockResolvedValue({});

        const req = mockReq({ problemId: 'prob1' }, {});
        const res = mockRes();

        await toggleBookmark(req, res);

        expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ bookmarks: [] })
        }));
    });
});

// ── updateNotes ───────────────────────────────────────────────

describe('updateNotes', () => {
    it('updates notes on existing progress', async () => {
        (prisma.userProgress.findUnique as any).mockResolvedValue({ id: 'p1', notes: '' });
        (prisma.userProgress.update as any).mockResolvedValue({ id: 'p1', notes: 'my note' });

        const req = mockReq({ problemId: 'prob1' }, { notes: 'my note' });
        const res = mockRes();

        await updateNotes(req, res);

        expect(prisma.userProgress.update).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalled();
    });

    it('creates progress with notes when none exists', async () => {
        (prisma.userProgress.findUnique as any).mockResolvedValue(null);
        (prisma.userProgress.create as any).mockResolvedValue({ id: 'p1', notes: 'new note' });

        const req = mockReq({ problemId: 'prob1' }, { notes: 'new note' });
        const res = mockRes();

        await updateNotes(req, res);

        expect(prisma.userProgress.create).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalled();
    });
});

// ── getUserProgress ───────────────────────────────────────────

describe('getUserProgress', () => {
    it('returns all progress for user', async () => {
        (prisma.userProgress.findMany as any).mockResolvedValue([
            { id: 'p1', status: 'SOLVED' },
            { id: 'p2', status: 'TODO' }
        ]);

        const req = mockReq({}, {});
        const res = mockRes();

        await getUserProgress(req, res);

        expect(res.json).toHaveBeenCalledWith([
            { id: 'p1', status: 'SOLVED' },
            { id: 'p2', status: 'TODO' }
        ]);
    });
});