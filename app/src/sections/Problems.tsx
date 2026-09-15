import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Search,
  Play,
  Bookmark,
  FileText,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  Code2
} from 'lucide-react';
import { getAllProblems, getAllTopics } from '@/api/content';
import { updateProblemStatus, toggleBookmark as apiToggleBookmark, getUserProgress, updateNotes } from '@/api/userActions';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { SOLVE_XP } from '@/utils/xpConfig';

/**
 * Dev-only fixtures so the surface can be reviewed without the backend.
 * Stripped from production builds by the import.meta.env.DEV guard.
 * Remove once the API is available in every environment.
 */
const TOPIC_FIXTURES = [
  { id: 't1', title: 'Arrays & Hashing', color: '#f0997d' },
  { id: 't2', title: 'Two Pointers', color: '#b1cbbb' },
  { id: 't3', title: 'Trees', color: '#f0997d' },
  { id: 't4', title: 'Graphs', color: '#d98a76' },
  { id: 't5', title: 'Dynamic Programming', color: '#f0997d' },
];

const PROBLEM_FIXTURES = [
  { _id: 'p1', id: 'p1', title: 'Two Sum', difficulty: 'Easy', topic_id: 't1', tags: ['array', 'hash-table'] },
  { _id: 'p2', id: 'p2', title: 'Valid Anagram', difficulty: 'Easy', topic_id: 't1', tags: ['string', 'hash-table', 'sorting'] },
  { _id: 'p3', id: 'p3', title: 'Group Anagrams', difficulty: 'Medium', topic_id: 't1', tags: ['array', 'hash-table', 'string'] },
  { _id: 'p4', id: 'p4', title: 'Product of Array Except Self', difficulty: 'Medium', topic_id: 't1', tags: ['array', 'prefix-sum'] },
  { _id: 'p5', id: 'p5', title: 'Longest Consecutive Sequence', difficulty: 'Medium', topic_id: 't1', tags: ['array', 'hash-table', 'union-find'] },
  { _id: 'p6', id: 'p6', title: 'Container With Most Water', difficulty: 'Medium', topic_id: 't2', tags: ['array', 'two-pointers', 'greedy'] },
  { _id: 'p7', id: 'p7', title: 'Trapping Rain Water', difficulty: 'Hard', topic_id: 't2', tags: ['array', 'two-pointers', 'stack', 'monotonic-stack'] },
  { _id: 'p8', id: 'p8', title: '3Sum', difficulty: 'Medium', topic_id: 't2', tags: ['array', 'two-pointers', 'sorting'] },
  { _id: 'p9', id: 'p9', title: 'Validate Binary Search Tree', difficulty: 'Medium', topic_id: 't3', tags: ['tree', 'dfs', 'bst'] },
  { _id: 'p10', id: 'p10', title: 'Serialize and Deserialize Binary Tree', difficulty: 'Hard', topic_id: 't3', tags: ['tree', 'dfs', 'design', 'string'] },
  { _id: 'p11', id: 'p11', title: 'Kth Smallest Element in a BST', difficulty: 'Medium', topic_id: 't3', tags: ['tree', 'bst', 'inorder'] },
  { _id: 'p12', id: 'p12', title: 'Word Ladder', difficulty: 'Hard', topic_id: 't4', tags: ['graph', 'bfs', 'hash-table'] },
  { _id: 'p13', id: 'p13', title: 'Course Schedule', difficulty: 'Medium', topic_id: 't4', tags: ['graph', 'topological-sort', 'dfs'] },
  { _id: 'p14', id: 'p14', title: 'Number of Islands', difficulty: 'Medium', topic_id: 't4', tags: ['graph', 'dfs', 'bfs', 'union-find'] },
  { _id: 'p15', id: 'p15', title: 'Climbing Stairs', difficulty: 'Easy', topic_id: 't5', tags: ['dp', 'memoization'] },
  { _id: 'p16', id: 'p16', title: 'Coin Change', difficulty: 'Medium', topic_id: 't5', tags: ['dp', 'bfs'] },
  { _id: 'p17', id: 'p17', title: 'Edit Distance', difficulty: 'Hard', topic_id: 't5', tags: ['dp', 'string'] },
  { _id: 'p18', id: 'p18', title: 'Longest Increasing Subsequence', difficulty: 'Medium', topic_id: 't5', tags: ['dp', 'binary-search'] },
];


