import { describe, expect, it } from 'vitest';
import {
    EMPTY_TEST_CASE,
    executionRequestError,
    formatExecutionResult,
    resolveTestCases,
    type PistonResponse,
} from '../src/utils/executionResult';

const VISIBLE_CASE = { input: '1 2', expectedOutput: '3', isHidden: false };
const HIDDEN_CASE = { input: '9 9', expectedOutput: '18', isHidden: true };

describe('executionRequestError', () => {
    it('accepts valid code and language', () => {
        expect(executionRequestError('print(1)', 'python')).toBeNull();
    });

    it('rejects empty or non-string code/language', () => {
        expect(executionRequestError('', 'python')).toBe('Code and language are required');
        expect(executionRequestError('print(1)', '')).toBe('Code and language are required');
        expect(executionRequestError(null, 'python')).toBe('Code and language are required');
        expect(executionRequestError(42, 'python')).toBe('Code and language are required');
    });

    it('rejects oversized code', () => {
        expect(executionRequestError('a'.repeat(50001), 'python')).toBe('Code exceeds maximum allowed length.');
    });
});

describe('resolveTestCases', () => {
    it('keeps configured test cases', () => {
        expect(resolveTestCases([VISIBLE_CASE])).toEqual([VISIBLE_CASE]);
    });

    it('falls back to a single empty case when none exist', () => {
        expect(resolveTestCases(undefined)).toEqual([EMPTY_TEST_CASE]);
        expect(resolveTestCases(null)).toEqual([EMPTY_TEST_CASE]);
        expect(resolveTestCases([])).toEqual([EMPTY_TEST_CASE]);
    });
});

describe('formatExecutionResult', () => {
    it('marks a passing visible case', () => {
        const data: PistonResponse = { run: { stdout: '3\n', code: 0 } };
        expect(formatExecutionResult(data, VISIBLE_CASE)).toMatchObject({
            input: '1 2',
            expectedOutput: '3',
            stdout: '3\n',
            passed: true,
            isError: false,
            executionTime: 'Success',
        });
    });

    it('marks a failing visible case', () => {
        const data: PistonResponse = { run: { stdout: '4\n', code: 0 } };
        expect(formatExecutionResult(data, VISIBLE_CASE)).toMatchObject({
            passed: false,
            isError: false,
            executionTime: 'Success',
        });
    });

    it('flags non-zero exit codes as errors', () => {
        const data: PistonResponse = { run: { stdout: '', code: 1, stderr: 'boom' } };
        expect(formatExecutionResult(data, VISIBLE_CASE)).toMatchObject({
            passed: false,
            isError: true,
            error: 'boom',
            executionTime: 'Error',
        });
    });

    it('reports timeouts via signal', () => {
        const data: PistonResponse = { run: { code: null, signal: 'SIGKILL' } };
        expect(formatExecutionResult(data, VISIBLE_CASE)).toMatchObject({
            isError: true,
            executionTime: 'Timeout',
        });
    });

    it('redacts hidden case details but signals failure', () => {
        const data: PistonResponse = { run: { stdout: '1\n', code: 0 } };
        expect(formatExecutionResult(data, HIDDEN_CASE)).toMatchObject({
            input: 'Hidden Test Case',
            expectedOutput: 'Hidden',
            output: 'Hidden Test Case Failed',
            stdout: 'Hidden',
            stderr: '',
            error: '',
            passed: false,
        });
    });

    it('keeps the Hidden marker when a hidden case passes', () => {
        const data: PistonResponse = { run: { stdout: '18\n', code: 0 } };
        expect(formatExecutionResult(data, HIDDEN_CASE)).toMatchObject({
            output: 'Hidden',
            passed: true,
        });
    });

    it('surfaces compile errors over run stderr', () => {
        const data: PistonResponse = {
            compile: { stderr: 'compile failed' },
            run: { stderr: 'ignored', code: 1 },
        };
        expect(formatExecutionResult(data, VISIBLE_CASE)).toMatchObject({ error: 'compile failed' });
    });

    it('falls back to the API message when there is no run output', () => {
        const data: PistonResponse = { message: 'quota exceeded' };
        expect(formatExecutionResult(data, VISIBLE_CASE)).toMatchObject({ output: 'quota exceeded' });
    });
});
