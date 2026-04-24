import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { GoogleMark } from '@/components/icons/GoogleMark';

function formatSignupError(err) {
  const msg = err?.message || '';
  if (/signups not allowed/i.test(msg)) {
    return 'New sign-ups are disabled in Supabase. Open Project Settings → Authentication → User Signups and turn on “Allow new users to sign up”, then save. Alternatively, add a user under Authentication → Users and sign in on the Log in page.';
  }
  return msg || 'Could not sign up';
}

export default function Signup() {
  const { signUp, signInWithGoogle, session, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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
    setMessage('');
    setSubmitting(true);
    try {
      const data = await signUp(email.trim(), password);
      if (data.session) {
        navigate('/boards', { replace: true });
      } else {
        setMessage('Check your email to confirm your account, then sign in.');
      }
    } catch (err) {
      setError(formatSignupError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card/40 p-8 shadow-lg backdrop-blur-sm">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Create account</h1>
        <p className="text-sm text-muted-foreground mb-6">Sign up with Google or email and password.</p>
        <Button
          type="button"
          variant="outline"
          className="w-full h-10 gap-2 border-border/80 bg-background/80"
          onClick={handleGoogle}
          disabled={submitting || googleLoading}
        >
          <GoogleMark className="size-4 shrink-0" />
          {googleLoading ? 'Redirecting to Google…' : 'Continue with Google'}
        </Button>
        <div className="relative my-6">
          <Separator />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card/90 px-2 text-xs text-muted-foreground">
            or with email
          </span>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signup-email">Email</Label>
            <Input
              id="signup-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-password">Password</Label>
            <Input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">At least 6 characters (match your Supabase policy).</p>
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="text-sm text-muted-foreground" role="status">
              {message}
            </p>
          )}
          <Button type="submit" className="w-full h-10" disabled={submitting || googleLoading}>
            {submitting ? 'Creating account…' : 'Sign up'}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
