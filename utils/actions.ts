
import { callApi } from '../constants';

/**
 * PUSAT PERINTAH (ACTIONS) KOPERASI MANDIRI
 * Tempat penyimpanan semua logika eksekusi tombol
 */

export const AppActions = {
  // 1. Ambil Data Dashboard
  fetchCollectorData: async (idPetugas: string) => {
    return await callApi('GET_DASHBOARD_DATA', { 
      role: 'KOLEKTOR', 
      id_user: idPetugas 
    });
  },

  // 2. Registrasi Nasabah Baru
  registerNasabah: async (data: { nik: string; nama: string; no_hp: string; pin: string; latitude: number; longitude: number }) => {
    const formattedData = {
      ...data,
      nik: `'${data.nik}`,
      no_hp: `'${data.no_hp}`,
      pin: `'${data.pin}`
    };
    return await callApi('REGISTER_NASABAH', formattedData);
  },

  // 3. Ajukan Pinjaman Baru
  applyLoan: async (data: { id_nasabah: string; nama: string; jumlah: number; tenor: number; petugas: string }) => {
    return await callApi('AJUKAN_PINJAMAN', data);
  },

  // 4. Ambil Saldo Simpanan Nasabah
  getMemberBalance: async (idNasabah: string) => {
    return await callApi('GET_MEMBER_BALANCE', { id_nasabah: idNasabah });
  },

  // 5. Bayar Angsuran
  submitPayment: async (data: { 
    id_pinjam: string; 
    id_nasabah: string; 
    jumlah: number; 
    petugas: string; 
    pakaiSimpanan: boolean; 
    jumlahSimpananDiterapkan: number; 
    fotoBayar: string 
  }) => {
    return await callApi('BAYAR_ANGSURAN', data);
  },

  // 6. Pencairan Pinjaman (Disburse)
  disburseLoan: async (data: { 
    id_pengajuan: string; 
    petugas: string; 
    potongSimpanan: boolean; 
    fotoBukti: string 
  }) => {
    return await callApi('CAIRKAN_PINJAMAN', data);
  },

  // 7. Cairkan Simpanan (Withdraw)
  withdrawSavings: async (data: { 
    id_nasabah: string; 
    nama: string; 
    jumlah: number; 
    petugas: string; 
    fotoBukti: string 
  }) => {
    return await callApi('CAIRKAN_SIMPANAN', data);
  },

  // 8. Admin: Approve Pinjaman
  approveLoan: async (idPengajuan: string) => {
    return await callApi('APPROVE_PINJAMAN', { id_pengajuan: idPengajuan });
  },

  // 9. Admin: Input Modal
  inputInitialCapital: async (data: { keterangan: string; jumlah: number; admin: string }) => {
    return await callApi('INPUT_MODAL_AWAL', data);
  },

  // 10. Ambil Uang Transport
  takeTransportMoney: async (petugas: string, fotoBukti: string) => {
    return await callApi('AMBIL_TRANSPORT', { petugas, fotoBukti });
  },

  // 11. Admin: Input Pengeluaran
  submitAdminExpense: async (data: { jenis: string; keterangan: string; jumlah: number; petugas: string; bukti_cair: string }) => {
    return await callApi('INPUT_PENGELUARAN', data);
  },

  // 12. Nasabah: Update Lokasi Otomatis
  updateMemberLocation: async (id_nasabah: string, lat: number, lng: number) => {
    return await callApi('UPDATE_LOKASI_NASABAH', { id_nasabah, latitude: lat, longitude: lng });
  },

  // 13. Update Foto Profil (Fitur Baru)
  updateProfilePhoto: async (role: string, id_user: string, foto: string) => {
    return await callApi('UPDATE_PROFILE_PHOTO', { role, id_user, foto });
  }
};
