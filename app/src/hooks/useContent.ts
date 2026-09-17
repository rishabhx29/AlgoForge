import { useQuery } from '@tanstack/react-query';
import { getHomeContent, getLearningPaths, getAllProblems, getAllTopics, type HomeContent } from '@/api/content';
import { apiClient } from '@/api/apiClient';

/**
 * Shared content-catalog query. Every section that needs paths/topics/problems
 * (Hero, Roadmaps, UserHero, Problems, Dashboard) subscribes to the SAME cache
 * entry, so the catalog is fetched exactly once per session and every following
 * mount renders instantly from cache.
 *
 * The backend serves this from its own 5-minute catalog cache, so a refetch is
 * also cheap server-side.
 */
export const HOME_CONTENT_KEY = ['home-content'] as const;

export function useHomeContent() {
    return useQuery<HomeContent>({
        queryKey: HOME_CONTENT_KEY,
        queryFn: getHomeContent,
        staleTime: 10 * 60 * 1000, // content only changes via admin edits
        gcTime: 60 * 60 * 1000,    // keep warm for the whole session
    });
}

/** Public landing-page counters (users / problems / videos / paths). */
export const STATS_KEY = ['public-stats'] as const;

interface PublicStats {
    userCount: number;
    problemCount: number;
    roadmapCount: number;
    videoCount: number;
}

/** localStorage key for the last-known stats payload (stale-while-revalidate). */
const STATS_STORAGE_KEY = 'algoforge:public-stats';

/**
 * Read the last-known stats from localStorage so the landing-page counters can
 * render INSTANTLY on every visit after the first, before any network I/O.
 * The background refetch then silently updates them if they changed.
 *
 * Returns the parsed payload plus the epoch-ms timestamp it was stored at
 * (used as initialDataUpdatedAt so staleTime arithmetic stays correct).
 * Defensive: a corrupted / tampered entry or a privacy-mode quota error must
 * never break the app — we just fall back to "no initial data".
 */
export function readCachedStats(): { data: PublicStats; updatedAt: number } | undefined {
    try {
        const raw = localStorage.getItem(STATS_STORAGE_KEY);
        if (!raw) return undefined;
        const parsed = JSON.parse(raw) as { v?: PublicStats; t?: number };
        const v = parsed.v;
        if (
            parsed.t === undefined ||
            typeof v?.userCount !== 'number' ||
            typeof v?.problemCount !== 'number' ||
            typeof v?.roadmapCount !== 'number' ||
            typeof v?.videoCount !== 'number'
        ) {
            return undefined;
        }
        return { data: v, updatedAt: parsed.t };
    } catch {
        return undefined;
    }
}

/** Persist a fresh stats payload for the next visit's instant render. */
export function writeCachedStats(data: PublicStats): void {
    try {
        localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify({ v: data, t: Date.now() }));
    } catch {
        // Storage full / disabled (private mode) — the hook still works, the
        // next visit just loses the instant render. Not worth surfacing.
    }
}

export function usePublicStats() {
    // Hydrate synchronously from localStorage so the counters are painted on
    // the very first render — the network fetch only refreshes them.
    const cached = readCachedStats();
    return useQuery<PublicStats>({
        queryKey: STATS_KEY,
        queryFn: async () => {
            const res = await apiClient.get('/api/info/stats');
            writeCachedStats(res.data);
            return res.data;
        },
        initialData: cached?.data,
        initialDataUpdatedAt: cached?.updatedAt,
        staleTime: 60 * 1000,
    });
}

/** Warms the shared caches in the background right after app mount. */
export function prefetchAppData(queryClient: {
    prefetchQuery: (opts: { queryKey: readonly unknown[]; queryFn: () => Promise<unknown> }) => Promise<void>;
}) {
    void queryClient.prefetchQuery({ queryKey: HOME_CONTENT_KEY, queryFn: getHomeContent });
    void queryClient.prefetchQuery({ queryKey: STATS_KEY, queryFn: async () => (await apiClient.get('/api/info/stats')).data });
}

// Re-exported so existing imports of the single-endpoint fetchers keep working;
// they now all hit the same cached catalog server-side.
export { getLearningPaths, getAllProblems, getAllTopics };
