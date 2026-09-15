import { useState, useEffect } from 'react';
import { Zap, Flame, Target } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useStats } from '@/hooks/useStats';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

interface LeaderboardProps {
  onProfileClick?: (userId: string) => void;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  avatar?: string;
  xp: number;
  streak: number;
  solved: number;
  rank: number;
}

type Category = 'xp' | 'streak' | 'solved';

const CATEGORY_LABEL: Record<Category, string> = {
  xp: 'XP',
  streak: 'day streak',
  solved: 'problems solved',
};

/**
 * Dev-only fixtures. Lets the surface be reviewed without the backend running.
 * Stripped from production builds by the import.meta.env.DEV guard.
 */
const FIXTURES: LeaderboardEntry[] | null = [
  { id: 'u1', name: 'Ananya Raghavan', avatar: 'A', xp: 48210, streak: 148, solved: 312, rank: 1 },
  { id: 'u2', name: 'Marcus Oyelaran', avatar: 'M', xp: 44875, streak: 96, solved: 288, rank: 2 },
  { id: 'u3', name: 'Yuki Tanabe', avatar: 'Y', xp: 41302, streak: 211, solved: 264, rank: 3 },
  { id: 'u4', name: 'Devansh Kulkarni', avatar: 'D', xp: 38940, streak: 63, solved: 251, rank: 4 },
  { id: 'u5', name: 'Sofia Lindqvist', avatar: 'S', xp: 35620, streak: 84, solved: 238, rank: 5 },
  { id: 'u6', name: 'Tobi Adeyemi', avatar: 'T', xp: 33108, streak: 41, solved: 220, rank: 6 },
  { id: 'u7', name: 'Priya Nair', avatar: 'P', xp: 29774, streak: 119, solved: 203, rank: 7 },
  { id: 'u8', name: 'Lukas Brenner', avatar: 'L', xp: 26553, streak: 27, solved: 181, rank: 8 },
  { id: 'u9', name: 'Chen Wei', avatar: 'C', xp: 24119, streak: 72, solved: 162, rank: 9 },
  { id: 'u10', name: 'Amara Diallo', avatar: 'A', xp: 21840, streak: 55, solved: 150, rank: 10 },
  { id: 'u11', name: 'Ravi Menon', avatar: 'R', xp: 19422, streak: 38, solved: 133, rank: 11 },
  { id: 'u12', name: 'Elena Petrova', avatar: 'E', xp: 17005, streak: 91, solved: 118, rank: 12 },
];

const SHOW_FIXTURES = Boolean(import.meta.env.DEV || import.meta.env.VITE_SHOW_FIXTURES);

/**
 * Leaderboard — Pattern Studio.
 *
 * What was here: a plain results table (rank / name / XP / streak / solved) with
 * a filter row on top. Correct, and completely forgettable.
 *
 * Two things were also wrong, not just plain:
 *
 * 1. **The time-range filter did nothing.** `timeRange` was set by the buttons
 *    but never sent — the fetch only ever used `category`, and the backend
 *    accepts only `limit` and `sortBy`. Three controls that changed a word and
 *    no data. Removed rather than left in as decoration.
 * 2. **"Your position" was hardcoded to "Unranked".** It never looked for the
 *    current user, so it said the same thing whether you were 4th or absent.
 *    It also only fetched 10 of 32 users, so it usually *could not* have found
 *    you. The board now fetches the full list and locates you in it.
 *
 * The design move: **show the shape of each person's progress, not just their
 * number.** Every row carries a bar of solved-of-total, so the table can be read
 * by silhouette before any figure is read. And every row states the gap to the
 * rank directly above it — the one thing a leaderboard can tell you that is
 * actually actionable, and the thing almost none of them do.
 *
 * The top three sit on the ember band, the product's one drenched surface. They
 * are the point of the page; the table is the field they lead.
 */

/* Ranks fetched in one request. The catalogue's user base is far smaller than
 * this, so the board is complete and the current user is always locatable.
 * Revisit if the user count ever approaches it. */
const FETCH_LIMIT = 100;

