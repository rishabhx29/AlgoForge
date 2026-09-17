import { motion } from 'framer-motion';
import { Server, Database, Code, Key } from 'lucide-react';

const methodColors: Record<string, string> = {
    GET: 'text-emerald-400 bg-emerald-400/10',
    POST: 'text-blue-400 bg-blue-400/10',
    PUT: 'text-amber-400 bg-amber-400/10',
};

const apiEndpoints = [
    {
        category: 'Authentication',
        endpoints: [
            { method: 'POST', path: '/api/auth/register', description: 'Register a new user account' },
            { method: 'POST', path: '/api/auth/login', description: 'Log in and receive a JWT token' },
            { method: 'POST', path: '/api/auth/google', description: 'Login/Register via Google OAuth' },
            { method: 'GET', path: '/api/auth/me', description: 'Get authenticated user details' },
        ]
    },
    {
        category: 'Content',
        endpoints: [
            { method: 'GET', path: '/api/content/topics', description: 'List all mastery topics' },
            { method: 'GET', path: '/api/content/problems', description: 'List all problems across categories' },
            { method: 'GET', path: '/api/content/topic/:id', description: 'Get details for a specific topic' },
        ]
    },
    {
        category: 'User Data',
        endpoints: [
            { method: 'POST', path: '/api/user/progress', description: 'Update problem completion status' },
            { method: 'GET', path: '/api/user/progress', description: 'Get full array of user progress' },
            { method: 'POST', path: '/api/user/notes', description: 'Create or update a markdown note' },
            { method: 'GET', path: '/api/user/dashboard', description: 'Retrieve stats, rank, and weekly activity' },
        ]
    },
    {
        category: 'Forum & Community',
        endpoints: [
            { method: 'GET', path: '/api/forum/posts', description: 'Fetch paginated forum discussion posts' },
            { method: 'POST', path: '/api/forum/posts', description: 'Create a new discussion post' },
            { method: 'POST', path: '/api/forum/posts/:id/like', description: 'Toggle like status on a post' },
        ]
    }
];

export function ApiReference() {
    return (
        <div className="min-h-screen pt-24 pb-12">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="mb-12"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                            <Server className="w-6 h-6 text-[#63e3ff]" />
                        </div>
                        <div>
                            <h1 className="font-display text-4xl text-white">API Reference</h1>
                            <p className="text-white/60 mt-1">RESTful endpoints and integration details.</p>
                        </div>
                    </div>
                </motion.div>

                {/* Global Configuration Info */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="glass rounded-2xl p-6 md:p-8 border border-white/10 mb-10"
                >
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <Database className="w-5 h-5 text-[#a088ff]" />
                        Base URL & Authorization
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-3 rounded-lg bg-white/5 border border-white/5">
                            <span className="text-white/50 text-sm w-24">Base URL</span>
                            <code className="text-[#63e3ff] text-sm">https://api.algoforge.com/v1</code>
                        </div>
                        <div className="flex items-center gap-4 p-3 rounded-lg bg-white/5 border border-white/5">
                            <span className="text-white/50 text-sm w-24">Auth Header</span>
                            <code className="text-[#a088ff] text-sm flex items-center gap-2">
                                <Key className="w-3 h-3" /> Authorization: Bearer &lt;token&gt;
                            </code>
                        </div>
                    </div>
                </motion.div>

                {/* Endpoint Tables by Category */}
                <div className="space-y-10">
                    {apiEndpoints.map((section, idx) => (
                        <motion.div
                            key={section.category}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 + (idx * 0.1) }}
                        >
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Code className="w-4 h-4 text-[#ff8a63]" />
                                {section.category}
                            </h3>
                            <div className="overflow-x-auto rounded-xl border border-white/10 glass">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/10 bg-white/5">
                                            <th className="p-4 text-xs font-semibold text-white/50 uppercase tracking-wider w-24">Method</th>
                                            <th className="p-4 text-xs font-semibold text-white/50 uppercase tracking-wider w-64">Endpoint</th>
                                            <th className="p-4 text-xs font-semibold text-white/50 uppercase tracking-wider">Description</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {section.endpoints.map((ep) => {
                                            const methodColor = methodColors[ep.method] ?? 'text-rose-400 bg-rose-400/10';

                                            return (
                                                <tr key={`${ep.method}:${ep.path}`} className="hover:bg-white/[0.02] transition-colors">
                                                    <td className="p-4">
                                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md tracking-wider ${methodColor}`}>
                                                            {ep.method}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 font-mono text-sm text-white/80">
                                                        {ep.path}
                                                    </td>
                                                    <td className="p-4 text-sm text-white/60">
                                                        {ep.description}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
