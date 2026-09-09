import { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Analytics } from '@vercel/analytics/react';
import { Navigation } from '@/components/custom/Navigation';
import { Hero } from '@/sections/Hero';
import { UserHero } from '@/sections/UserHero';
import { Roadmaps } from '@/sections/Roadmaps';
import { Features } from '@/sections/Features';
import { HowItWorks } from '@/sections/HowItWorks';
import { CommunityHub } from '@/sections/CommunityHub';
import { CTA } from '@/sections/CTA';
import { Footer } from '@/sections/Footer';
import { AuthModal } from '@/components/custom/AuthModal';
import { AlgoBot } from '@/components/custom/AlgoBot';
import { ScrollToTop } from '@/components/custom/ScrollToTop';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { PageSkeleton } from '@/components/custom/PageSkeleton';
import { ProfileView } from '@/sections/ProfileView';

// Lazy loaded views
const PathDetail = lazy(() => import('@/sections/PathDetail').then(m => ({ default: m.PathDetail })));
const Dashboard = lazy(() => import('@/sections/Dashboard').then(m => ({ default: m.Dashboard })));
const TopicDetail = lazy(() => import('@/sections/TopicDetail').then(m => ({ default: m.TopicDetail })));
const Problems = lazy(() => import('@/sections/Problems').then(m => ({ default: m.Problems })));
const Notes = lazy(() => import('@/sections/Notes').then(m => ({ default: m.Notes })));
const Leaderboard = lazy(() => import('@/sections/Leaderboard').then(m => ({ default: m.Leaderboard })));
const DailyChallenges = lazy(() => import('@/sections/DailyChallenges').then(m => ({ default: m.DailyChallenges })));
const CommunityForum = lazy(() => import('@/sections/CommunityForum').then(m => ({ default: m.CommunityForum })));
const AdminPanel = lazy(() => import('@/sections/AdminPanel').then(m => ({ default: m.AdminPanel })));
const Documentation = lazy(() => import('@/sections/Documentation').then(m => ({ default: m.Documentation })));
const ApiReference = lazy(() => import('@/sections/ApiReference').then(m => ({ default: m.ApiReference })));
const ProblemWorkspace = lazy(() => import('@/sections/ProblemWorkspace').then(m => ({ default: m.ProblemWorkspace })));

type View = 'home' | 'dashboard' | 'topic' | 'path' | 'problems' | 'notes' | 'leaderboard' | 'community' | 'daily-challenges' | 'admin' | 'docs' | 'api' | 'workspace' | 'profile';

