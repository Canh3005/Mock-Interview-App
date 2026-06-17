import React from 'react';
import { ArrowLeft, BarChart3, BookOpenCheck, FileCode2, LogOut, Network, Users } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { logoutRequest } from '../../store/slices/authSlice';
import { ROUTES } from '../../router/routes';

export default function AdminLayout({ children }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useTranslation();

  const pageTitle =
    pathname === ROUTES.ADMIN
      ? t('adminLayout.problemManagement')
      : pathname === ROUTES.ADMIN_TESTCASES
        ? t('adminLayout.uploadTestCases')
        : pathname === ROUTES.ADMIN_NSD_PROBLEMS
          ? t('adminLayout.systemDesign')
          : pathname === ROUTES.ADMIN_QUESTION_BANK
            ? t('adminLayout.questionBank')
            : pathname === ROUTES.ADMIN_USERS
              ? t('adminLayout.userManagement')
              : pathname === ROUTES.ADMIN_ANALYTICS
                ? t('adminLayout.analytics')
                : t('adminLayout.dashboardAdmin');

  const handleLogout = () => {
    dispatch(logoutRequest());
    navigate(ROUTES.LOGIN);
  };

  return (
    <div className="min-h-screen bg-background flex text-text-base font-body">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900/50 border-r border-slate-700/60 flex flex-col shrink-0">
        <div className="p-6">
          <h2 className="text-xl font-heading font-bold bg-gradient-to-r from-cta to-emerald-400 bg-clip-text text-transparent">
            {t('adminLayout.title')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">{t('adminLayout.subtitle')}</p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <button
            onClick={() => navigate(ROUTES.DASHBOARD)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('adminLayout.backDashboard')}
          </button>

          <div className="h-px bg-slate-700/60 my-4 mx-2" />

          <button
            onClick={() => navigate(ROUTES.ADMIN)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium cursor-pointer ${
              pathname === ROUTES.ADMIN
                ? 'bg-cta/15 text-cta border border-cta/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
            }`}
          >
            <FileCode2 className="w-5 h-5" />
            {t('adminLayout.problemManagement')}
          </button>

          <button
            onClick={() => navigate(ROUTES.ADMIN_NSD_PROBLEMS)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium cursor-pointer ${
              pathname === ROUTES.ADMIN_NSD_PROBLEMS
                ? 'bg-cta/15 text-cta border border-cta/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
            }`}
          >
            <Network className="w-5 h-5" />
            {t('adminLayout.systemDesign')}
          </button>

          <button
            onClick={() => navigate(ROUTES.ADMIN_QUESTION_BANK)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium cursor-pointer ${
              pathname === ROUTES.ADMIN_QUESTION_BANK
                ? 'bg-cta/15 text-cta border border-cta/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
            }`}
          >
            <BookOpenCheck className="w-5 h-5" />
            {t('adminLayout.questionBank')}
          </button>

          <div className="h-px bg-slate-700/60 my-4 mx-2" />

          <button
            onClick={() => navigate(ROUTES.ADMIN_USERS)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium cursor-pointer ${
              pathname === ROUTES.ADMIN_USERS
                ? 'bg-cta/15 text-cta border border-cta/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
            }`}
          >
            <Users className="w-5 h-5" />
            {t('adminLayout.userManagement')}
          </button>

          <button
            onClick={() => navigate(ROUTES.ADMIN_ANALYTICS)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium cursor-pointer ${
              pathname === ROUTES.ADMIN_ANALYTICS
                ? 'bg-cta/15 text-cta border border-cta/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            {t('adminLayout.analytics')}
          </button>
        </nav>

        <div className="p-4 border-t border-slate-700/60">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-red-400 hover:bg-red-400/10 cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            {t('adminLayout.logout')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-background">
        <header className="h-16 border-b border-slate-700/60 bg-slate-900/50 backdrop-blur flex items-center px-8 z-10 sticky top-0 shrink-0">
          <h1 className="text-lg font-heading font-semibold text-white capitalize">
            {pageTitle}
          </h1>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