export function Leaderboard({ onProfileClick }: LeaderboardProps) {
  const { profile } = useAuth();
  const { rawProblemCount } = useStats();
  const [category, setCategory] = useState<Category>('xp');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchLeaderboard = async () => {
      setLoading(true);
      setErrored(false);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/users/leaderboard?sortBy=${category}&limit=${FETCH_LIMIT}`
        );
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setLeaderboardData(data);
        } else if (!cancelled) {
          if (SHOW_FIXTURES && FIXTURES) setLeaderboardData(FIXTURES);
          else setErrored(true);
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard', error);
        if (!cancelled) {
          if (SHOW_FIXTURES && FIXTURES) setLeaderboardData(FIXTURES);
          else setErrored(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchLeaderboard();
    return () => {
      cancelled = true;
    };
  }, [category]);

  const metricOf = (u: LeaderboardEntry) =>
    category === 'solved' ? u.solved : category === 'streak' ? u.streak : u.xp;

  /* The gap to the rank above, in the metric currently being sorted on — so it
   * always answers "what would it take to move up one place?". */
  const gapTo = (index: number): number | null =>
    index > 0 ? metricOf(leaderboardData[index - 1]) - metricOf(leaderboardData[index]) : null;

  const top3 = leaderboardData.slice(0, 3);
  const rest = leaderboardData.slice(3);
  const myIndex = profile ? leaderboardData.findIndex((u) => u.id === profile.id) : -1;
  const me = myIndex >= 0 ? leaderboardData[myIndex] : null;

  const total = rawProblemCount;

  return (
    <section className="relative min-h-screen pt-24 pb-16">
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-7">
          <h1 className="font-display text-[1.875rem] sm:text-[2.25rem] text-[#f1eeea] tracking-[-0.02em] mb-2">
            Rankings
          </h1>
          <p className="text-[0.9375rem] text-[#b6b1ad]">
            {leaderboardData.length > 0
              ? `${leaderboardData.length} engineers, ordered by ${CATEGORY_LABEL[category]}.`
              : 'Ranked by what you have actually finished.'}
          </p>
        </div>

        {/* Sort — the only control, because it is the only one the data supports. */}
        <div className="flex gap-1 pb-5 mb-6 border-b border-[rgba(241,238,234,0.2)]">
          {(
            [
              { id: 'xp', label: 'XP', Icon: Zap },
              { id: 'streak', label: 'Streak', Icon: Flame },
              { id: 'solved', label: 'Solved', Icon: Target },
            ] as const
          ).map(({ id, label, Icon }) => {
            const active = category === id;
            return (
              <button
                key={id}
                onClick={() => setCategory(id)}
                aria-pressed={active}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[0.8125rem] font-medium transition-colors duration-[var(--af-dur-fast)] ${
                  active
                    ? 'bg-[#f0997d] text-[#19191b]'
                    : 'text-[#b6b1ad] hover:text-[#f1eeea] bg-[#222225]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <LeaderboardSkeleton />
        ) : errored ? (
          <div className="py-16 text-center">
            <p className="text-[0.9375rem] text-[#b6b1ad]">Could not load the leaderboard.</p>
          </div>
        ) : leaderboardData.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[0.9375rem] text-[#b6b1ad]">No rankings yet. Be the first on the board.</p>
          </div>
        ) : (
          <>
            {/* ── The leaders, on the one drenched surface ── */}
            {top3.length > 0 && (
              <div className="ember-band rounded-[10px] px-5 sm:px-7 py-6 mb-8">
                <p
                  className="text-[0.75rem] font-mono mb-5"
                  style={{ color: 'var(--af-ember-ink)', opacity: 0.8 }}
                >
                  leading the board
                </p>
                <div className="grid sm:grid-cols-3 gap-y-6">
                  {top3.map((user, i) => (
                    <button
                      key={user.id}
                      onClick={() => onProfileClick?.(user.id)}
                      className={`text-left group ${i > 0 ? 'sm:border-l sm:pl-6' : ''}`}
                      style={i > 0 ? { borderColor: 'var(--af-ember-rule)' } : undefined}
                    >
                      <div className="flex items-baseline gap-3 mb-2">
                        <span
                          className="font-display text-[2rem] leading-none tnum"
                          style={{ color: 'var(--af-ember-ink)' }}
                        >
                          {user.rank}
                        </span>
                        <span
                          className="text-[0.75rem] font-mono opacity-75 group-hover:opacity-100 transition-opacity"
                          style={{ color: 'var(--af-ember-ink)' }}
                        >
                          {metricOf(user).toLocaleString()} {CATEGORY_LABEL[category]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 mb-3">
                        <Avatar name={user.name} url={user.avatar} tone="ember" />
                        <span
                          className="text-[0.9375rem] font-medium truncate"
                          style={{ color: 'var(--af-ember-ink)' }}
                        >
                          {user.name}
                        </span>
                      </div>
                      <ProgressBar solved={user.solved} total={total} tone="ember" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── The field ── */}
            {rest.length > 0 && (
              <>
                <div className="hidden sm:grid grid-cols-[2.5rem_minmax(0,1fr)_8rem_5.5rem_9.5rem] gap-4 px-2 pb-2 border-b border-[rgba(241,238,234,0.2)]">
                  <span className="text-[0.75rem] text-[#8f8a85]">Rank</span>
                  <span className="text-[0.75rem] text-[#8f8a85]">Engineer</span>
                  <span className="text-[0.75rem] text-[#8f8a85]">Curriculum</span>
                  <span className="text-[0.75rem] text-[#8f8a85] text-right">{CATEGORY_LABEL[category]}</span>
                  <span className="text-[0.75rem] text-[#8f8a85] text-right">To climb</span>
                </div>

                <div className="ruled">
                  {rest.map((user, i) => {
                    const index = i + 3;
                    const gap = gapTo(index);
                    const isMe = myIndex === index;
                    return (
                      <RankRow
                        key={user.id}
                        user={user}
                        total={total}
                        category={category}
                        metric={metricOf(user)}
                        gap={gap}
                        isMe={isMe}
                        onClick={() => onProfileClick?.(user.id)}
                      />
                    );
                  })}
                </div>
              </>
            )}

            {/* ── Your position, located for real ── */}
            {profile && (
              <div className="mt-8">
                <p className="text-[0.75rem] text-[#8f8a85] mb-2 px-2">Your position</p>
                {me ? (
                  <div className="state-row" data-state="active">
                    <div className="flex items-center gap-4 py-3 pl-3 pr-2">
                      <span className="w-8 text-[0.875rem] text-[#f0997d] tnum font-medium">
                        {me.rank}
                      </span>
                      <Avatar name={profile.name} url={profile.avatar} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.875rem] font-medium text-[#f1eeea] truncate">
                          {profile.name || 'You'}
                        </p>
                        <p className="text-[0.75rem] text-[#8f8a85]">
                          {me.rank === 1
                            ? 'Top of the board.'
                            : gapTo(myIndex) === 0
                              ? `Level with rank ${me.rank - 1} — one more solve takes the place.`
                              : `${gapTo(myIndex)?.toLocaleString()} ${CATEGORY_LABEL[category]} to reach rank ${me.rank - 1}.`}
                        </p>
                      </div>
                      <div className="hidden sm:block w-[8rem]">
                        <ProgressBar solved={me.solved} total={total} />
                      </div>
                      <span className="hidden sm:block text-[0.875rem] text-[#f1eeea] tnum w-[5.5rem] text-right">
                        {metricOf(me).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[6px] border border-[rgba(241,238,234,0.1)] bg-[#222225] px-4 py-4">
                    <p className="text-[0.875rem] text-[#f1eeea] mb-1">
                      You are not on the board yet.
                    </p>
                    <p className="text-[0.75rem] text-[#8f8a85]">
                      Solving one problem puts you on it — the board lists every
                      engineer, not just the top ten.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function RankRow({
  user,
  total,
  category,
  metric,
  gap,
  isMe,
  onClick,
}: {
  user: LeaderboardEntry;
  total: number;
  category: Category;
  metric: number;
  gap: number | null;
  isMe: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={isMe ? 'true' : undefined}
      className={`w-full grid grid-cols-[2rem_minmax(0,1fr)_auto] sm:grid-cols-[2.5rem_minmax(0,1fr)_8rem_5.5rem_9.5rem] gap-4 items-center px-2 py-3 text-left row-interactive ${
        isMe ? 'bg-[#2c2b30]' : ''
      }`}
    >
      <span className="text-[0.875rem] text-[#b6b1ad] tnum">{user.rank}</span>

      <span className="flex items-center gap-3 min-w-0">
        <Avatar name={user.name} url={user.avatar} />
        <span className="text-[0.875rem] text-[#f1eeea] font-medium truncate">
          {user.name}
          {isMe && <span className="ml-2 text-[0.75rem] text-[#f0997d] font-normal">you</span>}
        </span>
      </span>

      {/* Mobile: the active metric only */}
      <span className="sm:hidden text-[0.875rem] text-[#f1eeea] tnum">
        {metric.toLocaleString()}
      </span>

      {/* The shape of their progress — readable before any number is read. */}
      <span className="hidden sm:block">
        <ProgressBar solved={user.solved} total={total} />
      </span>

      <span className="hidden sm:block text-right text-[0.875rem] text-[#f1eeea] tnum">
        {metric.toLocaleString()}
      </span>

      {/* The actionable bit: exactly what separates them from the rank above.
          A zero gap means the two are level, which reads as a broken value if
          printed as "+0" — so it says "tied" instead. */}
      <span className="hidden sm:block text-right text-[0.75rem] text-[#8f8a85] tnum">
        {gap === null ? (
          <span className="text-[#f0997d]">leading</span>
        ) : gap === 0 ? (
          <span className="text-[#b6b1ad]">tied</span>
        ) : (
          <>
            +{gap.toLocaleString()}
            <span className="text-[#6f6a65]"> {CATEGORY_LABEL[category]}</span>
          </>
        )}
      </span>
    </button>
  );
}

/**
 * Solved-of-total. A minimum visible width keeps a very low count from rendering
 * as an empty track, which would read as zero rather than as "barely started".
 */
function ProgressBar({
  solved,
  total,
  tone = 'ground',
}: {
  solved: number;
  total: number;
  tone?: 'ground' | 'ember';
}) {
  const pct = total > 0 ? Math.min((solved / total) * 100, 100) : 0;
  const ember = tone === 'ember';

  return (
    <span
      className="flex items-center gap-2.5"
      title={`${solved} of ${total} problems solved`}
    >
      <span
        className="h-[5px] flex-1 rounded-[1px] overflow-hidden min-w-[3rem]"
        style={{ background: ember ? 'var(--af-ember-rule)' : 'rgba(241,238,234,0.1)' }}
      >
        <span
          className="block h-full rounded-[1px]"
          style={{
            width: `${pct}%`,
            minWidth: solved > 0 ? '3px' : 0,
            background: ember ? 'var(--af-ember-ink)' : 'var(--af-amber)',
          }}
        />
      </span>
      <span
        className="text-[0.6875rem] tnum shrink-0"
        style={{ color: ember ? 'var(--af-ember-ink)' : 'var(--af-ink-faint)', opacity: ember ? 0.85 : 1 }}
      >
        {solved}
        <span className="opacity-60">/{total}</span>
      </span>
    </span>
  );
}

function Avatar({
  name,
  url,
  tone = 'ground',
}: {
  name?: string;
  url?: string;
  tone?: 'ground' | 'ember';
}) {
  // Square, not circular — squares read as engineering documentation.
  const [failed, setFailed] = useState(false);
  const isUrl = typeof url === 'string' && /^https?:\/\//i.test(url);

  if (isUrl && !failed) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="w-7 h-7 rounded-[4px] object-cover flex-shrink-0"
      />
    );
  }

  const stored = typeof url === 'string' && !isUrl ? url.trim() : '';
  const initial = (stored || name?.charAt(0) || '?').slice(0, 2).toUpperCase();

  return (
    <span
      className="w-7 h-7 rounded-[4px] flex items-center justify-center flex-shrink-0 tnum text-[0.6875rem] font-medium"
      style={
        tone === 'ember'
          ? { background: 'rgba(253,238,230,0.16)', color: 'var(--af-ember-ink)' }
          : { background: 'var(--af-surface-hi)', color: 'var(--af-ink-soft)' }
      }
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}

function LeaderboardSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading leaderboard</span>
      <div className="ember-band rounded-[10px] px-5 sm:px-7 py-6 mb-8">
        <div className="grid sm:grid-cols-3 gap-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={i > 0 ? 'sm:border-l sm:pl-6' : ''} style={i > 0 ? { borderColor: 'var(--af-ember-rule)' } : undefined}>
              <div className="h-8 w-12 rounded-[3px] mb-3" style={{ background: 'rgba(253,238,230,0.2)' }} />
              <div className="h-4 w-32 rounded-[3px] mb-3" style={{ background: 'rgba(253,238,230,0.2)' }} />
              <div className="h-[5px] w-full rounded-[1px]" style={{ background: 'rgba(253,238,230,0.2)' }} />
            </div>
          ))}
        </div>
      </div>
      <div className="ruled">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[2rem_minmax(0,1fr)_auto] sm:grid-cols-[2.5rem_minmax(0,1fr)_8rem_5.5rem_9.5rem] gap-4 items-center px-2 py-3.5"
          >
            <div className="skeleton h-3 w-4 rounded-[2px]" />
            <div className="flex items-center gap-3">
              <div className="skeleton w-7 h-7 rounded-[4px]" />
              <div className="skeleton h-3 rounded-[2px]" style={{ width: `${35 + (i % 4) * 12}%` }} />
            </div>
            <div className="skeleton h-3 w-12 rounded-[2px] justify-self-end" />
            <div className="skeleton h-3 w-8 rounded-[2px] justify-self-end hidden sm:block" />
            <div className="skeleton h-3 w-8 rounded-[2px] justify-self-end hidden sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
