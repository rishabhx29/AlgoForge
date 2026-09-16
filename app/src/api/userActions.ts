import { apiClient } from './apiClient';

export const updateProblemStatus = async (problemId: string, status: 'TODO' | 'SOLVED' | 'ATTEMPTED') => {
    const response = await apiClient.post(`/api/user-actions/problems/${problemId}/status`, { status });
    return response.data;
};

export const toggleBookmark = async (problemId: string) => {
    const response = await apiClient.post(`/api/user-actions/problems/${problemId}/bookmark`, {});
    return response.data;
};

export const updateNotes = async (problemId: string, notes: string) => {
    const response = await apiClient.put(`/api/user-actions/problems/${problemId}/notes`, { notes });
    return response.data;
};

export const getDashboardStats = async () => {
    const response = await apiClient.get(`/api/users/dashboard-stats`);
    return response.data;
};

export const getUserProgress = async () => {
    const response = await apiClient.get(`/api/user-actions/progress`);
    return response.data;
};

export const getMyRank = async (): Promise<{ rank: number }> => {
    const response = await apiClient.get(`/api/users/leaderboard/me`);
    return response.data;
};

