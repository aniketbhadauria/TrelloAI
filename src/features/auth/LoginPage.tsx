import { useState } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const ALLOWED_DOMAIN = 'esperiastudio.com';

function isAllowedEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
}

function formatLoginError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/email logins are disabled/i.test(msg)) {
    return 'Email/password sign-in is disabled. Enable it in Supabase Dashboard → Authentication → Providers → Email.';
  }
  return msg || 'Could not sign in';
}

export default function LoginPage() {
  const { signIn, session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/boards';

  if (loading) return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <div className="w-8 h-8 border-3 border-pink-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (session) return <Navigate to="/boards" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!isAllowedEmail(email.trim())) {
      setError(`Only @${ALLOWED_DOMAIN} accounts are allowed.`);
      return;
    }
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(formatLoginError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card/40 p-8 shadow-lg backdrop-blur-sm">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Sign in</h1>
        <p className="text-sm text-muted-foreground mb-6">Enter your email and password to continue.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-email">Email</Label>
            <Input id="login-email" type="email" autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)} required className="h-10" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">Password</Label>
            <Input id="login-password" type="password" autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)} required className="h-10" />
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button type="submit" className="w-full h-10" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Log in'}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          No account?{' '}
          <Link to="/signup" className="font-medium text-primary underline-offset-4 hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
