/**
 * LandingPage — Marketing / Home page
 * Composed of isolated sub-components.
 * Forces dark mode to match Dashboard and Interview Room.
 */
import { useEffect } from 'react'
import LandingNavbar     from './LandingNavbar'
import HeroSection       from './HeroSection'
import FeaturesSection   from './FeaturesSection'
import HowItWorksSection from './HowItWorksSection'
import CtaBanner         from './CtaBanner'
import LandingFooter     from './LandingFooter'

export default function LandingPage() {
  // Force dark mode (consistent with Dashboard & Interview Room)
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  return (
    <div className="min-h-screen bg-background text-text-base font-body antialiased">
      <LandingNavbar />
      <main>
        <HeroSection />
        <FeaturesSection   />
        <HowItWorksSection />
        <CtaBanner />
      </main>
      <LandingFooter />
    </div>
  )
}
