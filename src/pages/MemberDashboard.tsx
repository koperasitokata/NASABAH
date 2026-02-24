
import React, { useState, useEffect, useRef, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Nasabah, PinjamanAktif, Simpanan, AppTheme } from '../types';
import { ICONS, callApi, THEMES } from '../constants';
import { ThemeContext } from '../App';
import { Calendar, ChevronRight, Info, RefreshCcw, Wallet, QrCode, XCircle, Camera, Loader2, LogOut, User, MapPin, Search, ArrowDownLeft, ArrowUpRight, Receipt, FileCheck, Ticket, AlertCircle, Clock, CreditCard, Download, ShieldCheck, Moon, Sun, Sparkles } from 'lucide-react';
import { generateLoanSchedule } from '../utils/loanLogic';
import { AppActions } from '../utils/actions';

interface MemberDashboardProps {
  user: Nasabah;
  onLogout: () => void;
  onUpdateUser: (user: Nasabah) => void;
}

interface MutationItem {
  id: string;
  date: Date;
  type: 'in' | 'out';
  amount: number;
  description: string;
  category: 'savings' | 'loan' | 'admin' | 'installment';
}

const MemberDashboard: React.FC<MemberDashboardProps> = ({ user, onLogout, onUpdateUser }) => {
  const { theme, setTheme } = useContext(ThemeContext);
  const themeStyle = THEMES[theme];

  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('v') || 'home';
  
  const [balance, setBalance] = useState(0);
  const [activeLoans, setActiveLoans] = useState<PinjamanAktif[]>([]);
  const [mutations, setMutations] = useState<MutationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const lastUpdateRef = useRef<number>(0);
  const profileFileInputRef = useRef<HTMLInputElement>(null);
  
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const result = await callApi('GET_DASHBOARD_DATA', { role: 'NASABAH', id_user: user.id_nasabah });
      if (result.success) {
        const simpananData = result.data.simpanan || [];
        const loansData: PinjamanAktif[] = result.data.pinjaman || [];
        
        const total = simpananData.reduce((acc: number, cur: any) => acc + (Number(cur.setor || 0) - Number(cur.tarik || 0)), 0);
        setBalance(total);
        setActiveLoans(loansData);

        const combinedMutations: MutationItem[] = [];
        simpananData.forEach((s: any) => {
          const tgl = new Date(s.tanggal);
          if (Number(s.setor) > 0) {
            combinedMutations.push({
              id: `SIM_IN_${s.id_transaksi}`,
              date: tgl,
              type: 'in',
              amount: Number(s.setor),
              description: s.keterangan || 'Setoran Simpanan',
              category: 'savings'
            });
          }
          if (Number(s.tarik) > 0) {
            combinedMutations.push({
              id: `SIM_OUT_${s.id_transaksi}`,
              date: tgl,
              type: 'out',
              amount: Number(s.tarik),
              description: s.keterangan || 'Penarikan Simpanan',
              category: 'savings'
            });
          }
        });

        loansData.forEach((l) => {
          const tglCair = new Date(l.tanggal_cair || l.tanggal_acc);
          const pokok = Number(l.pokok);
          const totalHutang = Number(l.total_hutang);
          const sisaHutang = Number(l.sisa_hutang);
          const totalTerbayar = totalHutang - sisaHutang;

          combinedMutations.push({
            id: `LOAN_IN_${l.id_pinjaman}`,
            date: tglCair,
            type: 'in',
            amount: pokok,
            description: `Pencairan ${l.id_pinjaman}`,
            category: 'loan'
          });

          combinedMutations.push({
            id: `ADM_OUT_${l.id_pinjaman}`,
            date: tglCair,
            type: 'out',
            amount: pokok * 0.05,
            description: 'Biaya Admin (5%)',
            category: 'admin'
          });

          if (totalTerbayar > 0) {
            combinedMutations.push({
              id: `PAY_ACC_${l.id_pinjaman}`,
              date: new Date(),
              type: 'out',
              amount: totalTerbayar,
              description: `Total Bayar Angsuran ${l.id_pinjaman}`,
              category: 'installment'
            });
          }
        });

        combinedMutations.sort((a, b) => b.date.getTime() - a.date.getTime());
        setMutations(combinedMutations);
      }
    } catch (e) { 
      console.error("Gagal sinkron data:", e); 
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.id_nasabah]);

  useEffect(() => {
    if (!user.id_nasabah) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastUpdateRef.current > 3600000 || lastUpdateRef.current === 0) {
          AppActions.updateMemberLocation(
            user.id_nasabah, 
            pos.coords.latitude, 
            pos.coords.longitude
          ).then(res => {
            if (res.success) {
              lastUpdateRef.current = now;
            }
          });
        }
      },
      (err) => console.warn("GPS Sync:", err),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [user.id_nasabah]);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400; 
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUpdatingPhoto(true);
      try {
        const compressedBase64 = await compressImage(file);
        const res = await AppActions.updateProfilePhoto('NASABAH', user.id_nasabah, compressedBase64);
        if (res.success) {
          alert('Foto profil berhasil diperbarui!');
          onUpdateUser({ ...user, foto: compressedBase64 });
        } else {
          alert('Gagal: ' + res.message);
        }
      } catch (err) {
        alert('Gagal memproses gambar. Pastikan format JPG/PNG.');
      } finally {
        setIsUpdatingPhoto(false);
      }
    }
  };

  const handleLogoutClick = () => {
    onLogout();
  };

  const getLoanCoupons = (loan: PinjamanAktif) => {
    const startDate = loan.tanggal_cair || loan.tanggal_acc;
    const dates = generateLoanSchedule(startDate, loan.tenor);
    
    let remainingPaidPool = loan.total_hutang - loan.sisa_hutang;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return dates.map((d, i) => {
      const nominalAsli = Number(loan.cicilan);
      let sisaTagihanTiket = nominalAsli;
      let status: 'green' | 'yellow' | 'red' | 'blue' = 'blue';

      if (remainingPaidPool >= nominalAsli) {
        sisaTagihanTiket = 0;
        remainingPaidPool -= nominalAsli;
        status = 'green';
      } else if (remainingPaidPool > 0) {
        sisaTagihanTiket = nominalAsli - remainingPaidPool;
        remainingPaidPool = 0;
        status = 'yellow';
      } else {
        sisaTagihanTiket = nominalAsli;
        const ticketDate = new Date(d);
        ticketDate.setHours(0,0,0,0);
        
        if (ticketDate < today) {
           status = 'red'; 
        } else {
           status = 'blue'; 
        }
      }

      return {
        periode: i + 1,
        tgl: d,
        displayNominal: sisaTagihanTiket, 
        nominalAsli,
        status
      };
    });
  };

  const nextSchedule = getNextSchedule();

  function getNextSchedule() {
    const activeLoan = activeLoans.find(l => String(l.status).toLowerCase() === 'aktif');
    if (!activeLoan) return null;

    const coupons = getLoanCoupons(activeLoan);
    
    // Cari semua tiket yang menunggak (red)
    const redCoupons = coupons.filter(c => c.status === 'red');
    
    if (redCoupons.length > 0) {
      // Jumlahkan semua nominal tunggakan
      const totalTunggakan = redCoupons.reduce((sum, c) => sum + c.displayNominal, 0);
      return {
        ...redCoupons[0], // Gunakan tanggal tunggakan tertua
        displayNominal: totalTunggakan,
        status: 'red' as const,
        loanId: activeLoan.id_pinjaman
      };
    }

    // Jika tidak ada tunggakan, cari jadwal berikutnya (yellow atau blue)
    const nextCoupon = coupons.find(c => c.status !== 'green');
    
    if (nextCoupon) {
      return {
        ...nextCoupon,
        loanId: activeLoan.id_pinjaman
      };
    }
    return null;
  }

  const handleDownloadCard = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = 1000;
    const h = 630; 
    canvas.width = w;
    canvas.height = h;

    const grd = ctx.createLinearGradient(0, 0, w, h);
    grd.addColorStop(0, '#1e293b'); 
    grd.addColorStop(1, '#020617'); 
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);

    const grdGlow1 = ctx.createRadialGradient(w, 0, 0, w, 0, 300);
    grdGlow1.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    grdGlow1.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grdGlow1;
    ctx.fillRect(0, 0, w, h);

    const grdGlow2 = ctx.createRadialGradient(0, h, 0, 0, h, 300);
    grdGlow2.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
    grdGlow2.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grdGlow2;
    ctx.fillRect(0, 0, w, h);

    const chipX = 80;
    const chipY = 180;
    const chipW = 110;
    const chipH = 80;
    
    ctx.fillStyle = 'rgba(250, 204, 21, 0.2)'; 
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(chipX, chipY, chipW, chipH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
    ctx.lineWidth = 1;
    const innerX = chipX + 25;
    const innerY = chipY + 20;
    ctx.strokeRect(innerX, innerY, 60, 40);
    
    ctx.beginPath();
    ctx.moveTo(chipX, chipY + chipH/2);
    ctx.lineTo(chipX + chipW, chipY + chipH/2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(chipX + chipW/2, chipY);
    ctx.lineTo(chipX + chipW/2, chipY + chipH);
    ctx.stroke();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif'; 
    ctx.textAlign = 'right';
    ctx.fillText('TOKATA', w - 80, 80);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'; 
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('DIGITAL MEMBER', w - 80, 105);

    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(w - 120, 180, 15, -0.5 * Math.PI, 0.5 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w - 120, 180, 25, -0.5 * Math.PI, 0.5 * Math.PI);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = '400 54px monospace'; 
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 10;
    const formattedId = user.id_nasabah.replace(/(.{4})/g, '$1 ').trim();
    ctx.fillText(formattedId, 80, 360);
    ctx.shadowBlur = 0; 

    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    const joinedDate = new Date(user.tanggal_daftar);
    const month = (joinedDate.getMonth() + 1).toString().padStart(2, '0');
    const year = joinedDate.getFullYear().toString().slice(-2);
    const joinedStr = `${month}/${year}`;
    
    const centerX = w / 2;
    ctx.fillText('MEMBER SINCE', centerX, 410);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '400 24px monospace';
    ctx.fillText(joinedStr, centerX + 10, 440);

    const bottomY = 540;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('NAMA ANGGOTA', 80, bottomY);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(user.nama.toUpperCase().substring(0, 22), 80, bottomY + 35);
    
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('NIK', w - 80, bottomY);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '400 24px monospace';
    ctx.fillText(user.nik, w - 80, bottomY + 35);

    const link = document.createElement('a');
    link.download = `KARTU_ANGGOTA_${user.id_nasabah}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (isLoading && activeLoans.length === 0 && activeTab === 'home') {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 size={40} className="animate-spin text-violet-600" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Sinkronisasi Tokata...</p>
      </div>
    );
  }

  if (activeTab === 'qrcode') {
    const activeLoan = activeLoans.find(l => String(l.status).toLowerCase() === 'aktif');
    const qrData = activeLoan ? (activeLoan.qr_code || activeLoan.id_pinjaman) : '';
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}`;

    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 space-y-8 animate-in zoom-in-95 duration-300">
        <div className="text-center space-y-2">
           <h2 className={`text-2xl font-black ${themeStyle.textMain} tracking-tight`}>Kartu Pembayaran</h2>
           <p className={`text-xs font-bold ${themeStyle.textSec} uppercase tracking-widest`}>Tunjukkan pada Kolektor</p>
        </div>

        <div className={`${themeStyle.cardBg} p-8 rounded-[3rem] shadow-2xl border ${themeStyle.cardBorder} relative overflow-hidden w-full max-w-sm`}>
           <div className="absolute top-0 left-0 w-full h-2 bg-tokata-gradient"></div>
           
           {activeLoan ? (
             <div className="flex flex-col items-center space-y-6">
                <div className="p-4 bg-white rounded-3xl shadow-inner border-4 border-slate-50">
                  <img src={qrImageUrl} alt="QR Code Pinjaman" className="w-48 h-48 object-contain rounded-xl" />
                </div>
                
                <div className="text-center w-full space-y-4">
                   <div>
                     <p className={`text-[10px] font-black ${themeStyle.textSec} uppercase tracking-widest mb-1`}>Kode Data</p>
                     <p className={`text-sm font-black ${theme === 'dark' || theme === 'purple' ? 'text-slate-800 bg-slate-200' : 'text-slate-800 bg-slate-50'} font-mono tracking-widest py-2 rounded-xl break-all px-2`}>{qrData}</p>
                   </div>
                </div>
             </div>
           ) : (
             <div className="py-12 flex flex-col items-center text-center space-y-4">
                <div className={`w-20 h-20 ${themeStyle.accentBg} rounded-full flex items-center justify-center ${themeStyle.textSec}`}>
                  <XCircle size={40} />
                </div>
                <div>
                  <h3 className={`text-lg font-black ${themeStyle.textMain}`}>Tidak Ada Tagihan</h3>
                  <p className={`text-xs ${themeStyle.textSec} font-bold max-w-[200px] mx-auto mt-2`}>QR Code hanya tersedia saat Anda memiliki pinjaman aktif.</p>
                </div>
             </div>
           )}
        </div>
        
        {activeLoan && (
          <p className="text-[10px] text-center font-black text-slate-300 uppercase tracking-[0.2em] animate-pulse">
            Tokata Digital Secure Code
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`p-4 space-y-6 max-w-md mx-auto pb-32 ${themeStyle.textMain}`}>
      <header className="flex items-center justify-between py-2">
        <div>
          <p className={`text-[10px] font-black ${themeStyle.textSec} uppercase tracking-widest mb-1`}>ANGGOTA DIGITAL</p>
          <h1 className={`text-2xl font-black ${themeStyle.textMain} tracking-tight leading-tight`}>{user.nama}</h1>
        </div>
        <div className="flex items-center gap-2">
          {activeTab !== 'settings' && <button onClick={fetchData} className={`p-2.5 ${themeStyle.accentBg} rounded-2xl ${themeStyle.textSec} active:rotate-180 transition-all`}><RefreshCcw size={18} /></button>}
          <img src={user.foto || "https://picsum.photos/200"} className="w-12 h-12 rounded-2xl border-4 border-white shadow-2xl object-cover" alt="profile" />
        </div>
      </header>

      {activeTab === 'settings' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className={`${themeStyle.cardBg} p-8 rounded-[3rem] shadow-xl border ${themeStyle.cardBorder} text-center relative overflow-hidden`}>
             <div className="relative inline-block mb-4">
               <img src={user.foto || "https://picsum.photos/200"} className="w-32 h-32 rounded-full border-8 border-slate-50 shadow-2xl object-cover" alt="profile large" />
               <button 
                 onClick={() => profileFileInputRef.current?.click()}
                 className="absolute bottom-2 right-2 p-3 bg-violet-600 text-white rounded-2xl shadow-lg active:scale-90 transition-all border-4 border-white"
               >
                 {isUpdatingPhoto ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
               </button>
               <input type="file" accept="image/*" className="hidden" ref={profileFileInputRef} onChange={handleProfilePhotoChange} />
             </div>
             <h2 className={`text-2xl font-black ${themeStyle.textMain} mb-1`}>{user.nama}</h2>
             <p className={`text-xs font-black ${themeStyle.textSec} uppercase tracking-widest`}>{user.id_nasabah}</p>
          </div>

          {/* THEME SETTINGS SECTION */}
          <div className="space-y-3">
             <h3 className={`ml-4 font-black ${themeStyle.textMain} text-xs uppercase tracking-widest flex items-center gap-2`}>
                <Sparkles size={14} className="text-violet-600"/> Tampilan Aplikasi
             </h3>
             <div className={`${themeStyle.cardBg} border ${themeStyle.cardBorder} p-2 rounded-3xl flex gap-2 overflow-x-auto`}>
               {[
                 { id: 'light', label: 'Normal', icon: <Sun size={18}/> },
                 { id: 'dark', label: 'Dark Mode', icon: <Moon size={18}/> },
                 { id: 'purple', label: 'Tokata Cosmic', icon: <Sparkles size={18}/> },
               ].map((t) => (
                 <button
                   key={t.id}
                   // @ts-ignore
                   onClick={() => setTheme(t.id)}
                   className={`flex-1 flex flex-col items-center justify-center py-4 px-2 rounded-2xl gap-2 transition-all ${theme === t.id ? 'bg-tokata-gradient text-white shadow-lg' : `${themeStyle.accentBg} ${themeStyle.textSec}`}`}
                 >
                   {t.icon}
                   <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{t.label}</span>
                 </button>
               ))}
             </div>
          </div>

          {/* KARTU ANGGOTA DIGITAL */}
          <div className="space-y-3">
             <h3 className={`ml-4 font-black ${themeStyle.textMain} text-xs uppercase tracking-widest flex items-center gap-2`}>
                <CreditCard size={14} className="text-violet-600"/> Kartu Anggota
             </h3>
             
             <div className="relative w-full aspect-[1.58] bg-slate-900 rounded-3xl p-6 text-white shadow-2xl overflow-hidden border border-slate-800 group">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-black opacity-90"></div>
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
                
                <div className="relative z-10 flex flex-col justify-between h-full">
                   <div className="flex justify-between items-start">
                      <div className="w-12 h-9 bg-yellow-400/20 rounded-md border border-yellow-400/50 flex items-center justify-center backdrop-blur-sm">
                         <div className="w-8 h-5 border border-yellow-400/30 rounded-sm flex gap-1 justify-center items-center">
                            <div className="w-px h-full bg-yellow-400/30"></div>
                            <div className="w-full h-px bg-yellow-400/30 absolute"></div>
                         </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                         <img 
                           src="https://raw.githubusercontent.com/koperasitokata/image/refs/heads/main/logo%20tokata.png" 
                           alt="Tokata Logo" 
                           className="h-8 w-auto object-contain brightness-0 invert"
                           referrerPolicy="no-referrer"
                         />
                         <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Digital Member</p>
                      </div>
                   </div>

                   <div className="space-y-1">
                      <p className="font-mono text-2xl tracking-widest shadow-black drop-shadow-md">
                        {user.id_nasabah.replace(/(.{4})/g, '$1 ').trim()}
                      </p>
                      <div className="flex justify-center items-center gap-2">
                        <span className="text-[6px] font-black uppercase tracking-widest opacity-60">Member Since</span>
                        <span className="font-mono text-xs">
                           {new Date(user.tanggal_daftar).toLocaleDateString('id-ID', { month: '2-digit', year: '2-digit' })}
                        </span>
                      </div>
                   </div>

                   <div className="flex justify-between items-end">
                      <div>
                         <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">Nama Anggota</p>
                         <p className="font-bold text-sm tracking-wide truncate max-w-[180px]">{user.nama.toUpperCase()}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">NIK</p>
                         <p className="font-mono text-xs">{user.nik}</p>
                      </div>
                   </div>
                </div>
             </div>

             <button 
                onClick={handleDownloadCard}
                className={`w-full py-4 ${theme === 'dark' || theme === 'purple' ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'} font-black rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 border border-slate-800`}
             >
                <Download size={18} /> Simpan Kartu ke Galeri
             </button>
          </div>

          <button 
            type="button"
            onClick={handleLogoutClick}
            className="w-full py-5 bg-red-50 text-red-500 font-black rounded-[2rem] shadow-lg shadow-red-50 active:scale-95 transition-all flex items-center justify-center gap-2 relative z-50 mb-8 mt-4"
          >
            <LogOut size={20} />
            KELUAR APLIKASI
          </button>
        </div>
      ) : (
        <>
          {(activeTab === 'home' || activeTab === 'savings') && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="bg-tokata-gradient p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden ring-4 ring-violet-50">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12 blur-2xl"></div>
                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-[9px] font-black bg-white/20 px-4 py-1.5 rounded-full border border-white/30 uppercase tracking-widest">Simpanan Nasabah</span>
                    <Wallet size={20} className="text-white/80" />
                  </div>
                  <h2 className="text-4xl font-black mb-6 tracking-tighter">Rp {balance.toLocaleString('id-ID')}</h2>
                  
                  <div className="mt-6 pt-6 border-t border-white/20 flex justify-between items-center">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/60 mb-1">NIK Terdaftar</p>
                      <p className="text-xs font-bold text-white tracking-wider">{user.nik}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/60 mb-1">Bergabung Sejak</p>
                      <p className="text-xs font-bold text-white tracking-wider">
                        {new Date(user.tanggal_daftar).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {activeTab === 'home' && nextSchedule && (
                <div className={`p-6 rounded-[2.5rem] text-white shadow-lg flex items-center justify-between relative overflow-hidden transition-all ${nextSchedule.status === 'red' ? 'bg-red-500 shadow-red-200' : 'bg-blue-600 shadow-blue-200'}`}>
                   <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl"></div>
                   <div className="relative z-10">
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-80 mb-1 flex items-center gap-1">
                        {nextSchedule.status === 'red' ? <AlertCircle size={10}/> : <Clock size={10}/>}
                        {nextSchedule.status === 'red' ? 'Jatuh Tempo' : 'Jadwal Selanjutnya'}
                      </p>
                      <h3 className="text-xl font-black tracking-tight mb-1">
                        {nextSchedule.tgl.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </h3>
                      <p className="text-xs font-bold opacity-90">
                        Tagihan: Rp {nextSchedule.displayNominal.toLocaleString('id-ID')}
                      </p>
                   </div>
                   <div className="relative z-10 bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                      <Calendar size={20} className="text-white" />
                   </div>
                </div>
              )}

              {activeTab === 'savings' && (
                <div className={`${themeStyle.cardBg} rounded-[2.5rem] border ${themeStyle.cardBorder} shadow-sm overflow-hidden min-h-[300px]`}>
                   <div className={`p-6 border-b ${theme === 'dark' || theme === 'purple' ? 'border-white/5' : 'border-slate-50'} flex justify-between items-center`}>
                      <h3 className={`font-black ${themeStyle.textMain} text-sm uppercase tracking-widest flex items-center gap-2`}>
                        <RefreshCcw size={16} className={themeStyle.textSec}/> Riwayat Mutasi
                      </h3>
                      <span className="text-[9px] font-black bg-violet-50 text-violet-600 px-2 py-1 rounded-lg uppercase tracking-wider">
                        {mutations.length} Transaksi
                      </span>
                   </div>
                   <div className="p-4 space-y-2">
                      {mutations.length === 0 ? (
                        <div className={`text-center py-10 ${themeStyle.textSec}`}>
                          <p className="text-[10px] font-black uppercase tracking-widest">Belum ada aktivitas</p>
                        </div>
                      ) : (
                        mutations.map((t) => {
                           const isMasuk = t.type === 'in';
                           return (
                             <div key={t.id} className={`flex items-center justify-between p-4 ${theme === 'dark' ? 'bg-slate-800' : theme === 'purple' ? 'bg-white/5' : 'bg-slate-50'} rounded-2xl border ${theme === 'dark' ? 'border-slate-700' : theme === 'purple' ? 'border-white/5' : 'border-slate-100'} transition-all`}>
                                <div className="flex items-center gap-3">
                                   <div className={`p-2 rounded-xl ${
                                     t.category === 'loan' ? 'bg-blue-100 text-blue-600' :
                                     t.category === 'admin' ? 'bg-orange-100 text-orange-600' :
                                     t.category === 'installment' ? 'bg-teal-100 text-teal-600' :
                                     isMasuk ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                   }`}>
                                      {t.category === 'loan' ? <FileCheck size={18}/> :
                                       t.category === 'admin' ? <Receipt size={18}/> :
                                       t.category === 'installment' ? <Ticket size={18} /> :
                                       isMasuk ? <ArrowDownLeft size={18}/> : <ArrowUpRight size={18}/>}
                                   </div>
                                   <div>
                                      <p className={`text-xs font-black ${themeStyle.textMain}`}>{t.description}</p>
                                      <p className={`text-[9px] font-bold ${themeStyle.textSec} uppercase tracking-wider`}>
                                        {t.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                      </p>
                                   </div>
                                </div>
                                <span className={`text-sm font-black ${
                                  t.category === 'loan' ? 'text-blue-600' :
                                  t.category === 'admin' ? 'text-orange-600' :
                                  t.category === 'installment' ? 'text-teal-600' :
                                  isMasuk ? 'text-green-600' : 'text-red-500'
                                }`}>
                                   {isMasuk ? '+' : '-'} Rp {t.amount.toLocaleString('id-ID')}
                                </span>
                             </div>
                           );
                        })
                      )}
                   </div>
                </div>
              )}
            </div>
          )}

          {(activeTab === 'home' || activeTab === 'loans') && (
            <section className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center px-2">
                <h3 className={`font-black ${themeStyle.textMain} text-xs uppercase tracking-widest`}>Layanan Pinjaman</h3>
                <span className={`text-[9px] font-black ${themeStyle.textSec} uppercase tracking-wider`}>{activeLoans.length} Aktif</span>
              </div>
              
              {activeLoans.length === 0 ? (
                <div className={`p-10 text-center ${themeStyle.accentBg} rounded-[2.5rem] border-2 border-dashed ${themeStyle.cardBorder} shadow-inner`}>
                  <p className={`text-[10px] font-black ${themeStyle.textSec} uppercase italic tracking-widest`}>Tidak ada tagihan aktif</p>
                </div>
              ) : (
                activeLoans.map(loan => {
                  const coupons = getLoanCoupons(loan);
                  
                  return (
                    <div key={loan.id_pinjaman} className={`${themeStyle.cardBg} rounded-[2.5rem] border ${themeStyle.cardBorder} shadow-xl overflow-hidden relative group transition-all`}>
                      {String(loan.status).toLowerCase() === 'lunas' && (
                        <div className="absolute top-0 right-0 bg-green-500 text-white text-[9px] font-black px-5 py-2 rounded-bl-3xl uppercase tracking-widest z-10 shadow-lg">Lunas</div>
                      )}
                      
                      <div className="p-6 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className={`text-[9px] font-black ${themeStyle.textSec} uppercase tracking-widest mb-1`}>{loan.id_pinjaman}</p>
                            <p className={`text-2xl font-black ${themeStyle.textMain} tracking-tight`}>Rp {Number(loan.sisa_hutang).toLocaleString('id-ID')}</p>
                          </div>
                        </div>
                        
                        <div className={`w-full ${themeStyle.accentBg} h-3 rounded-full overflow-hidden shadow-inner border border-white/5`}>
                          <div className={`h-full rounded-full transition-all duration-1000 ${String(loan.status).toLowerCase() === 'lunas' ? 'bg-green-500' : 'bg-violet-600'}`} style={{ width: `${Math.min(100, ((loan.total_hutang - loan.sisa_hutang) / loan.total_hutang) * 100)}%` }}></div>
                        </div>

                        <div className="flex gap-2">
                          <button 
                            onClick={() => setExpandedLoanId(expandedLoanId === loan.id_pinjaman ? null : loan.id_pinjaman)} 
                            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-inner ${expandedLoanId === loan.id_pinjaman ? 'bg-violet-600 text-white shadow-violet-200' : `${themeStyle.accentBg} ${themeStyle.textSec} hover:bg-slate-100`}`}
                          >
                            <Ticket size={14} /> {expandedLoanId === loan.id_pinjaman ? 'Tutup Tiket' : 'Lihat Tiket'}
                          </button>
                        </div>
                      </div>

                      {expandedLoanId === loan.id_pinjaman && (
                        <div className={`${themeStyle.accentBg} p-5 border-t ${themeStyle.cardBorder} max-h-[400px] overflow-y-auto custom-scrollbar animate-in slide-in-from-top-4`}>
                          <div className="grid grid-cols-2 gap-3">
                            {coupons.map((coupon, idx) => {
                              let bgClass = "bg-white border-slate-200";
                              let textClass = "text-slate-500";
                              let statusText = "Jadwal";
                              
                              if (coupon.status === 'green') {
                                 bgClass = "bg-emerald-500 border-emerald-600";
                                 textClass = "text-white";
                                 statusText = "Lunas";
                              } else if (coupon.status === 'yellow') {
                                 bgClass = "bg-amber-400 border-amber-500";
                                 textClass = "text-slate-900";
                                 statusText = "Sisa";
                              } else if (coupon.status === 'red') {
                                 bgClass = "bg-rose-500 border-rose-600";
                                 textClass = "text-white";
                                 statusText = "Jatuh Tempo";
                              } else if (coupon.status === 'blue') {
                                 bgClass = "bg-blue-500 border-blue-600";
                                 textClass = "text-white";
                                 statusText = "Jadwal";
                              }

                              if (theme === 'dark' || theme === 'purple') {
                                if (coupon.status === 'blue') {
                                    bgClass = "bg-slate-800 border-slate-700";
                                    textClass = "text-slate-300";
                                }
                              }

                              return (
                                <div key={idx} className={`relative p-3 rounded-xl border-2 shadow-sm flex flex-col justify-between overflow-hidden ${bgClass}`}>
                                  <div className={`absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${themeStyle.accentBg}`}></div>
                                  <div className={`absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${themeStyle.accentBg}`}></div>
                                  
                                  <div className="mb-2 pl-2">
                                     <span className={`text-[8px] font-black uppercase tracking-widest opacity-80 ${textClass}`}>Ke-{coupon.periode}</span>
                                     <span className={`block text-[10px] font-black leading-tight mt-0.5 ${textClass}`}>
                                        {coupon.tgl.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
                                     </span>
                                  </div>

                                  <div className="flex flex-col items-end pr-2">
                                     <span className={`text-[8px] font-black uppercase tracking-widest bg-black/10 px-1.5 py-0.5 rounded mb-1 ${textClass}`}>
                                        {statusText}
                                     </span>
                                     <span className={`text-sm font-black tracking-tight ${textClass}`}>
                                        {coupon.status === 'green' ? 'LUNAS' : `Rp ${(coupon.displayNominal/1000).toFixed(0)}rb`}
                                     </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default MemberDashboard;
