import { useState, useMemo } from 'react';
import axios from 'axios';
import { 
  Users, Building2, ShieldAlert, CheckCircle2, 
  Search, Plus, Edit2, Trash2, 
  LayoutGrid, X
} from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import '../styles/glass.css';

interface TenantUser {
  id: number;
  username: string;
  role: string;
  email: string;
}

interface Tenant {
  id: number;
  name: string;
  host: string;
  db: string;
  licenseEnd: string;
  status: 'Aktif' | 'Pasif';
  email: string; // Firma Genel İletişim E-Posta
  adminUser: string; // Firmanın Ana Giriş Kullanıcısı
  adminPass: string; // Firmanın Ana Giriş Şifresi
  processes: string[]; // Planlamada görülecek süreçler: Enjeksiyon, Montaj, Boya vb.
  users: TenantUser[];
}

const initialTenants: Tenant[] = [
  { 
    id: 1, 
    name: 'Cabani Kundura', 
    host: '192.168.1.3', 
    db: 'Uretim', 
    licenseEnd: '2026-03-25', 
    status: 'Aktif',
    email: 'info@cabani.com.tr',
    adminUser: 'cabani_admin',
    adminPass: 'admin123',
    processes: ['Enjeksiyon', 'Montaj', 'Kalıphane'],
    users: [
      { id: 101, username: 'selimkorgun', role: 'Admin', email: 'selim@korgun.com.tr' }
    ]
  },
  { 
    id: 2, 
    name: 'Örnek Plastik Ltd.', 
    host: '92.110.45.12', 
    db: 'ERP_TEST', 
    licenseEnd: '2026-12-31', 
    status: 'Aktif',
    email: 'destek@ornekplastik.com',
    adminUser: 'ornek_user',
    adminPass: 'ornek88',
    processes: ['Enjeksiyon', 'Boya'],
    users: []
  }
];

