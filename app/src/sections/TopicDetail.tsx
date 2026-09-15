import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Play,
  CheckCircle2,
  Circle,
  Bookmark,
  BarChart3,
  Search,
  FileText,
  X,
  Save,
  Code2
} from 'lucide-react';
import { getTopicById, getProblemsByTopic } from '@/api/content';
import { updateProblemStatus, toggleBookmark as apiToggleBookmark, getUserProgress, updateNotes } from '@/api/userActions';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { SOLVE_XP } from '@/utils/xpConfig';

interface TopicDetailProps {
  topicId: string;
  onBack: () => void;
}

export function TopicDetail({ topicId, onBack }: TopicDetailProps) {
  const { refreshProfile } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [topic, setTopic] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [problems, setProblems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'Easy' | 'Medium' | 'Hard'>('all');
  const [completedProblems, setCompletedProblems] = useState<Set<string>>(new Set());
  const [bookmarkedProblems, setBookmarkedProblems] = useState<Set<string>>(new Set());

  // Notes modal state
  const [notesModal, setNotesModal] = useState<{ problemId: string; problemTitle: string } | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState(false);

  // Load data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [topicData, problemsData] = await Promise.all([
          getTopicById(topicId),
          getProblemsByTopic(topicId)
        ]);
        setTopic(topicData);
        setProblems(problemsData);

        // Load user progress
        const notesData: Record<string, string> = {};
        try {
          const progressData = await getUserProgress();
          const completed = new Set<string>();
          const bookmarked = new Set<string>();

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          progressData.forEach((p: any) => {
            if (p.status === 'SOLVED') completed.add(p.problem_id);
            if (p.is_bookmarked) bookmarked.add(p.problem_id);
            if (p.notes && p.notes.trim()) {
              notesData[p.problem_id] = p.notes;
            }
          });
          setCompletedProblems(completed);
          setBookmarkedProblems(bookmarked);
          setNotesMap(notesData);
        } catch {
          // User might not be logged in, ignore
        }

      } catch (e) {
        console.error("Failed to load topic details", e);
        toast.error("Failed to load topic");
      } finally {
        setLoading(false);
      }
    };
    if (topicId) {
      fetchData();
    }
  }, [topicId]);

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <p className="text-[#b6b1ad]">Loading topic…</p>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <p className="text-[#b6b1ad]">Topic not found</p>
      </div>
    );
  }

  const filteredProblems = problems.filter(problem => {
    // problem.tags might be undefined in some cases if db is messy, check optional
    const tags = problem.tags || [];
    const matchesSearch = problem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDifficulty = difficultyFilter === 'all' || problem.difficulty === difficultyFilter;
    return matchesSearch && matchesDifficulty;
  });

  const toggleComplete = async (_problemId: string, problemMongoId: string) => {
    // Optimistic update
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
      // Revert
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

  const openNoteModal = (problemMongoId: string, problemTitle: string) => {
    setNotesModal({ problemId: problemMongoId, problemTitle });
    setNoteContent(notesMap[problemMongoId] || '');
  };

  const saveNote = async () => {
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
  };

  const progress = problems.length > 0 ? Math.round((completedProblems.size / problems.length) * 100) : 0;

  return (
    <section className="relative min-h-screen pt-24 pb-12">
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button & Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="btn-quiet -ml-3 mb-4 text-[0.875rem]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to roadmaps
          </button>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-[4px] bg-[#2c2b30] flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-[#f0997d]" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-medium text-[#f1eeea] tracking-[-0.03em]">{topic.title}</h1>
                <p className="text-[#b6b1ad] text-[0.9375rem]">{topic.description}</p>
              </div>
            </div>

            {/* Progress */}
            <div className="bg-[#222225] border border-[rgba(241,238,234,0.1)] rounded-[6px] p-4 min-w-[200px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[0.75rem] text-[#8f8a85]">Progress</span>
                <span className="text-[0.875rem] font-medium text-[#f0997d] tnum">
                  {progress}%
                </span>
              </div>
              <div className="h-1 bg-[rgba(241,238,234,0.1)] overflow-hidden">
                <div
                  className="h-full bg-[#f0997d]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[0.75rem] text-[#8f8a85] mt-2 tnum">
                {completedProblems.size} of {problems.length} completed
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 pb-4 mb-6 border-b border-[rgba(241,238,234,0.2)]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8f8a85]" />
            <Input
              type="text"
              placeholder="Search problems or tags…"
              aria-label="Search problems or tags"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-[#222225] border-[rgba(241,238,234,0.1)] text-[#f1eeea] placeholder:text-[#8f8a85] rounded-[6px] focus-visible:border-[#f0997d]"
            />
          </div>

          <div className="flex gap-1" role="group" aria-label="Filter by difficulty">
            {(['all', 'Easy', 'Medium', 'Hard'] as const).map((diff) => (
              <button
                key={diff}
                onClick={() => setDifficultyFilter(diff)}
                aria-pressed={difficultyFilter === diff}
                className={`px-3 py-1.5 rounded-[4px] text-[0.8125rem] font-medium transition-colors duration-[var(--af-dur-fast)] ${difficultyFilter === diff
                  ? 'bg-[#f0997d] text-[#19191b]'
                  : 'text-[#b6b1ad] hover:text-[#f1eeea] bg-[#222225]'
                  }`}
              >
                {diff === 'all' ? 'All' : diff}
              </button>
            ))}
          </div>
        </div>

        {/* Problems List — rows on hairlines with a difficulty edge */}
        <div className="ruled">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {filteredProblems.map((problem: any) => {
            const problemMongoId = problem.id;
            const isCompleted = completedProblems.has(problemMongoId);
            const isBookmarked = bookmarkedProblems.has(problemMongoId);

            return (
              <div
                key={problemMongoId}
                className={`row-edge px-3 py-3.5 row-interactive ${
                  problem.difficulty === 'Easy'
                    ? 'edge-easy'
                    : problem.difficulty === 'Hard'
                      ? 'edge-hard'
                      : 'edge-medium'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  {/* Completion Toggle */}
                  <button
                    onClick={() => toggleComplete(problem.id, problemMongoId)}
                    className="flex-shrink-0 self-start sm:self-auto"
                    aria-label={isCompleted ? `Mark ${problem.title} as incomplete` : `Mark ${problem.title} as complete`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-[#b1cbbb]" />
                    ) : (
                      <Circle className="w-5 h-5 text-[#8f8a85] hover:text-[#f1eeea] transition-colors duration-[var(--af-dur-fast)]" />
                    )}
                  </button>

                  {/* Problem Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-3 mb-1.5 flex-wrap">
                      <h3 className={`text-[0.9375rem] font-medium ${isCompleted ? 'text-[#b6b1ad] line-through' : 'text-[#f1eeea]'}`}>
                        {problem.title}
                      </h3>
                      <span className={`text-[0.75rem] font-medium difficulty-${problem.difficulty.toLowerCase()}`}>
                        {problem.difficulty}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {(problem.tags || []).map((tag: string) => (
                        <span
                          key={tag}
                          className="text-[0.75rem] text-[#8f8a85]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 self-start sm:self-auto">
                    {problem.video_link && (
                      <a
                        href={problem.video_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 icon-btn group"
                        aria-label={`Watch the video for ${problem.title}`}
                      >
                        <Play className="w-4 h-4 text-[#8f8a85] group-hover:text-[#f1eeea]" />
                      </a>
                    )}

                    <button
                      onClick={() => window.location.hash = `workspace/${problemMongoId}`}
                      className="w-8 h-8 icon-btn"
                      aria-label={`Solve ${problem.title}`}
                    >
                      <Code2 className="w-4 h-4 text-[#f0997d]" />
                    </button>

                    <button
                      onClick={() => toggleBookmark(problem.id, problemMongoId)}
                      aria-pressed={isBookmarked}
                      aria-label={isBookmarked ? `Remove bookmark from ${problem.title}` : `Bookmark ${problem.title}`}
                      className="w-8 h-8 icon-btn"
                    >
                      <Bookmark className={`w-4 h-4 ${isBookmarked ? 'text-[#f0997d] fill-[#f0997d]' : 'text-[#8f8a85]'}`} />
                    </button>

                    <button
                      onClick={() => openNoteModal(problemMongoId, problem.title)}
                      aria-label={notesMap[problemMongoId] ? `Edit notes for ${problem.title}` : `Add notes for ${problem.title}`}
                      className="w-8 h-8 icon-btn"
                    >
                      <FileText className={`w-4 h-4 ${notesMap[problemMongoId] ? 'text-[#f0997d]' : 'text-[#8f8a85]'}`} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredProblems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[#b6b1ad] text-[0.9375rem]">No problems found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Notes Modal */}
      {notesModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setNotesModal(null)} aria-hidden="true" />
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Problem notes"
            className="relative w-full max-w-lg mx-4 bg-[#222225] rounded-[10px] p-6 border border-[rgba(241,238,234,0.2)]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="min-w-0">
                <h3 className="text-[0.9375rem] font-medium text-[#f1eeea]">Notes</h3>
                <p className="text-[0.8125rem] text-[#8f8a85] truncate max-w-[300px]">{notesModal.problemTitle}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveNote}
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
              placeholder="Write your notes… Key insights, approach, time complexity."
              rows={10}
              autoFocus
              className="w-full px-4 py-3 rounded-[6px] bg-[#19191b] border border-[rgba(241,238,234,0.1)] text-[#f1eeea] placeholder:text-[#8f8a85] focus:outline-none focus-visible:border-[#f0997d] resize-none font-mono text-[0.8125rem] leading-relaxed"
            />
          </motion.div>
        </div>
      )}
    </section>
  );
}
