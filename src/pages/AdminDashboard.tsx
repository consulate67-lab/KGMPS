import { useState, useMemo, useEffect } from 'react';
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
  dbUser: string;
  dbPass: string;
  licenseEnd: string;
  status: 'Aktif' | 'Pasif';
  email: string;
  adminUser: string;
  adminPass: string;
  processes: string[];
  users: TenantUser[];
}

const initialTenants: Tenant[] = [];

const AdminDashboard = ({ onOpenPlanner }: { onOpenPlanner: (id: number) => void }) => {
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  const [showAddTenantModal, setShowAddTenantModal] = useState(false);
  const [newTenant, setNewTenant] = useState({
    name: '', host: '', db: '', dbUser: 'sa', dbPass: '', email: '', licenseEnd: '2026-12-31'
  });

  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('');

  const apiBase = 'https://kgmps-production.up.railway.app';

  const fetchTenants = async () => {
    try {
      const res = await axios.get(`${apiBase}/api/admin/tenants`);
      setTenants(res.data);
    } catch (err) {
      console.error('Firmalar yüklenemedi:', err);
    }
  };

  const fetchUsers = async (tenantId: number) => {
    try {
      const res = await axios.get(`${apiBase}/api/admin/tenants/${tenantId}/users`);
      if (selectedTenant && selectedTenant.id === tenantId) {
        setSelectedTenant({ ...selectedTenant, users: res.data });
      }
      setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, users: res.data } : t));
    } catch (err) {
      console.error('Personeller yüklenemedi:', err);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleAddTenant = async () => {
    try {
      const res = await axios.post(`${apiBase}/api/admin/tenants`, newTenant);
      if (res.data.success) {
        setShowAddTenantModal(false);
        fetchTenants();
        setNewTenant({ name: '', host: '', db: '', dbUser: 'sa', dbPass: '', email: '', licenseEnd: '2026-12-31' });
        alert('Yeni firma başarıyla eklendi.');
      }
    } catch (err: any) {
      console.error('Firma ekleme hatası:', err);
      alert('Firma eklenirken hata: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleUpdateTenant = async () => {
    if (!editingTenant) return;
    try {
      const res = await axios.put(`${apiBase}/api/admin/tenants/${editingTenant.id}`, editingTenant);
      if (res.data.success) {
        setShowEditModal(false);
        fetchTenants();
        alert('Firma başarıyla güncellendi.');
      }
    } catch (err: any) {
      alert('Güncelleme hatası: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteTenant = async (id: number) => {
    if (window.confirm('Bu firmayı ve tüm verilerini (kullanıcılar dahil) silmek istediğinize emin misiniz?')) {
      try {
        const res = await axios.delete(`${apiBase}/api/admin/tenants/${id}`);
        if (res.data.success) {
          fetchTenants();
          alert('Firma silindi.');
        }
      } catch (err: any) {
        alert('Silme hatası: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  const handleRemoveUser = async (tenantId: number, userId: number) => {
    if (!window.confirm('Bu personeli silmek istediğinize emin misiniz?')) return;
    try {
      const res = await axios.delete(`${apiBase}/api/admin/users/${userId}`);
      if (res.data.success) {
        fetchUsers(tenantId);
      }
    } catch (err: any) {
      alert('Personel silme hatası: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleAddUser = async () => {
    if (!newUserName.trim() || !newUserPass.trim() || !selectedTenant) {
      alert('Lütfen kullanıcı adı ve şifre giriniz.');
      return;
    }

    try {
      const res = await axios.post(`${apiBase}/api/admin/users`, {
        username: newUserName,
        password: newUserPass,
        tenantId: selectedTenant.id,
        role: 'Planlamaci'
      });

      if (res.data.success) {
        // Personelleri yeniden çekerek verinin gerçekten kaydedildiğini doğrula (Railway Live Sync)
        await fetchUsers(selectedTenant.id);

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
      if (!t.licenseEnd) return false;
      try {
        const daysLeft = differenceInDays(parseISO(t.licenseEnd), new Date());
        return daysLeft >= 0 && daysLeft <= 10;
      } catch { return false; }
    }).length;
    return { total, active, expiringSoon };
  }, [tenants]);

  const filteredTenants = tenants.filter(t => 
    (t.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (t.db?.toLowerCase() || '').includes(searchTerm.toLowerCase())
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
            <button 
              onClick={() => setShowAddTenantModal(true)}
              className="glass-button" 
              style={{ background: 'linear-gradient(135deg, #4facfe, #00f2fe)', gap: '8px', display: 'flex' }}
            >
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
              {filteredTenants.map(t => (
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
                        {(t.processes || []).map(p => <span key={p} style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: '#cbd5e1' }}>{p}</span>)}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '15px' }}>
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button onClick={() => { setEditingTenant(t); setShowEditModal(true); }} className="glass-button action-btn" style={{ background: 'rgba(255,255,255,0.05)' }}><Edit2 size={14} /></button>
                        <button onClick={() => { 
                          setSelectedTenant(t); 
                          setShowUserModal(true); 
                          fetchUsers(t.id);
                        }} className="glass-button action-btn" style={{ background: 'rgba(56, 189, 248, 0.15)' }}><Users size={14} /></button>
                        <button onClick={() => handleDeleteTenant(t.id)} className="glass-button action-btn" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}><Trash2 size={14} /></button>
                        <button onClick={() => onOpenPlanner(t.id)} className="glass-button action-btn" style={{ background: 'rgba(0, 242, 254, 0.15)', color: '#00f2fe' }}><LayoutGrid size={14} /></button>
                      </div>
                    </td>
                  </tr>
              ))}
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
                  {(selectedTenant.users || []).map(u => (
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                   <div style={{ background: 'rgba(0, 242, 254, 0.03)', padding: '15px', borderRadius: '12px', borderLeft: '3px solid #00f2fe' }}>
                     <h4 style={{ fontSize: '12px', margin: '0 0 10px 0', color: '#64748b' }}>TEMEL BİLGİLER</h4>
                     <label className="input-label">FİRMA ÜNVANI</label>
                     <input 
                        className="glass-input" 
                        value={editingTenant.name} 
                        onChange={e => setEditingTenant({...editingTenant, name: e.target.value})}
                      />
                     <label className="input-label">İLETİŞİM E-POSTA</label>
                     <input 
                        className="glass-input" 
                        value={editingTenant.email} 
                        onChange={e => setEditingTenant({...editingTenant, email: e.target.value})}
                      />
                   </div>

                   <div style={{ background: 'rgba(79, 172, 254, 0.03)', padding: '15px', borderRadius: '12px', borderLeft: '3px solid #4facfe' }}>
                     <h4 style={{ fontSize: '12px', margin: '0 0 10px 0', color: '#64748b' }}>SQL SERVER BAĞLANTISI</h4>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                          <label className="input-label">HOST (IP)</label>
                          <input 
                            className="glass-input" 
                            value={editingTenant.host} 
                            onChange={e => setEditingTenant({...editingTenant, host: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="input-label">DB ADI</label>
                          <input 
                            className="glass-input" 
                            value={editingTenant.db} 
                            onChange={e => setEditingTenant({...editingTenant, db: e.target.value})}
                          />
                        </div>
                     </div>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
                        <div>
                          <label className="input-label">SQL USER</label>
                          <input 
                            className="glass-input" 
                            value={editingTenant.dbUser || ''} 
                            onChange={e => setEditingTenant({...editingTenant, dbUser: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="input-label">SQL PASS</label>
                          <input 
                            className="glass-input" 
                            type="password"
                            value={editingTenant.dbPass || ''} 
                            onChange={e => setEditingTenant({...editingTenant, dbPass: e.target.value})}
                          />
                        </div>
                     </div>
                   </div>

                   <div style={{ background: 'rgba(16, 185, 129, 0.03)', padding: '15px', borderRadius: '12px', borderLeft: '3px solid #10b981' }}>
                     <h4 style={{ fontSize: '12px', margin: '0 0 10px 0', color: '#64748b' }}>LİSANS YÖNETİMİ</h4>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                       <div>
                         <label className="input-label">DURUM</label>
                         <select 
                            className="glass-input" 
                            value={editingTenant.status}
                            onChange={e => setEditingTenant({...editingTenant, status: e.target.value as 'Aktif' | 'Pasif'})}
                         >
                           <option value="Aktif">Aktif</option>
                           <option value="Pasif">Pasif</option>
                         </select>
                       </div>
                       <div>
                         <label className="input-label">LİSANS BİTİŞ</label>
                         <input 
                            className="glass-input" 
                            type="date" 
                            value={editingTenant.licenseEnd?.split('T')[0] || ''} 
                            onChange={e => setEditingTenant({...editingTenant, licenseEnd: e.target.value})}
                         />
                       </div>
                     </div>
                   </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                   <div style={{ background: 'rgba(240, 147, 251, 0.03)', padding: '15px', borderRadius: '12px', borderLeft: '3px solid #f093fb' }}>
                      <h4 style={{ fontSize: '12px', margin: '0 0 10px 0', color: '#64748b' }}>FİRMA GİRİŞ BİLGİLERİ</h4>
                      <label className="input-label">ANA KULLANICI ADI (ERP)</label>
                      <input 
                        className="glass-input" 
                        value={editingTenant.adminUser || ''} 
                        onChange={e => setEditingTenant({...editingTenant, adminUser: e.target.value})}
                      />
                      <label className="input-label">GİRİŞ ŞİFRESİ</label>
                      <input 
                        className="glass-input" 
                        type="password" 
                        value={editingTenant.adminPass || ''} 
                        onChange={e => setEditingTenant({...editingTenant, adminPass: e.target.value})}
                      />
                   </div>

                   <div style={{ background: 'rgba(250, 204, 21, 0.03)', padding: '15px', borderRadius: '12px', borderLeft: '3px solid #facc15' }}>
                      <h4 style={{ fontSize: '12px', margin: '0 0 10px 0', color: '#64748b' }}>PLANLAMA SÜREÇLERİ</h4>
                      <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '10px' }}>Ekranda görünecek üretim departmanları:</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                         {availableProcesses.map(p => (
                           <label key={p} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer' }}>
                             <input 
                                type="checkbox" 
                                checked={(editingTenant.processes || []).includes(p)}
                                onChange={e => {
                                  const current = editingTenant.processes || [];
                                  const next = e.target.checked 
                                    ? [...current, p] 
                                    : current.filter(item => item !== p);
                                  setEditingTenant({...editingTenant, processes: next});
                                }}
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

      {showAddTenantModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-card" style={{ width: '500px', padding: '35px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px', borderBottom: '1px solid #334155', paddingBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#00f2fe' }}>Yeni Firma Kaydı</h3>
              <button onClick={() => setShowAddTenantModal(false)} className="glass-button" style={{ padding: '5px' }}><X size={20} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div><label className="input-label">FİRMA ÜNVANI</label><input className="glass-input" placeholder="Örn: Cabani Kundura" value={newTenant.name} onChange={e => setNewTenant({...newTenant, name: e.target.value})} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div><label className="input-label">SQL HOST (IP)</label><input className="glass-input" placeholder="192.168..." value={newTenant.host} onChange={e => setNewTenant({...newTenant, host: e.target.value})} /></div>
                <div><label className="input-label">DB ADI</label><input className="glass-input" placeholder="Uretim" value={newTenant.db} onChange={e => setNewTenant({...newTenant, db: e.target.value})} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div><label className="input-label">SQL USER</label><input className="glass-input" value={newTenant.dbUser} onChange={e => setNewTenant({...newTenant, dbUser: e.target.value})} /></div>
                <div><label className="input-label">SQL ŞİFRE</label><input className="glass-input" type="password" value={newTenant.dbPass} onChange={e => setNewTenant({...newTenant, dbPass: e.target.value})} /></div>
              </div>
              <div><label className="input-label">GENEL E-POSTA</label><input className="glass-input" placeholder="info@firma.com" value={newTenant.email} onChange={e => setNewTenant({...newTenant, email: e.target.value})} /></div>
              <div><label className="input-label">LİSANS BİTİŞ</label><input className="glass-input" type="date" value={newTenant.licenseEnd} onChange={e => setNewTenant({...newTenant, licenseEnd: e.target.value})} /></div>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
              <button onClick={() => setShowAddTenantModal(false)} className="glass-button" style={{ flex: 1, background: 'rgba(255,255,255,0.05)' }}>İPTAL</button>
              <button onClick={handleAddTenant} className="glass-button" style={{ flex: 1, background: '#00f2fe', color: '#000', fontWeight: 'bold' }}>FİRMAYI KAYDET</button>
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
