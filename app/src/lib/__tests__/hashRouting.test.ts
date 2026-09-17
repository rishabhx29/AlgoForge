import { describe, expect, it } from 'vitest';
import { resolveHashRoute } from '@/lib/hashRouting';

const ADMIN = { role: 'admin' };
const USER = { role: 'user' };

describe('resolveHashRoute', () => {
  it('routes deep links to their views with selected ids', () => {
    expect(resolveHashRoute('path/arrays', { user: null, isAuthReady: true })).toEqual({
      view: 'path', selectedPathId: 'arrays',
    });
    expect(resolveHashRoute('topic/tw', { user: null, isAuthReady: true })).toEqual({
      view: 'topic', selectedTopicId: 'tw',
    });
    expect(resolveHashRoute('workspace/p9', { user: null, isAuthReady: true })).toEqual({
      view: 'workspace', selectedWorkspaceId: 'p9',
    });
    expect(resolveHashRoute('profile/u_42', { user: null, isAuthReady: true })).toEqual({
      view: 'profile', selectedProfileUserId: 'u_42',
    });
  });

  it('sends guests home from protected views and clears the hash', () => {
    for (const hash of ['dashboard', 'notes', 'daily-challenges']) {
      expect(resolveHashRoute(hash, { user: null, isAuthReady: true })).toEqual({
        view: 'home', clearHash: true,
      });
    }
    expect(resolveHashRoute('dashboard', { user: USER, isAuthReady: true })).toEqual({ view: 'dashboard' });
    expect(resolveHashRoute('notes', { user: null, isAuthReady: false })).toEqual({ view: 'notes' });
  });

  it('guards admin behind the admin role, with the auth-ready exception', () => {
    expect(resolveHashRoute('admin', { user: USER, isAuthReady: true })).toEqual({ view: 'home', clearHash: true });
    expect(resolveHashRoute('admin', { user: ADMIN, isAuthReady: true })).toEqual({ view: 'admin' });
    expect(resolveHashRoute('admin', { user: null, isAuthReady: false })).toEqual({ view: 'admin' });
  });

  it('serves public views without auth and falls back home on unknown hashes', () => {
    for (const hash of ['problems', 'leaderboard', 'community', 'docs', 'api']) {
      expect(resolveHashRoute(hash, { user: null, isAuthReady: true })).toEqual({ view: hash });
    }
    expect(resolveHashRoute('bogus', { user: null, isAuthReady: true })).toEqual({ view: 'home' });
    expect(resolveHashRoute('', { user: null, isAuthReady: true })).toEqual({
      view: 'home', selectedTopicId: null,
    });
  });
});
