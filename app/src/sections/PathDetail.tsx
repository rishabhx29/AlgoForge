import { useState, useEffect } from 'react';
import {
    ArrowLeft,
    CheckCircle2,
    ChevronRight,
    Binary,
    Cpu,
    GitBranch,
    Network,
    Briefcase,
    Server,
    BarChart3
} from 'lucide-react';
import { getTopicsByPath, getLearningPaths, getProblemsByTopic } from '@/api/content';
import { getUserProgress } from '@/api/userActions';
import { useAuth } from '@/contexts/AuthContext';

interface PathDetailProps {
    pathId: string;
    onBack: () => void;
    onTopicClick: (topicId: string) => void;
}

const iconMap: Record<string, React.ElementType> = {
    Binary, Cpu, GitBranch, Network, Briefcase, Server
};

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
                        solvedSet = new Set<string>(
                            progressData
                                .filter((p: any) => p.status === 'SOLVED')
                                .map((p: any) => p.problem_id)
                        );
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
                    <div className="w-8 h-8 border-2 border-[#8f8a85] border-t-[#f0997d] rounded-full animate-spin" />
                    <p className="text-[#8f8a85] text-[0.8125rem]">Loading topics…</p>
                </div>
            </div>
        );
    }

    if (!pathInfo) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-[#b6b1ad]">Path not found</p>
            </div>
        );
    }

    const Icon = iconMap[pathInfo.icon] || Binary;
    const totalProblems = Object.values(topicStats).reduce((sum, s) => sum + s.total, 0);
    const totalCompleted = Object.values(topicStats).reduce((sum, s) => sum + s.completed, 0);
    const progressPercent = totalProblems > 0 ? Math.round((totalCompleted / totalProblems) * 100) : 0;

    return (
        <section className="relative min-h-screen py-8">
            <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Back Button */}
                <button
                    onClick={onBack}
                    className="btn-quiet -ml-3 mb-6 text-[0.8125rem]"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to roadmaps
                </button>

                {/* Path Header */}
                <div className="bg-[#222225] border border-[rgba(241,238,234,0.1)] rounded-[6px] p-6 sm:p-8 mb-8">
                    <div className="flex flex-col sm:flex-row items-start gap-5">
                        <div className="w-12 h-12 rounded-[4px] bg-[#2c2b30] flex items-center justify-center flex-shrink-0">
                            <Icon className="w-6 h-6 text-[#f0997d]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl sm:text-3xl font-medium text-[#f1eeea] tracking-[-0.015em] mb-2">
                                {pathInfo.title}
                            </h1>
                            <p className="text-[#b6b1ad] text-[0.875rem] leading-relaxed mb-4">{pathInfo.description}</p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8125rem]">
                                <span className="text-[#b6b1ad]">
                                    <span className="font-medium text-[#f1eeea] tnum">{topics.length}</span> topics
                                </span>
                                <span className="text-[#3a393e]" aria-hidden="true">·</span>
                                <span className="text-[#b6b1ad]">
                                    <span className="font-medium text-[#f1eeea] tnum">{totalProblems}</span> problems
                                </span>
                                <span className="text-[#3a393e]" aria-hidden="true">·</span>
                                <span className="text-[#b6b1ad]">
                                    <span className="font-medium text-[#f0997d] tnum">{totalCompleted}</span> completed
                                </span>
                            </div>
                        </div>
                        {/* Progress Ring */}
                        <div className="flex-shrink-0 flex flex-col items-center">
                            <div className="relative w-20 h-20">
                                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80" role="img" aria-label="Path progress">
                                    <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(241,238,234,0.1)" strokeWidth="6" />
                                    <circle
                                        cx="40" cy="40" r="34" fill="none"
                                        stroke="#f0997d"
                                        strokeWidth="6"
                                        strokeLinecap="round"
                                        strokeDasharray={`${2 * Math.PI * 34}`}
                                        strokeDashoffset={`${2 * Math.PI * 34 * (1 - progressPercent / 100)}`}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-[#f1eeea] font-medium text-[0.8125rem] tnum">{progressPercent}%</span>
                                </div>
                            </div>
                            <span className="text-[#8f8a85] text-[0.75rem] mt-1">Progress</span>
                        </div>
                    </div>
                </div>

                {/* Topics — rows on hairlines */}
                <div className="ruled">
                    {topics.map((topic, index) => {
                        const stats = topicStats[topic.id] || { total: 0, completed: 0, easy: 0, medium: 0, hard: 0 };
                        const topicProgress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
                        const isComplete = stats.completed === stats.total && stats.total > 0;

                        return (
                            <div
                                key={topic.id}
                                onClick={() => onTopicClick(topic.id)}
                                className="state-row cursor-pointer py-4 pr-3 row-interactive"
                                data-state={isComplete ? 'passed' : undefined}
                            >
                                <div className="flex items-center gap-4">
                                    {/* Index Number */}
                                    <div className="w-8 h-8 rounded-[4px] bg-[#2c2b30] flex items-center justify-center text-[0.75rem] font-medium text-[#b6b1ad] tnum flex-shrink-0">
                                        {String(index + 1).padStart(2, '0')}
                                    </div>

                                    {/* Topic Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-[#f1eeea] font-medium text-[0.875rem] sm:text-[0.9375rem] truncate">
                                                {topic.title}
                                            </h3>
                                            {isComplete && (
                                                <CheckCircle2 className="w-3.5 h-3.5 text-[#b1cbbb] flex-shrink-0" aria-hidden="true" />
                                            )}
                                        </div>
                                        <p className="text-[#8f8a85] text-[0.75rem] truncate">{topic.description}</p>
                                    </div>

                                    {/* Difficulty counts — plain figures, no pills */}
                                    <div className="hidden sm:flex items-center gap-3 flex-shrink-0 text-[0.75rem]">
                                        {stats.easy > 0 && (
                                            <span className="text-[#c8dfd1] tnum">{stats.easy}E</span>
                                        )}
                                        {stats.medium > 0 && (
                                            <span className="text-[#b6b1ad] tnum">{stats.medium}M</span>
                                        )}
                                        {stats.hard > 0 && (
                                            <span className="text-[#e8a795] tnum">{stats.hard}H</span>
                                        )}
                                    </div>

                                    {/* Progress & Count */}
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <div className="text-right hidden sm:block">
                                            <span className="text-[#b6b1ad] text-[0.75rem] font-medium tnum">
                                                {stats.completed}/{stats.total}
                                            </span>
                                            <div className="w-20 h-1 bg-[rgba(241,238,234,0.1)] mt-1 overflow-hidden">
                                                <div
                                                    className="h-full bg-[#f0997d]"
                                                    style={{ width: `${topicProgress}%` }}
                                                />
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-[#8f8a85] flex-shrink-0" aria-hidden="true" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Empty State */}
                {topics.length === 0 && (
                    <div className="text-center py-16">
                        <BarChart3 className="w-6 h-6 text-[#3a393e] mx-auto mb-4" />
                        <p className="text-[#8f8a85] text-[0.875rem]">No topics found for this path</p>
                    </div>
                )}
            </div>
        </section>
    );
}
