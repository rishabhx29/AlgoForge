import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/**
 * Fetches all available learning paths from the backend.
 *
 * @returns A promise resolving to an array of learning path objects.
 */
export const getLearningPaths = async () => {
    const response = await axios.get(`${API_BASE_URL}/api/content/paths`);
    return response.data;
};

/**
 * Fetches all topics belonging to a specific learning path.
 *
 * @param pathId - The slug/ID of the learning path.
 * @returns A promise resolving to an array of topic objects for the given path.
 */
export const getTopicsByPath = async (pathId: string) => {
    const response = await axios.get(`${API_BASE_URL}/api/content/paths/${pathId}/topics`);
    return response.data;
};

/**
 * Fetches a single topic by its ID (slug).
 *
 * @param topicId - The slug/ID of the topic.
 * @returns A promise resolving to the topic object.
 */
export const getTopicById = async (topicId: string) => {
    const response = await axios.get(`${API_BASE_URL}/api/content/topics/${topicId}`);
    return response.data;
};

/**
 * Fetches all problems belonging to a specific topic.
 *
 * @param topicId - The slug/ID of the topic.
 * @returns A promise resolving to an array of problem objects for the given topic.
 */
export const getProblemsByTopic = async (topicId: string) => {
    const response = await axios.get(`${API_BASE_URL}/api/content/topics/${topicId}/problems`);
    return response.data;
};

export const getAllProblems = async (page: number = 1, limit: number = 20) => {
    const response = await axios.get(`${API_BASE_URL}/api/content/problems?page=${page}&limit=${limit}`);
    return response.data;
};

/**
 * Fetches all topics across all learning paths.
 *
 * @returns A promise resolving to an array of all topic objects.
 */
export const getAllTopics = async () => {
    const response = await axios.get(`${API_BASE_URL}/api/content/topics`);
    return response.data;
};

/**
 * Fetches a single problem by its unique ID.
 *
 * @param id - The unique identifier of the problem.
 * @returns A promise resolving to the problem object.
 */
export const getProblemById = async (id: string) => {
    const response = await axios.get(`${API_BASE_URL}/api/content/problems/${id}`);
    return response.data;
};

/**
 * Retrieves the Authorization header object using the JWT token stored in
 * localStorage. Used to authenticate code-execution requests.
 *
 * @returns An axios config object containing the Authorization header.
 */
const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
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
    const response = await axios.post(`${API_BASE_URL}/api/content/problems/${id}/execute`, {
        code,
        language
    }, getAuthHeader());
    return response.data;
};
