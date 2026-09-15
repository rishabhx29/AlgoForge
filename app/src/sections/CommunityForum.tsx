import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    MessageSquare,
    Heart,
    Send,
    Plus,
    X,
    Clock,
    Filter,
    TrendingUp,
    Flame,
    ChevronDown,
    ChevronUp,
    Loader2,
    Pin,
    Code2,
    Briefcase,
    Cpu,
    Compass,
    MessageCircle,
    HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { createPostSchema, TITLE_MAX, CONTENT_MAX } from '@/lib/validators';
import {
    getPosts,
    getPost,
    createPost,
    addReply,
    togglePostLike,
    toggleReplyLike,
} from '@/api/forum';
import type {
    ForumPostSummary,
    ForumPostFull
} from '@/api/forum';

interface CommunityForumProps {
    onBack: () => void;
    onAuthClick: (mode: 'login' | 'signup') => void;
}

const categories = [
    { id: 'all', label: 'All topics', icon: Filter },
    { id: 'general', label: 'General', icon: MessageCircle },
    { id: 'dsa', label: 'DSA', icon: Code2 },
    { id: 'interview', label: 'Interview', icon: Briefcase },
    { id: 'system-design', label: 'System design', icon: Cpu },
    { id: 'career', label: 'Career', icon: Compass },
    { id: 'feedback', label: 'Feedback', icon: HelpCircle }
];

const sortOptions = [
    { id: 'newest', label: 'Newest', icon: Clock },
    { id: 'most-liked', label: 'Most liked', icon: TrendingUp },
    { id: 'most-discussed', label: 'Most discussed', icon: Flame }
];

function timeAgo(dateStr: string): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
}

/**
 * The forum API returns raw Mongo documents, which carry `_id` and no `id`. This component
 * (and the reply like-handlers) key off `id`, so without normalisation every list item gets
 * `key={undefined}` — which logs "Each child in a list should have a unique key" and, worse,
 * makes `post.id === postId` fail so like-toggles never update the row.
 *
 * Copies the document with `id` populated from whichever field is present. Typed loosely
 * because it must accept both the list summary and the detail shapes.
 */
function normalizeId<T extends Record<string, any>>(doc: T): T & { id: string } {
    return { ...doc, id: doc.id ?? doc._id ?? '' };
}

/** Skeleton mirroring the post-row layout so loading matches the loaded state. */
function ForumSkeleton() {
    const widths = [188, 240, 164, 212, 176, 226];
    return (
        <div className="ruled" aria-hidden="true">
            {widths.map((w, i) => (
                <div key={i} className="flex items-start gap-4 px-3 py-4">
                    <div className="skeleton w-7 h-7 rounded-[4px] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <div className="skeleton h-4 rounded-[3px] mb-2" style={{ width: w }} />
                        <div className="skeleton h-3 rounded-[3px] w-1/2" />
                    </div>
                    <div className="skeleton h-4 w-12 rounded-[3px] flex-shrink-0" />
                </div>
            ))}
        </div>
    );
}

