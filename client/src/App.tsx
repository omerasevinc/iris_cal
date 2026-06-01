import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { PendingMealProvider } from './contexts/PendingMealContext'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { LogMeal } from './pages/LogMeal'
import { History } from './pages/History'
import { Calendar } from './pages/Calendar'
import { Settings } from './pages/Settings'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth()
  if (!currentUser) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <PendingMealProvider>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/log"
        element={
          <ProtectedRoute>
            <LogMeal />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <History />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <Calendar />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </PendingMealProvider>
  )
}
