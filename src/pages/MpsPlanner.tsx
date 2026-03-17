import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  ArrowLeft, RefreshCw, Save, History, 
  ChevronRight, ChevronLeft, 
  LayoutGrid, Zap, 
  Droplet, Hammer, Clock
} from 'lucide-react';
import '../styles/glass.css';

interface Machine {
  id: string;
  name: string;
  type: string;
  status: 'Working' | 'Maintenance' | 'Idle';
}

interface ProductionOrder {
  id: string;
  workOrderNo: string;
  productName: string;
  machineId: string;
  startTime: string; 
  endTime: string;   
  cavityCount: number;
  cycleTime: number; 
  setupTime: number; 
  orderQty: number; // Üretilecek toplam adet
  progress: number;
  color: string;
  materials: MaterialStatus[];
}

interface MaterialStatus {
  id: string;
  name: string;
  required: number;
  stock: number;
  procurementDate?: string; // Satınalma Termin Tarihi
  incomingQty?: number; // Yoldaki Miktar
}

interface RevisionLog {
  id: number;
  userName: string;
  action: string;
  timestamp: string;
  details: string;
}

const INJECTION_MACHINES: Machine[] = [
  { id: 'M1', name: 'ENJ-01 (150T)', type: 'Injection', status: 'Working' },
  { id: 'M2', name: 'ENJ-02 (200T)', type: 'Injection', status: 'Working' },
  { id: 'M3', name: 'ENJ-03 (250T)', type: 'Injection', status: 'Maintenance' },
  { id: 'M4', name: 'HAVA-01', type: 'Air Press', status: 'Idle' },
  { id: 'M5', name: 'MONTAJ-01', type: 'Assembly', status: 'Working' },
];

const INITIAL_ORDERS: ProductionOrder[] = [
  { 
    id: '1', workOrderNo: 'EM-5001', productName: 'CABANI-Base-XL', 
    machineId: 'M1', startTime: '2026-03-17T08:00:00', endTime: '2026-03-17T12:00:00',
    cavityCount: 4, cycleTime: 45, setupTime: 30, orderQty: 1200,
    progress: 45, color: '#00f2fe',
    materials: [
      { id: 'H1', name: 'PVC-White-01', required: 450, stock: 1200 },
      { id: 'H2', name: 'PVC-Clear-05', required: 50, stock: 20, procurementDate: '2026-03-20', incomingQty: 100 }
    ]
  },
  { 
    id: '2', workOrderNo: 'EM-5002', productName: 'CABANI-Sport-Sole', 
    machineId: 'M2', startTime: '2026-03-17T09:30:00', endTime: '2026-03-17T14:30:00',
    cavityCount: 2, cycleTime: 60, setupTime: 45, orderQty: 300,
    progress: 15, color: '#f093fb',
    materials: [
      { id: 'H1', name: 'TPU-Red-A', required: 200, stock: 500 },
      { id: 'H2', name: 'Adhesive-X', required: 10, stock: 100 }
    ]
  },
  { 
    id: '3', workOrderNo: 'EM-5045', productName: 'Heel-Support-S3', 
    machineId: 'M1', startTime: '2026-03-17T12:30:00', endTime: '2026-03-17T18:00:00',
    cavityCount: 8, cycleTime: 30, setupTime: 20, orderQty: 5000,
    progress: 0, color: '#4facfe',
    materials: [
      { id: 'H1', name: 'PP-Grey-Base', required: 600, stock: 100, procurementDate: '2026-03-18', incomingQty: 1000 }
    ]
  }
];

const REVISION_HISTORY: RevisionLog[] = [
  { id: 1, userName: 'selimkorgun', action: 'Drag-Drop', timestamp: '12:45', details: 'EM-5001 M1 -> M2 makinesine taşındı.' },
  { id: 2, userName: 'selimkorgun', action: 'Manual Edit', timestamp: '11:20', details: 'EM-5002 Hazırlık süresi 30dk -> 45dk güncellendi.' }
];

