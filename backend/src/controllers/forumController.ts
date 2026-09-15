import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { rejectInvalidId } from '../utils/idGuard';

export const getPosts = async (req: Request, res: Response) => {
    try {
        const {
            category,
            sort = 'newest',
            page = '1',
            limit = '20'
        } = req.query;

        const filter: any = {};
        if (category && category !== 'all') {
            filter.category = category;
        }

        let sortOption: any = { isPinned: -1, createdAt: -1 };
        if (sort === 'most-liked') {
            sortOption = { isPinned: -1, likesCount: -1, createdAt: -1 };
        } else if (sort === 'most-discussed') {
            sortOption = { isPinned: -1, repliesCount: -1, createdAt: -1 };
        }

        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const skip = (pageNum - 1) * limitNum;

        const pipeline: any[] = [
            { $match: filter },
            {
                $lookup: {
                    from: "Reply",
                    localField: "_id",
                    foreignField: "postId",
                    as: "replies"
                }
            },
            {
                $addFields: {
                    likesCount: { $size: { $ifNull: ["$likes", []] } },
                    repliesCount: { $size: { $ifNull: ["$replies", []] } }
                }
            },
            { $sort: sortOption },
            { $skip: skip },
            { $limit: limitNum },
            {
                $lookup: {
                    from: "User",
                    localField: "authorId",
                    foreignField: "_id",
                    as: "authorInfo"
                }
            },
            { $unwind: { path: "$authorInfo", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    id: { $toString: "$_id" },
                    title: 1,
                    content: { $substrCP: ["$content", 0, 200] },
                    category: 1,
                    tags: 1,
                    likes: 1,
                    likesCount: 1,
                    repliesCount: 1,
                    isPinned: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    author: {
                        _id: { $toString: "$authorInfo._id" },
                        name: "$authorInfo.name",
                        avatar: "$authorInfo.avatar"
                    }
                }
            }
        ];

        const posts = await prisma.forumPost.aggregateRaw({ pipeline }) as unknown as any[];
        
        // Format the output
        const formattedPosts = posts.map(p => ({
            _id: p._id?.$oid || p._id,
            title: p.title,
            content: p.content,
            category: p.category,
            tags: p.tags,
            likes: p.likes || [],
            likesCount: p.likesCount,
            repliesCount: p.repliesCount,
            isPinned: p.isPinned,
            createdAt: p.createdAt?.$date || p.createdAt,
            updatedAt: p.updatedAt?.$date || p.updatedAt,
            author: p.author
        }));

        const total = await prisma.forumPost.count({ where: filter });

        res.json({
            posts: formattedPosts,
            totalPages: Math.ceil(total / limitNum),
            currentPage: pageNum,
            total
        });
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ message: 'Failed to fetch posts' });
    }
};

export const getPost = async (req: Request, res: Response) => {
    try {
        if (rejectInvalidId(req.params.id, res)) return;
        const post = await prisma.forumPost.findUnique({
            where: { id: req.params.id },
            include: {
                author: { select: { id: true, name: true, avatar: true } },
                replies: {
                    include: { author: { select: { id: true, name: true, avatar: true } } }
                }
            }
        });

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Map id to _id for frontend compatibility
        const mappedPost = {
            ...post,
            _id: post.id,
            author: { ...post.author, _id: post.author.id },
            replies: post.replies.map(r => ({
                ...r,
                _id: r.id,
                author: { ...r.author, _id: r.author.id }
            }))
        };

        res.json(mappedPost);
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ message: 'Failed to fetch post' });
    }
};

