import { Routes, Route, Navigate } from 'react-router-dom'
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout'
import AuthPageLayout from '@/layouts/AuthPageLayout'
import LoginPage from '@/pages/LoginPage'
import SignupPage from '@/pages/SignupPage'
import OnboardingPage from '@/pages/OnboardingPage'
import HomePage from '@/pages/HomePage'
import BoardViewPage from '@/pages/BoardViewPage'
import ArchivePage from '@/pages/ArchivePage'
import ProfilePage from '@/pages/ProfilePage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/boards" replace />} />

      <Route element={<AuthPageLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      <Route element={<AuthenticatedLayout />}>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/boards" element={<HomePage />} />
        <Route path="/boards/:boardId" element={<BoardViewPage />} />
        <Route path="/boards/:boardId/:cardNumber" element={<BoardViewPage />} />
        <Route path="/archive" element={<ArchivePage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  )
}
