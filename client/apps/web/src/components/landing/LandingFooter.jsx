/**
 * LandingFooter — Minimal footer for Landing Page
 * Style: border-t slate-700/40, slate-500 text — identical to DashboardPage footer
 */
import { Code2, Github, Twitter, Linkedin } from 'lucide-react'

const SOCIAL_LINKS = [
  { icon: Github,   label: 'GitHub'   },
  { icon: Twitter,  label: 'Twitter'  },
  { icon: Linkedin, label: 'LinkedIn' },
]

const NAV_LINKS = ['Giới thiệu', 'Tính năng', 'Liên hệ']

export default function LandingFooter() {
  return (
    <footer className="bg-background border-t border-slate-700/40">
      <div className="max-w-[1200px] mx-auto px-6 py-8">

        {/* Top row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-6">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-cta/15 border border-cta/30 text-cta">
              <Code2 size={14} />
            </span>
            <span className="font-heading text-sm font-semibold text-white">
              Mock<span className="text-cta">Interview</span>
            </span>
          </div>

          {/* Nav links */}
          <nav className="flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <button
                key={link}
                className="font-body text-xs text-slate-500 hover:text-slate-300 transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta rounded"
              >
                {link}
              </button>
            ))}
          </nav>

          {/* Social icons */}
          <div className="flex items-center gap-2">
            {SOCIAL_LINKS.map(({ icon: Icon, label }) => (
              <button
                key={label}
                aria-label={label}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-700/60 text-slate-500 hover:text-white hover:border-slate-600 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta"
              >
                <Icon size={15} strokeWidth={1.5} />
              </button>
            ))}
          </div>
        </div>

        {/* Divider + copyright */}
        <div className="border-t border-slate-700/40 pt-5 text-center">
          <p className="font-body text-xs text-slate-500">
            © {new Date().getFullYear()} Mock Interview App — Phân tích kỹ năng thông minh
          </p>
        </div>
      </div>
    </footer>
  )
}
