import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export function useStats() {
    const [userCount, setUserCount] = useState<string>('0');
    const [problemCount, setProblemCount] = useState<string>('0');
    const [videoCount, setVideoCount] = useState<string>('0');
    const [roadmapCount, setRoadmapCount] = useState<string>('0');
    const [loading, setLoading] = useState(true);

    /**
     * `loaded` is true only once a fetch has actually succeeded.
     *
     * This exists because the counts start at the string '0', and consumers that
     * render them directly would show "0 problems" during the request — and for
     * good, if it fails. On a landing page that reads as "this site is empty",
     * which is worse than showing nothing. Render a placeholder until this is
     * true, rather than a number that is not yet known.
     */
    const [loaded, setLoaded] = useState(false);

    /* Raw values alongside the formatted ones. The formatted strings are for
     * display ("1.2K+"); anything that needs to compute with a count — a
     * proportion, a comparison — must use the number. */
    const [rawUserCount, setRawUserCount] = useState(0);
    const [rawProblemCount, setRawProblemCount] = useState(0);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/info/stats`);
                const data = res.data;

                // Format numbers (e.g. 1.2k)
                const formatCount = (count: number) => {
                    if (count >= 1000) return `${(count / 1000).toFixed(1)}K+`;
                    return `${count}`;
                };

                setUserCount(formatCount(data.userCount));
                setProblemCount(formatCount(data.problemCount));
                setVideoCount(formatCount(data.videoCount));
                setRoadmapCount(`${data.roadmapCount}`);
                setRawUserCount(Number(data.userCount) || 0);
                setRawProblemCount(Number(data.problemCount) || 0);
                setLoaded(true);
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    return {
        userCount,
        problemCount,
        videoCount,
        roadmapCount,
        loading,
        loaded,
        rawUserCount,
        rawProblemCount
    };
}
