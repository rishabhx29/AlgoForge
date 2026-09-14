import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, LogIn, ChevronDown, Maximize2, Minimize2, Sparkles, Bot, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { sendChatMessage } from '@/api/chat';
import type { ChatMessage } from '@/api/chat';
import { useAnimatedText } from '@/components/ui/animated-text';

const STORAGE_KEY = 'algobot_history';
const MAX_MESSAGES = 20;

const WELCOME_MESSAGE: ChatMessage = {
    role: 'assistant',
    content:
        "Hey there! I'm **AlgoBot** — your personal DSA tutor 🤖\n\nI can:\n- 📖 **Teach** any DSA concept step-by-step\n- 🎯 **Suggest problems** from AlgoForge to practice\n- 🐛 **Help debug** your approach\n\nTry one of the quick actions below, or ask me anything!",
};

function loadHistory(): ChatMessage[] | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        return null;
    } catch {
        return null;
    }
}

function saveHistory(messages: ChatMessage[]) {
    try {
        // Skip the welcome message (index 0) — only persist conversation
        const toStore = messages.slice(1).slice(-MAX_MESSAGES);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch {
        // Private browsing or quota exceeded — silently ignore
    }
}

/* ─── Sparkle Star Icon (Leonardo AI style) ─── */
function SparkleIcon({ size = 40 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
            <defs>
                <linearGradient id="spark-g" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#e8e0ff" />
                    <stop offset="0.5" stopColor="#c4f0ff" />
                    <stop offset="1" stopColor="#e0d4ff" />
                </linearGradient>
            </defs>
            <path d="M20 4 L22.5 15.5 L34 13 L24 20 L34 27 L22.5 24.5 L20 36 L17.5 24.5 L6 27 L16 20 L6 13 L17.5 15.5 Z"
                fill="url(#spark-g)" opacity="0.9" />
            <path d="M20 10 L21 17 L28 15.5 L22.5 20 L28 24.5 L21 23 L20 30 L19 23 L12 24.5 L17.5 20 L12 15.5 L19 17 Z"
                fill="white" opacity="0.7" />
        </svg>
    );
}

/* ─── Animated Message Wrapper ─── */
function AnimatedAssistantMessage({ content, renderContent }: { content: string; renderContent: (text: string) => React.ReactNode }) {
    const animatedText = useAnimatedText(content, " ");
    return <>{renderContent(animatedText)}</>;
}

const QUICK_ACTIONS = [
    { text: '🎯 Teach me Binary Search', emoji: '🎯', label: 'Binary Search' },
    { text: '🧩 DP beginner roadmap', emoji: '🧩', label: 'DP Roadmap' },
    { text: '📊 Array problems to practice', emoji: '📊', label: 'Array Practice' },
    { text: '🌳 Explain tree traversals', emoji: '🌳', label: 'Tree Traversals' },
];

export function AlgoBot({ onAuthClick }: { onAuthClick: (mode: 'login' | 'signup') => void }) {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        const history = loadHistory();
        return history ? [WELCOME_MESSAGE, ...history] : [WELCOME_MESSAGE];
    });
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showScrollDown, setShowScrollDown] = useState(false);
    const [latestAiIndex, setLatestAiIndex] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!showScrollDown) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isTyping, showScrollDown]);

    useEffect(() => {
        if (isOpen && inputRef.current) inputRef.current.focus();
    }, [isOpen]);

    useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const handler = () => {
            const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
            setShowScrollDown(gap > 100);
        };
        el.addEventListener('scroll', handler);
        return () => el.removeEventListener('scroll', handler);
    }, [isOpen]);

    // Persist conversation to localStorage whenever messages change
    useEffect(() => {
        saveHistory(messages);
    }, [messages]);

    const handleClearChat = () => {
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
        setMessages([WELCOME_MESSAGE]);
        setLatestAiIndex(0);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const doSend = async (text: string) => {
        if (!text.trim() || isTyping) return;
        setInput('');

        const updated: ChatMessage[] = [...messages, { role: 'user', content: text.trim() }];
        setMessages(updated);
        setIsTyping(true);

        try {
            const token = localStorage.getItem('token') || '';
            const historyForAPI = updated.slice(1);
            const reply = await sendChatMessage(text.trim(), historyForAPI, token);
            setMessages(prev => {
                const newMsgs = [...prev, { role: 'assistant' as const, content: reply }];
                setLatestAiIndex(newMsgs.length - 1);
                return newMsgs;
            });
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { error?: string; details?: string } } };
            const errorData = axiosError?.response?.data;
            const mainError = errorData?.error || 'Sorry, something went wrong.';
            const details = errorData?.details ? `\n\n🔍 Debug: ${errorData.details}` : '';
            setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ **${mainError}**${details}` }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            doSend(input);
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    /* ─── Improved Markdown Renderer with proper spacing ─── */
    const renderContent = (text: string) => {
        // Split into paragraphs first for proper spacing
        const paragraphs = text.split('\n\n');

        return paragraphs.map((paragraph, pi) => {
            // Handle list items within a paragraph
            const lines = paragraph.split('\n');
            const isListParagraph = lines.some(l => l.trim().startsWith('- '));

            if (isListParagraph) {
                return (
                    <div key={pi} className="space-y-1.5 my-2">
                        {lines.map((line, li) => {
                            if (line.trim().startsWith('- ')) {
                                const content = line.trim().slice(2);
                                return (
                                    <div key={li} className="flex items-start gap-2 pl-1">
                                        <span className="text-emerald-400/60 mt-0.5">•</span>
                                        <span className="flex-1">{renderInline(content)}</span>
                                    </div>
                                );
                            }
                            return <div key={li}>{renderInline(line)}</div>;
                        })}
                    </div>
                );
            }

            return (
                <div key={pi} className={pi > 0 ? 'mt-3' : ''}>
                    {renderInline(paragraph.replace(/\n/g, ' '))}
                </div>
            );
        });
    };

    const renderInline = (text: string) => {
        const parts = text.split(/(```[\s\S]*?```|\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/g);
        return parts.map((part, i) => {
            if (part.startsWith('```') && part.endsWith('```')) {
                const lines = part.slice(3, -3);
                const langEnd = lines.indexOf('\n');
                const code = langEnd > -1 ? lines.slice(langEnd + 1) : lines;
                return (
                    <pre key={i} className="bg-black/30 rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono text-emerald-300 border border-white/5">
                        <code>{code.trim()}</code>
                    </pre>
                );
            }
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('`') && part.endsWith('`') && !part.startsWith('```')) {
                return <code key={i} className="bg-emerald-500/10 text-emerald-300 px-1.5 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
            }
            const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
            if (linkMatch) {
                return <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline decoration-emerald-400/30 hover:decoration-emerald-400 transition-all">{linkMatch[1]}</a>;
            }
            return <span key={i}>{part}</span>;
        });
    };

    const hasStartedConversation = messages.length > 1;

    return (
        <>
            {/* ─── Floating Button ─── */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsOpen(true)}
                        className="fixed bottom-6 right-6 z-50 group"
                    >
                        <span className="absolute -inset-3 rounded-full bg-emerald-500 opacity-10 blur-xl group-hover:opacity-20 transition-opacity" />
                        <span className="relative flex items-center gap-2.5 px-5 py-3 rounded-full bg-[#12121c] border border-white/10 text-white font-semibold shadow-2xl">
                            <div className="relative">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                    <Bot className="w-5 h-5 text-emerald-400" />
                                </div>
                                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border-[1.5px] border-[#12121c]" />
                            </div>
                            <span className="hidden sm:inline text-sm tracking-wide text-white/80">AlgoBot</span>
                        </span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* ─── Backdrop ─── */}
            <AnimatePresence>
                {isOpen && isExpanded && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsExpanded(false)}
                        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md"
                    />
                )}
            </AnimatePresence>

            {/* ─── Chat Window ─── */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        layout
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 30, scale: 0.95 }}
                        transition={{ type: 'spring', bounce: 0.12, duration: 0.45 }}
                        className={`fixed z-50 flex flex-col overflow-hidden border border-white/[0.06] ${isExpanded
                                ? 'inset-3 sm:inset-6 md:top-[5%] md:bottom-[5%] md:left-[10%] md:right-[10%] lg:left-[18%] lg:right-[18%] rounded-3xl'
                                : 'bottom-6 right-6 w-[420px] h-[620px] max-h-[85vh] max-w-[calc(100vw-32px)] rounded-2xl'
                            }`}
                        style={{
                            background: '#0c0c14',
                            boxShadow: isExpanded
                                ? '0 0 100px rgba(16,185,129,0.06), 0 25px 60px rgba(0,0,0,0.7)'
                                : '0 20px 60px rgba(0,0,0,0.5)',
                        }}
                    >
                        {/* ─── Header ─── */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.04]"
                            style={{ background: 'linear-gradient(180deg, rgba(16,185,129,0.03) 0%, transparent 100%)' }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center">
                                        <Bot className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0c0c14]" />
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold text-sm flex items-center gap-1.5">
                                        AlgoBot
                                        <Sparkles className="w-3 h-3 text-emerald-500/50" />
                                    </h3>
                                    <p className="text-emerald-500/50 text-[10px] font-medium tracking-wider">AI DSA Tutor</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-0.5">
                                {hasStartedConversation && (
                                    <button
                                        onClick={handleClearChat}
                                        className="p-2 rounded-lg hover:bg-white/5 transition-colors group"
                                        title="Clear Chat"
                                        aria-label="Clear chat history"
                                    >
                                        <Trash2 className="w-4 h-4 text-white/30 group-hover:text-red-400/70 transition-colors" />
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="p-2 rounded-lg hover:bg-white/5 transition-colors group"
                                    title={isExpanded ? 'Minimize' : 'Expand'}
                                >
                                    {isExpanded ? (
                                        <Minimize2 className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
                                    ) : (
                                        <Maximize2 className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
                                    )}
                                </button>
                                <button
                                    onClick={() => { setIsOpen(false); setIsExpanded(false); }}
                                    className="p-2 rounded-lg hover:bg-white/5 transition-colors group"
                                >
                                    <X className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
                                </button>
                            </div>
                        </div>

                        {/* ─── Messages Area ─── */}
                        <div ref={scrollContainerRef} className="relative flex-1 overflow-y-auto">
                            {/* ═══ Welcome Screen (Leonardo AI style) ═══ */}
                            {!hasStartedConversation && (
                                <div className="flex flex-col items-center justify-center h-full px-6 py-8">
                                    {/* Sparkle icon */}
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.5 }}
                                        className="mb-4"
                                    >
                                        <div className="relative">
                                            <SparkleIcon size={isExpanded ? 56 : 44} />
                                            <div className="absolute inset-0 blur-xl opacity-30">
                                                <SparkleIcon size={isExpanded ? 56 : 44} />
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Greeting */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.15 }}
                                        className="text-center mb-8"
                                    >
                                        <p className="text-white/30 text-xs mb-2 tracking-wide">{getGreeting()}</p>
                                        <h2 className={`text-white font-light ${isExpanded ? 'text-3xl' : 'text-xl'}`}>
                                            How <span className="font-bold">can I help?</span>
                                        </h2>
                                    </motion.div>

                                    {/* Quick action cards */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className={`w-full ${isExpanded ? 'max-w-lg' : 'max-w-sm'}`}
                                    >
                                        <div className={`grid ${isExpanded ? 'grid-cols-2' : 'grid-cols-2'} gap-2.5`}>
                                            {QUICK_ACTIONS.map((action, idx) => (
                                                <motion.button
                                                    key={action.text}
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.35 + idx * 0.05 }}
                                                    whileHover={{ scale: 1.02, y: -2 }}
                                                    whileTap={{ scale: 0.97 }}
                                                    onClick={() => doSend(action.text)}
                                                    className="relative group p-4 rounded-xl border border-white/[0.06] text-left transition-all hover:border-emerald-500/20 overflow-hidden"
                                                    style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%)' }}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <span className="text-lg mb-1.5 block">{action.emoji}</span>
                                                    <span className="text-xs font-medium text-white/60 group-hover:text-white/80 transition-colors relative z-10">
                                                        {action.label}
                                                    </span>
                                                </motion.button>
                                            ))}
                                        </div>
                                    </motion.div>
                                </div>
                            )}

                            {/* ═══ Conversation Messages ═══ */}
                            {hasStartedConversation && (
                                <div className="px-5 py-5 space-y-5">
                                    {messages.slice(1).map((msg, i) => {
                                        const actualIndex = i + 1;
                                        const isLatestAi = msg.role === 'assistant' && actualIndex === latestAiIndex;
                                        const isUser = msg.role === 'user';

                                        return (
                                            <motion.div
                                                key={actualIndex}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                                            >
                                                {/* Avatar */}
                                                {!isUser && (
                                                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/15 flex-shrink-0 flex items-center justify-center mt-0.5">
                                                        <Bot className="w-4 h-4 text-emerald-400" />
                                                    </div>
                                                )}
                                                {isUser && (
                                                    <div className="w-7 h-7 rounded-lg bg-white/10 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white/70 mt-0.5">
                                                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                                    </div>
                                                )}

                                                {/* Bubble */}
                                                <div
                                                    className={`${isExpanded ? 'max-w-[65%]' : 'max-w-[85%]'} ${isUser
                                                            ? 'bg-white/[0.08] text-white/90 rounded-2xl rounded-tr-md px-4 py-3'
                                                            : 'text-white/75 px-1 py-0.5'
                                                        }`}
                                                    style={{
                                                        fontSize: isExpanded ? '14px' : '13px',
                                                        lineHeight: '1.7',
                                                    }}
                                                >
                                                    {isLatestAi ? (
                                                        <AnimatedAssistantMessage content={msg.content} renderContent={renderContent} />
                                                    ) : (
                                                        renderContent(msg.content)
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}

                                    {/* Typing Indicator */}
                                    {isTyping && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex gap-3"
                                        >
                                            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/15 flex-shrink-0 flex items-center justify-center">
                                                <Bot className="w-4 h-4 text-emerald-400" />
                                            </div>
                                            <div className="px-3 py-3">
                                                <div className="flex gap-1.5 items-center">
                                                    {[0, 150, 300].map((delay) => (
                                                        <motion.span
                                                            key={delay}
                                                            animate={{ opacity: [0.2, 0.8, 0.2], y: [0, -3, 0] }}
                                                            transition={{ duration: 1, repeat: Infinity, delay: delay / 1000 }}
                                                            className="w-1.5 h-1.5 rounded-full bg-emerald-500/60"
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                            )}
                        </div>

                        {/* Scroll-to-bottom */}
                        <AnimatePresence>
                            {showScrollDown && hasStartedConversation && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    onClick={scrollToBottom}
                                    className="absolute bottom-[76px] left-1/2 -translate-x-1/2 p-1.5 rounded-full bg-[#1a1a28] border border-white/[0.06] text-white/40 shadow-lg z-10 hover:text-white/70 transition-all"
                                >
                                    <ChevronDown className="w-4 h-4" />
                                </motion.button>
                            )}
                        </AnimatePresence>

                        {/* ─── Input Area ─── */}
                        <div className="px-4 py-3.5 border-t border-white/[0.04]"
                            style={{ background: 'rgba(12,12,20,0.95)' }}
                        >
                            {user ? (
                                <div className="relative flex items-center gap-2">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="What do you want to know..."
                                        disabled={isTyping}
                                        className="flex-1 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-emerald-500/30 transition-all disabled:opacity-30"
                                    />
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => doSend(input)}
                                        disabled={!input.trim() || isTyping}
                                        className="p-3 rounded-xl bg-emerald-500/90 text-white hover:bg-emerald-500 transition-all disabled:opacity-20 disabled:bg-white/5 disabled:text-white/30"
                                    >
                                        <Send className="w-4 h-4" />
                                    </motion.button>
                                </div>
                            ) : (
                                <motion.button
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    onClick={() => {
                                        setIsOpen(false);
                                        setIsExpanded(false);
                                        onAuthClick('login');
                                    }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/90 text-white font-semibold text-sm hover:bg-emerald-500 transition-all"
                                >
                                    <LogIn className="w-4 h-4" />
                                    Log in to start chatting
                                </motion.button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
