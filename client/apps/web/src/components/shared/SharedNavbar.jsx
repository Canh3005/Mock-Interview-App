/**
 * SharedNavbar — Unified top navigation bar for all pages
 *
 * Props:
 *   navigate   : (page: string) => void   — from App.jsx state router
 *   page       : 'landing' | 'dashboard' | 'interview-room'
 *   darkMode   : boolean (optional, used only by dashboard toggle)
 *   onToggleDark: () => void (optional)
 *
 * Behaviour per page:
 *   landing       — Logo + anchor links (Tính năng / Cách hoạt động) + CTA "Bắt đầu ngay" → dashboard
 *   dashboard     — Logo + breadcrumb + nav links (Trang chủ / Phòng phỏng vấn) + dark toggle + notification + settings + avatar
 *   interview-room— Compact bar: back chevron + breadcrumb + session meta (timer, connection badge appear via slots)
 */
// No React hooks needed directly here — sub-components are pure
import {
  Code2,
  LayoutDashboard,
  ChevronLeft,
  Sun,
  Moon,
  Bell,
  Settings,
  User,
  Home,
} from 'lucide-react'

/* ─────────────────────── Sub-components ─────────────────────── */

/** Logo mark — identical across all pages */
function Brand({ navigate, compact = false }) {
  return (
    <button
      onClick={() => navigate('landing')}
      className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta rounded"
      aria-label="Về trang chủ"
    >
      <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-cta/15 border border-cta/30 text-cta flex-shrink-0">
        <Code2 size={16} />
      </span>
      {!compact && (
        <span className="font-heading text-sm font-semibold text-white tracking-tight">
          Mock<span className="text-cta">Interview</span>
        </span>
      )}
    </button>
  )
}

/** Icon action button used in dashboard / interview room */
function IconBtn({ icon: Icon, label, onClick, badge = false, className = '' }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`relative flex items-center justify-center w-9 h-9 rounded-lg border border-slate-700/60 text-slate-400 hover:text-white hover:border-slate-600 transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta ${className}`}
    >
      <Icon size={16} />
      {badge && (
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-cta rounded-full" aria-hidden="true" />
      )}
    </button>
  )
}

/* ─────────────────────── Landing Navbar ─────────────────────── */

function LandingBar({ navigate }) {
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <header
      id="shared-navbar"
      className="sticky top-0 z-50 border-b border-slate-700/60 bg-background/80 backdrop-blur-md"
    >
      <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <Brand navigate={navigate} />

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Landing navigation">
          {[
            { label: 'Tính năng',      id: 'features'     },
            { label: 'Cách hoạt động', id: 'how-it-works' },
          ].map(({ label, id }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className="font-body text-sm text-slate-400 hover:text-white transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta rounded"
            >
              {label}
            </button>
          ))}

          {/* Dashboard link */}
          <button
            onClick={() => navigate('dashboard')}
            className="font-body text-sm text-slate-400 hover:text-white transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta rounded"
          >
            Dashboard
          </button>
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

/* ─────────────────────── Dashboard Navbar ─────────────────────── */

function DashboardBar({ navigate, darkMode, onToggleDark }) {
  return (
    <header
      id="shared-navbar"
      className="sticky top-0 z-40 border-b border-slate-700/60 bg-background/80 backdrop-blur-md"
    >
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo + breadcrumb */}
        <div className="flex items-center gap-3">
          <Brand navigate={navigate} />
          <span className="font-body text-xs text-slate-500 hidden md:block">/</span>
          <span className="font-heading text-sm font-medium text-cta hidden md:block">Dashboard</span>
        </div>

        {/* Centre nav links */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Dashboard navigation">
          <button
            onClick={() => navigate('landing')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-xs text-slate-400 hover:text-white hover:bg-slate-700/40 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta"
          >
            <Home size={13} />
            Trang chủ
          </button>
          <button
            onClick={() => navigate('interview-room')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-xs text-slate-400 hover:text-white hover:bg-slate-700/40 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta"
          >
            <LayoutDashboard size={13} />
            Phòng phỏng vấn
          </button>
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Dark mode toggle */}
          <IconBtn
            icon={darkMode ? Sun : Moon}
            label={darkMode ? 'Chuyển sang light mode' : 'Chuyển sang dark mode'}
            onClick={onToggleDark}
          />
          {/* Notification */}
          <IconBtn icon={Bell} label="Thông báo" badge />
          {/* Settings */}
          <IconBtn icon={Settings} label="Cài đặt" />
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
  )
}

/* ─────────────────────── Interview Room Navbar ─────────────────────── */

function InterviewBar({ navigate, children }) {
  return (
    <header
      id="shared-navbar"
      className="sticky top-0 z-50 h-12 flex-shrink-0 flex items-center justify-between px-4 border-b border-slate-700/50 bg-[#0D1424]/90 backdrop-blur-sm"
    >
      {/* Left: back + breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('dashboard')}
          aria-label="Quay lại Dashboard"
          className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Clickable brand → landing */}
        <button
          onClick={() => navigate('landing')}
          className="flex items-center justify-center w-7 h-7 rounded-md bg-cta/15 border border-cta/30 text-cta hover:bg-cta/25 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta flex-shrink-0"
          aria-label="Về trang chủ"
        >
          <Code2 size={14} />
        </button>

        <div className="flex items-center gap-1.5 font-['Fira_Code',monospace] text-xs">
          {/* Landing link */}
          <button
            onClick={() => navigate('landing')}
            className="text-slate-500 hover:text-slate-300 transition-colors duration-150 cursor-pointer focus-visible:outline-none"
          >
            Mock Interview
          </button>
          <span className="text-slate-600">/</span>
          {/* Dashboard link */}
          <button
            onClick={() => navigate('dashboard')}
            className="text-slate-500 hover:text-slate-300 transition-colors duration-150 cursor-pointer focus-visible:outline-none"
          >
            Dashboard
          </button>
          <span className="text-slate-600">/</span>
          <span className="text-cta font-semibold">Interview Room</span>
        </div>
      </div>

      {/* Right slot: session timer, connection badge, end-session — passed as children */}
      <div className="flex items-center gap-2">
        {children}
      </div>
    </header>
  )
}

/* ─────────────────────── Main export ─────────────────────── */

export default function SharedNavbar({ page, navigate, darkMode, onToggleDark, children }) {
  if (page === 'interview-room') {
    return <InterviewBar navigate={navigate}>{children}</InterviewBar>
  }
  if (page === 'dashboard') {
    return (
      <DashboardBar
        navigate={navigate}
        darkMode={darkMode}
        onToggleDark={onToggleDark}
      />
    )
  }
  // default: landing
  return <LandingBar navigate={navigate} />
}
