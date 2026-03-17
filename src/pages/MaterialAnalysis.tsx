import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  ArrowLeft, RefreshCw, 
  Package, AlertTriangle, CheckCircle2, 
  Truck, Calendar, Search
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
  onBack: () => void;
  onOpenPlanner: () => void;
}

const MaterialAnalysis: React.FC<MaterialAnalysisProps> = ({ tenantId, onBack, onOpenPlanner }) => {
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [mrpData, setMrpData] = useState<MrpItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'CRITICAL' | 'OK'>('ALL');

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
          startDate: '2026-03-01', // Geniş aralık
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

  const filteredData = mrpData.filter(item => {
    const matchesSearch = item.HamAd.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.SipNo.toLowerCase().includes(searchTerm.toLowerCase());
    
    const isCritical = item.HamStok < item.GerekenMik;
    if (filterStatus === 'CRITICAL') return matchesSearch && isCritical;
    if (filterStatus === 'OK') return matchesSearch && !isCritical;
    return matchesSearch;
  });

  const stats = {
    totalItems: mrpData.length,
    criticalCount: mrpData.filter(i => i.HamStok < i.GerekenMik).length,
    okCount: mrpData.filter(i => i.HamStok >= i.GerekenMik).length,
    totalShortage: mrpData.reduce((acc, i) => acc + (i.HamStok < i.GerekenMik ? (i.GerekenMik - i.HamStok) : 0), 0)
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f172a', padding: '20px', overflow: 'hidden' }}>
      {/* Header */}
      <div className="glass-card" style={{ padding: '20px 30px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button onClick={onBack} className="glass-button" style={{ padding: '10px' }}><ArrowLeft size={20} /></button>
          <div>
            <h1 className="neon-text" style={{ fontSize: '24px', margin: 0 }}>Hammadde Değerlendirme & MRP</h1>
            <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Üretim emirleri bazında stok yeterlilik analizi</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '5px 15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <label style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '2px' }}>ANALİZ LOKASYONU</label>
            <select 
              value={selectedLocation} 
              onChange={(e) => setSelectedLocation(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: '#00f2fe', fontWeight: 'bold', outline: 'none', cursor: 'pointer' }}
            >
              {locations.map(loc => <option key={loc} value={loc} style={{ background: '#1e293b' }}>{loc}</option>)}
            </select>
          </div>
          <button onClick={fetchMrpAnalysis} className="glass-button" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Güncelle
          </button>
          <button onClick={onOpenPlanner} className="glass-button" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: '#000', fontWeight: 'bold' }}>
            Planlama Ekranına Git
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '20px' }}>
        <StatCard icon={<Package color="#94a3b8" />} label="Toplam Kalem" value={stats.totalItems} color="#94a3b8" />
        <StatCard icon={<AlertTriangle color="#ef4444" />} label="Kritik Eksik" value={stats.criticalCount} color="#ef4444" subText="Stok Yetersiz" />
        <StatCard icon={<CheckCircle2 color="#10b981" />} label="Stok Tamam" value={stats.okCount} color="#10b981" subText="Üretime Hazır" />
        <StatCard icon={<Truck color="#facc15" />} label="Tonaj Eksik" value={`${stats.totalShortage.toLocaleString()} Birim`} color="#facc15" subText="Toplam Açık" />
      </div>

      {/* Analysis Table */}
      <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '15px' }}>
             <div className="search-box" style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input 
                  className="glass-input" 
                  placeholder="Malzeme veya Sipariş Ara..." 
                  style={{ paddingLeft: '40px', marginBottom: 0, width: '300px' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '4px' }}>
                <FilterButton active={filterStatus === 'ALL'} onClick={() => setFilterStatus('ALL')} label="Tümü" />
                <FilterButton active={filterStatus === 'CRITICAL'} onClick={() => setFilterStatus('CRITICAL')} label="Eksikler" color="#ef4444" />
                <FilterButton active={filterStatus === 'OK'} onClick={() => setFilterStatus('OK')} label="Tamam" color="#10b981" />
             </div>
          </div>
          <div style={{ color: '#64748b', fontSize: '13px' }}>
            {filteredData.length} Kayıt Listeleniyor
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#131c31', zIndex: 10 }}>
              <tr>
                <th style={thStyle}>ÜRETİM EMRİ</th>
                <th style={thStyle}>MAMUL ADI</th>
                <th style={thStyle}>HAMMADDE</th>
                <th style={thStyle}>GEREKEN</th>
                <th style={thStyle}>MEVCUT STOK</th>
                <th style={thStyle}>DURUM</th>
                <th style={thStyle}>TERMİN / YOLDA</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item, idx) => {
                const isShortage = item.HamStok < item.GerekenMik;
                return (
                  <tr key={idx} className="table-row">
                    <td style={tdStyle}><span style={{ color: '#00f2fe', fontWeight: 'bold' }}>{item.SipNo}</span></td>
                    <td style={tdStyle}>{item.UrunAd}</td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: '600' }}>{item.HamAd}</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>{item.HamKod}</div>
                    </td>
                    <td style={tdStyle}>{item.GerekenMik.toLocaleString()}</td>
                    <td style={tdStyle}>{item.HamStok.toLocaleString()}</td>
                    <td style={tdStyle}>
                      <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: '20px', 
                        fontSize: '11px', 
                        fontWeight: 'bold',
                        background: isShortage ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        color: isShortage ? '#ef4444' : '#10b981',
                        border: `1px solid ${isShortage ? '#ef444444' : '#10b98144'}`
                      }}>
                        {isShortage ? 'EKSİK' : 'TAMAM'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {item.TedarikTarihi ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '11px', color: '#facc15', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12} /> {new Date(item.TedarikTarihi).toLocaleDateString()}
                          </span>
                          <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                            <Truck size={10} /> {item.YoldakiMik} Yolda
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: '#475569', fontSize: '11px' }}>Termin Yok</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .table-row:hover { background: rgba(255,255,255,0.02); }
        th { text-transform: uppercase; letter-spacing: 0.5px; }
      `}</style>
    </div>
  );
};

const StatCard = ({ icon, label, value, color, subText }: { icon: any, label: string, value: any, color: string, subText?: string }) => (
  <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
    <div style={{ background: `${color}11`, padding: '12px', borderRadius: '12px' }}>{icon}</div>
    <div>
      <div style={{ fontSize: '12px', color: '#64748b' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>{value}</div>
      {subText && <div style={{ fontSize: '10px', color: `${color}aa` }}>{subText}</div>}
    </div>
  </div>
);

const FilterButton = ({ active, onClick, label, color = '#fff' }: { active: boolean, onClick: () => void, label: string, color?: string }) => (
  <button 
    onClick={onClick}
    style={{ 
      padding: '6px 15px', 
      borderRadius: '8px', 
      border: 'none', 
      background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
      color: active ? color : '#64748b',
      fontSize: '12px',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'all 0.2s'
    }}
  >
    {label}
  </button>
);

const thStyle: React.CSSProperties = { padding: '15px 20px', fontSize: '11px', color: '#64748b', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)' };
const tdStyle: React.CSSProperties = { padding: '15px 20px', fontSize: '13px', color: '#cbd5e1', borderBottom: '1px solid rgba(255,255,255,0.05)' };

export default MaterialAnalysis;
