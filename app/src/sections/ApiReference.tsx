import { Key } from 'lucide-react';

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

const methodTone = (method: string) =>
    method === 'GET' ? 'text-[#c8dfd1]' :
        method === 'POST' || method === 'PUT' ? 'text-[#f5b8a3]' :
            'text-[#e8a795]';

export function ApiReference() {
    return (
        <div className="min-h-screen pt-24 pb-12">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <header className="mb-12 rule-header pb-6">
                    <p className="text-[0.75rem] font-mono text-[#b6b1ad] mb-2">api</p>
                    <h1 className="font-display text-4xl text-[#f1eeea] tracking-[-0.015em]">API Reference</h1>
                    <p className="text-[#b6b1ad] text-[0.9375rem] mt-2">
                        RESTful endpoints and integration details.
                    </p>
                </header>

                {/* Global configuration */}
                <section className="mb-12">
                    <h2 className="text-[0.75rem] font-mono uppercase tracking-[0.08em] text-[#b6b1ad] mb-4">
                        Base URL &amp; authorization
                    </h2>
                    <div className="ruled">
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6 py-4">
                            <span className="text-[#b6b1ad] text-[0.875rem] w-28 shrink-0">Base URL</span>
                            <code className="font-mono text-[0.875rem] text-[#c8dfd1]">
                                https://api.algoforge.com/v1
                            </code>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6 py-4">
                            <span className="text-[#b6b1ad] text-[0.875rem] w-28 shrink-0">Auth header</span>
                            <code className="font-mono text-[0.875rem] text-[#f5b8a3] flex items-center gap-2">
                                <Key className="w-3 h-3 shrink-0" aria-hidden="true" />
                                Authorization: Bearer &lt;token&gt;
                            </code>
                        </div>
                    </div>
                </section>

                {/* Endpoint tables by category */}
                <div className="space-y-12">
                    {apiEndpoints.map((section) => (
                        <section key={section.category}>
                            <h2 className="text-[0.75rem] font-mono uppercase tracking-[0.08em] text-[#b6b1ad] mb-4">
                                {section.category}
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-[rgba(241,238,234,0.2)]">
                                            <th scope="col" className="py-3 pr-4 text-[0.75rem] font-medium text-[#8f8a85] w-24">Method</th>
                                            <th scope="col" className="py-3 pr-4 text-[0.75rem] font-medium text-[#8f8a85] w-64">Endpoint</th>
                                            <th scope="col" className="py-3 text-[0.75rem] font-medium text-[#8f8a85]">Description</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {section.endpoints.map((ep) => (
                                            <tr
                                                key={ep.path + ep.method}
                                                className="border-b border-[rgba(241,238,234,0.1)] row-interactive"
                                            >
                                                <td className="py-3 pr-4">
                                                    <span className={`font-mono text-[0.75rem] ${methodTone(ep.method)}`}>
                                                        {ep.method}
                                                    </span>
                                                </td>
                                                <td className="py-3 pr-4 font-mono text-[0.875rem] text-[#f1eeea]">
                                                    {ep.path}
                                                </td>
                                                <td className="py-3 text-[0.875rem] text-[#b6b1ad]">
                                                    {ep.description}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
}
