import { useState } from 'react'
import LandingPage from './components/landing/LandingPage'
import DashboardPage from './components/dashboard/DashboardPage'
import InterviewRoomPage from './components/interview-room/InterviewRoomPage'

export default function App() {
  const [page, setPage] = useState('landing') // 'landing' | 'dashboard' | 'interview-room'

  const navigate = (target) => setPage(target)

  if (page === 'interview-room') {
    return <InterviewRoomPage navigate={navigate} />
  }
  if (page === 'dashboard') {
    return <DashboardPage navigate={navigate} />
  }
  return <LandingPage navigate={navigate} />
}

