import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'signup';
}

export function AuthModal({ isOpen, onClose, defaultMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error || 'Failed to sign in');
        } else {
          toast.success('Welcome back!');
          onClose();
        }
      } else {
        const { error } = await signUp(email, password, name);
        if (error) {
          toast.error(error || 'Failed to sign up');
        } else {
          toast.success('Account created! Please check your email to verify.');
          onClose();
        }
      }
    } catch (_err) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async (credential?: string) => {
    setIsLoading(true);
    const { error, isNewUser } = await signInWithGoogle(credential);
    if (error) {
      toast.error(error || 'Failed to sign in with Google');
      setIsLoading(false);
    } else {
      toast.success(isNewUser ? 'Account created successfully!' : 'Welcome back!');
      onClose();
      setIsLoading(false); // Optional, since modal closes, but good for cleanup
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setEmail('');
    setPassword('');
    setName('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="relative w-full max-w-md bg-[#222225] rounded-[10px] border border-[rgba(241,238,234,0.2)] overflow-hidden"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="absolute top-4 right-4 p-2 rounded-[4px] text-[#b6b1ad] hover:text-[#f1eeea] hover:bg-[#2c2b30] transition-colors duration-[var(--af-dur-fast)] z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header — flat surface, hairline below */}
            <div className="px-6 pt-7 pb-5 border-b border-[rgba(241,238,234,0.1)]">
              <h2 className="text-[1.5rem] font-medium text-[#f1eeea] tracking-[-0.015em] mb-1">
                {mode === 'login' ? 'Welcome back' : 'Get started'}
              </h2>
              <p className="text-[0.8125rem] text-[#b6b1ad]">
                {mode === 'login'
                  ? 'Continue your coding journey'
                  : 'Join thousands of learners'}
              </p>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Google Sign In */}
              <div className="w-full mb-4 flex justify-center">
                <GoogleLogin
                  onSuccess={credentialResponse => {
                    handleGoogleSignIn(credentialResponse.credential);
                  }}
                  onError={() => {
                    toast.error('Google Sign In Failed');
                  }}
                  theme="filled_black"
                  shape="rectangular"
                  text="continue_with"
                  width="300"
                />
              </div>

              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[rgba(241,238,234,0.1)]" />
                </div>
                <div className="relative flex justify-center text-[0.75rem]">
                  <span className="px-2 bg-[#222225] text-[#8f8a85]">or continue with email</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-[#b6b1ad]">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8f8a85]" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="pl-10 bg-[#19191b] border-[rgba(241,238,234,0.1)] text-[#f1eeea] placeholder:text-[#8f8a85] rounded-[6px] focus-visible:border-[#f0997d]"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#b6b1ad]">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8f8a85]" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 bg-[#19191b] border-[rgba(241,238,234,0.1)] text-[#f1eeea] placeholder:text-[#8f8a85] rounded-[6px] focus-visible:border-[#f0997d]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[#b6b1ad]">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8f8a85]" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pl-10 pr-10 bg-[#19191b] border-[rgba(241,238,234,0.1)] text-[#f1eeea] placeholder:text-[#8f8a85] rounded-[6px] focus-visible:border-[#f0997d]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8f8a85] hover:text-[#b6b1ad] transition-colors duration-[var(--af-dur-fast)]"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#f0997d] text-[#19191b] hover:bg-[#ffb197] active:scale-[0.98] h-11 font-medium rounded-[6px] transition-colors duration-[var(--af-dur-fast)]"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-[#19191b] border-t-transparent rounded-full animate-spin" />
                  ) : mode === 'login' ? (
                    'Sign in'
                  ) : (
                    'Create account'
                  )}
                </Button>
              </form>

              <p className="mt-4 text-center text-[0.875rem] text-[#b6b1ad]">
                {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button
                  type="button"
                  onClick={switchMode}
                  className="text-[#f0997d] hover:text-[#f5b8a3] transition-colors duration-[var(--af-dur-fast)] font-medium"
                >
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
