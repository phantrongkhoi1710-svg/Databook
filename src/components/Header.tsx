import React, { useState } from 'react';
import { Anchor, ShieldCheck, LogOut, UploadCloud, Database, Clock, Layers, Globe, Github, X, Check, Code, Terminal } from 'lucide-react';
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
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(label);
    setTimeout(() => setCopiedScript(null), 2000);
  };

  return (
    <>
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

            {/* Actions & User info */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowDeployModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/60 text-xs font-semibold transition shadow-sm"
                title="Hướng dẫn Deploy lên GitHub Pages"
              >
                <Github className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Deploy GitHub Pages</span>
              </button>

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

      {/* GitHub Pages Deploy Guide Modal */}
      {showDeployModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl text-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Hướng Dẫn Deploy GitHub Pages</h3>
                  <p className="text-xs text-slate-400">Chạy ứng dụng MarineTag AI hoàn toàn miễn phí trên GitHub</p>
                </div>
              </div>
              <button
                onClick={() => setShowDeployModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs sm:text-sm">
              <div className="bg-cyan-950/40 border border-cyan-800/50 rounded-xl p-3.5 text-cyan-200 text-xs">
                ✨ Dự án đã được cấu hình đường dẫn tương đối (<code>base: './'</code>) và sẵn sàng tự động build qua GitHub Actions!
              </div>

              {/* Step 1 */}
              <div className="space-y-2">
                <h4 className="font-semibold text-white flex items-center space-x-2 text-sm">
                  <span className="w-5 h-5 rounded-full bg-cyan-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                  <span>Cách 1: Tự động qua GitHub Actions (Khuyên dùng)</span>
                </h4>
                <ol className="list-decimal pl-7 space-y-1.5 text-slate-300 text-xs">
                  <li>Push code dự án lên GitHub repository của bạn.</li>
                  <li>Mở <b>Settings</b> &gt; <b>Pages</b> trên GitHub.</li>
                  <li>Tại mục <b>Source</b>, chọn <b>GitHub Actions</b>.</li>
                  <li>Workflow <code>.github/workflows/deploy.yml</code> sẽ tự động build và xuất bản trang web mỗi khi bạn push code mới!</li>
                </ol>
              </div>

              {/* Step 2 */}
              <div className="space-y-2">
                <h4 className="font-semibold text-white flex items-center space-x-2 text-sm">
                  <span className="w-5 h-5 rounded-full bg-cyan-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                  <span>Cách 2: Deploy thủ công bằng lệnh <code>npm run deploy</code></span>
                </h4>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs flex items-center justify-between">
                  <span className="text-emerald-400">npm run deploy</span>
                  <button
                    onClick={() => copyToClipboard('npm run deploy', 'deploy')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-sans flex items-center space-x-1"
                  >
                    {copiedScript === 'deploy' ? <Check className="w-3 h-3 text-emerald-400" /> : <Terminal className="w-3 h-3" />}
                    <span>{copiedScript === 'deploy' ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                </div>
              </div>

              {/* Step 3 */}
              <div className="space-y-2">
                <h4 className="font-semibold text-white flex items-center space-x-2 text-sm">
                  <span className="w-5 h-5 rounded-full bg-cyan-600 text-white text-xs flex items-center justify-center font-bold">3</span>
                  <span>Cấu hình Gemini API Key trên GitHub (Nếu cần)</span>
                </h4>
                <p className="text-slate-300 text-xs">
                  Vào <b>Settings</b> &gt; <b>Secrets and variables</b> &gt; <b>Actions</b> &gt; Thêm Secret với tên <code>VITE_GEMINI_API_KEY</code> chứa API key của bạn.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-800/80 border-t border-slate-700 flex justify-end">
              <button
                onClick={() => setShowDeployModal(false)}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
