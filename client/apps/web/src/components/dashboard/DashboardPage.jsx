/**
 * DashboardPage — Main dashboard with Bento Box grid layout
 * Layout (12-col grid):
 *   Row 1: 4 StatCards (col-span-3 each)
 *   Row 2: RadarChart (col-span-5, center) + SkillBreakdown (col-span-4) + UpcomingSessions (col-span-3)
 *   Row 3: InterviewHistory (col-span-8) + LearningPath (col-span-4)
 */
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Sun,
  Moon,
  Bell,
  Settings,
  User,
  Code2,
  Target,
  Award,
  Activity,
} from 'lucide-react'
import StatCard from './StatCard'
import RadarChartPlaceholder from './RadarChartPlaceholder'
import InterviewHistory from './InterviewHistory'
import LearningPath from './LearningPath'
import SkillBreakdown from './SkillBreakdown'
import UpcomingSessions from './UpcomingSessions'

export default function DashboardPage() {
  const [darkMode, setDarkMode] = useState(true)

  // Sync dark class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  const stats = [
    {
      icon: <Code2 size={18} />,
      label: 'Tổng phỏng vấn',
      value: '47',
      change: '+3 tuần này',
      changeType: 'up',
    },
    {
      icon: <Target size={18} />,
      label: 'Điểm trung bình',
      value: '77.4',
      change: '+2.1 so với tháng trước',
      changeType: 'up',
    },
    {
      icon: <Award size={18} />,
      label: 'Kỹ năng thành thạo',
      value: '12',
      change: '2 kỹ năng mới',
      changeType: 'up',
    },
    {
      icon: <Activity size={18} />,
      label: 'Chuỗi luyện tập',
      value: '14 ngày',
      change: 'Kỷ lục cá nhân!',
      changeType: 'neutral',
    },
  ]

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-background text-text-base font-body transition-colors duration-300">

        {/* ── Header / Top Nav ── */}
        <header className="sticky top-0 z-40 border-b border-slate-700/60 bg-background/80 backdrop-blur-md">
          <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
            {/* Logo + Title */}
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-cta/20 border border-cta/40 text-cta">
                <LayoutDashboard size={16} />
              </span>
              <span className="font-heading text-sm font-semibold text-white tracking-tight hidden sm:block">
                Mock Interview
              </span>
              <span className="font-body text-xs text-slate-500 hidden md:block">/</span>
              <span className="font-heading text-sm font-medium text-cta hidden md:block">Dashboard</span>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              {/* Dark mode toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                aria-label={darkMode ? 'Chuyển sang light mode' : 'Chuyển sang dark mode'}
                className="flex items-center justify-center w-9 h-9 rounded-lg border border-slate-700/60 text-slate-400 hover:text-white hover:border-slate-600 transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta"
              >
                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              {/* Notification */}
              <button
                aria-label="Thông báo"
                className="relative flex items-center justify-center w-9 h-9 rounded-lg border border-slate-700/60 text-slate-400 hover:text-white hover:border-slate-600 transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta"
              >
                <Bell size={16} />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-cta rounded-full" aria-hidden="true" />
              </button>

              {/* Settings */}
              <button
                aria-label="Cài đặt"
                className="flex items-center justify-center w-9 h-9 rounded-lg border border-slate-700/60 text-slate-400 hover:text-white hover:border-slate-600 transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta"
              >
                <Settings size={16} />
              </button>

              {/* Avatar */}
              <div
                className="flex items-center justify-center w-9 h-9 rounded-full border-2 border-cta/50 bg-cta/10 text-cta cursor-pointer hover:border-cta transition-colors duration-200"
                role="button"
                tabIndex={0}
                aria-label="Hồ sơ người dùng"
              >
                <User size={16} />
              </div>
            </div>
          </div>
        </header>

        {/* ── Main Content ── */}
        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-5">

          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h1 className="font-heading text-2xl font-bold text-white leading-tight">
                Xin chào, Minh Tú
              </h1>
              <p className="font-body text-sm text-slate-400 mt-1">
                Đây là tổng quan kỹ năng phỏng vấn của bạn — Chủ nhật, 22 tháng 2 năm 2026
              </p>
            </div>
            <button className="shrink-0 inline-flex items-center gap-2 font-body text-sm font-semibold text-white bg-cta hover:bg-cta/90 px-5 py-2.5 rounded-xl transition-all duration-200 cursor-pointer hover:-translate-y-0.5 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta">
              <Code2 size={15} />
              Bắt đầu phỏng vấn
            </button>
          </div>

          {/* ── Row 1: Stat Cards (4 × col-span-3) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s, i) => (
              <StatCard key={i} {...s} onClick={() => {}} />
            ))}
          </div>

          {/* ── Row 2: Radar (center) + Skill Breakdown + Upcoming Sessions ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Radar Chart — center piece (5 cols) */}
            <div className="lg:col-span-5">
              <RadarChartPlaceholder />
            </div>

            {/* Skill Breakdown (4 cols) */}
            <div className="lg:col-span-4">
              <SkillBreakdown />
            </div>

            {/* Upcoming Sessions (3 cols) */}
            <div className="lg:col-span-3">
              <UpcomingSessions />
            </div>
          </div>

          {/* ── Row 3: Interview History (8 cols) + Learning Path (4 cols) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8">
              <InterviewHistory />
            </div>
            <div className="lg:col-span-4">
              <LearningPath />
            </div>
          </div>

        </main>

        {/* ── Footer ── */}
        <footer className="max-w-[1400px] mx-auto px-6 py-6 border-t border-slate-700/40 mt-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="font-body text-xs text-slate-500">
              © 2026 Mock Interview App — Phân tích kỹ năng thông minh
            </p>
            <div className="flex items-center gap-5">
              {['Hỗ trợ', 'Quyền riêng tư', 'Điều khoản'].map((link) => (
                <button
                  key={link}
                  className="font-body text-xs text-slate-500 hover:text-slate-300 transition-colors duration-200 cursor-pointer"
                >
                  {link}
                </button>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
