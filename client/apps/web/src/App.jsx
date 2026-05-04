import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { checkAuthRequest } from './store/slices/authSlice'
import { ROUTES } from './router/routes'
import ProtectedRoute from './router/ProtectedRoute'
import GuestRoute from './router/GuestRoute'
import AdminRoute from './router/AdminRoute'
import InterviewRoomRoute from './router/InterviewRoomRoute'

import LandingPage from './components/landing/LandingPage'
import LoginPage from './components/auth/LoginPage'
import RegisterPage from './components/auth/RegisterPage'
import DashboardPage from './components/dashboard/DashboardPage'
import SkillPassportPage from './components/dashboard/profile/SkillPassportPage'
import InterviewSetupFlow from './components/interview-setup/InterviewSetupFlow'
import RoundTransitionScreen from './components/interview-setup/RoundTransitionScreen'
import InterviewRoomPage from './components/interview-room/InterviewRoomPage'
import BehavioralRoomPage from './components/behavioral-room/BehavioralRoomPage'
import CombatInterviewRoom from './components/combat-room/CombatInterviewRoom'
import DSASessionPage from './components/dsa/DSASessionPage'
import SDRoomPage from './components/sd-room/SDRoomPage'
import ScoringPage from './components/scoring/ScoringPage'
import ProblemBankPage from './components/practice/ProblemBankPage'
import AdminLayout from './components/admin/AdminLayout'
import AdminProblemsPage from './components/admin/AdminProblemsPage'
import AdminTestCasesPage from './components/admin/AdminTestCasesPage'
import AdminSDProblemsPage from './components/admin/AdminSDProblemsPage'

function AppRoutes() {
  const dispatch = useDispatch()
  const roundTransitionPending = useSelector((s) => s.interviewSetup.roundTransitionPending)

  useEffect(() => {
    dispatch(checkAuthRequest())
  }, [dispatch])

  return (
    <>
      <Routes>
        <Route path={ROUTES.LANDING} element={<LandingPage />} />

        <Route element={<GuestRoute />}>
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
          <Route path={ROUTES.DASHBOARD_PROFILE} element={<SkillPassportPage />} />
          <Route path={ROUTES.INTERVIEW_SETUP} element={<InterviewSetupFlow />} />
          <Route path={ROUTES.PRACTICE_PROBLEMS} element={<ProblemBankPage />} />
          <Route path={ROUTES.DSA_ROOM_SOLO} element={<DSASessionPage />} />

          <Route element={<InterviewRoomRoute />}>
            <Route path={ROUTES.INTERVIEW_ROOM} element={<InterviewRoomPage />} />
            <Route path={ROUTES.BEHAVIORAL_ROOM} element={<BehavioralRoomPage />} />
            <Route path={ROUTES.COMBAT_ROOM} element={<CombatInterviewRoom />} />
            <Route path={ROUTES.DSA_ROOM} element={<DSASessionPage />} />
            <Route path={ROUTES.SD_ROOM} element={<SDRoomPage />} />
            <Route path={ROUTES.SCORING} element={<ScoringPage />} />
          </Route>

          <Route element={<AdminRoute />}>
            <Route path={ROUTES.ADMIN} element={<AdminLayout><AdminProblemsPage /></AdminLayout>} />
            <Route path={ROUTES.ADMIN_TESTCASES} element={<AdminLayout><AdminTestCasesPage /></AdminLayout>} />
            <Route path={ROUTES.ADMIN_SD_PROBLEMS} element={<AdminLayout><AdminSDProblemsPage /></AdminLayout>} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to={ROUTES.LANDING} replace />} />
      </Routes>

      {roundTransitionPending && <RoundTransitionScreen />}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
