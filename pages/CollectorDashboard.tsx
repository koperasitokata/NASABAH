
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Petugas, Nasabah, PengajuanPinjaman, PinjamanAktif } from '../types';
import { ICONS } from '../constants';
import { 
  Loader2, User, Wallet, CheckCircle2, 
  X, Search, Image as ImageIcon,
  ArrowDownCircle, Coins, Plus, ExternalLink, MapPin
} from 'lucide-react';
import { LOAN_AMOUNTS, TENOR_OPTIONS, calculateInterestRate } from '../utils/loanLogic';
import { AppActions } from '../utils/actions';

interface CollectorDashboardProps {
  user: Petugas;
}

const CollectorDashboard: React.FC<CollectorDashboardProps> = ({ user }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = (searchParams.get('v') || 'home') as 'home' | 'register' | 'apply' | 'disburse' | 'collect' | 'members' | 'withdraw_savings';
  
  const [nasabahList, setNasabahList] = useState<(Nasabah & { saldo_simpanan?: number })[]>([]);
  const [approvedLoans, setApprovedLoans] = useState<PengajuanPinjaman[]>([]);
  const [activeCollections, setActiveCollections] = useState<PinjamanAktif[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  
  const [regData, setRegData] = useState({ nik: '', nama: '', no_hp: '', pin: '' });
  const [applyAmount, setApplyAmount] = useState(LOAN_AMOUNTS[0]);
  const [applyTenor, setApplyTenor] = useState(TENOR_OPTIONS[0]);
  const [applyNasabah, setApplyNasabah] = useState<string>("");

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<PinjamanAktif | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [pakaiSimpanan, setPakaiSimpanan] = useState(false);
  const [memberBalance, setMemberBalance] = useState(0);
  const [fotoBayar, setFotoBayar] = useState<string | null>(null);
  const paymentFileInputRef = useRef<HTMLInputElement>(null);

  const [showDisburseModal, setShowDisburseModal] = useState(false);
  const [selectedDisburse, setSelectedDisburse] = useState<PengajuanPinjaman | null>(null);
  const [potongSimpanan, setPotongSimpanan] = useState(false);
  const [fotoBukti, setFotoBukti] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [selectedNasabahWithdraw, setSelectedNasabahWithdraw] = useState<(Nasabah & { saldo_simpanan?: number }) | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [fotoBuktiWithdraw, setFotoBuktiWithdraw] = useState<string | null>(null);
  const withdrawFileInputRef = useRef<HTMLInputElement>(null);

  const [showTransportModal, setShowTransportModal] = useState(false);
  const [fotoTransport, setFotoTransport] = useState<string | null>(null);
  const transportFileInputRef = useRef<HTMLInputElement>(null);

  const setView = (v: string) => {
    setSearchParams({ v });
    setSearchTerm("");
  };

  const fetchCollectorData = async () => {
    setIsLoading(true);
    try {
      const result = await AppActions.fetchCollectorData(user.id_petugas);
      if (result.success) {
        setNasabahList(result.data.nasabah_list || []);
        setApprovedLoans(result.data.pengajuan_approved || []);
        setActiveCollections(result.data.penagihan_list || []);
      }
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCollectorData();
  }, [view]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessingId('reg');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await AppActions.registerNasabah({
          ...regData,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        });
        if (res.success) {
          alert("Nasabah berhasil didaftarkan! ID: " + res.id_nasabah);
          setRegData({ nik: '', nama: '', no_hp: '', pin: '' });
          setView('home');
        } else {
          alert("Gagal: " + res.message);
        }
      } catch (err) { alert("Kesalahan server."); }
      setProcessingId(null);
    }, () => {
      alert("Izin lokasi diperlukan.");
      setProcessingId(null);
    });
  };

  const openPaymentModal = async (loan: PinjamanAktif) => {
    setSelectedLoan(loan);
    setPaymentAmount(String(loan.cicilan || "").replace(/[^0-9]/g, ''));
    setFotoBayar(null);
    setPakaiSimpanan(false);
    setMemberBalance(0);
    setShowPaymentModal(true);
    
    try {
      const res = await AppActions.getMemberBalance(loan.id_nasabah);
      if (res && res.success) setMemberBalance(Number(res.balance) || 0);
    } catch (e) { setMemberBalance(0); }
  };

  const submitPayment = async () => {
    if (processingId || !selectedLoan || !paymentAmount || !fotoBayar) {
      alert("Harap lengkapi data!");
      return;
    }
    setProcessingId(selectedLoan.id_pinjaman);
    try {
      const amount = parseFloat(paymentAmount);
      const tabunganTerpakai = pakaiSimpanan ? Math.min(memberBalance, amount) : 0;
      const res = await AppActions.submitPayment({
        id_pinjam: selectedLoan.id_pinjaman,
        id_nasabah: selectedLoan.id_nasabah,
        jumlah: amount,
        petugas: user.nama,
        pakaiSimpanan,
        jumlahSimpananDiterapkan: tabunganTerpakai,
        fotoBayar
      });
      if (res.success) {
        alert('Setoran berhasil!');
        setShowPaymentModal(false);
        fetchCollectorData();
      } else { alert('Gagal: ' + res.message); }
    } catch (err) { alert('Koneksi terganggu.'); }
    setProcessingId(null);
  };

  const submitApplyLoan = async () => {
    if (!applyNasabah) { alert("Pilih nasabah!"); return; }
    const nasabahObj = nasabahList.find(n => n.id_nasabah === applyNasabah);
    if (!nasabahObj) return;

    setProcessingId('apply');
    try {
      const res = await AppActions.applyLoan({
        id_nasabah: applyNasabah,
        nama: nasabahObj.nama,
        jumlah: applyAmount,
        tenor: applyTenor,
        petugas: user.nama
      });
      if (res.success) {
        alert('Pengajuan Terkirim!');
        setView('home');
      } else { alert('Gagal: ' + res.message); }
    } catch (e) { alert('Koneksi bermasalah.'); }
    setProcessingId(null);
  };

  const openDisburseModal = (loan: PengajuanPinjaman) => {
    setSelectedDisburse(loan);
    setPotongSimpanan(false);
    setFotoBukti(null);
    setShowDisburseModal(true);
  };

  const submitDisburse = async () => {
    if (!selectedDisburse || !fotoBukti) { alert("Harap lengkapi foto!"); return; }
    setProcessingId(selectedDisburse.id_pengajuan);
    try {
      const res = await AppActions.disburseLoan({
        id_pengajuan: selectedDisburse.id_pengajuan,
        petugas: user.nama,
        potongSimpanan,
        fotoBukti
      });
      if (res.success) {
        alert('Dana Dicairkan!');
        setShowDisburseModal(false);
        fetchCollectorData();
      } else { alert('Gagal: ' + res.message); }
    } catch (err) { alert('Koneksi terputus.'); }
    setProcessingId(null);
  };

  const submitWithdrawSavings = async () => {
    if (!selectedNasabahWithdraw || !withdrawAmount || !fotoBuktiWithdraw) {
      alert("Harap lengkapi data!");
      return;
    }
    setProcessingId('withdraw');
    try {
      const res = await AppActions.withdrawSavings({
        id_nasabah: selectedNasabahWithdraw.id_nasabah,
        nama: selectedNasabahWithdraw.nama,
        jumlah: parseFloat(withdrawAmount),
        petugas: user.nama,
        fotoBukti: fotoBuktiWithdraw
      });
      if (res.success) {
        alert('Pencairan Berhasil!');
        setShowWithdrawModal(false);
        fetchCollectorData();
      } else { alert('Gagal: ' + res.message); }
    } catch (err) { alert('Koneksi bermasalah.'); }
    setProcessingId(null);
  };

  const handleTakeTransport = () => {
    setFotoTransport(null);
    setShowTransportModal(true);
  };

  const submitTransport = async () => {
    if (processingId || !fotoTransport) {
      alert("Harap ambil foto bukti terlebih dahulu!");
      return;
    }
    
    setProcessingId('transport');
    try {
      const res = await AppActions.takeTransportMoney(user.nama, fotoTransport);
      if (res.success) {
        alert(res.message || "Berhasil mengambil uang transport!");
        setShowTransportModal(false);
        fetchCollectorData();
      } else {
        alert(res.message);
      }
    } catch (e) {
      alert("Terjadi kesalahan koneksi.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string | null) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 relative min-h-screen pb-24 text-slate-900">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={user.foto || "https://picsum.photos/200"} className="w-12 h-12 rounded-2xl border-2 border-white shadow-xl object-cover" alt="avatar" />
          <div>
            <h1 className="text-xl font-bold text-slate-800">{user.nama}</h1>
            <p className="text-[10px] text-violet-600 font-black uppercase tracking-widest">{user.id_petugas} | KOLEKTOR</p>
          </div>
        </div>
        {(isLoading) && <Loader2 size={20} className="animate-spin text-violet-600" />}
      </header>

      {view === 'home' && (
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setView('collect')} className="col-span-2 flex items-center justify-between p-6 bg-tokata-gradient rounded-[2.5rem] shadow-xl active:scale-95 transition-all group relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="p-3 bg-white/20 rounded-2xl text-white">{ICONS.Wallet}</div>
              <div className="text-left text-white">
                <h3 className="font-black text-lg">Penagihan</h3>
                <p className="text-[10px] opacity-80 font-black uppercase tracking-wider">Mulai Setoran Harian</p>
              </div>
            </div>
            {activeCollections.length > 0 && <span className="bg-white text-violet-600 text-[10px] font-black px-4 py-1 rounded-full shadow-lg">{activeCollections.length}</span>}
          </button>

          <button onClick={() => setView('register')} className="flex flex-col items-center justify-center p-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm gap-2 active:scale-95 transition-all group">
            <div className="p-4 bg-violet-50 text-violet-600 rounded-2xl group-hover:bg-violet-600 group-hover:text-white transition-all shadow-inner">{ICONS.Plus}</div>
            <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Input Nasabah</span>
          </button>
          
          <button onClick={() => setView('apply')} className="flex flex-col items-center justify-center p-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm gap-2 active:scale-95 transition-all group">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">{ICONS.Doc}</div>
            <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Pinjaman</span>
          </button>

          <button onClick={() => setView('disburse')} className="flex flex-col items-center justify-center p-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm gap-2 active:scale-95 transition-all group relative">
            {approvedLoans.length > 0 && <span className="absolute top-3 right-3 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-md">{approvedLoans.length}</span>}
            <div className="p-4 bg-green-50 text-green-600 rounded-2xl group-hover:bg-green-600 group-hover:text-white transition-all shadow-inner">{ICONS.Verify}</div>
            <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Pencairan</span>
          </button>

          <button onClick={() => setView('withdraw_savings')} className="flex flex-col items-center justify-center p-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm gap-2 active:scale-95 transition-all group">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner"><Coins size={20}/></div>
            <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest text-center">Cair Tabung</span>
          </button>

          <button onClick={() => setView('members')} className="flex flex-col items-center justify-center p-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm gap-2 active:scale-95 transition-all group">
            <div className="p-4 bg-slate-50 text-slate-600 rounded-2xl group-hover:bg-slate-600 group-hover:text-white transition-all shadow-inner"><User size={20}/></div>
            <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Data</span>
          </button>

          <button onClick={handleTakeTransport} className="flex flex-col items-center justify-center p-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm gap-2 active:scale-95 transition-all group">
            <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl group-hover:bg-amber-600 group-hover:text-white transition-all shadow-inner">
               {processingId === 'transport' ? <Loader2 size={20} className="animate-spin" /> : <MapPin size={20}/>}
            </div>
            <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Transport</span>
          </button>
        </div>
      )}

      {view === 'register' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
           <div className="flex items-center gap-4">
            <button onClick={() => setView('home')} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">←</button>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Input Nasabah</h2>
          </div>
          <form onSubmit={handleRegister} className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">NIK</label>
              <input required value={regData.nik} onChange={(e) => setRegData({...regData, nik: e.target.value})} className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none font-bold text-slate-700 outline-none shadow-inner" placeholder="NIK 16 Digit" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nama</label>
              <input required value={regData.nama} onChange={(e) => setRegData({...regData, nama: e.target.value})} className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none font-bold text-slate-700 outline-none shadow-inner" placeholder="Nama Lengkap" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">WhatsApp</label>
              <input required type="tel" value={regData.no_hp} onChange={(e) => setRegData({...regData, no_hp: e.target.value})} className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none font-bold text-slate-700 outline-none shadow-inner" placeholder="08..." />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">PIN Keamanan (4 Digit)</label>
              <input required maxLength={4} type="password" value={regData.pin} onChange={(e) => setRegData({...regData, pin: e.target.value})} className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none font-bold text-slate-700 text-center tracking-widest outline-none shadow-inner" placeholder="****" />
            </div>
            <button disabled={!!processingId} className="w-full py-4 bg-tokata-gradient text-white font-black rounded-3xl shadow-xl active:scale-95 transition-all">
              {processingId === 'reg' ? <Loader2 className="animate-spin mx-auto"/> : 'Daftarkan Nasabah'}
            </button>
          </form>
        </div>
      )}

      {view === 'apply' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('home')} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">←</button>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Ajukan Pinjaman</h2>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Pilih Nasabah</label>
              <select 
                value={applyNasabah} 
                onChange={(e) => setApplyNasabah(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none font-bold text-slate-700 outline-none focus:ring-2 focus:ring-violet-500 shadow-inner"
              >
                <option value="">-- Cari Nasabah --</option>
                {nasabahList.map(n => <option key={n.id_nasabah} value={n.id_nasabah}>{n.nama} ({n.id_nasabah})</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nominal Pinjaman</label>
              <div className="grid grid-cols-3 gap-2">
                {LOAN_AMOUNTS.map(amt => (
                  <button 
                    key={amt} 
                    onClick={() => setApplyAmount(amt)}
                    className={`py-3 rounded-xl text-[10px] font-black transition-all ${applyAmount === amt ? 'bg-tokata-gradient text-white shadow-lg' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                  >
                    {amt >= 1000000 ? `${amt/1000000} Jt` : `${amt/1000} Rb`}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tenor (Kali Cicilan)</label>
              <div className="flex flex-wrap gap-2">
                {TENOR_OPTIONS.map(t => (
                  <button 
                    key={t} 
                    onClick={() => setApplyTenor(t)}
                    className={`px-4 py-3 rounded-xl text-[10px] font-black transition-all ${applyTenor === t ? 'bg-violet-600 text-white shadow-lg' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                  >
                    {t}x
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-violet-50 p-6 rounded-3xl space-y-3 shadow-inner">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-violet-400">
                <span>Bunga Sistem</span>
                <span className="text-violet-600">{calculateInterestRate(applyAmount)}%</span>
              </div>
              <div className="flex justify-between text-lg font-black text-violet-900 border-t border-violet-100 pt-3">
                <span>Total Hutang</span>
                <span>Rp {(applyAmount + (applyAmount * calculateInterestRate(applyAmount) / 100)).toLocaleString('id-ID')}</span>
              </div>
            </div>

            <button 
              disabled={!!processingId || !applyNasabah}
              onClick={submitApplyLoan}
              className="w-full py-5 bg-tokata-gradient text-white font-black rounded-3xl shadow-xl shadow-violet-100 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {processingId === 'apply' ? <Loader2 size={20} className="animate-spin" /> : <><Plus size={18} /> Ajukan Pinjaman</>}
            </button>
          </div>
        </div>
      )}

      {view === 'collect' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-2">
            <button onClick={() => setView('home')} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">←</button>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Daftar Tagihan</h2>
          </div>
          {activeCollections.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-200 shadow-inner">
              <p className="text-[10px] font-black text-slate-300 uppercase italic">Tidak ada tagihan aktif</p>
            </div>
          ) : (
            activeCollections.map(loan => (
              <div key={loan.id_pinjaman} className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden transition-all hover:border-violet-200">
                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><User size={20} /></div>
                      <div>
                        <p className="font-black text-slate-800">{loan.nama}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{loan.id_nasabah}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-slate-800">Rp {Number(loan.cicilan).toLocaleString('id-ID')}</p>
                      <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest">/ Setoran</p>
                    </div>
                  </div>
                  <button onClick={() => openPaymentModal(loan)} className="w-full py-4 bg-tokata-gradient text-white font-black rounded-2xl text-[10px] uppercase shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 tracking-widest">
                    <CheckCircle2 size={14} /> Terima Setoran
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {view === 'disburse' && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
           <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setView('home')} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">←</button>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Siap Dicairkan</h2>
          </div>
          {approvedLoans.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-200 shadow-inner">
              <p className="text-[10px] font-black text-slate-300 uppercase italic">Tidak ada pencairan</p>
            </div>
          ) : (
            approvedLoans.map(p => (
              <div key={p.id_pengajuan} className="p-5 bg-white rounded-[2rem] border border-slate-100 shadow-xl hover:border-green-200">
                 <div className="flex justify-between mb-4">
                    <div>
                      <p className="font-black text-slate-800">{p.nama}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest">{p.id_nasabah}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-green-600">Rp {p.jumlah.toLocaleString('id-ID')}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{p.tenor}x Cicilan</p>
                    </div>
                 </div>
                 <button onClick={() => openDisburseModal(p)} className="w-full py-3 bg-green-500 text-white rounded-xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 tracking-widest">
                   <Wallet size={16} /> Cairkan Dana
                 </button>
              </div>
            ))
          )}
        </div>
      )}

      {view === 'withdraw_savings' && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setView('home')} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">←</button>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Cair Tabungan</h2>
          </div>
          {nasabahList.filter(n => (n.saldo_simpanan || 0) > 0).length === 0 ? (
            <div className="p-10 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-200 shadow-inner">
              <p className="text-[10px] font-black text-slate-300 uppercase italic">Belum ada saldo tersedia</p>
            </div>
          ) : (
            nasabahList.filter(n => (n.saldo_simpanan || 0) > 0).map(n => (
              <div key={n.id_nasabah} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-xl flex justify-between items-center hover:border-violet-200">
                <div>
                  <p className="font-black text-slate-800">{n.nama}</p>
                  <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest">Saldo: Rp {(n.saldo_simpanan || 0).toLocaleString('id-ID')}</p>
                </div>
                <button onClick={() => { setSelectedNasabahWithdraw(n); setShowWithdrawModal(true); setWithdrawAmount(""); setFotoBuktiWithdraw(null); }} className="p-3 bg-tokata-gradient text-white rounded-2xl active:scale-95 transition-all shadow-lg">
                  <ArrowDownCircle size={20}/>
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {view === 'members' && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
           <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setView('home')} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">←</button>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Data Anggota</h2>
          </div>
          <div className="relative mb-4">
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Cari Anggota..." className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border-none shadow-2xl font-bold text-slate-600 outline-none focus:ring-2 focus:ring-violet-500" />
            <Search className="absolute left-4 top-4 text-slate-300" size={20} />
          </div>
          {nasabahList.filter(n => n.nama.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
            <div className="p-10 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-200 shadow-inner">
               <p className="text-[10px] font-black text-slate-300 uppercase italic">Data tidak ditemukan</p>
            </div>
          ) : (
            nasabahList.filter(n => n.nama.toLowerCase().includes(searchTerm.toLowerCase())).map(n => (
              <div key={n.id_nasabah} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-xl flex items-center justify-between hover:border-violet-100">
                <div className="flex items-center gap-4">
                   <img src={n.foto || "https://picsum.photos/200"} className="w-10 h-10 rounded-xl object-cover" />
                   <div>
                     <p className="font-black text-slate-800 text-sm">{n.nama}</p>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{n.id_nasabah}</p>
                   </div>
                </div>
                <button className="p-2 text-violet-600 bg-violet-50 rounded-lg active:scale-90 shadow-sm"><ExternalLink size={16}/></button>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL BAYAR */}
      {showPaymentModal && selectedLoan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Input Angsuran</h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-2 text-slate-400"><X size={20}/></button>
            </div>
            <div className="p-8 space-y-6 overflow-y-auto max-h-[85vh] custom-scrollbar">
              <div className="text-center">
                <p className="text-xl font-black text-slate-800">{selectedLoan.nama}</p>
                <p className="text-[10px] text-violet-600 font-black uppercase tracking-widest">{selectedLoan.id_pinjaman}</p>
              </div>
              {memberBalance > 0 && (
                <label className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${pakaiSimpanan ? 'bg-violet-50 border-violet-200 shadow-sm' : 'bg-slate-50 border-slate-100'}`}>
                  <input type="checkbox" checked={pakaiSimpanan} onChange={(e) => setPakaiSimpanan(e.target.checked)} className="w-5 h-5 accent-violet-600 shadow-inner" />
                  <div>
                    <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest">Gunakan Tabungan</p>
                    <p className="text-[9px] font-black text-slate-400">Saldo Tersedia: Rp {memberBalance.toLocaleString('id-ID')}</p>
                  </div>
                </label>
              )}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Jumlah (Rp)</label>
                <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="w-full text-2xl font-black text-center py-4 bg-slate-50 rounded-2xl border-none outline-none shadow-inner" />
              </div>
              <div className="space-y-2">
                <input type="file" accept="image/*" className="hidden" ref={paymentFileInputRef} onChange={(e) => handleFileChange(e, setFotoBayar)} />
                <button onClick={() => paymentFileInputRef.current?.click()} className={`w-full py-8 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 ${fotoBayar ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-slate-50 shadow-inner'}`}>
                  {fotoBayar ? <img src={fotoBayar} className="w-24 h-24 rounded-xl object-cover shadow-xl" /> : <ImageIcon size={32} className="text-slate-300"/>}
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Bukti Foto</span>
                </button>
              </div>
              <button disabled={!!processingId || !fotoBayar} onClick={submitPayment} className="w-full py-5 bg-tokata-gradient text-white font-black rounded-3xl shadow-xl active:scale-95 disabled:bg-slate-200 transition-all uppercase tracking-widest">
                {processingId ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Simpan Pembayaran'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CAIR PINJAMAN */}
      {showDisburseModal && selectedDisburse && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Pencairan Dana</h3>
              <button onClick={() => setShowDisburseModal(false)} className="p-2 text-slate-400"><X size={20}/></button>
            </div>
            <div className="p-8 space-y-6">
               <div className="text-center">
                 <p className="text-2xl font-black text-slate-800 tracking-tight">Rp {selectedDisburse.jumlah.toLocaleString('id-ID')}</p>
                 <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">{selectedDisburse.nama}</p>
               </div>
               <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                  <input type="checkbox" checked={potongSimpanan} onChange={(e) => setPotongSimpanan(e.target.checked)} className="w-5 h-5 accent-green-600 shadow-inner" />
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Tabungan Wajib (5%)</span>
               </label>
               <div className="space-y-2">
                 <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => handleFileChange(e, setFotoBukti)} />
                 <button onClick={() => fileInputRef.current?.click()} className={`w-full py-8 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all ${fotoBukti ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-slate-50 shadow-inner'}`}>
                   {fotoBukti ? <img src={fotoBukti} className="w-24 h-24 rounded-xl object-cover shadow-xl" /> : <ImageIcon size={32} className="text-slate-300"/>}
                   <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Foto Dokumentasi</span>
                 </button>
               </div>
               <button disabled={!!processingId || !fotoBukti} onClick={submitDisburse} className="w-full py-5 bg-green-600 text-white font-black rounded-3xl shadow-xl active:scale-95 transition-all uppercase tracking-widest">
                  {processingId ? <Loader2 className="animate-spin mx-auto"/> : 'Proses Pencairan'}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CAIR SIMPANAN */}
      {showWithdrawModal && selectedNasabahWithdraw && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Tarik Tabungan</h3>
              <button onClick={() => setShowWithdrawModal(false)} className="p-2 text-slate-400"><X size={20}/></button>
            </div>
            <div className="p-8 space-y-6">
               <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Anggota</p>
                  <p className="text-lg font-black text-slate-800">{selectedNasabahWithdraw.nama}</p>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Jumlah (Rp)</label>
                  <input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none font-bold text-slate-700 outline-none focus:ring-2 focus:ring-violet-500 shadow-inner" placeholder="0" />
               </div>
               <div className="space-y-2">
                  <input type="file" accept="image/*" className="hidden" ref={withdrawFileInputRef} onChange={(e) => handleFileChange(e, setFotoBuktiWithdraw)} />
                  <button onClick={() => withdrawFileInputRef.current?.click()} className={`w-full py-8 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all ${fotoBuktiWithdraw ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-slate-50 shadow-inner'}`}>
                    {fotoBuktiWithdraw ? <img src={fotoBuktiWithdraw} className="w-24 h-24 rounded-xl object-cover shadow-xl" /> : <ImageIcon size={32} className="text-slate-300"/>}
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Foto Serah Terima</span>
                  </button>
               </div>
               <button disabled={!!processingId || !withdrawAmount || !fotoBuktiWithdraw} onClick={submitWithdrawSavings} className="w-full py-5 bg-tokata-gradient text-white font-black rounded-3xl shadow-xl active:scale-95 transition-all uppercase tracking-widest">
                  {processingId ? <Loader2 className="animate-spin mx-auto"/> : 'Proses Pencairan'}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AMBIL TRANSPORT */}
      {showTransportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Uang Transport</h3>
              <button onClick={() => setShowTransportModal(false)} className="p-2 text-slate-400"><X size={20}/></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-amber-50 p-6 rounded-3xl text-center space-y-1 shadow-inner">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Nominal Sistem</p>
                <p className="text-2xl font-black text-slate-800 tracking-tighter">Rp 50.000</p>
                <p className="text-[9px] font-black text-slate-400 italic">"Operasional Harian Kolektor"</p>
              </div>

              <div className="space-y-2">
                <input type="file" accept="image/*" className="hidden" ref={transportFileInputRef} onChange={(e) => handleFileChange(e, setFotoTransport)} />
                <button onClick={() => transportFileInputRef.current?.click()} className={`w-full py-10 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all ${fotoTransport ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-slate-50 shadow-inner'}`}>
                  {fotoTransport ? <img src={fotoTransport} className="w-32 h-32 rounded-xl object-cover shadow-xl" /> : <ImageIcon size={40} className="text-slate-300"/>}
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Bukti Foto Absen</span>
                </button>
              </div>

              <button 
                disabled={!!processingId || !fotoTransport} 
                onClick={submitTransport} 
                className="w-full py-5 bg-amber-600 text-white font-black rounded-3xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:bg-slate-200 uppercase tracking-widest"
              >
                {processingId === 'transport' ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={18} /> Ambil Sekarang</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectorDashboard;
