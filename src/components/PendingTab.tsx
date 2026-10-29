import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Check,
  X,
  ArrowRight,
  Loader2,
  Cpu,
  Layers,
  Sparkles,
  FileSpreadsheet,
  Building2,
  Trash2,
  Maximize2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { PendingBatch, EquipmentMasterItem, NameplateExtractedData } from '../types';
import { ImageViewer } from './ImageViewer';
import { safeFetchJson } from '../utils/api';

interface PendingTabProps {
  userToken: string;
  onBatchResolved: () => void;
}

export const PendingTab: React.FC<PendingTabProps> = ({ userToken, onBatchResolved }) => {
  const [batches, setBatches] = useState<PendingBatch[]>([]);
  const [masterItems, setMasterItems] = useState<EquipmentMasterItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);

  // Lightbox Zoom Modal state
  const [zoomPhotoIndex, setZoomPhotoIndex] = useState<number | null>(null);

  // Manual SFI search modal state
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [sfiSearchQuery, setSfiSearchQuery] = useState<string>('');

  // Confirming and Deleting state
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [batchRes, masterRes] = await Promise.all([
        safeFetchJson<{ batches: PendingBatch[] }>('/api/batches', {
          headers: { Authorization: `Bearer ${userToken}` },
        }),
        safeFetchJson<{ items: EquipmentMasterItem[] }>('/api/master', {
          headers: { Authorization: `Bearer ${userToken}` },
        }),
      ]);

      if (batchRes.ok && batchRes.data) {
        const pendingList = (batchRes.data.batches || []).filter(b => b.status === 'pending_review');
        setBatches(pendingList);
        if (pendingList.length > 0) {
          setActiveBatchId(prev => (prev && pendingList.some(b => b.batch_id === prev) ? prev : pendingList[0].batch_id));
        }
      }
      if (masterRes.ok && masterRes.data) {
        setMasterItems(masterRes.data.items || []);
      }
    } catch (err) {
      console.error('Error fetching pending batches:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeBatch = batches.find(b => b.batch_id === activeBatchId) || batches[0];

  // Handle confirming resolution for active batch with selected or matched SFI
  const handleConfirmBatchSfi = async (targetSfi: string) => {
    if (!activeBatch) return;
    setIsConfirming(true);
    setFeedbackMsg(null);

    try {
      const res = await safeFetchJson(`/api/batches/${activeBatch.batch_id}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ sfi: targetSfi }),
      });

      if (!res.ok) throw new Error(res.error || 'Lỗi khi xác nhận.');

      setFeedbackMsg({ type: 'success', text: `✓ Đã xác nhận và lưu bộ ảnh vào thư mục SFI ${targetSfi}!` });
      setIsSearchOpen(false);
      onBatchResolved();
      fetchData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Lỗi khi xác nhận SFI.' });
    } finally {
      setIsConfirming(false);
    }
  };

  // Handle deleting unprocessable batch
  const handleExecuteDeleteBatch = async () => {
    if (!batchToDelete) return;

    setIsDeleting(true);
    setFeedbackMsg(null);

    try {
      const res = await safeFetchJson(`/api/batches/${batchToDelete}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${userToken}` },
      });

      if (!res.ok) throw new Error(res.error || 'Lỗi khi xóa lượt tải.');

      setFeedbackMsg({ type: 'success', text: `✓ Đã xóa lượt tải #${batchToDelete.slice(-6)} thành công!` });
      setBatchToDelete(null);
      fetchData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Không thể xóa lượt tải.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredMasters = masterItems.filter(m =>
    m.sfi.toLowerCase().includes(sfiSearchQuery.toLowerCase()) ||
    m.name.toLowerCase().includes(sfiSearchQuery.toLowerCase())
  ).slice(0, 8);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        <p className="text-sm">Đang tải các lượt ảnh chờ đối chiếu...</p>
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-3 bg-slate-900 border border-slate-800 rounded-3xl mt-8 shadow-xl">
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Không có lượt tải nào đang chờ xử lý</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Tất cả bộ ảnh thiết bị tải lên đã được đối chiếu và xếp thành công vào danh mục SFI.
        </p>
      </div>
    );
  }

  const ext = activeBatch?.extracted || ({} as any);
  const matchType = activeBatch?.match_type;
  const matchedMaster = activeBatch?.matched_master;

  const techFields: { label: string; key: keyof NameplateExtractedData }[] = [
    { label: 'Trọng lượng khô (Dry Weight)', key: 'dry_weight' },
    { label: 'Trọng lượng ướt (Wet Weight)', key: 'wet_weight' },
    { label: 'Dung tích / Công suất (Capacity)', key: 'capacity' },
    { label: 'Kích thước (Dimension)', key: 'dimension' },
    { label: 'Công suất điện (Power)', key: 'power' },
    { label: 'Áp suất (Pressure)', key: 'pressure' },
    { label: 'Tốc độ quay (RPM)', key: 'rpm' },
    { label: 'Điện áp (Voltage)', key: 'voltage' },
    { label: 'Tần số (Hertz)', key: 'hertz' },
    { label: 'Dòng điện (Ampere)', key: 'ampere' },
    { label: 'Số Sê-ri (Series No)', key: 'series_no' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header & Batch Navigation Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <span>Trang Chờ Xử Lý ({batches.length} bộ thiết bị)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Mỗi lượt tải lên là 1 bộ ảnh thuộc về 1 mã SFI thiết bị duy nhất.
          </p>
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
          {batches.map(b => (
            <button
              key={b.batch_id}
              onClick={() => {
                setActiveBatchId(b.batch_id);
                setZoomPhotoIndex(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                activeBatch?.batch_id === b.batch_id
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Bộ #{b.batch_id.slice(-6)} ({b.photos.length} ảnh)</span>
            </button>
          ))}
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl text-xs font-medium flex items-center space-x-2 shadow-lg ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-600 text-emerald-200'
              : 'bg-rose-950/80 border border-rose-600 text-rose-200'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Active Batch Card */}
      {activeBatch && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
          {/* Top Bar info */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800 text-xs">
            <div className="flex items-center space-x-3 text-slate-300">
              <span className="font-semibold text-white">Kiểm tra viên: {activeBatch.inspector}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">{new Date(activeBatch.created_at).toLocaleString('vi-VN')}</span>
              <span className="text-slate-500">•</span>
              <span className="text-cyan-400 bg-cyan-950 px-2.5 py-0.5 rounded-full border border-cyan-800 font-mono text-[11px] flex items-center space-x-1">
                <Cpu className="w-3 h-3" />
                <span>AI: {activeBatch.model_used || 'gemini-3.5-flash-lite'}</span>
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span
                className={`text-[11px] font-bold px-3 py-1 rounded-xl uppercase tracking-wider ${
                  matchType === 'exact'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : matchType === 'name_mismatch'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}
              >
                {matchType === 'exact'
                  ? '✓ Khớp SFI & Tên thiết bị'
                  : matchType === 'name_mismatch'
                  ? '⚠️ Khớp SFI - Tên khác nhau'
                  : '❓ SFI chưa khớp danh mục chuẩn'}
              </span>

              <button
                type="button"
                onClick={() => setBatchToDelete(activeBatch.batch_id)}
                className="px-3 py-1 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 hover:text-white text-[11px] font-bold flex items-center space-x-1 transition"
                title="Xóa bỏ lượt tải này"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Xóa lượt này</span>
              </button>
            </div>
          </div>

          {/* Grid Layout: Left Photos Gallery | Right Extraction & Match Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Photos Gallery in this batch */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center space-x-1">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>Bộ {activeBatch.photos.length} ảnh thiết bị:</span>
                </span>
                <span className="text-[11px] text-cyan-400 animate-pulse font-medium">✨ Kích vào ảnh để phóng to xem rõ dập nổi</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 max-h-[480px] overflow-y-auto p-2 bg-slate-950 rounded-2xl border border-slate-800">
                {activeBatch.photos.map((photo, idx) => (
                  <div
                    key={photo.id}
                    onClick={() => setZoomPhotoIndex(idx)}
                    className="relative group rounded-xl overflow-hidden border border-slate-800 bg-black cursor-pointer hover:border-cyan-400 transition shadow-md"
                  >
                    <img
                      src={photo.url}
                      alt={photo.original_name}
                      className="h-36 w-full object-cover group-hover:scale-105 transition duration-200"
                    />
                    <div className="absolute top-1.5 left-1.5 bg-black/80 backdrop-blur text-[10px] text-cyan-300 font-mono px-2 py-0.5 rounded-md font-bold border border-cyan-800/60">
                      #{idx + 1}
                    </div>
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center space-x-1.5 text-xs text-cyan-300 font-bold">
                      <Maximize2 className="w-4 h-4" />
                      <span>Phóng to</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: AI Synthesis & Master Table Comparison */}
            <div className="lg:col-span-7 space-y-5">
              {/* Side-by-side SFI & Name Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* AI Read */}
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center space-x-1.5 text-cyan-400">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wide">AI tổng hợp từ các ảnh</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Mã SFI nhận diện:</span>
                    <strong className="text-sm font-mono text-cyan-300">{ext.sfi || 'Không đọc được SFI'}</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Tên thiết bị đọc được:</span>
                    <strong className="text-xs text-slate-200">{ext.equipment_name || '—'}</strong>
                  </div>
                </div>

                {/* Master Table */}
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center space-x-1.5 text-emerald-400">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wide">Trong bảng Master SFI</span>
                  </div>
                  {matchedMaster ? (
                    <>
                      <div>
                        <span className="text-[11px] text-slate-400 block">Mã SFI chuẩn:</span>
                        <strong className="text-sm font-mono text-emerald-400">{matchedMaster.sfi}</strong>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block">Mô tả chính thức:</span>
                        <strong className="text-xs text-slate-200">{matchedMaster.name}</strong>
                      </div>
                    </>
                  ) : (
                    <div className="py-2">
                      <p className="text-xs text-rose-400 font-medium">Chưa khớp với mã SFI nào trong bảng Excel gốc.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action options based on match type */}
              {matchType === 'exact' && matchedMaster && (
                <div className="bg-emerald-950/40 border border-emerald-600/70 p-4 rounded-2xl flex items-center justify-between gap-3">
                  <div className="text-xs text-emerald-200">
                    <strong className="block text-emerald-300">Khớp chính xác hoàn hảo!</strong>
                    Mã SFI và Tên thiết bị hoàn toàn tương thích với danh mục chuẩn.
                  </div>
                  <button
                    onClick={() => handleConfirmBatchSfi(matchedMaster.sfi)}
                    disabled={isConfirming}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-950 transition shrink-0 disabled:opacity-50"
                  >
                    {isConfirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>Tự động lưu vào {matchedMaster.sfi}</span>
                  </button>
                </div>
              )}

              {matchType === 'name_mismatch' && matchedMaster && (
                <div className="bg-amber-950/50 border border-amber-600/70 p-4 rounded-2xl space-y-3">
                  <div className="text-xs text-amber-200">
                    <strong>Cảnh báo chênh lệch tên:</strong> Mã SFI <span className="font-mono text-amber-300 font-bold">{matchedMaster.sfi}</span> khớp với bảng, nhưng tên đọc được (<em className="text-white">{ext.equipment_name}</em>) khác mô tả trong bảng (<em className="text-white">{matchedMaster.name}</em>).
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleConfirmBatchSfi(matchedMaster.sfi)}
                      disabled={isConfirming}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center space-x-1 transition disabled:opacity-50"
                    >
                      {isConfirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      <span>Xác nhận SFI {matchedMaster.sfi}</span>
                    </button>
                    <button
                      onClick={() => setIsSearchOpen(true)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-slate-700 transition"
                    >
                      Chọn mã SFI khác
                    </button>
                  </div>
                </div>
              )}

              {(matchType === 'unknown' || matchType === 'no_sfi') && (
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-3">
                  <span className="text-xs font-semibold text-slate-300 block">
                    {matchType === 'no_sfi' ? 'Không tự động đọc được SFI. Vui lòng chọn thiết bị:' : 'Mã SFI chưa có trong danh mục. Gợi ý gần giống:'}
                  </span>

                  {activeBatch.suggested_masters && activeBatch.suggested_masters.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {activeBatch.suggested_masters.map(sug => (
                        <button
                          key={sug.sfi}
                          onClick={() => handleConfirmBatchSfi(sug.sfi)}
                          className="p-2.5 rounded-xl bg-slate-900 hover:bg-cyan-950/80 border border-slate-800 hover:border-cyan-600 text-left transition"
                        >
                          <span className="text-[11px] font-mono font-bold text-cyan-300 block">{sug.sfi}</span>
                          <span className="text-[11px] text-slate-300 line-clamp-1">{sug.name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                    <button
                      onClick={() => setIsSearchOpen(true)}
                      className="w-full sm:flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-slate-700 transition flex items-center justify-center space-x-2"
                    >
                      <Search className="w-4 h-4" />
                      <span>Chọn thủ công từ SFI Master</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBatchToDelete(activeBatch.batch_id)}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-800 text-rose-300 hover:text-white text-xs font-semibold transition flex items-center justify-center space-x-1.5 shrink-0"
                    >
                      <Trash2 className="w-4 h-4 text-rose-400" />
                      <span>Xóa lượt tải này</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 11 Technical Fields Summary Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                <span className="text-xs font-bold text-cyan-400 block border-b border-slate-800 pb-2">
                  11 Thông số kỹ thuật bóc tách được từ tập ảnh:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  {techFields.map(tf => {
                    const fieldVal = (ext as any)[tf.key];
                    const hasVal = fieldVal && fieldVal.value;
                    return (
                      <div key={String(tf.key)} className="flex items-center justify-between border-b border-slate-900 pb-1">
                        <span className="text-slate-400 text-[11px]">{tf.label}:</span>
                        <span className="font-medium text-slate-200 text-right">
                          {hasVal ? (
                            <>
                              <strong className="text-white">{fieldVal.value}</strong> {fieldVal.unit_on_plate || ''}
                              <span className="text-[10px] text-slate-500 font-mono ml-1">
                                ({fieldVal.source_photo || 'ảnh'})
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-600">N/A</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Image Lightbox Popup Modal */}
      {zoomPhotoIndex !== null && activeBatch && activeBatch.photos[zoomPhotoIndex] && (
        <div className="fixed inset-0 z-50 bg-black/92 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
          {/* Lightbox Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-white shrink-0">
            <div className="flex items-center space-x-3">
              <span className="bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono text-xs px-3 py-1 rounded-xl font-bold">
                Ảnh #{zoomPhotoIndex + 1} / {activeBatch.photos.length}
              </span>
              <span className="text-xs font-semibold text-slate-200 truncate max-w-xs sm:max-w-md">
                {activeBatch.photos[zoomPhotoIndex].original_name}
              </span>
            </div>

            <button
              onClick={() => setZoomPhotoIndex(null)}
              className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Đóng cửa sổ phóng to"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Lightbox Main Viewer Area */}
          <div className="relative flex-1 flex items-center justify-center my-3 overflow-hidden">
            {/* Previous Photo Button */}
            {activeBatch.photos.length > 1 && (
              <button
                onClick={() => setZoomPhotoIndex((zoomPhotoIndex - 1 + activeBatch.photos.length) % activeBatch.photos.length)}
                className="absolute left-2 sm:left-4 z-30 p-3 rounded-full bg-slate-900/80 hover:bg-cyan-600 text-white border border-slate-700 transition shadow-2xl"
                title="Ảnh trước"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <ImageViewer
              src={activeBatch.photos[zoomPhotoIndex].url}
              alt={activeBatch.photos[zoomPhotoIndex].original_name}
              className="w-full h-[72vh] max-w-5xl"
            />

            {/* Next Photo Button */}
            {activeBatch.photos.length > 1 && (
              <button
                onClick={() => setZoomPhotoIndex((zoomPhotoIndex + 1) % activeBatch.photos.length)}
                className="absolute right-2 sm:right-4 z-30 p-3 rounded-full bg-slate-900/80 hover:bg-cyan-600 text-white border border-slate-700 transition shadow-2xl"
                title="Ảnh tiếp theo"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Lightbox Bottom Thumbnail Navigation Bar */}
          {activeBatch.photos.length > 1 && (
            <div className="flex items-center justify-center space-x-2 overflow-x-auto pt-2 border-t border-slate-800 shrink-0">
              {activeBatch.photos.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => setZoomPhotoIndex(idx)}
                  className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition ${
                    zoomPhotoIndex === idx
                      ? 'border-cyan-400 scale-105 shadow-lg shadow-cyan-950'
                      : 'border-slate-800 opacity-50 hover:opacity-100'
                  }`}
                >
                  <img src={p.url} alt={p.original_name} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation React Modal */}
      {batchToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 bg-rose-950 rounded-2xl border border-rose-800">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Xác nhận xóa lượt tải ảnh</h3>
                <p className="text-xs text-slate-400 font-mono">Mã lượt: #{batchToDelete.slice(-6)}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn xóa lượt tải ảnh này khỏi danh sách chờ xử lý không?
              Tất cả ảnh tạm trong lượt này sẽ bị xóa vĩnh viễn và không thể khôi phục.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setBatchToDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteBatch}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-rose-950 transition disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Xác nhận xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual SFI Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Chọn SFI từ danh mục Master</h3>
              <button onClick={() => setIsSearchOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                placeholder="Nhập mã SFI hoặc tên thiết bị..."
                value={sfiSearchQuery}
                onChange={e => setSfiSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 p-1">
              {filteredMasters.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">Không tìm thấy mã SFI phù hợp.</p>
              ) : (
                filteredMasters.map(m => (
                  <button
                    key={m.sfi}
                    onClick={() => handleConfirmBatchSfi(m.sfi)}
                    disabled={isConfirming}
                    className="w-full p-3 rounded-xl bg-slate-950 hover:bg-cyan-950/60 border border-slate-800 text-left transition flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-mono font-bold text-cyan-300 block">{m.sfi}</span>
                      <span className="text-xs text-slate-300">{m.name}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
