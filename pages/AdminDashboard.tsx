
import React, { useState, useEffect, useRef } from 'react';
import { Petugas, PengajuanPinjaman, PinjamanAktif, Nasabah } from '../types';
import { ICONS, COLORS, callApi } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Search, Loader2, Calendar, User, Users, Settings, Save, Edit3, X, Database, PlusCircle, ShieldCheck, ArrowDownRight, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { AppActions } from '../utils/actions';

interface AdminDashboardProps {
  user: Petugas;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'main' | 'settings'>('main');
  const [pengajuan, setPengajuan] = useState<PengajuanPinjaman[]>([]);
  const [globalSchedules, setGlobalSchedules] = useState<PinjamanAktif[]>([]);
  const [nasabahList, setNasabahList] = useState<Nasabah[]>([]);
  const [petugasList, setPetugasList] = useState<Petugas[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchPetugasTerm, setSearchPetugasTerm] = useState("");
  const [stats, setStats] = useState({
    totalModal: 0,
    totalPinjaman: 0,
    totalPengeluaran: 0,
    activeMembers: 0
  });

  const [editingMember, setEditingMember] = useState<Nasabah | null>(null);
  const [editingPetugas, setEditingPetugas] = useState<Petugas | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseData, setExpenseData] = useState({ jenis: 'Gaji', keterangan: '', jumlah: '' });
  const [fotoExpense, setFotoExpense] = useState<string | null>(null);
  const expenseFileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await callApi('GET_DASHBOARD_DATA', { role: 'ADMIN', id_user: user.id_petugas });
      if (result.success) {
        setStats({
          totalModal: result.data.stats.modal || 0,
          totalPinjaman: result.data.stats.pinjaman_aktif || 0,
          totalPengeluaran: result.data.stats.pengeluaran || 0,
          activeMembers: result.data.stats.total_nasabah || 0
        });
        setPengajuan(result.data.pengajuan_pending || []);
        setGlobalSchedules(result.data.jadwal_global || []);
        setNasabahList(result.data.nasabah_list || []);
        setPetugasList(result.data.petugas_list || []);
      }
    } catch (e) {
      console.error("Fetch data error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.id_petugas]);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    const result = await callApi('APPROVE_PINJAMAN', { id_pengajuan: id });
    if (result.success) {
      await fetchData();
    } else {
      alert('Gagal menyetujui: ' + result.message);
    }
    setProcessingId(null);
  };

  const handleSaveModal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const keterangan = formData.get('keterangan') as string;
    const jumlah = Number(formData.get('jumlah'));

    if (!keterangan || !jumlah) return;

    setProcessingId('modal');
    try {
      const res = await callApi('INPUT_MODAL_AWAL', {
        keterangan,
        jumlah,
        admin: user.nama
      });

      if (res.success) {
        alert('Modal awal berhasil ditambahkan!');
        (e.target as HTMLFormElement).reset();
        await fetchData();
      } else {
        alert('Gagal: ' + res.message);
      }
    } catch (err) {
      alert('Koneksi bermasalah');
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdateMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingMember) return;
    
    setIsUpdating(true);
    const formData = new FormData(e.currentTarget);
    const updatedData = {
      old_id: editingMember.id_nasabah,
      id_nasabah: formData.get('id_nasabah'),
      nama: formData.get('nama'),
      pin: formData.get('pin')
    };

    try {
      const res = await callApi('UPDATE_NASABAH', updatedData);
      if (res.success) {
        alert('Data nasabah berhasil diperbarui!');
        setEditingMember(null);
        await fetchData();
      } else {
        alert('Gagal memperbarui: ' + res.message);
      }
    } catch (err) {
      alert('Kesalahan jaringan');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePetugas = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPetugas) return;
    
    setIsUpdating(true);
    const formData = new FormData(e.currentTarget);
    const updatedData = {
      old_id: editingPetugas.id_petugas,
      id_petugas: formData.get('id_petugas'),
      nama: formData.get('nama'),
      password: formData.get('password')
    };

    try {
      const res = await callApi('UPDATE_PETUGAS', updatedData);
      if (res.success) {
        alert('Data petugas berhasil diperbarui!');
        setEditingPetugas(null);
        await fetchData();
      } else {
        alert('Gagal memperbarui: ' + res.message);
      }
    } catch (err) {
      alert('Kesalahan jaringan');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (processingId || !expenseData.keterangan || !expenseData.jumlah || !fotoExpense) {
      alert("Harap lengkapi data dan foto bukti!");
      return;
    }

    setProcessingId('expense');
    try {
      const res = await AppActions.submitAdminExpense({
        jenis: expenseData.jenis,
        keterangan: expenseData.keterangan,
        jumlah: parseFloat(expenseData.jumlah),
        petugas: user.nama,
        bukti_cair: fotoExpense
      });

      if (res.success) {
        alert('Pengeluaran berhasil dicatat!');
        setShowExpenseModal(false);
        setExpenseData({ jenis: 'Gaji', keterangan: '', jumlah: '' });
        setFotoExpense(null);
        await fetchData();
      } else {
        alert('Gagal: ' + res.message);
      }
    } catch (err) {
      alert('Koneksi bermasalah');
    } finally {
      setProcessingId(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFotoExpense(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const dataChart = [
    { name: 'Modal', value: stats.totalModal },
    { name: 'Pinjaman', value: stats.totalPinjaman },
    { name: 'Keluar', value: stats.totalPengeluaran },
  ];

  if (loading && stats.totalModal === 0) return (
    <div className="h-screen flex flex-col items-center justify-center p-20 bg-white">
      <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Memuat Data Tokata...</p>
    </div>
  );

  return (
    <div className="p-4 md:p-8 space-y-6 relative pb-24">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg overflow-hidden">
             <img 
               src="https://raw.githubusercontent.com/koperasitokata/image/refs/heads/main/logo%20tokata.png" 
               alt="Tokata Logo" 
               className="w-full h-full object-contain p-2"
               referrerPolicy="no-referrer"
             />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Halo, {user.nama}!</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{user.jabatan} TOKATA</p>
          </div>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-fit self-end md:self-auto">
          <button 
            onClick={() => setActiveTab('main')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'main' ? 'bg-violet-600 text-white shadow-md shadow-violet-100' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Monitor
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'settings' ? 'bg-violet-600 text-white shadow-md shadow-violet-100' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Pengaturan
          </button>
        </div>
      </header>

      {activeTab === 'main' ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Modal', val: stats.totalModal, icon: ICONS.Wallet, bg: 'bg-violet-50', text: 'text-violet-600' },
              { label: 'Out Pinjaman', val: stats.totalPinjaman, icon: ICONS.Doc, bg: 'bg-blue-50', text: 'text-blue-600' },
              { label: 'Operasional', val: stats.totalPengeluaran, icon: ICONS.Expense, bg: 'bg-red-50', text: 'text-red-600' },
              { label: 'Total Nasabah', val: stats.activeMembers, icon: ICONS.Users, bg: 'bg-indigo-50', text: 'text-indigo-600', isPeople: true },
            ].map((s, i) => (
              <div key={i} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100">
                <div className={`w-10 h-10 ${s.bg} ${s.text} rounded-xl flex items-center justify-center mb-3`}>{s.icon}</div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                <div className="flex justify-between items-end">
                  <p className="text-lg font-black text-slate-800">
                    {s.isPeople ? s.val : `Rp ${s.val.toLocaleString('id-ID')}`}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={() => setShowExpenseModal(true)}
              className="flex items-center justify-between p-6 bg-red-600 rounded-[2rem] shadow-lg active:scale-95 transition-all group relative overflow-hidden"
            >
              <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl"></div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="p-3 bg-white/20 rounded-2xl text-white">
                  <ArrowDownRight size={24}/>
                </div>
                <div className="text-left text-white">
                  <h3 className="font-black text-lg">Input Pengeluaran</h3>
                  <p className="text-[10px] opacity-80 font-medium uppercase tracking-wider">Gaji, Perawatan, dll</p>
                </div>
              </div>
              <div className="text-white opacity-40 group-hover:opacity-100 transition-opacity">
                <PlusCircle size={24} />
              </div>
            </button>

            <button 
              onClick={() => setActiveTab('settings')}
              className="flex items-center justify-between p-6 bg-violet-600 rounded-[2rem] shadow-lg active:scale-95 transition-all group relative overflow-hidden"
            >
              <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl"></div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="p-3 bg-white/20 rounded-2xl text-white">
                  <PlusCircle size={24}/>
                </div>
                <div className="text-left text-white">
                  <h3 className="font-black text-lg">Kelola Modal</h3>
                  <p className="text-[10px] opacity-80 font-medium uppercase tracking-wider">Tambah Kas Pusat</p>
                </div>
              </div>
              <div className="text-white opacity-40 group-hover:opacity-100 transition-opacity">
                <Settings size={24} />
              </div>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <h3 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-2">
                  <div className="p-2 bg-slate-50 rounded-xl">{ICONS.Chart}</div> Arus Kas Utama
                </h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dataChart}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `Rp ${val/1000}k`} tick={{fontSize: 9, fontWeight: 700, fill: '#cbd5e1'}} />
                      <Tooltip 
                        cursor={{fill: '#f8fafc'}}
                        contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px'}}
                        formatter={(value: number) => `Rp ${value.toLocaleString('id-ID')}`} 
                      />
                      <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={40}>
                        {dataChart.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? COLORS.primary : index === 1 ? COLORS.secondary : COLORS.danger} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                  <div className="p-2 bg-violet-50 text-violet-600 rounded-xl"><Calendar size={20} /></div> Pinjaman Aktif
                </h3>
                <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {globalSchedules.length === 0 ? (
                    <div className="text-center py-10">
                       <p className="text-[10px] font-black text-slate-300 uppercase italic tracking-widest">Tidak ada data</p>
                    </div>
                  ) : (
                    globalSchedules.map(loan => (
                      <div key={loan.id_pinjaman} className="flex items-center justify-between p-5 bg-slate-50/50 rounded-[1.5rem] border border-slate-100 hover:bg-white hover:border-violet-100 transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 text-slate-300 flex items-center justify-center group-hover:bg-violet-50 group-hover:text-violet-600 transition-colors"><User size={20} /></div>
                          <div>
                            <p className="text-sm font-black text-slate-800">{loan.nama}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Sisa: Rp {loan.sisa_hutang.toLocaleString('id-ID')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-violet-700">Rp {loan.cicilan.toLocaleString('id-ID')}</p>
                          <p className="text-[8px] text-slate-400 font-bold uppercase">/ Minggu</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col h-fit">
              <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                <div className="p-2 bg-yellow-50 text-yellow-600 rounded-xl">{ICONS.Pending}</div> Persetujuan
              </h3>
              <div className="flex-1 overflow-y-auto space-y-4 max-h-[600px] pr-2 custom-scrollbar">
                {pengajuan.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-300 py-12">
                    <div className="bg-slate-50 p-6 rounded-full mb-4">{ICONS.Success}</div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Semua Teratasi</p>
                  </div>
                ) : (
                  pengajuan.map((p) => (
                    <div key={p.id_pengajuan} className="p-6 bg-slate-50/50 border border-slate-100 rounded-[2rem] space-y-5 hover:border-violet-200 hover:bg-white transition-all group shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-black text-slate-800 group-hover:text-violet-600 transition-colors leading-tight">{p.nama}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">{p.id_nasabah}</p>
                        </div>
                        <span className="text-xs font-black text-violet-700 bg-violet-100/50 px-3 py-1 rounded-full border border-violet-100 shadow-sm">
                          Rp {p.jumlah.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-black uppercase tracking-tight bg-white p-3 rounded-xl border border-slate-100">
                        <span>Tenor: {p.tenor}x</span>
                        <span>Col: {p.petugas}</span>
                      </div>
                      <button 
                        disabled={!!processingId}
                        onClick={() => handleApprove(p.id_pengajuan)}
                        className={`w-full py-4 bg-tokata-gradient text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-violet-100 hover:brightness-110 transition-all active:scale-95 flex items-center justify-center gap-2 ${processingId === p.id_pengajuan ? 'opacity-70' : ''}`}
                      >
                        {processingId === p.id_pengajuan ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          'Setujui Pengajuan'
                        )}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 h-fit">
            <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3">
              <div className="p-3 bg-violet-50 text-violet-600 rounded-2xl"><PlusCircle size={24}/></div> Input Modal Baru
            </h3>
            <form onSubmit={handleSaveModal} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Keterangan Transaksi</label>
                <input name="keterangan" required placeholder="Keterangan setoran modal..." className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none font-bold text-slate-700 outline-none focus:ring-2 focus:ring-violet-500 shadow-inner" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Jumlah Dana (Rp)</label>
                <input name="jumlah" type="number" required placeholder="Contoh: 5000000" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-none font-bold text-slate-700 outline-none focus:ring-2 focus:ring-violet-500 shadow-inner" />
              </div>
              <button 
                type="submit"
                disabled={processingId === 'modal'}
                className="w-full py-5 bg-tokata-gradient text-white font-black rounded-[1.5rem] shadow-xl shadow-violet-100 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                {processingId === 'modal' ? <Loader2 size={18} className="animate-spin"/> : <><Save size={18}/> Simpan Modal</>}
              </button>
            </form>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col max-h-[500px]">
              <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl"><Database size={24}/></div> Anggota Tokata
              </h3>
              <div className="mb-6 relative">
                <input 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari Nasabah..." 
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-600 text-sm outline-none focus:ring-2 focus:ring-teal-500 shadow-inner"
                />
                <Search className="absolute left-4 top-4 text-slate-300" size={20} />
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {nasabahList
                  .filter(n => (n.nama || "").toLowerCase().includes(searchTerm.toLowerCase()) || (n.id_nasabah || "").toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(nasabah => (
                    <div key={nasabah.id_nasabah} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-violet-600 transition-colors">
                          <User size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-800">{nasabah.nama}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{nasabah.id_nasabah}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setEditingMember(nasabah)}
                        className="p-2.5 bg-white text-slate-400 rounded-xl border border-slate-200 hover:text-violet-600 hover:border-violet-200 active:scale-90 transition-all shadow-sm"
                      >
                        <Edit3 size={16} />
                      </button>
                    </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col max-h-[500px]">
              <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl"><Users size={24}/></div> Daftar Petugas
              </h3>
              <div className="mb-6 relative">
                <input 
                  value={searchPetugasTerm}
                  onChange={(e) => setSearchPetugasTerm(e.target.value)}
                  placeholder="Cari Petugas..." 
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-600 text-sm outline-none focus:ring-2 focus:ring-orange-500 shadow-inner"
                />
                <Search className="absolute left-4 top-4 text-slate-300" size={20} />
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {petugasList
                  .filter(p => (p.nama || "").toLowerCase().includes(searchPetugasTerm.toLowerCase()) || (p.id_petugas || "").toLowerCase().includes(searchPetugasTerm.toLowerCase()))
                  .map(staff => (
                    <div key={staff.id_petugas} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-orange-600 transition-colors">
                          <User size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-800">{staff.nama}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{staff.id_petugas} | {staff.jabatan}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setEditingPetugas(staff)}
                        className="p-2.5 bg-white text-slate-400 rounded-xl border border-slate-200 hover:text-orange-600 hover:border-orange-200 active:scale-90 transition-all shadow-sm"
                      >
                        <Edit3 size={16} />
                      </button>
                    </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editor Modals */}
      {editingMember && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-100 text-violet-600 rounded-xl"><Edit3 size={20}/></div>
                <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Edit Anggota</h3>
              </div>
              <button onClick={() => setEditingMember(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleUpdateMember} className="p-8 space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">ID Nasabah</label>
                <input name="id_nasabah" defaultValue={editingMember.id_nasabah} required className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none font-bold text-slate-700 outline-none focus:ring-2 focus:ring-violet-500 shadow-inner" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nama Lengkap</label>
                <input name="nama" defaultValue={editingMember.nama} required className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none font-bold text-slate-700 outline-none focus:ring-2 focus:ring-violet-500 shadow-inner" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">PIN Keamanan (4 Digit)</label>
                <input name="pin" defaultValue={editingMember.pin} maxLength={4} required className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none font-bold text-center tracking-[1em] outline-none focus:ring-2 focus:ring-violet-500 shadow-inner" />
              </div>
              <div className="pt-4">
                <button disabled={isUpdating} type="submit" className="w-full py-4 bg-tokata-gradient text-white font-black rounded-2xl shadow-xl shadow-violet-100 active:scale-95 transition-all flex items-center justify-center gap-3">
                  {isUpdating ? <Loader2 size={18} className="animate-spin"/> : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingPetugas && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 text-orange-600 rounded-xl"><Edit3 size={20}/></div>
                <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Edit Petugas</h3>
              </div>
              <button onClick={() => setEditingPetugas(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleUpdatePetugas} className="p-8 space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">ID Petugas</label>
                <input name="id_petugas" defaultValue={editingPetugas.id_petugas} required className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500 shadow-inner" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nama Lengkap</label>
                <input name="nama" defaultValue={editingPetugas.nama} required className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500 shadow-inner" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Password Baru</label>
                <input name="password" defaultValue={editingPetugas.password} required className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500 shadow-inner" />
              </div>
              <div className="pt-4">
                <button disabled={isUpdating} type="submit" className="w-full py-4 bg-orange-600 text-white font-black rounded-2xl shadow-xl shadow-orange-100 active:scale-95 transition-all flex items-center justify-center gap-3">
                  {isUpdating ? <Loader2 size={18} className="animate-spin"/> : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showExpenseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 text-red-600 rounded-xl"><ArrowDownRight size={20}/></div>
                <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Input Pengeluaran</h3>
              </div>
              <button onClick={() => setShowExpenseModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmitExpense} className="p-8 space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Jenis Pengeluaran</label>
                <select 
                  value={expenseData.jenis} 
                  onChange={(e) => setExpenseData({...expenseData, jenis: e.target.value})}
                  className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none font-bold text-slate-700 outline-none focus:ring-2 focus:ring-red-500 shadow-inner"
                >
                  <option value="Gaji">Gaji / Honor</option>
                  <option value="Perawatan">Perawatan / Maintenance</option>
                  <option value="Listrik">Listrik & Internet</option>
                  <option value="ATK">ATK & Inventaris</option>
                  <option value="Lainnya">Lain-lain</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Keterangan</label>
                <input 
                  required 
                  value={expenseData.keterangan} 
                  onChange={(e) => setExpenseData({...expenseData, keterangan: e.target.value})} 
                  placeholder="Deskripsi singkat..." 
                  className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none font-bold text-slate-700 outline-none focus:ring-2 focus:ring-red-500 shadow-inner" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Jumlah (Rp)</label>
                <input 
                  required 
                  type="number" 
                  value={expenseData.jumlah} 
                  onChange={(e) => setExpenseData({...expenseData, jumlah: e.target.value})} 
                  placeholder="0" 
                  className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none font-bold text-slate-700 outline-none focus:ring-2 focus:ring-red-500 shadow-inner" 
                />
              </div>

              <div className="space-y-2">
                <input type="file" accept="image/*" className="hidden" ref={expenseFileInputRef} onChange={handleFileChange} />
                <button 
                  type="button"
                  onClick={() => expenseFileInputRef.current?.click()} 
                  className={`w-full py-8 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all ${fotoExpense ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-slate-50'}`}
                >
                  {fotoExpense ? <img src={fotoExpense} className="w-32 h-32 rounded-xl object-cover" /> : <ImageIcon size={40} className="text-slate-300"/>}
                  <span className="text-[10px] font-black uppercase text-slate-400 text-center">Ambil Foto Bukti</span>
                </button>
              </div>

              <button 
                disabled={!!processingId || !fotoExpense} 
                type="submit"
                className="w-full py-5 bg-red-600 text-white font-black rounded-3xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:bg-slate-200"
              >
                {processingId === 'expense' ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle2 size={18} /> Simpan Transaksi</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
