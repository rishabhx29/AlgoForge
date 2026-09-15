import { useState, useEffect, useMemo } from 'react';
import {
    Target,
    CheckCircle2,
    Circle,
    ExternalLink,
    Play,
    Flame,
    ArrowLeft,
    RefreshCw,
    Zap
} from 'lucide-react';
import { getAllProblems } from '@/api/content';
import { updateProblemStatus, getUserProgress } from '@/api/userActions';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { SOLVE_XP } from '@/utils/xpConfig';

interface DailyChallengesProps {
    onBack: () => void;
}

interface DailyProblem {
    id: string;
    title: string;
    difficulty: string;
    video_link?: string;
    problem_link?: string;
    tags?: string[];
}

interface DailyProgressItem {
    status: string;
    problem_id: string;
}
/**
 * Generates a deterministic FNV-1a hash from a string.
 * Used to create a stable daily ordering of problems
 * based on the current date seed and problem ID.
 */

const hashString = (str: string): number => {
    let hash = 2166136261;

    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
};
export function DailyChallenges({ onBack }: DailyChallengesProps) {
    const { refreshProfile } = useAuth();
    const [allProblems, setAllProblems] = useState<DailyProblem[]>([]);
    const [completedProblems, setCompletedProblems] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [dayKey, setDayKey] = useState(
    new Date().toISOString().slice(0, 10)
);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const problemsData = await getAllProblems();
                setAllProblems(problemsData);

                try {
                    const progressData = await getUserProgress();
                    const completed = new Set<string>();
                    progressData.forEach((p: DailyProgressItem) => {
                        if (p.status === 'SOLVED') completed.add(p.problem_id);
                    });
                    setCompletedProblems(completed);
                } catch {
                    // Not logged in
                }
            } catch (e) {
                console.error(e);
                toast.error('Failed to load challenges');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

  useEffect(() => {
    const updateDayKey = () => {
        setDayKey(new Date().toISOString().slice(0, 10));
    };

    const now = new Date();
    const nextMidnight = new Date();
    nextMidnight.setUTCHours(24, 0, 0, 0);

    let intervalId: ReturnType<typeof setInterval>;

    const timeoutId = setTimeout(() => {
        updateDayKey();
        intervalId = setInterval(updateDayKey, 24 * 60 * 60 * 1000);
    }, nextMidnight.getTime() - now.getTime());

    return () => {
        clearTimeout(timeoutId);
        if (intervalId) clearInterval(intervalId);
    };
}, []);

    // Use today's date as seed for deterministic daily selection
    const dailyProblems = useMemo(() => {
        if (allProblems.length === 0) return [];

       const [year, month, day] = dayKey.split("-").map(Number);

       const seed = year * 10000 + month * 100 + day;

        // Simple seeded shuffle to pick 3 problems deterministically per day
     const shuffled = [...allProblems]
    .map(problem => ({
        problem,
        hash: hashString(`${seed}-${problem.id}`)
    }))
    .sort((a, b) => a.hash - b.hash)
    .map(item => item.problem);

        // Try to get 1 Easy, 1 Medium, 1 Hard
        const easy = shuffled.find(p => p.difficulty === 'Easy');
        const medium = shuffled.find(p => p.difficulty === 'Medium');
        const hard = shuffled.find(p => p.difficulty === 'Hard');
        


        const selected = [easy, medium, hard].filter((p): p is DailyProblem => p !== undefined);
        // Fallback: if we don't have all 3 difficulties, just take first 3
        if (selected.length < 3) {
            return shuffled.slice(0, 3);
        }
     
        return selected;
    }, [allProblems, dayKey]);

    const challengesSolved = dailyProblems.filter(p => completedProblems.has(p.id)).length;
    const allCompleted = challengesSolved === dailyProblems.length && dailyProblems.length > 0;

    const toggleComplete = async (problemMongoId: string) => {
        const wasCompleted = completedProblems.has(problemMongoId);
        setCompletedProblems(prev => {
            const newSet = new Set(prev);
            if (wasCompleted) newSet.delete(problemMongoId);
            else newSet.add(problemMongoId);
            return newSet;
        });

        try {
            await updateProblemStatus(problemMongoId, wasCompleted ? 'TODO' : 'SOLVED');
            if (!wasCompleted) toast.success(`Challenge problem solved! +${SOLVE_XP} XP`);
            refreshProfile();
        } catch {
            setCompletedProblems(prev => {
                const newSet = new Set(prev);
                if (wasCompleted) newSet.add(problemMongoId);
                else newSet.delete(problemMongoId);
                return newSet;
            });
            toast.error('Failed to update. Please log in.');
        }
    };



    if (loading) {
        return (
            <div className="min-h-screen pt-24 flex items-center justify-center">
                <div className="w-12 h-12 border-2 border-[#f0997d] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <section className="relative min-h-screen pt-24 pb-12">
            <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Back button */}
                <button
                    onClick={onBack}
                    className="btn-quiet -ml-3 mb-6 text-[0.875rem]"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to dashboard
                </button>

                {/* Header */}
                <div className="mb-8 pb-4 border-b border-[rgba(241,238,234,0.2)]">
                    <h1 className="text-3xl sm:text-4xl font-medium text-[#f1eeea] tracking-[-0.03em] mb-3 flex items-center gap-3">
                        <Target className="w-6 h-6 text-[#f0997d]" />
                        Daily challenges
                    </h1>
                    <p className="text-[0.9375rem] text-[#b6b1ad] leading-relaxed max-w-xl mb-6">
                        Complete today's challenges to maintain your streak and earn bonus XP.
                    </p>

                    {/* Progress indicator — flat surfaces */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-[4px] bg-[#222225] border border-[rgba(241,238,234,0.1)]">
                            <Flame className={`w-4 h-4 ${challengesSolved > 0 ? 'text-[#f0997d]' : 'text-[#8f8a85]'}`} />
                            <span className="text-[#f1eeea] text-[0.8125rem] font-medium tnum">
                                {challengesSolved}/{dailyProblems.length} complete
                            </span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-[4px] bg-[#222225] border border-[rgba(241,238,234,0.1)]">
                            <Zap className="w-4 h-4 text-[#f0997d]" />
                            <span className="text-[#f1eeea] text-[0.8125rem] font-medium tnum">
                                {challengesSolved * SOLVE_XP} XP earned
                            </span>
                        </div>
                    </div>
                </div>

                {/* Completion banner — the status block, used once */}
                {allCompleted && (
                    <div className="status-block w-full mb-8" data-tone="teal">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>All challenges complete — come back tomorrow for new ones.</span>
                    </div>
                )}

                {/* Challenge cards — rows on hairlines */}
                <div className="ruled">
                    {dailyProblems.map((problem, index) => {
                        const isCompleted = completedProblems.has(problem.id);


                        return (
                            <div
                                key={problem.id}
                                className={`row-edge px-3 py-5 row-interactive ${
                                    problem.difficulty === 'Easy'
                                        ? 'edge-easy'
                                        : problem.difficulty === 'Hard'
                                            ? 'edge-hard'
                                            : 'edge-medium'
                                }`}
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-[0.75rem] font-medium text-[#f0997d]">
                                        Challenge {index + 1}
                                    </span>
                                    <span className={`text-[0.75rem] font-medium difficulty-${problem.difficulty.toLowerCase()}`}>
                                        {problem.difficulty}
                                    </span>
                                    {isCompleted && (
                                        <span className="ml-auto text-[0.75rem] font-medium text-[#c8dfd1]">
                                            Solved
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className={`text-[0.9375rem] font-medium mb-2 ${isCompleted ? 'text-[#b6b1ad] line-through' : 'text-[#f1eeea]'}`}>
                                            {problem.title}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                            {(problem.tags || []).slice(0, 4).map((tag: string) => (
                                                <span key={tag} className="text-[0.75rem] text-[#8f8a85]">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 flex-shrink-0">
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
                                        {problem.problem_link && (
                                            <a
                                                href={problem.problem_link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-8 h-8 icon-btn group"
                                                aria-label={`Open ${problem.title}`}
                                            >
                                                <ExternalLink className="w-4 h-4 text-[#8f8a85] group-hover:text-[#f1eeea]" />
                                            </a>
                                        )}
                                        <button
                                            onClick={() => toggleComplete(problem.id)}
                                            className="w-8 h-8 icon-btn"
                                            aria-label={isCompleted ? `Mark ${problem.title} as unsolved` : `Mark ${problem.title} as solved`}
                                            aria-pressed={isCompleted}
                                        >
                                            {isCompleted ? (
                                                <CheckCircle2 className="w-5 h-5 text-[#b1cbbb]" />
                                            ) : (
                                                <Circle className="w-5 h-5 text-[#8f8a85] hover:text-[#f1eeea]" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* XP reward indicator */}
                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[rgba(241,238,234,0.1)]">
                                    <Zap className="w-3.5 h-3.5 text-[#8f8a85]" />
                                    <span className="text-[0.75rem] text-[#8f8a85]">
                                        {isCompleted ? 'Earned' : 'Reward'}: <span className="text-[#f0997d] tnum">+{SOLVE_XP} XP</span>
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Daily refresh notice */}
                <div className="flex items-center justify-center gap-2 mt-8 text-[#8f8a85] text-[0.75rem]">
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Challenges refresh daily at 00:00 UTC</span>
                </div>
            </div>
        </section>
    );
}
