import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { 
  RefreshCw, Truck, Search, 
  LayoutGrid, Boxes
} from 'lucide-react';
import '../styles/glass.css';

interface MrpItem {
  SipNo: string;
  SipHarinx: number;
  UrunAd: string;
  HamKod: string;
  HamAd: string;
  GerekenMik: number;
  HamStok: number;
  TedarikTarihi: string | null;
  YoldakiMik: number;
}

interface MaterialAnalysisProps {
  tenantId: number | null;
}

const MaterialAnalysis: React.FC<MaterialAnalysisProps> = ({ tenantId }) => {
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [mrpData, setMrpData] = useState<MrpItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'CRITICAL' | 'OK'>('ALL');
  const [groupBy, setGroupBy] = useState<'ORDER' | 'MATERIAL'>('ORDER');

  const apiBase = 'https://kgmps-production.up.railway.app';

  const fetchLocations = async () => {
    try {
      console.log(`Fetching locations for tenant ${tenantId}...`);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${apiBase}/api/locations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLocations(res.data);
      if (res.data.length > 0 && !selectedLocation) setSelectedLocation(res.data[0]);
    } catch (err) {
      console.error("Lokasyonlar çekilemedi:", err);
    }
  };

  const fetchMrpAnalysis = useCallback(async () => {
    if (!selectedLocation) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${apiBase}/api/production/mrp`, {
        params: {
          location: selectedLocation,
          startDate: '2026-03-01',
          endDate: '2026-12-31'
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      setMrpData(res.data);
    } catch (err) {
      console.error("MRP Analizi başarısız:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedLocation]);

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (selectedLocation) fetchMrpAnalysis();
  }, [selectedLocation, fetchMrpAnalysis]);

  // Grouping Logic
  const processedData = useMemo(() => {
    const filtered = mrpData.filter(item => {
      const matchesSearch = item.HamAd.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.SipNo.toLowerCase().includes(searchTerm.toLowerCase());
      const isCritical = item.HamStok < item.GerekenMik;
      if (filterStatus === 'CRITICAL') return matchesSearch && isCritical;
      if (filterStatus === 'OK') return matchesSearch && !isCritical;
      return matchesSearch;
    });

    if (groupBy === 'ORDER') {
      const groups: Record<string, { orderNo: string, productName: string, items: MrpItem[] }> = {};
      filtered.forEach(item => {
        if (!groups[item.SipNo]) groups[item.SipNo] = { orderNo: item.SipNo, productName: item.UrunAd, items: [] };
        groups[item.SipNo].items.push(item);
      });
      return Object.values(groups);
    } else {
      const groups: Record<string, { matCode: string, matName: string, items: MrpItem[] }> = {};
      filtered.forEach(item => {
        if (!groups[item.HamKod]) groups[item.HamKod] = { matCode: item.HamKod, matName: item.HamAd, items: [] };
        groups[item.HamKod].items.push(item);
      });
      return Object.values(groups);
    }
  }, [mrpData, searchTerm, filterStatus, groupBy]);

  const stats = {
    totalItems: mrpData.length,
    criticalCount: mrpData.filter(i => i.HamStok < i.GerekenMik).length,
    okCount: mrpData.filter(i => i.HamStok >= i.GerekenMik).length,
    totalShortage: mrpData.reduce((acc, i) => acc + (i.HamStok < i.GerekenMik ? (i.GerekenMik - i.HamStok) : 0), 0)
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'transparent', padding: '20px', overflow: 'hidden' }}>
      {/* Sub Header (Filters & Stats) */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div className="glass-card" style={{ flex: 1, padding: '15px 25px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '5px 15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <label style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '2px' }}>DEPO / LOKASYON</label>
                    <select 
                        value={selectedLocation} 
                        onChange={(e) => setSelectedLocation(e.target.value)}
                        style={{ background: 'transparent', border: 'none', color: '#00f2fe', fontWeight: 'bold', outline: 'none', cursor: 'pointer' }}
                    >
                        {locations.map(loc => <option key={loc} value={loc} style={{ background: '#1e293b' }}>{loc}</option>)}
                    </select>
                </div>
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '10px' }}>
                     <ViewToggleButton active={groupBy === 'ORDER'} onClick={() => setGroupBy('ORDER')} label="Üretim Emri Bazlı" />
                     <ViewToggleButton active={groupBy === 'MATERIAL'} onClick={() => setGroupBy('MATERIAL')} label="Hammadde Bazlı" />
                </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={fetchMrpAnalysis} className="glass-button" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Listeyi Yenile
                </button>
            </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 150px)', gap: '10px' }}>
            <MiniStatCard label="Eksik" value={stats.criticalCount} color="#ef4444" />
            <MiniStatCard label="Tamam" value={stats.okCount} color="#10b981" />
            <MiniStatCard label="Toplam" value={stats.totalItems} color="#94a3b8" />
            <MiniStatCard label="Açık Mik." value={stats.totalShortage.toLocaleString()} color="#facc15" />
        </div>
      </div>

      {/* Main Grid View */}
      <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', gap: '15px' }}>
             <div className="search-box" style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input 
                  className="glass-input" 
                  placeholder="Ara..." 
                  style={{ paddingLeft: '35px', marginBottom: 0, width: '250px', fontSize: '13px', height: '36px' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '3px' }}>
                <FilterButton active={filterStatus === 'ALL'} onClick={() => setFilterStatus('ALL')} label="Tümü" />
                <FilterButton active={filterStatus === 'CRITICAL'} onClick={() => setFilterStatus('CRITICAL')} label="Sadece Eksikler" color="#ef4444" />
             </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
            {processedData.map((group: any, gIdx: number) => (
                <div key={gIdx} style={{ marginBottom: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px 12px 0 0' }}>
                        {groupBy === 'ORDER' ? <LayoutGrid size={16} color="#00f2fe" /> : <Boxes size={16} color="#facc15" />}
                        <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '14px' }}>
                            {groupBy === 'ORDER' ? `Sipari: ${group.orderNo}` : `Malzeme: ${group.matCode}`}
                        </span>
                        <span style={{ color: '#64748b', fontSize: '13px' }}>
                            {groupBy === 'ORDER' ? group.productName : group.matName}
                        </span>
                        <div style={{ marginLeft: 'auto', fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>
                            {group.items.length} Kalem
                        </div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.1)' }}>
                                <th style={thTinyStyle}>HAMMADDE</th>
                                <th style={thTinyStyle}>GEREKEN</th>
                                <th style={thTinyStyle}>STOK</th>
                                <th style={thTinyStyle}>KÖPRÜ / YOLDA</th>
                                <th style={thTinyStyle}>DURUM</th>
                            </tr>
                        </thead>
                        <tbody>
                            {group.items.map((item: MrpItem, iIdx: number) => {
                                const isShortage = item.HamStok < item.GerekenMik;
                                return (
                                    <tr key={iIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                        <td style={tdTinyStyle}>
                                            <div style={{ fontWeight: '600' }}>{item.HamAd}</div>
                                            <div style={{ fontSize: '10px', color: '#64748b' }}>{item.HamKod}</div>
                                        </td>
                                        <td style={tdTinyStyle}>{item.GerekenMik.toLocaleString()}</td>
                                        <td style={tdTinyStyle}>{item.HamStok.toLocaleString()}</td>
                                        <td style={tdTinyStyle}>
                                            {item.YoldakiMik > 0 ? (
                                                <div style={{ color: '#facc15', fontSize: '11px' }}>
                                                    <Truck size={12} /> {item.YoldakiMik.toLocaleString()} ({new Date(item.TedarikTarihi!).toLocaleDateString()})
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td style={tdTinyStyle}>
                                            <span style={{ color: isShortage ? '#ef4444' : '#10b981', fontWeight: 'bold', fontSize: '11px' }}>
                                                {isShortage ? `EKSİK: ${(item.GerekenMik - item.HamStok).toLocaleString()}` : 'HAZIR'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

const MiniStatCard = ({ label, value, color }: { label: string, value: any, color: string }) => (
    <div className="glass-card" style={{ padding: '10px 15px', textAlign: 'center' }}>
        <div style={{ fontSize: '10px', color: '#64748b' }}>{label}</div>
        <div style={{ fontSize: '14px', fontWeight: 'bold', color }}>{value}</div>
    </div>
);

const ViewToggleButton = ({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) => (
    <button 
        onClick={onClick}
        style={{ 
            padding: '6px 15px', 
            borderRadius: '8px', 
            border: 'none', 
            background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: active ? '#00f2fe' : '#64748b',
            fontSize: '11px',
            fontWeight: 'bold',
            cursor: 'pointer'
        }}
    >
        {label}
    </button>
);

const FilterButton = ({ active, onClick, label, color = '#fff' }: { active: boolean, onClick: () => void, label: string, color?: string }) => (
  <button 
    onClick={onClick}
    style={{ 
      padding: '5px 15px', 
      borderRadius: '8px', 
      border: 'none', 
      background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
      color: active ? color : '#64748b',
      fontSize: '11px',
      fontWeight: 'bold',
      cursor: 'pointer'
    }}
  >
    {label}
  </button>
);

const thTinyStyle: React.CSSProperties = { padding: '10px 20px', fontSize: '10px', color: '#64748b', borderBottom: '1px solid rgba(255,255,255,0.05)' };
const tdTinyStyle: React.CSSProperties = { padding: '10px 20px', fontSize: '12px', color: '#cbd5e1' };

export default MaterialAnalysis;
