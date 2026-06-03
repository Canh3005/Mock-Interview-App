import { useEffect, useLayoutEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
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
import DSASessionPage from './components/dsa/DSASessionPage'
import SDRoomPage from './components/sd-room/SDRoomPage'
import ScoringPage from './components/scoring/ScoringPage'
import ProblemBankPage from './components/practice/ProblemBankPage'
import PublicQuestionBankPage from './components/question-bank/PublicQuestionBankPage'
import QuestionProbeDetailPage from './components/question-bank/QuestionProbeDetailPage'
import AdminProblemsPage from './components/admin/AdminProblemsPage'
import AdminTestCasesPage from './components/admin/AdminTestCasesPage'
import AdminSDProblemsPage from './components/admin/AdminSDProblemsPage'
import AdminQuestionBankPage from './components/admin/AdminQuestionBankPage'
import DashboardShell from './components/shared/DashboardShell'
import BuyCreditsPage from './components/payment/BuyCreditsPage'
import PaymentResultPage from './components/payment/PaymentResultPage'

function PublicDarkTheme() {
  useLayoutEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  return (
    <div className="public-dark-theme min-h-screen">
      <Outlet />
    </div>
  )
}

function AppRoutes() {
  const dispatch = useDispatch()
  const roundTransitionPending = useSelector((s) => s.interviewSetup.roundTransitionPending)

  useEffect(() => {
    dispatch(checkAuthRequest())
  }, [dispatch])

  return (
    <>
      <Routes>
        <Route element={<PublicDarkTheme />}>
          <Route path={ROUTES.LANDING} element={<LandingPage />} />

          <Route element={<GuestRoute />}>
            <Route path={ROUTES.LOGIN} element={<LoginPage />} />
            <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute />}>
          {/* Dashboard shell — sidebar layout */}
          <Route element={<DashboardShell />}>
            <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
            <Route path={ROUTES.DASHBOARD_PROFILE} element={<SkillPassportPage />} />
            <Route path={ROUTES.INTERVIEW_SETUP} element={<InterviewSetupFlow />} />
            <Route path={ROUTES.PRACTICE_PROBLEMS} element={<ProblemBankPage />} />
            <Route path={ROUTES.QUESTION_BANK} element={<PublicQuestionBankPage />} />
            <Route path={ROUTES.QUESTION_BANK_DETAIL} element={<QuestionProbeDetailPage />} />
            <Route path={ROUTES.BUY_CREDITS} element={<BuyCreditsPage />} />
            <Route path={ROUTES.PAYMENT_RESULT} element={<PaymentResultPage />} />
            <Route element={<InterviewRoomRoute />}>
              <Route path={ROUTES.BEHAVIORAL_ROOM} element={<BehavioralRoomPage />} />
              <Route path={ROUTES.DSA_ROOM} element={<DSASessionPage />} />
              <Route path={ROUTES.SD_ROOM} element={<SDRoomPage />} />
              <Route path={ROUTES.SCORING} element={<ScoringPage />} />
            </Route>

            {/* Admin pages — vẫn dùng sidebar chung, bỏ AdminLayout */}
            <Route element={<AdminRoute />}>
              <Route path={ROUTES.ADMIN} element={<AdminProblemsPage />} />
              <Route path={ROUTES.ADMIN_TESTCASES} element={<AdminTestCasesPage />} />
              <Route path={ROUTES.ADMIN_SD_PROBLEMS} element={<AdminSDProblemsPage />} />
              <Route path={ROUTES.ADMIN_QUESTION_BANK} element={<AdminQuestionBankPage />} />
            </Route>
            <Route path={ROUTES.DSA_ROOM_SOLO} element={<DSASessionPage />} />
          </Route>

          <Route element={<InterviewRoomRoute />}>
            <Route path={ROUTES.INTERVIEW_ROOM} element={<InterviewRoomPage />} />
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
