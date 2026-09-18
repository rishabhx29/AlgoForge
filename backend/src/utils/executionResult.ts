/**
 * Normalizes Piston (emkc.org) code-execution responses into the API result
 * shape, including redaction of hidden test-case details.
 */

/** Maximum accepted source-code length for /execute. */
export const MAX_CODE_LENGTH = 50000;

interface PistonStage {
    output?: string;
    stdout?: string;
    stderr?: string;
    signal?: string | null;
    code?: number | null;
}

export interface PistonResponse {
    run?: PistonStage;
    compile?: PistonStage;
    message?: string;
}

export interface ExecutionTestCase {
    input: string;
    expectedOutput: string;
    isHidden: boolean;
}

/** Test case used to simply run submitted code when none are configured. */
export const EMPTY_TEST_CASE: ExecutionTestCase = { input: '', expectedOutput: '', isHidden: false };

/**
 * Returns the validation error message for an /execute request body,
 * or null when the request is acceptable.
 */
export function executionRequestError(
    code: unknown,
    language: unknown,
): string | null {
    if (typeof code !== 'string' || typeof language !== 'string' || !code || !language) {
        return 'Code and language are required';
    }
    if (code.length > MAX_CODE_LENGTH) {
        return 'Code exceeds maximum allowed length.';
    }
    return null;
}

/** Falls back to a single empty test case when a problem has none configured. */
export function resolveTestCases(
    testCases: ExecutionTestCase[] | undefined | null,
): ExecutionTestCase[] {
    return testCases && testCases.length > 0 ? testCases : [EMPTY_TEST_CASE];
}

function executionStatus(run: PistonStage | undefined): string {
    if (run?.signal) return 'Timeout';
    if (run?.code === 0) return 'Success';
    return 'Error';
}

/** Normalize one Piston response against one test case, redacting hidden details. */
export function formatExecutionResult(data: PistonResponse, testCase: ExecutionTestCase) {
    const output = data.run?.output || data.message || 'No output';
    const stdout = data.run?.stdout || '';
    const stderr = data.run?.stderr || '';
    const error = data.compile?.stderr || stderr;
    const isError = Boolean(data.run?.signal) || data.run?.code !== 0;
    const passed = !isError && stdout.trim() === testCase.expectedOutput.trim();

    const result = {
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        output,
        stdout,
        stderr,
        error,
        passed,
        isError,
        executionTime: executionStatus(data.run),
        isHidden: testCase.isHidden,
    };
    if (!testCase.isHidden) return result;

    const hiddenError = error ? 'Hidden Error' : '';
    return {
        ...result,
        input: 'Hidden Test Case',
        expectedOutput: 'Hidden',
        output: passed ? 'Hidden' : 'Hidden Test Case Failed',
        stdout: 'Hidden',
        stderr: hiddenError,
        error: hiddenError,
    };
}
