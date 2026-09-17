import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Trophy,
  Medal,
  Flame,
  Target,
  Crown,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/api/apiClient';
import { getMyRank } from '@/api/userActions';

interface LeaderboardProps {
  onProfileClick?: (userId: string) => void;
}

interface LeaderboardEntry {
  pid: string;
  name: string;
  avatar?: string;
  xp: number;
  streak: number;
  solved: number;
  rank: number;
}

export function Leaderboard({ onProfileClick }: LeaderboardProps) {
  const { profile } = useAuth();
  const [category, setCategory] = useState<'xp' | 'streak' | 'solved'>('xp');

  // Cached (30s stale) + placeholderData: switching XP/Streak/Solved tabs
  // keeps the previous table on screen while the new one loads, instead of
  // flashing a full-screen "Loading Leaderboard..." spinner.
  const { data: leaderboardData = [], isLoading: loading, isError: loadError, refetch } = useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard', category],
    queryFn: async () => {
      const res = await apiClient.get(`/api/users/leaderboard?sortBy=${category}&limit=10`);
      return res.data;
    },
    staleTime: 30 * 1000,
    placeholderData: (previous) => previous,
  });

  // Fetch the logged-in user's own rank from the backend
  const { data: myRankData } = useQuery({
    queryKey: ['myRank', profile?.id],
    queryFn: getMyRank,
    enabled: !!profile,
    staleTime: 30 * 1000,
  });
  const myRank = profile ? (myRankData?.rank ?? null) : null;

  const loadLeaderboard = () => void refetch();

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-[#ffd700]" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-[#c0c0c0]" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-[#cd7f32]" />;
    return <span className="w-6 h-6 flex items-center justify-center text-white/60 font-medium">{rank}</span>;
  };

  if (loading && leaderboardData.length === 0) {
    return (
      <section className="relative min-h-screen pt-24 pb-12 overflow-hidden flex items-center justify-center">
        <div className="text-white">Loading Leaderboard...</div>
      </section>
    )
  }

  if (loadError && leaderboardData.length === 0) {
    return (
      <section className="relative min-h-screen pt-24 pb-12 overflow-hidden flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-white/60 mb-4">Failed to load the leaderboard.</p>
          <Button
            onClick={loadLeaderboard}
            className="bg-[#a088ff] hover:bg-[#8f76fa] text-white"
          >
            Retry
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="relative min-h-screen pt-24 pb-12 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 grid-pattern opacity-20" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#ffd700]/10 rounded-full blur-[200px]" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ffd700]/10 border border-[#ffd700]/20 mb-4">
            <Trophy className="w-5 h-5 text-[#ffd700]" />
            <span className="text-[#ffd700] font-medium">Global Leaderboard</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-white mb-2">
            Top <span className="gradient-text">Performers</span>
          </h1>
          <p className="text-white/60">
            Compete with learners worldwide and climb the ranks
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8"
        >
          {/* Category */}
          <div className="flex gap-2">
            {[
              { id: 'xp', label: 'XP', icon: Zap },
              { id: 'streak', label: 'Streak', icon: Flame },
              { id: 'solved', label: 'Solved', icon: Target },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id as typeof category)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${category === cat.id
                    ? 'bg-gradient-to-r from-[#a088ff] to-[#63e3ff] text-[#141414]'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Top 3 Podium */}
        {leaderboardData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex items-end justify-center gap-4 mb-12"
          >
            {/* 2nd Place */}
            {leaderboardData[1] && (
              <button
                onClick={() => onProfileClick?.(leaderboardData[1].pid)}
                className="flex flex-col items-center hover:scale-105 transition-transform"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#c0c0c0]/30 to-[#c0c0c0]/10 flex items-center justify-center mb-3 border-2 border-[#c0c0c0]/50 overflow-hidden">
                  {leaderboardData[1].avatar?.startsWith('http') ? (
                    <img src={leaderboardData[1].avatar} alt={leaderboardData[1].name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-[#c0c0c0]">{leaderboardData[1].avatar}</span>
                  )}
                </div>
                <p className="text-white font-medium text-sm mb-1">{leaderboardData[1].name}</p>
                <p className="text-[#c0c0c0] text-xs">{leaderboardData[1].xp.toLocaleString()} XP</p>
                <div className="w-24 h-24 mt-3 rounded-t-xl bg-gradient-to-t from-[#c0c0c0]/20 to-transparent flex items-end justify-center pb-2">
                  <Medal className="w-8 h-8 text-[#c0c0c0]" />
                </div>
              </button>
            )}

            {/* 1st Place */}
            {leaderboardData[0] && (
              <button
                onClick={() => onProfileClick?.(leaderboardData[0].pid)}
                className="flex flex-col items-center -mt-8 hover:scale-105 transition-transform"
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#ffd700]/30 to-[#ffd700]/10 flex items-center justify-center mb-3 border-2 border-[#ffd700]/50 animate-pulse-glow overflow-hidden">
                  {leaderboardData[0].avatar?.startsWith('http') ? (
                    <img src={leaderboardData[0].avatar} alt={leaderboardData[0].name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-[#ffd700]">{leaderboardData[0].avatar}</span>
                  )}
                </div>
                <p className="text-white font-medium mb-1">{leaderboardData[0].name}</p>
                <p className="text-[#ffd700] text-sm">{leaderboardData[0].xp.toLocaleString()} XP</p>
                <div className="w-28 h-32 mt-3 rounded-t-xl bg-gradient-to-t from-[#ffd700]/20 to-transparent flex items-end justify-center pb-2">
                  <Crown className="w-10 h-10 text-[#ffd700]" />
                </div>
              </button>
            )}

            {/* 3rd Place */}
            {leaderboardData[2] && (
              <button
                onClick={() => onProfileClick?.(leaderboardData[2].pid)}
                className="flex flex-col items-center hover:scale-105 transition-transform"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#cd7f32]/30 to-[#cd7f32]/10 flex items-center justify-center mb-3 border-2 border-[#cd7f32]/50 overflow-hidden">
                  {leaderboardData[2].avatar?.startsWith('http') ? (
                    <img src={leaderboardData[2].avatar} alt={leaderboardData[2].name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-[#cd7f32]">{leaderboardData[2].avatar}</span>
                  )}
                </div>
                <p className="text-white font-medium text-sm mb-1">{leaderboardData[2].name}</p>
                <p className="text-[#cd7f32] text-xs">{leaderboardData[2].xp.toLocaleString()} XP</p>
                <div className="w-24 h-16 mt-3 rounded-t-xl bg-gradient-to-t from-[#cd7f32]/20 to-transparent flex items-end justify-center pb-2">
                  <Medal className="w-8 h-8 text-[#cd7f32]" />
                </div>
              </button>
            )}
          </motion.div>
        )}

        {/* Leaderboard List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="space-y-2"
        >
          {leaderboardData.slice(3).map((user, index) => (
            <motion.button
              key={user.pid}
              onClick={() => onProfileClick?.(user.pid)}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.4 + index * 0.05 }}
              className="glass rounded-xl p-4 flex items-center gap-4 hover:bg-white/5 transition-colors w-full text-left"
            >
              {/* Rank */}
              <div className="w-8 flex justify-center">
                {getRankIcon(user.rank)}
              </div>

              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#a088ff]/20 to-[#63e3ff]/20 flex items-center justify-center overflow-hidden">
                {user.avatar?.startsWith('http') ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-medium text-white">{user.avatar}</span>
                )}
              </div>

              {/* Name */}
              <div className="flex-1">
                <p className="text-white font-medium">{user.name}</p>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-[#a088ff]" />
                  <span className="text-white/80">{user.xp.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Flame className="w-4 h-4 text-[#ff8a63]" />
                  <span className="text-white/80">{user.streak}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Target className="w-4 h-4 text-[#63e3ff]" />
                  <span className="text-white/80">{user.solved}</span>
                </div>
              </div>
            </motion.button>
          ))}
        </motion.div>

        {/* Current User Rank */}
        {profile && myRank !== null && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-6 glass rounded-xl p-4 gradient-border"
          >
            <div className="flex items-center gap-4">
              <div className="w-8 flex justify-center">
                {getRankIcon(myRank)}
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#a088ff] to-[#63e3ff] flex items-center justify-center overflow-hidden">
                {profile.avatar?.startsWith('http') ? (
                  <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-medium text-[#141414]">
                    {profile.name?.charAt(0).toUpperCase() || 'Y'}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">You</p>
                <p className="text-white/40 text-sm">Keep pushing to climb!</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-[#a088ff]" />
                  <span className="text-white/80">{profile.xp_points || 0}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Flame className="w-4 h-4 text-[#ff8a63]" />
                  <span className="text-white/80">{profile.streak_days || 0}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Target className="w-4 h-4 text-[#63e3ff]" />
                  <span className="text-white/80">{profile.solvedProblems?.length || 0}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Motivation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-8 text-center"
        >
          <p className="text-white/40 text-sm">
            Solve more problems to climb the leaderboard and earn exclusive badges!
          </p>
        </motion.div>
      </div>
    </section>
  );
}