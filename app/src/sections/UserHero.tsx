import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Flame, Zap, CheckCircle2, Trophy, Activity, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDashboardStats, getUserProgress } from '@/api/userActions';
import { useHomeContent } from '@/hooks/useContent';
import { buildProgressSets } from '@/lib/types';

interface UserHeroProps {
    user: any;
    onTopicClick: (topicId: string) => void;
}

export function UserHero({ user, onTopicClick }: UserHeroProps) {
    // All content comes from the shared home-content cache (already warm from
    // the Roadmaps section / app prefetch — usually zero network activity here).
    const { data: catalog } = useHomeContent();
    const problems = useMemo(() => catalog?.problems ?? [], [catalog]);
    const topics = useMemo(() => catalog?.topics ?? [], [catalog]);

    const { data: dashboardStats } = useQuery({
        queryKey: ['dashboardStats', user?.id],
        queryFn: getDashboardStats,
        enabled: !!user,
        staleTime: 60 * 1000,
    });

    const { data: userProgress = [] } = useQuery({
        queryKey: ['userProgress', user?.id],
        queryFn: getUserProgress,
        enabled: !!user,
        staleTime: 60 * 1000,
    });

    // Compute solved stats via the shared progress helper (single source of truth).
    const solvedIds = useMemo(() => buildProgressSets(userProgress).completed, [userProgress]);

    const totalSolved = solvedIds.size;

    // Streak and rank from backend
    const currentStreak = dashboardStats?.currentStreak ?? (user.streak_days || 0);
    const rank = dashboardStats?.rank ?? '--';
    const topPercent = dashboardStats?.topPercent ?? '--';

    const level = Math.floor((user.xp_points || 0) / 100) + 1;
    const nextLevelXp = level * 100;
    const progressToNextLevel = ((user.xp_points || 0) % 100) / 100 * 100;

    // Overall completion percentage
    const completionPercentage = problems.length > 0 ? Math.round((totalSolved / problems.length) * 100) : 0;

    // Weekly activity from backend
    const weeklyActivity = useMemo(() => {
        if (dashboardStats?.weeklyActivity) {
            return dashboardStats.weeklyActivity.map((d: any) => {  
                const date = new Date(d.date + 'T00:00:00');
                return {
                    day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                    count: d.count
                };
            });
        }
        return [
            { day: 'Mon', count: 0 },
            { day: 'Tue', count: 0 },
            { day: 'Wed', count: 0 },
            { day: 'Thu', count: 0 },
            { day: 'Fri', count: 0 },
            { day: 'Sat', count: 0 },
            { day: 'Sun', count: 0 },
        ];
    }, [dashboardStats]);

    const maxActivity = Math.max(...weeklyActivity.map((d: any) => d.count), 1);

    // Continue Learning - find the topic with most recent activity
    const continueTopicData = useMemo(() => {
        const solvedProgress = userProgress.filter((p: any) => p.status === 'SOLVED');

        // Build per-topic stats
        const topicStats = topics.map((topic: any) => {
            const topicProblems = problems.filter((p: any) => p.topic_id === topic.id);
            const totalInTopic = topicProblems.length;
            const solvedInTopic = topicProblems.filter((p: any) => solvedIds.has(p.id)).length;
            const progress = totalInTopic > 0 ? Math.round((solvedInTopic / totalInTopic) * 100) : 0;

            // Most recent solve for this topic
            const topicProblemIds = new Set(topicProblems.map((p: any) => p.id));
            const topicSolves = solvedProgress.filter((p: any) => topicProblemIds.has(p.problem_id));
            const lastSolveDate = topicSolves.length > 0
                ? Math.max(...topicSolves.map((p: any) => new Date(p.updatedAt).getTime()))
                : 0;

            return {
                ...topic,
                solvedInTopic,
                totalInTopic,
                progress,
                lastSolveDate
            };
        });

        // Topic with the most recent activity (that isn't 100% complete)
        const inProgress = topicStats
            .filter((t: any) => t.lastSolveDate > 0 && t.progress < 100)  
            .sort((a: any, b: any) => b.lastSolveDate - a.lastSolveDate);  

        if (inProgress.length > 0) {
            return inProgress[0];
        }

        // Fallback: first topic with any problems
        const withProblems = topicStats.filter((t: any) => t.totalInTopic > 0);  
        return withProblems.length > 0 ? withProblems[0] : null;
    }, [topics, problems, userProgress, solvedIds]);

    // Next goals: dynamically based on progress
    const nextGoals = useMemo(() => {
        const goals: any[] = [];

        // Level up goal
        goals.push({
            title: `Reach Level ${level + 1}`,
            subtitle: 'XP Milestone',
            current: user.xp_points || 0,
            target: nextLevelXp,
            rewards: [`+${nextLevelXp - (user.xp_points || 0)} XP needed`]
        });

        // Solved milestone
        const solvedMilestones = [5, 10, 25, 50, 100];
        const nextMilestone = solvedMilestones.find(m => m > totalSolved) || solvedMilestones[solvedMilestones.length - 1];
        if (nextMilestone > totalSolved) {
            goals.push({
                title: `Solve ${nextMilestone} Problems`,
                subtitle: 'Problem Challenge',
                current: totalSolved,
                target: nextMilestone,
                rewards: ['Badge', `+${nextMilestone * 5} XP`]
            });
        }

        // Streak goal
        if (currentStreak < 7) {
            goals.push({
                title: '7-Day Streak',
                subtitle: 'Consistency Goal',
                current: currentStreak,
                target: 7,
                rewards: ['Streak Shield', '+100 XP']
            });
        }

        return goals.slice(0, 2);
    }, [level, nextLevelXp, user.xp_points, totalSolved, currentStreak]);

    return (
        <section className="relative pt-32 pb-20 overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 grid-pattern opacity-20" />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#a088ff]/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="mb-12"
                >
                    <h1 className="font-display text-4xl sm:text-5xl text-white mb-4">
                        Welcome back, <span className="gradient-text">{user.name.split(' ')[0]}</span>!
                    </h1>
                    <p className="text-xl text-white/60">
                        "Consistency is the key to mastery. Keep pushing forward."
                    </p>
                </motion.div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {[
                        {
                            label: 'Current Streak',
                            value: `${currentStreak} Days`,
                            icon: Flame,
                            color: '#ff8a63',
                            subtext: currentStreak > 0 ? 'Keep it up!' : 'Solve a problem to start!'
                        },
                        {
                            label: 'Total XP',
                            value: user.xp_points || 0,
                            icon: Zap,
                            color: '#ffd700',
                            subtext: `Level ${level}`
                        },
                        {
                            label: 'Problems Solved',
                            value: totalSolved,
                            icon: CheckCircle2,
                            color: '#88ff9f',
                            subtext: `${completionPercentage}% complete`
                        },
                        {
                            label: 'Global Rank',
                            value: `#${rank}`,
                            icon: Trophy,
                            color: '#a088ff',
                            subtext: `Top ${topPercent}%`
                        }
                    ].map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                        >
                            <div className="glass p-6 rounded-2xl relative overflow-hidden group hover:bg-white/5 transition-colors">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <p className="text-white/60 text-sm mb-1">{stat.label}</p>
                                        <h3 className="text-3xl font-bold text-white">{stat.value}</h3>
                                    </div>
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/5 group-hover:scale-110 transition-transform"
                                        style={{ color: stat.color }}
                                    >
                                        <stat.icon className="w-6 h-6" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm" style={{ color: stat.color }}>
                                    <span>{stat.subtext}</span>
                                </div>
                                {/* Glow Effect */}
                                <div
                                    className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"
                                    style={{ background: stat.color }}
                                />
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Layout: Main Activity + Sidebar */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content - Activity & Resume */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Resume Learning Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                            className="glass p-8 rounded-3xl relative overflow-hidden"
                        >
                            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                                <div>
                                    <h3 className="text-2xl font-semibold text-white mb-2">Continue Learning</h3>
                                    {continueTopicData ? (
                                        <>
                                            <p className="text-white/60 mb-6 max-w-md">
                                                You were working on <span className="text-[#a088ff]">{continueTopicData.title}</span>.
                                                {continueTopicData.progress > 0
                                                    ? ` ${continueTopicData.solvedInTopic}/${continueTopicData.totalInTopic} problems solved.`
                                                    : ' Ready to tackle the next challenge?'}
                                            </p>
                                            <Button
                                                onClick={() => onTopicClick(continueTopicData.id || continueTopicData.id)}
                                                className="bg-[#a088ff] text-white hover:bg-[#8e72ff] rounded-xl px-8 py-6 text-lg"
                                            >
                                                <PlayCircle className="w-5 h-5 mr-2" />
                                                Resume {continueTopicData.title.split(' ')[0]}
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-white/60 mb-6 max-w-md">
                                                Start solving problems from any topic to track your progress!
                                            </p>
                                            <Button
                                                onClick={() => onTopicClick('')}
                                                className="bg-[#a088ff] text-white hover:bg-[#8e72ff] rounded-xl px-8 py-6 text-lg"
                                            >
                                                <PlayCircle className="w-5 h-5 mr-2" />
                                                Explore Topics
                                            </Button>
                                        </>
                                    )}
                                </div>
                                {/* Progress Ring */}
                                <div className="relative w-32 h-32 flex-shrink-0">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle
                                            cx="64"
                                            cy="64"
                                            r="58"
                                            stroke="currentColor"
                                            strokeWidth="8"
                                            fill="transparent"
                                            className="text-white/10"
                                        />
                                        <circle
                                            cx="64"
                                            cy="64"
                                            r="58"
                                            stroke="#a088ff"
                                            strokeWidth="8"
                                            fill="transparent"
                                            strokeDasharray={364}
                                            strokeDashoffset={364 - (364 * (continueTopicData?.progress || completionPercentage)) / 100}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-2xl font-bold text-white">
                                            {continueTopicData?.progress ?? completionPercentage}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Activity Line Graph */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.5 }}
                            className="glass p-6 rounded-2xl"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-[#63e3ff]" />
                                    Weekly Activity
                                </h3>
                                <span className="text-sm text-white/40">Last 7 Days</span>
                            </div>
                            <div className="w-full h-44 relative">
                                <svg viewBox="0 0 340 130" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                                    <defs>
                                        <linearGradient id="heroAreaGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#63e3ff" stopOpacity="0.25" />
                                            <stop offset="60%" stopColor="#63e3ff" stopOpacity="0.08" />
                                            <stop offset="100%" stopColor="#63e3ff" stopOpacity="0.01" />
                                        </linearGradient>
                                        <filter id="heroGlow">
                                            <feGaussianBlur stdDeviation="3" result="blur" />
                                            <feMerge>
                                                <feMergeNode in="blur" />
                                                <feMergeNode in="SourceGraphic" />
                                            </feMerge>
                                        </filter>
                                    </defs>

                                    {/* Subtle grid lines */}
                                    {[0, 1, 2, 3, 4].map(i => (
                                        <line key={i} x1="30" y1={i * 22 + 10} x2="320" y2={i * 22 + 10}
                                            stroke="white" strokeOpacity="0.04" strokeWidth="0.5" strokeDasharray="4 4" />
                                    ))}

                                    {/* Y-axis labels */}
                                    {[0, 1, 2, 3, 4].map(i => {
                                        const val = Math.round(maxActivity * (4 - i) / 4);
                                        return (
                                            <text key={i} x="24" y={i * 22 + 13} textAnchor="end"
                                                fill="white" fillOpacity="0.2" fontSize="7">{val}</text>
                                        );
                                    })}

                                    {/* Area fill */}
                                    <motion.polygon
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 1, delay: 0.8 }}
                                        points={`40,100 ${weeklyActivity.map((d: any, i: number) => {  
                                            const x = 40 + i * 46;
                                            const y = maxActivity > 0 ? 100 - (d.count / maxActivity) * 82 : 100;
                                            return `${x},${y}`;
                                        }).join(' ')} ${40 + 6 * 46},100`}
                                        fill="url(#heroAreaGradient)"
                                    />

                                    {/* Line */}
                                    <motion.polyline
                                        initial={{ pathLength: 0, opacity: 0 }}
                                        animate={{ pathLength: 1, opacity: 1 }}
                                        transition={{ duration: 1.5, delay: 0.6 }}
                                        points={weeklyActivity.map((d: any, i: number) => {  
                                            const x = 40 + i * 46;
                                            const y = maxActivity > 0 ? 100 - (d.count / maxActivity) * 82 : 100;
                                            return `${x},${y}`;
                                        }).join(' ')}
                                        fill="none"
                                        stroke="#63e3ff"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        filter="url(#heroGlow)"
                                    />

                                    {/* Dots + labels */}
                                    {weeklyActivity.map((d: any, i: number) => {
                                        const x = 40 + i * 46;
                                        const y = maxActivity > 0 ? 100 - (d.count / maxActivity) * 82 : 100;
                                        const isToday = i === 6;
                                        return (
                                            <g key={i}>
                                                {/* Outer glow for today */}
                                                {isToday && (
                                                    <circle cx={x} cy={y} r={7}
                                                        fill="#63e3ff" fillOpacity="0.15" />
                                                )}
                                                <motion.circle
                                                    initial={{ r: 0 }}
                                                    animate={{ r: isToday ? 4.5 : 3.5 }}
                                                    transition={{ duration: 0.3, delay: 0.8 + i * 0.1 }}
                                                    cx={x} cy={y}
                                                    fill="#63e3ff"
                                                    stroke="#141414"
                                                    strokeWidth="2"
                                                />
                                                {d.count > 0 && (
                                                    <text x={x} y={y - 10} textAnchor="middle"
                                                        fill="white" fillOpacity="0.6" fontSize="9"
                                                        fontWeight="600"
                                                    >{d.count}</text>
                                                )}
                                            </g>
                                        );
                                    })}

                                    {/* Day labels */}
                                    { }
                                    {weeklyActivity.map((d: any, i: number) => {
                                        const x = 40 + i * 46;
                                        const isToday = i === 6;
                                        return (
                                            <text key={'label' + i} x={x} y={118} textAnchor="middle"
                                                fill={isToday ? '#63e3ff' : 'white'}
                                                fillOpacity={isToday ? 0.8 : 0.35}
                                                fontSize="8" fontWeight={isToday ? '600' : '400'}>
                                                {d.day}
                                            </text>
                                        );
                                    })}
                                </svg>
                            </div>
                        </motion.div>
                    </div>

                    {/* Sidebar - Next Goals */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.6 }}
                        className="glass p-6 rounded-2xl h-fit"
                    >
                        <h3 className="text-lg font-semibold text-white mb-6">Next Goals</h3>
                        <div className="space-y-6">
                            {/* Level progress */}
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-white/60">Reach Level {level + 1}</span>
                                    <span className="text-[#ffd700]">{user.xp_points || 0} / {nextLevelXp} XP</span>
                                </div>
                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progressToNextLevel}%` }}
                                        transition={{ duration: 1, delay: 0.7 }}
                                        className="h-full bg-[#ffd700] rounded-full"
                                    />
                                </div>
                            </div>

                            {/* Dynamic goals */}
                            { }
                            {nextGoals.map((goal: any, index: number) => (
                                <div key={index} className="p-4 bg-white/5 rounded-xl border border-white/10">
                                    <h4 className="font-medium text-white mb-1">{goal.title}</h4>
                                    <p className="text-xs text-white/40 mb-2">{goal.subtitle}</p>
                                    {goal.target && (
                                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-3">
                                            <div
                                                className="h-full bg-[#a088ff] rounded-full"
                                                style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}
                                            />
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        {goal.rewards.map((reward: string, ri: number) => (
                                            <span key={ri} className="text-xs px-2 py-1 rounded bg-[#a088ff]/20 text-[#a088ff]">
                                                {reward}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
