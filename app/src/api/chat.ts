import { apiClient } from './apiClient';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export const sendChatMessage = async (
    message: string,
    history: ChatMessage[],
    token: string
): Promise<string> => {
    const response = await apiClient.post(
        `/api/chat`,
        { message, history },
        {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        }
    );
    return response.data.reply;
};
