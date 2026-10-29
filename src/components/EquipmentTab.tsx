import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Search,
  Download,
  FolderDown,
  Eye,
  Edit3,
  X,
  Loader2,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Camera,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react';
import { ImageViewer } from './ImageViewer';
import { safeFetchJson } from '../utils/api';

interface EquipmentTabProps {
  userToken: string;
}

export const EquipmentTab: React.FC<EquipmentTabProps> = ({ userToken }) => {
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedEq, setSelectedEq] = useState<any | null>(null);

  // Lightbox Zoom modal state
  const [zoomPhotoIndex, setZoomPhotoIndex] = useState<number | null>(null);

  // Delete modal state
  const [deletingSfi, setDeletingSfi] = useState<string | null>(null);
  const [isDeletingEquipment, setIsDeletingEquipment] = useState<boolean>(false);

  // Edit modal state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editExtracted, setEditExtracted] = useState<any>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Transfer photo modal
  const [transferringPhoto, setTransferringPhoto] = useState<any | null>(null);
  const [targetTransferSfi, setTargetTransferSfi] = useState<string>('');

  const fetchEquipment = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await safeFetchJson<{ equipment: any[] }>('/api/equipment', {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (res.ok && res.data) {
        setEquipmentList(res.data.equipment || []);
      }
    } catch (err) {
      console.error('Error fetching equipment:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userToken]);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  const filteredEquipment = equipmentList.filter(
    eq =>
      eq.sfi.toLowerCase().includes(search.toLowerCase()) ||
      eq.name.toLowerCase().includes(search.toLowerCase()) ||
      (eq.zone && eq.zone.toLowerCase().includes(search.toLowerCase())) ||
      (eq.comp_location && eq.comp_location.toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenDetail = (eq: any) => {
    setSelectedEq(eq);
    setEditExtracted(JSON.parse(JSON.stringify(eq.extracted_data || {})));
    setIsEditing(false);
    setFeedback(null);
    setZoomPhotoIndex(null);
  };

  const handleExecuteDeleteEquipment = async () => {
    if (!deletingSfi) return;
    setIsDeletingEquipment(true);
    setFeedback(null);

    try {
      const res = await safeFetchJson(`/api/equipment/${deletingSfi}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${userToken}` },
      });

      if (!res.ok) throw new Error(res.error || 'Lỗi khi xóa thiết bị.');

      setDeletingSfi(null);
      if (selectedEq?.sfi === deletingSfi) {
        setSelectedEq(null);
      }
      fetchEquipment();
    } catch (err: any) {
      console.error(err.message || 'Lỗi khi xóa thiết bị.');
    } finally {
      setIsDeletingEquipment(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const res = await fetch('/api/equipment/export.xlsx', {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (!res.ok) throw new Error('Lỗi khi xuất Excel.');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MarineTag_AI_Full_Equipment_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err.message || 'Không thể tải xuống tệp Excel.');
    }
  };

  const handleExportDatabookZip = async () => {
    setIsExportingZip(true);
    try {
      const res = await fetch('/api/equipment/export-databook.zip', {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (!res.ok) throw new Error('Lỗi khi tải DataBook ZIP.');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `databook_folder_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err.message || 'Lỗi khi xuất thư mục DataBook ZIP.');
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleSaveEquipment = async () => {
    if (!selectedEq) return;
    setIsSaving(true);
    setFeedback(null);

    try {
      const res = await safeFetchJson(`/api/equipment/${selectedEq.sfi}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ extracted_data: editExtracted }),
      });

      if (!res.ok || !res.data) throw new Error(res.error || 'Lỗi khi lưu.');

      setSelectedEq(res.data.equipment);
      setFeedback('✓ Cập nhật thiết bị thành công.');
      setIsEditing(false);
      fetchEquipment();
    } catch (err: any) {
      setFeedback('Lỗi: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTransferPhoto = async () => {
    if (!transferringPhoto || !targetTransferSfi || !selectedEq) return;

    try {
      const res = await safeFetchJson('/api/equipment/transfer-photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          filename: transferringPhoto.filename,
          from_sfi: selectedEq.sfi,
          to_sfi: targetTransferSfi,
        }),
      });

      if (!res.ok) throw new Error(res.error || 'Lỗi khi chuyển ảnh.');

      setFeedback('✓ Đã chuyển ảnh thành công sang SFI ' + targetTransferSfi);
      setTransferringPhoto(null);
      setTargetTransferSfi('');
      fetchEquipment();
      setSelectedEq(null);
    } catch (err: any) {
      setFeedback('Lỗi: ' + err.message);
    }
  };

  const technicalFields = [
    { key: 'dry_weight', label: 'DRY WEIGHT' },
    { key: 'wet_weight', label: 'WET WEIGHT' },
    { key: 'capacity', label: 'CAPACITY' },
    { key: 'dimension', label: 'DIMENSION' },
    { key: 'power', label: 'POWER' },
    { key: 'pressure', label: 'PRESSURE' },
    { key: 'rpm', label: 'RPM' },
    { key: 'voltage', label: 'VOLTAGE' },
    { key: 'hertz', label: 'HERTZ' },
    { key: 'ampere', label: 'AMPERE' },
    { key: 'series_no', label: 'SERIES NO.' },
  ];

  const formatFieldValue = (ext: any, key: string) => {
    const item = ext?.[key];
    if (!item || item.value === null || item.value === undefined || String(item.value).trim() === '') {
      return 'N/A';
    }
    return `${item.value}${item.unit_on_plate ? ' ' + item.unit_on_plate : ''}`;
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-6">
      {/* Search & Export Action Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Database className="w-5 h-5 text-cyan-400" />
            <span>Kho thiết bị SFI ({filteredEquipment.length})</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Bảng dữ liệu hiển thị đầy đủ 15 cột thiết bị + cột nút bấm xem ảnh trực tiếp và nút xóa SFI.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm SFI, tên thiết bị, zone..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button
            onClick={handleExportExcel}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow transition"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Excel Bảng (15 Cột)</span>
          </button>

          <button
            onClick={handleExportDatabookZip}
            disabled={isExportingZip}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow transition disabled:opacity-50"
            title="Tải toàn bộ cấu trúc thư mục databook/{ZONE}/{SFI}/{photos} dưới dạng ZIP"
          >
            {isExportingZip ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderDown className="w-4 h-4" />}
            <span>Tải DataBook Folder (ZIP)</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          <p className="text-sm">Đang tải bảng thiết bị SFI...</p>
        </div>
      ) : filteredEquipment.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-3">
          <Database className="w-12 h-12 mx-auto text-slate-600" />
          <h3 className="text-base font-bold text-white">Chưa có thiết bị nào trong kho</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Hãy tải lên nhóm ảnh và xác nhận SFI ở tab "Chờ xử lý" để thêm dữ liệu vào đây.
          </p>
        </div>
      ) : (
        /* Full 16 Column Table Display (15 Standard Columns + Column 16: View Photos & Delete Action) */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-slate-950/90 border-b border-slate-800 text-slate-300 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-4 sticky left-0 z-20 bg-slate-950 border-r border-slate-800 text-cyan-400">1. SFI</th>
                  <th className="py-3.5 px-4">2. DESCRIPTION</th>
                  <th className="py-3.5 px-4">3. ZONE</th>
                  <th className="py-3.5 px-4">4. COMP. LOCATION</th>
                  <th className="py-3.5 px-4 text-cyan-300">5. DRY WEIGHT</th>
                  <th className="py-3.5 px-4 text-cyan-300">6. WET WEIGHT</th>
                  <th className="py-3.5 px-4 text-cyan-300">7. CAPACITY</th>
                  <th className="py-3.5 px-4 text-cyan-300">8. DIMENSION</th>
                  <th className="py-3.5 px-4 text-cyan-300">9. POWER</th>
                  <th className="py-3.5 px-4 text-cyan-300">10. PRESSURE</th>
                  <th className="py-3.5 px-4 text-cyan-300">11. RPM</th>
                  <th className="py-3.5 px-4 text-cyan-300">12. VOLTAGE</th>
                  <th className="py-3.5 px-4 text-cyan-300">13. HERTZ</th>
                  <th className="py-3.5 px-4 text-cyan-300">14. AMPERE</th>
                  <th className="py-3.5 px-4 text-amber-300">15. SERIES NO.</th>
                  {/* Column 16: Photo Viewer & Delete Actions */}
                  <th className="py-3.5 px-4 sticky right-0 z-20 bg-slate-950 border-l border-slate-800 text-center text-emerald-400 font-extrabold">
                    16. MỤC XEM & XÓA
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredEquipment.map((eq: any) => {
                  const ext = eq.extracted_data || {};
                  const photoCount = eq.photos?.length || 0;

                  return (
                    <tr
                      key={eq.sfi}
                      className="hover:bg-slate-800/60 transition group"
                    >
                      {/* Column 1: SFI Sticky */}
                      <td className="py-3 px-4 font-mono font-bold text-cyan-300 bg-slate-900 group-hover:bg-slate-800/90 sticky left-0 z-10 border-r border-slate-800 shadow">
                        {eq.sfi}
                      </td>
                      {/* Column 2: DESCRIPTION */}
                      <td className="py-3 px-4 text-white font-medium max-w-xs truncate">{eq.name || 'N/A'}</td>
                      {/* Column 3: ZONE */}
                      <td className="py-3 px-4 text-slate-300">{eq.zone || 'N/A'}</td>
                      {/* Column 4: COMP. LOCATION */}
                      <td className="py-3 px-4 text-slate-300">{eq.comp_location || 'N/A'}</td>
                      {/* Column 5: DRY WEIGHT */}
                      <td className="py-3 px-4 font-mono text-cyan-200">{formatFieldValue(ext, 'dry_weight')}</td>
                      {/* Column 6: WET WEIGHT */}
                      <td className="py-3 px-4 font-mono text-cyan-200">{formatFieldValue(ext, 'wet_weight')}</td>
                      {/* Column 7: CAPACITY */}
                      <td className="py-3 px-4 font-mono text-cyan-200">{formatFieldValue(ext, 'capacity')}</td>
                      {/* Column 8: DIMENSION */}
                      <td className="py-3 px-4 font-mono text-cyan-200">{formatFieldValue(ext, 'dimension')}</td>
                      {/* Column 9: POWER */}
                      <td className="py-3 px-4 font-mono text-cyan-200">{formatFieldValue(ext, 'power')}</td>
                      {/* Column 10: PRESSURE */}
                      <td className="py-3 px-4 font-mono text-cyan-200">{formatFieldValue(ext, 'pressure')}</td>
                      {/* Column 11: RPM */}
                      <td className="py-3 px-4 font-mono text-cyan-200">{formatFieldValue(ext, 'rpm')}</td>
                      {/* Column 12: VOLTAGE */}
                      <td className="py-3 px-4 font-mono text-cyan-200">{formatFieldValue(ext, 'voltage')}</td>
                      {/* Column 13: HERTZ */}
                      <td className="py-3 px-4 font-mono text-cyan-200">{formatFieldValue(ext, 'hertz')}</td>
                      {/* Column 14: AMPERE */}
                      <td className="py-3 px-4 font-mono text-cyan-200">{formatFieldValue(ext, 'ampere')}</td>
                      {/* Column 15: SERIES NO. */}
                      <td className="py-3 px-4 font-mono text-amber-300 font-bold">{formatFieldValue(ext, 'series_no')}</td>
                      {/* Column 16: View Photos & Delete Action Buttons */}
                      <td className="py-3 px-4 text-center sticky right-0 z-10 bg-slate-900 group-hover:bg-slate-800/90 border-l border-slate-800 shadow">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(eq)}
                            className="px-3 py-1.5 rounded-xl bg-cyan-950 hover:bg-cyan-800 text-cyan-300 hover:text-white font-bold text-xs border border-cyan-800 flex items-center justify-center space-x-1 transition"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Xem {photoCount} ảnh</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingSfi(eq.sfi);
                            }}
                            className="p-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-800/80 transition"
                            title={`Xóa thiết bị SFI ${eq.sfi}`}
                          >
                            <Trash2 className="w-4 h-4 text-rose-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Equipment Detail Modal */}
      {selectedEq && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-cyan-400 text-base">{selectedEq.sfi}</span>
                  <span className="text-xs text-slate-400">({selectedEq.photos?.length || 0} ảnh biển tên)</span>
                </div>
                <h3 className="text-sm font-semibold text-white">{selectedEq.name}</h3>
              </div>

              <div className="flex items-center space-x-2">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center space-x-1 transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Chỉnh sửa thông số</span>
                  </button>
                ) : (
                  <button
                    onClick={handleSaveEquipment}
                    disabled={isSaving}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center space-x-1"
                  >
                    {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Lưu thay đổi</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setDeletingSfi(selectedEq.sfi)}
                  className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-white text-xs font-bold border border-rose-800 flex items-center space-x-1 transition"
                  title="Xóa thiết bị này khỏi kho SFI"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Xóa SFI</span>
                </button>

                <button
                  onClick={() => setSelectedEq(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {feedback && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-600 text-emerald-200 text-xs rounded-xl">
                  {feedback}
                </div>
              )}

              {/* Photos Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase text-slate-400">Ảnh biển tên thiết bị trong thư mục SFI</h4>
                  <span className="text-[11px] text-cyan-400 animate-pulse font-medium">✨ Kích vào ảnh để phóng to</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {selectedEq.photos?.map((p: any, idx: number) => (
                    <div key={p.filename} className="bg-slate-950 border border-slate-800 rounded-2xl p-2 space-y-2 relative group">
                      <div
                        onClick={() => setZoomPhotoIndex(idx)}
                        className="aspect-square rounded-xl overflow-hidden bg-black cursor-pointer relative group/img"
                      >
                        <img src={p.url} alt={p.filename} className="w-full h-full object-cover group-hover/img:scale-105 transition duration-200" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center text-xs text-cyan-300 font-bold space-x-1">
                          <Maximize2 className="w-4 h-4" />
                          <span>Phóng to</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                        <span>{new Date(p.uploaded_at).toLocaleDateString('vi-VN')}</span>
                        <button
                          onClick={() => setTransferringPhoto(p)}
                          className="text-cyan-400 hover:underline font-semibold"
                        >
                          Chuyển SFI →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technical Specifications 11 fields */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <h4 className="text-xs font-bold uppercase text-slate-400">11 Thông số kỹ thuật thiết bị</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {technicalFields.map(({ key, label }) => {
                    const item = isEditing ? editExtracted[key] || {} : selectedEq.extracted_data?.[key] || {};
                    return (
                      <div key={key} className="bg-slate-950 border border-slate-800 p-3 rounded-2xl space-y-1">
                        <span className="text-[11px] font-semibold text-slate-300 block">{label}</span>
                        {isEditing ? (
                          <div className="flex items-center space-x-1.5">
                            <input
                              type="text"
                              value={item.value || ''}
                              onChange={(e) =>
                                setEditExtracted({
                                  ...editExtracted,
                                  [key]: { ...item, value: e.target.value },
                                })
                              }
                              placeholder="Giá trị"
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                            />
                            <input
                              type="text"
                              value={item.unit_on_plate || ''}
                              onChange={(e) =>
                                setEditExtracted({
                                  ...editExtracted,
                                  [key]: { ...item, unit_on_plate: e.target.value },
                                })
                              }
                              placeholder="Đơn vị"
                              className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-cyan-300"
                            />
                          </div>
                        ) : (
                          <p className="text-xs font-mono font-medium text-cyan-300">
                            {item.value ? `${item.value} ${item.unit_on_plate || ''}` : <span className="text-slate-600">N/A</span>}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Equipment React Confirmation Modal */}
      {deletingSfi && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 bg-rose-950 rounded-2xl border border-rose-800">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Xác nhận xóa thiết bị</h3>
                <p className="text-xs text-cyan-300 font-mono font-bold">Mã SFI: {deletingSfi}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn xóa thiết bị SFI này khỏi kho dữ liệu không?
              Thao tác này sẽ xóa bản ghi thông số kỹ thuật và thư mục chứa ảnh thiết bị trên hệ thống.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingSfi(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteEquipment}
                disabled={isDeletingEquipment}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-rose-950 transition disabled:opacity-50"
              >
                {isDeletingEquipment && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Xác nhận xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Image Lightbox Popup Modal */}
      {zoomPhotoIndex !== null && selectedEq && selectedEq.photos?.[zoomPhotoIndex] && (
        <div className="fixed inset-0 z-50 bg-black/92 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
          {/* Lightbox Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-white shrink-0">
            <div className="flex items-center space-x-3">
              <span className="bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono text-xs px-3 py-1 rounded-xl font-bold">
                Mã SFI: {selectedEq.sfi} (Ảnh #{zoomPhotoIndex + 1} / {selectedEq.photos.length})
              </span>
              <span className="text-xs font-semibold text-slate-200 truncate max-w-xs sm:max-w-md">
                {selectedEq.photos[zoomPhotoIndex].filename}
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
            {selectedEq.photos.length > 1 && (
              <button
                onClick={() => setZoomPhotoIndex((zoomPhotoIndex - 1 + selectedEq.photos.length) % selectedEq.photos.length)}
                className="absolute left-2 sm:left-4 z-30 p-3 rounded-full bg-slate-900/80 hover:bg-cyan-600 text-white border border-slate-700 transition shadow-2xl"
                title="Ảnh trước"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <ImageViewer
              src={selectedEq.photos[zoomPhotoIndex].url}
              alt={selectedEq.photos[zoomPhotoIndex].filename}
              className="w-full h-[72vh] max-w-5xl"
            />

            {selectedEq.photos.length > 1 && (
              <button
                onClick={() => setZoomPhotoIndex((zoomPhotoIndex + 1) % selectedEq.photos.length)}
                className="absolute right-2 sm:right-4 z-30 p-3 rounded-full bg-slate-900/80 hover:bg-cyan-600 text-white border border-slate-700 transition shadow-2xl"
                title="Ảnh tiếp theo"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Lightbox Bottom Thumbnails Bar */}
          {selectedEq.photos.length > 1 && (
            <div className="flex items-center justify-center space-x-2 overflow-x-auto pt-2 border-t border-slate-800 shrink-0">
              {selectedEq.photos.map((p: any, idx: number) => (
                <button
                  key={p.filename}
                  onClick={() => setZoomPhotoIndex(idx)}
                  className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition ${
                    zoomPhotoIndex === idx
                      ? 'border-cyan-400 scale-105 shadow-lg shadow-cyan-950'
                      : 'border-slate-800 opacity-50 hover:opacity-100'
                  }`}
                >
                  <img src={p.url} alt={p.filename} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transfer Photo Modal */}
      {transferringPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Chuyển ảnh sang SFI khác</h3>
            <p className="text-xs text-slate-300">Nhập mã SFI đích để di chuyển tệp ảnh này sang thư mục thiết bị mới:</p>
            <input
              type="text"
              value={targetTransferSfi}
              onChange={(e) => setTargetTransferSfi(e.target.value)}
              placeholder="Ví dụ: 701.01101.10"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
            />
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setTransferringPhoto(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={handleTransferPhoto}
                className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold"
              >
                Xác nhận chuyển
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
