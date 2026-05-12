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
            <div className="min-h-screen bg-background">
              <AppRoutes />
            </div>
          </NotificationProvider>
        </BoardProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
