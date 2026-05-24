import { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { fetchProfileRequest } from '../../../store/slices/profileSlice'
import StaticProfileForm from './StaticProfileForm'
import ProfileRadarChart from './ProfileRadarChart'
import DocumentUploadZone from './DocumentUploadZone'
import AssessmentHistory from './AssessmentHistory'

export default function SkillPassportPage() {
  const dispatch = useDispatch()
  const { data: profile, loading } = useSelector((state) => state.profile)

  useEffect(() => {
    dispatch(fetchProfileRequest())
  }, [dispatch])

  return (
    <div className="dash-page-shell min-h-full pb-20">
        <main className="dash-page">
          <header className="dash-page-header">
            <div>
              <h1 className="dash-page-title">Skill Passport</h1>
              <p className="dash-page-description">
                Manage your CV context, track capabilities, and inject them into AI interviews.
              </p>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left Column: Upload + Professional Details */}
            <div className="lg:col-span-7 flex flex-col gap-6">

              {/* Document Processing Card */}
              <div className="dash-card rounded-2xl p-6">
                <h2 className="dash-text text-xl font-heading font-semibold mb-4">Context Injection (CV & JD)</h2>
                <DocumentUploadZone />
              </div>

              {/* Static Profile Information Form */}
              <div className="dash-card rounded-2xl p-6">
                <h2 className="dash-text text-xl font-heading font-semibold mb-4">Professional Details</h2>
                {loading && !profile ? (
                  <div className="animate-pulse flex space-x-4">
                    <div className="flex-1 space-y-4 py-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <StaticProfileForm profileData={profile} />
                )}
              </div>

            </div>

            {/* Right Column: Radar Chart + Assessment History */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="dash-card rounded-2xl p-6">
                <h2 className="dash-text text-xl font-heading font-semibold mb-4 text-center">Global Capabilities</h2>
                <ProfileRadarChart />
              </div>

              <AssessmentHistory />
            </div>

          </div>
        </main>
    </div>
  )
}
