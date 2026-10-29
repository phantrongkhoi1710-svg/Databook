import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, Camera, Loader2, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { UserProfile, BatchPhotoItem } from '../types';

interface UploadTabProps {
  userToken: string;
  onBatchUploaded: (batchId: string) => void;
}

export const UploadTab: React.FC<UploadTabProps> = ({ userToken, onBatchUploaded }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Master Excel import state
  const [masterFile, setMasterFile] = useState<File | null>(null);
  const [isImportingMaster, setIsImportingMaster] = useState<boolean>(false);
  const [masterImportMsg, setMasterImportMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const masterInputRef = useRef<HTMLInputElement>(null);

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (files.length > 20) {
      setErrorMsg('Vui lòng chỉ tải lên tối đa 20 ảnh mỗi lần.');
      return;
    }

    setErrorMsg(null);
    setSelectedFiles(files);
    setPreviewUrls(files.map(f => URL.createObjectURL(f)));
  };

  const handleMasterFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMasterFile(file);
      setMasterImportMsg(null);
    }
  };

  const handleUploadMasterExcel = async () => {
    if (!masterFile) return;
    setIsImportingMaster(true);
    setMasterImportMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', masterFile);

      const res = await fetch('/api/master/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi nhập tệp Excel.');

      setMasterImportMsg(`✓ ${data.message}`);
      setMasterFile(null);
    } catch (err: any) {
      setMasterImportMsg(`Lỗi: ${err.message}`);
    } finally {
      setIsImportingMaster(false);
    }
  };

  const handleUploadPhotos = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setErrorMsg(null);
    setUploadProgress('Đang chuẩn hóa ảnh và gửi cho Gemini AI phân tích SFI & thông số...');

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('photos', file);
      });

      const res = await fetch('/api/batches/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi tải ảnh lên.');

      onBatchUploaded(data.batch.batch_id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi xử lý nhóm ảnh.');
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Step 1: Import Master Excel Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-3 text-cyan-400">
          <div className="p-2.5 rounded-2xl bg-cyan-950 border border-cyan-800">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">Bước 1: Tải lên danh mục SFI chuẩn (Excel)</h2>
            <p className="text-xs text-slate-400">Nhập bảng thiết bị gốc chứa mã SFI, Tên thiết bị (DESCRIPTION), ZONE, COMP. LOCATION.</p>
          </div>
        </div>

        <input
          ref={masterInputRef}
          type="file"
          accept=".xlsx, .xls, .csv"
          onChange={handleMasterFileChange}
          className="hidden"
        />

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => masterInputRef.current?.click()}
            className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center space-x-2 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
            <span>{masterFile ? masterFile.name : 'Chọn tệp Excel SFI (.xlsx)'}</span>
          </button>

          {masterFile && (
            <button
              type="button"
              onClick={handleUploadMasterExcel}
              disabled={isImportingMaster}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-950 transition disabled:opacity-50"
            >
              {isImportingMaster && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Đồng bộ danh mục</span>
            </button>
          )}
        </div>

        {masterImportMsg && (
          <div className="text-xs font-medium text-emerald-300 bg-emerald-950/60 border border-emerald-800/80 p-3 rounded-xl">
            {masterImportMsg}
          </div>
        )}
      </div>

      {/* Step 2: Upload Batch of Photos (Up to 20) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex items-center space-x-3 text-cyan-400">
          <div className="p-2.5 rounded-2xl bg-cyan-950 border border-cyan-800">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">Bước 2: Tải lên nhóm ảnh thiết bị (Tối đa 20 ảnh)</h2>
            <p className="text-xs text-slate-400">AI sẽ tự động đọc SFI (hoặc nhãn SFI kèm theo) và 11 trường thông số kỹ thuật.</p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFilesChange}
          className="hidden"
        />

        {errorMsg && (
          <div className="bg-rose-950/70 border border-rose-600 text-rose-200 p-3 rounded-xl text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-800 hover:border-cyan-500/60 rounded-2xl p-8 text-center cursor-pointer transition bg-slate-950/40 space-y-2"
        >
          <Camera className="w-10 h-10 text-cyan-400 mx-auto" />
          <h3 className="text-sm font-bold text-white">Nhấn để chọn ảnh hoặc kéo thả vào đây</h3>
          <p className="text-xs text-slate-500">Hỗ trợ định dạng JPEG, PNG, WebP, HEIC (Tối đa 20 ảnh mỗi lần tải)</p>
        </div>

        {previewUrls.length > 0 && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-200">Đã chọn {previewUrls.length} ảnh thiết bị</span>
              <button
                onClick={() => {
                  setSelectedFiles([]);
                  setPreviewUrls([]);
                }}
                className="text-rose-400 hover:underline"
              >
                Xóa tất cả
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-64 overflow-y-auto p-2 bg-slate-950 rounded-2xl border border-slate-800">
              {previewUrls.map((url, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-800 bg-black">
                  <img src={url} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 left-1 bg-black/70 text-[10px] text-cyan-300 px-1.5 py-0.5 rounded font-mono">
                    #{idx + 1}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleUploadPhotos}
                disabled={isUploading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-xl shadow-cyan-950 transition disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{uploadProgress}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Bắt đầu phân tích & Đối chiếu SFI tự động</span>
                    <ArrowRight className="w-5 h-5 ml-1" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
