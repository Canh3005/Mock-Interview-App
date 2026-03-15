import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { fetchProfileRequest } from '../../../store/slices/profileSlice'
import SharedNavbar from '../../shared/SharedNavbar'
import StaticProfileForm from './StaticProfileForm'
import ProfileRadarChart from './ProfileRadarChart'
import DocumentUploadZone from './DocumentUploadZone'

export default function SkillPassportPage({ navigate }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { data: profile, loading } = useSelector((state) => state.profile)
  const [darkMode, setDarkMode] = useState(true)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  useEffect(() => {
    dispatch(fetchProfileRequest())
  }, [dispatch])

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-background text-text-base font-body transition-colors duration-300 pb-20">
        <SharedNavbar
          page="dashboard"
          navigate={navigate}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(d => !d)}
        />
        
        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-heading font-bold text-white mb-2">Skill Passport</h1>
            <p className="text-slate-400">Manage your CV context, track capabilities, and inject them into AI interviews.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Form & Doc Upload */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              
              {/* Document Processing Card */}
              <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 backdrop-blur-sm">
                <h2 className="text-xl font-heading font-semibold text-white mb-4">Context Injection (CV & JD)</h2>
                <DocumentUploadZone />
              </div>

              {/* Static Profile Information Form */}
              <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 backdrop-blur-sm">
                <h2 className="text-xl font-heading font-semibold text-white mb-4">Professional Details</h2>
                {loading && !profile ? (
                  <div className="animate-pulse flex space-x-4">
                    <div className="flex-1 space-y-4 py-1">
                      <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-slate-700 rounded"></div>
                        <div className="h-4 bg-slate-700 rounded w-5/6"></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <StaticProfileForm profileData={profile} />
                )}
              </div>

            </div>

            {/* Right Column: Radar Chart */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 backdrop-blur-sm sticky top-24">
                <h2 className="text-xl font-heading font-semibold text-white mb-4 text-center">Global Capabilities</h2>
                <ProfileRadarChart />
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
