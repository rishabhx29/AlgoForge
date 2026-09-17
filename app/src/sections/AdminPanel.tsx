import { useState, useEffect, useCallback, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Users, FileText, MessageSquare,
    Search, Edit3, Trash2, Ban, Shield, ShieldOff,
    Plus, X, Save, ChevronLeft, ChevronRight,
    Activity, BookOpen, UserCheck, AlertTriangle,
    RefreshCw
} from 'lucide-react';
import * as adminApi from '@/api/admin';
import { getLearningPaths, getTopicsByPath, getProblemsByTopic } from '@/api/content';

type AdminTab = 'dashboard' | 'users' | 'content' | 'forum';

interface AdminStats {
    totalUsers: number;
    totalProblems: number;
    totalPosts: number;
    totalTopics: number;
    totalPaths: number;
    activeToday: number;
    bannedUsers: number;
}

interface AdminUser {
    id: string;
    name: string;
    email: string;
    role?: string;
    xp_points?: number;
    streak_days?: number;
    isBanned?: boolean;
}

interface AdminProblem {
    id: string;
    title: string;
    difficulty: string;
    description: string;
    video_link?: string;
    problem_link?: string;
    tags?: string[];
    order_index?: number;
    topic_id?: string;
}

interface AdminForumPost {
    id: string;
    title: string;
    content: string;
    category: string;
    isPinned?: boolean;
    authorInfo?: { name?: string };
    likesCount?: number;
    repliesCount?: number;
    createdAt: string;
    replies?: AdminForumReply[];
    likes?: string[];
    author?: { name?: string };
}

interface AdminForumReply {
    id: string;
    content: string;
    author?: { name?: string };
    likes: string[];
    createdAt: string;
}

interface LearningPath {
    id: string;
    title: string;
}

interface Topic {
    id: string;
    title: string;
}

// ===================== MAIN ADMIN PANEL =====================

