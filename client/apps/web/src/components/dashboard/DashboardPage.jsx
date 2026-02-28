/**
 * DashboardPage — Main dashboard with Bento Box grid layout
 * Layout (12-col grid):
 *   Row 1: 4 StatCards (col-span-3 each)
 *   Row 2: RadarChart (col-span-5, center) + SkillBreakdown (col-span-4) + UpcomingSessions (col-span-3)
 *   Row 3: InterviewHistory (col-span-8) + LearningPath (col-span-4)
 */
import { useState, useEffect } from 'react'
import { Code2, Target, Award, Activity } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import SharedNavbar from '../shared/SharedNavbar'
import StatCard from './StatCard'
import RadarChartPlaceholder from './RadarChartPlaceholder'
import InterviewHistory from './InterviewHistory'
import LearningPath from './LearningPath'
import SkillBreakdown from './SkillBreakdown'
import UpcomingSessions from './UpcomingSessions'

export default function DashboardPage({ navigate = () => {} }) {
  const { t } = useTranslation()
  const [darkMode, setDarkMode] = useState(true)

  // Sync dark class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  const stats = [
    {
      icon: <Code2 size={18} />,
      label: t('dashboard.stats.totalInterviews'),
      value: '47',
      change: `+3 ${t('dashboard.stats.weekChange')}`,
      changeType: 'up',
    },
    {
      icon: <Target size={18} />,
      label: t('dashboard.stats.avgScore'),
      value: '77.4',
      change: `+2.1 ${t('dashboard.stats.monthChange')}`,
      changeType: 'up',
    },
    {
      icon: <Award size={18} />,
      label: t('dashboard.stats.skillsMastered'),
      value: '12',
      change: `2 ${t('dashboard.stats.newSkills')}`,
      changeType: 'up',
    },
    {
      icon: <Activity size={18} />,
      label: t('dashboard.stats.studyStreak'),
      value: '14 ngày',
      change: t('dashboard.stats.personalRecord'),
      changeType: 'neutral',
    },
  ]

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-background text-text-base font-body transition-colors duration-300">

        {/* ── Shared Navbar ── */}
        <SharedNavbar
          page="dashboard"
          navigate={navigate}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(d => !d)}
        />

        {/* ── Main Content ── */}
        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-5">

          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h1 className="font-heading text-2xl font-bold text-white leading-tight">
                {t('dashboard.welcome')}, Minh Tú
              </h1>
              <p className="font-body text-sm text-slate-400 mt-1">
                {t('dashboard.greeting')} — Chủ nhật, 22 tháng 2 năm 2026
              </p>
            </div>
            <button
              onClick={() => navigate('interview-room')}
              className="shrink-0 inline-flex items-center gap-2 font-body text-sm font-semibold text-white bg-cta hover:bg-cta/90 px-5 py-2.5 rounded-xl transition-all duration-200 cursor-pointer hover:-translate-y-0.5 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta"
            >
              <Code2 size={15} />
              {t('dashboard.startInterview')}
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
              {t('dashboard.footer.copyright')}
            </p>
            <div className="flex items-center gap-5">
              {[
                { key: 'support', label: t('dashboard.footer.support') },
                { key: 'privacy', label: t('dashboard.footer.privacy') },
                { key: 'terms', label: t('dashboard.footer.terms') }
              ].map((link) => (
                <button
                  key={link.key}
                  className="font-body text-xs text-slate-500 hover:text-slate-300 transition-colors duration-200 cursor-pointer"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
