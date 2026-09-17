export type View = 'home' | 'dashboard' | 'topic' | 'path' | 'problems' | 'notes' | 'leaderboard' | 'community' | 'daily-challenges' | 'admin' | 'docs' | 'api' | 'workspace' | 'profile';

/** Views that are harmless to show while the auth session is still resolving. */
const AUTH_INDIFFERENT_VIEWS = ['problems', 'leaderboard', 'community', 'docs', 'api'] as const;

/** Views that require a logged-in user; anonymous visitors are sent home. */
const PROTECTED_VIEWS = ['dashboard', 'notes', 'daily-challenges'] as const;

/**
 * Pure decision table for the hash router. Keeping it out of the effect keeps
 * `App`'s cognitive complexity low and makes routing rules unit-testable.
 */
export function resolveHashRoute(
  hash: string,
  ctx: { user: unknown; isAuthReady: boolean },
): { view: View; selectedTopicId?: string | null; selectedPathId?: string; selectedWorkspaceId?: string; selectedProfileUserId?: string; clearHash?: boolean } {
  if (!hash) {
    return { view: 'home', selectedTopicId: null };
  }

  if (hash.startsWith('path/')) {
    return { view: 'path', selectedPathId: hash.slice(5) };
  }
  if (hash.startsWith('topic/')) {
    return { view: 'topic', selectedTopicId: hash.slice(6) };
  }
  if (hash.startsWith('workspace/')) {
    return { view: 'workspace', selectedWorkspaceId: hash.slice(10) };
  }
  if (hash.startsWith('profile/')) {
    const profileKey = hash.slice(8);
    return { view: 'profile', selectedProfileUserId: profileKey };
  }

  if ((PROTECTED_VIEWS as readonly string[]).includes(hash)) {
    if (ctx.user || !ctx.isAuthReady) return { view: hash as View };
    return { view: 'home', clearHash: true };
  }

  if (hash === 'admin') {
    const isAdmin = Boolean(ctx.user) && (ctx.user as { role?: string })?.role === 'admin';
    if (isAdmin || !ctx.isAuthReady) return { view: 'admin' };
    return { view: 'home', clearHash: true };
  }

  if ((AUTH_INDIFFERENT_VIEWS as readonly string[]).includes(hash)) {
    return { view: hash as View };
  }

  return { view: 'home' };
}