export function CommunityForum({ onBack, onAuthClick }: CommunityForumProps) {
    const { user } = useAuth();

    // List state
    const [posts, setPosts] = useState<ForumPostSummary[]>([]);
    const [activeCategory, setActiveCategory] = useState('all');
    const [activeSort, setActiveSort] = useState('newest');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);

    // Detail state
    const [selectedPost, setSelectedPost] = useState<ForumPostFull | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [replySubmitting, setReplySubmitting] = useState(false);

    // Create post state
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [createSubmitting, setCreateSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        reset,
        formState: { errors, isValid },
    } = useForm({
        resolver: zodResolver(createPostSchema),
        defaultValues: {
            title: '',
            content: '',
            category: 'general',
        },
        mode: 'onChange',
    });

    const watchTitle = watch('title');
    const watchContent = watch('content');

    // Fetch posts
    const fetchPosts = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getPosts(activeCategory, activeSort, currentPage);
            // The API returns Mongo documents keyed by `_id`, but the rest of this
            // component identifies posts by `id` (list keys, like-toggling, detail
            // navigation). Normalise once at the boundary so no consumer has to care.
            setPosts((data.posts || []).map(normalizeId));
            setTotalPages(data.totalPages);
        } catch (err) {
            console.error('Failed to fetch posts:', err);
        } finally {
            setLoading(false);
        }
    }, [activeCategory, activeSort, currentPage]);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    const handleOpenPost = async (postId: string) => {
        setDetailLoading(true);
        try {
            const data = await getPost(postId);
            setSelectedPost(
                data
                    ? { ...normalizeId(data), replies: (data.replies || []).map(normalizeId) }
                    : data
            );
        } catch (err) {
            console.error('Failed to fetch post:', err);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleCreatePost = async (data: { title: string; content: string; category: string }) => {
        if (!user) {
            onAuthClick('login');
            return;
        }

        setCreateSubmitting(true);
        try {
            await createPost({
                title: data.title.trim(),
                content: data.content.trim(),
                category: data.category,
            });
            reset();
            setShowCreateForm(false);
            fetchPosts();
        } catch (err) {
            console.error('Failed to create post:', err);
        } finally {
            setCreateSubmitting(false);
        }
    };

    const handleReply = async () => {
        if (!user) {
            onAuthClick('login');
            return;
        }
        if (!selectedPost || !replyText.trim()) return;

        setReplySubmitting(true);
        try {
            const updated = await addReply(selectedPost.id, replyText.trim());
            setSelectedPost(
                updated
                    ? { ...normalizeId(updated), replies: (updated.replies || []).map(normalizeId) }
                    : updated
            );
            setReplyText('');
        } catch (err) {
            console.error('Failed to add reply:', err);
        } finally {
            setReplySubmitting(false);
        }
    };

    const handleLikePost = async (postId: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!user) {
            onAuthClick('login');
            return;
        }
        try {
            const result = await togglePostLike(postId);
            if (selectedPost && selectedPost.id === postId) {
                setSelectedPost({ ...selectedPost, likes: result.likes });
            }
            setPosts(prev => prev.map(p =>
                p.id === postId ? { ...p, likes: result.likes, likesCount: result.likes.length } : p
            ));
        } catch (err) {
            console.error('Failed to like post:', err);
        }
    };

    const handleLikeReply = async (replyId: string) => {
        if (!user || !selectedPost) {
            onAuthClick('login');
            return;
        }
        try {
            const result = await toggleReplyLike(selectedPost.id, replyId);
            setSelectedPost({
                ...selectedPost,
                replies: selectedPost.replies.map(r =>
                    r.id === replyId ? { ...r, likes: result.likes } : r
                )
            });
        } catch (err) {
            console.error('Failed to like reply:', err);
        }
    };

    // Post detail view
    if (selectedPost || detailLoading) {
        return (
            <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <Button
                        variant="ghost"
                        onClick={() => { setSelectedPost(null); setReplyText(''); }}
                        className="mb-6 text-[#b6b1ad] hover:text-[#f1eeea]"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to forum
                    </Button>

                    {detailLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 text-[#f0997d] animate-spin" />
                        </div>
                    ) : selectedPost && (
                        <div>
                            {/* Post Content */}
                            <div className="bg-[#222225] border border-[rgba(241,238,234,0.1)] rounded-[6px] p-8 mb-6">
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="w-10 h-10 rounded-[4px] bg-[#2c2b30] flex items-center justify-center font-medium text-[0.75rem] text-[#b6b1ad] flex-shrink-0">
                                        {selectedPost.author?.name?.slice(0, 2).toUpperCase() || '??'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h1 className="text-[1.5rem] font-medium text-[#f1eeea] tracking-[-0.015em] mb-2">
                                            {selectedPost.isPinned && <Pin className="w-4 h-4 inline mr-2 text-[#f0997d]" aria-hidden="true" />}
                                            {selectedPost.title}
                                        </h1>
                                        <div className="flex items-center gap-3 text-[0.75rem] text-[#8f8a85]">
                                            <span className="font-medium text-[#b6b1ad]">{selectedPost.author?.name}</span>
                                            <span aria-hidden="true">·</span>
                                            <span>{timeAgo(selectedPost.createdAt)}</span>
                                            <span aria-hidden="true">·</span>
                                            <span className="text-[#b6b1ad]">
                                                {selectedPost.category}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-[#f1eeea] text-[0.9375rem] leading-relaxed whitespace-pre-wrap mb-6">
                                    {selectedPost.content}
                                </p>

                                <div className="flex items-center gap-4 pt-4 border-t border-[rgba(241,238,234,0.1)]">
                                    <button
                                        onClick={() => handleLikePost(selectedPost.id)}
                                        aria-label="Like post"
                                        className={`flex items-center gap-2 text-[0.8125rem] transition-colors duration-[var(--af-dur-fast)] ${user && selectedPost.likes.includes(user.id)
                                            ? 'text-[#d98a76]'
                                            : 'text-[#8f8a85] hover:text-[#d98a76]'
                                            }`}
                                    >
                                        <Heart className={`w-4 h-4 ${user && selectedPost.likes.includes(user.id) ? 'fill-current' : ''}`} />
                                        <span className="tnum">{selectedPost.likes.length}</span>
                                    </button>
                                    <span className="flex items-center gap-2 text-[0.8125rem] text-[#8f8a85]">
                                        <MessageSquare className="w-4 h-4" />
                                        <span className="tnum">{selectedPost.replies.length}</span> replies
                                    </span>
                                </div>
                            </div>

                            {/* Replies */}
                            <div className="ruled mb-6">
                                {selectedPost.replies.map((reply) => (
                                    <div
                                        key={reply.id}
                                        className="px-3 py-4"
                                    >
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-7 h-7 rounded-[4px] bg-[#2c2b30] flex items-center justify-center text-[0.75rem] font-medium text-[#b6b1ad]">
                                                {reply.author?.name?.slice(0, 2).toUpperCase() || '??'}
                                            </div>
                                            <div>
                                                <span className="text-[#f1eeea] text-[0.8125rem] font-medium">{reply.author?.name}</span>
                                                <span className="text-[#8f8a85] text-[0.75rem] ml-2">{timeAgo(reply.createdAt)}</span>
                                            </div>
                                        </div>
                                        <p className="text-[#b6b1ad] text-[0.875rem] leading-relaxed whitespace-pre-wrap mb-3">
                                            {reply.content}
                                        </p>
                                        <button
                                            onClick={() => handleLikeReply(reply.id)}
                                            aria-label="Like reply"
                                            className={`flex items-center gap-1.5 text-[0.75rem] transition-colors duration-[var(--af-dur-fast)] ${user && reply.likes.includes(user.id)
                                                ? 'text-[#d98a76]'
                                                : 'text-[#8f8a85] hover:text-[#d98a76]'
                                                }`}
                                        >
                                            <Heart className={`w-3 h-3 ${user && reply.likes.includes(user.id) ? 'fill-current' : ''}`} />
                                            <span className="tnum">{reply.likes.length}</span>
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Reply Input */}
                            <div className="bg-[#222225] border border-[rgba(241,238,234,0.1)] rounded-[6px] p-5">
                                {user ? (
                                    <div className="flex gap-3">
                                        <div className="w-7 h-7 rounded-[4px] bg-[#2c2b30] flex items-center justify-center text-[0.75rem] font-medium text-[#b6b1ad] flex-shrink-0">
                                            {user.name?.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <textarea
                                                value={replyText}
                                                onChange={e => setReplyText(e.target.value)}
                                                placeholder="Write a reply…"
                                                aria-label="Write a reply"
                                                className="w-full bg-[#19191b] border border-[rgba(241,238,234,0.1)] rounded-[6px] px-4 py-3 text-[#f1eeea] text-[0.875rem] placeholder:text-[#8f8a85] focus:outline-none focus-visible:border-[#f0997d] resize-none min-h-[80px]"
                                            />
                                            <div className="flex justify-end mt-2">
                                                <Button
                                                    onClick={handleReply}
                                                    disabled={!replyText.trim() || replySubmitting}
                                                    className="bg-[#f0997d] text-[#19191b] hover:bg-[#ffb197] active:scale-[0.98] text-[0.8125rem] font-medium rounded-[4px] transition-colors duration-[var(--af-dur-fast)]"
                                                    size="sm"
                                                >
                                                    {replySubmitting ? (
                                                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                                    ) : (
                                                        <Send className="w-4 h-4 mr-1" />
                                                    )}
                                                    Reply
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <p className="text-[#b6b1ad] text-[0.875rem] mb-3">Sign in to join the conversation</p>
                                        <Button
                                            onClick={() => onAuthClick('login')}
                                            className="bg-[#f0997d] text-[#19191b] hover:bg-[#ffb197] active:scale-[0.98] text-[0.8125rem] font-medium rounded-[4px] transition-colors duration-[var(--af-dur-fast)]"
                                            size="sm"
                                        >
                                            Sign in
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Forum list view
    return (
        <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="mb-6 text-[#b6b1ad] hover:text-[#f1eeea]"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to home
                </Button>

                {/* Header */}
                <div className="mb-8 pb-4 border-b border-[rgba(241,238,234,0.2)]">
                    <h1 className="text-3xl sm:text-4xl font-medium text-[#f1eeea] tracking-[-0.03em] mb-3">
                        Community forum
                    </h1>
                    <p className="text-[0.9375rem] text-[#b6b1ad] leading-relaxed max-w-2xl">
                        Ask questions, share solutions, and learn from fellow developers.
                    </p>
                </div>

                {/* Top Bar: Categories + Sort + New Post */}
                <div className="pb-4 mb-6 border-b border-[rgba(241,238,234,0.2)]">
                    {/* Category Tabs */}
                    <div className="flex flex-wrap gap-1 mb-4" role="group" aria-label="Filter by category">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => { setActiveCategory(cat.id); setCurrentPage(1); }}
                                aria-pressed={activeCategory === cat.id}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[0.8125rem] font-medium transition-colors duration-[var(--af-dur-fast)] ${activeCategory === cat.id
                                    ? 'bg-[#f0997d] text-[#19191b]'
                                    : 'text-[#b6b1ad] hover:text-[#f1eeea] bg-[#222225]'
                                    }`}
                            >
                                <cat.icon className="w-3.5 h-3.5" />
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Sort + New Post */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex gap-1" role="group" aria-label="Sort posts">
                            {sortOptions.map(sort => (
                                <button
                                    key={sort.id}
                                    onClick={() => { setActiveSort(sort.id); setCurrentPage(1); }}
                                    aria-pressed={activeSort === sort.id}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[0.75rem] font-medium transition-colors duration-[var(--af-dur-fast)] ${activeSort === sort.id
                                        ? 'bg-[#2c2b30] text-[#f1eeea]'
                                        : 'text-[#8f8a85] hover:text-[#f1eeea]'
                                        }`}
                                >
                                    <sort.icon className="w-3 h-3" />
                                    {sort.label}
                                </button>
                            ))}
                        </div>

                        <Button
                            onClick={() => {
                                if (!user) { onAuthClick('login'); return; }
                                setShowCreateForm(true);
                            }}
                            className="bg-[#f0997d] text-[#19191b] hover:bg-[#ffb197] active:scale-[0.98] text-[0.8125rem] font-medium rounded-[4px] transition-colors duration-[var(--af-dur-fast)]"
                            size="sm"
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            New post
                        </Button>
                    </div>
                </div>

                {/* Create Post Form */}
                <AnimatePresence>
                    {showCreateForm && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                            className="overflow-hidden mb-6"
                        >
                            <form
                                onSubmit={handleSubmit(handleCreatePost)}
                                className="bg-[#222225] rounded-[6px] p-6 border border-[rgba(241,238,234,0.1)]"
                            >
                                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[rgba(241,238,234,0.1)]">
                                    <h3 className="text-[1.125rem] font-medium text-[#f1eeea]">Create new post</h3>
                                    <button
                                        type="button"
                                        onClick={() => { setShowCreateForm(false); reset(); }}
                                        aria-label="Close create post form"
                                        className="p-1.5 icon-btn text-[#8f8a85] hover:text-[#f1eeea]"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="mb-3">
                                    <input
                                        {...register('title')}
                                        placeholder="Post title…"
                                        aria-label="Post title"
                                        maxLength={TITLE_MAX}
                                        className="w-full bg-[#19191b] border border-[rgba(241,238,234,0.1)] rounded-[6px] px-4 py-3 text-[#f1eeea] placeholder:text-[#8f8a85] focus:outline-none focus-visible:border-[#f0997d]"
                                    />
                                    <div className="flex justify-between mt-1.5 px-1">
                                        {errors.title ? (
                                            <span className="text-[#d98a76] text-[0.75rem]">{errors.title.message}</span>
                                        ) : (
                                            <span />
                                        )}
                                        <span className={`text-[0.75rem] tnum ${watchTitle.length >= TITLE_MAX ? 'text-[#d98a76]' : 'text-[#8f8a85]'}`}>
                                            {watchTitle.length} / {TITLE_MAX}
                                        </span>
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <textarea
                                        {...register('content')}
                                        placeholder="What's on your mind? Share your thoughts, questions, or solutions…"
                                        aria-label="Post content"
                                        maxLength={CONTENT_MAX}
                                        className="w-full bg-[#19191b] border border-[rgba(241,238,234,0.1)] rounded-[6px] px-4 py-3 text-[#f1eeea] text-[0.875rem] placeholder:text-[#8f8a85] focus:outline-none focus-visible:border-[#f0997d] resize-none min-h-[120px]"
                                    />
                                    <div className="flex justify-between mt-1.5 px-1">
                                        {errors.content ? (
                                            <span className="text-[#d98a76] text-[0.75rem]">{errors.content.message}</span>
                                        ) : (
                                            <span />
                                        )}
                                        <span className={`text-[0.75rem] tnum ${watchContent.length >= CONTENT_MAX ? 'text-[#d98a76]' : 'text-[#8f8a85]'}`}>
                                            {watchContent.length.toLocaleString()} / {CONTENT_MAX.toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[#8f8a85] text-[0.75rem]">Category:</span>
                                        <select
                                            {...register('category')}
                                            aria-label="Category"
                                            className="bg-[#19191b] border border-[rgba(241,238,234,0.1)] rounded-[4px] px-3 py-1.5 text-[#f1eeea] text-[0.8125rem] focus:outline-none focus-visible:border-[#f0997d] appearance-none cursor-pointer"
                                        >
                                            {categories.filter(c => c.id !== 'all').map(c => (
                                                <option key={c.id} value={c.id} className="bg-[#222225]">{c.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={!isValid || createSubmitting}
                                        className="bg-[#f0997d] text-[#19191b] hover:bg-[#ffb197] active:scale-[0.98] text-[0.8125rem] font-medium rounded-[4px] transition-colors duration-[var(--af-dur-fast)]"
                                        size="sm"
                                    >
                                        {createSubmitting ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                        ) : (
                                            <Send className="w-4 h-4 mr-1" />
                                        )}
                                        Post
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Posts List */}
                {loading ? (
                    <ForumSkeleton />
                ) : posts.length === 0 ? (
                    <div className="text-center py-20">
                        <MessageSquare className="w-6 h-6 text-[#3a393e] mx-auto mb-4" />
                        <h3 className="text-[1.125rem] text-[#b6b1ad] mb-2">No posts yet</h3>
                        <p className="text-[#8f8a85] text-[0.8125rem] mb-6">Be the first to start a discussion.</p>
                        <Button
                            onClick={() => {
                                if (!user) { onAuthClick('login'); return; }
                                setShowCreateForm(true);
                            }}
                            className="bg-[#f0997d] text-[#19191b] hover:bg-[#ffb197] active:scale-[0.98] text-[0.8125rem] font-medium rounded-[4px] transition-colors duration-[var(--af-dur-fast)]"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create first post
                        </Button>
                    </div>
                ) : (
                    <div className="ruled">
                        {posts.map((post) => (
                            <div
                                key={post.id}
                                onClick={() => handleOpenPost(post.id)}
                                className="flex items-start gap-4 px-3 py-4 cursor-pointer row-interactive"
                            >
                                {/* Author Avatar — square */}
                                <div className="w-9 h-9 rounded-[4px] bg-[#2c2b30] flex items-center justify-center font-medium text-[0.75rem] text-[#b6b1ad] flex-shrink-0">
                                    {post.authorInfo?.name?.slice(0, 2).toUpperCase() || '??'}
                                </div>

                                <div className="flex-1 min-w-0">
                                    {/* Title */}
                                    <div className="flex items-center gap-2 mb-1">
                                        {post.isPinned && <Pin className="w-3.5 h-3.5 text-[#f0997d] flex-shrink-0" aria-hidden="true" />}
                                        <h3 className="text-[#f1eeea] font-medium truncate">
                                            {post.title}
                                        </h3>
                                    </div>

                                    {/* Author + time + category */}
                                    <div className="flex items-center gap-2 text-[0.75rem] text-[#8f8a85] mb-2">
                                        <span className="text-[#b6b1ad]">{post.authorInfo?.name}</span>
                                        <span aria-hidden="true">·</span>
                                        <span>{timeAgo(post.createdAt)}</span>
                                        <span aria-hidden="true">·</span>
                                        <span className="text-[#8f8a85]">
                                            {post.category}
                                        </span>
                                    </div>

                                    {/* Snippet */}
                                    <p className="text-[#b6b1ad] text-[0.8125rem] leading-relaxed line-clamp-2 mb-3">
                                        {post.content}
                                    </p>

                                    {/* Stats */}
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={(e) => handleLikePost(post.id, e)}
                                            aria-label={`Like ${post.title}`}
                                            className={`flex items-center gap-1.5 text-[0.75rem] transition-colors duration-[var(--af-dur-fast)] ${user && post.likes.includes(user.id)
                                                ? 'text-[#d98a76]'
                                                : 'text-[#8f8a85] hover:text-[#d98a76]'
                                                }`}
                                        >
                                            <Heart className={`w-3.5 h-3.5 ${user && post.likes.includes(user.id) ? 'fill-current' : ''}`} />
                                            <span className="tnum">{post.likesCount}</span>
                                        </button>
                                        <span className="flex items-center gap-1.5 text-[0.75rem] text-[#8f8a85]">
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            <span className="tnum">{post.repliesCount}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-8">
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                            aria-label="Previous page"
                            className="text-[#b6b1ad] hover:text-[#f1eeea]"
                        >
                            <ChevronUp className="w-4 h-4 rotate-[-90deg]" />
                        </Button>
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            const page = i + 1;
                            return (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    aria-label={`Page ${page}`}
                                    aria-current={currentPage === page ? 'page' : undefined}
                                    className={`w-8 h-8 rounded-[4px] text-[0.8125rem] font-medium tnum transition-colors duration-[var(--af-dur-fast)] ${currentPage === page
                                        ? 'bg-[#f0997d] text-[#19191b]'
                                        : 'text-[#b6b1ad] hover:text-[#f1eeea] hover:bg-[#2c2b30]'
                                        }`}
                                >
                                    {page}
                                </button>
                            );
                        })}
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => p + 1)}
                            aria-label="Next page"
                            className="text-[#b6b1ad] hover:text-[#f1eeea]"
                        >
                            <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
