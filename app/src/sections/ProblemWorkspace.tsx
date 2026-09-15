import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Play,
  CheckCircle2,
  ChevronDown,
  Moon,
  Sun,
  Monitor,
  Trash2,
  ExternalLink,
  Youtube,
  Check
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { getProblemById, executeCode } from '@/api/content';
import { updateProblemStatus, getUserProgress } from '@/api/userActions';
import { useAuth } from '@/contexts/AuthContext';
import { ProblemDescription } from '@/components/custom/ProblemDescription';
import { toast } from 'sonner';

interface ProblemWorkspaceProps {
  problemId: string;
  onBack: () => void;
}

const SUPPORTED_LANGUAGES = [
  { id: 'javascript', name: 'JavaScript' },
  { id: 'python', name: 'Python' },
  { id: 'cpp', name: 'C++' },
  { id: 'java', name: 'Java' }
];

/**
 * ProblemWorkspace renders a full IDE-like workspace for a given coding problem.
 * It fetches the problem by ID, manages per-language code state in localStorage,
 * handles code execution via the backend, and allows submission.
 *
 * @param problemId - The unique identifier of the problem to load.
 * @param onBack    - Callback invoked when the user navigates back to the problem list.
 */
export function ProblemWorkspace({ problemId, onBack }: ProblemWorkspaceProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [problem, setProblem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState<string>('// Write your code here');
  const [language, setLanguage] = useState<string>('javascript');
  const [theme, setTheme] = useState<'vs-dark' | 'light'>('vs-dark');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSolved, setIsSolved] = useState(false);
  const consoleRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        setLoading(true);
        const data = await getProblemById(problemId);
        setProblem(data);
      } catch {
        toast.error('Failed to load problem');
      } finally {
        setLoading(false);
      }
    };

    fetchProblem();
  }, [problemId]);

  /* Whether this problem is already solved. The workspace previously gave no
   * indication either way, so opening a finished problem looked identical to
   * opening a new one. Read from UserProgress, which is the authoritative
   * record — `User.solvedProblems` is a stale denormalisation. */
  useEffect(() => {
    let cancelled = false;
    const checkSolved = async () => {
      if (!user) {
        setIsSolved(false);
        return;
      }
      try {
        const progress = await getUserProgress();
        if (cancelled) return;
        setIsSolved(
          Array.isArray(progress) &&
            progress.some((p: any) => p.problem_id === problemId && p.status === 'SOLVED')
        );
      } catch {
        if (!cancelled) setIsSolved(false);
      }
    };
    checkSolved();
    return () => {
      cancelled = true;
    };
  }, [user, problemId]);

  useEffect(() => {
    // Load saved code from local storage
    const savedCode = localStorage.getItem(`code_${problemId}_${language}`);
    if (savedCode) {
      setCode(savedCode);
    } else {
      // Provide some boilerplate based on language
      const boilerplate: Record<string, string> = {
        javascript: `function solve() {\n  // Your code here\n}\n`,
        python: `def solve():\n    # Your code here\n    pass\n`,
        cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code here\n    return 0;\n}\n`,
        java: `public class Main {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}\n`,
      };
      setCode(boilerplate[language] || '// Write your code here');
    }
  }, [problemId, language]);
  useEffect(() => {
    consoleRef.current?.scrollTo({
      top: consoleRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [executionResult]);

  /**
   * Handles Monaco editor content changes, updating local state and
   * persisting the code to localStorage keyed by problem ID and language.
   *
   * @param value - The new editor content, or undefined if the editor is unmounted.
   */
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
      localStorage.setItem(`code_${problemId}_${language}`, value);
    }
  };

  /**
   * Sends the current editor code to the backend for execution and updates
   * the console output with the results.
   *
   * @returns The execution result object on success, or an error object on failure.
   */
  const handleClearConsole = () => {
  setExecutionResult(null);
  setIsExecuting(false);
};
  const handleRunCode = async () => {
    if (!code.trim()) {
      toast.error('Code cannot be empty');
      return;
    }

    setExecutionResult(null);
    setIsExecuting(true);

    try {
      const result = await executeCode(problemId, code, language);
      setExecutionResult(result);
      return result;
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      const errRes = { error: `Execution failed: ${error.message || 'Server error'}` };
      setExecutionResult(errRes);
      toast.error('Failed to execute code');
      return errRes;
    } finally {
      setIsExecuting(false);
    }
  };

  /**
   * Runs the current code and, if all test cases pass, marks the problem as
   * SOLVED by calling the user-actions API. Silently ignores auth errors so
   * unauthenticated users can still test their code.
   */
  const handleSubmit = async () => {
    const res = await handleRunCode();
    if (res?.success && res?.allPassed) {
      setIsSolved(true);
      toast.success('All test cases passed! (Submission saved)');
      try {
        await updateProblemStatus(problemId, 'SOLVED');
      } catch {
        // silently fail if not logged in or other issues
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 text-[#b6b1ad] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-[#f0997d] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="min-h-screen pt-24 pb-12 text-[#b6b1ad] flex items-center justify-center flex-col">
        <p className="mb-4">Problem not found.</p>
        <button onClick={onBack} className="text-[#f0997d] hover:underline">Go Back</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen md:h-screen bg-[#19191b] pt-[72px]">
      {/* Top Navbar for Workspace */}
      <div className="h-14 border-b border-[rgba(241,238,234,0.1)] flex items-center justify-between px-4 bg-[#19191b] z-10 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            aria-label="Back to problem list"
            className="p-2 hover:bg-[#2c2b30] rounded-[4px] text-[#b6b1ad] hover:text-[#f1eeea] transition-colors duration-[var(--af-dur-fast)] flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline text-[0.875rem]">Back</span>
          </button>
          <div className="h-4 w-px bg-[rgba(241,238,234,0.2)]" />
          <h2 className="text-[#f1eeea] font-medium truncate max-w-[200px] sm:max-w-md">{problem.title}</h2>
          <span className={`px-2 py-0.5 rounded-[4px] text-[0.75rem] font-medium difficulty-${problem.difficulty.toLowerCase()}`}>
            {problem.difficulty}
          </span>
          {/* Solved state belongs in the header: opening a finished problem
              should not look identical to opening a new one. */}
          {isSolved && (
            <span
              className="hidden sm:flex items-center gap-1.5 text-[0.75rem] text-[#c8dfd1]"
              title="You have solved this problem"
            >
              <Check className="w-3.5 h-3.5" />
              Solved
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunCode}
            disabled={isExecuting}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-[4px] border border-[rgba(241,238,234,0.1)] text-[0.875rem] transition-colors duration-[var(--af-dur-fast)] ${isExecuting ? 'bg-[#2c2b30] text-[#8f8a85] cursor-not-allowed' : 'bg-[#222225] hover:bg-[#2c2b30] text-[#b6b1ad] hover:text-[#f1eeea]'
              }`}
          >
            {isExecuting ? (
              <div className="w-4 h-4 border-2 border-[#8f8a85] border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">{isExecuting ? 'Running' : 'Run code'}</span>
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-4 py-1.5 rounded-[4px] bg-[#f0997d] hover:bg-[#ffb197] text-[#19191b] transition-colors duration-[var(--af-dur-fast)] text-[0.875rem] font-medium"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Submit</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Area.
          Below md the two panes STACK, so the container must scroll rather than
          be pinned to one viewport — otherwise the editor is squeezed to zero
          height and there is nowhere to write code on a phone. */}
      <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden">
        {/* Left Panel: Problem Description */}
        <div className="w-full md:w-1/2 lg:w-[45%] xl:w-[40%] flex flex-col border-b md:border-b-0 md:border-r border-[rgba(241,238,234,0.1)] md:overflow-hidden bg-[#19191b] max-h-[50vh] md:max-h-none">
          <div className="h-10 border-b border-[rgba(241,238,234,0.1)] flex items-center px-4 bg-[#222225] shrink-0">
            <span className="text-[#b6b1ad] text-[0.875rem] font-medium">Description</span>
          </div>
          <div className="flex-1 overflow-y-auto p-6 scrollbar-custom">
            <h1 className="font-display text-[1.5rem] text-[#f1eeea] tracking-[-0.02em] mb-3">
              {problem.title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-6">
              <span className={`text-[0.75rem] font-medium difficulty-${problem.difficulty.toLowerCase()}`}>
                {problem.difficulty}
              </span>
              {(problem.tags || []).length > 0 && (
                <span className="text-[0.75rem] text-[#3a393e]" aria-hidden="true">
                  ·
                </span>
              )}
              {(problem.tags || []).map((tag: string) => (
                <span key={tag} className="text-[0.75rem] text-[#8f8a85]">
                  {tag}
                </span>
              ))}
            </div>

            {/* The statement's own structure — labels, bullets, examples —
                rather than pre-wrapped plain text. This is the surface where
                the text IS the task, so losing its shape costs the most here. */}
            <ProblemDescription text={problem.description} />

            {/* Reference links. The problem list offered these; the workspace,
                where you are actually solving, did not. */}
            {(problem.problem_link || problem.video_link) && (
              <div className="flex flex-wrap gap-2 mt-7 pt-5 border-t border-[rgba(241,238,234,0.1)]">
                {problem.problem_link && (
                  <a
                    href={problem.problem_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[4px] border border-[rgba(241,238,234,0.1)] text-[0.75rem] text-[#b6b1ad] hover:text-[#f1eeea] hover:bg-[#2c2b30] transition-colors duration-[var(--af-dur-fast)]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Original problem
                  </a>
                )}
                {problem.video_link && (
                  <a
                    href={problem.video_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[4px] border border-[rgba(241,238,234,0.1)] text-[0.75rem] text-[#b6b1ad] hover:text-[#f1eeea] hover:bg-[#2c2b30] transition-colors duration-[var(--af-dur-fast)]"
                  >
                    <Youtube className="w-3.5 h-3.5" />
                    Watch a walkthrough
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Editor and Console */}
        <div className="w-full md:flex-1 flex flex-col min-h-0">
          {/* Editor Header */}
          <div className="h-10 border-b border-[rgba(241,238,234,0.1)] flex items-center justify-between px-4 bg-[#222225] shrink-0">
            <div className="flex items-center gap-2">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                aria-label="Language"
                className="bg-transparent text-[#b6b1ad] text-[0.875rem] focus:outline-none cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map(lang => (
                  <option key={lang.id} value={lang.id} className="bg-[#222225]">
                    {lang.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-[#8f8a85]" />
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setTheme(theme === 'vs-dark' ? 'light' : 'vs-dark')}
                aria-label="Toggle editor theme"
                className="text-[#b6b1ad] hover:text-[#f1eeea] transition-colors duration-[var(--af-dur-fast)]"
                title="Toggle Theme"
              >
                {theme === 'vs-dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Editor Area.
              A DEFINITE height on mobile, not a min-height: Monaco renders with
              `height="100%"`, and a percentage height resolves against the
              parent's `height` — `min-height` does not establish one, so the
              editor collapsed to 5px. Desktop keeps the flex behaviour, where
              `h-screen` already supplies a definite height up the chain. */}
          <div className="h-[380px] md:h-auto md:flex-1 md:min-h-0 bg-[#1e1e1e]">
            <Editor
              height="100%"
              language={language}
              theme={theme}
              value={code}
              onChange={handleEditorChange}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                padding: { top: 16, bottom: 16 },
                fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
              }}
              loading={<div className="text-[#8f8a85] p-4">Loading editor...</div>}
            />
          </div>

          {/* Console / Output Area */}
          <div className="h-[200px] xl:h-[250px] border-t border-[rgba(241,238,234,0.1)] flex flex-col shrink-0 bg-[#19191b]">
            <div className="h-10 border-b border-[rgba(241,238,234,0.1)] flex items-center justify-between px-4 bg-[#222225] shrink-0">
              <div className="flex items-center">
                <Monitor className="w-4 h-4 text-[#b6b1ad] mr-2" />
                <span className="text-[#b6b1ad] text-[0.875rem] font-medium">Console output</span>
              </div>

              <button
                onClick={handleClearConsole}
                aria-label="Clear console output"
                className="flex items-center gap-1 text-[0.75rem] text-[#8f8a85] hover:text-[#f1eeea] transition-colors duration-[var(--af-dur-fast)]"
                title="Clear console output"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            </div>
            <div
              ref={consoleRef}
              className="min-h-[120px] overflow-y-auto p-4 font-mono text-[0.8125rem] text-[#b6b1ad] whitespace-pre-wrap"
              >
            
              {isExecuting && 'Running...'}
              {!isExecuting && !executionResult && (
               <div className="text-[#8f8a85]">Execute code to see output here.</div>
               )}
              {!isExecuting && executionResult?.error && (
              <span className="text-[#d98a76]">{executionResult.error}</span>
              )}
              {executionResult?.success && (
                <div className="space-y-4">
                  <div className="status-block" data-tone={executionResult.allPassed ? 'teal' : 'danger'}>
                    {executionResult.allPassed ? 'All test cases passed' : 'Some test cases failed'}
                  </div>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {executionResult.results.map((res: any, idx: number) => (
                    <div
                      key={idx}
                      className="state-row py-3 border-t border-[rgba(241,238,234,0.1)]"
                      data-state={res.passed ? 'passed' : 'failed'}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-[#f1eeea] tnum">Test case {idx + 1}</span>
                        <span className="text-[0.75rem] font-medium tnum">
                          {res.passed ? 'Passed' : 'Failed'}
                        </span>
                      </div>
                      {!res.isHidden && (
                        <div className="space-y-2 text-[0.75rem]">
                          <div><span className="text-[#8f8a85]">Input:</span> <span className="text-[#f1eeea]">{res.input}</span></div>
                          <div><span className="text-[#8f8a85]">Expected:</span> <span className="text-[#f1eeea]">{res.expectedOutput}</span></div>
                          <div><span className="text-[#8f8a85]">Actual:</span> <span className={res.passed ? 'text-[#c8dfd1]' : 'text-[#d98a76]'}>{res.stdout || res.output}</span></div>
                          {res.error && <div><span className="text-[#d98a76]">Error: {res.error}</span></div>}
                        </div>
                      )}
                      {res.isHidden && (
                        <div className="text-[0.75rem] text-[#8f8a85] italic">Hidden test case</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
