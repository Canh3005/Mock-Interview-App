import { Navigate, Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Loader2 } from 'lucide-react'

export default function ProtectedRoute() {
  const { isAuthenticating, isAuthenticated } = useSelector((s) => s.auth)

  if (isAuthenticating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-cta animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return <Outlet />
}
