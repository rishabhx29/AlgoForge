import { apiClient } from './apiClient';

/**
 * Fetches all available learning paths from the backend.
 *
 * @returns A promise resolving to an array of learning path objects.
 */
export const getLearningPaths = async () => {
    const response = await apiClient.get(`/api/content/paths`);
    return response.data;
};

/**
 * Fetches all topics belonging to a specific learning path.
 *
 * @param pathId - The slug/ID of the learning path.
 * @returns A promise resolving to an array of topic objects for the given path.
 */
export const getTopicsByPath = async (pathId: string) => {
    const response = await apiClient.get(`/api/content/paths/${pathId}/topics`);
    return response.data;
};

/**
 * Fetches a single topic by its ID (slug).
 *
 * @param topicId - The slug/ID of the topic.
 * @returns A promise resolving to the topic object.
 */
export const getTopicById = async (topicId: string) => {
    const response = await apiClient.get(`/api/content/topics/${topicId}`);
    return response.data;
};

/**
 * Fetches all problems belonging to a specific topic.
 *
 * @param topicId - The slug/ID of the topic.
 * @returns A promise resolving to an array of problem objects for the given topic.
 */
export const getProblemsByTopic = async (topicId: string) => {
    const response = await apiClient.get(`/api/content/topics/${topicId}/problems`);
    return response.data;
};

/**
 * Fetches every problem in the system, ordered by index.
 *
 * @returns A promise resolving to an array of all problem objects.
 */
export const getAllProblems = async () => {
    const response = await apiClient.get(`/api/content/problems`);
    return response.data;
};

/**
 * Fetches all topics across all learning paths.
 *
 * @returns A promise resolving to an array of all topic objects.
 */
export const getAllTopics = async () => {
    const response = await apiClient.get(`/api/content/topics`);
    return response.data;
};

/**
 * Fetches a single problem by its unique ID.
 *
 * @param id - The unique identifier of the problem.
 * @returns A promise resolving to the problem object.
 */
export const getProblemById = async (id: string) => {
    const response = await apiClient.get(`/api/content/problems/${id}`);
    return response.data;
};

/**
 * Submits user code for a given problem to the backend execution service and
 * returns the test-case results.
 *
 * @param id       - The unique identifier of the problem to execute against.
 * @param code     - The source code string to execute.
 * @param language - The programming language identifier (e.g. 'javascript', 'python').
 * @returns A promise resolving to the execution result, including per-test-case outcomes.
 */
export const executeCode = async (id: string, code: string, language: string) => {
    const response = await apiClient.post(`/api/content/problems/${id}/execute`, {
        code,
        language
    });
    return response.data;
};
