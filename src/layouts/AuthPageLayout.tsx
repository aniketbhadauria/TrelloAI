import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Users, Zap, Shield } from 'lucide-react';
import { LogoMark } from '@/components/Logo';

const FEATURES = [
  { icon: Users, label: 'Shared boards for every project' },
  { icon: Zap, label: 'Real-time updates across your team' },
  { icon: Shield, label: 'Private to Esperia Studio accounts' },
] as const;

export default function AuthPageLayout() {
  const { session } = useAuth();
  if (session) return <Navigate to="/boards" replace />;

  return (
    <div className="min-h-screen flex">
      {/* Left — branding panel */}
      <div className="hidden lg:flex w-1/2 bg-primary flex-col justify-between p-12 text-primary-foreground select-none">

        {/* Top: E mark anchor */}
        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
          <LogoMark className="w-5 h-5 text-white" />
        </div>

        {/* Center: wordmark + headline + features */}
        <div className="space-y-10">
          <div className="space-y-5">
            <div>
              <h1 className="text-4xl font-bold leading-tight tracking-tight mb-3">
                Your team's<br />workspace.
              </h1>
              <p className="text-primary-foreground/65 text-sm leading-relaxed max-w-xs">
                Organize projects, track progress, and ship together — built for Esperia Studio.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-primary-foreground/80 text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: footer */}
        <p className="text-primary-foreground/30 text-xs">
          © {new Date().getFullYear()} Esperia Studio — Internal use only
        </p>
      </div>

      {/* Right — form panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
