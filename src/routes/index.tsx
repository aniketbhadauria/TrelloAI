import { Routes, Route } from 'react-router-dom';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import PublicLayout from '@/layouts/PublicLayout';
import LoginPage from '@/features/auth/LoginPage';
import SignupPage from '@/features/auth/SignupPage';
import HomePage from '@/features/boards/HomePage';
import BoardViewPage from '@/features/board-view/BoardViewPage';
import ArchivePage from '@/features/boards/ArchivePage';
import Landing from '@/features/boards/LandingPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      <Route element={<AuthenticatedLayout />}>
        <Route path="/boards" element={<HomePage />} />
        <Route path="/boards/:boardId" element={<BoardViewPage />} />
        <Route path="/archive" element={<ArchivePage />} />
      </Route>
    </Routes>
  );
}
