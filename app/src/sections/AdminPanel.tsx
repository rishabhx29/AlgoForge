import { useState, useEffect, useCallback } from 'react';
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
        <div className="min-h-screen bg-[#19191b] pt-24 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8 pb-4 border-b border-[rgba(241,238,234,0.2)]">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-[4px] bg-[#2c2b30] flex items-center justify-center">
                            <Shield className="w-4 h-4 text-[#f0997d]" />
                        </div>
                        <h1 className="text-3xl font-medium text-[#f1eeea] tracking-[-0.03em]">Admin panel</h1>
                    </div>
                    <p className="text-[#b6b1ad] text-[0.9375rem] ml-[48px]">Manage users, content, and community</p>
                </div>

                {/* Tab Bar */}
                <div className="flex gap-1 mb-8 p-1 rounded-[10px] bg-[#222225] border border-[rgba(241,238,234,0.1)] w-fit" role="tablist">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            role="tab"
                            aria-selected={activeTab === tab.id}
                            className={`flex items-center gap-2 px-4 py-2 rounded-[6px] text-[0.875rem] font-medium transition-colors duration-[var(--af-dur-fast)] ${activeTab === tab.id
                                ? 'bg-[#f0997d] text-[#19191b]'
                                : 'text-[#b6b1ad] hover:text-[#f1eeea] hover:bg-[#2c2b30]'
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
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
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
        { label: 'Total users', value: stats?.totalUsers || 0, icon: Users, tone: 'amber' as const },
        { label: 'Total problems', value: stats?.totalProblems || 0, icon: BookOpen, tone: 'teal' as const },
        { label: 'Forum posts', value: stats?.totalPosts || 0, icon: MessageSquare, tone: 'soft' as const },
        { label: 'Topics', value: stats?.totalTopics || 0, icon: FileText, tone: 'soft' as const },
        { label: 'Learning paths', value: stats?.totalPaths || 0, icon: Activity, tone: 'soft' as const },
        { label: 'Active today', value: stats?.activeToday || 0, icon: UserCheck, tone: 'teal' as const },
        { label: 'Banned users', value: stats?.bannedUsers || 0, icon: AlertTriangle, tone: 'danger' as const },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-b border-[rgba(241,238,234,0.2)]">
            {cards.map((card) => (
                <div
                    key={card.label}
                    className="px-4 py-3.5 border-r border-b lg:border-b-0 border-[rgba(241,238,234,0.1)]"
                >
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <span
                            className={`mark ${card.tone === 'soft' ? 'mark-outline' : ''}`}
                            data-tone={card.tone === 'danger' ? 'danger' : card.tone === 'teal' ? 'teal' : card.tone === 'amber' ? 'amber' : 'soft'}
                            aria-hidden="true"
                        />
                        <span className="text-[0.75rem] text-[#8f8a85]">{card.label}</span>
                    </div>
                    <p className="text-[1.5rem] font-medium text-[#f1eeea] tnum leading-none">{card.value.toLocaleString()}</p>
                </div>
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
            <div className="flex items-center gap-4 pb-4 mb-6 border-b border-[rgba(241,238,234,0.2)]">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8f8a85]" />
                    <input
                        type="text"
                        placeholder="Search users by name or email…"
                        aria-label="Search users"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="w-full pl-9 pr-4 py-2 rounded-[6px] bg-[#222225] border border-[rgba(241,238,234,0.1)] text-[#f1eeea] placeholder:text-[#8f8a85] focus:outline-none focus-visible:border-[#f0997d] transition-colors duration-[var(--af-dur-fast)]"
                    />
                </div>
                <button onClick={fetchUsers} aria-label="Refresh users" className="p-2 rounded-[4px] bg-[#222225] border border-[rgba(241,238,234,0.1)] text-[#b6b1ad] hover:text-[#f1eeea] hover:bg-[#2c2b30] transition-colors duration-[var(--af-dur-fast)]">
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {loading ? <LoadingSpinner /> : (
                <>
                    {/* Users Table */}
                    <div className="border-t border-b border-[rgba(241,238,234,0.2)] overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[rgba(241,238,234,0.2)]">
                                    <th className="text-left px-4 py-2.5 text-[0.75rem] font-medium text-[#8f8a85]">User</th>
                                    <th className="text-left px-4 py-2.5 text-[0.75rem] font-medium text-[#8f8a85]">Role</th>
                                    <th className="text-right px-4 py-2.5 text-[0.75rem] font-medium text-[#8f8a85]">XP</th>
                                    <th className="text-right px-4 py-2.5 text-[0.75rem] font-medium text-[#8f8a85]">Streak</th>
                                    <th className="text-left px-4 py-2.5 text-[0.75rem] font-medium text-[#8f8a85]">Status</th>
                                    <th className="text-right px-4 py-2.5 text-[0.75rem] font-medium text-[#8f8a85]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="border-b border-[rgba(241,238,234,0.1)] last:border-b-0 row-interactive">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-7 h-7 rounded-[4px] bg-[#2c2b30] flex items-center justify-center text-[0.75rem] font-medium text-[#b6b1ad]">
                                                    {user.name?.charAt(0).toUpperCase() || '?'}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[#f1eeea] text-[0.875rem] font-medium truncate">{user.name}</p>
                                                    <p className="text-[#8f8a85] text-[0.75rem] truncate">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[0.75rem] font-medium ${user.role === 'admin'
                                                ? 'text-[#f0997d]'
                                                : 'text-[#b6b1ad]'
                                                }`}>
                                                {user.role || 'user'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-[#b6b1ad] text-[0.875rem] text-right tnum">{user.xp_points || 0}</td>
                                        <td className="px-4 py-3 text-[#b6b1ad] text-[0.875rem] text-right tnum">{user.streak_days || 0}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[0.75rem] font-medium ${user.isBanned
                                                ? 'text-[#e8a795]'
                                                : 'text-[#c8dfd1]'
                                                }`}>
                                                {user.isBanned ? 'Banned' : 'Active'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => handleEdit(user)} aria-label={`Edit ${user.name}`} className="p-1.5 icon-btn text-[#8f8a85] hover:text-[#f1eeea]" title="Edit">
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleBan(user.id)} aria-label={user.isBanned ? `Unban ${user.name}` : `Ban ${user.name}`} className="p-1.5 icon-btn text-[#8f8a85] hover:text-[#f0997d]" title={user.isBanned ? 'Unban' : 'Ban'}>
                                                    {user.isBanned ? <ShieldOff className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                                </button>
                                                <button onClick={() => handleDelete(user.id)} aria-label={`Delete ${user.name}`} className="p-1.5 icon-btn text-[#8f8a85] hover:text-[#d98a76]" title="Delete">
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
                            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} aria-label="Previous page" className="p-2 rounded-[4px] bg-[#222225] border border-[rgba(241,238,234,0.1)] text-[#b6b1ad] chrome-btn hover:text-[#f1eeea] disabled:opacity-30">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-[#b6b1ad] text-[0.8125rem] tnum">Page {page} of {totalPages}</span>
                            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} aria-label="Next page" className="p-2 rounded-[4px] bg-[#222225] border border-[rgba(241,238,234,0.1)] text-[#b6b1ad] chrome-btn hover:text-[#f1eeea] disabled:opacity-30">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Edit Modal */}
            <AnimatePresence>
                {editingUser && (
                    <Modal title={`Edit user: ${editingUser.name}`} onClose={() => setEditingUser(null)}>
                        <div className="space-y-4">
                            <FormField label="Name" value={editForm.name} onChange={(v) => setEditForm({ ...editForm, name: v })} />
                            <FormField label="XP points" type="number" value={editForm.xp_points} onChange={(v) => setEditForm({ ...editForm, xp_points: parseInt(v) || 0 })} />
                            <FormField label="Streak days" type="number" value={editForm.streak_days} onChange={(v) => setEditForm({ ...editForm, streak_days: parseInt(v) || 0 })} />
                            <div>
                                <label className="text-[0.75rem] font-medium text-[#8f8a85] mb-1 block">Role</label>
                                <select
                                    value={editForm.role}
                                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                    className="w-full px-3 py-2 rounded-[6px] bg-[#19191b] border border-[rgba(241,238,234,0.1)] text-[#f1eeea] focus:outline-none focus-visible:border-[#f0997d]"
                                >
                                    <option value="user" className="bg-[#222225]">User</option>
                                    <option value="admin" className="bg-[#222225]">Admin</option>
                                </select>
                            </div>
                            <button onClick={handleSaveEdit} className="btn-primary w-full justify-center">
                                <Save className="w-4 h-4" /> Save changes
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
            <div className="flex flex-wrap gap-4 pb-4 mb-6 border-b border-[rgba(241,238,234,0.2)]">
                <div className="flex-1 min-w-[200px]">
                    <label className="text-[0.75rem] font-medium text-[#8f8a85] mb-1 block">Learning path</label>
                    <select
                        value={selectedPath}
                        onChange={(e) => setSelectedPath(e.target.value)}
                        aria-label="Learning path"
                        className="w-full px-3 py-2 rounded-[6px] bg-[#19191b] border border-[rgba(241,238,234,0.1)] text-[#f1eeea] focus:outline-none focus-visible:border-[#f0997d]"
                    >
                        <option value="" className="bg-[#222225]">Select a path…</option>
                        {paths.map(p => <option key={p.id} value={p.id} className="bg-[#222225]">{p.title}</option>)}
                    </select>
                </div>
                {topics.length > 0 && (
                    <div className="flex-1 min-w-[200px]">
                        <label className="text-[0.75rem] font-medium text-[#8f8a85] mb-1 block">Topic</label>
                        <select
                            value={selectedTopic}
                            onChange={(e) => setSelectedTopic(e.target.value)}
                            aria-label="Topic"
                            className="w-full px-3 py-2 rounded-[6px] bg-[#19191b] border border-[rgba(241,238,234,0.1)] text-[#f1eeea] focus:outline-none focus-visible:border-[#f0997d]"
                        >
                            <option value="" className="bg-[#222225]">Select a topic…</option>
                            {topics.map(t => <option key={t.id} value={t.id} className="bg-[#222225]">{t.title}</option>)}
                        </select>
                    </div>
                )}
                {selectedTopic && (
                    <div className="flex items-end">
                        <button onClick={() => { setShowAddForm(true); resetForm(); }} className="btn-primary text-[0.8125rem]">
                            <Plus className="w-4 h-4" /> Add problem
                        </button>
                    </div>
                )}
            </div>

            {loading && selectedPath ? <LoadingSpinner /> : selectedTopic && (
                <>
                    {/* Problems List */}
                    <div className="ruled">
                        {problems.length === 0 ? (
                            <div className="text-center py-12 text-[#8f8a85]">No problems in this topic yet.</div>
                        ) : problems.map((p) => (
                            <div
                                key={p.id}
                                className={`row-edge flex items-center justify-between px-3 py-3.5 row-interactive ${
                                    p.difficulty === 'Easy'
                                        ? 'edge-easy'
                                        : p.difficulty === 'Hard'
                                            ? 'edge-hard'
                                            : 'edge-medium'
                                }`}
                            >
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <span className="text-[#8f8a85] text-[0.75rem] w-6 text-center tnum">{p.order_index}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[#f1eeea] text-[0.9375rem] font-medium truncate">{p.title}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className={`text-[0.75rem] font-medium difficulty-${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>
                                            {p.tags?.slice(0, 3).map((tag: string) => (
                                                <span key={tag} className="text-[0.75rem] text-[#8f8a85]">{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 ml-4">
                                    <button onClick={() => openEdit(p)} aria-label={`Edit ${p.title}`} className="p-1.5 icon-btn text-[#8f8a85] hover:text-[#f1eeea]">
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(p.id)} aria-label={`Delete ${p.title}`} className="p-1.5 icon-btn text-[#8f8a85] hover:text-[#d98a76]">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {!selectedPath && !loading && (
                <div className="text-center py-20 text-[#8f8a85]">
                    <FileText className="w-6 h-6 mx-auto mb-4 text-[#3a393e]" />
                    <p className="text-[0.875rem]">Select a learning path and topic to manage problems</p>
                </div>
            )}

            {/* Add / Edit Modal */}
            <AnimatePresence>
                {(showAddForm || editingProblem) && (
                    <Modal title={editingProblem ? 'Edit problem' : 'Add new problem'} onClose={() => { setShowAddForm(false); setEditingProblem(null); resetForm(); }}>
                        <div className="space-y-4">
                            <FormField label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="Two Sum" />
                            <div>
                                <label className="text-[0.75rem] font-medium text-[#8f8a85] mb-1 block">Difficulty</label>
                                <select
                                    value={form.difficulty}
                                    onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                                    aria-label="Difficulty"
                                    className="w-full px-3 py-2 rounded-[6px] bg-[#19191b] border border-[rgba(241,238,234,0.1)] text-[#f1eeea] focus:outline-none focus-visible:border-[#f0997d]"
                                >
                                    <option value="Easy" className="bg-[#222225]">Easy</option>
                                    <option value="Medium" className="bg-[#222225]">Medium</option>
                                    <option value="Hard" className="bg-[#222225]">Hard</option>
                                </select>
                            </div>
                            <FormField label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Problem description…" multiline />
                            <FormField label="Problem link" value={form.problem_link} onChange={(v) => setForm({ ...form, problem_link: v })} placeholder="https://leetcode.com/…" />
                            <FormField label="Video link" value={form.video_link} onChange={(v) => setForm({ ...form, video_link: v })} placeholder="https://youtube.com/…" />
                            <FormField label="Tags (comma separated)" value={form.tags} onChange={(v) => setForm({ ...form, tags: v })} placeholder="Array, HashMap, Two Pointers" />
                            <button
                                onClick={editingProblem ? handleEditSave : handleAdd}
                                className="btn-primary w-full justify-center"
                            >
                                <Save className="w-4 h-4" /> {editingProblem ? 'Save changes' : 'Add problem'}
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
                <div className="ruled">
                    {posts.length === 0 ? (
                        <div className="text-center py-12 text-[#8f8a85]">No forum posts yet.</div>
                    ) : posts.map((post) => (
                        <div
                            key={post.id}
                            className="px-3 py-3.5 row-interactive"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        {post.isPinned && <span className="text-[0.75rem] font-medium text-[#f0997d]">Pinned</span>}
                                        <span className="text-[0.75rem] text-[#8f8a85]">{post.category}</span>
                                    </div>
                                    <p className="text-[#f1eeea] font-medium text-[0.9375rem] truncate">{post.title}</p>
                                    <p className="text-[#8f8a85] text-[0.75rem] mt-1">
                                        by {post.authorInfo?.name || 'Unknown'} · <span className="tnum">{post.likesCount || 0}</span> likes · <span className="tnum">{post.repliesCount || 0}</span> replies · {new Date(post.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 ml-4">
                                    <button onClick={() => handleEdit(post)} aria-label={`Edit ${post.title}`} className="p-1.5 icon-btn text-[#8f8a85] hover:text-[#f1eeea]">
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(post.id)} aria-label={`Delete ${post.title}`} className="p-1.5 icon-btn text-[#8f8a85] hover:text-[#d98a76]">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-6">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} aria-label="Previous page" className="p-2 rounded-[4px] bg-[#222225] border border-[rgba(241,238,234,0.1)] text-[#b6b1ad] chrome-btn hover:text-[#f1eeea] disabled:opacity-30">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-[#b6b1ad] text-[0.8125rem] tnum">Page {page} of {totalPages}</span>
                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} aria-label="Next page" className="p-2 rounded-[4px] bg-[#222225] border border-[rgba(241,238,234,0.1)] text-[#b6b1ad] chrome-btn hover:text-[#f1eeea] disabled:opacity-30">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Edit Post Modal */}
            <AnimatePresence>
                {editingPost && (
                    <Modal title="Edit post" onClose={() => setEditingPost(null)}>
                        <div className="space-y-4">
                            <FormField label="Title" value={editForm.title} onChange={(v) => setEditForm({ ...editForm, title: v })} />
                            <FormField label="Content" value={editForm.content} onChange={(v) => setEditForm({ ...editForm, content: v })} multiline />
                            <div>
                                <label className="text-[0.75rem] font-medium text-[#8f8a85] mb-1 block">Category</label>
                                <select
                                    value={editForm.category}
                                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                    aria-label="Category"
                                    className="w-full px-3 py-2 rounded-[6px] bg-[#19191b] border border-[rgba(241,238,234,0.1)] text-[#f1eeea] focus:outline-none focus-visible:border-[#f0997d]"
                                >
                                    {['general', 'dsa', 'interview', 'system-design', 'career', 'feedback'].map(c => (
                                        <option key={c} value={c} className="bg-[#222225]">{c}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-[rgba(241,238,234,0.1)]">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editForm.isPinned}
                                        onChange={(e) => setEditForm({ ...editForm, isPinned: e.target.checked })}
                                        className="w-4 h-4 rounded-[2px] bg-[#19191b] border border-[rgba(241,238,234,0.2)] accent-[#f0997d]"
                                    />
                                    <span className="text-[#b6b1ad] text-[0.875rem]">Pin this post</span>
                                </label>
                            </div>

                            {/* Replies Section */}
                            {editingPost.replies && editingPost.replies.length > 0 && (
                                <div className="mt-4">
                                    <label className="text-[0.75rem] font-medium text-[#8f8a85] mb-2 block">Replies (<span className="tnum">{editingPost.replies.length}</span>)</label>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                        {editingPost.replies.map((reply: AdminForumReply) => (
                                            <div key={reply.id} className="p-3 rounded-[4px] bg-[#19191b] border border-[rgba(241,238,234,0.1)] flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[0.8125rem] text-[#f1eeea] line-clamp-2">{reply.content}</p>
                                                    <p className="text-[0.75rem] text-[#8f8a85] mt-1">by {reply.author?.name || 'Unknown'}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteReply(editingPost.id, reply.id)}
                                                    aria-label="Delete reply"
                                                    className="p-1.5 icon-btn text-[#8f8a85] hover:text-[#d98a76] flex-shrink-0"
                                                    title="Delete reply"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button onClick={handleSaveEdit} className="btn-primary w-full justify-center mt-4">
                                <Save className="w-4 h-4" /> Save changes
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
            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
            className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/70"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.97, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.97, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className="w-full max-w-lg rounded-[10px] border border-[rgba(241,238,234,0.2)] bg-[#222225] p-6 max-h-[85vh] overflow-y-auto"
            >
                <div className="flex items-center justify-between mb-5 pb-3 border-b border-[rgba(241,238,234,0.1)]">
                    <h3 className="text-[1.125rem] font-medium text-[#f1eeea]">{title}</h3>
                    <button onClick={onClose} aria-label="Close dialog" className="p-1.5 icon-btn text-[#8f8a85] hover:text-[#f1eeea]">
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
    return (
        <div>
            <label className="text-[0.75rem] font-medium text-[#8f8a85] mb-1 block">{label}</label>
            {multiline ? (
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    rows={4}
                    className="w-full px-3 py-2 rounded-[6px] bg-[#19191b] border border-[rgba(241,238,234,0.1)] text-[#f1eeea] placeholder:text-[#8f8a85] focus:outline-none focus-visible:border-[#f0997d] resize-none"
                />
            ) : (
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 rounded-[6px] bg-[#19191b] border border-[rgba(241,238,234,0.1)] text-[#f1eeea] placeholder:text-[#8f8a85] focus:outline-none focus-visible:border-[#f0997d]"
                />
            )}
        </div>
    );
}

function LoadingSpinner() {
    return (
        <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#8f8a85] border-t-[#f0997d] rounded-full animate-spin" />
        </div>
    );
}
