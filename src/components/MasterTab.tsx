import React, { useState, useEffect, useCallback } from 'react';
import { Layers, Search, FileSpreadsheet, Download, Loader2 } from 'lucide-react';
import { EquipmentMasterItem } from '../types';
import { safeFetchJson } from '../utils/api';

interface MasterTabProps {
  userToken: string;
}

export const MasterTab: React.FC<MasterTabProps> = ({ userToken }) => {
  const [items, setItems] = useState<EquipmentMasterItem[]>([]);
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchMaster = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await safeFetchJson<{ items: EquipmentMasterItem[] }>('/api/master', {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (res.ok && res.data) {
        setItems(res.data.items || []);
      }
    } catch (err) {
      console.error('Master fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userToken]);

  useEffect(() => {
    fetchMaster();
  }, [fetchMaster]);

  const filteredItems = items.filter(
    i =>
      i.sfi.toLowerCase().includes(search.toLowerCase()) ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      (i.zone && i.zone.toLowerCase().includes(search.toLowerCase())) ||
      (i.comp_location && i.comp_location.toLowerCase().includes(search.toLowerCase())) ||
      (i.system_description && i.system_description.toLowerCase().includes(search.toLowerCase())) ||
      (i.maker && i.maker.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <span>Danh mục SFI chuẩn ({filteredItems.length})</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Danh mục thiết bị gốc đầy đủ 24 cột đã nhập từ tệp Excel nhà máy đóng tàu
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm mã SFI, tên, maker, hệ thống..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          <p className="text-sm">Đang tải danh mục SFI Master...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-3">
          <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-600" />
          <h3 className="text-base font-bold text-white">Chưa có dữ liệu danh mục SFI</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Hãy sử dụng Bước 1 ở tab "Tải ảnh hàng loạt" để nhập tệp Excel danh mục SFI trước.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-medium uppercase text-[11px] tracking-wider whitespace-nowrap">
                  <th className="py-3 px-4">Mã SFI</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Zone</th>
                  <th className="py-3 px-4">Comp. Location</th>
                  <th className="py-3 px-4">System Description</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-cyan-400">AI Tech Specs Gap</th>
                  <th className="py-3 px-4">Maker</th>
                  <th className="py-3 px-4">Supplier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 whitespace-nowrap">
                {filteredItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-cyan-300">{item.sfi}</td>
                    <td className="py-3 px-4 text-white font-medium max-w-xs truncate">{item.name}</td>
                    <td className="py-3 px-4 text-slate-300">{item.zone || '—'}</td>
                    <td className="py-3 px-4 text-slate-300">{item.comp_location || '—'}</td>
                    <td className="py-3 px-4 text-slate-300">{item.system_description || '—'}</td>
                    <td className="py-3 px-4 text-slate-300">{item.type || '—'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-800/60 text-[10px] font-mono">
                        DRY Wt → SERIES NO (Điền từ ảnh AI)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{item.maker || '—'}</td>
                    <td className="py-3 px-4 text-slate-300">{item.supplier || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
