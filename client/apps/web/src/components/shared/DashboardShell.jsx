import { useState, useEffect, createContext, useContext } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  Code2,
  LayoutDashboard,
  BookOpen,
  BookOpenCheck,
  Play,
  User,
  Settings,
  Shield,
  LogOut,
  Sun,
  Moon,
  Bell,
  Coins,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  CircleHelp,
  AlertTriangle,
} from 'lucide-react'
import { ROUTES } from '../../router/routes'
import { logoutRequest } from '../../store/slices/authSlice'
import { resetBehavioral } from '../../store/slices/behavioralSlice'
import { resetDSASession } from '../../store/slices/dsaSessionSlice'
import { resetSDSession } from '../../store/slices/sdSessionSlice'
import { resetInterviewer } from '../../store/slices/sdInterviewerSlice'
import { evaluationReset } from '../../store/slices/sdEvaluatorSlice'
import { resetSetup } from '../../store/slices/interviewSetupSlice'
import LanguageSwitcher from './LanguageSwitcher'

const SidebarCollapsedContext = createContext(false)
const NavigationRequestContext = createContext(null)

function CreditBadge() {
  const { t } = useTranslation()
  const { balance } = useSelector((s) => s.wallet)
  if (balance === null) return null

  return (
    <div className="dash-chip hidden h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold lg:flex">
      <Coins size={15} />
      <span>{balance} {t('wallet.credits')}</span>
    </div>
  )
}

