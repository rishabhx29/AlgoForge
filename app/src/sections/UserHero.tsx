import { useState, useEffect, useMemo } from 'react';
import { Flame, Zap, CheckCircle2, Trophy, Activity, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDashboardStats, getUserProgress } from '@/api/userActions';
import { getAllProblems, getAllTopics } from '@/api/content';

interface UserHeroProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user: any;
    onTopicClick: (topicId: string) => void;
}

export function UserHero({ user, onTopicClick }: UserHeroProps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [dashboardStats, setDashboardStats] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [problems, setProblems] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [topics, setTopics] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [userProgress, setUserProgress] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsData, problemsData, topicsData] = await Promise.all([
                    getDashboardStats().catch(() => null),
                    getAllProblems().catch(() => []),
                    getAllTopics().catch(() => [])
                ]);
                setDashboardStats(statsData);
                setProblems(problemsData);
                setTopics(topicsData);

                try {
                    const progress = await getUserProgress();
                    setUserProgress(progress);
                } catch {
                    // Not logged in or error
                }
            } catch (e) {
                console.error("Failed to load hero data", e);
            }
        };
        fetchData();
    }, []);

    // Compute solved stats
    const solvedIds = useMemo(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const solved = userProgress.filter((p: any) => p.status === 'SOLVED');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new Set(solved.map((p: any) => p.problem_id));
    }, [userProgress]);

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
            return dashboardStats.weeklyActivity.map((d: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maxActivity = Math.max(...weeklyActivity.map((d: any) => d.count), 1);

    // Continue Learning - find the topic with most recent activity
    const continueTopicData = useMemo(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const solvedProgress = userProgress.filter((p: any) => p.status === 'SOLVED');

        // Build per-topic stats
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const topicStats = topics.map((topic: any) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const topicProblems = problems.filter((p: any) => p.topic_id === topic.id);
            const totalInTopic = topicProblems.length;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const solvedInTopic = topicProblems.filter((p: any) => solvedIds.has(p.id)).length;
            const progress = totalInTopic > 0 ? Math.round((solvedInTopic / totalInTopic) * 100) : 0;

            // Most recent solve for this topic
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const topicProblemIds = new Set(topicProblems.map((p: any) => p.id));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const topicSolves = solvedProgress.filter((p: any) => topicProblemIds.has(p.problem_id));
            const lastSolveDate = topicSolves.length > 0
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            .filter((t: any) => t.lastSolveDate > 0 && t.progress < 100) // eslint-disable-line @typescript-eslint/no-explicit-any
            .sort((a: any, b: any) => b.lastSolveDate - a.lastSolveDate); // eslint-disable-line @typescript-eslint/no-explicit-any

        if (inProgress.length > 0) {
            return inProgress[0];
        }

        // Fallback: first topic with any problems
        const withProblems = topicStats.filter((t: any) => t.totalInTopic > 0); // eslint-disable-line @typescript-eslint/no-explicit-any
        return withProblems.length > 0 ? withProblems[0] : null;
    }, [topics, problems, userProgress, solvedIds]);

    // Next goals: dynamically based on progress
    const nextGoals = useMemo(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        <section className="relative pt-32 pb-20">
            {/* No background pattern, no blurred orbs. Spec §6. */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8 pb-4 border-b border-[rgba(241,238,234,0.2)]">
                    <h1 className="text-3xl sm:text-4xl font-medium text-[#f1eeea] tracking-[-0.03em] mb-3">
                        Welcome back, {user.name.split(' ')[0]}
                    </h1>
                    <p className="text-[0.9375rem] text-[#b6b1ad]">
                        Consistency is the key to mastery. Keep pushing forward.
                    </p>
                </div>

                {/* Stats — figures on hairlines, no cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-b border-[rgba(241,238,234,0.2)] mb-12">
                    {[
                        {
                            label: 'Current streak',
                            value: `${currentStreak} days`,
                            icon: Flame,
                            tone: 'amber',
                            subtext: currentStreak > 0 ? 'Keep it up' : 'Solve a problem to start'
                        },
                        {
                            label: 'Total XP',
                            value: (user.xp_points || 0).toLocaleString(),
                            icon: Zap,
                            tone: 'amber',
                            subtext: `Level ${level}`
                        },
                        {
                            label: 'Problems solved',
                            value: totalSolved.toLocaleString(),
                            icon: CheckCircle2,
                            tone: 'teal',
                            subtext: `${completionPercentage}% complete`
                        },
                        {
                            label: 'Global rank',
                            value: `#${rank}`,
                            icon: Trophy,
                            tone: 'soft',
                            subtext: `Top ${topPercent}%`
                        }
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className="px-4 py-4 border-r border-b lg:border-b-0 border-[rgba(241,238,234,0.1)] last:border-r-0"
                        >
                            <div className="flex items-center gap-1.5 mb-2">
                                <stat.icon className="w-3.5 h-3.5 text-[#8f8a85]" />
                                <span className="text-[0.75rem] text-[#8f8a85]">{stat.label}</span>
                            </div>
                            <p className="text-[1.5rem] font-medium text-[#f1eeea] tnum leading-none mb-2">{stat.value}</p>
                            <p className="text-[0.75rem] text-[#b6b1ad]">{stat.subtext}</p>
                        </div>
                    ))}
                </div>

                {/* Layout: Main Activity + Sidebar */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content - Activity & Resume */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Resume Learning */}
                        <div className="bg-[#222225] border border-[rgba(241,238,234,0.1)] rounded-[6px] p-8">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                                <div>
                                    <h3 className="text-[1.125rem] font-medium text-[#f1eeea] mb-2">Continue learning</h3>
                                    {continueTopicData ? (
                                        <>
                                            <p className="text-[0.9375rem] text-[#b6b1ad] leading-relaxed mb-6 max-w-md">
                                                You were working on <span className="text-[#f0997d]">{continueTopicData.title}</span>.
                                                {continueTopicData.progress > 0
                                                    ? ` ${continueTopicData.solvedInTopic}/${continueTopicData.totalInTopic} problems solved.`
                                                    : ' Ready to tackle the next challenge?'}
                                            </p>
                                            <Button
                                                onClick={() => onTopicClick(continueTopicData.id || continueTopicData.id)}
                                                className="bg-[#f0997d] text-[#19191b] hover:bg-[#ffb197] active:scale-[0.98] rounded-[6px] px-6 py-5 text-[0.9375rem] font-medium transition-colors duration-[var(--af-dur-fast)]"
                                            >
                                                <PlayCircle className="w-4 h-4 mr-2" />
                                                Resume {continueTopicData.title.split(' ')[0]}
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-[0.9375rem] text-[#b6b1ad] leading-relaxed mb-6 max-w-md">
                                                Start solving problems from any topic to track your progress.
                                            </p>
                                            <Button
                                                onClick={() => onTopicClick('')}
                                                className="bg-[#f0997d] text-[#19191b] hover:bg-[#ffb197] active:scale-[0.98] rounded-[6px] px-6 py-5 text-[0.9375rem] font-medium transition-colors duration-[var(--af-dur-fast)]"
                                            >
                                                <PlayCircle className="w-4 h-4 mr-2" />
                                                Explore topics
                                            </Button>
                                        </>
                                    )}
                                </div>
                                {/* Progress Ring */}
                                <div className="relative w-32 h-32 flex-shrink-0">
                                    <svg className="w-full h-full transform -rotate-90" role="img" aria-label="Topic progress">
                                        <circle
                                            cx="64"
                                            cy="64"
                                            r="58"
                                            stroke="currentColor"
                                            strokeWidth="8"
                                            fill="transparent"
                                            className="text-[rgba(241,238,234,0.1)]"
                                        />
                                        <circle
                                            cx="64"
                                            cy="64"
                                            r="58"
                                            stroke="#f0997d"
                                            strokeWidth="8"
                                            fill="transparent"
                                            strokeDasharray={364}
                                            strokeDashoffset={364 - (364 * (continueTopicData?.progress || completionPercentage)) / 100}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-[1.5rem] font-medium text-[#f1eeea] tnum">
                                            {continueTopicData?.progress ?? completionPercentage}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Activity chart — flat teal line, no glow, no gradient fill */}
                        <div className="bg-[#222225] border border-[rgba(241,238,234,0.1)] rounded-[6px] p-6">
                            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[rgba(241,238,234,0.1)]">
                                <h3 className="text-[1.125rem] font-medium text-[#f1eeea] flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-[#b1cbbb]" />
                                    Weekly activity
                                </h3>
                                <span className="text-[0.75rem] text-[#8f8a85]">Last 7 days</span>
                            </div>
                            <div className="w-full h-44 relative">
                                <svg viewBox="0 0 340 130" className="w-full h-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Problems solved over the last seven days">
                                    {/* Subtle grid lines */}
                                    {[0, 1, 2, 3, 4].map(i => (
                                        <line key={i} x1="30" y1={i * 22 + 10} x2="320" y2={i * 22 + 10}
                                            stroke="#f1eeea" strokeOpacity="0.06" strokeWidth="0.5" strokeDasharray="4 4" />
                                    ))}

                                    {/* Y-axis labels */}
                                    {[0, 1, 2, 3, 4].map(i => {
                                        const val = Math.round(maxActivity * (4 - i) / 4);
                                        return (
                                            <text key={i} x="24" y={i * 22 + 13} textAnchor="end"
                                                fill="#8f8a85" fontSize="7">{val}</text>
                                        );
                                    })}

                                    {/* Area fill — flat wash, no gradient */}
                                    <polygon
                                        points={`40,100 ${weeklyActivity.map((d: any, i: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                                            const x = 40 + i * 46;
                                            const y = maxActivity > 0 ? 100 - (d.count / maxActivity) * 82 : 100;
                                            return `${x},${y}`;
                                        }).join(' ')} ${40 + 6 * 46},100`}
                                        fill="rgba(177,203,187,0.14)"
                                    />

                                    {/* Line */}
                                    <polyline
                                        points={weeklyActivity.map((d: any, i: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                                            const x = 40 + i * 46;
                                            const y = maxActivity > 0 ? 100 - (d.count / maxActivity) * 82 : 100;
                                            return `${x},${y}`;
                                        }).join(' ')}
                                        fill="none"
                                        stroke="#b1cbbb"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />

                                    {/* Square marks, not circles */}
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    {weeklyActivity.map((d: any, i: number) => {
                                        const x = 40 + i * 46;
                                        const y = maxActivity > 0 ? 100 - (d.count / maxActivity) * 82 : 100;
                                        const isToday = i === 6;
                                        return (
                                            <g key={i}>
                                                <rect
                                                    x={x - (isToday ? 3 : 2.5)}
                                                    y={y - (isToday ? 3 : 2.5)}
                                                    width={isToday ? 6 : 5}
                                                    height={isToday ? 6 : 5}
                                                    rx="1"
                                                    fill={isToday ? '#f0997d' : '#b1cbbb'}
                                                />
                                                {d.count > 0 && (
                                                    <text x={x} y={y - 10} textAnchor="middle"
                                                        fill="#b6b1ad" fontSize="9"
                                                    >{d.count}</text>
                                                )}
                                            </g>
                                        );
                                    })}

                                    {/* Day labels */}
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    {weeklyActivity.map((d: any, i: number) => {
                                        const x = 40 + i * 46;
                                        const isToday = i === 6;
                                        return (
                                            <text key={'label' + i} x={x} y={118} textAnchor="middle"
                                                fill={isToday ? '#f0997d' : '#8f8a85'}
                                                fontSize="8" fontWeight="400">
                                                {d.day}
                                            </text>
                                        );
                                    })}
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar - Next Goals */}
                    <div className="bg-[#222225] border border-[rgba(241,238,234,0.1)] rounded-[6px] p-6 h-fit">
                        <h3 className="text-[1.125rem] font-medium text-[#f1eeea] mb-4 pb-3 border-b border-[rgba(241,238,234,0.1)]">Next goals</h3>
                        <div className="space-y-6">
                            {/* Level progress */}
                            <div>
                                <div className="flex justify-between text-[0.8125rem] mb-2">
                                    <span className="text-[#b6b1ad]">Reach Level {level + 1}</span>
                                    <span className="text-[#f0997d] tnum">{user.xp_points || 0} / {nextLevelXp} XP</span>
                                </div>
                                <div className="h-1 bg-[rgba(241,238,234,0.1)] overflow-hidden">
                                    <div
                                        className="h-full bg-[#f0997d]"
                                        style={{ width: `${progressToNextLevel}%` }}
                                    />
                                </div>
                            </div>

                            {/* Dynamic goals */}
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {nextGoals.map((goal: any, index: number) => (
                                <div key={index} className="p-4 bg-[#19191b] rounded-[4px] border border-[rgba(241,238,234,0.1)]">
                                    <h4 className="font-medium text-[#f1eeea] mb-1">{goal.title}</h4>
                                    <p className="text-[0.75rem] text-[#8f8a85] mb-2">{goal.subtitle}</p>
                                    {goal.target && (
                                        <div className="h-1 bg-[rgba(241,238,234,0.1)] overflow-hidden mb-3">
                                            <div
                                                className="h-full bg-[#f0997d]"
                                                style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}
                                            />
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        {goal.rewards.map((reward: string, ri: number) => (
                                            <span key={ri} className="text-[0.75rem] px-2 py-1 rounded-[4px] border border-[rgba(241,238,234,0.1)] text-[#b6b1ad]">
                                                {reward}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
