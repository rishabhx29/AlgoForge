import { motion } from 'framer-motion';
import { BookOpen, Code, Terminal, Zap, CheckCircle2, Server } from 'lucide-react';

export function Documentation() {
    return (
        <div className="min-h-screen pt-24 pb-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="mb-12"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                            <BookOpen className="w-6 h-6 text-[#a088ff]" />
                        </div>
                        <div>
                            <h1 className="font-display text-4xl text-white">Documentation</h1>
                            <p className="text-white/60 mt-1">Getting started and architecture guides.</p>
                        </div>
                    </div>
                </motion.div>

                <div className="space-y-12">
                    {/* Section 1 */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="glass rounded-2xl p-8 border border-white/10"
                    >
                        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-[#ffd700]" />
                            Quick Start
                        </h2>
                        <p className="text-white/70 leading-relaxed mb-6">
                            Welcome to AlgoForge! This platform is designed to guide you through Data Structures, Algorithms,
                            Dynamic Programming, and System Design with highly curated roadmaps and comprehensive tracking.
                        </p>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-[#a088ff]/20 flex items-center justify-center text-[#a088ff] text-xs font-bold">1</span>
                                    Pick a Roadmap
                                </h3>
                                <p className="text-white/50 text-sm">Navigate to the Roadmaps section and select a domain you want to master.</p>
                            </div>
                            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-[#63e3ff]/20 flex items-center justify-center text-[#63e3ff] text-xs font-bold">2</span>
                                    Practice Problems
                                </h3>
                                <p className="text-white/50 text-sm">Follow the sequential topics, solve problems, and mark them as solved.</p>
                            </div>
                        </div>
                    </motion.section>

                    {/* Section 2 */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="glass rounded-2xl p-8 border border-white/10"
                    >
                        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
                            <Server className="w-5 h-5 text-[#a088ff]" />
                            Platform Architecture
                        </h2>
                        <p className="text-white/70 leading-relaxed mb-4">
                            AlgoForge is built on a modern MERN-like stack with emphasis on React 19, Vite, and tailwind.
                        </p>
                        <ul className="space-y-3 mb-6">
                            <li className="flex items-start gap-3 text-white/60">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                                <span><strong className="text-white">Frontend:</strong> React, Framer Motion, Tailwind CSS</span>
                            </li>
                            <li className="flex items-start gap-3 text-white/60">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                                <span><strong className="text-white">Backend:</strong> Express.js, TypeScript, RESTful endpoints</span>
                            </li>
                            <li className="flex items-start gap-3 text-white/60">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                                <span><strong className="text-white">Database:</strong> MongoDB for seamless JSON document storage</span>
                            </li>
                            <li className="flex items-start gap-3 text-white/60">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                                <span><strong className="text-white">AI Features:</strong> Integrated AI Chatbot acting as your coding mentor</span>
                            </li>
                        </ul>
                    </motion.section>

                    {/* Section 3 */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="glass rounded-2xl p-8 border border-white/10"
                    >
                        <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
                            <Code className="w-5 h-5 text-[#ff8a63]" />
                            Working with the Notes System
                        </h2>
                        <p className="text-white/70 leading-relaxed mb-4">
                            The internal notes module allows you to take markdown-enabled notes globally. All notes auto-sync to your account when you're logged in.
                        </p>
                        <div className="bg-black/40 rounded-xl p-4 font-mono text-sm text-emerald-300 overflow-x-auto border border-white/5">
                            <div className="flex items-center gap-2 mb-2 text-white/30 border-b border-white/10 pb-2">
                                <Terminal className="w-4 h-4" />
                                <span>Markdown Supported Formats</span>
                            </div>
                            <code>
                                # Headers mapped perfectly<br />
                                **Bold text** is easy<br />
                                ```javascript<br />
                                {'// Code blocks highlight out of the box!'}<br />
                                function test() {'{'}<br />
                                &nbsp;&nbsp;return true;<br />
                                {'}'}<br />
                                ```
                            </code>
                        </div>
                    </motion.section>
                </div>
            </div>
        </div>
    );
}
