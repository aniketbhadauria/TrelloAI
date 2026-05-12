import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { BoardProvider } from '@/context/BoardContext';
import { NotificationProvider } from '@/context/NotificationContext';
import AppRoutes from '@/routes';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BoardProvider>
          <NotificationProvider>
            <div className="min-h-screen bg-background relative overflow-hidden">
              <div className="gradient-orb gradient-orb-1" />
              <div className="gradient-orb gradient-orb-2" />
              <div className="gradient-orb gradient-orb-3" />
              <div className="relative z-10">
                <AppRoutes />
              </div>
            </div>
          </NotificationProvider>
        </BoardProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
