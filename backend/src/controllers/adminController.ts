import { Request, Response } from 'express';
import { rejectInvalidId } from '../utils/idGuard';
import { prisma } from '../config/db';

// ========== DASHBOARD STATS ==========

export const getAdminStats = async (req: Request, res: Response) => {
    try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        const [totalUsers, totalProblems, totalPosts, totalTopics, totalPaths] = await Promise.all([
            prisma.user.count(),
            prisma.problem.count(),
            prisma.forumPost.count(),
            prisma.topic.count(),
            prisma.learningPath.count()
        ]);

        const activeToday = await prisma.user.count({
            where: { last_active: { gte: new Date(todayStr) } }
        });

        const bannedUsers = await prisma.user.count({ where: { isBanned: true } });

        res.json({
            totalUsers,
            totalProblems,
            totalPosts,
            totalTopics,
            totalPaths,
            activeToday,
            bannedUsers
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// ========== USER MANAGEMENT ==========

export const getUsers = async (req: Request, res: Response) => {
    try {
        const { page = '1', limit = '20', search = '' } = req.query;
        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const skip = (pageNum - 1) * limitNum;

        const filter: any = {};
        if (search) {
            filter.OR = [
                { name: { contains: search as string, mode: 'insensitive' } },
                { email: { contains: search as string, mode: 'insensitive' } }
            ];
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where: filter,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum,
                select: {
                    id: true, name: true, email: true, googleId: true, role: true, isBanned: true,
                    avatar: true, xp_points: true, streak_days: true, last_active: true,
                    solvedProblems: true, bookmarks: true, activityLog: true,
                    createdAt: true, updatedAt: true
                }
            }),
            prisma.user.count({ where: filter })
        ]);

        res.json({
            users: users.map(u => ({ ...u, _id: u.id })),
            totalPages: Math.ceil(total / limitNum),
            currentPage: pageNum,
            total
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const editUser = async (req: Request, res: Response) => {
    try {
        if (rejectInvalidId(req.params.id, res)) return;
        const { name, xp_points, streak_days, role } = req.body;
        const updates: any = {};

        if (name !== undefined) updates.name = name;
        if (xp_points !== undefined) updates.xp_points = xp_points;
        if (streak_days !== undefined) updates.streak_days = streak_days;
        if (role !== undefined) updates.role = role;

        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: updates,
            select: {
                id: true, name: true, email: true, googleId: true, role: true, isBanned: true,
                avatar: true, xp_points: true, streak_days: true, last_active: true,
                solvedProblems: true, bookmarks: true, activityLog: true,
                createdAt: true, updatedAt: true
            }
        });

        res.json({ ...user, _id: user.id });
    } catch (error) {
        console.error('Edit user error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const toggleBanUser = async (req: Request, res: Response) => {
    try {
        if (rejectInvalidId(req.params.id, res)) return;
        const user = await prisma.user.findUnique({ where: { id: req.params.id } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.id === (req as any).user.id) {
            return res.status(400).json({ message: 'Cannot ban yourself' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: req.params.id },
            data: { isBanned: !user.isBanned }
        });

        res.json({ isBanned: updatedUser.isBanned, message: updatedUser.isBanned ? 'User banned' : 'User unbanned' });
    } catch (error) {
        console.error('Ban user error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        if (rejectInvalidId(req.params.id, res)) return;
        const user = await prisma.user.findUnique({ where: { id: req.params.id } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.id === (req as any).user.id) {
            return res.status(400).json({ message: 'Cannot delete yourself' });
        }

        await prisma.userProgress.deleteMany({ where: { user_id: req.params.id } });
        await prisma.user.delete({ where: { id: req.params.id } });

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// ========== CONTENT MANAGEMENT ==========

export const addProblem = async (req: Request, res: Response) => {
    try {
        const { title, topic_id, difficulty, video_link, problem_link, description, tags, order_index } = req.body;

        if (!title || !topic_id || !difficulty || !description) {
            return res.status(400).json({ message: 'Title, topic_id, difficulty, and description are required' });
        }

        const topic = await prisma.topic.findUnique({ where: { slug: topic_id } });
        if (!topic) {
            return res.status(404).json({ message: 'Topic not found' });
        }

        let finalOrderIndex = order_index;
        if (finalOrderIndex === undefined) {
            const maxProblem = await prisma.problem.findFirst({
                where: { topic_slug: topic_id },
                orderBy: { order_index: 'desc' }
            });
            finalOrderIndex = maxProblem ? maxProblem.order_index + 1 : 1;
        }

        const problem = await prisma.problem.create({
            data: {
                title,
                topic_slug: topic_id,
                difficulty,
                video_link: video_link || '',
                problem_link: problem_link || '',
                description,
                tags: tags || [],
                order_index: finalOrderIndex
            }
        });

        res.status(201).json({ ...problem, _id: problem.id });
    } catch (error) {
        console.error('Add problem error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const editProblem = async (req: Request, res: Response) => {
    try {
        if (rejectInvalidId(req.params.id, res)) return;
        const { title, difficulty, video_link, problem_link, description, tags, order_index } = req.body;
        const updates: any = {};

        if (title !== undefined) updates.title = title;
        if (difficulty !== undefined) updates.difficulty = difficulty;
        if (video_link !== undefined) updates.video_link = video_link;
        if (problem_link !== undefined) updates.problem_link = problem_link;
        if (description !== undefined) updates.description = description;
        if (tags !== undefined) updates.tags = tags;
        if (order_index !== undefined) updates.order_index = order_index;

        const problem = await prisma.problem.update({
            where: { id: req.params.id },
            data: updates
        });

        res.json({ ...problem, _id: problem.id });
    } catch (error) {
        console.error('Edit problem error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const deleteProblem = async (req: Request, res: Response) => {
    try {
        if (rejectInvalidId(req.params.id, res)) return;
        const problem = await prisma.problem.findUnique({ where: { id: req.params.id } });
        if (!problem) {
            return res.status(404).json({ message: 'Problem not found' });
        }

        await prisma.userProgress.deleteMany({ where: { problem_id: req.params.id } });
        await prisma.problem.delete({ where: { id: req.params.id } });

        res.json({ message: 'Problem deleted successfully' });
    } catch (error) {
        console.error('Delete problem error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// ========== FORUM MODERATION ==========

export const deleteForumPost = async (req: Request, res: Response) => {
    try {
        if (rejectInvalidId(req.params.id, res)) return;
        const post = await prisma.forumPost.findUnique({ where: { id: req.params.id } });
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        
        await prisma.reply.deleteMany({ where: { postId: req.params.id } });
        await prisma.forumPost.delete({ where: { id: req.params.id } });
        
        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const editForumPost = async (req: Request, res: Response) => {
    try {
        if (rejectInvalidId(req.params.id, res)) return;
        const { title, content, category, isPinned } = req.body;
        const updates: any = {};

        if (title !== undefined) updates.title = title;
        if (content !== undefined) updates.content = content;
        if (category !== undefined) updates.category = category;
        if (isPinned !== undefined) updates.isPinned = isPinned;

        const post = await prisma.forumPost.update({
            where: { id: req.params.id },
            data: updates,
            include: { author: { select: { id: true, name: true, avatar: true } } }
        });
        
        res.json({ ...post, _id: post.id, author: { ...post.author, _id: post.author.id } });
    } catch (error) {
        console.error('Edit post error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const deleteForumReply = async (req: Request, res: Response) => {
    try {
        if (rejectInvalidId(req.params.replyId, res)) return;
        const reply = await prisma.reply.findUnique({ where: { id: req.params.replyId } });
        if (!reply) {
            return res.status(404).json({ message: 'Reply not found' });
        }

        await prisma.reply.delete({ where: { id: req.params.replyId } });
        res.json({ message: 'Reply deleted successfully' });
    } catch (error) {
        console.error('Delete reply error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
