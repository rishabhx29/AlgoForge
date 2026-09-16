import { describe, it, expect } from 'vitest';
import { createPostSchema, TITLE_MAX, CONTENT_MAX } from '@/lib/validators';

describe('createPostSchema', () => {
  const valid = {
    title: 'How do I approach dynamic programming?',
    content: 'I keep failing at DP problems. What is a reliable way to find the subproblem?',
    category: 'general',
  };

  it('accepts a well-formed post', () => {
    const result = createPostSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('defaults the category when omitted', () => {
    const { category, ...withoutCategory } = valid;
    void category;

    const result = createPostSchema.safeParse(withoutCategory);

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.category).toBe('general');
  });

  it('rejects titles shorter than 10 characters', () => {
    const result = createPostSchema.safeParse({ ...valid, title: 'Too short' });
    expect(result.success).toBe(false);
  });

  it('rejects titles longer than the max', () => {
    const result = createPostSchema.safeParse({
      ...valid,
      title: 'a'.repeat(TITLE_MAX + 1),
    });
    expect(result.success).toBe(false);
  });

  it('rejects content shorter than 20 characters', () => {
    const result = createPostSchema.safeParse({ ...valid, content: 'too short' });
    expect(result.success).toBe(false);
  });

  it('rejects content longer than the max', () => {
    const result = createPostSchema.safeParse({
      ...valid,
      content: 'a'.repeat(CONTENT_MAX + 1),
    });
    expect(result.success).toBe(false);
  });

  it('trims whitespace before length validation', () => {
    // 10 chars of padding around a 5-char title must still fail the min(10).
    const result = createPostSchema.safeParse({ ...valid, title: '     abcde     ' });
    expect(result.success).toBe(false);
  });

  it('rejects empty title and content', () => {
    expect(createPostSchema.safeParse({ ...valid, title: '' }).success).toBe(false);
    expect(createPostSchema.safeParse({ ...valid, content: '' }).success).toBe(false);
  });

  it('returns field-level error messages', () => {
    const result = createPostSchema.safeParse({ title: 'short', content: 'short', category: 'general' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('title');
      expect(paths).toContain('content');
    }
  });
});