const AdminDashboard = ({ onOpenPlanner }: { onOpenPlanner: () => void }) => {
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  
  // Yeni kullanıcı form state'leri
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('');

  const handleUpdateTenant = () => {
    if (editingTenant) {
      setTenants(prev => prev.map(t => t.id === editingTenant.id ? editingTenant : t));
      setShowEditModal(false);
    }
  };

  const handleDeleteTenant = (id: number) => {
    if (window.confirm('Bu firmayı ve tüm verilerini silmek istediğinize emin misiniz?')) {
      setTenants(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleRemoveUser = (tenantId: number, userId: number) => {
    setTenants(prev => prev.map(t => {
      if (t.id === tenantId) {
        return { ...t, users: t.users.filter(u => u.id !== userId) };
      }
      return t;
    }));
    // Also update selectedTenant for the modal
    if (selectedTenant) {
       setSelectedTenant({ ...selectedTenant, users: selectedTenant.users.filter(u => u.id !== userId) });
    }
  };

  const handleAddUser = async () => {
    if (!newUserName.trim() || !newUserPass.trim() || !selectedTenant) {
      alert('Lütfen kullanıcı adı ve şifre giriniz.');
      return;
    }

    try {
      const apiBase = 'https://kgmps-production.up.railway.app';
      const res = await axios.post(`${apiBase}/api/admin/users`, {
        username: newUserName,
        password: newUserPass,
        tenantId: selectedTenant.id,
        role: 'Planlamaci'
      });

      if (res.data.success) {
        const newUser: TenantUser = {
          id: res.data.userId,
          username: newUserName,
          email: newUserEmail,
          role: 'Planlamaci'
        };

        const updatedTenants = tenants.map(t => {
          if (t.id === selectedTenant.id) {
            return { ...t, users: [...t.users, newUser] };
          }
          return t;
        });

        setTenants(updatedTenants);
        setSelectedTenant({
          ...selectedTenant,
          users: [...selectedTenant.users, newUser]
        });

        setNewUserName('');
        setNewUserEmail('');
        setNewUserPass('');
        alert('Personel başarıyla eklendi.');
      }
    } catch (err: any) {
      console.error('Hata:', err);
      alert('Kullanıcı eklenirken bir hata oluştu: ' + (err.response?.data?.error || err.message));
    }
  };

  const stats = useMemo(() => {
    const total = tenants.length;
    const active = tenants.filter(t => t.status === 'Aktif').length;
    const expiringSoon = tenants.filter(t => {
      const daysLeft = differenceInDays(parseISO(t.licenseEnd), new Date());
      return daysLeft >= 0 && daysLeft <= 10;
    }).length;
    return { total, active, expiringSoon };
  }, [tenants]);

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.db.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableProcesses = ['Enjeksiyon', 'Montaj', 'Boya', 'Kalıphane', 'Paketleme', 'Hava Basma'];

  return (
    <div style={{ padding: '30px', minHeight: '100vh', background: '#0f172a' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div className="glass-card" style={{ padding: '25px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ background: 'rgba(56, 189, 248, 0.15)', padding: '16px', borderRadius: '14px' }}><Building2 color="#38bdf8" size={32} /></div>
          <div><div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>TOPLAM FİRMA</div><div style={{ fontSize: '28px', fontWeight: 'bold', color: '#fff' }}>{stats.total}</div></div>
        </div>
        <div className="glass-card" style={{ padding: '25px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ background: 'rgba(34, 197, 94, 0.15)', padding: '16px', borderRadius: '14px' }}><CheckCircle2 color="#22c55e" size={32} /></div>
          <div><div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>AKTİF LİSANSLAR</div><div style={{ fontSize: '28px', fontWeight: 'bold', color: '#fff' }}>{stats.active}</div></div>
        </div>
        <div className="glass-card" style={{ padding: '25px', display: 'flex', alignItems: 'center', gap: '20px', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '16px', borderRadius: '14px' }}><ShieldAlert color="#ef4444" size={32} /></div>
          <div><div style={{ fontSize: '11px', color: '#ef4444', fontWeight: '700' }}>KRİTİK (10 GÜN)</div><div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f87171' }}>{stats.expiringSoon}</div></div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '25px', minHeight: '500px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', alignItems: 'center' }}>
          <h2 className="neon-text" style={{ fontSize: '24px', margin: 0 }}>Kurumsal Firma Yönetimi</h2>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '12px', top: '10px', color: '#64748b' }} size={18} />
              <input 
                className="glass-input" 
                placeholder="Arama..." 
                style={{ paddingLeft: '40px', width: '220px', marginBottom: 0 }} 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
            <button className="glass-button" style={{ background: 'linear-gradient(135deg, #4facfe, #00f2fe)', gap: '8px', display: 'flex' }}>
              <Plus size={18} /> Yeni Kayıt
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ color: '#64748b', fontSize: '11px', borderBottom: '1px solid rgba(255,255,255,0.08)', letterSpacing: '1px' }}>
                <th style={{ padding: '15px' }}>FİRMA ÜNVANI</th><th>HOST / IP</th><th>VERİTABANI</th><th>DURUM</th><th>SÜREÇLER</th><th style={{ textAlign: 'right', paddingRight: '15px' }}>İŞLEMLER</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.map(t => {
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '14px' }} className="table-row-hover">
                    <td style={{ padding: '18px 15px', color: '#fff', fontWeight: '600' }}>
                      {t.name}
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'normal' }}>{t.email}</div>
                    </td>
                    <td style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{t.host}</td>
                    <td style={{ color: '#00f2fe', fontWeight: '500' }}>{t.db}</td>
                    <td><span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', background: t.status === 'Aktif' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: t.status === 'Aktif' ? '#4ade80' : '#f87171' }}>{t.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {t.processes.map(p => <span key={p} style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: '#cbd5e1' }}>{p}</span>)}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '15px' }}>
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button onClick={() => { setEditingTenant(t); setShowEditModal(true); }} className="glass-button action-btn" style={{ background: 'rgba(255,255,255,0.05)' }}><Edit2 size={14} /></button>
                        <button onClick={() => { setSelectedTenant(t); setShowUserModal(true); }} className="glass-button action-btn" style={{ background: 'rgba(56, 189, 248, 0.15)' }}><Users size={14} /></button>
                        <button onClick={() => handleDeleteTenant(t.id)} className="glass-button action-btn" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}><Trash2 size={14} /></button>
                        <button onClick={onOpenPlanner} className="glass-button action-btn" style={{ background: 'rgba(0, 242, 254, 0.15)', color: '#00f2fe' }}><LayoutGrid size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showUserModal && selectedTenant && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-card" style={{ width: '700px', height: '80vh', padding: '35px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', borderBottom: '1px solid #334155', paddingBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ background: 'rgba(0, 242, 254, 0.1)', padding: '10px', borderRadius: '12px' }}><Users color="#00f2fe" size={24} /></div>
                <div><h3 style={{ margin: 0, color: '#fff' }}>{selectedTenant.name} / Personel Yetkileri</h3><p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Firma personeli tanımlama</p></div>
              </div>
              <button onClick={() => setShowUserModal(false)} className="glass-button"><X size={20} /></button>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '15px', padding: '20px', marginBottom: '25px' }}>
               <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr', gap: '10px', marginBottom: '10px' }}>
                 <input 
                   className="glass-input" 
                   placeholder="Kullanıcı Adı" 
                   style={{ marginBottom: 0 }} 
                   value={newUserName}
                   onChange={(e) => setNewUserName(e.target.value)}
                 />
                 <input 
                   className="glass-input" 
                   placeholder="E-Posta Adresi" 
                   style={{ marginBottom: 0 }} 
                   value={newUserEmail}
                   onChange={(e) => setNewUserEmail(e.target.value)}
                 />
                 <input 
                   className="glass-input" 
                   type="password" 
                   placeholder="Şifre" 
                   style={{ marginBottom: 0 }} 
                   value={newUserPass}
                   onChange={(e) => setNewUserPass(e.target.value)}
                 />
               </div>
               <button 
                 onClick={handleAddUser}
                 className="glass-button" 
                 style={{ background: '#00f2fe', color: '#000', fontWeight: 'bold', width: '100%' }}
               >
                 PERSONELİ SİSTEME EKLE
               </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead style={{ background: 'rgba(255,255,255,0.02)', position: 'sticky', top: 0 }}>
                  <tr style={{ color: '#64748b', fontSize: '12px', borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: '12px' }}>KULLANICI</th><th style={{ padding: '12px' }}>E-POSTA</th><th style={{ textAlign: 'right', padding: '12px' }}>SİL</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTenant.users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '13px' }}>
                      <td style={{ padding: '12px', color: '#fff' }}>{u.username}</td>
                      <td style={{ color: '#94a3b8' }}>{u.email}</td>
                      <td style={{ textAlign: 'right', padding: '12px' }}><button onClick={() => handleRemoveUser(selectedTenant.id, u.id)} className="glass-button" style={{ padding: '5px', background: 'rgba(239, 68, 68, 0.1)' }}><Trash2 size={12} color="#f87171" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingTenant && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-card" style={{ width: '750px', maxHeight: '90vh', overflowY: 'auto', padding: '35px' }}>
             <h3 style={{ margin: '0 0 25px 0', borderBottom: '1px solid #334155', paddingBottom: '15px', color: '#00f2fe' }}>Firma Gelişmiş Parametreleri</h3>
             
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                {/* Sol Sütun: Temel ve SQL Bilgileri */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                   <div style={{ background: 'rgba(0, 242, 254, 0.03)', padding: '15px', borderRadius: '12px', borderLeft: '3px solid #00f2fe' }}>
                     <h4 style={{ fontSize: '12px', margin: '0 0 10px 0', color: '#64748b' }}>TEMEL BİLGİLER</h4>
                     <label className="input-label">FİRMA ÜNVANI</label><input className="glass-input" defaultValue={editingTenant.name} />
                     <label className="input-label">İLETİŞİM E-POSTA</label><input className="glass-input" defaultValue={editingTenant.email} />
                   </div>

                   <div style={{ background: 'rgba(79, 172, 254, 0.03)', padding: '15px', borderRadius: '12px', borderLeft: '3px solid #4facfe' }}>
                     <h4 style={{ fontSize: '12px', margin: '0 0 10px 0', color: '#64748b' }}>SQL SERVER BAĞLANTISI</h4>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div><label className="input-label">HOST (IP)</label><input className="glass-input" defaultValue={editingTenant.host} /></div>
                        <div><label className="input-label">DB ADI</label><input className="glass-input" defaultValue={editingTenant.db} /></div>
                     </div>
                   </div>

                   <div style={{ background: 'rgba(16, 185, 129, 0.03)', padding: '15px', borderRadius: '12px', borderLeft: '3px solid #10b981' }}>
                     <h4 style={{ fontSize: '12px', margin: '0 0 10px 0', color: '#64748b' }}>LİSANS YÖNETİMİ</h4>
                     <label className="input-label">LİSANS BİTİŞ TARİHİ</label><input className="glass-input" type="date" defaultValue={editingTenant.licenseEnd} />
                   </div>
                </div>

                {/* Sağ Sütun: Giriş Bilgileri ve Süreç Seçimi */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                   <div style={{ background: 'rgba(240, 147, 251, 0.03)', padding: '15px', borderRadius: '12px', borderLeft: '3px solid #f093fb' }}>
                      <h4 style={{ fontSize: '12px', margin: '0 0 10px 0', color: '#64748b' }}>FİRMA GİRİŞ BİLGİLERİ</h4>
                      <label className="input-label">ANA KULLANICI ADI (ERP)</label><input className="glass-input" defaultValue={editingTenant.adminUser} />
                      <label className="input-label">GİRİŞ ŞİFRESİ</label><input className="glass-input" type="password" defaultValue={editingTenant.adminPass} />
                   </div>

                   <div style={{ background: 'rgba(250, 204, 21, 0.03)', padding: '15px', borderRadius: '12px', borderLeft: '3px solid #facc15' }}>
                      <h4 style={{ fontSize: '12px', margin: '0 0 10px 0', color: '#64748b' }}>PLANLAMA SÜREÇLERİ</h4>
                      <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '10px' }}>Ekranda görünecek üretim departmanları:</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                         {availableProcesses.map(p => (
                           <label key={p} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer' }}>
                             <input 
                                type="checkbox" 
                                defaultChecked={editingTenant.processes.includes(p)}
                                style={{ accentColor: '#00f2fe' }}
                             /> {p}
                           </label>
                         ))}
                      </div>
                   </div>
                </div>
             </div>

             <div style={{ display: 'flex', gap: '15px', marginTop: '30px', borderTop: '1px solid #334155', paddingTop: '25px' }}>
                <button onClick={() => setShowEditModal(false)} className="glass-button" style={{ flex: 1, background: 'rgba(255,255,255,0.05)' }}>İPTAL</button>
                <button onClick={handleUpdateTenant} className="glass-button" style={{ flex: 1, background: '#00f2fe', color: '#000', fontWeight: 'bold' }}>TÜM PARAMETRELERİ GÜNCELLE</button>
             </div>
          </div>
        </div>
      )}

      <style>{`
        .table-row-hover:hover { background: rgba(255, 255, 255, 0.04); }
        .action-btn { padding: 8px; border-radius: 10px; transition: 0.2s; }
        .action-btn:hover { border-color: #00f2fe; box-shadow: 0 0 10px rgba(0, 242, 254, 0.2); }
        .input-label { font-size: 11px; color: #64748b; font-weight: 700; display: block; margin-bottom: 6px; }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
