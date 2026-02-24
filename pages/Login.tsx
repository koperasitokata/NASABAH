
import React, { useState, useContext } from 'react';
import { UserRole } from '../types';
import { callApi, ICONS, THEMES } from '../constants';
import { ThemeContext } from '../App';
import { ChevronRight, ArrowLeft, Lock, Smartphone, X } from 'lucide-react';

interface LoginProps {
  onLogin: (user: any, role: UserRole) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { theme } = useContext(ThemeContext);
  const themeStyle = THEMES[theme];

  const role = UserRole.NASABAH;
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginStep, setLoginStep] = useState<'phone' | 'pin'>('phone');
  
  // State untuk Fitur Lupa PIN
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
    nik: '',
    nama: '',
    no_hp: '',
    pin: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNextLoginStep = () => {
    if (!formData.identifier || formData.identifier.length < 5) {
      setError('Masukkan nomor HP yang valid');
      return;
    }
    setError('');
    setLoginStep('pin');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (isRegistering) {
      // Logic Registrasi
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const payload = {
          nik: `'${formData.nik}`,
          nama: formData.nama,
          no_hp: `'${formData.no_hp}`,
          pin: `'${formData.pin}`,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        };

        const result = await callApi('REGISTER_NASABAH', payload);
        if (result.success) {
          alert(`Pendaftaran Berhasil!\nID Nasabah: ${result.id_nasabah}\nSilakan Login.`);
          setIsRegistering(false);
          setFormData({ ...formData, identifier: formData.no_hp, password: formData.pin });
          setLoginStep('phone');
        } else {
          setError(result.message || 'Gagal mendaftar.');
        }
        setIsSubmitting(false);
      }, () => {
        setError('Izin lokasi diperlukan untuk mendaftar.');
        setIsSubmitting(false);
      });
    } else {
      // Logic Login
      const result = await callApi('LOGIN', { 
        role, 
        identifier: formData.identifier, 
        password: formData.password 
      });

      if (result.success) {
        onLogin(result.user, role);
      } else {
        setError(result.message || 'PIN atau Nomor salah.');
        setFormData({ ...formData, password: '' });
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col relative overflow-hidden ${theme === 'purple' ? '' : themeStyle.appBg}`}>
      {/* Background Image */}
      <div className="absolute inset-0 z-0 pointer-events-none flex flex-col items-center justify-end overflow-hidden">
        <img 
          src="https://raw.githubusercontent.com/koperasitokata/image/refs/heads/main/%E2%80%94Pngtree%E2%80%943d%20cooperation%20businessman%20transfer%20money_5864208.png" 
          alt="Background Illustration" 
          className="w-3/4 h-auto object-contain opacity-50 translate-y-20"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Background Decor */}
      <div className="bg-tokata-gradient pt-16 pb-24 px-8 rounded-b-[4rem] shadow-xl relative overflow-hidden z-0">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-10 -mb-10 blur-2xl"></div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-2xl mb-6 rotate-3 overflow-hidden">
            <img 
              src="https://raw.githubusercontent.com/koperasitokata/image/refs/heads/main/logo%20tokata.png" 
              alt="Tokata Logo" 
              className="w-full h-full object-contain p-3"
              referrerPolicy="no-referrer"
            />
          </div>
          <p className="text-white text-sm font-bold text-center max-w-[280px] mt-2 leading-relaxed opacity-90">
            Masuk untuk memantau simpanan, pinjaman, dan riwayat transaksi Anda secara real-time.
          </p>
        </div>
      </div>

      <div className="px-8 -mt-16 flex-1 relative z-10 pb-10">
        <div className={`${themeStyle.cardBg} ${themeStyle.cardBorder} rounded-[3rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] p-8 border min-h-[400px] flex flex-col justify-center transition-all duration-300`}>
          
          <h2 className={`text-2xl font-black ${themeStyle.textMain} mb-8 text-center tracking-tight`}>
            {isRegistering ? 'Daftar Anggota' : (loginStep === 'phone' ? 'Selamat Datang' : 'Keamanan')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegistering ? (
              // FORM REGISTER
              <>
                {[
                  { label: "NIK Sesuai KTP", name: "nik", type: "text", holder: "16 digit NIK" },
                  { label: "Nama Lengkap", name: "nama", type: "text", holder: "Nama lengkap Anda" },
                  { label: "Nomor WhatsApp", name: "no_hp", type: "tel", holder: "08..." },
                  { label: "PIN Keamanan (4 Digit)", name: "pin", type: "password", holder: "****" },
                ].map((field, idx) => (
                  <div key={idx} className="space-y-1">
                    <label className={`text-[10px] font-black ${themeStyle.textSec} uppercase tracking-widest px-1`}>{field.label}</label>
                    <input 
                      name={field.name} 
                      type={field.type}
                      required 
                      // @ts-ignore
                      value={formData[field.name]} 
                      onChange={handleChange} 
                      maxLength={field.name === 'pin' ? 4 : undefined}
                      className={`w-full px-5 py-4 rounded-2xl ${themeStyle.inputBg} ${themeStyle.inputText} border-none focus:ring-2 focus:ring-violet-500 font-bold outline-none shadow-inner ${field.name === 'pin' ? 'text-center tracking-[1em]' : ''}`} 
                      placeholder={field.holder} 
                    />
                  </div>
                ))}
                
                {error && <p className="text-xs text-red-500 font-bold bg-red-50 p-3 rounded-xl text-center animate-pulse">{error}</p>}

                <button 
                  disabled={isSubmitting}
                  className="w-full py-5 bg-tokata-gradient text-white font-black rounded-2xl shadow-xl shadow-violet-100 active:scale-95 transition-all flex items-center justify-center gap-3 mt-4"
                >
                  {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Daftar Sekarang'}
                </button>
              </>
            ) : (
              // FORM LOGIN (2 LANGKAH)
              <>
                {/* STEP 1: NOMOR HP */}
                <div className={`transition-all duration-300 ${loginStep === 'phone' ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full hidden'}`}>
                   <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-3 px-2 mb-1">
                        <div className={`p-2 ${themeStyle.accentBg} rounded-lg ${themeStyle.textSec}`}><Smartphone size={18}/></div>
                        <label className={`text-[10px] font-black ${themeStyle.textSec} uppercase tracking-widest`}>
                          Nomor WhatsApp
                        </label>
                      </div>
                      <input 
                        name="identifier" 
                        required 
                        type="tel"
                        value={formData.identifier} 
                        onChange={handleChange} 
                        className={`w-full px-6 py-5 rounded-3xl ${themeStyle.inputBg} border-2 ${themeStyle.cardBorder} focus:border-violet-500 font-black text-xl ${themeStyle.inputText} outline-none transition-all placeholder:text-slate-500`} 
                        placeholder="08..." 
                        autoFocus
                      />
                    </div>
                    
                    {error && <p className="text-xs text-red-500 font-bold bg-red-50 p-3 rounded-xl text-center mb-4">{error}</p>}

                    <button 
                      type="button"
                      onClick={handleNextLoginStep}
                      className={`w-full py-5 ${theme === 'light' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'} font-black rounded-3xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 group`}
                    >
                      Lanjut <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform"/>
                    </button>
                </div>

                {/* STEP 2: PIN (MODAL OVERLAY) */}
                {loginStep === 'pin' && (
                  <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 z-[100] backdrop-blur-xl bg-black/60 flex items-center justify-center p-6 animate-in fade-in duration-300">
                     <div className={`${themeStyle.cardBg} ${themeStyle.cardBorder} w-full max-w-[300px] p-8 rounded-[3rem] shadow-2xl border relative animate-in zoom-in-95 duration-300`}>
                        <button 
                          type="button" 
                          onClick={() => { setLoginStep('phone'); setError(''); }}
                          className={`absolute top-6 left-6 p-3 ${themeStyle.accentBg} rounded-2xl ${themeStyle.textSec} hover:text-violet-600 transition-colors`}
                        >
                          <ArrowLeft size={20} />
                        </button>

                        <div className="text-center mt-8 mb-8">
                           <div className="w-16 h-16 bg-violet-50 text-violet-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                             <Lock size={28} />
                           </div>
                           <h3 className={`text-xl font-black ${themeStyle.textMain}`}>Masukkan PIN</h3>
                           <p className={`text-xs font-bold ${themeStyle.textSec} mt-1`}>{formData.identifier}</p>
                        </div>

                        <div className="space-y-6">
                          <input 
                            name="password" 
                            type="password" 
                            maxLength={4}
                            required 
                            autoFocus
                            value={formData.password} 
                            onChange={handleChange} 
                            className={`w-full px-5 py-5 rounded-3xl ${themeStyle.inputBg} border-2 ${themeStyle.cardBorder} focus:border-violet-500 font-black text-3xl text-center ${themeStyle.inputText} tracking-[1em] outline-none transition-all`} 
                            placeholder="••••" 
                          />
                          
                          {error && <p className="text-xs text-red-500 font-bold bg-red-50 p-3 rounded-xl text-center animate-pulse">{error}</p>}

                          <div className="flex flex-col gap-3">
                            <button 
                              disabled={isSubmitting}
                              className="w-full py-5 bg-tokata-gradient text-white font-black rounded-3xl shadow-xl shadow-violet-200 active:scale-95 transition-all flex items-center justify-center gap-3"
                            >
                              {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                'Buka Aplikasi'
                              )}
                            </button>
                          </div>
                        </div>
                     </div>
                  </div>
                )}
              </>
            )}

            {!isRegistering && loginStep === 'phone' && (
               <div className={`pt-6 border-t ${theme === 'light' ? 'border-slate-100' : 'border-white/10'} text-center`}>
                  <p className={`text-[10px] font-bold ${themeStyle.textSec} mb-3`}>Belum menjadi anggota?</p>
                  <button 
                      type="button"
                      onClick={() => { setIsRegistering(true); setError(''); }}
                      className="px-6 py-2 bg-violet-50 text-violet-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-violet-100 transition-colors"
                  >
                      Daftar Sekarang
                  </button>
               </div>
            )}
            
            {isRegistering && (
               <button 
                   type="button"
                   onClick={() => { setIsRegistering(false); setError(''); }}
                   className={`w-full py-2 ${themeStyle.textSec} text-xs font-bold mt-2`}
               >
                   Batal Pendaftaran
               </button>
            )}
          </form>
        </div>
      </div>

      <p className={`py-6 text-center text-[10px] font-bold ${themeStyle.textSec} uppercase tracking-[0.3em]`}>
        &copy; 2024 TOKATA DIGITAL
      </p>
    </div>
  );
};

export default Login;
