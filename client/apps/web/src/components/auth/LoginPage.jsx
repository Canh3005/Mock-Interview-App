import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginRequest } from '../../store/slices/authSlice';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Code2 } from 'lucide-react';

export default function LoginPage({ navigate }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(loginRequest({ email, password }));
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background relative overflow-hidden">
      {/* Background gradients similar to landing page */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cta/15 blur-[120px] rounded-full mix-blend-screen" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-cta/10 blur-[100px] rounded-full mix-blend-screen" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <button
          onClick={() => navigate('landing')}
          className="flex items-center gap-2 mb-8 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ChevronLeft size={16} />
          <span className="text-sm">{t('navbar.backToHome') || 'Về trang chủ'}</span>
        </button>

        <div className="flex justify-center mb-6">
          <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-cta/15 border border-cta/30 text-cta">
            <Code2 size={24} />
          </span>
        </div>
        <h2 className="mt-2 text-center text-3xl font-heading font-extrabold text-white">
          {t('auth.loginTitle') || 'Đăng nhập'}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-800/50 backdrop-blur-xl py-8 px-4 shadow-2xl border border-slate-700/50 sm:rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg text-center">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-300">
                {t('auth.email') || 'Email'}
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-600 rounded-lg bg-slate-800/80 text-white placeholder-slate-400 focus:outline-none focus:ring-cta focus:border-cta sm:text-sm"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">
                {t('auth.password') || 'Mật khẩu'}
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-600 rounded-lg bg-slate-800/80 text-white placeholder-slate-400 focus:outline-none focus:ring-cta focus:border-cta sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cta text-white bg-cta hover:bg-cta/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '...' : (t('auth.loginSubmit') || 'Đăng nhập')}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-slate-800/50 text-slate-400 backdrop-blur-xl">
                  {t('auth.noAccount') || 'Chưa có tài khoản?'}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => navigate('register')}
                className="w-full flex justify-center py-2.5 px-4 border border-slate-600 rounded-lg shadow-sm text-sm font-medium text-slate-300 bg-slate-800/50 hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cta"
              >
                {t('auth.registerTitle') || 'Đăng ký ngay'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
