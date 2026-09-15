import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  ArrowRight,
  Award,
  TrendingUp,
  Clock,
  BarChart3,
  Swords,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getAllProblems, getAllTopics, getLearningPaths } from '@/api/content';
import { getUserProgress, getDashboardStats } from '@/api/userActions';
import { SOLVE_XP, XP_PER_LEVEL, calculateLevel } from '@/utils/xpConfig';
import { BADGES } from '@/utils/badges';
import { PatternDiagram } from '@/components/custom/PatternDiagram';
import { PatternExplainer, explainerFor } from '@/components/custom/stepper';
import { CurriculumSheet } from '@/components/custom/CurriculumSheet';

interface DashboardProps {
  onNavigate: (view: 'home' | 'dashboard' | 'topic' | 'problems' | 'notes' | 'leaderboard' | 'daily-challenges', topicId?: string) => void;
}

interface UserProgressItem {
  status: string;
  problem_id: string;
  updatedAt: string;
}

interface ProblemItem {
  id: string;
  title: string;
  difficulty: string;
  topic_id: string;
}

interface TopicItem {
  id: string;
  title: string;
  color?: string;
}

interface WeeklyActivityItem {
  date: string;
  count: number;
}

interface RecentActivityItem {
  problem: string;
  difficulty: string;
  time: string;
}

interface ContinueTopic extends TopicItem {
  solvedInTopic: number;
  totalInTopic: number;
  progress: number;
  lastSolveDate: number;
}

/* ─── Animated Counter Hook ─── */
function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    const start = ref.current;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const value = Math.round(start + (target - start) * eased);
      setCount(value);
      if (progress < 1) requestAnimationFrame(step);
      else ref.current = target;
    };
    requestAnimationFrame(step);
  }, [target, duration]);

  return count;
}

