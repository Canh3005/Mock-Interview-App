import { Navigate, Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { ROUTES } from './routes'

export default function AdminRoute() {
  const { user } = useSelector((s) => s.auth)

  if (user?.role !== 'admin') return <Navigate to={ROUTES.DASHBOARD} replace />

  return <Outlet />
}