export function Problems() {
  const { data: problemsData = [], isLoading: problemsLoading } = useQuery({
    queryKey: ['problems'],
    queryFn: getAllProblems
  });

  const { data: topicsData = [], isLoading: topicsLoading } = useQuery({
    queryKey: ['topics'],
    queryFn: getAllTopics
  });

  const { user, refreshProfile } = useAuth();

  const { data: userProgressData } = useQuery({
    queryKey: ['userProgress', user?.id],
    queryFn: getUserProgress,
    enabled: !!user,
  });

  // Fixtures keep the reference stable across renders so the downstream
  // useMemo/useEffect dependency chains behave.
  //
  // Fixtures are a REVIEW AFFORDANCE, not a loading fallback: they must only
  // stand in once the fetch has actually settled empty. If they filled in while
  // a request was still in flight they would mask the loading state entirely —
  // which is exactly the bug that made the skeleton below unreachable.
  const showFixtures = Boolean(import.meta.env.DEV || import.meta.env.VITE_SHOW_FIXTURES);
  const allProblems = useMemo(
    () =>
      problemsData.length
        ? problemsData
        : showFixtures && !problemsLoading
          ? PROBLEM_FIXTURES
          : [],
    [problemsData, showFixtures, problemsLoading]
  );
  const topics = useMemo(
    () =>
      topicsData.length
        ? topicsData
        : showFixtures && !topicsLoading
          ? TOPIC_FIXTURES
          : [],
    [topicsData, showFixtures, topicsLoading]
  );
  const filtersLoading = problemsLoading || topicsLoading;

  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'Easy' | 'Medium' | 'Hard'>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [completedProblems, setCompletedProblems] = useState<Set<string>>(new Set());
  const [bookmarkedProblems, setBookmarkedProblems] = useState<Set<string>>(new Set());

  // Notes modal state
  const [notesModal, setNotesModal] = useState<{ problemId: string; problemTitle: string } | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (userProgressData) {
      const completed = new Set<string>();
      const bookmarked = new Set<string>();
      const notesData: Record<string, string> = {};
      
       
      userProgressData.forEach((p: any) => {
        if (p.status === 'SOLVED') completed.add(p.problem_id);
        if (p.is_bookmarked) bookmarked.add(p.problem_id);
        if (p.notes && p.notes.trim()) {
          notesData[p.problem_id] = p.notes;
        }
      });
      
      setCompletedProblems(completed);
      setBookmarkedProblems(bookmarked);
      setNotesMap(notesData);
    } else if (!user) {
      setCompletedProblems(new Set());
      setBookmarkedProblems(new Set());
      setNotesMap({});
    }
  }, [userProgressData, user]);

  // Get all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
     
    allProblems.forEach((p: any) => {
      if (p.tags) p.tags.forEach((t: string) => tags.add(t));
    });
    return Array.from(tags).sort();
  }, [allProblems]);

  // Filter problems
  const filteredProblems = useMemo(() => {
    return allProblems.filter((problem: any) => {  
      const tags = problem.tags || [];
      const matchesSearch = problem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesDifficulty = difficultyFilter === 'all' || problem.difficulty === difficultyFilter;
      const matchesTag = tagFilter === 'all' || tags.includes(tagFilter);
      return matchesSearch && matchesDifficulty && matchesTag;
    });
  }, [searchQuery, difficultyFilter, tagFilter, allProblems]);

  /* Paging. Rendering every row at once produced 11,144 DOM nodes and a 21,000px
   * page — the browser has to lay out all of it before anything is readable, and
   * four action buttons per row is most of that weight. A page at a time keeps
   * the table dense without the cost. */
  const PAGE_SIZE = 50;
  const pageCount = Math.max(1, Math.ceil(filteredProblems.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visibleProblems = useMemo(
    () => filteredProblems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredProblems, safePage]
  );
  const firstShown = filteredProblems.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const lastShown = Math.min(safePage * PAGE_SIZE, filteredProblems.length);

  // Changing what you are looking at should put you back at the start of it.
  useEffect(() => {
    setPage(1);
  }, [searchQuery, difficultyFilter, tagFilter]);

  // Stats
  const stats = {
    total: allProblems.length,
     
    easy: allProblems.filter((p: any) => p.difficulty === 'Easy').length,
     
    medium: allProblems.filter((p: any) => p.difficulty === 'Medium').length,
     
    hard: allProblems.filter((p: any) => p.difficulty === 'Hard').length,
  };

  /* Composition of the library, and how much of each band has been solved.
   * Four separate counts told you the size of the catalogue; this tells you its
   * shape and your position in it, which is the more useful read-out. */
  const distribution = useMemo(() => {
    const bands = [
      { label: 'Easy', tone: 'teal' as const, color: 'var(--af-teal)', total: 0, solved: 0 },
      { label: 'Medium', tone: 'soft' as const, color: 'var(--af-ink-soft)', total: 0, solved: 0 },
      { label: 'Hard', tone: 'danger' as const, color: 'var(--af-danger)', total: 0, solved: 0 },
    ];
    allProblems.forEach((p: any) => {
      const band = bands.find((b) => b.label === p.difficulty);
      if (!band) return;
      band.total += 1;
      if (completedProblems.has(p._id || p.id)) band.solved += 1;
    });
    return bands;
  }, [allProblems, completedProblems]);

  const solvedTotal = distribution.reduce((n, b) => n + b.solved, 0);

  const toggleComplete = async (_problemId: string, problemMongoId: string) => {
    const wasCompleted = completedProblems.has(problemMongoId);
    setCompletedProblems(prev => {
      const newSet = new Set(prev);
      if (wasCompleted) {
        newSet.delete(problemMongoId);
      } else {
        newSet.add(problemMongoId);
      }
      return newSet;
    });

    try {
      await updateProblemStatus(problemMongoId, wasCompleted ? 'TODO' : 'SOLVED');
      if (!wasCompleted) toast.success(`Problem marked as complete! +${SOLVE_XP} XP`);
      // Refresh profile so nav XP updates immediately
      refreshProfile();
    } catch {
      setCompletedProblems(prev => {
        const newSet = new Set(prev);
        if (wasCompleted) newSet.add(problemMongoId);
        else newSet.delete(problemMongoId);
        return newSet;
      });
      toast.error('Failed to update status. Please log in.');
    }
  };

  const toggleBookmark = async (_problemId: string, problemMongoId: string) => {
    const wasBookmarked = bookmarkedProblems.has(problemMongoId);
    setBookmarkedProblems(prev => {
      const newSet = new Set(prev);
      if (wasBookmarked) {
        newSet.delete(problemMongoId);
      } else {
        newSet.add(problemMongoId);
      }
      return newSet;
    });

    try {
      await apiToggleBookmark(problemMongoId);
      if (wasBookmarked) toast.info('Bookmark removed');
      else toast.success('Problem bookmarked');
    } catch {
      setBookmarkedProblems(prev => {
        const newSet = new Set(prev);
        if (wasBookmarked) newSet.add(problemMongoId);
        else newSet.delete(problemMongoId);
        return newSet;
      });
      toast.error('Failed to update bookmark. Please log in.');
    }
  };

  // If initial load — render a skeleton that mirrors the real geometry, so the
  // layout does not jump when data lands. See DESIGN_SPEC.md §6.
  if (filtersLoading && allProblems.length === 0) {
    return <ProblemsSkeleton />;
  }

  return (
    <section className="relative min-h-screen pt-24 pb-12">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-7">
          <h1 className="font-display text-[1.875rem] sm:text-[2.25rem] text-[#f1eeea] tracking-[-0.02em] mb-2">
            Problem library
          </h1>
          <p className="text-[0.9375rem] text-[#b6b1ad]">
            {allProblems.length === 0
              ? 'Loading problems…'
              : 'Every problem in the catalogue, ordered for scanning. Difficulty carries a stroke on the left.'}
          </p>
        </div>

        {/* Composition read-out. Four counts told you how big the catalogue is;
            a proportional bar plus per-band solved figures tells you its shape
            and where you stand in it. */}
        <div className="mb-8">
          <div className="flex items-baseline justify-between gap-4 mb-2.5">
            <span className="text-[0.75rem] text-[#8f8a85]">
              <span className="text-[#f1eeea] tnum">{stats.total.toLocaleString()}</span> problems,
              by difficulty
            </span>
            <span className="text-[0.75rem] text-[#8f8a85] tnum">
              <span className="text-[#c8dfd1]">{solvedTotal.toLocaleString()}</span> solved
            </span>
          </div>

          {/* The bar is the same read-out device as the curriculum sheet's cells:
              proportion you can see before you read a number. */}
          <div
            className="flex h-[6px] overflow-hidden rounded-[1px]"
            role="img"
            aria-label={distribution
              .map((b) => `${b.label}: ${b.total} problems, ${b.solved} solved`)
              .join('. ')}
          >
            {distribution.map((band) => (
              <span
                key={band.label}
                style={{
                  width: `${stats.total > 0 ? (band.total / stats.total) * 100 : 0}%`,
                  background: band.color,
                  opacity: band.solved > 0 ? 1 : 0.55,
                }}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 border-t border-[rgba(241,238,234,0.1)] mt-3">
            {distribution.map((band) => (
              <div
                key={band.label}
                className="px-3 py-3 border-r border-[rgba(241,238,234,0.1)] last:border-r-0"
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="mark" data-tone={band.tone} aria-hidden="true" />
                  <span className="text-[0.75rem] text-[#8f8a85]">{band.label}</span>
                </div>
                <p className="text-[1.25rem] font-medium text-[#f1eeea] tnum leading-none mb-1">
                  {band.solved}
                  <span className="text-[#6f6a65] text-[0.875rem]">/{band.total}</span>
                </p>
                <p className="text-[0.6875rem] text-[#8f8a85] tnum">
                  {band.total > 0 ? Math.round((band.solved / band.total) * 100) : 0}% solved
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="pb-4 mb-6 border-b border-[rgba(241,238,234,0.2)]">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8f8a85]" />
              <Input
                type="text"
                placeholder="Search problems or tags…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search problems or tags"
                className="pl-9 bg-[#222225] border-[rgba(241,238,234,0.1)] text-[#f1eeea] placeholder:text-[#8f8a85] rounded-[6px] focus-visible:border-[#f0997d]"
              />
            </div>

            {/* Difficulty Filter */}
            <div className="flex gap-1" role="group" aria-label="Filter by difficulty">
              {(['all', 'Easy', 'Medium', 'Hard'] as const).map((diff) => {
                const active = difficultyFilter === diff;
                return (
                  <button
                    key={diff}
                    onClick={() => setDifficultyFilter(diff)}
                    aria-pressed={active}
                    className={`px-3 py-1.5 rounded-[4px] text-[0.8125rem] font-medium transition-colors duration-[var(--af-dur-fast)] ${
                      active
                        ? 'bg-[#f0997d] text-[#19191b]'
                        : 'text-[#b6b1ad] hover:text-[#f1eeea] bg-[#222225]'
                    }`}
                  >
                    {diff === 'all' ? 'All' : diff}
                  </button>
                );
              })}
            </div>

            {/* Tag Filter */}
            <div className="relative">
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                aria-label="Filter by tag"
                className="appearance-none px-3 py-1.5 pr-9 rounded-[4px] bg-[#2c2b30] border border-[rgba(241,238,234,0.1)] text-[#f1eeea] text-[0.8125rem] focus:outline-none focus-visible:border-[#f0997d] min-w-[150px] cursor-pointer hover:bg-[#2a282c] transition-colors"
              >
                <option value="all" className="bg-[#222225]">All tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag} className="bg-[#222225]">{tag}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8f8a85] pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-[0.8125rem] text-[#b6b1ad]">
            {filteredProblems.length === 0 ? (
              <>No matches</>
            ) : (
              <>
                Showing <span className="text-[#f1eeea] tnum">{firstShown}–{lastShown}</span> of{' '}
                <span className="tnum">{filteredProblems.length}</span>
                {filteredProblems.length !== allProblems.length && (
                  <span className="text-[#8f8a85]"> filtered from {allProblems.length}</span>
                )}
              </>
            )}
          </p>
          <div className="flex items-center gap-2 text-[0.8125rem] text-[#b6b1ad]">
            <span className="mark" data-tone="teal" aria-hidden="true" />
            <span className="tnum">{completedProblems.size}</span> completed
          </div>
        </div>

        {/* Problems table — dense rows on hairlines, not cards.
            Column layout matches the header above so the eye can travel down
            each field. The wrapper is keyed on the active filter combination,
            so the entrance animation replays only when the user changes what
            they are looking at — not when a problem is marked complete. */}
        <div className="hidden sm:grid grid-cols-[1.5rem_minmax(0,1fr)_9rem_4.75rem_7rem] gap-3 px-3 pb-2 border-b border-[rgba(241,238,234,0.2)]">
          <span aria-hidden="true" />
          <span className="text-[0.75rem] text-[#8f8a85]">Problem</span>
          <span className="text-[0.75rem] text-[#8f8a85]">Topic</span>
          <span className="text-[0.75rem] text-[#8f8a85]">Level</span>
          <span className="text-[0.75rem] text-[#8f8a85] text-right">Actions</span>
        </div>

        <div key={`${searchQuery}|${difficultyFilter}|${tagFilter}|${safePage}`} className="ruled stagger">
          {visibleProblems.map((problem: any, rowIndex: number) => {
            const problemMongoId = problem._id || problem.id;
            const isCompleted = completedProblems.has(problemMongoId);
            const isBookmarked = bookmarkedProblems.has(problemMongoId);
            const topic = topics.find((t: any) => t.id === problem.topic_id);

            return (
              <div
                key={problemMongoId}
                style={{ '--i': rowIndex } as React.CSSProperties}
                className={`row-edge row-interactive group px-3 py-2.5 ${
                  problem.difficulty === 'Easy'
                    ? 'edge-easy'
                    : problem.difficulty === 'Hard'
                      ? 'edge-hard'
                      : 'edge-medium'
                } ${isCompleted ? 'opacity-60' : ''}`}
              >
                <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] sm:grid-cols-[1.5rem_minmax(0,1fr)_9rem_4.75rem_7rem] gap-3 items-center">
                  {/* Completion toggle — a SQUARE that fills, the same cell
                      vocabulary as the curriculum sheet, so solved state reads
                      the same way on both surfaces. Filled = solved. */}
                  <button
                    onClick={() => toggleComplete(problem.id, problemMongoId)}
                    className="flex-shrink-0 icon-btn w-6 h-6"
                    aria-label={isCompleted ? `Mark ${problem.title} as incomplete` : `Mark ${problem.title} as complete`}
                  >
                    <span
                      className={`block w-[15px] h-[15px] rounded-[2px] border transition-colors duration-[var(--af-dur-fast)] ${
                        isCompleted
                          ? 'bg-[#b1cbbb] border-[#b1cbbb] animate-[af-pop_180ms_var(--af-ease-spring)]'
                          : 'border-[#6f6a65] group-hover:border-[#f1eeea]'
                      }`}
                    />
                  </button>

                  {/* Title + tags. Topic and level get their own columns from
                      sm up, so this cell stays one line tall and the table can
                      be scanned down a single field at a time. */}
                  <div className="min-w-0">
                    <h3 className={`text-[0.875rem] font-medium truncate ${isCompleted ? 'text-[#b6b1ad] line-through' : 'text-[#f1eeea]'}`}>
                      {problem.title}
                    </h3>
                    <div className="flex items-center gap-x-2.5 gap-y-0.5 flex-wrap mt-0.5">
                      {/* Below sm there are no columns, so topic and level have
                          to travel with the title or they are lost. */}
                      <span className="sm:hidden text-[0.6875rem] text-[#8f8a85]">
                        {topic ? topic.title : '—'}
                      </span>
                      <span className={`sm:hidden text-[0.6875rem] font-medium difficulty-${problem.difficulty.toLowerCase()}`}>
                        {problem.difficulty}
                      </span>
                      {(problem.tags || []).slice(0, 3).map((tag: string) => (
                        <span key={tag} className="text-[0.6875rem] text-[#6f6a65]">
                          {tag}
                        </span>
                      ))}
                      {(problem.tags || []).length > 3 && (
                        <span className="text-[0.6875rem] text-[#6f6a65]">
                          +{(problem.tags || []).length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="hidden sm:block text-[0.75rem] text-[#b6b1ad] truncate">
                    {topic ? topic.title : '—'}
                  </span>

                  <span className={`hidden sm:block text-[0.75rem] font-medium difficulty-${problem.difficulty.toLowerCase()}`}>
                    {problem.difficulty}
                  </span>

                  {/* Actions — quiet until the row is hovered or focused */}
                  <div className="row-actions flex items-center gap-1 justify-end">
                    {problem.video_link && (
                      <a
                        href={problem.video_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="icon-btn w-8 h-8 group/btn"
                        aria-label={`Watch the video for ${problem.title}`}
                      >
                        <Play className="w-4 h-4 text-[#8f8a85] transition-colors duration-[var(--af-dur-fast)] group-hover/btn:text-[#f1eeea]" />
                      </a>
                    )}

                    <button
                      onClick={() => window.location.hash = `workspace/${problemMongoId}`}
                      className="icon-btn w-8 h-8 group/btn"
                      aria-label={`Solve ${problem.title}`}
                    >
                      <Code2 className="w-4 h-4 text-[#f0997d] transition-transform duration-[var(--af-dur-fast)] group-hover/btn:scale-110" />
                    </button>

                    <button
                      onClick={() => toggleBookmark(problem.id, problemMongoId)}
                      aria-pressed={isBookmarked}
                      aria-label={isBookmarked ? `Remove bookmark from ${problem.title}` : `Bookmark ${problem.title}`}
                      className="icon-btn w-8 h-8"
                    >
                      <Bookmark
                        className={`w-4 h-4 transition-transform duration-[var(--af-dur-fast)] ${isBookmarked ? 'text-[#f0997d] fill-[#f0997d]' : 'text-[#8f8a85]'}`}
                      />
                    </button>

                    <button
                      onClick={() => {
                        setNotesModal({ problemId: problemMongoId, problemTitle: problem.title });
                        setNoteContent(notesMap[problemMongoId] || '');
                      }}
                      aria-label={notesMap[problemMongoId] ? `Edit notes for ${problem.title}` : `Add notes for ${problem.title}`}
                      className="icon-btn w-8 h-8"
                    >
                      <FileText
                        className={`w-4 h-4 ${notesMap[problemMongoId] ? 'text-[#f0997d]' : 'text-[#8f8a85]'}`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredProblems.length === 0 && (
          <div className="text-center py-20">
            <Search className="w-6 h-6 text-[#3a393e] mx-auto mb-4" />
            <p className="text-[0.9375rem] text-[#b6b1ad] mb-1">No problems match those filters</p>
            <p className="text-[0.8125rem] text-[#8f8a85]">
              Try a different difficulty or clear the search
            </p>
          </div>
        )}

        {/* Pager — plain controls, and the position stated as a figure rather
            than implied by a row of page numbers.
            Centred, not spread: the AlgoBot launcher is fixed to the bottom-right
            corner, and a Next button at the far right of the last row sits
            directly under it. */}
        {pageCount > 1 && (
          <div className="flex items-center justify-center gap-5 mt-4 pt-4 border-t border-[rgba(241,238,234,0.2)]">
            <button
              onClick={() => setPage((n) => Math.max(n - 1, 1))}
              disabled={safePage === 1}
              className={`chrome-btn flex items-center gap-1.5 px-3 py-2 rounded-[4px] border border-[rgba(241,238,234,0.1)] text-[0.8125rem] font-medium ${
                safePage === 1
                  ? 'text-[#6f6a65] cursor-not-allowed'
                  : 'text-[#b6b1ad] hover:text-[#f1eeea]'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <span className="text-[0.8125rem] text-[#b6b1ad] tnum">
              Page <span className="text-[#f1eeea]">{safePage}</span> of {pageCount}
            </span>

            <button
              onClick={() => setPage((n) => Math.min(n + 1, pageCount))}
              disabled={safePage === pageCount}
              className={`chrome-btn flex items-center gap-1.5 px-3 py-2 rounded-[4px] border border-[rgba(241,238,234,0.1)] text-[0.8125rem] font-medium ${
                safePage === pageCount
                  ? 'text-[#6f6a65] cursor-not-allowed'
                  : 'text-[#b6b1ad] hover:text-[#f1eeea]'
              }`}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Notes Modal */}
      {notesModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setNotesModal(null)}
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Problem notes"
            className="relative w-full max-w-lg mx-4 bg-[#222225] rounded-[10px] p-6 border border-[rgba(241,238,234,0.2)]"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="min-w-0">
                <h3 className="text-[0.9375rem] font-medium text-[#f1eeea]">Notes</h3>
                <p className="text-[0.8125rem] text-[#8f8a85] truncate max-w-[300px]">{notesModal.problemTitle}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (!notesModal) return;
                    setSavingNote(true);
                    try {
                      await updateNotes(notesModal.problemId, noteContent);
                      setNotesMap(prev => ({ ...prev, [notesModal.problemId]: noteContent }));
                      toast.success(noteContent.trim() ? 'Note saved!' : 'Note cleared');
                      setNotesModal(null);
                    } catch {
                      toast.error('Failed to save note. Please log in.');
                    } finally {
                      setSavingNote(false);
                    }
                  }}
                  disabled={savingNote}
                  className="btn-primary text-[0.8125rem]"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingNote ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setNotesModal(null)}
                  aria-label="Close notes"
                  className="p-1.5 icon-btn text-[#8f8a85] hover:text-[#f1eeea]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Approach, the invariant that finally holds, complexity…"
              rows={10}
              autoFocus
              className="w-full px-3 py-2.5 rounded-[6px] bg-[#19191b] border border-[rgba(241,238,234,0.1)] text-[#f1eeea] placeholder:text-[#8f8a85] focus:outline-none focus-visible:border-[#f0997d] resize-none font-mono text-[0.8125rem] leading-relaxed"
            />
          </motion.div>
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */

/** Fixed title widths so the skeleton does not re-roll on every render. */
const SKELETON_WIDTHS = [196, 168, 232, 150, 214, 180, 246, 162];

/**
 * Loading state for the problem library.
 *
 * Mirrors the real page's geometry — same header block, same four-column stat
 * strip, same row height and column positions — so nothing shifts when the data
 * arrives. A skeleton that does not match the final layout is worse than a
 * spinner, because it promises a shape it then breaks.
 */
function ProblemsSkeleton() {
  return (
    <section className="min-h-screen pt-24 pb-12" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading problems</span>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 pb-6 rule-header">
          <div className="skeleton h-9 w-64 mb-3" />
          <div className="skeleton h-4 w-96 max-w-full" />
        </div>

        {/* Composition read-out — label row, proportion bar, three bands */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2.5">
            <div className="skeleton h-3.5 w-40" />
            <div className="skeleton h-3.5 w-20" />
          </div>
          <div className="skeleton h-[6px] w-full rounded-[1px] mb-3" />
          <div className="grid grid-cols-3 border-t border-[rgba(241,238,234,0.1)]">
            {[0, 1, 2].map((i) => (
              <div key={i} className="px-3 py-3 border-r border-[rgba(241,238,234,0.1)] last:border-r-0">
                <div className="skeleton h-3 w-12 mb-2" />
                <div className="skeleton h-5 w-16 mb-1.5" />
                <div className="skeleton h-3 w-14" />
              </div>
            ))}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="skeleton h-9 flex-1 min-w-[220px]" />
          <div className="flex gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-8 w-16" />
            ))}
          </div>
          <div className="skeleton h-9 w-[150px]" />
        </div>

        {/* Result count */}
        <div className="flex items-center justify-between mb-3">
          <div className="skeleton h-4 w-52" />
          <div className="skeleton h-4 w-28" />
        </div>

        {/* Column header */}
        <div className="hidden sm:grid grid-cols-[1.5rem_minmax(0,1fr)_9rem_4.75rem_7rem] gap-3 px-3 pb-2 border-b border-[rgba(241,238,234,0.2)]">
          {['', 'Problem', 'Topic', 'Level', ''].map((h, i) => (
            <div key={i} className="skeleton h-3.5" style={{ width: h ? '3.5rem' : '0.75rem' }} />
          ))}
        </div>

        {/* Rows — same grid and row height as the real table, varied title
            widths so the block reads as text rather than as a loading bar */}
        <div className="ruled" aria-hidden="true">
          {SKELETON_WIDTHS.map((w, i) => (
            <div
              key={i}
              className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] sm:grid-cols-[1.5rem_minmax(0,1fr)_9rem_4.75rem_7rem] gap-3 items-center px-3 py-2.5"
            >
              <div className="skeleton w-[15px] h-[15px] rounded-[2px]" />
              <div className="min-w-0">
                <div className="skeleton h-3.5 mb-1.5" style={{ width: w }} />
                <div className="skeleton h-2.5 w-28" />
              </div>
              <div className="skeleton h-3 w-12 justify-self-end sm:hidden" />
              <div className="skeleton h-3 w-24 hidden sm:block" />
              <div className="skeleton h-3 w-10 hidden sm:block" />
              <div className="hidden sm:flex items-center gap-2 justify-end">
                <div className="skeleton w-8 h-8" />
                <div className="skeleton w-8 h-8" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
