import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { 
  RefreshCw, Search, Boxes, AlertCircle, Settings2, 
  Database, LogOut, X, Check, Filter
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
  Miktar1: number; // Gerçek Sipariş İhtiyacı
  Miktar2: number; // Planlanan İhtiyacı
  Miktar3: number; // Emir İhtiyacı
  Miktar4: number; // Devam Eden
  MiktarTop: number; // Toplam İhtiyaç
}

interface MaterialAnalysisProps {
  tenantId: number | null;
}

type GroupingMode = 'COLOR' | 'SIZE';

const MaterialAnalysis: React.FC<MaterialAnalysisProps> = () => {
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('COLOR');
  
  // Kalıcı Ayarlar (LocalStorage)
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
      setMrpData(res.data);
    } catch (err: any) {
      setError(`MRP verisi çekilemedi: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  }, [prodLocs, rawLocs, apiBase]);

  useEffect(() => { fetchLocations(); }, []);
  useEffect(() => { fetchMrpAnalysis(); }, [fetchMrpAnalysis]);

  // JS Tarafında Dinamik Gruplama (Bedenleri Renk Altında Toplar)
  const processedData = useMemo(() => {
    if (groupingMode === 'SIZE') return mrpData;

    // Renk Bazlı Gruplama Mantığı
    const groupedMap = new Map<string, MrpItem>();
    
    mrpData.forEach(item => {
      const key = `${item.hskod}_${item.HRKod_Tanim}`;
      if (groupedMap.has(key)) {
        const existing = groupedMap.get(key)!;
        // Tüm bedenlerdeki hammadde stok ve ihtiyaç rakamlarını topluyoruz
        existing.Miktar1 = (existing.Miktar1 || 0) + (item.Miktar1 || 0);
        existing.Miktar2 = (existing.Miktar2 || 0) + (item.Miktar2 || 0);
        existing.Miktar3 = (existing.Miktar3 || 0) + (item.Miktar3 || 0);
        existing.Miktar4 = (existing.Miktar4 || 0) + (item.Miktar4 || 0);
        existing.MiktarTop = (existing.MiktarTop || 0) + (item.MiktarTop || 0);
      } else {
        // Yeni grup oluştur: Bedeni temizleyip kopya alıyoruz
        groupedMap.set(key, { ...item, HBeden: '-' });
      }
    });

    return Array.from(groupedMap.values());
  }, [mrpData, groupingMode]);

  const filteredData = processedData.filter(item => 
    item.hskod?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.HSKod_Tanim?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Ayarları Kaydet
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
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Hammadde İhtiyaç Planlama</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Gruplama Toggle Seçeneği */}
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 mr-2">
            <button 
              onClick={() => setGroupingMode('COLOR')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${groupingMode === 'COLOR' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              RENK BAZLI
            </button>
            <button 
              onClick={() => setGroupingMode('SIZE')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${groupingMode === 'SIZE' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              BEDEN BAZLI
            </button>
          </div>

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
        {/* Araçlar ve Filtreler */}
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

          <div className="flex items-center gap-2">
            <button 
              onClick={() => fetchMrpAnalysis()}
              disabled={loading}
              className={`p-2.5 rounded-xl border border-white/10 flex items-center justify-center transition-all ${loading ? 'opacity-50 cursor-not-allowed bg-blue-500/20' : 'bg-white/5 hover:bg-white/10 text-blue-400'}`}
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Veri Tablosu */}
        <div className="bg-[#0f172a]/50 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-sm self-shadow">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white/5 text-[11px] uppercase tracking-widest text-slate-500 font-bold border-b border-white/5">
                <tr>
                  <th className="px-6 py-4">Hammadde & Renk</th>
                  {groupingMode === 'SIZE' && <th className="px-6 py-4">Beden</th>}
                  <th className="px-6 py-4">Birim</th>
                  <th className="px-6 py-4 text-center">Sipariş İhtiyacı</th>
                  <th className="px-6 py-4 text-center">Planlanan İhtiyaç</th>
                  <th className="px-6 py-4 text-center">Emir İhtiyacı</th>
                  <th className="px-6 py-4 text-center">Devam Eden</th>
                  <th className="px-6 py-4 text-center text-blue-400">Toplam İhtiyaç</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={groupingMode === 'SIZE' ? 8 : 7} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                        <p className="text-sm text-slate-400 font-medium">Veriler Hesaplanıyor...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={groupingMode === 'SIZE' ? 8 : 7} className="px-6 py-20 text-center text-slate-500 italic">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle size={32} className="opacity-20 mb-2" />
                        Veri Bulunamadı
                      </div>
                    </td>
                  </tr>
                ) : filteredData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                          {item.hskod}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                          <Database size={12} className="text-slate-600" />
                          {item.HSKod_Tanim}
                        </span>
                        <span className="text-[10px] text-indigo-400/80 font-bold mt-1 bg-indigo-500/10 w-fit px-1.5 rounded">
                          {item.HRKod_Tanim}
                        </span>
                      </div>
                    </td>
                    {groupingMode === 'SIZE' && (
                       <td className="px-6 py-4">
                        <span className="text-[10px] px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 rounded-lg font-bold">
                          {item.HBeden}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <span className="text-[10px] px-2 py-0.5 bg-white/5 border border-white/10 rounded-full font-bold">
                        {item.HBirim}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-xs">{item.Miktar1?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center font-mono text-xs text-orange-400">{item.Miktar2?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center font-mono text-xs text-purple-400">{item.Miktar3?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center font-mono text-xs text-teal-400">{item.Miktar4?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center font-mono text-sm font-bold text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">
                      {item.MiktarTop?.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm animate-pulse">
            <AlertCircle size={18} />
            {error}
          </div>
        )}
      </main>

      {/* Ayarlar Modalı (Side Overlay) */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-md bg-[#0f172a] border-l border-white/10 shadow-3xl flex flex-col animate-slide-left h-screen">
            
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-3">
                <Settings2 className="text-blue-400" size={20} />
                <h2 className="text-lg font-bold">Sistem Ayarları</h2>
              </div>
              <button 
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Üretim Lokasyonları */}
              <section>
                <div className="flex items-center gap-2 mb-4 text-sm font-bold text-blue-400">
                  <RefreshCw size={16} />
                  Sipariş & Üretim Depoları
                </div>
                <p className="text-[11px] text-slate-500 mb-3 ml-6 font-medium leading-relaxed">Siparişlerin ve üretim emirlerinin durumunun kontrol edileceği depolar.</p>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-white/10">
                  {locations.map(loc => (
                    <button
                      key={loc.id}
                      onClick={() => toggleLoc(loc.id, prodLocs, setProdLocs)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                        prodLocs.includes(loc.id) 
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-[0_0_15px_-5px_#3b82f6]' 
                        : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'
                      }`}
                    >
                      {loc.name}
                      {prodLocs.includes(loc.id) && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </section>

              {/* Hammadde Lokasyonları */}
              <section>
                <div className="flex items-center gap-2 mb-4 text-sm font-bold text-indigo-400">
                  <Filter size={16} />
                  Hammadde & Satın Alma Depoları
                </div>
                <p className="text-[11px] text-slate-500 mb-3 ml-6 font-medium leading-relaxed">Mevcut stok ve satın alma ihtiyacının hesaplanacağı depolar.</p>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-white/10">
                  {locations.map(loc => (
                    <button
                      key={loc.id}
                      onClick={() => toggleLoc(loc.id, rawLocs, setRawLocs)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                        rawLocs.includes(loc.id) 
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-[0_0_15px_-5px_#6366f1]' 
                        : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'
                      }`}
                    >
                      {loc.name}
                      {rawLocs.includes(loc.id) && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </section>

            </div>

            <div className="p-6 border-t border-white/5 bg-slate-900/50">
              <button 
                onClick={saveSettings}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-95"
              >
                <Check size={20} />
                Ayarları Kaydet ve Yenile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animasyonlar */}
      <style>{`
        @keyframes slide-left {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-left {
          animation: slide-left 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>

    </div>
  );
};

export default MaterialAnalysis;
