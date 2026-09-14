import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  Trophy,
  Target,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  Zap,
  Star,
  Award,
  TrendingUp,
  Clock,
  Sparkles,
  BarChart3,
  Swords,
  Crown,
  Footprints,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getAllProblems, getAllTopics } from '@/api/content';
import { getUserProgress, getDashboardStats } from '@/api/userActions';
import { SOLVE_XP, XP_PER_LEVEL, calculateLevel } from '@/utils/xpConfig';

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
    queryFn: () => getAllProblems(),
  });

  const { data: topicsData = [], isLoading: topicsLoading } = useQuery({
    queryKey: ['topics'],
    queryFn: () => getAllTopics(),
  });

  const { data: userProgressData = [], isLoading: progressLoading } = useQuery({
    queryKey: ['userProgress', profile?.id],
    queryFn: () => getUserProgress(),
    enabled: !!profile,
  });

  const { data: dashboardStatsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboardStats', profile?.id],
    queryFn: () => getDashboardStats(),
    enabled: !!profile,
  });

  const problems = problemsData;
  const topics = topicsData;
  const userProgress = userProgressData;
  const dashboardStats = dashboardStatsData;
  const loading = problemsLoading || topicsLoading || progressLoading || statsLoading;

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

  // Badges with unique icons
  const badges = [
    { id: 'b1', name: 'First Steps', Icon: Footprints, earned: stats.totalSolved > 0, color: '#a088ff' },
    { id: 'b2', name: 'Rising Star', Icon: Star, earned: stats.totalSolved >= 10, color: '#ffd700' },
    { id: 'b3', name: 'Champion', Icon: Crown, earned: stats.totalSolved >= 50, color: '#ff8a63' },
    { id: 'b4', name: 'Streak Master', Icon: Flame, earned: stats.currentStreak >= 3, color: '#ff6347' },
    { id: 'b5', name: 'Scholar', Icon: BookOpen, earned: stats.totalSolved >= 25, color: '#63e3ff' },
    { id: 'b6', name: 'Elite', Icon: Award, earned: stats.totalSolved >= 100, color: '#88ff9f' },
  ];

  const completionPercentage = stats.totalProblems > 0 ? Math.round((stats.totalSolved / stats.totalProblems) * 100) : 0;

  // Animated counters
  const animSolved = useCountUp(stats.totalSolved);
  const animXP = useCountUp(stats.xpPoints);
  const animStreak = useCountUp(stats.currentStreak, 800);

  // Motivational message
  const motivation = useMemo(() => {
    if (stats.currentStreak >= 7) return { text: "🔥 You're on fire! A {streak}-day streak is incredible!", emoji: '🏆' };
    if (stats.currentStreak >= 3) return { text: "💪 Great momentum! Keep the streak alive!", emoji: '⚡' };
    if (stats.totalSolved >= 50) return { text: "🎯 50+ problems conquered! You're a DSA warrior!", emoji: '🗡️' };
    if (stats.totalSolved >= 10) return { text: "📈 You're making real progress. Keep climbing!", emoji: '🚀' };
    if (stats.totalSolved > 0) return { text: "🌱 Every problem solved is a step forward. Keep going!", emoji: '✨' };
    return { text: "👋 Start your DSA journey today. Solve your first problem!", emoji: '🎯' };
  }, [stats.currentStreak, stats.totalSolved]);

  // Donut chart calculations
  const donutData = useMemo(() => {
    const total = stats.easySolved + stats.mediumSolved + stats.hardSolved;
    if (total === 0) return [
      { label: 'Easy', value: 0, angle: 0, color: '#22c55e', total: stats.easyTotal },
      { label: 'Medium', value: 0, angle: 0, color: '#eab308', total: stats.mediumTotal },
      { label: 'Hard', value: 0, angle: 0, color: '#ef4444', total: stats.hardTotal },
    ];

    const easyAngle = (stats.easySolved / total) * 360;
    const medAngle = (stats.mediumSolved / total) * 360;
    const hardAngle = (stats.hardSolved / total) * 360;

    return [
      { label: 'Easy', value: stats.easySolved, angle: easyAngle, color: '#22c55e', total: stats.easyTotal },
      { label: 'Medium', value: stats.mediumSolved, angle: medAngle, color: '#eab308', total: stats.mediumTotal },
      { label: 'Hard', value: stats.hardSolved, angle: hardAngle, color: '#ef4444', total: stats.hardTotal },
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

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-[#a088ff] border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <section className="relative min-h-screen pt-24 pb-12 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 grid-pattern opacity-20" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#a088ff]/10 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#63e3ff]/10 rounded-full blur-[120px]" />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-[#ff8a63]/5 rounded-full blur-[100px] -translate-x-1/2" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header + Motivational Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="font-display text-3xl sm:text-4xl text-white mb-2">
                Welcome back, <span className="gradient-text">{profile?.name?.split(' ')[0] || 'Learner'}</span>!
              </h1>
              <p className="text-white/50 text-sm">
                Level {level} • Here's your learning progress and achievements.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white/30 text-xs hidden sm:inline">
                Updated {Math.floor((Date.now() - lastUpdated.getTime()) / 1000)}s ago
              </span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRefresh}
                disabled={isRefreshing || cooldownSeconds > 0}
                aria-label={cooldownSeconds > 0 ? `Refresh available in ${cooldownSeconds} seconds` : 'Refresh dashboard stats'}
                className={`flex items-center gap-2 px-3 py-2 rounded-full glass text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a088ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f16] ${
                  isRefreshing || cooldownSeconds > 0
                    ? 'text-white/30 cursor-not-allowed'
                    : 'text-white/70 hover:text-white cursor-pointer'
                }`}
                title={cooldownSeconds > 0 ? `Refresh available in ${cooldownSeconds}s` : 'Refresh stats'}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span aria-live="polite">{cooldownSeconds > 0 ? `${cooldownSeconds}s` : 'Refresh'}</span>
              </motion.button>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full glass cursor-default"
                title="Streak resets at midnight UTC"
              >
                <Flame className={`w-5 h-5 ${stats.currentStreak > 0 ? 'text-[#ff8a63]' : 'text-white/30'}`} />
                <span className="text-white font-medium">{animStreak} day streak</span>
              </motion.div>
            </div>
          </div>

          {/* Motivational Banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="relative overflow-hidden rounded-xl p-4 border border-white/5"
            style={{
              background: 'linear-gradient(135deg, rgba(160,136,255,0.08) 0%, rgba(99,227,255,0.05) 50%, rgba(255,138,99,0.05) 100%)'
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{motivation.emoji}</span>
              <p className="text-white/70 text-sm font-medium">
                {motivation.text.replace('{streak}', String(stats.currentStreak))}
              </p>
            </div>
            <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a088ff]/30" />
          </motion.div>
        </motion.div>

        {/* Quick Actions Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-wrap gap-3 mb-8"
        >
          {[
            { label: 'Daily Challenge', icon: Swords, color: '#ff8a63', view: 'daily-challenges' as const },
            { label: 'Practice Problems', icon: Target, color: '#a088ff', view: 'problems' as const },
            { label: 'Leaderboard', icon: Trophy, color: '#ffd700', view: 'leaderboard' as const },
            { label: 'My Notes', icon: BookOpen, color: '#63e3ff', view: 'notes' as const },
          ].map((action) => (
            <motion.button
              key={action.label}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onNavigate(action.view)}
              aria-label={`Navigate to ${action.label}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/20 transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a088ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f16]"
            >
              <action.icon className="w-4 h-4 transition-colors" style={{ color: action.color }} />
              <span className="text-sm text-white/70 group-hover:text-white transition-colors">{action.label}</span>
            </motion.button>
          ))}
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {[
            { label: 'Problems Solved', value: animSolved, sub: `of ${stats.totalProblems}`, icon: CheckCircle2, color: '#a088ff', glow: 'rgba(160,136,255,0.15)' },
            { label: 'XP Points', value: animXP, sub: `Level ${level}`, icon: Zap, color: '#ffd700', glow: 'rgba(255,215,0,0.12)', tooltip: `Earn ${SOLVE_XP} XP per solved problem. Every ${XP_PER_LEVEL.toLocaleString()} XP = 1 Level.` },
            { label: 'Day Streak', value: animStreak, sub: stats.currentStreak > 0 ? 'Keep it up!' : 'Solve to start!', icon: Flame, color: '#ff8a63', glow: 'rgba(255,138,99,0.12)' },
            { label: 'XP Points', value: animXP, sub: `Level ${level}`, icon: Zap, color: '#ffd700', glow: 'rgba(255,215,0,0.12)' },
            { label: 'Day Streak', value: animStreak, sub: 'Resets at midnight UTC', icon: Flame, color: '#ff8a63', glow: 'rgba(255,138,99,0.12)' },
            { label: 'Global Rank', value: `#${rankInfo.rank}`, sub: `Top ${rankInfo.topPercent}%`, icon: Trophy, color: '#88ff9f', glow: 'rgba(136,255,159,0.12)' },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              whileHover={{ scale: 1.03, y: -4 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="relative glass rounded-2xl p-5 overflow-hidden group cursor-default"
              role="status"
              aria-label={`${stat.label}: ${stat.value}`}
            >
              {stat.tooltip && (
                <div className="absolute top-2 right-2 z-20">
                  <div className="relative group/tooltip">
                    <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white/40 cursor-help">?</div>
                    <div className="absolute bottom-full right-0 mb-2 w-48 p-2 rounded-lg bg-[#1e1e2d] border border-white/10 text-xs text-white/70 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-30">
                      {stat.tooltip}
                    </div>
                  </div>
                </div>
              )}
              {isRefreshing && (
                <div className="absolute inset-0 bg-white/5 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl">
                  <RefreshCw className="w-5 h-5 text-white/50 animate-spin" />
                </div>
              )}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ background: `${stat.color}20` }}
                >
                  <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
                <span className="text-white/50 text-sm">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-white mb-0.5">{stat.value}</p>
              <p className="text-xs text-white/40">{stat.sub}</p>
              {/* Hover glow */}
              <div
                className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: stat.glow }}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overall Progress + Donut Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="glass rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#a088ff]" />
                  Progress Overview
                </h3>
                <span className="text-[#a088ff] font-semibold text-lg">{completionPercentage}%</span>
              </div>

              {/* Progress Bar */}
              <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-8 relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPercentage}%` }}
                  transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-[#a088ff] to-[#63e3ff] relative"
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg shadow-[#a088ff]/40" />
                </motion.div>
              </div>

              {/* Donut Chart + Breakdown */}
              <div className="flex flex-col sm:flex-row items-center gap-8">
                {/* SVG Donut */}
                <div className="relative w-40 h-40 flex-shrink-0">
                  <svg viewBox="0 0 120 120" className="w-full h-full">
                    {/* Background circle */}
                    <circle cx="60" cy="60" r="45" fill="none" stroke="white" strokeOpacity="0.05" strokeWidth="14" />
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
                          <motion.path
                            key={seg.label}
                            d={path}
                            fill="none"
                            stroke={seg.color}
                            strokeWidth={hoveredDonut === seg.label ? 17 : 14}
                            strokeLinecap="round"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 1, delay: 0.6 }}
                            onMouseEnter={() => setHoveredDonut(seg.label)}
                            onMouseLeave={() => setHoveredDonut(null)}
                            className="cursor-pointer transition-all"
                            style={{ filter: hoveredDonut === seg.label ? `drop-shadow(0 0 8px ${seg.color}60)` : 'none' }}
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
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="text-center"
                        >
                          <span className="text-xl font-bold text-white">
                            {donutData.find(d => d.label === hoveredDonut)?.value}
                          </span>
                          <p className="text-[10px] text-white/50">{hoveredDonut}</p>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="total"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="text-center"
                        >
                          <span className="text-xl font-bold text-white">{animSolved}</span>
                          <p className="text-[10px] text-white/50">Solved</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Difficulty Breakdown */}
                <div className="flex-1 grid grid-cols-3 gap-4 w-full">
                  {donutData.map((d) => (
                    <motion.div
                      key={d.label}
                      whileHover={{ scale: 1.05 }}
                      onMouseEnter={() => setHoveredDonut(d.label)}
                      onMouseLeave={() => setHoveredDonut(null)}
                      className="text-center p-3 rounded-xl transition-all cursor-default"
                      style={{
                        background: hoveredDonut === d.label ? `${d.color}15` : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${hoveredDonut === d.label ? `${d.color}40` : 'rgba(255,255,255,0.05)'}`
                      }}
                    >
                      <div
                        className="inline-flex items-center justify-center w-10 h-10 rounded-full mb-2"
                        style={{ background: `${d.color}20` }}
                      >
                        <span className="font-bold text-sm" style={{ color: d.color }}>{d.value}</span>
                      </div>
                      <p className="text-xs text-white/50">{d.label}</p>
                      <p className="text-[10px] text-white/30 mt-0.5">of {d.total}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Weekly Activity - Redesigned Graph */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="glass rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#63e3ff]" />
                  Weekly Activity
                </h3>
                <span className="text-xs text-white/40 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Last 7 Days
                </span>
              </div>
              <div className="w-full h-44 relative">
                <svg viewBox="0 0 340 130" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <linearGradient id="dashAreaGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a088ff" stopOpacity="0.25" />
                      <stop offset="60%" stopColor="#63e3ff" stopOpacity="0.08" />
                      <stop offset="100%" stopColor="#63e3ff" stopOpacity="0.01" />
                    </linearGradient>
                    <linearGradient id="dashLineGrad2" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#a088ff" />
                      <stop offset="100%" stopColor="#63e3ff" />
                    </linearGradient>
                    <filter id="glow">
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
                    const val = Math.round(maxWeekly * (4 - i) / 4);
                    return (
                      <text key={i} x="24" y={i * 22 + 13} textAnchor="end"
                        fill="white" fillOpacity="0.2" fontSize="7">{val}</text>
                    );
                  })}

                  {/* Area fill */}
                  <motion.polygon
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.6 }}
                    points={`40,100 ${weeklyProgress.map((count: number, i: number) => {
                      const x = 40 + i * 46;
                      const y = maxWeekly > 0 ? 100 - (count / maxWeekly) * 82 : 100;
                      return `${x},${y}`;
                    }).join(' ')} ${40 + 6 * 46},100`}
                    fill="url(#dashAreaGrad2)"
                  />

                  {/* Line */}
                  <motion.polyline
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1.5, delay: 0.4 }}
                    points={weeklyProgress.map((count: number, i: number) => {
                      const x = 40 + i * 46;
                      const y = maxWeekly > 0 ? 100 - (count / maxWeekly) * 82 : 100;
                      return `${x},${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="url(#dashLineGrad2)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#glow)"
                  />

                  {/* Interactive dots + tooltips */}
                  {weeklyProgress.map((count: number, i: number) => {
                    const x = 40 + i * 46;
                    const y = maxWeekly > 0 ? 100 - (count / maxWeekly) * 82 : 100;
                    const isHovered = hoveredDay === i;
                    const isToday = i === 6;
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
                          <rect x={x - 12} y={10} width={24} height={90} rx="4"
                            fill="white" fillOpacity="0.03" />
                        )}

                        {/* Dot outer glow */}
                        {(isHovered || isToday) && (
                          <circle cx={x} cy={y} r={isHovered ? 10 : 6}
                            fill={isToday ? '#63e3ff' : '#a088ff'} fillOpacity="0.15" />
                        )}

                        {/* Dot */}
                        <motion.circle
                          initial={{ r: 0 }}
                          animate={{ r: isHovered ? 5 : isToday ? 4 : 3.5 }}
                          transition={{ duration: 0.2 }}
                          cx={x} cy={y}
                          fill={isToday ? '#63e3ff' : '#a088ff'}
                          stroke="#0f0f16"
                          strokeWidth="2"
                        />

                        {/* Tooltip */}
                        {isHovered && (
                          <g>
                            <rect x={x - 22} y={y - 30} width={44} height={20} rx="6"
                              fill="#1e1e2d" stroke="white" strokeOpacity="0.1" strokeWidth="0.5" />
                            <text x={x} y={y - 17} textAnchor="middle"
                              fill="white" fontSize="9" fontWeight="600">
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
                        fill={isToday ? '#63e3ff' : 'white'}
                        fillOpacity={isToday ? 0.8 : 0.35}
                        fontSize="8" fontWeight={isToday ? '600' : '400'}>
                        {day}
                      </text>
                    );
                  })}
                </svg>
              </div>
            </motion.div>

            {/* Topic Mastery Heatmap */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="glass rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#ffd700]" />
                  Topic Mastery
                </h3>
                <div className="flex items-center gap-2 text-[10px] text-white/30">
                  <span>0%</span>
                  <div className="flex gap-0.5">
                    {[0.1, 0.25, 0.5, 0.75, 1].map((opacity) => (
                      <div key={opacity} className="w-3 h-3 rounded-sm" style={{ background: `rgba(160,136,255,${opacity})` }} />
                    ))}
                  </div>
                  <span>100%</span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {continueTopics.map((topic: ContinueTopic, i: number) => {
                  const intensity = topic.progress / 100;
                  return (
                    <motion.button
                      key={topic.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 + i * 0.05 }}
                      whileHover={{ scale: 1.06, y: -3 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => onNavigate('topic', topic.id)}
                      aria-label={`${topic.title}: ${topic.progress}% complete, ${topic.solvedInTopic} of ${topic.totalInTopic} problems solved`}
                      className="relative p-4 rounded-xl text-left overflow-hidden transition-all border border-white/5 hover:border-white/15 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a088ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f16]"
                      style={{
                        background: `linear-gradient(135deg, rgba(160,136,255,${0.05 + intensity * 0.2}) 0%, rgba(99,227,255,${0.02 + intensity * 0.1}) 100%)`
                      }}
                    >
                      <BookOpen className="w-4 h-4 mb-2" style={{ color: topic.color || '#a088ff', opacity: 0.5 + intensity * 0.5 }} />
                      <p className="text-xs font-medium text-white/80 truncate mb-1">{topic.title}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${topic.progress}%` }}
                            transition={{ duration: 0.8, delay: 0.5 + i * 0.05 }}
                            className="h-full rounded-full"
                            style={{ background: topic.color || '#a088ff' }}
                          />
                        </div>
                        <span className="text-[10px] text-white/40">{topic.progress}%</span>
                      </div>
                      <p className="text-[10px] text-white/30 mt-1">{topic.solvedInTopic}/{topic.totalInTopic}</p>

                      {/* Glow on hover */}
                      <div
                        className="absolute -right-3 -bottom-3 w-12 h-12 rounded-full blur-xl opacity-0 group-hover:opacity-40 transition-opacity"
                        style={{ background: topic.color || '#a088ff' }}
                      />
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="glass rounded-2xl p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-white/40" />
                Recent Activity
              </h3>
              <div className="space-y-2">
                {stats.recentActivity.length > 0 ? stats.recentActivity.map((activity: RecentActivityItem, index: number) => {
                  const diffColor = activity.difficulty === 'Easy' ? '#22c55e' :
                    activity.difficulty === 'Medium' ? '#eab308' : '#ef4444';
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.5 + index * 0.08 }}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ background: `${diffColor}15` }}>
                          <CheckCircle2 className="w-4 h-4" style={{ color: diffColor }} />
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium group-hover:text-white/90">{activity.problem}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                              style={{ background: `${diffColor}15`, color: diffColor }}>
                              {activity.difficulty}
                            </span>
                            <span className="text-white/30 text-[10px]">{timeAgo(activity.time)}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-[#88ff9f]/70">+{SOLVE_XP} XP</span>
                    </motion.div>
                  );
                }) : (
                  <p className="text-white/40 text-sm py-4 text-center">No recent activity. Start solving problems!</p>
                )}
              </div>
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="glass rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#ffd700]" />
                  Badges
                </h3>
                <span className="text-xs text-white/40">
                  {badges.filter(b => b.earned).length}/{badges.length} earned
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {badges.map((badge) => (
                  <motion.div
                    key={badge.id}
                    whileHover={{ scale: 1.08, y: -3 }}
                    className={`relative p-3 rounded-xl text-center cursor-default overflow-hidden transition-all ${badge.earned
                      ? 'border border-white/10'
                      : 'border border-white/5 opacity-40'
                      }`}
                    style={{
                      background: badge.earned
                        ? `linear-gradient(135deg, ${badge.color}10, ${badge.color}05)`
                        : 'rgba(255,255,255,0.02)'
                    }}
                  >
                    <div
                      className={`w-9 h-9 rounded-full mx-auto mb-2 flex items-center justify-center transition-all ${badge.earned ? 'shadow-lg' : ''
                        }`}
                      style={{
                        background: badge.earned ? `${badge.color}25` : 'rgba(255,255,255,0.05)',
                        boxShadow: badge.earned ? `0 0 12px ${badge.color}30` : 'none'
                      }}
                    >
                      <badge.Icon className="w-4 h-4" style={{ color: badge.earned ? badge.color : 'rgba(255,255,255,0.3)' }} />
                    </div>
                    <p className={`text-[10px] font-medium ${badge.earned ? 'text-white/80' : 'text-white/30'}`}>
                      {badge.name}
                    </p>
                    {/* Shimmer on earned */}
                    {badge.earned && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Continue Learning */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="glass rounded-2xl p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Continue Learning</h3>
              <div className="space-y-2">
                {continueTopics.slice(0, 4).map((topic: ContinueTopic) => (
                  <motion.button
                    key={topic.id}
                    whileHover={{ x: 4 }}
                    onClick={() => onNavigate('topic', topic.id)}
                    aria-label={`Continue learning ${topic.title}: ${topic.progress}% complete`}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] transition-all text-left group border border-transparent hover:border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a088ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f16]"
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${topic.color || '#a088ff'}15` }}
                    >
                      <BookOpen className="w-4 h-4" style={{ color: topic.color || '#a088ff' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{topic.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${topic.progress}%`, background: topic.color || '#a088ff' }}
                          />
                        </div>
                        <span className="text-[10px] text-white/40 w-8">{topic.progress}%</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0" />
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Daily Challenge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="relative rounded-2xl overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#ff8a63]/20 via-[#ff6347]/10 to-[#a088ff]/10" />
              <div className="relative glass p-6 border border-[#ff8a63]/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[#ff8a63]/20 flex items-center justify-center">
                    <Swords className="w-4 h-4 text-[#ff8a63]" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Daily Challenge</h3>
                </div>
                <p className="text-white/50 text-sm mb-4">
                  Complete today's challenge to maintain your streak and earn bonus XP!
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onNavigate('daily-challenges')}
                  aria-label="Start today's daily challenge"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#ff8a63] to-[#ff6347] text-white font-semibold hover:shadow-lg hover:shadow-[#ff8a63]/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8a63] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f16]"
                >
                  Start Challenge →
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
