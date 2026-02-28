import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { checkAuthRequest } from './store/slices/authSlice'
import LandingPage from './components/landing/LandingPage'
import DashboardPage from './components/dashboard/DashboardPage'
import InterviewRoomPage from './components/interview-room/InterviewRoomPage'
import LoginPage from './components/auth/LoginPage'
import RegisterPage from './components/auth/RegisterPage'
import { Loader2 } from 'lucide-react'

export default function App() {
  const [page, setPage] = useState('landing') // 'landing' | 'dashboard' | 'interview-room' | 'login' | 'register'
  
  const dispatch = useDispatch();
  const { isAuthenticating, isAuthenticated } = useSelector((state) => state.auth);

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
    if ((target === 'dashboard' || target === 'interview-room') && !isAuthenticated && !isAuthenticating) {
      setPage('login');
      return;
    }
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
  if (page === 'interview-room') {
    return <InterviewRoomPage navigate={navigate} />
  }
  if (page === 'dashboard') {
    return <DashboardPage navigate={navigate} />
  }
  return <LandingPage navigate={navigate} />
}

