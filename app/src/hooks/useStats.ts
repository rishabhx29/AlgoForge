import { useState, useEffect } from 'react';
import { apiClient } from '@/api/apiClient';

export function useStats() {
    const [userCount, setUserCount] = useState<string>('0');
    const [problemCount, setProblemCount] = useState<string>('0');
    const [videoCount, setVideoCount] = useState<string>('0');
    const [roadmapCount, setRoadmapCount] = useState<string>('0');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await apiClient.get(`/api/info/stats`);
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
        loading
    };
}
