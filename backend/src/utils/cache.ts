/**
 * Tiny in-memory TTL cache for hot, rarely-changing data (content catalog,
 * public stats, leaderboard).
 *
 * The backend runs as a single instance on Render, so a plain Map is safe.
 * Every entry is stamped with the DB read that produced it, so a cache hit
 * still serves the exact same response shape — nothing is recomputed or
 * approximated.
 *
 * - getOrSet(key, ttlMs, loader): returns cached value or runs loader once.
 * - In-flight loaders are de-duplicated (a burst of cold requests triggers
 *   exactly one DB round-trip — a thundering-herd guard).
 * - invalidate(prefix): drops entries whose key starts with `prefix`; used by
 *   admin content mutations so edits appear immediately (bounded staleness).
 */

interface Entry<T> {
    value: T;
    expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export async function getOrSet<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const hit = store.get(key) as Entry<T> | undefined;
    if (hit && hit.expiresAt > now) {
        return hit.value;
    }

    // Coalesce concurrent misses onto a single loader run.
    const pending = inflight.get(key) as Promise<T> | undefined;
    if (pending) {
        return pending;
    }

    const promise = (async () => {
        const value = await loader();
        store.set(key, { value, expiresAt: Date.now() + ttlMs });
        return value;
    })();

    inflight.set(key, promise);
    try {
        return await promise;
    } finally {
        inflight.delete(key);
    }
}

/** Drop every cache entry whose key starts with `prefix` (e.g. 'content:'). */
export function invalidate(prefix: string): void {
    for (const key of store.keys()) {
        if (key.startsWith(prefix)) {
            store.delete(key);
        }
    }
}

/** Cache TTLs (ms) shared by controllers. */
export const TTL = {
    /** Static learning content — effectively immutable between admin edits. */
    CONTENT: 5 * 60 * 1000,
    /** Public counters shown on the landing page. */
    STATS: 60 * 1000,
    /** Leaderboard — short TTL so ranks stay fresh but reads stay cheap. */
    LEADERBOARD: 30 * 1000,
} as const;
