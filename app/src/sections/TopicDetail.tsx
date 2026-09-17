import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  Code2
} from 'lucide-react';
import { getTopicById, getProblemsByTopic } from '@/api/content';
import { updateProblemStatus, toggleBookmark as apiToggleBookmark, getUserProgress, updateNotes } from '@/api/userActions';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { SOLVE_XP } from '@/utils/xpConfig';
import { NotesModal } from '@/components/custom/NotesModal';
import { buildProgressSets } from '@/lib/types';
import type { Problem, Topic } from '@/lib/types';

interface TopicDetailProps {
  topicId: string;
  onBack: () => void;
}

export function TopicDetail({ topicId, onBack }: Readonly<TopicDetailProps>) {
  const queryClient = useQueryClient();
  const { refreshProfile } = useAuth();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
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

  const saveNote = useCallback(async () => {
    if (!notesModal) return;
    setSavingNote(true);
    try {
      await updateNotes(notesModal.problemId, noteContent);
      setNotesMap(prev => ({ ...prev, [notesModal.problemId]: noteContent }));
      toast.success(noteContent.trim() ? 'Note saved!' : 'Note cleared');
      setNotesModal(null);
      queryClient.invalidateQueries({ queryKey: ['userProgress'] });
    } catch {
      toast.error('Failed to save note. Please log in.');
    } finally {
      setSavingNote(false);
    }
  }, [notesModal, noteContent, queryClient]);

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
        try {
          const progressData = await getUserProgress();
          const { completed, bookmarked, notesMap: notesData } = buildProgressSets(progressData);
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
        <p className="text-white/60">Loading topic...</p>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <p className="text-white/60">Topic not found</p>
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
      queryClient.invalidateQueries({ queryKey: ['userProgress'] });
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
      queryClient.invalidateQueries({ queryKey: ['userProgress'] });
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

  const progress = problems.length > 0 ? Math.round((completedProblems.size / problems.length) * 100) : 0;

  return (
    <section className="relative min-h-screen pt-24 pb-12 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 grid-pattern opacity-20" />
      <div
        className="absolute top-0 right-0 w-96 h-96 rounded-full blur-[200px] opacity-30"
        style={{ background: topic.color }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button & Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Roadmaps
          </button>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: `${topic.color}20` }}
              >
                <BarChart3 className="w-8 h-8" style={{ color: topic.color }} />
              </div>
              <div>
                <h1 className="font-display text-3xl sm:text-4xl text-white">{topic.title}</h1>
                <p className="text-white/60">{topic.description}</p>
              </div>
            </div>

            {/* Progress */}
            <div className="glass rounded-xl p-4 min-w-[200px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/60">Progress</span>
                <span className="text-sm font-medium" style={{ color: topic.color }}>
                  {progress}%
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full rounded-full"
                  style={{ background: topic.color }}
                />
              </div>
              <p className="text-xs text-white/40 mt-2">
                {completedProblems.size} of {problems.length} completed
              </p>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4 mb-6"
        >
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
        </motion.div>

        {/* Problems List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-3"
        >
          {filteredProblems.map((problem: Problem, index: number) => {
            const problemMongoId = problem.id;
            const isCompleted = completedProblems.has(problemMongoId);
            const isBookmarked = bookmarkedProblems.has(problemMongoId);

            return (
              <motion.div
                key={problemMongoId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className={`glass rounded-xl p-4 sm:p-5 transition-all ${isCompleted ? 'border-[#7ca700]/30' : ''
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
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className={`font-medium ${isCompleted ? 'text-white/60 line-through' : 'text-white'}`}>
                        {problem.title}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium difficulty-${problem.difficulty.toLowerCase()}`}>
                        {problem.difficulty}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {(problem.tags || []).map((tag: string) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-full bg-white/5 text-white/50 text-xs"
                        >
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
                      onClick={() => openNoteModal(problemMongoId, problem.title)}
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
          <div className="text-center py-12">
            <p className="text-white/60">No problems found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Notes Modal */}
      {notesModal && (
        <NotesModal
          problemTitle={notesModal.problemTitle}
          noteContent={noteContent}
          saving={savingNote}
          onChange={setNoteContent}
          onSave={saveNote}
          onClose={() => setNotesModal(null)}
        />
      )}
    </section>
  );
}
