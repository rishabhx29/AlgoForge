import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    CheckCircle2,
    ChevronRight,
    BarChart3
} from 'lucide-react';
import { getTopicsByPath, getLearningPaths, getProblemsByTopic } from '@/api/content';
import { getUserProgress } from '@/api/userActions';
import { useAuth } from '@/contexts/AuthContext';
import { contentIcon } from '@/lib/contentIcons';
import { buildProgressSets } from '@/lib/types';

interface PathDetailProps {
    pathId: string;
    onBack: () => void;
    onTopicClick: (topicId: string) => void;
}

interface PathInfo {
    id: string;
    title: string;
    description: string;
    icon: string;
    color: string;
}

interface TopicInfo {
    id: string;
    title: string;
    description: string;
}

export function PathDetail({ pathId, onBack, onTopicClick }: PathDetailProps) {
    const { user } = useAuth();
    const [pathInfo, setPathInfo] = useState<PathInfo | null>(null);
    const [topics, setTopics] = useState<TopicInfo[]>([]);
    const [topicStats, setTopicStats] = useState<Record<string, { total: number; completed: number; easy: number; medium: number; hard: number }>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [paths, pathTopics] = await Promise.all([
                    getLearningPaths(),
                    getTopicsByPath(pathId)
                ]);

                const currentPath = paths.find((p: PathInfo) => p.id === pathId);
                setPathInfo(currentPath);
                setTopics(pathTopics);

                // Fetch user progress once (not per-topic)
                let solvedSet = new Set<string>();
                if (user) {
                    try {
                        const progressData = await getUserProgress();
                        solvedSet = buildProgressSets(progressData).completed;
                    } catch { /* user not logged in */ }
                }

                // Fetch problem counts per topic & compute completed from solvedSet
                const stats: Record<string, any> = {};

                await Promise.all(pathTopics.map(async (topic: TopicInfo) => {
                    try {
                        const problems = await getProblemsByTopic(topic.id);
                        const easy = problems.filter((p: { difficulty: string }) => p.difficulty === 'Easy').length;
                        const medium = problems.filter((p: { difficulty: string }) => p.difficulty === 'Medium').length;
                        const hard = problems.filter((p: { difficulty: string }) => p.difficulty === 'Hard').length;

                        const completed = problems.filter((p: { id: string }) => solvedSet.has(p.id)).length;

                        stats[topic.id] = { total: problems.length, completed, easy, medium, hard };
                    } catch {
                        stats[topic.id] = { total: 0, completed: 0, easy: 0, medium: 0, hard: 0 };
                    }
                }));

                setTopicStats(stats);
            } catch (e) {
                console.error('Failed to load path details', e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [pathId, user]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
                    <p className="text-white/50 text-sm">Loading topics...</p>
                </div>
            </div>
        );
    }

    if (!pathInfo) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-white/50">Path not found</p>
            </div>
        );
    }

    const Icon = contentIcon(pathInfo.icon);
    const totalProblems = Object.values(topicStats).reduce((sum, s) => sum + s.total, 0);
    const totalCompleted = Object.values(topicStats).reduce((sum, s) => sum + s.completed, 0);
    const progressPercent = totalProblems > 0 ? Math.round((totalCompleted / totalProblems) * 100) : 0;

    return (
        <section className="relative min-h-screen py-8 overflow-hidden">
            <div className="absolute inset-0 grid-pattern opacity-20" />

            <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Back Button */}
                <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={onBack}
                    className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-6 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm">Back to Roadmaps</span>
                </motion.button>

                {/* Path Header */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-2xl p-6 sm:p-8 mb-8"
                >
                    <div className="flex flex-col sm:flex-row items-start gap-5">
                        <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                            style={{ background: `${pathInfo.color}20` }}
                        >
                            <Icon className="w-8 h-8" style={{ color: pathInfo.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                                {pathInfo.title}
                            </h1>
                            <p className="text-white/50 text-sm mb-4">{pathInfo.description}</p>
                            <div className="flex flex-wrap items-center gap-4 text-sm">
                                <span className="text-white/60">
                                    <span className="font-semibold text-white">{topics.length}</span> Topics
                                </span>
                                <span className="text-white/20">•</span>
                                <span className="text-white/60">
                                    <span className="font-semibold text-white">{totalProblems}</span> Problems
                                </span>
                                <span className="text-white/20">•</span>
                                <span className="text-white/60">
                                    <span className="font-semibold" style={{ color: pathInfo.color }}>{totalCompleted}</span> Completed
                                </span>
                            </div>
                        </div>
                        {/* Progress Circle */}
                        <div className="flex-shrink-0 flex flex-col items-center">
                            <div className="relative w-20 h-20">
                                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                                    <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                                    <circle
                                        cx="40" cy="40" r="34" fill="none"
                                        stroke={pathInfo.color}
                                        strokeWidth="6"
                                        strokeLinecap="round"
                                        strokeDasharray={`${2 * Math.PI * 34}`}
                                        strokeDashoffset={`${2 * Math.PI * 34 * (1 - progressPercent / 100)}`}
                                        style={{ transition: 'stroke-dashoffset 1s ease' }}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">{progressPercent}%</span>
                                </div>
                            </div>
                            <span className="text-white/40 text-[10px] mt-1">Progress</span>
                        </div>
                    </div>
                </motion.div>

                {/* Topics Grid */}
                <div className="space-y-3">
                    {topics.map((topic, index) => {
                        const stats = topicStats[topic.id] || { total: 0, completed: 0, easy: 0, medium: 0, hard: 0 };
                        const topicProgress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

                        return (
                            <motion.div
                                key={topic.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.04, duration: 0.35 }}
                                onClick={() => onTopicClick(topic.id)}
                                className="group glass rounded-xl p-5 cursor-pointer hover:bg-white/[0.04] transition-all border border-transparent hover:border-white/[0.08]"
                                style={{
                                    borderLeftColor: pathInfo.color,
                                    borderLeftWidth: '3px'
                                }}
                            >
                                <div className="flex items-center gap-4">
                                    {/* Index Number */}
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                                        style={{
                                            background: `${pathInfo.color}15`,
                                            color: pathInfo.color
                                        }}
                                    >
                                        {String(index + 1).padStart(2, '0')}
                                    </div>

                                    {/* Topic Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-white font-semibold text-sm sm:text-base truncate group-hover:text-white transition-colors">
                                                {topic.title}
                                            </h3>
                                            {stats.completed === stats.total && stats.total > 0 && (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-white/40 text-xs truncate">{topic.description}</p>
                                    </div>

                                    {/* Difficulty Pills */}
                                    <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                                        {stats.easy > 0 && (
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
                                                {stats.easy}E
                                            </span>
                                        )}
                                        {stats.medium > 0 && (
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-medium">
                                                {stats.medium}M
                                            </span>
                                        )}
                                        {stats.hard > 0 && (
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-medium">
                                                {stats.hard}H
                                            </span>
                                        )}
                                    </div>

                                    {/* Progress & Count */}
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <div className="text-right hidden sm:block">
                                            <span className="text-white/70 text-xs font-medium">
                                                {stats.completed}/{stats.total}
                                            </span>
                                            <div className="w-20 h-1.5 bg-white/10 rounded-full mt-1 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${topicProgress}%`,
                                                        background: pathInfo.color
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Empty State */}
                {topics.length === 0 && (
                    <div className="text-center py-16">
                        <BarChart3 className="w-12 h-12 text-white/20 mx-auto mb-4" />
                        <p className="text-white/40">No topics found for this path</p>
                    </div>
                )}
            </div>
        </section>
    );
}
