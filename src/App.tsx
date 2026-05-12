import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/context/AuthContext';
import { ProfileProvider } from '@/context/ProfileContext';
import { BoardProvider } from '@/context/BoardContext';
import { NotificationProvider } from '@/context/NotificationContext';
import AppRoutes from '@/routes';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ProfileProvider>
            <BoardProvider>
              <NotificationProvider>
                <div className="min-h-screen bg-background">
                  <AppRoutes />
                </div>
              </NotificationProvider>
            </BoardProvider>
          </ProfileProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
