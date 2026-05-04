import React from 'react';
import { FileCode2, Database, LogOut, ArrowLeft, Network } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { logoutRequest } from '../../store/slices/authSlice';
import { ROUTES } from '../../router/routes';

export default function AdminLayout({ children }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();

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
            Admin Portal
          </h2>
          <p className="text-sm text-slate-400 mt-1">Mock Interview System</p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <button
            onClick={() => navigate(ROUTES.DASHBOARD)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer`}
          >
            <ArrowLeft className="w-5 h-5" />
            Về Dashboard
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
            Quản lý Bài tập
          </button>

          <button
            onClick={() => navigate(ROUTES.ADMIN_TESTCASES)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium cursor-pointer ${
              pathname === ROUTES.ADMIN_TESTCASES
                ? 'bg-cta/15 text-cta border border-cta/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
            }`}
          >
            <Database className="w-5 h-5" />
            Upload Test Cases
          </button>

          <button
            onClick={() => navigate(ROUTES.ADMIN_SD_PROBLEMS)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium cursor-pointer ${
              pathname === ROUTES.ADMIN_SD_PROBLEMS
                ? 'bg-cta/15 text-cta border border-cta/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
            }`}
          >
            <Network className="w-5 h-5" />
            System Design
          </button>
        </nav>

        <div className="p-4 border-t border-slate-700/60">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-red-400 hover:bg-red-400/10 cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-background">
        <header className="h-16 border-b border-slate-700/60 bg-slate-900/50 backdrop-blur flex items-center px-8 z-10 sticky top-0 shrink-0">
          <h1 className="text-lg font-heading font-semibold text-white capitalize">
            {pathname === ROUTES.ADMIN ? 'Quản lý Bài tập' : pathname === ROUTES.ADMIN_TESTCASES ? 'Upload Test Cases' : pathname === ROUTES.ADMIN_SD_PROBLEMS ? 'System Design Problems' : 'Dashboard Admin'}
          </h1>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
