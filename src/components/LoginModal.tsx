import React, { useState, useEffect, useMemo } from 'react';
import {
  Anchor,
  UserCheck,
  Search,
  BadgeCheck,
  ArrowRight,
  Loader2,
  Users,
  CheckCircle2,
  Ship,
  Sparkles,
} from 'lucide-react';
import { UserProfile, AuthorizedInspector } from '../types';
import { INITIAL_INSPECTORS } from '../data/inspectors';
import { safeFetchJson } from '../utils/api';

interface LoginModalProps {
  user: UserProfile | null;
  onLoginSuccess: (user: UserProfile, token: string) => void;
  onLogout: () => void;
  authError?: string | null;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  user,
  onLoginSuccess,
  onLogout,
  authError,
}) => {
  const [inspectors, setInspectors] = useState<AuthorizedInspector[]>(INITIAL_INSPECTORS);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedInspector, setSelectedInspector] = useState<AuthorizedInspector>(
    INITIAL_INSPECTORS.find((i) => i.email === 'phan.trong.khoi@vard.com') || INITIAL_INSPECTORS[0]
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(authError || null);

  // Fetch updated list from server
  useEffect(() => {
    fetch('/api/inspectors')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.inspectors) && data.inspectors.length > 0) {
          setInspectors(data.inspectors);
        }
      })
      .catch((err) => console.warn('Using local inspectors fallback:', err));
  }, []);

  // Filter inspectors by search query
  const filteredInspectors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return inspectors;
    return inspectors.filter(
      (i) =>
        i.display_name.toLowerCase().includes(q) ||
        i.email.toLowerCase().includes(q) ||
        i.employee_id.includes(q)
    );
  }, [inspectors, searchQuery]);

  // Handle Login submission
  const handleLogin = async (inspectorToLogin = selectedInspector) => {
    if (!inspectorToLogin) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await safeFetchJson<{ user: UserProfile; token: string }>('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: inspectorToLogin.email }),
      });

      if (!res.ok || !res.data) {
        throw new Error(res.error || 'Đăng nhập không thành công.');
      }

      onLoginSuccess(res.data.user, res.data.token);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Lỗi khi đăng nhập vào hệ thống.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-xl shadow-cyan-950 mx-auto">
            <Anchor className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-[11px] font-semibold text-cyan-300 uppercase tracking-wider mb-1">
              <Ship className="w-3 h-3" />
              <span>VARD Shipbuilding & Engineering</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              MarineTag AI - Đăng nhập
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Chọn tài khoản kỹ sư / thanh tra viên được cấp quyền để bắt đầu bóc tách biển tên
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-950/70 border border-rose-600/70 rounded-xl p-3 text-xs text-rose-200 flex items-center space-x-2">
            <span>{error}</span>
          </div>
        )}

        {/* Selected Inspector Highlight Card */}
        {selectedInspector && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-2 border-cyan-500/80 shadow-lg shadow-cyan-950/40 relative overflow-hidden">
            <div className="absolute top-2 right-2 flex items-center space-x-1 text-[10px] font-bold text-cyan-300 bg-cyan-950/90 px-2 py-0.5 rounded-full border border-cyan-700">
              <CheckCircle2 className="w-3 h-3 text-cyan-400" />
              <span>Đang chọn</span>
            </div>

            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-base uppercase shrink-0">
                {selectedInspector.display_name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm sm:text-base font-bold text-white truncate">
                    {selectedInspector.display_name}
                  </h3>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    MSNV: {selectedInspector.employee_id}
                  </span>
                </div>
                <p className="text-xs text-cyan-300/80 font-mono truncate mt-0.5">
                  {selectedInspector.email}
                </p>
              </div>
            </div>

            {/* Quick 1-tap Login button */}
            <button
              type="button"
              onClick={() => handleLogin(selectedInspector)}
              disabled={isLoading}
              className="mt-4 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-cyan-900/50 transition active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Vào làm việc với tài khoản này</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Search & Suggestions List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center space-x-1.5 font-medium text-slate-300">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Danh sách nhân viên ({inspectors.length})</span>
            </span>
            <span className="text-[11px] text-slate-500">Chạm để chọn</span>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, email hoặc mã số nhân viên..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition"
            />
          </div>

          {/* Scrollable Inspector Cards List */}
          <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredInspectors.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-950 rounded-xl">
                Không tìm thấy nhân viên phù hợp với từ khóa "{searchQuery}"
              </div>
            ) : (
              filteredInspectors.map((inspector) => {
                const isSelected = selectedInspector?.email === inspector.email;
                return (
                  <div
                    key={inspector.email}
                    onClick={() => {
                      setSelectedInspector(inspector);
                    }}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-950/40 text-white ring-1 ring-cyan-500/50'
                        : 'border-slate-800 bg-slate-950 hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold uppercase shrink-0 ${
                          isSelected
                            ? 'bg-cyan-600 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {inspector.display_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-semibold truncate block">
                            {inspector.display_name}
                          </span>
                          <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400 shrink-0">
                            {inspector.employee_id}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono truncate block">
                          {inspector.email}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedInspector(inspector);
                        handleLogin(inspector);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-600 text-cyan-300 hover:text-white text-[11px] font-medium transition ml-2 shrink-0"
                    >
                      Chọn
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="text-center text-[11px] text-slate-500 pt-1">
          Hệ thống lưu vết người kiểm tra (inspector) tương ứng với từng biển tên thiết bị được quét.
        </div>
      </div>
    </div>
  );
};
