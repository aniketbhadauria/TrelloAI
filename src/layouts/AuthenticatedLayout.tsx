import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';

function Spinner() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function AuthenticatedLayout() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner />;
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />;

  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}
