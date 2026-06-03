import { Github, Code2, Target, Award, Activity, Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ROUTES } from '../../router/routes'
import { interviewApi } from '../../api/interview.api'
import StatCard from './StatCard'
import RadarChartPlaceholder from './RadarChartPlaceholder'
import LearningPath from './LearningPath'
import SkillBreakdown from './SkillBreakdown'
import UpcomingSessions from './UpcomingSessions'
import InProgressSessions from './InProgressSessions'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const token = useSelector((state) => state.auth.accessToken)
  const user = useSelector((state) => state.auth.user)
  const isGithubLinked = user?.linkedProviders?.includes('github')

  const [analytics, setAnalytics] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)

  useEffect(() => {
    interviewApi
      .getAnalytics()
      .then(setAnalytics)
      .catch(() => {})
      .finally(() => setAnalyticsLoading(false))
  }, [])

  const delta = analytics?.overview?.improvementDelta
  const stats = [
    {
      icon: <Code2 size={20} />,
      label: t('dashboard.stats.totalInterviews'),
      value: analyticsLoading ? '—' : String(analytics?.overview?.totalCompleted ?? '—'),
      change: delta != null ? (delta >= 0 ? `+${delta}` : String(delta)) : null,
      changeType: delta != null ? (delta >= 0 ? 'up' : 'down') : 'neutral',
    },
    {
      icon: <Target size={20} />,
      label: t('dashboard.stats.avgScore'),
      value: analyticsLoading ? '—' : (analytics?.overview?.averageScore != null ? String(analytics.overview.averageScore) : '—'),
      change: null,
      changeType: 'neutral',
    },
    {
      icon: <Award size={20} />,
      label: t('dashboard.stats.skillsMastered'),
      value: analyticsLoading ? '—' : (analytics?.weaknesses?.[0]?.label ?? '—'),
      change: analytics?.weaknesses?.[0]?.averageScore != null ? `${analytics.weaknesses[0].averageScore}%` : null,
      changeType: 'down',
    },
    {
      icon: <Activity size={20} />,
      label: t('dashboard.stats.studyStreak'),
      value: analyticsLoading ? '—' : (analytics ? t('dashboard.stats.dayCount', { count: analytics.overview.currentStreak }) : '—'),
      change: null,
      changeType: 'neutral',
    },
  ]

  const handleGithubLink = () => {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    window.location.href = `${backendUrl}/auth/github/link?t=${token}`
  }

  return (
    <div className="dash-page-shell min-h-full transition-colors duration-200">
      <main className="dash-page">
        <header className="dash-page-header">
          <div>
            <h1 className="dash-page-title">{t('dashboard.title')}</h1>
            <p className="dash-page-description">
              {t('dashboard.description')}
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            {!isGithubLinked && (
              <button
                onClick={handleGithubLink}
                className="dash-card inline-flex h-11 items-center justify-center gap-2 rounded-[14px] px-5 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:text-[var(--dash-accent-text)]"
              >
                <Github size={16} />
                {t('auth.linkingGitHub')}
              </button>
            )}
            <button
              onClick={() => navigate(ROUTES.INTERVIEW_SETUP)}
              className="dash-primary-button inline-flex h-11 items-center justify-center gap-2 rounded-[14px] px-5 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5"
            >
              <Play size={17} />
              {t('dashboard.startInterview')}
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat, index) => (
            <StatCard key={stat.label} {...stat} isPrimary={index === 0} />
          ))}
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <RadarChartPlaceholder colSpan="lg:col-span-4" competencies={analytics?.competencyBreakdown ?? []} loading={analyticsLoading} />
          <SkillBreakdown colSpan="lg:col-span-8" competencies={analytics?.competencyBreakdown ?? []} weaknesses={analytics?.weaknesses ?? []} loading={analyticsLoading} />
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <InProgressSessions />
          </div>
          <div className="flex flex-col gap-5 lg:col-span-4">
            <LearningPath />
            <UpcomingSessions compact />
          </div>
        </section>
      </main>
    </div>
  )
}
