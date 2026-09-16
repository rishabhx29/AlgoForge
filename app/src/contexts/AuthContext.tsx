import { createContext, useContext, useEffect, useState } from 'react';
import { SESSION_EXPIRED_EVENT } from '@/api/apiClient';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role?: string;
  xp_points?: number;
  streak_days?: number;
  solvedProblems?: unknown[];
  activityLog?: unknown[];
}

interface AuthContextType {
  user: User | null;
  profile: User | null;
  isLoading: boolean;
  isAuthReady: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signInWithGoogle: (credential?: string) => Promise<{ error: string | null; isNewUser?: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Record<string, unknown>) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const isLoading = false;
  const [isAuthReady, setIsAuthReady] = useState(false);

  const refreshProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const userData = await res.json();
        const userObj = {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          avatar: userData.avatar,
          role: userData.role,
          xp_points: userData.xp_points,
          streak_days: userData.streak_days,
          solvedProblems: userData.solvedProblems,
          activityLog: userData.activityLog
        };

        setUser(userObj);
        setProfile({ ...userData, id: userData.id });
      }
    } catch (error) {
      console.error('Profile refresh failed', error);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsAuthReady(true);
        return;
      }

      try {
        await refreshProfile();
      } catch (error) {
        console.error('Session check failed', error);
        localStorage.removeItem('token');
      } finally {
        setIsAuthReady(true);
      }
    };

    checkSession();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        return { error: data.message || 'Login failed' };
      }

      localStorage.setItem('token', data.token);

      const userObj = {
        id: data.id,
        email: data.email,
        name: data.name,
        avatar: data.avatar,
        role: data.role,
        xp_points: data.xp_points,
        streak_days: data.streak_days,
        solvedProblems: data.solvedProblems,
        activityLog: data.activityLog
      };

      setUser(userObj);
      setProfile({ ...data, id: data.id });

      return { error: null };
    } catch (_err) {
      return { error: 'Network error. Ensure backend is running.' };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users`, {        
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        return { error: data.message || 'Signup failed' };
      }

      localStorage.setItem('token', data.token);

      const userObj = {
        id: data.id,
        email: data.email,
        name: data.name,
        avatar: data.avatar,
        role: data.role,
        xp_points: data.xp_points,
        streak_days: data.streak_days,
        solvedProblems: data.solvedProblems,
        activityLog: data.activityLog
      };

      setUser(userObj);
      setProfile({ ...data, id: data.id });

      return { error: null };
    } catch (_err) {
      return { error: 'Network error. Ensure backend is running.' };
    }
  };

  const signInWithGoogle = async (credential?: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: credential })
      });

      const data = await res.json();

      if (!res.ok) {
        return { error: data.message || 'Google Auth failed' };
      }

      localStorage.setItem('token', data.token);

      const userObj = {
        id: data.id,
        email: data.email,
        name: data.name,
        avatar: data.avatar,
        role: data.role,
        xp_points: data.xp_points,
        streak_days: data.streak_days,
        solvedProblems: data.solvedProblems,
        activityLog: data.activityLog
      };

      setUser(userObj);
      setProfile({ ...data, id: data.id });

      return { error: null, isNewUser: data.isNewUser };
    } catch (_err) {
      return { error: 'Network error during Google Auth' };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('token');
    setUser(null);
    setProfile(null);
  };

  // Global 401 handling: apiClient dispatches this event (once per expiry)
  // when the stored token is rejected; clear user state in response.
  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
      setProfile(null);
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, []);

  const updateProfile = async (updates: Record<string, unknown>) => {
    if (!profile) return { error: 'Not authenticated' };

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return { error: 'Not authenticated' };
      }
      const res = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });

      const data = await res.json();

      if (!res.ok) {
        return { error: data.message || 'Failed to update profile' };
      }

      setProfile((prev) => prev ? { ...prev, ...data } : data);
      
      if (user) {
        setUser((prevUser) => {
          if (!prevUser) return null;
          return {
            ...prevUser,
            name: data.name !== undefined ? data.name : prevUser.name,
            avatar: data.avatar !== undefined ? data.avatar : prevUser.avatar
          };
        });
      }

      return { error: null };
    } catch (_err) {
      return { error: 'Network error. Ensure backend is running.' };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      isLoading,
      isAuthReady,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      updateProfile,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
