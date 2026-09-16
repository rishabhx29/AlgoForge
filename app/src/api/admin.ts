import { apiClient } from './apiClient';

// ========== DASHBOARD ==========
export const getAdminStats = async () => {
    const response = await apiClient.get(`/api/admin/stats`);
    return response.data;
};

// ========== USER MANAGEMENT ==========
export const getUsers = async (page = 1, limit = 20, search = '') => {
    const response = await apiClient.get(`/api/admin/users`, {
        params: { page, limit, search }
    });
    return response.data;
};

export const editUser = async (userId: string, updates: Record<string, unknown>) => {
    const response = await apiClient.put(`/api/admin/users/${userId}`, updates);
    return response.data;
};

export const toggleBanUser = async (userId: string) => {
    const response = await apiClient.put(`/api/admin/users/${userId}/ban`, {});
    return response.data;
};

export const deleteUser = async (userId: string) => {
    const response = await apiClient.delete(`/api/admin/users/${userId}`);
    return response.data;
};

// ========== CONTENT MANAGEMENT ==========
export const addProblem = async (problemData: Record<string, unknown>) => {
    const response = await apiClient.post(`/api/admin/problems`, problemData);
    return response.data;
};

export const editProblem = async (problemId: string, updates: Record<string, unknown>) => {
    const response = await apiClient.put(`/api/admin/problems/${problemId}`, updates);
    return response.data;
};

export const deleteProblem = async (problemId: string) => {
    const response = await apiClient.delete(`/api/admin/problems/${problemId}`);
    return response.data;
};

// ========== FORUM MODERATION ==========
export const deleteForumPost = async (postId: string) => {
    const response = await apiClient.delete(`/api/admin/forum/posts/${postId}`);
    return response.data;
};

export const editForumPost = async (postId: string, updates: Record<string, unknown>) => {
    const response = await apiClient.put(`/api/admin/forum/posts/${postId}`, updates);
    return response.data;
};

export const deleteForumReply = async (postId: string, replyId: string) => {
    const response = await apiClient.delete(`/api/admin/forum/posts/${postId}/replies/${replyId}`);
    return response.data;
};
