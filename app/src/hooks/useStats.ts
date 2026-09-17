import { usePublicStats } from '@/hooks/useContent';

/**
 * Landing-page counters (Learners / Problems / Videos / Paths), formatted for
 * display. Backed by the shared react-query cache — Hero and Roadmaps both
 * call this hook but only ONE network request is made per 60s window.
 */
export function useStats() {
    const { data, isLoading } = usePublicStats();

    // Format numbers (e.g. 1.2k)
    const formatCount = (count: number | undefined) => {
        if (count === undefined) return '0';
        if (count >= 1000) return `${(count / 1000).toFixed(1)}K+`;
        return `${count}`;
    };

    return {
        userCount: formatCount(data?.userCount),
        problemCount: formatCount(data?.problemCount),
        videoCount: formatCount(data?.videoCount),
        roadmapCount: data?.roadmapCount !== undefined ? `${data.roadmapCount}` : '0',
        loading: isLoading
    };
}
