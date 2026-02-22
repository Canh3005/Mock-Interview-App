import { useState } from 'react'
import DashboardPage from './components/dashboard/DashboardPage'
import InterviewRoomPage from './components/interview-room/InterviewRoomPage'

export default function App() {
  const [page, setPage] = useState('interview-room') // 'dashboard' | 'interview-room'

  const navigate = (target) => setPage(target)

  if (page === 'interview-room') {
    return <InterviewRoomPage navigate={navigate} />
  }
  return <DashboardPage navigate={navigate} />
}
