import { Navigate, Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { ROUTES } from './routes'

export default function InterviewRoomRoute() {
  const session = useSelector((s) => s.interviewSetup.session)

  if (!session) return <Navigate to={ROUTES.INTERVIEW_SETUP} replace />

  return <Outlet />
}
