import { apiClient } from './apiClient';

export interface ForumPostSummary {
    id: string;
    title: string;
    content: string; // snippet
    category: string;
    tags: string[];
    likes: string[];
    likesCount: number;
    repliesCount: number;
    isPinned: boolean;
    createdAt: string;
    updatedAt: string;
    authorInfo: {
        id: string;
        name: string;
        avatar?: string;
    };
}

export interface ForumReply {
    id: string;
    content: string;
    author: {
        id: string;
        name: string;
        avatar?: string;
    };
    likes: string[];
    createdAt: string;
}

export interface ForumPostFull {
    id: string;
    title: string;
    content: string;
    category: string;
    tags: string[];
    likes: string[];
    replies: ForumReply[];
    isPinned: boolean;
    createdAt: string;
    updatedAt: string;
    author: {
        id: string;
        name: string;
        avatar?: string;
    };
}

export interface PostsResponse {
    posts: ForumPostSummary[];
    totalPages: number;
    currentPage: number;
    total: number;
}

export const getPosts = async (
    category?: string,
    sort?: string,
    page?: number
): Promise<PostsResponse> => {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.append('category', category);
    if (sort) params.append('sort', sort);
    if (page) params.append('page', page.toString());

    const response = await apiClient.get(`/api/forum?${params.toString()}`);
    return response.data;
};

export const getPost = async (id: string): Promise<ForumPostFull> => {
    const response = await apiClient.get(`/api/forum/${id}`);
    return response.data;
};

export const createPost = async (data: {
    title: string;
    content: string;
    category: string;
    tags?: string[];
}): Promise<ForumPostFull> => {
    const response = await apiClient.post(`/api/forum`, data);
    return response.data;
};

export const addReply = async (postId: string, content: string): Promise<ForumPostFull> => {
    const response = await apiClient.post(
        `/api/forum/${postId}/reply`,
        { content }
    );
    return response.data;
};

export const togglePostLike = async (postId: string) => {
    const response = await apiClient.post(
        `/api/forum/${postId}/like`,
        {}
    );
    return response.data;
};

export const toggleReplyLike = async (postId: string, replyId: string) => {
    const response = await apiClient.post(
        `/api/forum/${postId}/replies/${replyId}/like`,
        {}
    );
    return response.data;
};
