import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, Flame, Target, Edit2, Check, X, ArrowLeft, User, Award, EyeOff, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

interface ProfileData {
  id: string;
  name: string;
  avatar: string | null;
  bio: string;
  xp: number;
  streak: number;
  solved: number;
  level: number;
  memberSince: string;
  isPublic?: boolean;
}

interface ProfileViewProps {
  userId: string;
  onBack: () => void;
}

export function ProfileView({ userId, onBack }: ProfileViewProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [isPublic, setIsPublic] = useState(true);

  const isOwner = user?.id === userId;

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const res = await fetch(`${API_BASE_URL}/api/users/${userId}/profile`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          setEditBio(data.bio || '');
          setEditAvatarUrl(data.avatar || '');
          setIsPublic(data.isPublic !== false);
        }
      } catch (error) {
        console.error('Failed to fetch profile', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/users/${userId}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bio: editBio, avatarUrl: editAvatarUrl }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Failed to save profile', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditBio(profile?.bio || '');
    setEditAvatarUrl(profile?.avatar || '');
    setIsEditing(false);
  };

  const handleTogglePrivacy = async () => {
    if (!profile) return;
    const newValue = !isPublic;
    setIsPublic(newValue);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE_URL}/api/users/${userId}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isPublic: newValue }),
      });
    } catch {
      // Revert on error
      setIsPublic(!newValue);
    }
  };

  if (loading) {
    return (
      <section className="relative min-h-screen pt-24 pb-12 flex items-center justify-center">
        <div className="text-white">Loading profile...</div>
      </section>
    );
  }

  if (notFound || !profile) {
    return (
      <section className="relative min-h-screen pt-24 pb-12 flex flex-col items-center justify-center gap-4">
        <User className="w-16 h-16 text-white/20" />
        <h2 className="text-white text-2xl font-bold">Profile not found</h2>
        <p className="text-white/40">This user does not exist or has been removed.</p>
        <button
          onClick={onBack}
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
      </section>
    );
  }

  const avatarDisplay = profile.avatar;
  const initials = profile.name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
  const memberYear = new Date(profile.memberSince).getFullYear();

  return (
    <section className="relative min-h-screen pt-24 pb-12 overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-20" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#a088ff]/10 rounded-full blur-[200px]" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onBack}
          className="flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </motion.button>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass rounded-2xl p-8 mb-6"
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#a088ff] to-[#63e3ff] flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-white/10">
              {isEditing && editAvatarUrl ? (
                <img src={editAvatarUrl} alt={profile.name} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
              ) : avatarDisplay?.startsWith('http') ? (
                <img src={avatarDisplay} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-[#141414]">{initials}</span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-white text-2xl font-bold mb-1">{profile.name}</h1>
              <p className="text-white/40 text-sm mb-3">Member since {memberYear}</p>

              {/* Bio */}
              {isEditing ? (
                <div className="space-y-3">
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Write something about yourself..."
                    maxLength={200}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm resize-none focus:outline-none focus:border-[#a088ff]/50"
                  />
                  <input
                    value={editAvatarUrl}
                    onChange={(e) => setEditAvatarUrl(e.target.value)}
                    placeholder="Avatar image URL (optional)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-[#a088ff]/50"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#a088ff] to-[#63e3ff] text-[#141414] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <p className="text-white/60 text-sm flex-1">
                    {profile.bio || (isOwner ? 'No bio yet. Click Edit to add one!' : 'No bio added.')}
                  </p>
                  {isOwner && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white/10 text-white/60 text-xs hover:bg-white/20 hover:text-white transition-all flex-shrink-0"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit Profile
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Privacy Toggle (owner only) */}
        {isOwner && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <button
              onClick={handleTogglePrivacy}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isPublic ? (
                  <Eye className="w-4 h-4 text-emerald-400" />
                ) : (
                  <EyeOff className="w-4 h-4 text-white/40" />
                )}
                <div className="text-left">
                  <p className="text-white text-sm font-medium">Leaderboard Visibility</p>
                  <p className="text-white/40 text-xs">
                    {isPublic ? 'Your profile is visible on the public leaderboard' : 'Your profile is hidden from the public leaderboard'}
                  </p>
                </div>
              </div>
              <div
                className={`relative w-10 h-6 rounded-full transition-colors ${isPublic ? 'bg-emerald-500/30' : 'bg-white/10'}`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full transition-all ${isPublic ? 'left-5 bg-emerald-400' : 'left-1 bg-white/40'}`}
                />
              </div>
            </button>
          </motion.div>
        )}

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-3 gap-4 mb-6"
        >
          {[
            { icon: Zap, label: 'XP Points', value: profile.xp.toLocaleString(), color: '#a088ff' },
            { icon: Flame, label: 'Day Streak', value: profile.streak, color: '#ff8a63' },
            { icon: Target, label: 'Problems Solved', value: profile.solved, color: '#63e3ff' },
            { icon: Award, label: 'Level', value: profile.level, color: '#f59e0b' },
          ].map((stat) => (
            <div key={stat.label} className="glass rounded-xl p-4 text-center">
              <stat.icon className="w-6 h-6 mx-auto mb-2" style={{ color: stat.color }} />
              <p className="text-white text-xl font-bold">{stat.value}</p>
              <p className="text-white/40 text-xs mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Badges placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="glass rounded-2xl p-6"
        >
          <h2 className="text-white font-semibold mb-4">Badges</h2>
          <div className="flex flex-wrap gap-3">
            {profile.solved >= 1 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#a088ff]/10 border border-[#a088ff]/20">
                <span className="text-lg">🎯</span>
                <span className="text-white/80 text-sm">First Solve</span>
              </div>
            )}
            {profile.solved >= 10 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#63e3ff]/10 border border-[#63e3ff]/20">
                <span className="text-lg">⚡</span>
                <span className="text-white/80 text-sm">Problem Solver</span>
              </div>
            )}
            {profile.streak >= 7 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#ff8a63]/10 border border-[#ff8a63]/20">
                <span className="text-lg">🔥</span>
                <span className="text-white/80 text-sm">Week Streak</span>
              </div>
            )}
            {profile.xp >= 100 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#ffd700]/10 border border-[#ffd700]/20">
                <span className="text-lg">✨</span>
                <span className="text-white/80 text-sm">XP Earner</span>
              </div>
            )}
            {profile.solved === 0 && profile.streak === 0 && profile.xp < 100 && (
              <p className="text-white/40 text-sm">No badges yet. Start solving problems!</p>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}