export function AdminPanel() {
    const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

    const tabs = [
        { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
        { id: 'users' as const, label: 'Users', icon: Users },
        { id: 'content' as const, label: 'Content', icon: FileText },
        { id: 'forum' as const, label: 'Forum', icon: MessageSquare },
    ];

    return (
        <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#a088ff] to-[#ff6b6b] flex items-center justify-center">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-3xl font-display font-bold text-white">Admin Panel</h1>
                    </div>
                    <p className="text-white/50 ml-[52px]">Manage users, content, and community</p>
                </motion.div>

                {/* Tab Bar */}
                <div className="flex gap-2 mb-8 p-1.5 rounded-2xl bg-white/5 border border-white/10 w-fit">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${activeTab === tab.id
                                ? 'bg-gradient-to-r from-[#a088ff] to-[#63e3ff] text-[#0a0a0a] shadow-lg shadow-[#a088ff]/20'
                                : 'text-white/60 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'dashboard' && <DashboardTab />}
                        {activeTab === 'users' && <UsersTab />}
                        {activeTab === 'content' && <ContentTab />}
                        {activeTab === 'forum' && <ForumTab />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

// ===================== DASHBOARD TAB =====================

function DashboardTab() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        adminApi.getAdminStats().then(setStats).catch(console.error).finally(() => setLoading(false));
    }, []);

    if (loading) return <LoadingSpinner />;

    const cards = [
        { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: '#a088ff' },
        { label: 'Total Problems', value: stats?.totalProblems || 0, icon: BookOpen, color: '#63e3ff' },
        { label: 'Forum Posts', value: stats?.totalPosts || 0, icon: MessageSquare, color: '#ff8a63' },
        { label: 'Topics', value: stats?.totalTopics || 0, icon: FileText, color: '#4ade80' },
        { label: 'Learning Paths', value: stats?.totalPaths || 0, icon: Activity, color: '#f59e0b' },
        { label: 'Active Today', value: stats?.activeToday || 0, icon: UserCheck, color: '#22d3ee' },
        { label: 'Banned Users', value: stats?.bannedUsers || 0, icon: AlertTriangle, color: '#ef4444' },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card, i) => (
                <motion.div
                    key={card.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 group hover:border-white/20 transition-all"
                >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: `radial-gradient(circle at 50% 50%, ${card.color}08, transparent 70%)` }} />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                style={{ background: `${card.color}15` }}>
                                <card.icon className="w-5 h-5" style={{ color: card.color }} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-white mb-1">{card.value}</p>
                        <p className="text-sm text-white/50">{card.label}</p>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

// ===================== USERS TAB =====================

function UsersTab() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [editForm, setEditForm] = useState<Record<string, string | number>>({});

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await adminApi.getUsers(page, 15, search);
            setUsers(data.users);
            setTotalPages(data.totalPages);
        } catch (err) { console.error(err); }
        setLoading(false);
    }, [page, search]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleBan = async (userId: string) => {
        try {
            await adminApi.toggleBanUser(userId);
            fetchUsers();
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (userId: string) => {
        if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
        try {
            await adminApi.deleteUser(userId);
            fetchUsers();
        } catch (err) { console.error(err); }
    };

    const handleEdit = (user: AdminUser) => {
        setEditingUser(user);
        setEditForm({
            name: user.name,
            xp_points: user.xp_points || 0,
            streak_days: user.streak_days || 0,
            role: user.role || 'user'
        });
    };

    const handleSaveEdit = async () => {
        if (!editingUser) return;
        try {
            await adminApi.editUser(editingUser.id, editForm);
            setEditingUser(null);
            fetchUsers();
        } catch (err) { console.error(err); }
    };

    return (
        <div>
            {/* Search Bar */}
            <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                        type="text"
                        placeholder="Search users by name or email..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#a088ff]/50 transition-colors"
                    />
                </div>
                <button onClick={fetchUsers} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all">
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {loading ? <LoadingSpinner /> : (
                <>
                    {/* Users Table */}
                    <div className="rounded-2xl border border-white/10 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/[0.03]">
                                    <th className="text-left px-5 py-3 text-xs font-medium text-white/50 uppercase tracking-wider">User</th>
                                    <th className="text-left px-5 py-3 text-xs font-medium text-white/50 uppercase tracking-wider">Role</th>
                                    <th className="text-left px-5 py-3 text-xs font-medium text-white/50 uppercase tracking-wider">XP</th>
                                    <th className="text-left px-5 py-3 text-xs font-medium text-white/50 uppercase tracking-wider">Streak</th>
                                    <th className="text-left px-5 py-3 text-xs font-medium text-white/50 uppercase tracking-wider">Status</th>
                                    <th className="text-right px-5 py-3 text-xs font-medium text-white/50 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#a088ff] to-[#63e3ff] flex items-center justify-center text-xs font-bold text-[#0a0a0a]">
                                                    {user.name?.charAt(0).toUpperCase() || '?'}
                                                </div>
                                                <div>
                                                    <p className="text-white text-sm font-medium">{user.name}</p>
                                                    <p className="text-white/40 text-xs">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`px-2 py-1 rounded-md text-xs font-medium ${user.role === 'admin'
                                                ? 'bg-[#a088ff]/20 text-[#a088ff]'
                                                : 'bg-white/5 text-white/60'
                                                }`}>
                                                {user.role || 'user'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-white/70 text-sm">{user.xp_points || 0}</td>
                                        <td className="px-5 py-4 text-white/70 text-sm">{user.streak_days || 0}</td>
                                        <td className="px-5 py-4">
                                            <span className={`px-2 py-1 rounded-md text-xs font-medium ${user.isBanned
                                                ? 'bg-red-500/20 text-red-400'
                                                : 'bg-emerald-500/20 text-emerald-400'
                                                }`}>
                                                {user.isBanned ? 'Banned' : 'Active'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => handleEdit(user)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all" title="Edit">
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleBan(user.id)} className="p-1.5 rounded-lg hover:bg-amber-500/10 text-white/40 hover:text-amber-400 transition-all" title={user.isBanned ? 'Unban' : 'Ban'}>
                                                    {user.isBanned ? <ShieldOff className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                                </button>
                                                <button onClick={() => handleDelete(user.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-all" title="Delete">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-3 mt-6">
                            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-white/60 text-sm">Page {page} of {totalPages}</span>
                            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Edit Modal */}
            <AnimatePresence>
                {editingUser && (
                    <Modal title={`Edit User: ${editingUser.name}`} onClose={() => setEditingUser(null)}>
                        <div className="space-y-4">
                            <FormField label="Name" value={editForm.name} onChange={(v) => setEditForm({ ...editForm, name: v })} />
                            <FormField label="XP Points" type="number" value={editForm.xp_points} onChange={(v) => setEditForm({ ...editForm, xp_points: parseInt(v) || 0 })} />
                            <FormField label="Streak Days" type="number" value={editForm.streak_days} onChange={(v) => setEditForm({ ...editForm, streak_days: parseInt(v) || 0 })} />
                            <div>
                                <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1 block">Role</label>
                                <select
                                    value={editForm.role}
                                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#a088ff]/50"
                                >
                                    <option value="user" className="bg-[#1a1a1a]">User</option>
                                    <option value="admin" className="bg-[#1a1a1a]">Admin</option>
                                </select>
                            </div>
                            <button onClick={handleSaveEdit} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#a088ff] to-[#63e3ff] text-[#0a0a0a] font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                                <Save className="w-4 h-4" /> Save Changes
                            </button>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>
        </div>
    );
}

// ===================== CONTENT TAB =====================

function ContentTab() {
    const [paths, setPaths] = useState<LearningPath[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [problems, setProblems] = useState<AdminProblem[]>([]);
    const [selectedPath, setSelectedPath] = useState<string>('');
    const [selectedTopic, setSelectedTopic] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingProblem, setEditingProblem] = useState<AdminProblem | null>(null);
    const [form, setForm] = useState({ title: '', difficulty: 'Easy', description: '', video_link: '', problem_link: '', tags: '' });

    useEffect(() => {
        getLearningPaths().then((p) => { setPaths(p); setLoading(false); }).catch(console.error);
    }, []);

    useEffect(() => {
        if (selectedPath) {
            setLoading(true);
            getTopicsByPath(selectedPath).then((t) => { setTopics(t); setSelectedTopic(''); setProblems([]); }).catch(console.error).finally(() => setLoading(false));
        }
    }, [selectedPath]);

    useEffect(() => {
        if (selectedTopic) {
            setLoading(true);
            getProblemsByTopic(selectedTopic).then(setProblems).catch(console.error).finally(() => setLoading(false));
        }
    }, [selectedTopic]);

    const resetForm = () => setForm({ title: '', difficulty: 'Easy', description: '', video_link: '', problem_link: '', tags: '' });

    const handleAdd = async () => {
        try {
            await adminApi.addProblem({
                title: form.title,
                topic_id: selectedTopic,
                difficulty: form.difficulty,
                description: form.description,
                video_link: form.video_link,
                problem_link: form.problem_link,
                tags: form.tags ? form.tags.split(',').map(t => t.trim()) : []
            });
            setShowAddForm(false);
            resetForm();
            const updated = await getProblemsByTopic(selectedTopic);
            setProblems(updated);
        } catch (err) { console.error(err); }
    };

    const handleEditSave = async () => {
        if (!editingProblem) return;
        try {
            await adminApi.editProblem(editingProblem.id, {
                title: form.title,
                difficulty: form.difficulty,
                description: form.description,
                video_link: form.video_link,
                problem_link: form.problem_link,
                tags: form.tags ? form.tags.split(',').map(t => t.trim()) : []
            });
            setEditingProblem(null);
            resetForm();
            const updated = await getProblemsByTopic(selectedTopic);
            setProblems(updated);
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this problem?')) return;
        try {
            await adminApi.deleteProblem(id);
            const updated = await getProblemsByTopic(selectedTopic);
            setProblems(updated);
        } catch (err) { console.error(err); }
    };

    const openEdit = (p: AdminProblem) => {
        setEditingProblem(p);
        setForm({
            title: p.title,
            difficulty: p.difficulty,
            description: p.description,
            video_link: p.video_link || '',
            problem_link: p.problem_link || '',
            tags: p.tags?.join(', ') || ''
        });
    };

    return (
        <div>
            {/* Selectors */}
            <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1 block">Learning Path</label>
                    <select
                        value={selectedPath}
                        onChange={(e) => setSelectedPath(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#a088ff]/50"
                    >
                        <option value="" className="bg-[#1a1a1a]">Select a path...</option>
                        {paths.map(p => <option key={p.id} value={p.id} className="bg-[#1a1a1a]">{p.title}</option>)}
                    </select>
                </div>
                {topics.length > 0 && (
                    <div className="flex-1 min-w-[200px]">
                        <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1 block">Topic</label>
                        <select
                            value={selectedTopic}
                            onChange={(e) => setSelectedTopic(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#a088ff]/50"
                        >
                            <option value="" className="bg-[#1a1a1a]">Select a topic...</option>
                            {topics.map(t => <option key={t.id} value={t.id} className="bg-[#1a1a1a]">{t.title}</option>)}
                        </select>
                    </div>
                )}
                {selectedTopic && (
                    <div className="flex items-end">
                        <button onClick={() => { setShowAddForm(true); resetForm(); }} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#a088ff] to-[#63e3ff] text-[#0a0a0a] font-medium text-sm hover:opacity-90 flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Add Problem
                        </button>
                    </div>
                )}
            </div>

            {loading && selectedPath ? <LoadingSpinner /> : selectedTopic && (
                <>
                    {/* Problems List */}
                    <div className="space-y-3">
                        {problems.length === 0 ? (
                            <div className="text-center py-12 text-white/40">No problems in this topic yet.</div>
                        ) : problems.map((p, i) => (
                            <motion.div
                                key={p.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.03 }}
                                className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                            >
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <span className="text-white/30 text-xs w-6 text-center">{p.order_index}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm font-medium truncate">{p.title}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-xs px-2 py-0.5 rounded ${p.difficulty === 'Easy' ? 'bg-emerald-500/20 text-emerald-400' :
                                                p.difficulty === 'Medium' ? 'bg-amber-500/20 text-amber-400' :
                                                    'bg-red-500/20 text-red-400'
                                                }`}>{p.difficulty}</span>
                                            {p.tags?.slice(0, 3).map((tag: string) => (
                                                <span key={tag} className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded">{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                    <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all">
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-all">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </>
            )}

            {!selectedPath && !loading && (
                <div className="text-center py-20 text-white/30">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select a learning path and topic to manage problems</p>
                </div>
            )}

            {/* Add / Edit Modal */}
            <AnimatePresence>
                {(showAddForm || editingProblem) && (
                    <Modal title={editingProblem ? 'Edit Problem' : 'Add New Problem'} onClose={() => { setShowAddForm(false); setEditingProblem(null); resetForm(); }}>
                        <div className="space-y-4">
                            <FormField label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="Two Sum" />
                            <div>
                                <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1 block">Difficulty</label>
                                <select
                                    value={form.difficulty}
                                    onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#a088ff]/50"
                                >
                                    <option value="Easy" className="bg-[#1a1a1a]">Easy</option>
                                    <option value="Medium" className="bg-[#1a1a1a]">Medium</option>
                                    <option value="Hard" className="bg-[#1a1a1a]">Hard</option>
                                </select>
                            </div>
                            <FormField label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Problem description..." multiline />
                            <FormField label="Problem Link" value={form.problem_link} onChange={(v) => setForm({ ...form, problem_link: v })} placeholder="https://leetcode.com/..." />
                            <FormField label="Video Link" value={form.video_link} onChange={(v) => setForm({ ...form, video_link: v })} placeholder="https://youtube.com/..." />
                            <FormField label="Tags (comma separated)" value={form.tags} onChange={(v) => setForm({ ...form, tags: v })} placeholder="Array, HashMap, Two Pointers" />
                            <button
                                onClick={editingProblem ? handleEditSave : handleAdd}
                                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#a088ff] to-[#63e3ff] text-[#0a0a0a] font-medium hover:opacity-90 flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" /> {editingProblem ? 'Save Changes' : 'Add Problem'}
                            </button>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>
        </div>
    );
}

// ===================== FORUM TAB =====================

function ForumTab() {
    const [posts, setPosts] = useState<AdminForumPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [editingPost, setEditingPost] = useState<AdminForumPost | null>(null);
    const [editForm, setEditForm] = useState({ title: '', content: '', category: 'general', isPinned: false });

    const fetchPosts = useCallback(async () => {
        setLoading(true);
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
            const res = await fetch(`${API_BASE_URL}/api/forum?page=${page}&limit=15`);
            const data = await res.json();
            setPosts(data.posts || []);
            setTotalPages(data.totalPages || 1);
        } catch (err) { console.error(err); }
        setLoading(false);
    }, [page]);

    useEffect(() => { fetchPosts(); }, [fetchPosts]);

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this post?')) return;
        try {
            await adminApi.deleteForumPost(id);
            fetchPosts();
        } catch (err) { console.error(err); }
    };

    const handleEdit = async (post: AdminForumPost) => {
        // Fetch full post to get replies if they aren't included (fetchPosts aggregation doesn't include them)
        try {
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
            const res = await fetch(`${API_BASE_URL}/api/forum/${post.id}`);
            const fullPost = await res.json();
            setEditingPost(fullPost);
            setEditForm({ title: fullPost.title, content: fullPost.content, category: fullPost.category, isPinned: fullPost.isPinned || false });
        } catch (err) {
            console.error('Failed to fetch post details', err);
            setEditingPost(post);
            setEditForm({ title: post.title, content: post.content, category: post.category, isPinned: post.isPinned || false });
        }
    };

    const handleSaveEdit = async () => {
        if (!editingPost) return;
        try {
            await adminApi.editForumPost(editingPost.id, editForm);
            setEditingPost(null);
            fetchPosts();
        } catch (err) { console.error(err); }
    };

    const handleDeleteReply = async (postId: string, replyId: string) => {
        if (!confirm('Delete this reply?')) return;
        try {
            await adminApi.deleteForumReply(postId, replyId);
            // Refresh post details to update reply list in modal
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
            const res = await fetch(`${API_BASE_URL}/api/forum/${postId}`);
            const fullPost = await res.json();
            setEditingPost(fullPost);
            fetchPosts(); // Also refresh main list to update reply counts
        } catch (err) { console.error(err); }
    };

    return (
        <div>
            {loading ? <LoadingSpinner /> : (
                <div className="space-y-3">
                    {posts.length === 0 ? (
                        <div className="text-center py-12 text-white/40">No forum posts yet.</div>
                    ) : posts.map((post, i) => (
                        <motion.div
                            key={post.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        {post.isPinned && <span className="text-xs bg-[#a088ff]/20 text-[#a088ff] px-2 py-0.5 rounded">Pinned</span>}
                                        <span className="text-xs bg-white/5 text-white/40 px-2 py-0.5 rounded">{post.category}</span>
                                    </div>
                                    <p className="text-white font-medium text-sm truncate">{post.title}</p>
                                    <p className="text-white/40 text-xs mt-1">
                                        by {post.authorInfo?.name || 'Unknown'} · {post.likesCount || 0} likes · {post.repliesCount || 0} replies · {new Date(post.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                    <button onClick={() => handleEdit(post)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all shadow-sm">
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(post.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-all shadow-sm">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-6">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-white/60 text-sm">Page {page} of {totalPages}</span>
                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Edit Post Modal */}
            <AnimatePresence>
                {editingPost && (
                    <Modal title="Edit Post" onClose={() => setEditingPost(null)}>
                        <div className="space-y-4">
                            <FormField label="Title" value={editForm.title} onChange={(v) => setEditForm({ ...editForm, title: v })} />
                            <FormField label="Content" value={editForm.content} onChange={(v) => setEditForm({ ...editForm, content: v })} multiline />
                            <div>
                                <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1 block">Category</label>
                                <select
                                    value={editForm.category}
                                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#a088ff]/50"
                                >
                                    {['general', 'dsa', 'interview', 'system-design', 'career', 'feedback'].map(c => (
                                        <option key={c} value={c} className="bg-[#1a1a1a]">{c}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-white/5">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editForm.isPinned}
                                        onChange={(e) => setEditForm({ ...editForm, isPinned: e.target.checked })}
                                        className="w-4 h-4 rounded bg-white/5 border border-white/10 accent-[#a088ff]"
                                    />
                                    <span className="text-white/70 text-sm">Pin this post</span>
                                </label>
                            </div>

                            {/* Replies Section */}
                            {editingPost.replies && editingPost.replies.length > 0 && (
                                <div className="mt-4">
                                    <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2 block">Replies ({editingPost.replies.length})</label>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                        {editingPost.replies.map((reply: AdminForumReply) => (
                                            <div key={reply.id} className="p-3 rounded-lg bg-white/5 border border-white/5 flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-white/80 line-clamp-2">{reply.content}</p>
                                                    <p className="text-[10px] text-white/40 mt-1">by {reply.author?.name || 'Unknown'}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteReply(editingPost.id, reply.id)}
                                                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-all flex-shrink-0"
                                                    title="Delete Reply"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button onClick={handleSaveEdit} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#a088ff] to-[#63e3ff] text-[#0a0a0a] font-medium hover:opacity-90 flex items-center justify-center gap-2 mt-4">
                                <Save className="w-4 h-4" /> Save Changes
                            </button>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>
        </div>
    );
}

// ===================== SHARED COMPONENTS =====================

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#141414] p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
            >
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                {children}
            </motion.div>
        </motion.div>
    );
}

function FormField({ label, value, onChange, type = 'text', placeholder = '', multiline = false }: {
    label: string; value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string; multiline?: boolean;
}) {
    const id = useId();
    return (
        <div>
            <label htmlFor={id} className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1 block">{label}</label>
            {multiline ? (
                <textarea
                    id={id}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    rows={4}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-[#a088ff]/50 resize-none"
                />
            ) : (
                <input
                    id={id}
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-[#a088ff]/50"
                />
            )}
        </div>
    );
}

function LoadingSpinner() {
    return (
        <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#a088ff]/30 border-t-[#a088ff] rounded-full animate-spin" />
        </div>
    );
}
