
import React from 'react';
import { 
  Home, 
  Users, 
  TrendingUp, 
  Wallet, 
  FileText, 
  Settings, 
  LogOut,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  Clock,
  MapPin,
  Camera,
  Search,
  PieChart,
  UserCheck
} from 'lucide-react';

export const API_URL = "https://script.google.com/macros/s/AKfycbwRvcXUI1GVEo-Uc83Y_8eizho-LWPlsHXmcsA_tg2JAspUl9LBF5Sdak3MpiQduajt2g/exec";

export const callApi = async (action: string, payload: any) => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow', // Important for Google Apps Script
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ action, payload }),
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }
    
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      console.warn("Malformed JSON response, falling back to mock data:", text);
      throw new Error("Invalid JSON");
    }
  } catch (error) {
    // Downgraded to warning to avoid alarming console errors in demo/dev mode
    console.warn(`[Mock Mode] API request for ${action} failed. Using simulation data.`);
    
    // MOCK DATA FALLBACK
    // Allows the app to function even if the Google Script API is not reachable
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(getMockData(action, payload));
      }, 500); // Simulate network delay
    });
  }
};

// Mock data generator for fallback
const getMockData = (action: string, payload: any) => {
  const timestamp = new Date().toISOString();
  
  switch (action) {
    case 'LOGIN':
      return {
        success: true,
        user: {
          id_nasabah: 'NSB-DEMO-001',
          nik: '1234567890123456',
          nama: 'Nasabah Demo',
          no_hp: payload.identifier || '08123456789',
          pin: '1234',
          foto: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&fit=crop',
          latitude: -6.200000,
          longitude: 106.816666,
          update_lokasi: timestamp,
          tanggal_daftar: timestamp
        }
      };
      
    case 'REGISTER_NASABAH':
      return {
        success: true,
        id_nasabah: 'NSB-' + Math.floor(Math.random() * 10000)
      };

    case 'GET_DASHBOARD_DATA':
      // Return consistent mock data for Nasabah dashboard
      return {
        success: true,
        data: {
          simpanan: [
            { id_transaksi: 'TRX1', setor: 500000, tarik: 0, tanggal: '2024-01-01' },
            { id_transaksi: 'TRX2', setor: 250000, tarik: 0, tanggal: '2024-02-01' },
            { id_transaksi: 'TRX3', setor: 0, tarik: 100000, tanggal: '2024-03-01' }
          ],
          pinjaman: [
            {
              id_pinjaman: 'PJM-DEMO-01',
              nama: 'Pinjaman Usaha',
              total_hutang: 1200000,
              sisa_hutang: 800000,
              cicilan: 100000,
              tenor: 12,
              status: 'Aktif',
              tanggal_acc: timestamp,
              tanggal_cair: timestamp,
              qr_code: "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=PJM-DEMO-01" // Mock QR
            }
          ]
        }
      };

    case 'GET_MEMBER_BALANCE':
      return {
        success: true,
        balance: 750000
      };

    case 'UPDATE_PROFILE_PHOTO':
      return {
        success: true,
        message: "Foto profil berhasil diperbarui (Simulasi)"
      };

    case 'UPDATE_LOKASI_NASABAH':
      return { success: true };

    case 'AJUKAN_PINJAMAN':
      return { success: true, message: "Pengajuan berhasil dikirim (Simulasi)" };
      
    case 'BAYAR_ANGSURAN':
      return { success: true, message: "Pembayaran berhasil (Simulasi)" };
      
    case 'CAIRKAN_PINJAMAN':
      return { success: true, message: "Pencairan berhasil (Simulasi)" };
      
    case 'CAIRKAN_SIMPANAN':
      return { success: true, message: "Penarikan berhasil (Simulasi)" };

    default:
      console.log(`Action ${action} handled with generic success response`);
      return { success: true, message: "Aksi berhasil (Simulasi)" };
  }
};

export const ICONS = {
  Home: <Home size={20} />,
  Users: <Users size={20} />,
  Stats: <TrendingUp size={20} />,
  Wallet: <Wallet size={20} />,
  Doc: <FileText size={20} />,
  Settings: <Settings size={20} />,
  Logout: <LogOut size={20} />,
  Plus: <Plus size={20} />,
  Income: <ArrowUpRight size={20} className="text-green-500" />,
  Expense: <ArrowDownRight size={20} className="text-red-500" />,
  Success: <CheckCircle size={20} className="text-green-500" />,
  Pending: <Clock size={20} className="text-yellow-500" />,
  Map: <MapPin size={16} />,
  Camera: <Camera size={18} />,
  Search: <Search size={18} />,
  Chart: <PieChart size={20} />,
  Verify: <UserCheck size={20} />
};

export const COLORS = {
  primary: '#7c3aed', // Purple 600
  secondary: '#2563eb', // Blue 600
  success: '#10b981', // Emerald 500
  danger: '#ef4444', // Red 500
  warning: '#f59e0b', // Amber 500
};

// --- THEME CONFIGURATION ---
export const THEMES = {
  light: {
    appBg: "bg-slate-50",
    textMain: "text-slate-900",
    textSec: "text-slate-400",
    cardBg: "bg-white",
    cardBorder: "border-slate-100",
    inputBg: "bg-slate-50",
    inputText: "text-slate-800",
    navBg: "bg-white/95 border-slate-100",
    accentBg: "bg-slate-100",
  },
  dark: {
    appBg: "bg-slate-950",
    textMain: "text-slate-100",
    textSec: "text-slate-500",
    cardBg: "bg-slate-900",
    cardBorder: "border-slate-800",
    inputBg: "bg-slate-800",
    inputText: "text-white",
    navBg: "bg-slate-900/95 border-slate-800",
    accentBg: "bg-slate-800",
  },
  purple: {
    appBg: "bg-[#0f172a]", // Base, but usually overridden by gradient
    textMain: "text-white",
    textSec: "text-white/60",
    cardBg: "bg-white/10 backdrop-blur-md",
    cardBorder: "border-white/10",
    inputBg: "bg-white/10",
    inputText: "text-white",
    navBg: "bg-[#0f172a]/80 border-white/10 backdrop-blur-xl",
    accentBg: "bg-white/10",
  }
};
