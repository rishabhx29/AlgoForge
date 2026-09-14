import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Search,
  Play,
  Bookmark,
  CheckCircle2,
  Circle,
  FileText,
  Tag,
  TrendingUp,
  Clock,
  BarChart3,
  ChevronDown,
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

export function Problems() {
  const { data: problemsData = [], isLoading: problemsLoading } = useQuery({
    queryKey: ['problems'],
    queryFn: () => getAllProblems(),
  });

  const { data: topicsData = [], isLoading: topicsLoading } = useQuery({
    queryKey: ['topics'],
    queryFn: () => getAllTopics(),
  });

  const { user, refreshProfile } = useAuth();

  const { data: userProgressData } = useQuery({
    queryKey: ['userProgress', user?.id],
    queryFn: () => getUserProgress(),
    enabled: !!user,
  });

  const allProblems = problemsData;
  const topics = topicsData;
  const filtersLoading = problemsLoading || topicsLoading;

  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'Easy' | 'Medium' | 'Hard'>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
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
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allProblems.forEach((p: any) => {
      if (p.tags) p.tags.forEach((t: string) => tags.add(t));
    });
    return Array.from(tags).sort();
  }, [allProblems]);

  // Filter problems
  const filteredProblems = useMemo(() => {
    return allProblems.filter((problem: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const tags = problem.tags || [];
      const matchesSearch = problem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesDifficulty = difficultyFilter === 'all' || problem.difficulty === difficultyFilter;
      const matchesTag = tagFilter === 'all' || tags.includes(tagFilter);
      return matchesSearch && matchesDifficulty && matchesTag;
    });
  }, [searchQuery, difficultyFilter, tagFilter, allProblems]);

  // Stats
  const stats = {
    total: allProblems.length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    easy: allProblems.filter((p: any) => p.difficulty === 'Easy').length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    medium: allProblems.filter((p: any) => p.difficulty === 'Medium').length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hard: allProblems.filter((p: any) => p.difficulty === 'Hard').length,
  };

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

  // If initial load
  if (filtersLoading && allProblems.length === 0) {
    return <div className="min-h-screen pt-24 pb-12 text-center text-white/60">Loading problems...</div>;
  }

  return (
    <section className="relative min-h-screen pt-24 pb-12 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 grid-pattern opacity-20" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#a088ff]/10 rounded-full blur-[200px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="font-display text-3xl sm:text-4xl text-white mb-2">
            Problem <span className="gradient-text">Library</span>
          </h1>
          <p className="text-white/60">
            Browse and practice from our collection of {stats.total}+ problems
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white/60" />
              </div>
              <span className="text-white/60 text-sm">Total</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>

          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-[#7ca700]/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#7ca700]" />
              </div>
              <span className="text-white/60 text-sm">Easy</span>
            </div>
            <p className="text-2xl font-bold text-[#7ca700]">{stats.easy}</p>
          </div>

          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-[#ffc107]/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#ffc107]" />
              </div>
              <span className="text-white/60 text-sm">Medium</span>
            </div>
            <p className="text-2xl font-bold text-[#ffc107]">{stats.medium}</p>
          </div>

          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-[#ff6347]/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#ff6347]" />
              </div>
              <span className="text-white/60 text-sm">Hard</span>
            </div>
            <p className="text-2xl font-bold text-[#ff6347]">{stats.hard}</p>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="glass rounded-xl p-4 mb-6"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <Input
                type="text"
                placeholder="Search problems or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            {/* Difficulty Filter */}
            <div className="flex gap-2">
              {(['all', 'Easy', 'Medium', 'Hard'] as const).map((diff) => (
                <button
                  key={diff}
                  onClick={() => setDifficultyFilter(diff)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${difficultyFilter === diff
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                >
                  {diff === 'all' ? 'All' : diff}
                </button>
              ))}
            </div>

            {/* Tag Filter */}
            <div className="relative">
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="appearance-none px-4 py-2 pr-10 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#a088ff] min-w-[150px]"
              >
                <option value="all" className="bg-[#202020]">All Tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag} className="bg-[#202020]">{tag}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
            </div>
          </div>
        </motion.div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-white/60 text-sm">
            Showing {filteredProblems.length} of {allProblems.length} problems
          </p>
          <div className="flex items-center gap-2 text-sm text-white/40">
            <CheckCircle2 className="w-4 h-4" />
            <span>{completedProblems.size} completed</span>
          </div>
        </div>

        {/* Problems Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid gap-3"
        >
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {filteredProblems.map((problem: any, index: number) => {
            const problemMongoId = problem._id || problem.id;
            const isCompleted = completedProblems.has(problemMongoId);
            const isBookmarked = bookmarkedProblems.has(problemMongoId);
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            const topic = topics.find((t: any) => t.id === problem.topic_id);

            return (
              <motion.div
                key={problemMongoId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.02 }}
                className={`glass rounded-xl p-4 sm:p-5 transition-all hover:bg-white/5 ${isCompleted ? 'border-[#7ca700]/30' : ''
                  }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Completion Toggle */}
                  <button
                    onClick={() => toggleComplete(problem.id, problemMongoId)}
                    className="flex-shrink-0"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-6 h-6 text-[#7ca700]" />
                    ) : (
                      <Circle className="w-6 h-6 text-white/30 hover:text-white/60 transition-colors" />
                    )}
                  </button>

                  {/* Problem Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className={`font-medium ${isCompleted ? 'text-white/60 line-through' : 'text-white'}`}>
                        {problem.title}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium difficulty-${problem.difficulty.toLowerCase()}`}>
                        {problem.difficulty}
                      </span>
                      {topic && (
                        <span
                          className="px-2 py-0.5 rounded text-xs"
                          style={{
                            background: `${topic.color}20`,
                            color: topic.color
                          }}
                        >
                          {topic.title}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {(problem.tags || []).map((tag: string) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-full bg-white/5 text-white/50 text-xs flex items-center gap-1"
                        >
                          <Tag className="w-3 h-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {problem.video_link && (
                      <a
                        href={problem.video_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-lg bg-white/5 hover:bg-[#a088ff]/20 flex items-center justify-center transition-colors group"
                        title="Watch Video"
                      >
                        <Play className="w-5 h-5 text-white/60 group-hover:text-[#a088ff]" />
                      </a>
                    )}

                    <button
                      onClick={() => window.location.hash = `workspace/${problemMongoId}`}
                      className="w-10 h-10 rounded-lg bg-[#a088ff]/10 hover:bg-[#a088ff]/20 flex items-center justify-center transition-colors group"
                      title="Solve Problem"
                    >
                      <Code2 className="w-5 h-5 text-[#a088ff]" />
                    </button>

                    <button
                      onClick={() => toggleBookmark(problem.id, problemMongoId)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${isBookmarked
                        ? 'bg-[#ffd700]/20'
                        : 'bg-white/5 hover:bg-[#ffd700]/10'
                        }`}
                      title="Bookmark"
                    >
                      <Bookmark className={`w-5 h-5 ${isBookmarked ? 'text-[#ffd700] fill-[#ffd700]' : 'text-white/60'}`} />
                    </button>

                    <button
                      onClick={() => {
                        setNotesModal({ problemId: problemMongoId, problemTitle: problem.title });
                        setNoteContent(notesMap[problemMongoId] || '');
                      }}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors group ${notesMap[problemMongoId] ? 'bg-[#a088ff]/20' : 'bg-white/5 hover:bg-white/10'}`}
                      title={notesMap[problemMongoId] ? 'Edit Notes' : 'Add Notes'}
                    >
                      <FileText className={`w-5 h-5 ${notesMap[problemMongoId] ? 'text-[#a088ff]' : 'text-white/60 group-hover:text-white'}`} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {filteredProblems.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-white/40" />
            </div>
            <p className="text-white/60 text-lg mb-2">No problems found</p>
            <p className="text-white/40 text-sm">Try adjusting your filters</p>
          </div>
        )}
      </div>

      {/* Notes Modal */}
      {notesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setNotesModal(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-lg mx-4 glass rounded-2xl p-6 border border-white/10"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Notes</h3>
                <p className="text-sm text-white/40 truncate max-w-[300px]">{notesModal.problemTitle}</p>
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
                  className="px-3 py-1.5 rounded-lg bg-[#a088ff]/20 text-[#a088ff] hover:bg-[#a088ff]/30 transition-colors flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  {savingNote ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setNotesModal(null)}
                  className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Write your notes... Key insights, approach, time complexity, etc."
              rows={10}
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#a088ff] resize-none font-mono text-sm"
            />
          </motion.div>
        </div>
      )}
    </section>
  );
}
