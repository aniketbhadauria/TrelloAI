import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/context/ProfileContext';
import Navbar from '@/components/Navbar';

function Spinner() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function AuthenticatedLayout() {
  const { session, loading: authLoading } = useAuth();
  const { isComplete, loading: profileLoading } = useProfile();
  const location = useLocation();

  if (authLoading || profileLoading) return <Spinner />;
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />;

  const isOnboarding = location.pathname === '/onboarding';

  if (!isComplete && !isOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <>
      {!isOnboarding && <Navbar />}
      <Outlet />
    </>
  );
}
