import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { 
  RefreshCw, Search, 
  LayoutGrid, Boxes, AlertCircle, Settings2, Filter, Database
} from 'lucide-react';
import '../styles/professional.css';

interface Location {
  id: any;
  name: string;
}

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

const MaterialAnalysis: React.FC<MaterialAnalysisProps> = ({ tenantId: _tenantId }) => {
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  
  // Parametreler
  const [mrpLocation, setMrpLocation] = useState('');
  const [marketingLocation, setMarketingLocation] = useState('');
  
  const [mrpData, setMrpData] = useState<MrpItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'CRITICAL' | 'OK'>('ALL');
  const [groupBy, setGroupBy] = useState<'ORDER' | 'MATERIAL'>('ORDER');
  const [error, setError] = useState<string | null>(null);

  const isLocal = window.location.hostname === 'localhost';
  const isGithub = window.location.hostname.includes('github.io');
  const apiBase = (isLocal || isGithub) 
    ? 'https://kgmps-production.up.railway.app' 
    : window.location.origin;

  const fetchLocations = async () => {
    const url = `${apiBase}/api/locations`;
    const token = localStorage.getItem('token');
    
    console.log(`[DEBUG] İstek gönderiliyor: ${url}`);
    console.log(`[DEBUG] Token durumu: ${token ? 'Mevcut (Giriş yapılmış)' : 'YOK (Giriş yapılmamış!)'}`);
    
    if (!token) {
      setError("Oturumunuz sona ermiş. Lütfen tekrar giriş yapın (401 - Token Missing).");
      return;
    }

    try {
      const res = await axios.get(url, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      console.log(`[DEBUG] Başarılı! Lokasyonlar:`, res.data);
      setLocations(res.data);
      if (res.data.length > 0) {
        setMrpLocation(res.data[0].name);
        setMarketingLocation(res.data[0].name);
      }
    } catch (err: any) {
      console.error(`[DEBUG] İstek HATASI:`, err.response || err);
      const hostMsg = window.location.hostname.includes('github.io') ? " (GitHub Pages -> Railway)" : "";
      setError(`Erişim Sorunu: ${err.response?.status === 401 ? 'Giriş Yetkisi Hatası (401)' : err.message}${hostMsg}`);
    }
  };

  const fetchMrpAnalysis = useCallback(async () => {
    if (!mrpLocation) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${apiBase}/api/production/mrp`, {
        params: { location: mrpLocation },
        headers: { Authorization: `Bearer ${token}` }
      });
      setMrpData(res.data);
    } catch (err: any) {
      setError(`MRP verisi çekilemedi: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  }, [mrpLocation]);

  useEffect(() => { fetchLocations(); }, []);
  useEffect(() => { if (mrpLocation) fetchMrpAnalysis(); }, [mrpLocation, fetchMrpAnalysis]);

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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc', overflow: 'hidden' }}>
      
      {/* 1. PARAMETRE PANELİ (Üst Alan) */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '16px 24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <Settings2 size={16} color="#475569" />
            <span style={{ fontWeight: '700', fontSize: '13px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rapor Parametreleri / Lokasyon Seçimleri</span>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            {/* MRP Lokasyon */}
            <div className="param-item">
                <label style={paramLabelStyle}><Database size={12} style={{marginRight: '6px'}} /> Stok & Tedarik Lokasyonu</label>
                <select className="pro-input" style={paramInputStyle} value={mrpLocation} onChange={(e) => setMrpLocation(e.target.value)}>
                    {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                </select>
            </div>

            {/* Pazarlama Lokasyon */}
            <div className="param-item">
                <label style={paramLabelStyle}><Filter size={12} style={{marginRight: '6px'}} /> Pazarlama Siparişleri</label>
                <select className="pro-input" style={paramInputStyle} value={marketingLocation} onChange={(e) => setMarketingLocation(e.target.value)}>
                    {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                </select>
            </div>

            {/* Grup Seçimi */}
            <div className="param-item">
                <label style={paramLabelStyle}>Görünüm Gruplama</label>
                <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
                    <button 
                        onClick={() => setGroupBy('ORDER')} 
                        style={groupBy === 'ORDER' ? activeTabStyle : inactiveTabStyle}
                    >Sipariş</button>
                    <button 
                        onClick={() => setGroupBy('MATERIAL')} 
                        style={groupBy === 'MATERIAL' ? activeTabStyle : inactiveTabStyle}
                    >Hammadde</button>
                </div>
            </div>
        </div>
      </div>

      {/* 2. RAPOR ALANI */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', overflow: 'hidden' }}>
        
        {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', padding: '12px 20px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertCircle size={18} /> {error}
            </div>
        )}

        <div className="pro-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Rapor Header (Filtreler & İstatistikler) */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input className="pro-input" placeholder="Sonuçlarda ara..." style={{ paddingLeft: '36px', width: '250px' }} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <FilterBtn active={filterStatus === 'ALL'} onClick={() => setFilterStatus('ALL')} label="Tümü" />
                    <FilterBtn active={filterStatus === 'CRITICAL'} onClick={() => setFilterStatus('CRITICAL')} label="Kritik (Eksik)" color="#ef4444" />
                </div>
            </div>

            <div style={{ display: 'flex', gap: '24px' }}>
                <MiniStat label="Kritik Eksik" value={stats.criticalCount} color="#ef4444" />
                <MiniStat label="Hazır" value={stats.okCount} color="#10b981" />
                <button onClick={fetchMrpAnalysis} className="pro-button" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Raporu Güncelle
                </button>
            </div>
          </div>

          {/* Rapor İçeriği (Table) */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {processedData.length === 0 && !loading ? (
                 <div style={{ padding: '80px', textAlign: 'center', color: '#64748b' }}>
                    <Database size={40} style={{ margin: '0 auto 15px', opacity: 0.3 }} />
                    <p>Seçilen lokasyon için gösterilecek veri bulunamadı.</p>
                 </div>
            ) : (
                processedData.map((group: any, idx: number) => (
                    <div key={idx} style={{ marginBottom: '1px' }}>
                      <div style={{ padding: '10px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {groupBy === 'ORDER' ? <LayoutGrid size={14} color="#3b82f6" /> : <Boxes size={14} color="#f59e0b" />}
                        <span style={{ fontWeight: '700', fontSize: '13px' }}>{groupBy === 'ORDER' ? `Sipariş: ${group.orderNo}` : `Malzeme: ${group.matCode}`}</span>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>{groupBy === 'ORDER' ? group.productName : group.matName}</span>
                      </div>
                      <table className="pro-table">
                        <thead>
                          <tr>
                            <th>Hammadde / Bileşen</th>
                            <th>Gereken</th>
                            <th>Stok</th>
                            <th>Açık Mik.</th>
                            <th>Durum</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.items.map((item: MrpItem, iIdx: number) => {
                            const isShortage = item.HamStok < item.GerekenMik;
                            return (
                              <tr key={iIdx}>
                                <td>
                                  <div style={{ fontWeight: '600' }}>{item.HamAd}</div>
                                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.HamKod}</div>
                                </td>
                                <td>{item.GerekenMik.toLocaleString()}</td>
                                <td>{item.HamStok.toLocaleString()}</td>
                                <td style={{ color: isShortage ? '#dc2626' : 'inherit', fontWeight: isShortage ? '700' : 'normal' }}>
                                  {isShortage ? (item.GerekenMik - item.HamStok).toLocaleString() : '0'}
                                </td>
                                <td>
                                  <span className={`pro-badge ${isShortage ? 'pro-badge-error' : 'pro-badge-success'}`}>
                                    {isShortage ? 'EKSİK' : 'OK'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Alt Bileşenler ve Stiller ---

const paramLabelStyle: React.CSSProperties = { fontSize: '11px', fontWeight: '800', color: '#64748b', display: 'flex', alignItems: 'center', marginBottom: '6px', textTransform: 'uppercase' };
const paramInputStyle: React.CSSProperties = { border: '1px solid #cbd5e1', padding: '8px 12px', fontSize: '13px', width: '100%', fontWeight: '600' };

const activeTabStyle: React.CSSProperties = { flex: 1, padding: '6px', border: 'none', background: '#fff', borderRadius: '6px', fontSize: '12px', fontWeight: '700', color: '#2563eb', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' };
const inactiveTabStyle: React.CSSProperties = { flex: 1, padding: '6px', border: 'none', background: 'transparent', fontSize: '12px', fontWeight: '600', color: '#64748b', cursor: 'pointer' };

const MiniStat = ({ label, value, color }: { label: string, value: any, color: string }) => (
    <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: '14px', fontWeight: '800', color }}>{value}</div>
    </div>
);

const FilterBtn = ({ active, onClick, label, color = '#2563eb' }: { active: boolean, onClick: () => void, label: string, color?: string }) => (
    <button onClick={onClick} style={{ padding: '4px 12px', borderRadius: '6px', border: active ? `1px solid ${color}` : '1px solid #e2e8f0', background: active ? `${color}11` : '#fff', color: active ? color : '#64748b', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
      {label}
    </button>
);

export default MaterialAnalysis;
