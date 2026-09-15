import { useState, useEffect } from 'react';
import { Zap, Flame, Target, Edit2, Check, X, ArrowLeft, User, Award, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useStats } from '@/hooks/useStats';
import { BADGES } from '@/utils/badges';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

interface ProfileData {
  id: string;
  name: string;
  avatar: string | null;
  bio: string;
  xp: number;
  streak: number;
  solved: number;
  /** Rank by XP, the leaderboard's default ordering. */
  rank: number;
  level: number;
  memberSince: string;
}

interface ProfileViewProps {
  userId: string;
  onBack: () => void;
}

export function ProfileView({ userId, onBack }: ProfileViewProps) {
  const { user } = useAuth();
  const { rawProblemCount } = useStats();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

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

  /* A new URL deserves a fresh attempt: clear the failure flag whenever the
   * source changes, or one dead URL would suppress every later one.
   * Depends on the raw inputs rather than the derived `avatarSrc`, which is
   * computed below the early returns. */
  useEffect(() => {
    setAvatarFailed(false);
  }, [profile?.avatar, editAvatarUrl, isEditing]);

  if (loading) {
    return (
      <section className="relative min-h-screen pt-24 pb-12 flex items-center justify-center">
        <div className="text-[#b6b1ad]">Loading profile…</div>
      </section>
    );
  }

  if (notFound || !profile) {
    return (
      <section className="relative min-h-screen pt-24 pb-12 flex flex-col items-center justify-center gap-4">
        <User className="w-8 h-8 text-[#3a393e]" />
        <h2 className="text-[#f1eeea] text-[1.5rem] font-medium tracking-[-0.015em]">Profile not found</h2>
        <p className="text-[#b6b1ad] text-[0.875rem]">This user does not exist or has been removed.</p>
        <button
          onClick={onBack}
          className="btn-secondary mt-4 text-[0.8125rem]"
        >
          <ArrowLeft className="w-4 h-4" />
          Go back
        </button>
      </section>
    );
  }

  const initials = profile.name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
  const memberYear = new Date(profile.memberSince).getFullYear();

  /* Only a real http(s) URL can be an <img> source. Accounts store `avatar` two
   * ways — pre-computed initials for password signups, a Google CDN URL for
   * OAuth — so anything that is not a URL falls through to the initials. While
   * editing, the URL being typed is previewed. */
  const isHttp = (u?: string | null) => typeof u === 'string' && /^https?:\/\//i.test(u);
  const avatarSrc =
    isEditing && isHttp(editAvatarUrl)
      ? editAvatarUrl
      : isHttp(profile.avatar)
        ? profile.avatar
        : null;

  return (
    <section className="relative min-h-screen pt-24 pb-12">
      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <button
          onClick={onBack}
          className="btn-quiet mb-8 text-[0.875rem] -ml-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Profile — flat surface, hairline, no shadow */}
        <div className="bg-[#222225] border border-[rgba(241,238,234,0.1)] rounded-[6px] p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar — square, not circular.
                A failed image URL must fall back to initials. Without the
                onError guard a dead avatar (an expired Google URL, or one
                blocked by img-src) renders as a broken-image box with the alt
                text spilling out of the frame — which is what it did. */}
            <div className="w-24 h-24 rounded-[4px] bg-[#2c2b30] border border-[rgba(241,238,234,0.1)] flex items-center justify-center overflow-hidden flex-shrink-0">
              {avatarSrc && !avatarFailed ? (
                <img
                  src={avatarSrc}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <span className="text-[1.5rem] font-medium text-[#b6b1ad]">{initials}</span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-[#f1eeea] text-[1.5rem] font-medium tracking-[-0.015em] mb-1">{profile.name}</h1>
              <p className="text-[#8f8a85] text-[0.8125rem] mb-3">
                Level <span className="tnum">{profile.level}</span> · Member since{' '}
                <span className="tnum">{memberYear}</span>
              </p>

              {/* Bio */}
              {isEditing ? (
                <div className="space-y-3">
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Write something about yourself…"
                    maxLength={200}
                    rows={3}
                    className="w-full bg-[#19191b] border border-[rgba(241,238,234,0.1)] rounded-[6px] px-4 py-2 text-[#f1eeea] text-[0.8125rem] resize-none focus:outline-none focus-visible:border-[#f0997d]"
                  />
                  <input
                    value={editAvatarUrl}
                    onChange={(e) => setEditAvatarUrl(e.target.value)}
                    placeholder="Avatar image URL (optional)"
                    aria-label="Avatar image URL"
                    className="w-full bg-[#19191b] border border-[rgba(241,238,234,0.1)] rounded-[6px] px-4 py-2 text-[#f1eeea] text-[0.8125rem] focus:outline-none focus-visible:border-[#f0997d]"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="btn-primary text-[0.8125rem]"
                    >
                      <Check className="w-4 h-4" />
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="btn-secondary text-[0.8125rem]"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <p className="text-[#b6b1ad] text-[0.875rem] leading-relaxed flex-1">
                    {profile.bio || (isOwner ? 'No bio yet. Click Edit to add one.' : 'No bio added.')}
                  </p>
                  {isOwner && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="btn-quiet flex-shrink-0 text-[0.75rem]"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit profile
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats — figures on hairlines, no cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-b border-[rgba(241,238,234,0.2)] mb-6">
          {[
            { icon: Zap, label: 'XP points', value: profile.xp.toLocaleString() },
            { icon: Target, label: 'Problems solved', value: profile.solved.toLocaleString() },
            { icon: Flame, label: 'Day streak', value: profile.streak },
            { icon: Award, label: 'Rank by XP', value: `#${profile.rank}` },
          ].map((stat) => (
            <div key={stat.label} className="px-4 py-3.5 border-r border-[rgba(241,238,234,0.1)] last:border-r-0">
              <div className="flex items-center gap-1.5 mb-1.5">
                <stat.icon className="w-3.5 h-3.5 text-[#8f8a85]" />
                <span className="text-[0.75rem] text-[#8f8a85]">{stat.label}</span>
              </div>
              <p className="text-[1.5rem] font-medium text-[#f1eeea] tnum leading-none">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Position in the curriculum. "50 solved" says little on its own; the
            bar says how much of the catalogue that actually is. */}
        {rawProblemCount > 0 && (
          <div className="mb-6">
            <div className="flex items-baseline justify-between gap-4 mb-2">
              <span className="text-[0.75rem] text-[#8f8a85]">Curriculum progress</span>
              <span className="text-[0.75rem] text-[#b6b1ad] tnum">
                <span className="text-[#f1eeea]">{profile.solved.toLocaleString()}</span>
                <span className="text-[#6f6a65]">/{rawProblemCount}</span>
              </span>
            </div>
            <div className="h-[6px] rounded-[1px] overflow-hidden bg-[rgba(241,238,234,0.1)]">
              <div
                className="h-full rounded-[1px]"
                style={{
                  width: `${Math.min((profile.solved / rawProblemCount) * 100, 100)}%`,
                  background: 'var(--af-amber)',
                }}
              />
            </div>
            <p className="text-[0.6875rem] text-[#8f8a85] mt-2 tnum">
              {Math.round((profile.solved / rawProblemCount) * 100)}% of every problem on the site
            </p>
          </div>
        )}

        {/* Badges — from the one shared definition, so the dashboard and the
            profile can never disagree about what a badge is or how it is earned. */}
        <div className="bg-[#222225] border border-[rgba(241,238,234,0.1)] rounded-[6px] p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[rgba(241,238,234,0.1)]">
            <h2 className="text-[#f1eeea] text-[1.125rem] font-medium">Badges</h2>
            <span className="text-[0.75rem] text-[#8f8a85] tnum">
              {BADGES.filter((b) => b.earned(profile)).length}/{BADGES.length} earned
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {BADGES.map((badge) => {
              const earned = badge.earned(profile);
              return (
                <div
                  key={badge.id}
                  className={`p-3 rounded-[4px] border border-[rgba(241,238,234,0.1)] ${
                    earned ? 'bg-[#2c2b30]' : ''
                  }`}
                  title={earned ? `Earned: ${badge.name}` : `Locked — ${badge.requires}`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <badge.Icon
                      className={`w-4 h-4 ${earned ? 'text-[#f0997d]' : 'text-[#6f6a65]'}`}
                      aria-hidden="true"
                    />
                    {!earned && <Lock className="w-3 h-3 text-[#6f6a65]" aria-hidden="true" />}
                  </div>
                  <p className={`text-[0.8125rem] font-medium ${earned ? 'text-[#f1eeea]' : 'text-[#8f8a85]'}`}>
                    {badge.name}
                  </p>
                  {/* A locked badge says what it needs rather than just sitting dim. */}
                  <p className="text-[0.6875rem] text-[#6f6a65] mt-0.5">
                    {earned ? 'Earned' : badge.requires}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
