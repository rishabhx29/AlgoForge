/**
 * Shared domain types for content + user progress.
 *
 * Single source of truth for API response shapes consumed by
 * Problems / TopicDetail / PathDetail / DailyChallenges / Notes.
 */

/** A single problem as returned by the content API. */
export interface Problem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | string;
  description?: string;
  tags?: string[];
  video_link?: string;
  problem_link?: string;
  topic_id?: string;
}

/** A topic as returned by the content API. */
export interface Topic {
  id: string;
  title: string;
  description?: string;
  color?: string;
}

/** A single row of the user's per-problem progress. */
export interface UserProgressItem {
  problem_id: string;
  status: 'TODO' | 'SOLVED' | 'ATTEMPTED' | string;
  is_bookmarked?: boolean;
  notes?: string;
}

/** Lookup sets derived from raw progress rows (single source of truth). */
export interface ProgressSets {
  completed: Set<string>;
  bookmarked: Set<string>;
  notesMap: Record<string, string>;
}

/** Build lookup sets from raw progress rows. */
export function buildProgressSets(
  progress: UserProgressItem[] | undefined | null
): ProgressSets {
  const completed = new Set<string>();
  const bookmarked = new Set<string>();
  const notesMap: Record<string, string> = {};

  (progress || []).forEach((p) => {
    if (p.status === 'SOLVED') completed.add(p.problem_id);
    if (p.is_bookmarked) bookmarked.add(p.problem_id);
    if (p.notes && p.notes.trim()) notesMap[p.problem_id] = p.notes;
  });

  return { completed, bookmarked, notesMap };
}
