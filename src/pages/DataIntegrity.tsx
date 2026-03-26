import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, CheckCircle2, 
  Search, RefreshCw, 
  PackageSearch, Clock, ClipboardList
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

  const apiBase = 'https://kgmps-production.up.railway.app';

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiBase}/api/production/pre-checks?checkType=${activeSubTab}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      console.log('--- DATA INTEGRITY DEBUG ---', result.debug);
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

  const filteredIssues = issues.filter(issue => {
    const matchesSearch = issue.skod.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        issue.StokAdi.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProses = selectedProses === 'all' || issue.Prosesadi === selectedProses;
    return matchesSearch && matchesProses;
  });

  const uniqueProsesler = Array.from(new Set(issues.map(i => i.Prosesadi).filter(Boolean))) as string[];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0a0f18', color: 'white' }}>
      {/* Sub Header / Stats */}
      <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(30, 41, 59, 0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#f59e0b', padding: '12px', borderRadius: '12px', color: '#000' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Veri Bütünlüğü Kontrolü</h2>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0' }}>Sistemi çalıştırmadan önce düzeltilmesi gereken kritik eksiklikler.</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Toplam Hata</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: issues.length > 0 ? '#ef4444' : '#10b981' }}>{issues.length}</div>
          </div>
          <button 
            onClick={fetchIssues}
            className="pro-button-outline" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px' }}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'infinite-spin' : ''} />
            Yenile
          </button>
        </div>
      </div>

      {/* Control Tabs */}
      <div style={{ padding: '0 24px', display: 'flex', gap: '8px', marginTop: '16px' }}>
        <button 
          onClick={() => setActiveSubTab('MISSING_BOM')}
          style={{
            padding: '12px 20px',
            background: activeSubTab === 'MISSING_BOM' ? 'rgba(37, 99, 235, 0.2)' : 'transparent',
            border: 'none',
            borderBottom: activeSubTab === 'MISSING_BOM' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeSubTab === 'MISSING_BOM' ? '#fff' : '#64748b',
            cursor: 'pointer',
            fontWeight: '600',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <PackageSearch size={18} />
          Model Ağacı Olmayanlar
        </button>
        <button 
          onClick={() => setActiveSubTab('MISSING_TIME')}
          style={{
            padding: '12px 20px',
            background: activeSubTab === 'MISSING_TIME' ? 'rgba(37, 99, 235, 0.2)' : 'transparent',
            border: 'none',
            borderBottom: activeSubTab === 'MISSING_TIME' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeSubTab === 'MISSING_TIME' ? '#fff' : '#64748b',
            cursor: 'pointer',
            fontWeight: '600',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <Clock size={18} />
          Süre Tanımı Olmayanlar
        </button>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '24px', overflow: 'auto' }}>
        {/* Search & Filters */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input 
              type="text" 
              placeholder="Stok kodu veya adıyla ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '12px 12px 12px 40px',
                color: 'white',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          {activeSubTab === 'MISSING_TIME' && (
            <div style={{ width: '200px' }}>
              <select 
                value={selectedProses}
                onChange={(e) => setSelectedProses(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '12px',
                  color: 'white',
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="all">Tüm Prosesler</option>
                {uniqueProsesler.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={40} className="infinite-spin" color="#3b82f6" />
          </div>
        ) : filteredIssues.length === 0 ? (
          <div style={{ 
            height: '300px', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            background: 'rgba(30, 41, 59, 0.2)',
            borderRadius: '24px',
            border: '2px dashed rgba(255,255,255,0.05)'
          }}>
            <CheckCircle2 size={60} color="#10b981" style={{ marginBottom: '20px' }} />
            <h3 style={{ fontSize: '18px', margin: '0 0 4px 0' }}>Sorun Bozukluğu Bulunamadı!</h3>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>Seçilen kategori için tüm veriler sistemde eksiksiz görünüyor.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
            {filteredIssues.map((issue, idx) => (
              <div 
                key={idx}
                className="glass-card"
                style={{ 
                  padding: '16px', 
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <ClipboardList size={14} color="#ef4444" />
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff', letterSpacing: '0.5px' }}>{issue.skod}</span>
                  </div>
                  <div style={{ fontSize: '15px', color: '#cbd5e1', fontWeight: '500' }}>{issue.StokAdi}</div>
                  {issue.Prosesadi && (
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                       <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Proses:</span> {issue.Prosesadi}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                   <div style={{ padding: '4px 10px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '11px', fontWeight: '700' }}>
                      {activeSubTab === 'MISSING_BOM' ? 'Model Ağacı Yok' : 'Süre (< 1)'}
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Diagnostic Footer */}
      {debugInfo && (
        <div style={{ padding: '4px 12px', background: '#0a0f18', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '10px', color: '#475569', textAlign: 'right' }}>
           Bağlı: {debugInfo.server} / {debugInfo.db} (Tenant: {debugInfo.tenantId})
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .infinite-spin {
          animation: spin 2s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
};

export default DataIntegrity;
