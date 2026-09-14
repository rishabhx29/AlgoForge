import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, CheckCircle2, ChevronDown, Moon, Sun, Monitor, Trash2 } from 'lucide-react';
import Editor, { BeforeMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { getProblemById, executeCode } from '@/api/content';
import { updateProblemStatus } from '@/api/userActions';
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

const ALGOFORGE_DARK_THEME: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', foreground: 'e0e0e0', background: '141414' },
    { token: 'comment', foreground: '4a4a6a', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'a088ff' },
    { token: 'keyword.control', foreground: 'a088ff' },
    { token: 'keyword.operator', foreground: 'a088ff' },
    { token: 'string', foreground: '63e3ff' },
    { token: 'string.escape', foreground: '63e3ff' },
    { token: 'number', foreground: 'ff8a63' },
    { token: 'number.float', foreground: 'ff8a63' },
    { token: 'type', foreground: '63e3ff' },
    { token: 'type.identifier', foreground: '63e3ff' },
    { token: 'identifier', foreground: 'e0e0e0' },
    { token: 'delimiter', foreground: '888888' },
    { token: 'delimiter.bracket', foreground: '888888' },
    { token: 'operator', foreground: 'a088ff' },
    { token: 'variable', foreground: 'e0e0e0' },
    { token: 'variable.predefined', foreground: '63e3ff' },
    { token: 'constant', foreground: 'ff8a63' },
    { token: 'annotation', foreground: 'a088ff' },
    { token: 'regexp', foreground: '63e3ff' },
    { token: 'tag', foreground: 'a088ff' },
    { token: 'attribute.name', foreground: '63e3ff' },
    { token: 'attribute.value', foreground: '63e3ff' },
    { token: 'metatag', foreground: 'a088ff' },
    { token: 'metatag.content', foreground: '63e3ff' },
  ],
  colors: {
    'editor.background': '#141414',
    'editor.foreground': '#e0e0e0',
    'editor.lineHighlightBackground': '#1e1e2e',
    'editor.selectionBackground': '#a088ff33',
    'editor.inactiveSelectionBackground': '#a088ff1a',
    'editorCursor.foreground': '#a088ff',
    'editorWhitespace.foreground': '#333333',
    'editorIndentGuide.background': '#2a2a2a',
    'editorIndentGuide.activeBackground': '#444444',
    'editorLineNumber.foreground': '#444444',
    'editorLineNumber.activeForeground': '#a088ff',
    'editor.selectionHighlightBackground': '#a088ff1a',
    'editorBracketMatch.background': '#a088ff33',
    'editorBracketMatch.border': '#a088ff66',
    'editorGutter.background': '#141414',
    'scrollbar.shadow': '#000000',
    'scrollbarSlider.background': '#33333380',
    'scrollbarSlider.hoverBackground': '#55555580',
    'scrollbarSlider.activeBackground': '#77777780',
  },
};

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
  const [theme, setTheme] = useState<'algoforge-dark' | 'light'>('algoforge-dark');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const consoleRef = useRef<HTMLDivElement>(null);

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

  const handleBeforeMount: BeforeMount = (monaco) => {
    monaco.editor.defineTheme('algoforge-dark', ALGOFORGE_DARK_THEME);
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
      <div className="min-h-screen pt-24 pb-12 text-center text-white/60 flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-[#a088ff] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="min-h-screen pt-24 pb-12 text-center text-white/60 flex items-center justify-center flex-col">
        <p className="mb-4">Problem not found.</p>
        <button onClick={onBack} className="text-[#a088ff] hover:underline">Go Back</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#141414] pt-[72px]">
      {/* Top Navbar for Workspace */}
      <div className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-[#141414] z-10 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Back</span>
          </button>
          <div className="h-4 w-px bg-white/20" />
          <h2 className="text-white font-medium truncate max-w-[200px] sm:max-w-md">{problem.title}</h2>
          <span className={`px-2 py-0.5 rounded text-xs font-medium difficulty-${problem.difficulty.toLowerCase()}`}>
            {problem.difficulty}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunCode}
            disabled={isExecuting}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg border border-white/10 text-sm transition-colors ${isExecuting ? 'bg-white/10 text-white/40 cursor-not-allowed' : 'bg-white/5 hover:bg-white/10 text-white/80 hover:text-white'
              }`}
          >
            {isExecuting ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">{isExecuting ? 'Running' : 'Run Code'}</span>
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#a088ff] hover:bg-[#b09dff] text-white transition-colors text-sm font-medium shadow-lg shadow-[#a088ff]/20"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Submit</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Panel: Problem Description */}
        <div className="w-full md:w-1/2 lg:w-[45%] xl:w-[40%] flex flex-col border-r border-white/10 overflow-hidden bg-[#141414]">
          <div className="h-10 border-b border-white/10 flex items-center px-4 bg-white/5 shrink-0">
            <span className="text-white/80 text-sm font-medium">Description</span>
          </div>
          <div className="flex-1 overflow-y-auto p-6 scrollbar-custom">
            <div className="prose prose-invert max-w-none">
              <h1 className="text-2xl font-bold text-white mb-4">{problem.title}</h1>

              <div className="flex flex-wrap gap-2 mb-6">
                {(problem.tags || []).map((tag: string) => (
                  <span key={tag} className="px-2 py-1 rounded bg-white/10 text-white/70 text-xs">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="text-white/80 leading-relaxed space-y-4 whitespace-pre-wrap">
                {problem.description}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Editor and Console */}
        <div className="w-full md:flex-1 flex flex-col min-h-0">
          {/* Editor Header */}
          <div className="h-10 border-b border-white/10 flex items-center justify-between px-4 bg-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-transparent text-white/80 text-sm focus:outline-none cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map(lang => (
                  <option key={lang.id} value={lang.id} className="bg-[#202020]">
                    {lang.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-white/40" />
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setTheme(theme === 'algoforge-dark' ? 'light' : 'algoforge-dark')}
                className="text-white/60 hover:text-white"
                aria-label="Toggle theme"
                aria-pressed={theme === 'algoforge-dark'}
              >
                {theme === 'algoforge-dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Editor Area */}
          <div className="flex-1 min-h-0 bg-[#141414]">
            <Editor
              height="100%"
              language={language}
              theme={theme}
              beforeMount={handleBeforeMount}
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
              loading={<div className="text-white/40 p-4">Loading editor...</div>}
            />
          </div>

          {/* Console / Output Area */}
          <div className="h-[200px] xl:h-[250px] border-t border-white/10 flex flex-col shrink-0 bg-[#141414]">
            <div className="h-10 border-b border-white/10 flex items-center justify-between px-4 bg-white/5 shrink-0">
              <div className="flex items-center">
                <Monitor className="w-4 h-4 text-white/60 mr-2" />
                <span className="text-white/80 text-sm font-medium">Console Output</span>
              </div>

              <button
                onClick={handleClearConsole}
                className="flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors"
                title="Clear console output"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            </div>
{/* Console / Output Area */}
            <div
              ref={consoleRef}
              className="min-h-[120px] overflow-y-auto p-4 font-mono text-sm text-white/60 whitespace-pre-wrap"
              >
            
              {isExecuting && 'Running...'}
              {!isExecuting && !executionResult && (
               <div className="text-white/50">Execute code to see output here.</div>
               )}
              {!isExecuting && executionResult?.error && (
              <span className="text-red-400">{executionResult.error}</span>
              )}
              {executionResult?.success && (
                <div className="space-y-4">
                  <div className={`text-lg font-bold ${executionResult.allPassed ? 'text-green-400' : 'text-red-400'}`}>
                    {executionResult.allPassed ? 'All Test Cases Passed!' : 'Some Test Cases Failed'}
                  </div>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {executionResult.results.map((res: any, idx: number) => (
                    <div key={idx} className="bg-white/5 p-3 rounded-lg border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-white/80">Test Case {idx + 1}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${res.passed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {res.passed ? 'Passed' : 'Failed'}
                        </span>
                      </div>
                      {!res.isHidden && (
                        <div className="space-y-2 text-xs">
                          <div><span className="text-white/40">Input:</span> <span className="text-white/80">{res.input}</span></div>
                          <div><span className="text-white/40">Expected:</span> <span className="text-white/80">{res.expectedOutput}</span></div>
                          <div><span className="text-white/40">Actual:</span> <span className={res.passed ? 'text-green-400' : 'text-red-400'}>{res.stdout || res.output}</span></div>
                          {res.error && <div><span className="text-red-400">Error: {res.error}</span></div>}
                        </div>
                      )}
                      {res.isHidden && (
                        <div className="text-xs text-white/40 italic">Hidden test case</div>
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
