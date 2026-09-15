import { Terminal } from 'lucide-react';

export function Documentation() {
    return (
        <div className="min-h-screen pt-24 pb-12">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <header className="mb-12 rule-header pb-6">
                    <p className="text-[0.75rem] font-mono text-[#b6b1ad] mb-2">docs</p>
                    <h1 className="font-display text-4xl text-[#f1eeea] tracking-[-0.015em]">Documentation</h1>
                    <p className="text-[#b6b1ad] text-[0.9375rem] mt-2 max-w-xl">
                        Getting started, the platform stack, and how notes are stored.
                    </p>
                </header>

                {/* Section 1 — Quick Start */}
                <section className="mb-14">
                    <h2 className="text-[0.75rem] font-mono uppercase tracking-[0.08em] text-[#b6b1ad] mb-4">
                        Quick start
                    </h2>
                    <p className="text-[#f1eeea] leading-relaxed mb-6 text-[0.9375rem] max-w-xl">
                        AlgoForge guides you through Data Structures, Algorithms, Dynamic Programming and System
                        Design with curated roadmaps and progress tracking on every problem.
                    </p>

                    <ol className="ruled">
                        <li className="flex items-baseline gap-4 py-4">
                            <span className="text-[#f5b8a3] font-mono text-[0.8125rem] tnum w-4 shrink-0">1</span>
                            <div>
                                <h3 className="text-[#f1eeea] text-[0.9375rem] font-medium mb-1">Pick a roadmap</h3>
                                <p className="text-[#b6b1ad] text-[0.875rem]">
                                    Open Roadmaps and select a domain you want to master. Each one is ordered, so you
                                    can work top to bottom.
                                </p>
                            </div>
                        </li>
                        <li className="flex items-baseline gap-4 py-4">
                            <span className="text-[#f5b8a3] font-mono text-[0.8125rem] tnum w-4 shrink-0">2</span>
                            <div>
                                <h3 className="text-[#f1eeea] text-[0.9375rem] font-medium mb-1">Practice problems</h3>
                                <p className="text-[#b6b1ad] text-[0.875rem]">
                                    Follow the sequential topics, solve each problem, and mark it solved. Your
                                    submission history and runtime are recorded per attempt.
                                </p>
                            </div>
                        </li>
                        <li className="flex items-baseline gap-4 py-4">
                            <span className="text-[#f5b8a3] font-mono text-[0.8125rem] tnum w-4 shrink-0">3</span>
                            <div>
                                <h3 className="text-[#f1eeea] text-[0.9375rem] font-medium mb-1">Take notes as you go</h3>
                                <p className="text-[#b6b1ad] text-[0.875rem]">
                                    Markdown notes attach to any problem. They sync to your account so the reasoning
                                    behind a solution survives the next session.
                                </p>
                            </div>
                        </li>
                    </ol>
                </section>

                {/* Section 2 — Platform Architecture */}
                <section className="mb-14">
                    <h2 className="text-[0.75rem] font-mono uppercase tracking-[0.08em] text-[#b6b1ad] mb-4">
                        Platform architecture
                    </h2>
                    <p className="text-[#f1eeea] leading-relaxed mb-2 text-[0.9375rem] max-w-xl">
                        AlgoForge runs on a MERN-like stack, with the client built on React 19, Vite and Tailwind.
                    </p>
                    <dl className="ruled">
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6 py-4">
                            <dt className="text-[#f1eeea] text-[0.9375rem] font-medium w-28 shrink-0">Frontend</dt>
                            <dd className="text-[#b6b1ad] text-[0.875rem]">
                                React 19, Vite, Tailwind CSS, Framer Motion
                            </dd>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6 py-4">
                            <dt className="text-[#f1eeea] text-[0.9375rem] font-medium w-28 shrink-0">Backend</dt>
                            <dd className="text-[#b6b1ad] text-[0.875rem]">
                                Express.js, TypeScript, RESTful endpoints
                            </dd>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6 py-4">
                            <dt className="text-[#f1eeea] text-[0.9375rem] font-medium w-28 shrink-0">Database</dt>
                            <dd className="text-[#b6b1ad] text-[0.875rem]">
                                MongoDB, for JSON-shaped document storage
                            </dd>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6 py-4">
                            <dt className="text-[#f1eeea] text-[0.9375rem] font-medium w-28 shrink-0">AI</dt>
                            <dd className="text-[#b6b1ad] text-[0.875rem]">
                                An in-app assistant that reviews your approach rather than handing over the answer
                            </dd>
                        </div>
                    </dl>
                </section>

                {/* Section 3 — Notes */}
                <section className="mb-14">
                    <h2 className="text-[0.75rem] font-mono uppercase tracking-[0.08em] text-[#b6b1ad] mb-4">
                        The notes system
                    </h2>
                    <p className="text-[#f1eeea] leading-relaxed mb-5 text-[0.9375rem] max-w-xl">
                        Notes are markdown-enabled and can be attached globally or per problem. They sync to your
                        account whenever you are signed in.
                    </p>
                    <div className="rounded-[6px] bg-[#0b0b0d] border border-[rgba(241,238,234,0.1)] overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[rgba(241,238,234,0.1)] text-[#b6b1ad]">
                            <Terminal className="w-3.5 h-3.5" aria-hidden="true" />
                            <span className="text-[0.75rem] font-mono">markdown.md</span>
                        </div>
                        <pre className="p-4 font-mono text-[0.8125rem] leading-relaxed text-[#b6b1ad] overflow-x-auto">
                            <code>{`# Headers
**bold**, _italic_, \`inline code\`

\`\`\`javascript
// fenced blocks are highlighted
function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i];
    seen.set(nums[i], i);
  }
}
\`\`\``}</code>
                        </pre>
                    </div>
                </section>
            </div>
        </div>
    );
}
