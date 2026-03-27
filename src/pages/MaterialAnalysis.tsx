import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { 
  RefreshCw, Search, Boxes, AlertCircle, Settings2, 
  LogOut, X
} from 'lucide-react';
import '../styles/professional.css';

interface Location {
  id: string;
  name: string;
}

interface MrpItem {
  hskod: string;
  HSKod_Tanim: string;
  HRKod_Tanim: string;
  HBeden: string;
  HBirim: string;
  Miktar1: number; // Brüt İhtiyaç
  Miktar2: number; // Mevcut Stok
  Miktar3: number; // Satın Alma
  Miktar4: number; // Net İhtiyaç
  MiktarTop: number;
}

interface MaterialAnalysisProps {
  tenantId: number | null;
}

const MaterialAnalysis: React.FC<MaterialAnalysisProps> = () => {
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  
  const [prodLocs, setProdLocs] = useState<string[]>(() => {
    const saved = localStorage.getItem('mrp_prod_locs');
    return saved ? saved.split(',') : ['K0001'];
  });
  
  const [rawLocs, setRawLocs] = useState<string[]>(() => {
    const saved = localStorage.getItem('mrp_raw_locs');
    return saved ? saved.split(',') : ['K0001'];
  });
  
  const [mrpData, setMrpData] = useState<MrpItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mrpDebug, setMrpDebug] = useState<any>(null);

  const isLocal = window.location.hostname === 'localhost';
  const apiBase = isLocal ? 'http://localhost:5000' : 'https://kgmps-production.up.railway.app';

  const fetchLocations = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${apiBase}/api/locations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setLocations(res.data);
    } catch (err: any) {
      console.error('Lokasyonlar yüklenemedi');
    }
  };

  const fetchMrpAnalysis = useCallback(async () => {
    if (prodLocs.length === 0 || rawLocs.length === 0) {
      setError("Lütfen en az bir lokasyon seçin (Ayarlar menüsünden).");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${apiBase}/api/production/mrp`, {
        params: { 
          prodLocs: prodLocs.join(','), 
          rawLocs: rawLocs.join(',') 
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      setMrpData(res.data.data || []);
      setMrpDebug(res.data.debug);
    } catch (err: any) {
      setError(`MRP verisi çekilemedi: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  }, [prodLocs, rawLocs, apiBase]);

  useEffect(() => { fetchLocations(); }, []);
  useEffect(() => { fetchMrpAnalysis(); }, [fetchMrpAnalysis]);

  const filteredData = useMemo(() => {
    return mrpData.filter(item => 
      item.hskod?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.HSKod_Tanim?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [mrpData, searchTerm]);

  const saveSettings = () => {
    localStorage.setItem('mrp_prod_locs', prodLocs.join(','));
    localStorage.setItem('mrp_raw_locs', rawLocs.join(','));
    setShowSettings(false);
    fetchMrpAnalysis();
  };

  const toggleLoc = (id: string, list: string[], setter: (v: string[]) => void) => {
    if (list.includes(id)) {
      setter(list.filter(item => item !== id));
    } else {
      setter([...list, id]);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f18] text-slate-200 font-sans selection:bg-blue-500/30">
      
      {/* Üst Bar */}
      <div className="sticky top-0 z-50 bg-[#0f172a]/80 backdrop-blur-md border-b border-white/5 px-6 py-3 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40">
            <Boxes className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent leading-tight">
              Malzeme Analizi (MRP)
            </h1>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Hammadde & Stok & Satın Alma</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold transition-all group"
          >
            <Settings2 size={16} className="text-blue-400 group-hover:rotate-45 transition-transform" />
            Lokasyon Ayarları
          </button>
          
          <div className="h-6 w-px bg-white/10 mx-1"></div>

          <button 
            onClick={() => { localStorage.clear(); window.location.href='/'; }}
            className="p-2 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition-colors group"
            title="Çıkış"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <main className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="relative group w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Hammadde Ara..."
              className="w-full pl-12 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button 
            onClick={() => fetchMrpAnalysis()}
            disabled={loading}
            className={`p-2.5 rounded-xl border border-white/10 flex items-center justify-center transition-all ${loading ? 'opacity-50 cursor-not-allowed bg-blue-500/20' : 'bg-white/5 hover:bg-white/10 text-blue-400'}`}
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="bg-[#0f172a]/50 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-sm shadow-2xl">
          <div className="overflow-x-auto max-h-[calc(100vh-250px)] overflow-y-auto scrollbar-thin">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-[#161e31] text-[11px] uppercase tracking-widest text-slate-500 font-bold border-b border-white/5">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Hammadde Kodu & Tanımı</th>
                  <th className="px-6 py-4">Renk</th>
                  <th className="px-6 py-4">Beden</th>
                  <th className="px-6 py-4">Birim</th>
                  <th className="px-6 py-4 text-center">Brüt İhtiyaç</th>
                  <th className="px-6 py-4 text-center text-orange-400 font-bold">Mevcut Stok</th>
                  <th className="px-6 py-4 text-center text-purple-400 font-bold">Satın Alma</th>
                  <th className="px-6 py-4 text-center text-blue-400 font-bold">Net İhtiyaç</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                        <p className="text-sm text-slate-400 font-medium">Hesaplanıyor...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-20 text-center text-slate-500 italic">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle size={32} className="opacity-20 mb-2" />
                        Veri Bulunamadı
                      </div>
                    </td>
                  </tr>
                ) : filteredData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-[10px]">
                        {idx + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors uppercase">
                          {item.hskod}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium mt-0.5 truncate max-w-[200px]">
                          {item.HSKod_Tanim}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[10px] font-bold text-indigo-400">
                      <span className="bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {item.HRKod_Tanim}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[10px] font-bold text-slate-400 text-center">
                      <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5">
                        {item.HBeden}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[10px] font-bold text-center">
                      {item.HBirim}
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-xs font-bold text-slate-300">
                      {item.Miktar1?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-xs font-bold text-orange-400">
                      {item.Miktar2?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-xs font-bold text-purple-400">
                      {item.Miktar3?.toLocaleString()}
                    </td>
                    <td className={`px-6 py-4 text-center font-mono text-sm font-bold ${item.Miktar4 > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {item.Miktar4?.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {mrpDebug && (
           <div className="mt-4 text-[10px] text-slate-600 flex gap-4 justify-end">
              <span>DB: {mrpDebug.db}</span>
              <span>Server: {mrpDebug.server}</span>
              <span>Rows: {mrpDebug.rowCount}</span>
           </div>
        )}
      </main>

      {showSettings && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-md bg-[#0f172a] border-l border-white/10 shadow-3xl flex flex-col animate-slide-left h-screen">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-lg font-bold">Ayarlar</h2>
              <button onClick={() => setShowSettings(false)}><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <section>
                <h3 className="text-sm font-bold text-blue-400 mb-2">Üretim Depoları</h3>
                <div className="grid grid-cols-2 gap-2">
                  {locations.map(loc => (
                    <button key={loc.id} onClick={() => toggleLoc(loc.id, prodLocs, setProdLocs)}
                      className={`p-2 rounded-xl border text-xs ${prodLocs.includes(loc.id) ? 'bg-blue-600 border-blue-500' : 'bg-white/5 border-white/10'}`}>
                      {loc.name}
                    </button>
                  ))}
                </div>
              </section>
              <section>
                <h3 className="text-sm font-bold text-indigo-400 mb-2">Hammadde Depoları</h3>
                <div className="grid grid-cols-2 gap-2">
                  {locations.map(loc => (
                    <button key={loc.id} onClick={() => toggleLoc(loc.id, rawLocs, setRawLocs)}
                      className={`p-2 rounded-xl border text-xs ${rawLocs.includes(loc.id) ? 'bg-indigo-600 border-indigo-500' : 'bg-white/5 border-white/10'}`}>
                      {loc.name}
                    </button>
                  ))}
                </div>
              </section>
            </div>
            <div className="p-6 border-t border-white/5">
              <button onClick={saveSettings} className="w-full py-4 bg-blue-600 rounded-2xl font-bold">Kaydet</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-left { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-left { animation: slide-left 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default MaterialAnalysis;
