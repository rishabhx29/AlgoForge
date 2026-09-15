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
            ? 'bg-[#222225] border border-[rgba(241,238,234,0.1)] rounded-[10px] px-6 py-3'
            : 'bg-transparent'
            }`}>
            {/* Logo */}
            <motion.button
              onClick={() => handleNavClick(navLinks[0])}
              className="flex items-center gap-2 group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-9 h-9 rounded-[6px] bg-[#2c2b30] border border-[rgba(241,238,234,0.1)] flex items-center justify-center">
                <Logo className="w-5 h-5" />
              </div>
              <span className="font-display text-xl text-[#f1eeea] hidden sm:block tracking-[-0.02em]">
                AlgoForge
              </span>
            </motion.button>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = currentView === 'home'
                  ? (link.isAnchor ? activeSection === link.id : false)
                  : currentView === link.view;

                return (
                  <button
                    key={link.id}
                    onClick={() => handleNavClick(link)}
                    className={`px-3 py-1.5 rounded-[4px] text-[0.875rem] font-medium transition-colors duration-[var(--af-dur-fast)] relative ${
                      isActive
                        ? 'text-[#f1eeea] bg-[#2c2b30]'
                        : 'text-[#b6b1ad] hover:text-[#f1eeea]'
                    }`}
                  >
                    {link.label}
                  </button>
                );
              })}
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  {/* XP Badge — pulses only on streak change inside the icon; the
                      permanent animate-flame is removed (frequency test). */}
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-[4px] bg-[#222225] border border-[rgba(241,238,234,0.1)]">
                    <Flame className="w-3.5 h-3.5 text-[#f0997d]" />
                    <span className="text-[#f1eeea] text-[0.8125rem] font-medium tnum">
                      {(profile?.xp_points || 0).toLocaleString()} XP
                    </span>
                  </div>

                  {/* User Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="flex items-center gap-2 p-1.5 rounded-[4px] hover:bg-[#2c2b30] transition-colors duration-[var(--af-dur-fast)]"
                        aria-label="Account menu"
                      >
                        <div className="w-7 h-7 rounded-[4px] bg-[#f0997d] flex items-center justify-center">
                          <span className="text-[0.75rem] font-medium text-[#19191b]">
                            {profile?.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <ChevronDown className="w-4 h-4 text-[#b6b1ad] hidden sm:block" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-[#222225] border-[rgba(241,238,234,0.2)]">
                      <div className="px-3 py-2">
                        <p className="text-[0.875rem] font-medium text-[#f1eeea]">{profile?.name || 'User'}</p>
                        <p className="text-[0.75rem] text-[#b6b1ad] truncate">{user.email}</p>
                      </div>
                      <DropdownMenuSeparator className="bg-[rgba(241,238,234,0.1)]" />
                      <DropdownMenuItem
                        onClick={() => onNavigate('dashboard')}
                        className="text-[#f1eeea] hover:bg-[#2c2b30] cursor-pointer text-[0.875rem]"
                      >
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onNavigate('notes')}
                        className="text-[#f1eeea] hover:bg-[#2c2b30] cursor-pointer text-[0.875rem]"
                      >
                        <StickyNote className="w-4 h-4 mr-2" />
                        My Notes
                      </DropdownMenuItem>
                      {user.role === 'admin' && (
                        <DropdownMenuItem
                          onClick={() => { window.location.hash = 'admin'; }}
                          className="text-[#f0997d] hover:bg-[#2c2b30] cursor-pointer text-[0.875rem]"
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          Admin Panel
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator className="bg-[rgba(241,238,234,0.1)]" />
                      <DropdownMenuItem
                        onClick={handleSignOut}
                        className="text-[#e8a795] hover:bg-[#2c2b30] cursor-pointer text-[0.875rem]"
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
                    className="text-[#b6b1ad] hover:text-[#f1eeea] hover:bg-[#2c2b30] text-[0.875rem]"
                  >
                    Log In
                  </Button>
                  <Button
                    onClick={() => onAuthClick('signup')}
                    className="bg-[#f0997d] text-[#19191b] hover:bg-[#ffb197] text-[0.875rem] font-medium transition-colors duration-[var(--af-dur-fast)]"
                  >
                    Get Started
                  </Button>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={isMobileMenuOpen}
                className="md:hidden p-2 rounded-[4px] hover:bg-[#2c2b30] transition-colors duration-[var(--af-dur-fast)]"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5 text-[#f1eeea]" />
                ) : (
                  <Menu className="w-5 h-5 text-[#f1eeea]" />
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
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="fixed inset-x-0 top-20 z-40 mx-4 md:hidden"
          >
            <div className="bg-[#222225] border border-[rgba(241,238,234,0.2)] rounded-[10px] p-4 space-y-1">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => {
                    onNavigate(link.view);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[6px] transition-colors duration-[var(--af-dur-fast)] text-[0.875rem] ${currentView === link.view
                    ? 'bg-[#2c2b30] text-[#f1eeea]'
                    : 'text-[#b6b1ad] hover:bg-[#2c2b30] hover:text-[#f1eeea]'
                    }`}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </button>
              ))}

              {!user && (
                <div className="pt-2 border-t border-[rgba(241,238,234,0.1)] space-y-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      onAuthClick('login');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full border-[rgba(241,238,234,0.2)] text-[#f1eeea] hover:bg-[#2c2b30]"
                  >
                    Log In
                  </Button>
                  <Button
                    onClick={() => {
                      onAuthClick('signup');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full bg-[#f0997d] text-[#19191b] hover:bg-[#ffb197] font-medium"
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