const TimeHeader = ({ hours }: { hours: number[] }) => (
  <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.1)' }}>
    <div style={{ width: '180px', flexShrink: 0, padding: '10px 20px', fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>İş Merkezi / Makine</div>
    {hours.map(h => (
      <div key={h} style={{ flex: 1, minWidth: '100px', padding: '10px', textAlign: 'center', borderLeft: '1px solid var(--glass-border)', fontSize: '11px', color: '#94a3b8' }}>{h}:00</div>
    ))}
  </div>
);

const MachineRow = ({ 
  machine, 
  orders, 
  onSelect, 
  onDrop 
}: { 
  machine: Machine, 
  orders: ProductionOrder[], 
  onSelect: (o: ProductionOrder) => void,
  onDrop: (orderId: string, machineId: string, newTime: Date) => void
}) => {
  const isMaintenance = machine.status === 'Maintenance';
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropLocal = (e: React.DragEvent) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData('orderId');
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - 180; // Makine adı genişliğini çıkar
    
    if (x < 0) return;

    // Her 100px = 60dk (1 saat)
    const minutesFromStart = (x / 100) * 60;
    const newStart = new Date('2026-03-17T08:00:00');
    newStart.setMinutes(newStart.getMinutes() + minutesFromStart);
    
    onDrop(orderId, machine.id, newStart);
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDrop={handleDropLocal}
      style={{ display: 'flex', height: '80px', borderBottom: '1px solid var(--glass-border)', position: 'relative' }}
    >
      <div style={{ width: '180px', flexShrink: 0, padding: '10px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: isMaintenance ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>{machine.name}</div>
        <div style={{ fontSize: '10px', color: isMaintenance ? '#ef4444' : '#64748b' }}>{isMaintenance ? 'BAKIMDA' : machine.type}</div>
      </div>
      <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
        {Array.from({ length: 12 }).map((_, i) => (<div key={i} style={{ flex: 1, minWidth: '100px', borderLeft: '1px solid rgba(255,255,255,0.03)' }}></div>))}
        {isMaintenance && (<div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.1) 10px, rgba(239, 68, 68, 0.05) 10px, rgba(239, 68, 68, 0.05) 20px)', zIndex: 1 }} />)}
        {orders.map(o => {
          const startH = new Date(o.startTime).getHours();
          const startM = new Date(o.startTime).getMinutes();
          const durationM = (new Date(o.endTime).getTime() - new Date(o.startTime).getTime()) / 60000;
          const leftOffset = ((startH - 8) * 100) + (startM * (100 / 60));
          const width = durationM * (100 / 60);
          
          return (
            <div 
              key={o.id} 
              draggable
              onDragStart={(e) => e.dataTransfer.setData('orderId', o.id)}
              onClick={() => onSelect(o)} 
              style={{ 
                position: 'absolute', 
                left: `${leftOffset}px`, 
                top: '12px', 
                width: `${width}px`, 
                height: '56px', 
                borderRadius: '8px', 
                background: `linear-gradient(135deg, ${o.color}22, ${o.color}44)`, 
                border: `1px solid ${o.color}66`, 
                backdropFilter: 'blur(10px)', 
                cursor: 'grab', 
                padding: '8px', 
                zIndex: 5, 
                transition: 'all 0.2s', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between', 
                boxShadow: `0 4px 15px ${o.color}11` 
              }} 
              className="planner-task-bar"
            >
              <div style={{ fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.workOrderNo} | {o.productName}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}><div style={{ width: `${o.progress}%`, height: '100%', background: o.color }} /></div>
                 <span style={{ fontSize: '9px', color: '#94a3b8' }}>{o.progress}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MpsPlanner = ({ onBack, tenantId }: { onBack: () => void, tenantId: number | null }) => {
  const [orders, setOrders] = useState<ProductionOrder[]>(INITIAL_ORDERS);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [scale, setScale] = useState(100);
  const [locations, setLocations] = useState<string[]>(['CA001', 'CA002']);
  const [selectedLocation, setSelectedLocation] = useState('CA001');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const token = localStorage.getItem('token');
        const apiBase = 'https://kgmps-production.up.railway.app';
        const res = await axios.get(`${apiBase}/api/locations`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.length > 0) {
           setLocations(res.data);
           setSelectedLocation(res.data[0]);
        }
      } catch (err) {
        console.error("Lokasyonlar yüklenemedi:", err);
      }
    };
    if (tenantId) fetchLocations();
  }, [tenantId]);

  const fetchMRP = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const apiBase = 'https://kgmps-production.up.railway.app';
      const res = await axios.get(`${apiBase}/api/production/mrp`, {
        params: {
          location: selectedLocation,
          startDate: '2026-03-17',
          endDate: '2026-03-31'
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      interface MrpResponseItem {
        SipNo: string;
        SipHarinx: number;
        UrunAd: string;
        HamKod: string;
        HamAd: string;
        GerekenMik: number;
        HamStok: number;
        TedarikTarihi: string;
        YoldakiMik: number;
      }

      const mappedOrders: ProductionOrder[] = (res.data as MrpResponseItem[]).reduce((acc: ProductionOrder[], item: MrpResponseItem) => {
        let order = acc.find(o => o.workOrderNo === item.SipNo);
        if (!order) {
          order = {
            id: item.SipHarinx.toString(),
            workOrderNo: item.SipNo,
            productName: item.UrunAd,
            machineId: 'M1',
            startTime: '2026-03-17T08:00:00',
            endTime: '2026-03-17T12:00:00',
            cavityCount: 4,
            cycleTime: 45,
            setupTime: 30,
            orderQty: 1000,
            progress: 0,
            color: '#4facfe',
            materials: []
          };
          acc.push(order);
        }
        order.materials.push({
          id: item.HamKod,
          name: item.HamAd,
          required: item.GerekenMik,
          stock: item.HamStok,
          procurementDate: item.TedarikTarihi ? new Date(item.TedarikTarihi).toLocaleDateString() : undefined,
          incomingQty: item.YoldakiMik
        });
        return acc;
      }, []);

      if (mappedOrders.length > 0) setOrders(mappedOrders);
    } catch (err) {
      console.error("MRP verisi yüklenemedi:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedLocation]);

  const calculateAndUpdateDuration = (order: ProductionOrder, updates: Partial<ProductionOrder>) => {
    const updated = { ...order, ...updates };
    // Miktar / Göz Sayısı = Çevrim Sayısı
    // Çevrim Sayısı * Çevrim Süresi (sn) / 60 = Üretim Süresi (dk)
    // Üretim Süresi + Hazırlık Süresi (dk) = Toplam Süre
    const productionMinutes = (updated.orderQty / Math.max(1, updated.cavityCount)) * (updated.cycleTime / 60);
    const totalMinutes = updated.setupTime + productionMinutes;
    
    const start = new Date(updated.startTime);
    const end = new Date(start.getTime() + totalMinutes * 60000);
    
    const finalOrder = { ...updated, endTime: end.toISOString() };
    
    setOrders(prev => prev.map(o => o.id === order.id ? finalOrder : o));
    setSelectedOrder(finalOrder);
  };

  const handleOrderMove = (orderId: string, machineId: string, newStartTime: Date) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Süreyi koru, sadece başlangıcı değiştir (endTime otomatik hesaplanır)
    const durationMs = new Date(order.endTime).getTime() - new Date(order.startTime).getTime();
    const newEndTime = new Date(newStartTime.getTime() + durationMs);

    const updatedOrder = {
      ...order,
      machineId,
      startTime: newStartTime.toISOString(),
      endTime: newEndTime.toISOString()
    };

    setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
    
    // Log ekle
    const newLog: RevisionLog = {
      id: Date.now(),
      userName: 'selimkorgun',
      action: 'Drag-Drop Move',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      details: `${order.workOrderNo} planı taşındı (${machineId}).`
    };
    // Normal şartlarda bu bir state'e eklenir, log dizisine push ediyoruz simülasyon için
    REVISION_HISTORY.unshift(newLog);
  };

  useEffect(() => {
    if (tenantId && selectedLocation) fetchMRP();
  }, [tenantId, selectedLocation, fetchMRP]);

  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0f172a' }}>
      <div className="glass-card" style={{ margin: '15px', padding: '12px 25px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button onClick={onBack} className="glass-button" style={{ padding: '8px' }}><ArrowLeft size={18} /></button>
          <div>
             <h2 className="neon-text" style={{ fontSize: '18px', margin: 0 }}>Gantt Planlama Pro / Cabani Kundura</h2>
             <div style={{ fontSize: '10px', color: '#64748b', display: 'flex', gap: '15px', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <LayoutGrid size={12} />
                  Lokasyon: 
                  <select 
                    value={selectedLocation} 
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: '#00f2fe', fontSize: '10px', fontWeight: 'bold', outline: 'none', cursor: 'pointer' }}
                  >
                    {locations.map(loc => <option key={loc} value={loc} style={{ background: '#0f172a' }}>{loc}</option>)}
                  </select>
                </span>
                <span>Vardiya: Gündüz (08:00 - 20:00)</span>
                <span style={{ color: '#10b981' }}>● Bağlantı: AKTİF</span>
             </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
           <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '4px' }}>
              <button onClick={() => setScale(s => Math.max(70, s-10))} className="glass-button" style={{ padding: '4px', background: 'transparent', boxShadow: 'none' }}><ChevronLeft size={14}/></button>
              <span style={{ padding: '0 8px', fontSize: '11px', color: '#94a3b8', alignSelf: 'center' }}>% {scale}</span>
              <button onClick={() => setScale(s => Math.min(150, s+10))} className="glass-button" style={{ padding: '4px', background: 'transparent', boxShadow: 'none' }}><ChevronRight size={14}/></button>
           </div>
           <button className="glass-button" style={{ background: 'rgba(79, 172, 254, 0.15)', gap: '8px', display: 'flex' }}><RefreshCw size={16} /> ÇİZELGELE</button>
           <button onClick={() => setShowHistory(!showHistory)} className="glass-button" style={{ background: showHistory ? 'rgba(240, 147, 251, 0.2)' : 'rgba(255,255,255,0.05)', gap: '8px', display: 'flex' }}><History size={16} /> LOG</button>
           <button className="glass-button" style={{ background: 'linear-gradient(135deg, #059669, #10b981)', gap: '8px', display: 'flex' }}><Save size={16} /> KAYDET</button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: '0 15px 15px 15px', position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '15px' }}>
            <RefreshCw className="animate-spin" size={40} color="#00f2fe" />
            <div style={{ fontSize: '14px', color: '#94a3b8' }}>Veriler Güncelleniyor...</div>
          </div>
        )}
        <div className="glass-card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
            <div style={{ minWidth: `${180 + (hours.length * 100)}px` }}>
              <TimeHeader hours={hours} />
              {INJECTION_MACHINES.map(m => (
                <MachineRow 
                  key={m.id} 
                  machine={m} 
                  orders={orders.filter(o => o.machineId === m.id)} 
                  onSelect={setSelectedOrder} 
                  onDrop={handleOrderMove}
                />
              ))}
            </div>
          </div>
          <div style={{ padding: '10px 20px', background: 'rgba(0,0,0,0.1)', display: 'flex', gap: '20px', fontSize: '10px', color: '#64748b' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(16, 185, 129, 0.3)', border: '1px solid #10b981' }} /> Üretimde</div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(79, 172, 254, 0.3)', border: '1px solid #4facfe' }} /> Planlanan</div>
          </div>
        </div>

        <div style={{ width: selectedOrder || showHistory ? '380px' : '0px', marginLeft: selectedOrder || showHistory ? '15px' : '0px', transition: 'all 0.3s ease', overflow: 'hidden' }}>
          {selectedOrder && !showHistory && (
             <div className="glass-card" style={{ height: '100%', padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <h3 style={{ margin: 0, fontSize: '18px' }}>Emir Detayları</h3>
                   <button onClick={() => setSelectedOrder(null)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>X</button>
                </div>
                <div className="glass-card" style={{ padding: '15px', background: 'rgba(255,255,255,0.03)' }}>
                   <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>İŞ EMRİ / MODEL</div>
                   <div style={{ fontSize: '15px', fontWeight: 'bold' }}>{selectedOrder.workOrderNo}</div>
                   <div style={{ fontSize: '13px', color: '#94a3b8' }}>{selectedOrder.productName}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                   <div className="glass-card" style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}><LayoutGrid size={14} color="#00f2fe" /><span style={{ fontSize: '10px', color: '#94a3b8' }}>GÖZ</span></div>
                      <input 
                        type="number" 
                        className="glass-input" 
                        value={selectedOrder.cavityCount} 
                        onChange={(e) => calculateAndUpdateDuration(selectedOrder, { cavityCount: Number(e.target.value) })}
                        style={{ marginBottom: 0, fontSize: '16px', fontWeight: 'bold' }} 
                      />
                   </div>
                   <div className="glass-card" style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}><Zap size={14} color="#f093fb" /><span style={{ fontSize: '10px', color: '#94a3b8' }}>ÇEVRİM (S)</span></div>
                      <input 
                        type="number" 
                        className="glass-input" 
                        value={selectedOrder.cycleTime} 
                        onChange={(e) => calculateAndUpdateDuration(selectedOrder, { cycleTime: Number(e.target.value) })}
                        style={{ marginBottom: 0, fontSize: '16px', fontWeight: 'bold' }} 
                      />
                   </div>
                </div>
                <div className="glass-card" style={{ padding: '15px' }}>
                   <h4 style={{ fontSize: '12px', margin: '0 0 12px 0', borderBottom: '1px solid #334155', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}><Droplet size={14} color="#4facfe" /> Hammadde & MRP Durumu</h4>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {selectedOrder.materials.map(mat => {
                        const isShortage = mat.stock < mat.required;
                        return (
                          <div key={mat.id} style={{ fontSize: '11px', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontWeight: 'bold', color: '#fff' }}>{mat.name}</span>
                                <span style={{ color: isShortage ? '#ef4444' : '#10b981' }}>{isShortage ? 'EKSİK' : 'STOK TAMAM'}</span>
                             </div>
                             <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '10px' }}>
                                <span>İhtiyaç: {mat.required}</span>
                                <span>Mevcut: {mat.stock}</span>
                             </div>
                             {isShortage && mat.procurementDate && (
                               <div style={{ marginTop: '8px', padding: '6px', background: 'rgba(24acc15, 0.1)', border: '1px solid rgba(24acc15, 0.3)', borderRadius: '4px', color: '#facc15' }}>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={10} /> <b>Termin: {mat.procurementDate}</b></div>
                                 <div style={{ fontSize: '9px', marginLeft: '16px' }}>Yoldaki Miktar: {mat.incomingQty}</div>
                               </div>
                             )}
                          </div>
                        )
                      })}
                   </div>
                </div>
                <div className="glass-card" style={{ padding: '15px' }}>
                   <h4 style={{ fontSize: '12px', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><Hammer size={14} color="#facc15" /> Parametre</h4>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                     <Clock size={12} color="#64748b" />
                     <span style={{ fontSize: '11px', color: '#94a3b8' }}>Hazırlık (DK):</span>
                     <input 
                       type="number" 
                       className="glass-input" 
                       value={selectedOrder.setupTime} 
                       onChange={(e) => calculateAndUpdateDuration(selectedOrder, { setupTime: Number(e.target.value) })}
                       style={{ marginBottom: 0, width: '60px', padding: '2px 6px' }} 
                     />
                   </div>
                </div>
                <div style={{ marginTop: 'auto', display: 'flex', gap: '10px' }}><button className="glass-button" style={{ flex: 1, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444' }}>IPTAL</button><button className="glass-button" style={{ flex: 1 }}>KAYDET</button></div>
             </div>
          )}
          {showHistory && (
             <div className="glass-card" style={{ height: '100%', padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3 style={{ margin: 0, fontSize: '18px' }}>Audit Log</h3><button onClick={() => setShowHistory(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>X</button></div>
                <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                   {REVISION_HISTORY.map(log => (
                     <div key={log.id} className="glass-card" style={{ padding: '12px', fontSize: '11px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span style={{ fontWeight: 'bold' }}>@{log.userName}</span><span style={{ color: '#64748b' }}>{log.timestamp}</span></div>
                        <div style={{ color: '#00f2fe', fontWeight: '600' }}>{log.action}</div>
                        <p style={{ margin: 0, color: '#94a3b8' }}>{log.details}</p>
                     </div>
                   ))}
                </div>
             </div>
          )}
        </div>
      </div>
      <style>{`
        .planner-task-bar:hover { transform: translateY(-2px); filter: brightness(1.1); box-shadow: 0 8px 25px rgba(0, 242, 254, 0.2); }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 2px; }
      `}</style>
    </div>
  );
};

export default MpsPlanner;
