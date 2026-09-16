import { describe, it, expect } from 'vitest';
import { buildProgressSets } from '@/lib/types';
import type { UserProgressItem } from '@/lib/types';

describe('buildProgressSets', () => {
  it('returns empty sets for null/undefined input', () => {
    for (const input of [undefined, null, []]) {
      const result = buildProgressSets(input as UserProgressItem[] | null | undefined);
      expect(result.completed.size).toBe(0);
      expect(result.bookmarked.size).toBe(0);
      expect(result.notesMap).toEqual({});
    }
  });

  it('collects solved problems into the completed set', () => {
    const progress: UserProgressItem[] = [
      { problem_id: 'p1', status: 'SOLVED' },
      { problem_id: 'p2', status: 'TODO' },
      { problem_id: 'p3', status: 'ATTEMPTED' },
    ];

    const { completed } = buildProgressSets(progress);

    expect(completed.has('p1')).toBe(true);
    expect(completed.has('p2')).toBe(false);
    expect(completed.has('p3')).toBe(false);
    expect(completed.size).toBe(1);
  });

  it('collects bookmarked problems regardless of status', () => {
    const progress: UserProgressItem[] = [
      { problem_id: 'p1', status: 'SOLVED', is_bookmarked: true },
      { problem_id: 'p2', status: 'TODO', is_bookmarked: true },
      { problem_id: 'p3', status: 'TODO', is_bookmarked: false },
    ];

    const { bookmarked, completed } = buildProgressSets(progress);

    expect(bookmarked.has('p1')).toBe(true);
    expect(bookmarked.has('p2')).toBe(true);
    expect(bookmarked.has('p3')).toBe(false);
    expect(completed.has('p1')).toBe(true);
  });

  it('only keeps notes that are non-empty after trimming', () => {
    const progress: UserProgressItem[] = [
      { problem_id: 'p1', status: 'TODO', notes: 'Use a hash map' },
      { problem_id: 'p2', status: 'TODO', notes: '   ' },
      { problem_id: 'p3', status: 'TODO', notes: '' },
      { problem_id: 'p4', status: 'TODO' },
    ];

    const { notesMap } = buildProgressSets(progress);

    expect(notesMap).toEqual({ p1: 'Use a hash map' });
    expect(Object.keys(notesMap)).toHaveLength(1);
  });

  it('keeps notes verbatim (no trimming of stored content)', () => {
    const progress: UserProgressItem[] = [
      { problem_id: 'p1', status: 'TODO', notes: '  padded  ' },
    ];

    const { notesMap } = buildProgressSets(progress);

    expect(notesMap.p1).toBe('  padded  ');
  });

  it('handles a full mixed payload consistently', () => {
    const progress: UserProgressItem[] = [
      { problem_id: 'a', status: 'SOLVED', is_bookmarked: true, notes: 'n1' },
      { problem_id: 'b', status: 'SOLVED', is_bookmarked: false },
      { problem_id: 'c', status: 'TODO', is_bookmarked: true, notes: 'n2' },
    ];

    const { completed, bookmarked, notesMap } = buildProgressSets(progress);

    expect([...completed].sort()).toEqual(['a', 'b']);
    expect([...bookmarked].sort()).toEqual(['a', 'c']);
    expect(notesMap).toEqual({ a: 'n1', c: 'n2' });
  });
});