function TopBar({ darkMode, onToggleDark, focusMode = false, focusLabel, onNavigate }) {
  const { t } = useTranslation()
  const { user } = useSelector((s) => s.auth)
  const userName = user?.name || 'User'
  const initial = userName.trim().charAt(0).toUpperCase() || 'U'

  if (focusMode) {
    return (
      <header className="dash-surface shrink-0 rounded-[22px] border px-3 py-2.5 shadow-shell transition-colors duration-200 sm:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="dash-subtle text-xs font-semibold uppercase tracking-[0.08em]">
              {t('dashboard.focus.mode')}
            </p>
            <h1 className="dash-text truncate text-sm font-bold sm:text-base">{focusLabel}</h1>
          </div>

          <div className="flex min-w-0 items-center gap-2">
            <LanguageSwitcher variant="light" />
            <button
              onClick={onToggleDark}
              aria-label={darkMode ? 'Light mode' : 'Dark mode'}
              className="dash-icon-button"
            >
              {darkMode ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button
              onClick={() => onNavigate?.(ROUTES.DASHBOARD_PROFILE)}
              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cta text-sm font-bold text-[var(--dash-accent-contrast)] ring-2 ring-[var(--dash-accent-soft)]"
              title={userName}
            >
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                : initial}
            </button>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="dash-surface shrink-0 rounded-[24px] border px-3 py-3 shadow-shell transition-colors duration-200 sm:px-4 lg:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="dash-input flex h-11 min-w-[220px] flex-1 items-center gap-3 rounded-[14px] px-4 transition-colors focus-within:bg-[var(--dash-surface-raised)] lg:max-w-xl">
          <Search size={19} className="dash-muted shrink-0" />
          <input
            type="search"
            placeholder="Search task..."
            className="dash-text w-full border-0 bg-transparent p-0 text-sm placeholder:text-[var(--dash-subtle)] focus:ring-0"
          />
          <span className="dash-muted-panel dash-subtle hidden shrink-0 whitespace-nowrap rounded-lg border px-2 py-1 font-mono text-[11px] sm:inline-flex">
            Ctrl F
          </span>
        </label>

        <div className="flex min-w-0 items-center gap-2">
          <CreditBadge />
          <LanguageSwitcher variant="light" />

          <div className="dash-divider hidden h-8 w-px md:block" />

          <button
            onClick={onToggleDark}
            aria-label={darkMode ? 'Light mode' : 'Dark mode'}
            className="dash-icon-button"
          >
            {darkMode ? <Sun size={19} /> : <Moon size={19} />}
          </button>

          <button
            aria-label="Thông báo"
            className="dash-icon-button relative"
          >
            <Bell size={19} />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-cta ring-2 ring-[var(--dash-shell)]" />
          </button>

          <button
            aria-label="Cài đặt"
            className="dash-icon-button hidden sm:flex"
          >
            <Settings size={19} />
          </button>

          <button
            onClick={() => onNavigate?.(ROUTES.DASHBOARD_PROFILE)}
            className="group ml-1 flex h-11 min-w-0 items-center gap-3 rounded-[14px] border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] px-2.5 text-left shadow-[var(--dash-shadow-control)] transition-colors hover:border-[var(--dash-border-strong)]"
            title={userName}
          >
            <span className="hidden min-w-0 flex-col md:flex">
              <span className="dash-text max-w-[140px] truncate text-sm font-semibold group-hover:text-[var(--dash-accent-text)]">
                {userName}
              </span>
              <span className="dash-subtle text-xs">Học viên</span>
            </span>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cta text-sm font-bold text-[var(--dash-accent-contrast)] ring-2 ring-[var(--dash-accent-soft)]">
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                : initial}
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}

function NavItem({ to, icon: Icon, label, exact = false, collapsed: collapsedProp, onRequestNavigate }) {
  const collapsed = collapsedProp ?? useContext(SidebarCollapsedContext)
  const requestNavigate = onRequestNavigate ?? useContext(NavigationRequestContext)

  return (
    <NavLink
      to={to}
      end={exact}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      onClick={(event) => requestNavigate?.(to, event)}
      className={({ isActive }) =>
        [
          collapsed
            ? 'mx-auto flex h-11 w-11 items-center justify-center rounded-[14px] border text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta/50'
            : 'mx-3 flex min-h-11 items-center gap-3 rounded-[14px] border-l-[3px] px-3 py-2.5 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta/50',
          isActive ? 'dash-nav-active' : 'dash-nav-muted',
        ].join(' ')
      }
    >
      <Icon size={18} className="shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  )
}

function NavItemGroup({ icon: Icon, label, children, matchPrefix, collapsed: collapsedProp, onRequestNavigate }) {
  const { pathname } = useLocation()
  const collapsed = collapsedProp ?? useContext(SidebarCollapsedContext)
  const requestNavigate = onRequestNavigate ?? useContext(NavigationRequestContext)
  const isAnyChildActive = pathname.startsWith(matchPrefix)
  const [open, setOpen] = useState(isAnyChildActive)

  useEffect(() => {
    if (isAnyChildActive) setOpen(true)
  }, [isAnyChildActive])

  if (collapsed) {
    return (
      <button
        onClick={() => requestNavigate?.(matchPrefix)}
        title={label}
        aria-label={label}
        className={[
          'mx-auto flex h-11 w-11 items-center justify-center rounded-[14px] border text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta/50',
          isAnyChildActive ? 'dash-nav-active' : 'dash-nav-muted',
        ].join(' ')}
      >
        <Icon size={18} className="shrink-0" />
      </button>
    )
  }

  return (
    <div>
      <button
        onClick={() => setOpen((value) => !value)}
        className={[
          'mx-3 flex min-h-11 w-[calc(100%-1.5rem)] items-center gap-3 rounded-[14px] border-l-[3px] px-3 py-2.5 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta/50',
          isAnyChildActive ? 'dash-nav-active' : 'dash-nav-muted',
        ].join(' ')}
      >
        <Icon size={18} className="shrink-0" />
        <span className="flex-1 truncate text-left">{label}</span>
        <ChevronDown size={15} className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="dash-border mx-7 my-2 border-l pl-3">
          {children}
        </div>
      )}
    </div>
  )
}

function NavSubItem({ to, label, exact = false, onRequestNavigate }) {
  const requestNavigate = onRequestNavigate ?? useContext(NavigationRequestContext)

  return (
    <NavLink
      to={to}
      end={exact}
      onClick={(event) => requestNavigate?.(to, event)}
      className={({ isActive }) =>
        [
          'flex w-full items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150',
          isActive ? 'dash-nav-active font-semibold' : 'dash-nav-muted',
        ].join(' ')
      }
    >
      {label}
    </NavLink>
  )
}

