import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  Code2,
  LayoutDashboard,
  Map,
  List,
  Trophy,
  StickyNote,
  LogOut,
  ChevronDown,
  Flame,
  Shield
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { isNavigationLinkActive } from '@/lib/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavigationProps {
  currentView: string;
  onNavigate: (view: 'home' | 'dashboard' | 'topic' | 'problems' | 'notes' | 'leaderboard' | 'admin') => void;
  onAuthClick: (mode: 'login' | 'signup') => void;
}

export function Navigation({ currentView, onNavigate, onAuthClick }: NavigationProps) {
  const { user, profile, signOut } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);

      // Scroll Spy Logic for Home Page
      if (currentView === 'home') {
        const sections = ['home', 'roadmaps'];
        const scrollPosition = window.scrollY + 100; // Offset for header

        let current = 'home';
        for (const section of sections) {
          const element = document.getElementById(section);
          if (element) {
            const top = element.offsetTop;
            const bottom = top + element.offsetHeight;
            if (scrollPosition >= top && scrollPosition < bottom) {
              current = section;
            }
          }
        }
        setActiveSection(current);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentView]);

  const navLinks = [
    { id: 'home', label: 'Home', icon: Code2, view: 'home' as const, isAnchor: true },
    { id: 'roadmaps', label: 'Roadmaps', icon: Map, view: 'home' as const, isAnchor: true },
    { id: 'problems', label: 'Problems', icon: List, view: 'problems' as const, isAnchor: false },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, view: 'leaderboard' as const, isAnchor: false },
    ...(user?.role === 'admin' ? [{ id: 'admin', label: 'Admin', icon: Shield, view: 'admin' as const, isAnchor: false }] : []),
  ];

  const handleNavClick = (link: typeof navLinks[0]) => {
    if (link.isAnchor) {
      if (currentView !== 'home') {
        onNavigate('home');
        // Wait for navigation render then scroll
        setTimeout(() => {
          const element = document.getElementById(link.id);
          element?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        const element = document.getElementById(link.id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    } else {
      onNavigate(link.view);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onNavigate('home');
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled
          ? 'py-3'
          : 'py-5'
          }`}
      >
        <div className={`mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-500 ${isScrolled ? 'max-w-4xl' : 'max-w-7xl'
          }`}>
          <div className={`flex items-center justify-between transition-all duration-500 ${isScrolled
            ? 'glass rounded-full px-6 py-3'
            : 'bg-transparent'
            }`}>
            {/* Logo */}
            <motion.button
              onClick={() => handleNavClick(navLinks[0])}
              className="flex items-center gap-2 group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#a088ff]/20 to-[#63e3ff]/20 border border-white/10 flex items-center justify-center backdrop-blur-sm shadow-lg shadow-[#a088ff]/5">
                <Logo className="w-6 h-6" />
              </div>
              <span className="font-display text-2xl text-white hidden sm:block">
                AlgoForge
              </span>
            </motion.button>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link, index) => {
                const isActive = isNavigationLinkActive(link, currentView, activeSection);

                return (
                  <motion.button
                    key={link.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    onClick={() => handleNavClick(link)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 relative group ${isActive
                      ? 'text-white'
                      : 'text-white/60 hover:text-white'
                      }`}
                  >
                    {isActive ? (
                      <motion.div
                        layoutId="nav-pill"
                        className="absolute inset-0 bg-white/10 rounded-full"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    ) : null}
                    <span className="relative z-10">{link.label}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  {/* XP Badge */}
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full glass">
                    <Flame className="w-4 h-4 text-[#ff8a63] animate-flame" />
                    <span className="text-white font-medium">
                      {profile?.xp_points || 0} XP
                    </span>
                  </div>

                  {/* User Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 p-1.5 rounded-full hover:bg-white/5 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#a088ff] to-[#63e3ff] flex items-center justify-center">
                          <span className="text-sm font-medium text-[#141414]">
                            {profile?.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <ChevronDown className="w-4 h-4 text-white/60 hidden sm:block" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-[#202020] border-white/10">
                      <div className="px-3 py-2">
                        <p className="text-sm font-medium text-white">{profile?.name || 'User'}</p>
                        <p className="text-xs text-white/60 truncate">{user.email}</p>
                      </div>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem
                        onClick={() => onNavigate('dashboard')}
                        className="text-white/80 hover:text-white hover:bg-white/5 cursor-pointer"
                      >
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onNavigate('notes')}
                        className="text-white/80 hover:text-white hover:bg-white/5 cursor-pointer"
                      >
                        <StickyNote className="w-4 h-4 mr-2" />
                        My Notes
                      </DropdownMenuItem>
                      {user.role === 'admin' && (
                        <DropdownMenuItem
                          onClick={() => { window.location.hash = 'admin'; }}
                          className="text-[#a088ff] hover:text-[#b8a4ff] hover:bg-[#a088ff]/10 cursor-pointer"
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          Admin Panel
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem
                        onClick={handleSignOut}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => onAuthClick('login')}
                    className="text-white/80 hover:text-white hover:bg-white/5"
                  >
                    Log In
                  </Button>
                  <Button
                    onClick={() => onAuthClick('signup')}
                    className="bg-gradient-to-r from-[#a088ff] to-[#63e3ff] text-[#141414] hover:opacity-90"
                  >
                    Get Started
                  </Button>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6 text-white" />
                ) : (
                  <Menu className="w-6 h-6 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-20 z-40 mx-4 md:hidden"
          >
            <div className="glass rounded-2xl p-4 space-y-2">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => {
                    onNavigate(link.view);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${currentView === link.view
                    ? 'bg-[#a088ff]/20 text-white'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`}
                >
                  <link.icon className="w-5 h-5" />
                  {link.label}
                </button>
              ))}

              {!user && (
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      onAuthClick('login');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full border-white/20 text-white hover:bg-white/5"
                  >
                    Log In
                  </Button>
                  <Button
                    onClick={() => {
                      onAuthClick('signup');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full bg-gradient-to-r from-[#a088ff] to-[#63e3ff] text-[#141414]"
                  >
                    Get Started
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