function AppContent() {
  const { user, isAuthReady } = useAuth();
  const [currentView, setCurrentView] = useState<View>('home');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);

      if (hash) {
        if (hash.startsWith('path/')) {
          const pId = hash.replace('path/', '');
          setSelectedPathId(pId);
          setCurrentView('path');
        } else if (hash.startsWith('topic/')) {
          const topicId = hash.replace('topic/', '');
          setSelectedTopicId(topicId);
          setCurrentView('topic');
        } else if (hash.startsWith('workspace/')) {
          const wId = hash.replace('workspace/', '');
          setSelectedWorkspaceId(wId);
          setCurrentView('workspace');
        } else if (hash.startsWith('profile/')) {
          const userId = hash.replace('profile/', '');
          setSelectedProfileUserId(userId);
          setCurrentView('profile');
        } else if (hash === 'dashboard') {
          if (user || !isAuthReady) {
            setCurrentView('dashboard');
          } else {
            window.location.hash = '';
            setCurrentView('home');
          }
        } else if (hash === 'problems') {
          setCurrentView('problems');
        } else if (hash === 'notes') {
          if (user || !isAuthReady) {
            setCurrentView('notes');
          } else {
            window.location.hash = '';
            setCurrentView('home');
          }
        } else if (hash === 'leaderboard') {
          setCurrentView('leaderboard');
        } else if (hash === 'community') {
          setCurrentView('community');
        } else if (hash === 'daily-challenges') {
          if (user || !isAuthReady) {
            setCurrentView('daily-challenges');
          } else {
            window.location.hash = '';
            setCurrentView('home');
          }
        } else if (hash === 'admin') {
          if ((user && user.role === 'admin') || !isAuthReady) {
            setCurrentView('admin');
          } else {
            window.location.hash = '';
            setCurrentView('home');
          }
        } else if (hash === 'docs') {
          setCurrentView('docs');
        } else if (hash === 'api') {
          setCurrentView('api');
        } else {
          setCurrentView('home');
        }
      } else {
        setCurrentView('home');
        setSelectedTopicId(null);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [user, isAuthReady]);

  const handleNavigate = (view: View, topicId?: string) => {
    if ((view === 'dashboard' || view === 'notes' || view === 'daily-challenges' || (view === 'topic' && topicId)) && !user) {
      setAuthMode('login');
      setIsAuthModalOpen(true);
      toast.info('Please log in to continue');
      return;
    }

    setCurrentView(view);
    if (topicId) {
      setSelectedTopicId(topicId);
      window.location.hash = `topic/${topicId}`;
    } else {
      window.location.hash = view === 'home' ? '' : view;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTopicClick = (topicId: string) => {
    handleNavigate('topic', topicId);
  };

  const handlePathClick = (pathId: string) => {
    setSelectedPathId(pathId);
    setCurrentView('path');
    window.location.hash = `path/${pathId}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProfileClick = (userId: string) => {
    setSelectedProfileUserId(userId);
    setCurrentView('profile');
    window.location.hash = `profile/${userId}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuthClick = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const renderView = () => {
    if (!isAuthReady && ['dashboard', 'notes', 'daily-challenges', 'admin'].includes(currentView)) {
      return <PageSkeleton />;
    }

    switch (currentView) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'path':
        return selectedPathId ? (
          <PathDetail
            pathId={selectedPathId}
            onBack={() => handleNavigate('home')}
            onTopicClick={handleTopicClick}
          />
        ) : (
          <Roadmaps onPathClick={handlePathClick} />
        );
      case 'topic':
        return selectedTopicId ? (
          <TopicDetail
            topicId={selectedTopicId}
            onBack={() => {
              if (selectedPathId) {
                setCurrentView('path');
                window.location.hash = `path/${selectedPathId}`;
              } else {
                handleNavigate('home');
              }
            }}
          />
        ) : (
          <Roadmaps onPathClick={handlePathClick} />
        );
      case 'workspace':
        return selectedWorkspaceId ? (
          <ProblemWorkspace 
            problemId={selectedWorkspaceId} 
            onBack={() => handleNavigate('problems')} 
          />
        ) : (
          <Problems />
        );
      case 'problems':
        return <Problems />;
      case 'notes':
        return <Notes />;
      case 'leaderboard':
        return <Leaderboard onProfileClick={handleProfileClick} />;
      case 'daily-challenges':
        return <DailyChallenges onBack={() => handleNavigate('dashboard')} />;
      case 'community':
        return <CommunityForum onBack={() => handleNavigate('home')} onAuthClick={handleAuthClick} />;
      case 'admin':
        return user?.role === 'admin' ? <AdminPanel /> : null;
      case 'docs':
        return <Documentation />;
      case 'api':
        return <ApiReference />;
      case 'profile':
        return selectedProfileUserId ? (
          <ProfileView userId={selectedProfileUserId} onBack={() => handleNavigate('leaderboard')} />
        ) : (
          <Leaderboard onProfileClick={handleProfileClick} />
        );
      case 'home':
      default:
        return user ? (
          <>
            <UserHero user={user} onTopicClick={handleTopicClick} />
            <Roadmaps onPathClick={handlePathClick} />
            <CommunityHub onNavigate={handleNavigate} />
          </>
        ) : (
          <>
            <Hero onGetStarted={() => handleAuthClick('signup')} />
            <Roadmaps onPathClick={handlePathClick} />
            <Features />
            <HowItWorks onGetStarted={() => handleAuthClick('signup')} />
            <CommunityHub onNavigate={handleNavigate} />
            <CTA onGetStarted={() => handleAuthClick('signup')} />
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#141414]">
      {currentView !== 'workspace' && (
        <Navigation
          currentView={currentView}
          onNavigate={handleNavigate}
          onAuthClick={handleAuthClick}
        />
      )}

      <main>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView + (selectedTopicId || '')}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Suspense fallback={<PageSkeleton />}>
              {renderView()}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      {currentView === 'home' && <Footer onNavigate={handleNavigate} />}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultMode={authMode}
      />

      <ScrollToTop />

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#202020',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
          },
        }}
      />

      <AlgoBot onAuthClick={handleAuthClick} />
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
        <Analytics />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
