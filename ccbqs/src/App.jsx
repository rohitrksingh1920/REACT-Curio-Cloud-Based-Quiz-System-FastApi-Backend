

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import ErrorBoundary from './components/ui/ErrorBoundary'

// Pages
import LoginPage      from './pages/LoginPage'
import SignupPage     from './pages/SignupPage'
import ForgotPassword from './pages/ForgotPasswordPage'
import Dashboard      from './pages/DashboardPage'
import MyQuizzes      from './pages/MyQuizzesPage'
import CreateQuiz     from './pages/CreateQuizPage'
import TakeQuiz       from './pages/TakeQuizPage'
import Analytics      from './pages/AnalyticsPage'
import Leaderboard    from './pages/LeaderboardPage'
import Notifications  from './pages/NotificationsPage'
import Settings       from './pages/SettingsPage'
import AdminPage      from './pages/AdminPage'
import NotFound       from './pages/NotFoundPage'

function ProtectedRoute({ children, adminOnly = false, teacherOnly = false }) {
  const { isLoggedIn, isAdmin, isTeacher } = useAuth()
  if (!isLoggedIn) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />
  if (teacherOnly && !isTeacher) return <Navigate to="/dashboard" replace />
  return children
}

function PublicRoute({ children }) {
  const { isLoggedIn } = useAuth()
  if (isLoggedIn) return <Navigate to="/dashboard" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"          element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/signup"         element={<PublicRoute><SignupPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

      {/* Protected */}
      <Route path="/dashboard"      element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/my-quizzes"     element={<ProtectedRoute><MyQuizzes /></ProtectedRoute>} />
      <Route path="/create-quiz"    element={<ProtectedRoute teacherOnly><CreateQuiz /></ProtectedRoute>} />
      <Route path="/take-quiz/:id"  element={<ProtectedRoute><TakeQuiz /></ProtectedRoute>} />
      <Route path="/analytics"      element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
      <Route path="/leaderboard/:id" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
      <Route path="/notifications"  element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/settings"       element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/admin"          element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />

      {/* Redirects */}
      <Route path="/"  element={<Navigate to="/dashboard" replace />} />
      <Route path="*"  element={<NotFound />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
