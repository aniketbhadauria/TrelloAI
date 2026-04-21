import { useState } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { GoogleMark } from '@/components/icons/GoogleMark';

function formatLoginError(err) {
  const msg = err?.message || '';
  if (/email logins are disabled/i.test(msg)) {
    return 'Email/password sign-in is disabled in your Supabase project. In the Dashboard go to Authentication → Providers → Email and turn the Email provider on, then save.';
  }
  if (/provider is not enabled|unsupported provider/i.test(msg)) {
    return 'This sign-in provider is not enabled. In Supabase go to Authentication → Providers, open Google or GitHub, turn the provider on, and add the Client ID and Secret from that provider’s developer console.';
  }
  return msg || 'Could not sign in';
}

function GitHubMark({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export default function Login() {
  const { signIn, signInWithGitHub, signInWithGoogle, session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  /** 'google' | 'github' while redirecting */
  const [oauthProvider, setOauthProvider] = useState(null);

  const from = location.state?.from?.pathname || '/boards';

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <div className="w-8 h-8 border-3 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/boards" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
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

  async function handleGoogle() {
    setError('');
    setOauthProvider('google');
    try {
      await signInWithGoogle(from);
    } catch (err) {
      setError(formatLoginError(err));
      setOauthProvider(null);
    }
  }

  async function handleGitHub() {
    setError('');
    setOauthProvider('github');
    try {
      await signInWithGitHub(from);
    } catch (err) {
      setError(formatLoginError(err));
      setOauthProvider(null);
    }
  }

  const oauthBusy = !!oauthProvider;

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card/40 p-8 shadow-lg backdrop-blur-sm">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Sign in</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Sign in with Google, GitHub, or your email and password.
        </p>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full h-10 gap-2 border-border/80 bg-background/80"
            onClick={handleGoogle}
            disabled={submitting || oauthBusy}
          >
            <GoogleMark className="size-4 shrink-0" />
            {oauthProvider === 'google' ? 'Redirecting to Google…' : 'Continue with Google'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full h-10 gap-2 border-border/80 bg-background/80"
            onClick={handleGitHub}
            disabled={submitting || oauthBusy}
          >
            <GitHubMark className="size-4 shrink-0" />
            {oauthProvider === 'github' ? 'Redirecting to GitHub…' : 'Continue with GitHub'}
          </Button>
        </div>

        <div className="relative my-6">
          <Separator />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card/90 px-2 text-xs text-muted-foreground">
            or with email
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-10"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full h-10" disabled={submitting || oauthBusy}>
            {submitting ? 'Signing in…' : 'Log in'}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          No account?{' '}
          <Link to="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
