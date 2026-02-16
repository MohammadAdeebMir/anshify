import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Music2, Mail, Lock, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

type Mode = 'login' | 'signup' | 'forgot';

const AuthPage = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signUp, signInWithGoogle, resetPassword, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already logged in
  if (user) {
    navigate('/', { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (mode === 'forgot') {
      const { error } = await resetPassword(email);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else toast({ title: 'Check your email', description: 'Password reset link sent.' });
      setSubmitting(false);
      return;
    }

    const fn = mode === 'login' ? signIn : signUp;
    const { error } = await fn(email, password);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else if (mode === 'signup') {
      toast({ title: 'Account created!', description: 'Check your email to verify your account.' });
    } else {
      navigate('/', { replace: true });
    }
    setSubmitting(false);
  };

  const handleGoogle = async () => {
    const { error } = await signInWithGoogle();
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 gradient-radial pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md glass-strong rounded-3xl p-8 space-y-6 relative z-10"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center glow-primary">
            <Music2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Purple Haze</h1>
          <p className="text-muted-foreground text-sm">
            {mode === 'login' && 'Welcome back'}
            {mode === 'signup' && 'Create your account'}
            {mode === 'forgot' && 'Reset your password'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground/80">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="pl-10 bg-secondary/50 border-border/30 focus:border-primary"
                required
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {mode !== 'forgot' && (
              <motion.div
                key="password"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <Label htmlFor="password" className="text-foreground/80">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 bg-secondary/50 border-border/30 focus:border-primary"
                    required
                    minLength={6}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-11 font-semibold glow-primary"
          >
            {submitting ? 'Loading...' : (
              <>
                {mode === 'login' && 'Sign In'}
                {mode === 'signup' && 'Create Account'}
                {mode === 'forgot' && 'Send Reset Link'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        {mode !== 'forgot' && (
          <>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border/30" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border/30" />
            </div>

            <Button
              variant="outline"
              onClick={handleGoogle}
              className="w-full border-border/30 bg-secondary/30 hover:bg-secondary/50 rounded-xl h-11"
            >
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </Button>
          </>
        )}

        <div className="text-center space-y-1">
          {mode === 'login' ? (
            <>
              <button onClick={() => setMode('forgot')} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                Forgot password?
              </button>
              <p className="text-sm text-muted-foreground">
                Don't have an account?{' '}
                <button onClick={() => setMode('signup')} className="text-primary hover:underline font-medium">Sign up</button>
              </p>
            </>
          ) : mode === 'signup' ? (
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <button onClick={() => setMode('login')} className="text-primary hover:underline font-medium">Sign in</button>
            </p>
          ) : (
            <button onClick={() => setMode('login')} className="text-sm text-primary hover:underline font-medium">
              Back to sign in
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
