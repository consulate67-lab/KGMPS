import { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/glass.css';
import { Building2, User, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

interface ClientLoginProps {
  onLogin: (tenantId: number) => void;
  onAdminSwitch: () => void;
}

const ClientLogin: React.FC<ClientLoginProps> = ({ onLogin, onAdminSwitch }) => {
  const [selectedTenant, setSelectedTenant] = useState<number>(1);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firms, setFirms] = useState<{id: number, name: string}[]>([]);
  const apiBase = 'https://kgmps-production.up.railway.app';

  useEffect(() => {
    const fetchFirms = async () => {
      try {
        const res = await axios.get(`${apiBase}/api/public/tenants`);
        setFirms(res.data);
        if (res.data.length > 0) setSelectedTenant(res.data[0].id);
      } catch (err) {
        console.error('Firma listesi yüklenemedi:', err);
      }
    };
    fetchFirms();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${apiBase}/api/auth/login`, {
        username,
        password,
        tenantID: selectedTenant
      });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role);
      onLogin(selectedTenant);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        alert(err.response?.data?.error || 'Giriş başarısız!');
      } else {
        alert('Beklenmedik bir hata oluştu');
      }
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      width: '100vw',
      background: 'radial-gradient(circle at top right, #1e293b, #0f172a)'
    }}>
      <div className="glass-card" style={{
        padding: '50px',
        width: '450px',
        textAlign: 'center',
        position: 'relative',
        animation: 'fadeIn 0.6s ease-out'
      }}>
        <div style={{ 
          background: 'rgba(0, 242, 254, 0.1)', 
          width: '70px', height: '70px', 
          borderRadius: '20px', 
          display: 'flex', 
          placeContent: 'center', 
          placeItems: 'center',
          margin: '0 auto 25px auto'
        }}>
          <ShieldCheck size={40} color="#00f2fe" />
        </div>
        
        <h1 className="neon-text" style={{ fontSize: '32px', marginBottom: '8px' }}>MPS Girişi</h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '40px' }}>Kurumsal Üretim Planlama Portalı</p>

        <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
          <label style={{ color: '#cbd5e1', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Building2 size={14} /> KURUMSAL FİRMA SEÇİMİ
          </label>
          <select 
            className="glass-input" 
            style={{ marginBottom: '20px', appearance: 'none', cursor: 'pointer' }}
            value={selectedTenant}
            onChange={(e) => setSelectedTenant(Number(e.target.value))}
          >
            {firms.length === 0 && <option value="">Firmalar Yükleniyor...</option>}
            {firms.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>

          <label style={{ color: '#cbd5e1', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <User size={14} /> KULLANICI ADI
          </label>
          <input 
            type="text" 
            className="glass-input" 
            placeholder="ERP Kullanıcı Adı"
            style={{ marginBottom: '20px' }}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
          />

          <label style={{ color: '#cbd5e1', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Lock size={14} /> GÜVENLİ ŞİFRE
          </label>
          <input 
            type="password" 
            className="glass-input" 
            placeholder="••••••••"
            style={{ marginBottom: '30px' }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="off"
          />

          <button type="submit" className="glass-button" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
            Planlama Ekranına Giriş Yap <ArrowRight size={18} />
          </button>
        </form>

        <button 
          onClick={onAdminSwitch}
          style={{ 
            marginTop: '30px', 
            background: 'transparent', 
            border: 'none', 
            color: '#64748b', 
            fontSize: '12px', 
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          Merkezi SaaS Admin Girişi
        </button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); scale: 0.98; }
          to { opacity: 1; transform: translateY(0); scale: 1; }
        }
      `}</style>
    </div>
  );
};

export default ClientLogin;
