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
import { useTranslation } from 'react-i18next'
import { useSelector, useDispatch } from 'react-redux'
import { logoutRequest } from '../../store/slices/authSlice'
import LanguageSwitcher from './LanguageSwitcher'

/* ─────────────────────── Sub-components ─────────────────────── */

/** Logo mark — identical across all pages */
function Brand({ navigate, compact = false }) {
  const { t } = useTranslation()
  return (
    <button
      onClick={() => navigate('landing')}
      className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta rounded"
      aria-label={t('navbar.backToHome')}
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
  const { t } = useTranslation()
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <header
      id="shared-navbar"
      className="sticky top-0 z-50 border-b border-slate-700/60 bg-background/80 backdrop-blur-md"
    >
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Brand navigate={navigate} />

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Landing navigation">
          {[
            { label: t('navbar.features'),      id: 'features'     },
            { label: t('navbar.howItWorks'), id: 'how-it-works' },
          ].map(({ label, id }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className="font-body text-sm text-slate-400 hover:text-white transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta rounded"
            >
              {label}
            </button>
          ))}


        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <LanguageSwitcher />
          
          {/* CTA / Auth */}
          <AuthButtons navigate={navigate} />
        </div>
      </div>
    </header>
  )
}

/* ─────────────────────── Dashboard Navbar ─────────────────────── */

function DashboardBar({ navigate, darkMode, onToggleDark }) {
  const { t } = useTranslation()
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-sm text-slate-400 hover:text-white hover:bg-slate-700/40 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta"
          >
            <Home size={16} />
            {t('navbar.home')}
          </button>
          <button
            onClick={() => navigate('interview-room')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-sm text-slate-400 hover:text-white hover:bg-slate-700/40 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta"
          >
            <LayoutDashboard size={16} />
            {t('navbar.interviewRoom')}
          </button>
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <LanguageSwitcher />
          
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
          {/* Avatar & Logout */}
          <DashboardUserMenu navigate={navigate} />
        </div>
      </div>
    </header>
  )
}

/* ─────────────────────── Interview Room Navbar ─────────────────────── */

function InterviewBar({ navigate, children }) {
  const { t } = useTranslation()
  return (
    <header
      id="shared-navbar"
      className="sticky top-0 z-50 h-16 flex-shrink-0 flex items-center justify-between px-4 border-b border-slate-700/50 bg-[#0D1424]/90 backdrop-blur-sm"
    >
      {/* Left: back + brand + breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('dashboard')}
          aria-label={t('navbar.backToDashboard')}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Brand — đồng nhất với Landing & Dashboard */}
        <Brand navigate={navigate} />

        {/* Breadcrumb */}
        <div className="hidden md:flex items-center gap-1.5 font-body text-sm">
          <span className="text-slate-500">/</span>
          <button
            onClick={() => navigate('dashboard')}
            className="text-slate-500 hover:text-slate-300 transition-colors duration-150 cursor-pointer focus-visible:outline-none"
          >
            Dashboard
          </button>
          <span className="text-slate-600">/</span>
          <span className="text-cta font-medium">{t('navbar.interviewRoom')}</span>
        </div>
      </div>

      {/* Right slot: session timer, connection badge, end-session — passed as children */}
      <div className="flex items-center gap-2">
        {/* Language Switcher */}
        <LanguageSwitcher />
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

/* ─────────────────────── Authentication Menu Helpers ─────────────────────── */

function AuthButtons({ navigate }) {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useSelector((state) => state.auth)

  if (isAuthenticated) {
    return (
      <button
        onClick={() => navigate('dashboard')}
        className="inline-flex items-center gap-2 font-body text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg transition-all duration-200 cursor-pointer"
      >
        Dashboard
      </button>
    )
  }

  return (
    <button
      onClick={() => navigate('login')}
      className="inline-flex items-center gap-2 font-body text-sm font-semibold text-white bg-cta hover:bg-cta/90 px-4 py-2 rounded-lg transition-all duration-200 cursor-pointer shadow-md"
    >
      {t('auth.loginTitle') || 'Đăng nhập'}
    </button>
  )
}

function DashboardUserMenu({ navigate }) {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)

  const handleLogout = () => {
    dispatch(logoutRequest())
    navigate('landing')
  }

  return (
    <div className="flex items-center gap-3 ml-2">
      <div className="flex flex-col items-end hidden md:flex">
        <span className="text-sm font-medium text-white">{user?.name || 'User'}</span>
        <button 
          onClick={handleLogout}
          className="text-xs text-slate-500 cursor-pointer hover:text-red-400 transition-colors"
        >
          Đăng xuất
        </button>
      </div>
      <div
        className="flex overflow-hidden items-center justify-center w-9 h-9 rounded-full border-2 border-cta/50 bg-cta/10 text-cta cursor-pointer hover:border-cta transition-colors duration-200"
        title="Hồ sơ"
      >
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <User size={16} />
        )}
      </div>
    </div>
  )
}