function Sidebar({ collapsed, collapseLocked = false, onToggleCollapsed, onNavigate, onLogout }) {
  const { t } = useTranslation()
  const { user } = useSelector((s) => s.auth)
  const requestNavigate = onNavigate ?? useContext(NavigationRequestContext)
  const sidebarToggleLabel = collapsed ? 'Mo rong thanh dieu huong' : 'Thu gon thanh dieu huong'

  return (
    <SidebarCollapsedContext.Provider value={collapsed}>
      <div
        className={[
          'relative hidden shrink-0 transition-all duration-200 lg:block',
          collapsed ? 'w-[88px]' : 'w-[276px]',
        ].join(' ')}
      >
        <aside className="dash-surface flex h-full w-full flex-col overflow-hidden rounded-[26px] border shadow-shell transition-colors duration-200">
      <div className={collapsed ? 'px-3 pb-5 pt-5' : 'px-5 pb-6 pt-7'}>
        <div className={collapsed ? 'flex justify-center' : 'flex items-center'}>
          <button
            onClick={() => requestNavigate?.(ROUTES.LANDING)}
            title={collapsed ? 'MockInterview' : undefined}
            aria-label={collapsed ? 'MockInterview' : undefined}
            className={[
              'flex items-center rounded-[16px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta/50',
              collapsed ? 'h-11 w-11 justify-center' : 'min-w-0 flex-1 gap-3 p-1 text-left',
            ].join(' ')}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-cta text-base font-bold text-[var(--dash-accent-contrast)] shadow-[var(--dash-shadow-control)]">
              <Code2 size={21} />
            </span>
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate text-xl font-extrabold leading-tight text-cta">MockInterview</span>
                <span className="dash-subtle block truncate text-xs font-medium">AI Interview Practice</span>
              </span>
            )}
          </button>
        </div>
      </div>

      <nav
        id="dashboard-sidebar-nav"
        className={collapsed ? 'flex-1 space-y-2 overflow-y-auto pb-4' : 'flex-1 space-y-1 overflow-y-auto pb-4'}
        aria-label="Sidebar navigation"
      >
        <NavItem to={ROUTES.DASHBOARD} icon={LayoutDashboard} label={t('navbar.dashboard')} exact collapsed={collapsed} onRequestNavigate={onNavigate} />
        <NavItem to={ROUTES.QUESTION_BANK} icon={BookOpenCheck} label={t('navbar.questionBank') || 'Ngân hàng câu hỏi'} />
        <NavItem to={ROUTES.DASHBOARD_PROFILE} icon={User} label="Skill Passport" collapsed={collapsed} onRequestNavigate={onNavigate} />
        <NavItem to={ROUTES.PRACTICE_PROBLEMS} icon={BookOpen} label="Luyện tập thuật toán" />
        <NavItem
          to={ROUTES.INTERVIEW_SETUP}
          icon={Play}
          label={t('dashboard.startInterview') || 'Bat dau phong van'}
          collapsed={collapsed}
          onRequestNavigate={onNavigate}
        />

        {user?.role === 'admin' && (
          <NavItemGroup icon={Shield} label="Quản trị" matchPrefix="/admin">
            <NavSubItem to={ROUTES.ADMIN} label="Bài tập kỹ thuật" exact />
            <NavSubItem to={ROUTES.ADMIN_TESTCASES} label="Test Cases" />
            <NavSubItem to={ROUTES.ADMIN_SD_PROBLEMS} label="System Design" />
            <NavSubItem to={ROUTES.ADMIN_QUESTION_BANK} label="Ngân hàng câu hỏi" />
          </NavItemGroup>
        )}
      </nav>

      <div className="dash-border border-t px-3 py-4">
        <button
          disabled
          title={collapsed ? 'Settings' : undefined}
          aria-label={collapsed ? 'Settings' : undefined}
          className={[
            'dash-subtle flex min-h-10 items-center rounded-[14px] text-sm font-semibold',
            collapsed ? 'mx-auto w-10 justify-center px-0 py-0 [&>span]:hidden' : 'w-full gap-3 px-3 py-2',
          ].join(' ')}
        >
          <Settings size={18} className="shrink-0" />
          <span>Settings</span>
        </button>
        <button
          disabled
          title={collapsed ? 'Help' : undefined}
          aria-label={collapsed ? 'Help' : undefined}
          className={[
            'dash-subtle flex min-h-10 items-center rounded-[14px] text-sm font-semibold',
            collapsed ? 'mx-auto w-10 justify-center px-0 py-0 [&>span]:hidden' : 'w-full gap-3 px-3 py-2',
          ].join(' ')}
        >
          <CircleHelp size={18} className="shrink-0" />
          <span>Help</span>
        </button>
      </div>

      <div className={collapsed ? 'dash-border border-t p-3' : 'dash-border border-t p-4'}>
        <div className={collapsed ? 'flex flex-col items-center gap-2' : 'flex items-center gap-3 rounded-[18px] bg-[var(--dash-surface-muted)] p-2.5'}>
          <span className="dash-chip flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border">
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              : <User size={16} />}
          </span>
          <div className={collapsed ? 'hidden' : 'min-w-0 flex-1'}>
            <p className="dash-text truncate text-sm font-semibold">{user?.name || 'User'}</p>
            <p className="dash-subtle truncate text-xs">{user?.email || ''}</p>
          </div>
          <button
            onClick={onLogout}
            aria-label="Đăng xuất"
            className={[
              'flex shrink-0 items-center justify-center text-[var(--dash-subtle)] transition-colors hover:bg-red-500/10 hover:text-red-500',
              collapsed ? 'h-10 w-10 rounded-[14px]' : 'h-9 w-9 rounded-xl',
            ].join(' ')}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
        </aside>

        {!collapseLocked && (
          <button
            onClick={onToggleCollapsed}
            aria-controls="dashboard-sidebar-nav"
            aria-expanded={!collapsed}
            aria-label={sidebarToggleLabel}
            title={sidebarToggleLabel}
            className="dash-control absolute -right-3 top-7 z-20 flex h-8 w-8 items-center justify-center rounded-full border text-[var(--dash-muted)] shadow-[var(--dash-shadow-control)] transition-colors hover:text-[var(--dash-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta/50"
          >
            {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </button>
        )}
      </div>
    </SidebarCollapsedContext.Provider>
  )
}

