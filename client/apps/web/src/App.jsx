import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { checkAuthRequest } from './store/slices/authSlice'
import LandingPage from './components/landing/LandingPage'
import DashboardPage from './components/dashboard/DashboardPage'
import InterviewRoomPage from './components/interview-room/InterviewRoomPage'
import LoginPage from './components/auth/LoginPage'
import RegisterPage from './components/auth/RegisterPage'
import AdminLayout from './components/admin/AdminLayout'
import AdminProblemsPage from './components/admin/AdminProblemsPage'
import AdminTestCasesPage from './components/admin/AdminTestCasesPage'
import SkillPassportPage from './components/dashboard/profile/SkillPassportPage'
import InterviewSetupFlow from './components/interview-setup/InterviewSetupFlow'
import BehavioralRoomPage from './components/behavioral-room/BehavioralRoomPage'
import CombatInterviewRoom from './components/combat-room/CombatInterviewRoom'
import DSASessionPage from './components/dsa/DSASessionPage'
import ScoringPage from './components/scoring/ScoringPage'
import ProblemBankPage from './components/practice/ProblemBankPage'
import { Loader2 } from 'lucide-react'
import { resetSetup } from './store/slices/interviewSetupSlice'

export default function App() {
  const [page, setPage] = useState('landing') // 'landing' | 'dashboard' | 'interview-room' | 'login' | 'register'
  
  const dispatch = useDispatch();
  const { isAuthenticating, isAuthenticated, user } = useSelector((state) => state.auth);
  const interviewSession = useSelector((state) => state.interviewSetup.session);


  useEffect(() => {
    // Attempt silent refresh on mount
    dispatch(checkAuthRequest());
  }, [dispatch]);

  // Handle redirects on auth state changes
  useEffect(() => {
    if (isAuthenticated && (page === 'login' || page === 'register')) {
      setPage('dashboard');
    }
  }, [isAuthenticated, page]);

  const navigate = (target) => {
    // Protect private routes
    if ((target === 'dashboard' || target === 'interview-room' || target === 'behavioral-room' || target === 'dsa-room' || target === 'interview-setup' || target === 'practice-problems' || target === 'practice-session' || target.startsWith('admin')) && !isAuthenticated && !isAuthenticating) {
      setPage('login');
      return;
    }
    
    // Protect admin routes
    if (target.startsWith('admin') && isAuthenticated && user?.role !== 'admin') {
      setPage('dashboard');
      return;
    }
    
    if (target === 'interview-setup') dispatch(resetSetup());
    setPage(target);
  }

  if (isAuthenticating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-cta animate-spin" />
      </div>
    );
  }

  if (page === 'login') {
    return <LoginPage navigate={navigate} />
  }
  if (page === 'register') {
    return <RegisterPage navigate={navigate} />
  }
  if (page === 'interview-setup') {
    return <InterviewSetupFlow navigate={navigate} />
  }
  if (page === 'interview-room') {
    return <InterviewRoomPage navigate={navigate} />
  }
  if (page === 'behavioral-room') {
    return (
      <BehavioralRoomPage
        navigate={navigate}
        interviewSessionId={interviewSession?.sessionId}
      />
    )
  }
  if (page === 'combat-room') {
    return (
      <CombatInterviewRoom
        interviewSessionId={interviewSession?.sessionId}
        navigate={navigate}
      />
    )
  }
  if (page === 'dsa-room') {
    return <DSASessionPage navigate={navigate} />
  }
  if (page === 'practice-problems') {
    return <ProblemBankPage navigate={navigate} />
  }
  if (page === 'practice-session') {
    return <DSASessionPage navigate={navigate} />
  }
  if (page === 'scoring') {
    const scoringMode = interviewSession?.mode === 'combat' ? 'combat' : 'behavioral'
    return (
      <ScoringPage
        navigate={navigate}
        mode={scoringMode}
        interviewSessionId={interviewSession?.sessionId}
      />
    )
  }
  if (page === 'dashboard') {
    return <DashboardPage navigate={navigate} />
  }
  if (page === 'dashboard-profile') {
    return <SkillPassportPage navigate={navigate} />
  }
  if (page === 'admin-problems' || page === 'admin') {
    return (
      <AdminLayout navigate={navigate} currentPage={page}>
        <AdminProblemsPage navigate={navigate} />
      </AdminLayout>
    )
  }
  if (page === 'admin-testcases') {
    return (
      <AdminLayout navigate={navigate} currentPage={page}>
        <AdminTestCasesPage navigate={navigate} />
      </AdminLayout>
    )
  }
  return <LandingPage navigate={navigate} />
}

