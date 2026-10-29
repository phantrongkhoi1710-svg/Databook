import React from 'react';
import { Anchor, ShieldCheck, LogOut, UploadCloud, Database, Clock, Layers } from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  user: UserProfile | null;
  activeTab: 'upload' | 'pending' | 'equipment' | 'master';
  setActiveTab: (tab: 'upload' | 'pending' | 'equipment' | 'master') => void;
  pendingCount: number;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeTab,
  setActiveTab,
  pendingCount,
  onLogout,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-900/40">
              <Anchor className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent">
                  MarineTag AI
                </span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  SFI Batch AI
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Nhận diện thiết bị & Gộp ảnh tự động theo SFI
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center space-x-2 px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'upload'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Tải ảnh hàng loạt</span>
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`relative flex items-center space-x-2 px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'pending'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Chờ xử lý</span>
              {pendingCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold shadow animate-pulse">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('equipment')}
              className={`flex items-center space-x-2 px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'equipment'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Thiết bị SFI</span>
            </button>
            <button
              onClick={() => setActiveTab('master')}
              className={`flex items-center space-x-2 px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'master'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Danh mục Excel</span>
            </button>
          </nav>

          {/* User info & Logout */}
          <div className="flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-2">
                <div className="hidden sm:flex flex-col items-end text-right">
                  <div className="flex items-center space-x-1 text-xs text-emerald-400 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{user.displayName || 'Kiểm tra viên'}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 font-mono">
                    {user.employee_id && (
                      <span className="text-cyan-300 font-semibold bg-slate-800 px-1 rounded">
                        MSNV: {user.employee_id}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  title="Đăng xuất"
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};
