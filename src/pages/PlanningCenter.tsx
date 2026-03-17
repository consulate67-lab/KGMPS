import { useState } from 'react';
import { 
  ArrowLeft, Activity, 
  Package, TrendingUp, Settings 
} from 'lucide-react';
import MaterialAnalysis from './MaterialAnalysis';
import MpsPlanner from './MpsPlanner';
import '../styles/glass.css';

interface PlanningCenterProps {
  tenantId: number | null;
  onBack: () => void;
}

const PlanningCenter: React.FC<PlanningCenterProps> = ({ tenantId, onBack }) => {
  const [activeTab, setActiveTab] = useState<'MRP' | 'GANTT' | 'KPI'>('MRP');

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f172a', overflow: 'hidden' }}>
      {/* Top Main Nav */}
      <div style={{ 
        background: 'rgba(30, 41, 59, 0.7)', 
        borderBottom: '1px solid rgba(255,255,255,0.05)', 
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button onClick={onBack} className="glass-button" style={{ padding: '8px' }}><ArrowLeft size={18} /></button>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>PLANLAMA MERKEZİ</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>v2.0 Beta</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '12px' }}>
          <TabButton 
            active={activeTab === 'MRP'} 
            onClick={() => setActiveTab('MRP')} 
            icon={<Package size={16} />} 
            label="Hammadde Değerlendirme & MRP" 
          />
          <TabButton 
            active={activeTab === 'GANTT'} 
            onClick={() => setActiveTab('GANTT')} 
            icon={<Activity size={16} />} 
            label="Üretim Çizelgeleme (Gantt)" 
          />
          <TabButton 
            active={activeTab === 'KPI'} 
            onClick={() => setActiveTab('KPI')} 
            icon={<TrendingUp size={16} />} 
            label="Performans (KPI)" 
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
             <button className="glass-button" style={{ padding: '8px' }} title="Ayarlar"><Settings size={18} /></button>
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
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
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="glass-card" style={{ padding: '60px', textAlign: 'center' }}>
              <TrendingUp size={60} color="#64748b" style={{ marginBottom: '20px' }} />
              <h3 style={{ color: '#fff', fontSize: '24px', margin: '0 0 10px 0' }}>KPI Dashboard</h3>
              <p style={{ color: '#64748b' }}>Performans metrikleri ve OEE analizleri yakında eklenecek.</p>
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
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 20px',
      borderRadius: '8px',
      border: 'none',
      background: active ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' : 'transparent',
      color: active ? '#000' : '#94a3b8',
      fontWeight: '600',
      fontSize: '13px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: active ? '0 4px 15px rgba(0, 242, 254, 0.2)' : 'none'
    }}
  >
    {icon}
    {label}
  </button>
);

export default PlanningCenter;
