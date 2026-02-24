
import React, { useContext } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { UserRole } from '../types';
import { ICONS, THEMES } from '../constants';
import { ThemeContext } from '../App';
import { QrCode, ArrowRightLeft } from 'lucide-react';

interface MobileNavProps {
  role: UserRole;
}

const MobileNav: React.FC<MobileNavProps> = ({ role }) => {
  const { theme } = useContext(ThemeContext);
  const themeStyle = THEMES[theme];

  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentView = searchParams.get('v') || 'home';

  const handleNav = (v: string) => {
    navigate(`/?v=${v}`);
  };

  const isActive = (v: string) => currentView === v && location.pathname === '/';

  const NavButton = ({ 
    v, 
    icon, 
    label, 
    colorClass = themeStyle.textSec, 
    activeClass = 'text-violet-600 font-bold scale-110' 
  }: { 
    v: string, 
    icon: React.ReactNode, 
    label: string,
    colorClass?: string,
    activeClass?: string
  }) => {
    if (theme === 'purple') {
        activeClass = 'text-white font-bold scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]';
    }
    
    return (
      <button 
        type="button"
        onClick={() => handleNav(v)}
        className={`flex flex-col items-center justify-center gap-1 py-2 transition-all active:bg-white/10 rounded-2xl w-full ${isActive(v) ? activeClass : colorClass}`}
      >
        <div className="transform transition-transform">{icon}</div>
        <span className="text-[9px] font-black uppercase tracking-tight">{label}</span>
      </button>
    );
  };

  if (role !== UserRole.NASABAH) {
    return (
      <div className={`fixed bottom-0 left-0 right-0 ${themeStyle.navBg} backdrop-blur-xl border-t ${themeStyle.cardBorder} safe-area-bottom shadow-[0_-15px_40px_rgba(0,0,0,0.08)] rounded-t-[3rem] z-[9999] transition-colors duration-500`}>
        <div className="px-6 py-2 flex justify-between items-center h-[70px]">
          <NavButton v="home" icon={ICONS.Home} label="Beranda" />
          <NavButton v="savings" icon={ICONS.Wallet} label="Mutasi" />
          <NavButton v="loans" icon={ICONS.Doc} label="Pinjam" />
          <NavButton v="settings" icon={ICONS.Settings} label="Akun" />
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-[9999] ${themeStyle.navBg} backdrop-blur-xl border-t ${themeStyle.cardBorder} safe-area-bottom shadow-[0_-15px_40px_rgba(0,0,0,0.08)] rounded-t-[3rem] transition-colors duration-500`}>
      {/* Container Navigasi */}
      <div className="h-[80px] px-2 flex justify-between items-center relative">
        
        {/* Kiri */}
        <div className="flex-1 flex justify-around pl-2 pr-8">
           <NavButton v="home" icon={ICONS.Home} label="Beranda" />
           <NavButton v="savings" icon={<ArrowRightLeft size={20}/>} label="Mutasi" />
        </div>

        {/* TOMBOL QR CODE TENGAH (DOMINAN) */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-8">
           <button 
             onClick={() => handleNav('qrcode')}
             className={`w-20 h-20 rounded-full flex items-center justify-center border-[6px] ${theme === 'dark' ? 'border-slate-900' : theme === 'purple' ? 'border-[#1e1b4b]' : 'border-slate-50'} shadow-2xl transition-all active:scale-95 ${isActive('qrcode') ? 'bg-slate-800 text-white ring-4 ring-violet-200' : 'bg-tokata-gradient text-white'}`}
           >
             <QrCode size={32} strokeWidth={2.5} />
           </button>
           <div className="text-center mt-1">
             <span className={`text-[9px] font-black uppercase tracking-widest ${isActive('qrcode') ? 'text-violet-600' : themeStyle.textSec}`}>Kode QR</span>
           </div>
        </div>

        {/* Kanan */}
        <div className="flex-1 flex justify-around pl-8 pr-2">
           <NavButton v="loans" icon={ICONS.Doc} label="Pinjam" />
           <NavButton v="settings" icon={ICONS.Settings} label="Akun" />
        </div>
      </div>
    </div>
  );
};

export default MobileNav;
