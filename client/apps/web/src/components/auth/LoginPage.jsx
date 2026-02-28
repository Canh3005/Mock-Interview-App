import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginRequest } from '../../store/slices/authSlice';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Code2, Github } from 'lucide-react';

export default function LoginPage({ navigate }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { loading, error: authError } = useSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [urlError, setUrlError] = useState(null);

  useEffect(() => {
    // Check for errors in the URL from OAuth redirects
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');
    if (errorParam) {
      // Map backend error codes to i18n keys if possible
      if (errorParam === 'github_auth_cancelled') {
        setUrlError(t('auth.errorGithubCancelled'));
      } else if (errorParam.toLowerCase().includes('already linked')) {
        setUrlError(t('auth.errorAccountLinked'));
      } else {
        setUrlError(errorParam);
      }
      
      // Clear URL params without reloading
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [t]);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(loginRequest({ email, password }));
  };

  const handleGithubLogin = () => {
    // Redirect to backend GitHub auth endpoint
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    window.location.href = `${backendUrl}/auth/github`;
  };

  const displayError = urlError || authError;

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cta/15 blur-[120px] rounded-full mix-blend-screen" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-cta/10 blur-[100px] rounded-full mix-blend-screen" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <button
          onClick={() => navigate('landing')}
          className="flex items-center gap-2 mb-8 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ChevronLeft size={16} />
          <span className="text-sm">{t('navbar.backToHome')}</span>
        </button>

        <div className="flex justify-center mb-6">
          <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-cta/15 border border-cta/30 text-cta">
            <Code2 size={24} />
          </span>
        </div>
        <h2 className="mt-2 text-center text-3xl font-heading font-extrabold text-white">
          {t('auth.loginTitle')}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-800/50 backdrop-blur-xl py-8 px-4 shadow-2xl border border-slate-700/50 sm:rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {displayError && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg text-center animate-in fade-in duration-300">
                {displayError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-300">
                {t('auth.email')}
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
                {t('auth.password')}
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
                {loading ? '...' : t('auth.loginSubmit')}
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
                  {t('auth.orContinueWith') || 'Hoặc tiếp tục với'}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleGithubLogin}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-slate-600 rounded-lg shadow-sm text-sm font-medium text-white bg-slate-700/50 hover:bg-slate-700 transition-all border-slate-600 hover:border-slate-500"
              >
                <Github size={20} />
                {t('auth.githubLogin')}
              </button>
            </div>
            
            <div className="mt-6">
              <button
                onClick={() => navigate('register')}
                className="w-full flex justify-center py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
              >
                {t('auth.noAccount')} <span className="text-cta ml-1">{t('auth.registerTitle')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