export const createPost = async (req: Request, res: Response) => {
    try {
        const { title, content, category, tags } = req.body;

        // Validate title
        if (typeof title !== 'string') {
            return res.status(400).json({ message: 'Title is required' });
        }
        const trimmedTitle = title.trim();
        if (!trimmedTitle) {
            return res.status(400).json({ message: 'Title is required' });
        }
        if (trimmedTitle.length < 10) {
            return res.status(400).json({ message: 'Title must be at least 10 characters' });
        }
        if (trimmedTitle.length > 150) {
            return res.status(400).json({ message: 'Title must be less than 150 characters' });
        }

        // Validate content
        if (typeof content !== 'string') {
            return res.status(400).json({ message: 'Content is required' });
        }
        const trimmedContent = content.trim();
        if (!trimmedContent) {
            return res.status(400).json({ message: 'Content is required' });
        }
        if (trimmedContent.length < 20) {
            return res.status(400).json({ message: 'Content must be at least 20 characters' });
        }
        if (trimmedContent.length > 10000) {
            return res.status(400).json({ message: 'Content must be less than 10,000 characters' });
        }

        // Validate tags
        if (tags !== undefined && tags !== null && !Array.isArray(tags)) {
            return res.status(400).json({ message: 'Tags must be an array' });
        }
        const postTags = Array.isArray(tags) ? tags : [];
        if (postTags.length > 5) {
            return res.status(400).json({ message: 'Maximum 5 tags allowed' });
        }
        for (const tag of postTags) {
            if (typeof tag !== 'string' || tag.trim().length > 30) {
                return res.status(400).json({ message: 'Each tag must be 30 characters or less' });
            }
        }

        const post = await prisma.forumPost.create({
            data: {
                title: trimmedTitle,
                content: trimmedContent,
                category: category || 'general',
                tags: postTags.map((t: string) => t.trim()),
                authorId: req.user.id
            },
            include: { author: { select: { id: true, name: true, avatar: true } } }
        });

        const mappedPost = {
            ...post,
            _id: post.id,
            author: { ...post.author, _id: post.author.id }
        };

        res.status(201).json(mappedPost);
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ message: 'Failed to create post' });
    }
};

export const addReply = async (req: Request, res: Response) => {
    try {
        if (rejectInvalidId(req.params.id, res)) return;
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ message: 'Reply content is required' });
        }

        const post = await prisma.forumPost.findUnique({ where: { id: req.params.id } });
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        await prisma.reply.create({
            data: {
                content,
                postId: req.params.id,
                authorId: req.user.id
            }
        });

        const updatedPost = await prisma.forumPost.findUnique({
            where: { id: req.params.id },
            include: {
                author: { select: { id: true, name: true, avatar: true } },
                replies: { include: { author: { select: { id: true, name: true, avatar: true } } } }
            }
        });

        const mappedPost = {
            ...updatedPost,
            _id: updatedPost!.id,
            author: { ...updatedPost!.author, _id: updatedPost!.author.id },
            replies: updatedPost!.replies.map(r => ({
                ...r,
                _id: r.id,
                author: { ...r.author, _id: r.author.id }
            }))
        };

        res.status(201).json(mappedPost);
    } catch (error) {
        console.error('Error adding reply:', error);
        res.status(500).json({ message: 'Failed to add reply' });
    }
};

export const toggleLike = async (req: Request, res: Response) => {
    try {
        if (rejectInvalidId(req.params.id, res)) return;
        const post = await prisma.forumPost.findUnique({ where: { id: req.params.id } });
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const userId = req.user.id;
        const likeIndex = post.likes.indexOf(userId);

        let updatedLikes = [...post.likes];
        if (likeIndex > -1) {
            updatedLikes.splice(likeIndex, 1);
        } else {
            updatedLikes.push(userId);
        }

        await prisma.forumPost.update({
            where: { id: req.params.id },
            data: { likes: updatedLikes }
        });

        res.json({ likes: updatedLikes, liked: likeIndex === -1 });
    } catch (error) {
        console.error('Error toggling like:', error);
        res.status(500).json({ message: 'Failed to toggle like' });
    }
};

export const toggleReplyLike = async (req: Request, res: Response) => {
    try {
        if (rejectInvalidId(req.params.replyId, res)) return;
        const reply = await prisma.reply.findUnique({ where: { id: req.params.replyId } });
        if (!reply) {
            return res.status(404).json({ message: 'Reply not found' });
        }

        const userId = req.user.id;
        const likeIndex = reply.likes.indexOf(userId);

        let updatedLikes = [...reply.likes];
        if (likeIndex > -1) {
            updatedLikes.splice(likeIndex, 1);
        } else {
            updatedLikes.push(userId);
        }

        await prisma.reply.update({
            where: { id: req.params.replyId },
            data: { likes: updatedLikes }
        });

        res.json({ likes: updatedLikes, liked: likeIndex === -1 });
    } catch (error) {
        console.error('Error toggling reply like:', error);
        res.status(500).json({ message: 'Failed to toggle reply like' });
    }
};