function NavigationConfirmModal({ onCancel, onConfirm }) {
  const { t } = useTranslation()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="dash-card w-full max-w-sm rounded-[20px] p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-red-500/30 bg-red-500/10 text-red-500">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h2 className="dash-text text-base font-bold">{t('dashboard.focus.exitModal.title')}</h2>
            <p className="dash-subtle mt-1 text-sm leading-relaxed">
              {t('dashboard.focus.exitModal.description')}{' '}
              <span className="font-semibold text-red-500">{t('dashboard.focus.exitModal.descriptionHighlight')}</span>
              {t('dashboard.focus.exitModal.descriptionSuffix')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="dash-control flex-1 rounded-[14px] border px-4 py-2.5 text-sm font-semibold"
          >
            {t('dashboard.focus.exitModal.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-[14px] bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500"
          >
            {t('dashboard.focus.exitModal.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DashboardShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const { status: behavioralStatus, isStreaming, isEvaluating } = useSelector((s) => s.behavioral)
  const {
    sessionId: dsaSessionId,
    problems: dsaProblems,
    problemProgress: dsaProblemProgress,
    pendingNextProblemId,
    scoringStatus: dsaScoringStatus,
    loading: dsaLoading,
    mode: dsaMode,
  } = useSelector((s) => s.dsaSession)
  const {
    sessionId: sdSessionId,
    phase: sdPhase,
  } = useSelector((s) => s.sdSession)
  const setupSDSessionId = useSelector((s) => s.interviewSetup.session?.sdSessionId)
  const { status: sdEvaluationStatus } = useSelector((s) => s.sdEvaluator)
  const [pendingNavigation, setPendingNavigation] = useState(null)
  const isBehaviorFocusRoute = location.pathname === ROUTES.BEHAVIORAL_ROOM
  const isDsaFocusRoute = location.pathname === ROUTES.DSA_ROOM
  const isSDFocusRoute = location.pathname === ROUTES.SD_ROOM
  const isScoringFocusRoute = location.pathname === ROUTES.SCORING
  const focusMode = isBehaviorFocusRoute || isDsaFocusRoute || isSDFocusRoute || isScoringFocusRoute
  const hasUnsubmittedDsaProblems =
    dsaMode !== 'solo' &&
    !!dsaSessionId &&
    dsaProblems.some((problem) => !dsaProblemProgress[problem.id]?.submittedAt)
  const shouldGuardBehaviorNavigation =
    isBehaviorFocusRoute && (behavioralStatus === 'active' || isStreaming || isEvaluating)
  const shouldGuardDsaNavigation =
    isDsaFocusRoute &&
    dsaMode !== 'solo' &&
    (dsaLoading || dsaScoringStatus === 'scoring' || !!pendingNextProblemId || hasUnsubmittedDsaProblems)
  const shouldGuardSDNavigation =
    isSDFocusRoute &&
    !!(sdSessionId || setupSDSessionId) &&
    (sdPhase !== 'COMPLETED' || sdEvaluationStatus === 'processing')
  const shouldGuardNavigation = shouldGuardBehaviorNavigation || shouldGuardDsaNavigation || shouldGuardSDNavigation
  const focusLabel = isScoringFocusRoute
    ? t('dashboard.focus.labels.scoring')
    : isDsaFocusRoute
      ? t('dashboard.focus.labels.dsa')
      : isSDFocusRoute
        ? t('dashboard.focus.labels.systemDesign')
        : t('dashboard.focus.labels.behavioral')

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false

    const savedTheme = window.localStorage.getItem('dashboard-theme')
    if (savedTheme) return savedTheme === 'dark'

    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false

    return window.localStorage.getItem('dashboard-sidebar-collapsed') === 'true'
  })
  const effectiveSidebarCollapsed = focusMode ? true : sidebarCollapsed

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    window.localStorage.setItem('dashboard-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => {
    window.localStorage.setItem('dashboard-sidebar-collapsed', sidebarCollapsed ? 'true' : 'false')
  }, [sidebarCollapsed])

  const runNavigationIntent = (intent) => {
    if (!intent) return
    if (intent.resetInterview) {
      dispatch(resetBehavioral())
      dispatch(resetDSASession())
      dispatch(resetSDSession())
      dispatch(resetInterviewer())
      dispatch(evaluationReset())
      dispatch(resetSetup())
    }
    if (intent.type === 'logout') {
      dispatch(logoutRequest())
      navigate(ROUTES.LANDING)
      return
    }
    navigate(intent.to)
  }

  const requestNavigation = (to, event) => {
    if (!to || to === location.pathname) return true
    if (shouldGuardNavigation) {
      event?.preventDefault()
      setPendingNavigation({ type: 'route', to, resetInterview: true })
      return false
    }
    if (!event) navigate(to)
    return true
  }

  const requestLogout = () => {
    if (shouldGuardNavigation) {
      setPendingNavigation({ type: 'logout', resetInterview: true })
      return
    }
    dispatch(logoutRequest())
    navigate(ROUTES.LANDING)
  }

  const confirmPendingNavigation = () => {
    const intent = pendingNavigation
    setPendingNavigation(null)
    runNavigationIntent(intent)
  }

  return (
    <NavigationRequestContext.Provider value={requestNavigation}>
      <div className="dashboard-theme dash-app flex h-screen gap-4 overflow-hidden p-3 font-body transition-colors duration-200 sm:p-4">
        <Sidebar
          collapsed={effectiveSidebarCollapsed}
          collapseLocked={focusMode}
          onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
          onNavigate={requestNavigation}
          onLogout={requestLogout}
        />
        <div className={['flex min-w-0 flex-1 flex-col', focusMode ? 'gap-3' : 'gap-4'].join(' ')}>
          <TopBar
            darkMode={darkMode}
            focusLabel={focusLabel}
            focusMode={focusMode}
            onNavigate={requestNavigation}
            onToggleDark={() => setDarkMode((value) => !value)}
          />
          <main
            className={[
              'dash-page-shell min-h-0 flex-1 transition-colors duration-200',
              isBehaviorFocusRoute || isDsaFocusRoute || isSDFocusRoute ? 'overflow-hidden' : 'overflow-y-auto',
            ].join(' ')}
          >
            <Outlet />
          </main>
        </div>
      </div>
      {pendingNavigation && (
        <NavigationConfirmModal
          onCancel={() => setPendingNavigation(null)}
          onConfirm={confirmPendingNavigation}
        />
      )}
    </NavigationRequestContext.Provider>
  )
}
