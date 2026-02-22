/**
 * LandingNavbar — Sticky top navigation for the Landing Page
 * Style: dark glass, matching Dashboard/InterviewRoom theme
 */
import { Code2 } from 'lucide-react'

export default function LandingNavbar({ navigate }) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-700/60 bg-background/80 backdrop-blur-md">
      <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between gap-4">

        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-cta/15 border border-cta/30 text-cta">
            <Code2 size={16} />
          </span>
          <span className="font-heading text-sm font-semibold text-white tracking-tight">
            Mock<span className="text-cta">Interview</span>
          </span>
        </div>

        {/* Nav links (desktop) */}
        <nav className="hidden md:flex items-center gap-6">
          {[
            { label: 'Tính năng', id: 'features' },
            { label: 'Cách hoạt động', id: 'how-it-works' },
          ].map(({ label, id }) => (
            <button
              key={id}
              onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
              className="font-body text-sm text-slate-400 hover:text-white transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta rounded"
            >
              {label}
            </button>
          ))}
        </nav>

        {/* CTA */}
        <button
          onClick={() => navigate('interview-room')}
          className="inline-flex items-center gap-2 font-body text-sm font-semibold text-white bg-cta hover:bg-cta/90 px-4 py-2 rounded-lg transition-all duration-200 cursor-pointer hover:-translate-y-0.5 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta"
        >
          Bắt đầu ngay
        </button>
      </div>
    </header>
  )
}
