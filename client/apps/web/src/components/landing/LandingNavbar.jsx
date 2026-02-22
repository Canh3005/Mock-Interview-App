/**
 * LandingNavbar — re-exports SharedNavbar configured for the 'landing' page.
 * Kept as a thin wrapper so LandingPage import doesn't change.
 */
import SharedNavbar from '../shared/SharedNavbar'

export default function LandingNavbar({ navigate }) {
  return <SharedNavbar page="landing" navigate={navigate} />
}
