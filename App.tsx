
import React, { useState, useEffect, useCallback, createContext } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserRole, AuthState, Nasabah, AppTheme } from './types';
import Login from './pages/Login';
import MemberDashboard from './pages/MemberDashboard';
import MobileNav from './components/MobileNav';

// Context untuk Tema
interface ThemeContextType {
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
}
export const ThemeContext = createContext<ThemeContextType>({ theme: 'light', setTheme: () => {} });

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>(({ user: null, role: null }));
  const [loading, setLoading] = useState(true);
  const [theme, setThemeState] = useState<AppTheme>('light');

  useEffect(() => {
    // Load Auth
    const savedAuth = localStorage.getItem('koperasi_auth');
    if (savedAuth) {
      try {
        const parsed = JSON.parse(savedAuth);
        if (parsed.role === UserRole.NASABAH) {
          setAuth(parsed);
        } else {
          localStorage.removeItem('koperasi_auth');
        }
      } catch (e) {
        localStorage.removeItem('koperasi_auth');
      }
    }

    // Load Theme
    const savedTheme = localStorage.getItem('app_theme');
    if (savedTheme && ['light', 'dark', 'purple'].includes(savedTheme)) {
      setThemeState(savedTheme as AppTheme);
    }

    setLoading(false);
  }, []);

  const setTheme = (t: AppTheme) => {
    setThemeState(t);
    localStorage.setItem('app_theme', t);
  };

  const handleLogin = (user: Nasabah, role: UserRole) => {
    const newAuth = { user, role };
    setAuth(newAuth);
    localStorage.setItem('koperasi_auth', JSON.stringify(newAuth));
  };

  const handleLogout = useCallback(() => {
    setAuth({ user: null, role: null });
    localStorage.removeItem('koperasi_auth');
  }, []);

  const handleUpdateUser = (updatedUser: Nasabah) => {
    const newAuth = { ...auth, user: updatedUser };
    setAuth(newAuth);
    localStorage.setItem('koperasi_auth', JSON.stringify(newAuth));
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4 animate-bounce overflow-hidden">
        <img 
          src="https://raw.githubusercontent.com/koperasitokata/image/refs/heads/main/logo%20tokata.png" 
          alt="Tokata Logo" 
          className="w-full h-full object-contain p-2"
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tokata Digital</p>
    </div>
  );

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {/* Global Background Wrapper for Full Page Themes */}
      <div className={`min-h-screen transition-colors duration-500 ${
        theme === 'purple' ? 'bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#1e1b4b] text-white' : 
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        {/* Fixed Background Elements for Purple Theme */}
        {theme === 'purple' && (
          <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
             <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
             <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>
          </div>
        )}

        {!auth.user ? (
          <Login onLogin={handleLogin} />
        ) : (
          <HashRouter>
            <div className="flex flex-col h-screen overflow-hidden relative z-10">
              <main className="flex-1 overflow-y-auto pb-32">
                <Routes>
                  <Route path="/" element={<MemberDashboard user={auth.user as Nasabah} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </main>
              <MobileNav role={auth.role!} />
            </div>
          </HashRouter>
        )}
      </div>
    </ThemeContext.Provider>
  );
};

export default App;
