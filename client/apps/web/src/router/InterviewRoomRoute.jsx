import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { connectSseRequest, disconnectSseRequest } from '../store/slices/notificationsSlice'
import { ROUTES } from './routes'

export default function InterviewRoomRoute() {
  const dispatch = useDispatch()
  const session = useSelector((s) => s.interviewSetup.session)
  const hasSession = Boolean(session)

  useEffect(() => {
    if (!hasSession) return undefined

    dispatch(connectSseRequest())
    return () => dispatch(disconnectSseRequest())
  }, [hasSession, dispatch])

  if (!session) return <Navigate to={ROUTES.INTERVIEW_SETUP} replace />

  return <Outlet />
}
