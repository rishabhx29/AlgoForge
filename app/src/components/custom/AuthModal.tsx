import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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

export function AuthModal({ isOpen, onClose, defaultMode = 'login' }: Readonly<AuthModalProps>) {
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
          toast.error(error);
        } else {
          toast.success('Welcome back!');
          onClose();
        }
      } else {
        const { error } = await signUp(email, password, name);
        if (error) {
          toast.error(error);
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
      toast.error(error);
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

  const submitLabel = mode === 'login' ? 'Sign In' : 'Create Account';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="w-full max-w-md sm:max-w-md bg-[#202020] rounded-2xl border border-white/10 overflow-hidden p-0 gap-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header */}
        <DialogHeader className="relative h-32 overflow-hidden p-0 space-y-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#a088ff]/30 to-[#63e3ff]/30" />
          <div className="absolute inset-0 isometric-pattern opacity-30" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <DialogTitle className="font-display text-3xl text-white mb-1">
                {mode === 'login' ? 'Welcome Back' : 'Get Started'}
              </DialogTitle>
              <DialogDescription className="text-white/60 text-sm">
                {mode === 'login'
                  ? 'Continue your coding journey'
                  : 'Join thousands of learners'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

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
              shape="circle"
              text="continue_with"
              width="300"
            />
          </div>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-[#202020] text-white/40">or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white/80">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#a088ff] focus:ring-[#a088ff]/20"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/80">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#a088ff] focus:ring-[#a088ff]/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/80">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#a088ff] focus:ring-[#a088ff]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#a088ff] to-[#63e3ff] text-[#141414] hover:opacity-90 h-11 font-medium"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-[#141414] border-t-transparent rounded-full animate-spin" />
              ) : submitLabel}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-white/60">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={switchMode}
              className="text-[#a088ff] hover:text-[#63e3ff] transition-colors font-medium"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
