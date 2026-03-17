import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { 
  RefreshCw, Truck, Search, 
  LayoutGrid, Boxes, AlertCircle
} from 'lucide-react';
import '../styles/professional.css';

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
  const [locations, setLocations] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [mrpData, setMrpData] = useState<MrpItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'CRITICAL' | 'OK'>('ALL');
  const [groupBy, setGroupBy] = useState<'ORDER' | 'MATERIAL'>('ORDER');
  const [error, setError] = useState<string | null>(null);

  const apiBase = 'https://kgmps-production.up.railway.app';

  const fetchLocations = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      console.log('Fetching locations with token:', token ? 'Exists' : 'Missing');
      const res = await axios.get(`${apiBase}/api/locations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Locations received:', res.data);
      setLocations(res.data);
      if (res.data.length > 0) {
        setSelectedLocation(res.data[0]);
      } else {
        setError('Lokasyon bulunamadı. Lütfen veritabanınızı kontrol edin.');
      }
    } catch (err: any) {
      console.error("Lokasyonlar çekilemedi:", err);
      setError(`Bağlantı hatası: ${err.response?.data?.error || err.message}`);
    }
  };

  const fetchMrpAnalysis = useCallback(async () => {
    if (!selectedLocation) return;
    setLoading(true);
    setError(null);
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
      console.log('MRP data received:', res.data.length, 'records');
    } catch (err: any) {
      console.error("MRP Analizi başarısız:", err);
      setError(`Veri çekilemedi: ${err.response?.data?.error || err.message}`);
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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '24px', overflow: 'hidden' }}>
      {/* Search & Feedback Area */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', padding: '12px 20px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
          <AlertCircle size={18} /> {error}
          <button onClick={fetchLocations} className="pro-button" style={{ marginLeft: 'auto', padding: '4px 12px', fontSize: '12px' }}>Yeniden Dene</button>
        </div>
      )}

      {/* Control Panel */}
      <div className="pro-card" style={{ padding: '16px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', display: 'block', marginBottom: '4px' }}>LOKASYON / DEPO</label>
            <select 
              className="pro-input"
              style={{ width: '180px', padding: '6px 12px', fontWeight: '600' }}
              value={selectedLocation} 
              onChange={(e) => setSelectedLocation(e.target.value)}
            >
              {locations.length === 0 && <option value="">Yükleniyor...</option>}
              {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>
          </div>

          <div style={{ width: '1px', height: '32px', background: '#e2e8f0' }} />

          <div style={{ display: 'flex', gap: '8px' }}>
            <ViewTab active={groupBy === 'ORDER'} onClick={() => setGroupBy('ORDER')} icon={<LayoutGrid size={14} />} label="Sipariş Bazlı" />
            <ViewTab active={groupBy === 'MATERIAL'} onClick={() => setGroupBy('MATERIAL')} icon={<Boxes size={14} />} label="Hammadde Bazlı" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <MiniStatCard label="Eksik" value={stats.criticalCount} color="#ef4444" />
          <MiniStatCard label="Tamam" value={stats.okCount} color="#10b981" />
          <MiniStatCard label="Açık" value={stats.totalShortage.toLocaleString()} color="#f59e0b" />
          <button onClick={fetchMrpAnalysis} className="pro-button" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px' }}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Güncelle
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="pro-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              className="pro-input" 
              placeholder="Sipariş veya Malzeme Ara..." 
              style={{ paddingLeft: '36px', width: '300px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <FilterBtn active={filterStatus === 'ALL'} onClick={() => setFilterStatus('ALL')} label="Tümü" />
            <FilterBtn active={filterStatus === 'CRITICAL'} onClick={() => setFilterStatus('CRITICAL')} label="Kritik Eksikler" color="#ef4444" />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {processedData.length === 0 && !loading && (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
              <Search size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
              <div>Kayıt bulunamadı. Lütfen lokasyon seçin veya aramayı değiştirin.</div>
            </div>
          )}
          
          {processedData.map((group: any, idx: number) => (
            <div key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ padding: '12px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                {groupBy === 'ORDER' ? <LayoutGrid size={16} color="#3b82f6" /> : <Boxes size={16} color="#f59e0b" />}
                <span style={{ fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>
                  {groupBy === 'ORDER' ? `Sipariş: ${group.orderNo}` : `Malzeme: ${group.matCode}`}
                </span>
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  {groupBy === 'ORDER' ? group.productName : group.matName}
                </span>
                <div style={{ marginLeft: 'auto', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
                  {group.items.length} Kalem
                </div>
              </div>
              <table className="pro-table">
                <thead>
                  <tr>
                    <th>Hammadde</th>
                    <th>Gereken</th>
                    <th>Stok</th>
                    <th>Açık</th>
                    <th>Durum</th>
                    <th>Tedarik / Yolda</th>
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
                        <td>
                          {item.YoldakiMik > 0 ? (
                            <div style={{ fontSize: '12px' }}>
                              <div style={{ color: '#0369a1', fontWeight: '600' }}>
                                <Truck size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                {item.YoldakiMik.toLocaleString()} Bekliyor
                              </div>
                              <div style={{ color: '#64748b', fontSize: '10px' }}>
                                Termin: {new Date(item.TedarikTarihi!).toLocaleDateString()}
                              </div>
                            </div>
                          ) : <span style={{ color: '#cbd5e1' }}>-</span>}
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

const ViewTab = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) => (
  <button 
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '6px', border: 'none',
      background: active ? '#fff' : 'transparent', color: active ? '#2563eb' : '#64748b',
      boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: '600', fontSize: '13px', cursor: 'pointer'
    }}
  >
    {icon} {label}
  </button>
);

const MiniStatCard = ({ label, value, color }: { label: string, value: any, color: string }) => (
  <div style={{ padding: '0 16px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>{label}</div>
    <div style={{ fontSize: '16px', fontWeight: '800', color }}>{value}</div>
  </div>
);

const FilterBtn = ({ active, onClick, label, color = '#2563eb' }: { active: boolean, onClick: () => void, label: string, color?: string }) => (
  <button 
    onClick={onClick}
    style={{
      padding: '4px 16px', borderRadius: '6px', border: active ? `1px solid ${color}` : '1px solid #e2e8f0',
      background: active ? `${color}11` : '#fff', color: active ? color : '#64748b',
      fontWeight: '700', fontSize: '12px', cursor: 'pointer'
    }}
  >
    {label}
  </button>
);

export default MaterialAnalysis;
