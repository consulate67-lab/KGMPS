import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, CheckCircle2, 
  Search, RefreshCw, 
  PackageSearch, Clock, 
  FileWarning
} from 'lucide-react';
import '../styles/professional.css';

interface DataIntegrityProps {
  tenantId: number | null;
}

interface Issue {
  skod: string;
  StokAdi: string;
  type: 'NO_BOM' | 'NO_DURATIONS';
  proses?: string;
  Prosesadi?: string;
  sure?: number;
}

const DataIntegrity: React.FC<DataIntegrityProps> = () => {
  const [activeSubTab, setActiveSubTab] = useState<'MISSING_BOM' | 'MISSING_TIME'>('MISSING_BOM');
  const [loading, setLoading] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProses, setSelectedProses] = useState<string>('all');
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://kgmps-production.up.railway.app';

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiBase}/api/production/pre-checks?checkType=${activeSubTab}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      setIssues(result.data || []);
      setDebugInfo(result.debug);
    } catch (err) {
      console.error('Veri çekme hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [activeSubTab]);

  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      const matchesSearch = (issue.skod || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (issue.StokAdi || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesProses = selectedProses === 'all' || issue.Prosesadi === selectedProses;
      return matchesSearch && matchesProses;
    });
  }, [issues, searchTerm, selectedProses]);

  const uniqueProsesler = useMemo(() => {
    return Array.from(new Set(issues.map(i => i.Prosesadi).filter(Boolean))) as string[];
  }, [issues]);

  return (
    <div className="flex flex-col h-full bg-[#0a0f18] text-slate-200">
      
      {/* Header Stat Area */}
      <div className="p-6 border-b border-white/5 bg-[#0f172a]/40 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="bg-amber-500/20 p-3 rounded-2xl border border-amber-500/20 text-amber-500">
            <FileWarning size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Veri Bütünlüğü Analizi</h2>
            <p className="text-xs text-slate-500 font-medium">Sistem simülasyonu için eksik tanımların kontrolü</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-right">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Tespit Edilen Hata</span>
            <span className={`text-2xl font-black ${issues.length > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
              {issues.length}
            </span>
          </div>
          <button 
            onClick={fetchIssues}
            disabled={loading}
            className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group"
          >
            <RefreshCw size={20} className={`text-blue-400 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          </button>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="px-6 mt-4 flex gap-2">
        <button 
          onClick={() => { setActiveSubTab('MISSING_BOM'); setSelectedProses('all'); }}
          className={`px-5 py-3 rounded-t-2xl text-xs font-bold flex items-center gap-2 transition-all border-b-2 ${
            activeSubTab === 'MISSING_BOM' 
            ? 'bg-blue-600/10 border-blue-500 text-blue-400' 
            : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <PackageSearch size={16} />
          Eksik Model Ağacı (BOM)
        </button>
        <button 
          onClick={() => { setActiveSubTab('MISSING_TIME'); setSelectedProses('all'); }}
          className={`px-5 py-3 rounded-t-2xl text-xs font-bold flex items-center gap-2 transition-all border-b-2 ${
            activeSubTab === 'MISSING_TIME' 
            ? 'bg-blue-600/10 border-blue-500 text-blue-400' 
            : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <Clock size={16} />
          Eksik Operasyon Süresi
        </button>
      </div>

      {/* Analysis Grid Area */}
      <div className="flex-1 p-6 overflow-hidden flex flex-col pt-2">
        
        {/* Toolbar */}
        <div className="mb-4 flex gap-3 items-center">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Hatalı kaydı ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
            />
          </div>

          {activeSubTab === 'MISSING_TIME' && uniqueProsesler.length > 0 && (
            <select 
              value={selectedProses}
              onChange={(e) => setSelectedProses(e.target.value)}
              className="bg-[#1e293b] border border-white/10 rounded-2xl py-3 px-4 text-sm font-semibold text-white outline-none cursor-pointer hover:bg-slate-700 transition-colors"
            >
              <option value="all" className="bg-[#0f172a] text-white">Tüm Prosesler</option>
              {uniqueProsesler.map(p => (
                <option key={p} value={p} className="bg-[#0f172a] text-white">{p}</option>
              ))}
            </select>
          )}
        </div>

        {/* Data Grid (Table) View */}
        <div className="flex-1 bg-[#0f172a]/30 border border-white/5 rounded-3xl overflow-hidden flex flex-col">
          <div className="overflow-x-auto overflow-y-auto scrollbar-thin flex-1">
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-[#161e31] border-b border-white/5">
                <tr className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">
                  <th className="px-6 py-4">Sipariş/Stok Kodu</th>
                  <th className="px-6 py-4">Stok Adı / Ürün Tanımı</th>
                  {activeSubTab === 'MISSING_TIME' && <th className="px-6 py-4">Hatalı Proses</th>}
                  <th className="px-6 py-4 text-right">Eksiklik Türü</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center">
                       <RefreshCw className="animate-spin text-blue-500 mx-auto" size={32} />
                       <p className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Veri Analiz Ediliyor...</p>
                    </td>
                  </tr>
                ) : filteredIssues.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center">
                       <CheckCircle2 className="text-emerald-500 mx-auto mb-3" size={48} />
                       <h3 className="text-lg font-bold text-white">Her Şey Yolunda!</h3>
                       <p className="text-sm text-slate-500">Bu kategori altında herhangi bir veri sorunu tespit edilmedi.</p>
                    </td>
                  </tr>
                ) : filteredIssues.map((issue, idx) => (
                  <tr key={idx} className="hover:bg-red-500/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 font-bold text-[10px]">
                          {idx + 1}
                        </div>
                        <span className="text-sm font-black text-white group-hover:text-red-400 transition-colors uppercase">
                          {issue.skod}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-300">
                        {issue.StokAdi}
                      </div>
                    </td>
                    {activeSubTab === 'MISSING_TIME' && (
                      <td className="px-6 py-4">
                        <span className="text-[11px] font-bold px-3 py-1 bg-amber-500/10 border border-amber-500/10 text-amber-500 rounded-lg">
                          {issue.Prosesadi || 'Genel'}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-600/10 border border-red-600/20 text-[10px] font-black text-red-500 uppercase">
                        <AlertTriangle size={12} />
                        {activeSubTab === 'MISSING_BOM' ? 'BOM TANIMSIZ' : 'SÜRE HATASI'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Connection Info */}
      {debugInfo && (
        <div className="px-6 py-2 border-t border-white/5 text-[9px] font-bold text-slate-700 flex justify-between items-center bg-black/20 uppercase tracking-widest">
           <span>Canlı Veri Takibi Aktif</span>
           <div className="flex gap-4">
              <span>Sunucu: {debugInfo.server}</span>
              <span>DB: {debugInfo.db}</span>
              <span>Kayıt: {issues.length}</span>
           </div>
        </div>
      )}
    </div>
  );
};

export default DataIntegrity;
