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
 * The content API returns each problem's topic as `topic_slug`, while every
 * consumer in the app keys topics by `id` (the topic's slug is its id — see
 * `Topic.slug @map("id")`). Normalising here, at the single boundary, keeps
 * that contract in one place: callers can keep filtering on `topic_id`.
 *
 * Without this, `problem.topic_id` is `undefined` and every topic join in the
 * dashboard, profile and problem list silently matches nothing — which reads
 * as "0 of 0 solved" rather than as an error.
 *
 * Typed as `any` on purpose: these endpoints have never been typed, and this
 * fix must not change the contract its callers compile against.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const withTopicId = (problem: any): any => {
    const slug = problem?.topic_slug;
    if (typeof slug === 'string' && !problem.topic_id) {
        return { ...problem, topic_id: slug };
    }
    return problem;
};

/**
 * Fetches all problems belonging to a specific topic.
 *
 * @param topicId - The slug/ID of the learning topic.
 * @returns A promise resolving to an array of problem objects for the given topic.
 */
export const getProblemsByTopic = async (topicId: string) => {
    const response = await axios.get(`${API_BASE_URL}/api/content/topics/${topicId}/problems`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (response.data as any[]).map(withTopicId);
};

/**
 * Fetches every problem in the system, ordered by index.
 *
 * @returns A promise resolving to an array of all problem objects.
 */
export const getAllProblems = async () => {
    const response = await axios.get(`${API_BASE_URL}/api/content/problems`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (response.data as any[]).map(withTopicId);
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