/* ─── Time-Ago Formatter ─── */
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { profile, refreshProfile } = useAuth();
  
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [hoveredDonut, setHoveredDonut] = useState<string | null>(null);

  // ── Refresh button state ──
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRefresh = async () => {
    if (isRefreshing || cooldownSeconds > 0) return;
    setIsRefreshing(true);
    try {
      await refreshProfile();
      // Refetch React Query caches
      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
      setCooldownSeconds(10);
      // Start 10-second cooldown
      const tick = () => {
        setCooldownSeconds((prev) => {
          if (prev <= 1) return 0;
          cooldownRef.current = setTimeout(tick, 1000);
          return prev - 1;
        });
      };
      cooldownRef.current = setTimeout(tick, 1000);
    }
  };

  // Cleanup cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
    };
  }, []);

  const { data: problemsData = [], isLoading: problemsLoading } = useQuery({
    queryKey: ['problems'],
    queryFn: getAllProblems
  });

  const { data: topicsData = [], isLoading: topicsLoading } = useQuery({
    queryKey: ['topics'],
    queryFn: getAllTopics
  });

  const { data: pathsData = [], isLoading: pathsLoading } = useQuery({
    queryKey: ['paths'],
    queryFn: getLearningPaths
  });

  const { data: userProgressData = [], isLoading: progressLoading } = useQuery({
    queryKey: ['userProgress', profile?.id],
    queryFn: getUserProgress,
    enabled: !!profile,
  });

  const { data: dashboardStatsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboardStats', profile?.id],
    queryFn: getDashboardStats,
    enabled: !!profile,
  });

  const problems = problemsData;
  const topics = topicsData;
  const paths = pathsData;
  const userProgress = userProgressData;
  const dashboardStats = dashboardStatsData;
  const loading = problemsLoading || topicsLoading || progressLoading || statsLoading || pathsLoading;

  /* The set of solved problem ids, in one place. The curriculum sheet needs it
   * as a lookup (343 cells), so it is a Set rather than a filter per row. */
  const solvedIds = useMemo(
    () =>
      new Set<string>(
        userProgress
          .filter((p: UserProgressItem) => p.status === 'SOLVED')
          .map((p: UserProgressItem) => p.problem_id)
      ),
    [userProgress]
  );

  const stats = useMemo(() => {
    const solvedProgress = userProgress.filter((p: UserProgressItem) => p.status === 'SOLVED');
    const solvedIds = new Set(solvedProgress.map((p: UserProgressItem) => p.problem_id));

    const totalSolved = solvedIds.size;
    const totalProblems = problems.length;
    const xpPoints = profile?.xp_points ?? totalSolved * SOLVE_XP;

    let easy = 0, medium = 0, hard = 0;
    let easyTotal = 0, mediumTotal = 0, hardTotal = 0;
    problems.forEach((p: ProblemItem) => {
      if (p.difficulty === 'Easy') { easyTotal++; if (solvedIds.has(p.id)) easy++; }
      else if (p.difficulty === 'Medium') { mediumTotal++; if (solvedIds.has(p.id)) medium++; }
      else if (p.difficulty === 'Hard') { hardTotal++; if (solvedIds.has(p.id)) hard++; }
    });

    const recent = solvedProgress
      .sort((a: UserProgressItem, b: UserProgressItem) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
      .map((p: UserProgressItem) => {
        const prob = problems.find((prob: ProblemItem) => prob.id === p.problem_id);
        return {
          problem: prob ? prob.title : 'Unknown Problem',
          time: p.updatedAt,
          difficulty: prob?.difficulty || 'Medium',
          status: 'completed'
        };
      });

    const currentStreak = dashboardStats?.currentStreak ?? 0;

    return {
      totalSolved, totalProblems, xpPoints,
      easySolved: easy, mediumSolved: medium, hardSolved: hard,
      easyTotal, mediumTotal, hardTotal,
      recentActivity: recent, currentStreak
    };
  }, [problems, userProgress, dashboardStats, profile]);

  const weeklyProgress = useMemo(() => {
    if (dashboardStats?.weeklyActivity) return dashboardStats.weeklyActivity.map((d: WeeklyActivityItem) => d.count);
    return [0, 0, 0, 0, 0, 0, 0];
  }, [dashboardStats]);

  const maxWeekly = Math.max(...weeklyProgress, 1);

  const rankInfo = useMemo(() => {
    if (dashboardStats) return { rank: dashboardStats.rank, topPercent: dashboardStats.topPercent };
    return { rank: '--', topPercent: '--' };
  }, [dashboardStats]);

  const continueTopics = useMemo(() => {
    const solvedProgress = userProgress.filter((p: UserProgressItem) => p.status === 'SOLVED');
    const solvedIds = new Set(solvedProgress.map((p: UserProgressItem) => p.problem_id));

    return topics.map((topic: TopicItem) => {
      const topicProblems = problems.filter((p: ProblemItem) => p.topic_id === topic.id);
      const totalInTopic = topicProblems.length;
      const solvedInTopic = topicProblems.filter((p: ProblemItem) => solvedIds.has(p.id)).length;
      const progress = totalInTopic > 0 ? Math.round((solvedInTopic / totalInTopic) * 100) : 0;

      const topicProblemIds = new Set(topicProblems.map((p: ProblemItem) => p.id));
      const topicSolves = solvedProgress.filter((p: UserProgressItem) => topicProblemIds.has(p.problem_id));
      const lastSolveDate = topicSolves.length > 0
        ? Math.max(...topicSolves.map((p: UserProgressItem) => new Date(p.updatedAt).getTime()))
        : 0;

      return { ...topic, solvedInTopic, totalInTopic, progress, lastSolveDate };
    })
      .sort((a: ContinueTopic, b: ContinueTopic) => {
        if (a.solvedInTopic > 0 && b.solvedInTopic === 0) return -1;
        if (a.solvedInTopic === 0 && b.solvedInTopic > 0) return 1;
        return b.lastSolveDate - a.lastSolveDate;
      })
      .slice(0, 6);
  }, [topics, problems, userProgress]);

  const dayLabels = useMemo(() => {
    if (dashboardStats?.weeklyActivity) {
      return dashboardStats.weeklyActivity.map((d: WeeklyActivityItem) => {
        const date = new Date(d.date + 'T00:00:00');
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      });
    }
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  }, [dashboardStats]);

  // Badges come from the shared definition so the dashboard and the profile can
  // never disagree about what a badge is or how it is earned. Earned badges are
  // neutral; the accent is reserved for state, not for decoration.
  const badges = BADGES.map((badge) => ({
    ...badge,
    earned: badge.earned({ solved: stats.totalSolved, streak: stats.currentStreak }),
  }));

  const completionPercentage = stats.totalProblems > 0 ? Math.round((stats.totalSolved / stats.totalProblems) * 100) : 0;

  // Average mastery across the topics actually shown. Derived, not decorative —
  // the legend and the tiles must never disagree about the same number.

  // Animated counters
  const animSolved = useCountUp(stats.totalSolved);
  const animXP = useCountUp(stats.xpPoints);
  const animStreak = useCountUp(stats.currentStreak, 800);

  // Motivational message
  const motivation = useMemo(() => {
    if (stats.currentStreak >= 7) return { text: "You're on fire — a {streak}-day streak is a real commitment." };
    if (stats.currentStreak >= 3) return { text: "Great momentum. Keep the streak alive." };
    if (stats.totalSolved >= 50) return { text: "50+ problems conquered. The reps are showing." };
    if (stats.totalSolved >= 10) return { text: "You're making real progress. Keep climbing." };
    if (stats.totalSolved > 0) return { text: "Every problem solved is a step forward." };
    return { text: "Start your DSA journey today. Solve your first problem." };
  }, [stats.currentStreak, stats.totalSolved]);

  // Donut chart calculations — re-derived from the system palette.
  const donutData = useMemo(() => {
    const total = stats.easySolved + stats.mediumSolved + stats.hardSolved;
    if (total === 0) return [
      { label: 'Easy', value: 0, angle: 0, total: stats.easyTotal },
      { label: 'Medium', value: 0, angle: 0, total: stats.mediumTotal },
      { label: 'Hard', value: 0, angle: 0, total: stats.hardTotal },
    ];

    const easyAngle = (stats.easySolved / total) * 360;
    const medAngle = (stats.mediumSolved / total) * 360;
    const hardAngle = (stats.hardSolved / total) * 360;

    return [
      { label: 'Easy', value: stats.easySolved, angle: easyAngle, total: stats.easyTotal },
      { label: 'Medium', value: stats.mediumSolved, angle: medAngle, total: stats.mediumTotal },
      { label: 'Hard', value: stats.hardSolved, angle: hardAngle, total: stats.hardTotal },
    ];
  }, [stats]);

  // SVG donut arc helper
  function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
  }

  function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  const level = calculateLevel(stats.xpPoints);

  /* ── Pattern Studio feature: the pattern the learner is on, with the
     next unsolved problem in it. Derived from the same progress data as
     everything else on this page — no new backend contract. ── */
  const feature = useMemo(() => {
    const activeTopic = continueTopics[0];
    if (!activeTopic) return null;

    const solvedIds = new Set(
      userProgress.filter((p: UserProgressItem) => p.status === 'SOLVED').map((p: UserProgressItem) => p.problem_id)
    );
    const topicProblems = problems.filter((p: ProblemItem) => p.topic_id === activeTopic.id);
    const rank = (d: string) => (d === 'Easy' ? 0 : d === 'Medium' ? 1 : 2);
    const remaining = topicProblems
      .filter((p: ProblemItem) => !solvedIds.has(p.id))
      .sort((a: ProblemItem, b: ProblemItem) => rank(a.difficulty) - rank(b.difficulty));

    return {
      topic: activeTopic,
      nextProblem: remaining[0] ?? null,
      remainingCount: remaining.length,
    };
  }, [continueTopics, problems, userProgress]);

  const donutStroke = (label: string) =>
    label === 'Easy' ? '#b1cbbb' : label === 'Medium' ? '#b6b1ad' : '#d98a76';

  /* The stepping explainer exists for a few patterns only, so it is offered
   * only when the active pattern has one. Every other topic gets the static
   * structural diagram rather than a mismatched animation. */
  const hasExplainer = explainerFor(feature?.topic.title ?? '') !== null;

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#8f8a85] border-t-[#f0997d] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <section className="relative min-h-screen pt-24 pb-12">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── The identity band ──
            One drenched surface in the whole product. It carries the three
            things worth leading with — where you are, how far you have come,
            and the single next action — and nothing else. The restraint
            everywhere else is what makes this read as a statement rather than
            as decoration. */}
        <div className="ember-band rounded-[10px] mb-10 overflow-hidden">
          <div className="grid lg:grid-cols-[1.15fr_1fr]">
            <div className="p-6 sm:p-9 flex flex-col items-start justify-between gap-8">
              <p className="text-[0.8125rem]" style={{ color: 'var(--af-ember-ink)', opacity: 0.82 }}>
                Welcome back, {profile?.name?.split(' ')[0] || 'Learner'} · {motivation.text.replace('{streak}', String(stats.currentStreak))}
              </p>

              <div className="flex flex-col items-start">
                <h1 className="font-display text-[2.5rem] sm:text-[3.25rem] leading-[0.98] tracking-[-0.03em] mb-6 text-balance">
                  <span className="tnum">{animSolved}</span> of <span className="tnum">{stats.totalProblems}</span>
                  <br />
                  problems solved.
                </h1>

                {/* Progress as a rule, not a chart. Bone on ember. */}
                <div
                  className="w-full max-w-[22rem] mb-6"
                  role="img"
                  aria-label={`${completionPercentage} percent of the curriculum solved`}
                >
                  <div className="h-[3px] w-full" style={{ background: 'var(--af-ember-rule)' }}>
                    <div className="h-full" style={{ width: `${completionPercentage}%`, background: 'var(--af-ember-ink)' }} />
                  </div>
                  <div
                    className="flex justify-between mt-2 text-[0.75rem] tnum"
                    style={{ color: 'var(--af-ember-ink)', opacity: 0.82 }}
                  >
                    <span>{completionPercentage}% of the curriculum</span>
                    <span>{Math.max(stats.totalProblems - stats.totalSolved, 0)} to go</span>
                  </div>
                </div>

                {feature?.nextProblem ? (
                  <button
                    onClick={() => onNavigate('problems')}
                    className="inline-flex items-center gap-6 px-5 py-3 rounded-[6px] font-bold text-[0.875rem] hover:opacity-90 active:scale-[0.98] transition-[opacity,transform] duration-[var(--af-dur-fast)]"
                    style={{ background: 'var(--af-ember-ink)', color: 'var(--af-ember-deep)' }}
                  >
                    Continue · {feature.nextProblem.title}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => onNavigate('problems')}
                    className="inline-flex items-center gap-6 px-5 py-3 rounded-[6px] font-bold text-[0.875rem] hover:opacity-90 active:scale-[0.98] transition-[opacity,transform] duration-[var(--af-dur-fast)]"
                    style={{ background: 'var(--af-ember-ink)', color: 'var(--af-ember-deep)' }}
                  >
                    Browse problems
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div
                className="flex flex-wrap gap-x-6 gap-y-2 text-[0.8125rem]"
                style={{ color: 'var(--af-ember-ink)' }}
              >
                <span>
                  Level <b className="tnum font-medium">{level}</b>
                </span>
                <span>
                  <b className="tnum font-medium">{animStreak}</b> day streak
                </span>
                <span>
                  Rank <b className="tnum font-medium">#{rankInfo.rank}</b>
                </span>
              </div>
            </div>

            {/* The diagram sits on its own dark plate inside the band: an
                instrument read-out on a painted panel. Keeping it on the
                ground tone is what preserves its contrast.
                For pointer topics the plate becomes interactive — the pair
                actually moves, so the invariant is shown rather than asserted. */}
            <div className="p-6 sm:p-8 flex flex-col justify-between">
              <div
                className="flex items-center justify-between text-[0.75rem] font-mono mb-4"
                style={{ color: 'var(--af-ember-ink)', opacity: 0.85 }}
              >
                <span>{feature ? feature.topic.title : 'Your next pattern'}</span>
                <span className="tnum">{feature ? `${feature.remainingCount} to go` : '—'}</span>
              </div>
              <div
                className={`rounded-[8px] p-5 flex-1 flex ${
                  hasExplainer ? 'items-stretch' : 'items-center justify-center'
                }`}
                style={{ background: 'var(--af-ground)' }}
              >
                {hasExplainer ? (
                  <PatternExplainer topicTitle={feature?.topic.title ?? ''} className="w-full" />
                ) : (
                  <PatternDiagram
                    topicTitle={feature?.topic.title ?? 'Arrays'}
                    className="w-full max-w-[420px] h-auto"
                  />
                )}
              </div>
              <p
                className="text-[0.75rem] mt-4 pt-3"
                style={{ color: 'var(--af-ember-ink)', borderTop: '1px solid var(--af-ember-rule)', opacity: 0.85 }}
              >
                {hasExplainer
                  ? 'Step through it. Every figure updates as the pattern moves.'
                  : 'See the structure before the code.'}
              </p>
            </div>
          </div>
        </div>

        {/* ── The curriculum sheet ──
            The hero. Every path, every topic, every problem — on one sheet,
            with progress as texture rather than as a percentage in a card. */}
        <section className="mb-10" aria-labelledby="curriculum-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-3 mb-6">
            <h2 id="curriculum-heading" className="font-display text-[1.375rem] tracking-[-0.02em] text-[#f1eeea]">
              The curriculum
            </h2>
            <p className="text-[#8f8a85] text-[0.75rem]">
              {topics.length} topics · {stats.totalProblems} problems · solved cells fill in
            </p>
          </div>
          <CurriculumSheet
            paths={paths}
            topics={topics}
            problems={problems}
            solvedIds={solvedIds}
            onOpenTopic={(topicId) => onNavigate('topic', topicId)}
          />
        </section>

        {/* Toolbar — refresh only. The greeting and streak moved into the band. */}
        <div className="flex items-center justify-end gap-3 mb-6">
          <span className="text-[#8f8a85] text-[0.75rem] hidden sm:inline tnum">
            Updated {Math.floor((Date.now() - lastUpdated.getTime()) / 1000)}s ago
          </span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || cooldownSeconds > 0}
            aria-label={cooldownSeconds > 0 ? `Refresh available in ${cooldownSeconds} seconds` : 'Refresh dashboard stats'}
            className={`flex items-center gap-2 px-3 py-2 rounded-[4px] bg-[#222225] border border-[rgba(241,238,234,0.1)] text-[0.8125rem] font-medium transition-colors duration-[var(--af-dur-fast)] ${
              isRefreshing || cooldownSeconds > 0
                ? 'text-[#8f8a85] cursor-not-allowed'
                : 'text-[#b6b1ad] hover:text-[#f1eeea] hover:bg-[#2c2b30] cursor-pointer'
            }`}
            title={cooldownSeconds > 0 ? `Refresh available in ${cooldownSeconds}s` : 'Refresh stats'}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span aria-live="polite" className="tnum">{cooldownSeconds > 0 ? `${cooldownSeconds}s` : 'Refresh'}</span>
          </button>
        </div>

        {/* Stats — figures on hairlines, count-up retained */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-t border-b border-[rgba(241,238,234,0.2)] mb-8">
          {[
            { label: 'Problems solved', value: animSolved, sub: `of ${stats.totalProblems}`, tone: 'teal' as const },
            { label: 'XP points', value: animXP, sub: `Level ${level}`, tone: 'amber' as const, tooltip: `Earn ${SOLVE_XP} XP per solved problem. Every ${XP_PER_LEVEL.toLocaleString()} XP = 1 level.` },
            { label: 'Day streak', value: animStreak, sub: stats.currentStreak > 0 ? 'Keep it up' : 'Solve to start', tone: 'amber' as const },
            { label: 'Global rank', value: `#${rankInfo.rank}`, sub: `Top ${rankInfo.topPercent}%`, tone: 'soft' as const },
          ].map((stat) => (
            <div
              key={stat.label}
              className="relative px-4 py-3.5 border-r border-b md:border-b-0 border-[rgba(241,238,234,0.1)] last:border-r-0 cursor-default overflow-hidden"
              role="status"
              aria-label={`${stat.label}: ${stat.value}`}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <span
                  className={`mark ${stat.tone === 'soft' ? 'mark-outline' : ''}`}
                  data-tone={stat.tone}
                  aria-hidden="true"
                />
                <span className="text-[0.75rem] text-[#8f8a85]">{stat.label}</span>
              </div>
              <p className="text-[1.5rem] font-medium text-[#f1eeea] tnum leading-none mb-1">{stat.value}</p>
              <p className="text-[0.75rem] text-[#8f8a85]">{stat.sub}</p>
              {stat.tooltip && (
                <div className="absolute top-2 right-2 z-20">
                  <div className="relative group/tooltip">
                    <div className="w-4 h-4 rounded-[2px] bg-[#2c2b30] flex items-center justify-center text-[0.625rem] text-[#8f8a85] cursor-help">?</div>
                    <div className="absolute bottom-full right-0 mb-2 w-48 p-2 rounded-[6px] bg-[#2c2b30] border border-[rgba(241,238,234,0.1)] text-[0.75rem] text-[#b6b1ad] opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-[var(--af-dur-fast)] pointer-events-none z-30">
                      {stat.tooltip}
                    </div>
                  </div>
                </div>
              )}
              {isRefreshing && (
                <div className="absolute inset-0 bg-[#19191b]/70 flex items-center justify-center z-10">
                  <RefreshCw className="w-5 h-5 text-[#8f8a85] animate-spin" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overall Progress + Donut Chart */}
            <div className="bg-[#222225] border border-[rgba(241,238,234,0.1)] rounded-[6px] p-6">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-[rgba(241,238,234,0.1)]">
                <h3 className="text-[1.125rem] font-medium text-[#f1eeea] flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#f0997d]" />
                  Progress overview
                </h3>
                <span className="text-[#f0997d] font-medium text-[1.125rem] tnum">{completionPercentage}%</span>
              </div>

              {/* Progress Bar — solid amber on a hairline track */}
              <div className="h-1 bg-[rgba(241,238,234,0.1)] mb-8 overflow-hidden">
                <div
                  className="h-full bg-[#f0997d]"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>

              {/* Donut Chart + Breakdown */}
              <div className="flex flex-col sm:flex-row items-center gap-8">
                {/* SVG Donut */}
                <div className="relative w-40 h-40 flex-shrink-0">
                  <svg viewBox="0 0 120 120" className="w-full h-full" role="img" aria-label="Solved problems by difficulty">
                    {/* Background circle */}
                    <circle cx="60" cy="60" r="45" fill="none" stroke="#f1eeea" strokeOpacity="0.06" strokeWidth="14" />
                    {/* Donut segments */}
                    {(() => {
                      let startAngle = 0;
                      const total = stats.easySolved + stats.mediumSolved + stats.hardSolved;
                      if (total === 0) return null;

                      return donutData.map((seg) => {
                        if (seg.value === 0) return null;
                        const endAngle = startAngle + seg.angle;
                        const path = describeArc(60, 60, 45, startAngle, endAngle - 0.5);
                        const el = (
                          <path
                            key={seg.label}
                            d={path}
                            fill="none"
                            stroke={donutStroke(seg.label)}
                            strokeWidth={hoveredDonut === seg.label ? 17 : 14}
                            strokeLinecap="butt"
                            onMouseEnter={() => setHoveredDonut(seg.label)}
                            onMouseLeave={() => setHoveredDonut(null)}
                            className="cursor-pointer"
                          />
                        );
                        startAngle = endAngle;
                        return el;
                      });
                    })()}
                  </svg>
                  {/* Center text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <AnimatePresence mode="wait">
                      {hoveredDonut ? (
                        <motion.div
                          key={hoveredDonut}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                          className="text-center"
                        >
                          <span className="text-[1.5rem] font-medium text-[#f1eeea] tnum">
                            {donutData.find(d => d.label === hoveredDonut)?.value}
                          </span>
                          <p className="text-[0.75rem] text-[#8f8a85]">{hoveredDonut}</p>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="total"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                          className="text-center"
                        >
                          <span className="text-[1.5rem] font-medium text-[#f1eeea] tnum">{animSolved}</span>
                          <p className="text-[0.75rem] text-[#8f8a85]">Solved</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Difficulty Breakdown — figures on hairlines, no chips */}
                <div className="flex-1 grid grid-cols-3 w-full border-t border-b border-[rgba(241,238,234,0.1)]">
                  {donutData.map((d) => (
                    <div
                      key={d.label}
                      onMouseEnter={() => setHoveredDonut(d.label)}
                      onMouseLeave={() => setHoveredDonut(null)}
                      className={`px-3 py-3 border-r border-[rgba(241,238,234,0.1)] last:border-r-0 cursor-default transition-colors duration-[var(--af-dur-fast)] ${
                        hoveredDonut === d.label ? 'bg-[#2c2b30]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span
                          className="mark"
                          data-tone={d.label === 'Easy' ? 'teal' : d.label === 'Medium' ? 'soft' : 'danger'}
                          aria-hidden="true"
                        />
                        <p className="text-[0.75rem] text-[#8f8a85]">{d.label}</p>
                      </div>
                      <p className="text-[1.5rem] font-medium text-[#f1eeea] tnum leading-none mb-1">{d.value}</p>
                      <p className="text-[0.75rem] text-[#8f8a85] tnum">of {d.total}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Weekly Activity — flat teal line, square marks, no glow */}
            <div className="bg-[#222225] border border-[rgba(241,238,234,0.1)] rounded-[6px] p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[rgba(241,238,234,0.1)]">
                <h3 className="text-[1.125rem] font-medium text-[#f1eeea] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#b1cbbb]" />
                  Weekly activity
                </h3>
                <span className="text-[0.75rem] text-[#8f8a85] flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Last 7 days
                </span>
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
                    const val = Math.round(maxWeekly * (4 - i) / 4);
                    return (
                      <text key={i} x="24" y={i * 22 + 13} textAnchor="end"
                        fill="#8f8a85" fontSize="7">{val}</text>
                    );
                  })}

                  {/* Area fill — flat wash */}
                  <polygon
                    points={`40,100 ${weeklyProgress.map((count: number, i: number) => {
                      const x = 40 + i * 46;
                      const y = maxWeekly > 0 ? 100 - (count / maxWeekly) * 82 : 100;
                      return `${x},${y}`;
                    }).join(' ')} ${40 + 6 * 46},100`}
                    fill="rgba(177,203,187,0.14)"
                  />

                  {/* Line */}
                  <polyline
                    points={weeklyProgress.map((count: number, i: number) => {
                      const x = 40 + i * 46;
                      const y = maxWeekly > 0 ? 100 - (count / maxWeekly) * 82 : 100;
                      return `${x},${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="#b1cbbb"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Interactive marks + tooltips */}
                  {weeklyProgress.map((count: number, i: number) => {
                    const x = 40 + i * 46;
                    const y = maxWeekly > 0 ? 100 - (count / maxWeekly) * 82 : 100;
                    const isHovered = hoveredDay === i;
                    const isToday = i === 6;
                    const size = isHovered ? 7 : isToday ? 6 : 5;
                    return (
                      <g key={i}
                        onMouseEnter={() => setHoveredDay(i)}
                        onMouseLeave={() => setHoveredDay(null)}
                        className="cursor-pointer"
                      >
                        {/* Hover area (invisible, larger) */}
                        <rect x={x - 15} y={0} width={30} height={115} fill="transparent" />

                        {/* Hover column highlight */}
                        {isHovered && (
                          <rect x={x - 12} y={10} width={24} height={90}
                            fill="#f1eeea" fillOpacity="0.04" />
                        )}

                        {/* Square mark, not a circle */}
                        <rect
                          x={x - size / 2} y={y - size / 2}
                          width={size} height={size} rx="1"
                          fill={isToday ? '#f0997d' : '#b1cbbb'}
                        />

                        {/* Tooltip */}
                        {isHovered && (
                          <g>
                            <rect x={x - 22} y={y - 30} width={44} height={20} rx="4"
                              fill="#2c2b30" stroke="#f1eeea" strokeOpacity="0.1" strokeWidth="0.5" />
                            <text x={x} y={y - 17} textAnchor="middle"
                              fill="#f1eeea" fontSize="9">
                              {count} {count === 1 ? 'prob' : 'probs'}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}

                  {/* Day labels */}
                  {dayLabels.map((day: string, i: number) => {
                    const x = 40 + i * 46;
                    const isToday = i === 6;
                    return (
                      <text key={day + i} x={x} y={118} textAnchor="middle"
                        fill={isToday ? '#f0997d' : '#8f8a85'}
                        fontSize="8">
                        {day}
                      </text>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Topic mastery tiles were removed: the curriculum sheet above
                reports the same per-topic progress more completely, and two
                widgets disagreeing about the same number was the problem. */}

            {/* Recent Activity — log lines on hairlines */}
            <div>
              <h3 className="text-[0.75rem] font-mono uppercase tracking-[0.08em] text-[#b6b1ad] mb-1 pb-3 border-b border-[rgba(241,238,234,0.2)]">
                Recent activity
              </h3>
              <div className="ruled">
                {stats.recentActivity.length > 0 ? stats.recentActivity.map((activity: RecentActivityItem, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-2 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: activity.difficulty === 'Easy' ? '#b1cbbb' : activity.difficulty === 'Medium' ? '#b6b1ad' : '#d98a76' }}
                      />
                      <div>
                        <p className="text-[#f1eeea] text-[0.875rem] font-medium">{activity.problem}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[0.75rem] font-medium difficulty-${activity.difficulty.toLowerCase()}`}>
                            {activity.difficulty}
                          </span>
                          <span className="text-[#8f8a85] text-[0.75rem]">{timeAgo(activity.time)}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[0.8125rem] font-medium text-[#c8dfd1] tnum">+{SOLVE_XP} XP</span>
                  </div>
                )) : (
                  <p className="text-[#8f8a85] text-[0.875rem] py-4 text-center">No recent activity. Start solving problems.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Badges — neutral squares, no glow, no shimmer */}
            <div className="bg-[#222225] border border-[rgba(241,238,234,0.1)] rounded-[6px] p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[rgba(241,238,234,0.1)]">
                <h3 className="text-[1.125rem] font-medium text-[#f1eeea] flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#8f8a85]" />
                  Badges
                </h3>
                <span className="text-[0.75rem] text-[#8f8a85] tnum">
                  {badges.filter(b => b.earned).length}/{badges.length} earned
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {badges.map((badge) => (
                  <div
                    key={badge.id}
                    className={`p-3 rounded-[4px] text-center cursor-default border ${
                      badge.earned
                        ? 'border-[rgba(241,238,234,0.1)] bg-[#2c2b30]'
                        : 'border-[rgba(241,238,234,0.1)] opacity-40'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-[4px] mx-auto mb-2 flex items-center justify-center bg-[#19191b]">
                      <badge.Icon className={`w-4 h-4 ${badge.earned ? 'text-[#f0997d]' : 'text-[#8f8a85]'}`} />
                    </div>
                    <p className={`text-[0.75rem] font-medium ${badge.earned ? 'text-[#f1eeea]' : 'text-[#8f8a85]'}`}>
                      {badge.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* "Continue learning" was removed: the identity band already names
                the single next problem, and the sheet shows every topic's
                position. A third list of the same topics was noise. */}

            {/* Daily Challenge — one status block, used sparingly */}
            <div className="bg-[#222225] border border-[rgba(241,238,234,0.1)] rounded-[6px] p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-[4px] bg-[#2c2b30] flex items-center justify-center">
                  <Swords className="w-4 h-4 text-[#f0997d]" />
                </div>
                <h3 className="text-[1.125rem] font-medium text-[#f1eeea]">Daily challenge</h3>
              </div>
              <p className="text-[#b6b1ad] text-[0.875rem] leading-relaxed mb-4">
                Complete today's challenge to maintain your streak and earn bonus XP.
              </p>
              <button
                onClick={() => onNavigate('daily-challenges')}
                aria-label="Start today's daily challenge"
                className="w-full py-3 rounded-[6px] bg-[#f0997d] text-[#19191b] font-medium text-[0.9375rem] hover:bg-[#ffb197] active:scale-[0.98] transition-colors duration-[var(--af-dur-fast)]"
              >
                Start challenge
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
