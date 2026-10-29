import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { UploadTab } from './components/UploadTab';
import { PendingTab } from './components/PendingTab';
import { EquipmentTab } from './components/EquipmentTab';
import { MasterTab } from './components/MasterTab';
import { LoginModal } from './components/LoginModal';
import { UserProfile } from './types';
import { testFirestoreConnection, auth, logoutUser } from './firebase';
import { safeFetchJson } from './utils/api';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('marinetag_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [userToken, setUserToken] = useState<string>(() => {
    return localStorage.getItem('marinetag_token') || '';
  });

  const [activeTab, setActiveTab] = useState<'upload' | 'pending' | 'equipment' | 'master'>('upload');
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Verify Firebase connection on boot
  useEffect(() => {
    testFirestoreConnection();
  }, []);

  // Fetch pending batches count
  const fetchPendingCount = useCallback(() => {
    if (!userToken) return;
    safeFetchJson<{ batches: any[] }>('/api/batches', {
      headers: { Authorization: `Bearer ${userToken}` },
    })
      .then((res) => {
        if (res.ok && res.data?.batches) {
          const pending = res.data.batches.filter((b: any) => b.status === 'pending_review');
          setPendingCount(pending.length);
        }
      })
      .catch(() => {});
  }, [userToken]);

  useEffect(() => {
    fetchPendingCount();
  }, [fetchPendingCount]);

  // Check saved session token on load
  useEffect(() => {
    if (userToken) {
      safeFetchJson('/api/auth/me', {
        headers: { Authorization: `Bearer ${userToken}` },
      })
        .then((res) => {
          if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
              handleLogout();
            }
            return;
          }
          if (res.data?.user) {
            setUser({
              uid: res.data.user.uid,
              email: res.data.user.email,
              displayName: res.data.user.displayName || res.data.user.name,
              employee_id: res.data.user.employee_id,
              photoURL: null,
              isAllowed: true,
            });
          }
        })
        .catch((err) => console.warn('Token check warning:', err));
    }
  }, [userToken]);

  const handleLoginSuccess = (profile: UserProfile, token: string) => {
    setUser(profile);
    setUserToken(token);
    localStorage.setItem('marinetag_user', JSON.stringify(profile));
    localStorage.setItem('marinetag_token', token);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {}
    setUser(null);
    setUserToken('');
    localStorage.removeItem('marinetag_user');
    localStorage.removeItem('marinetag_token');
  };

  const handleBatchUploaded = (batchId: string) => {
    fetchPendingCount();
    setActiveTab('pending');
  };

  const handleBatchResolved = () => {
    fetchPendingCount();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Header */}
      <Header
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingCount}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {!user || !user.isAllowed ? (
          <LoginModal
            user={user}
            onLoginSuccess={handleLoginSuccess}
            onLogout={handleLogout}
          />
        ) : (
          <div className="transition-all duration-200">
            {activeTab === 'upload' && (
              <UploadTab userToken={userToken} onBatchUploaded={handleBatchUploaded} />
            )}
            {activeTab === 'pending' && (
              <PendingTab userToken={userToken} onBatchResolved={handleBatchResolved} />
            )}
            {activeTab === 'equipment' && <EquipmentTab userToken={userToken} />}
            {activeTab === 'master' && <MasterTab userToken={userToken} />}
          </div>
        )}
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>MarineTag AI SFI Batch © 2026 - Nhận diện thiết bị & Quản lý Thư mục SFI</span>
          <div className="flex items-center space-x-3 text-[11px] text-slate-400">
            <span>Model: Gemini Flash</span>
            <span>•</span>
            <span>Kho dữ liệu: Firestore</span>
            <span>•</span>
            <span className="text-emerald-400">Cloud Run Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
