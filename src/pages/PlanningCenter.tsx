import { useState } from 'react';
import { 
  ArrowLeft, Activity, 
  Package, TrendingUp, Settings,
  LogOut, ClipboardList
} from 'lucide-react';
import MaterialAnalysis from './MaterialAnalysis';
import MpsPlanner from './MpsPlanner';
import DataIntegrity from './DataIntegrity';
import '../styles/professional.css';

interface PlanningCenterProps {
  tenantId: number | null;
  onBack: () => void;
}

const PlanningCenter: React.FC<PlanningCenterProps> = ({ tenantId, onBack }) => {
  const [activeTab, setActiveTab] = useState<'MRP' | 'GANTT' | 'KPI' | 'CHECKS'>('CHECKS');

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0f18', overflow: 'hidden' }}>
      {/* Top Main Nav */}
      <div style={{ 
        background: '#0f172a', 
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: 'white',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <button onClick={onBack} title="Geri Dön" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '0.5px' }}>PLANLAMA MERKEZİ</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Üretim ve Malzeme Yönetim Paneli</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '12px' }}>
          <TabButton 
            active={activeTab === 'CHECKS'} 
            onClick={() => setActiveTab('CHECKS')} 
            icon={<ClipboardList size={16} />} 
            label="Veri Kontrol" 
          />
          <TabButton 
            active={activeTab === 'MRP'} 
            onClick={() => setActiveTab('MRP')} 
            icon={<Package size={16} />} 
            label="Hammadde & MRP" 
          />
          <TabButton 
            active={activeTab === 'GANTT'} 
            onClick={() => setActiveTab('GANTT')} 
            icon={<Activity size={16} />} 
            label="Üretim Çizelgeleme" 
          />
          <TabButton 
            active={activeTab === 'KPI'} 
            onClick={() => setActiveTab('KPI')} 
            icon={<TrendingUp size={16} />} 
            label="Analitik & OEE" 
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
             <button style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><Settings size={20} /></button>
             <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }} />
             <div style={{ textAlign: 'right', display: 'none' }}>
                <div style={{ fontSize: '12px', fontWeight: '600' }}>Selim Yılmaz</div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>Admin</div>
             </div>
             <button onClick={onBack} className="pro-button" style={{ padding: '8px 12px', background: '#ef4444', display: 'flex', gap: '8px' }}>
                <LogOut size={16} /> Çıkış
             </button>
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {activeTab === 'CHECKS' && (
          <DataIntegrity 
            tenantId={tenantId} 
          />
        )}

        {activeTab === 'MRP' && (
          <MaterialAnalysis 
            tenantId={tenantId} 
          />
        )}
        
        {activeTab === 'GANTT' && (
          <MpsPlanner 
            tenantId={tenantId} 
            onBack={() => setActiveTab('MRP')} 
          />
        )}

        {activeTab === 'KPI' && (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
            <div style={{ textAlign: 'center', maxWidth: '400px' }}>
              <div style={{ width: '80px', height: '80px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                <TrendingUp size={40} color="#64748b" />
              </div>
              <h3 style={{ color: '#0f172a', fontSize: '24px', margin: '0 0 10px 0' }}>KPI Dashboard</h3>
              <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6' }}>
                Üretim performans verileri, makine duruş analizleri ve OEE metrikleri bu alanda listelenecek.
              </p>
              <button className="pro-button" style={{ marginTop: '20px' }}>Verileri Yenile</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) => (
  <button 
    onClick={onClick}
    className={active ? '' : 'pro-button-outline'}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 20px',
      borderRadius: '8px',
      border: 'none',
      background: active ? '#2563eb' : 'transparent',
      color: active ? '#fff' : '#94a3b8',
      fontWeight: '600',
      fontSize: '13px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }}
  >
    {icon}
    {label}
  </button>
);

export default PlanningCenter;
