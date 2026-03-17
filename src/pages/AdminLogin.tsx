import { useState } from 'react';
import '../styles/glass.css';

interface AdminLoginProps {
    onLogin: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // Merkezi Admin Girişi (SaaS Yönetimi için)
        if (username === 'admin' && password === '123456') {
            onLogin();
        } else {
            alert('Hatalı Admin Kullanıcı Adı veya Şifre!');
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            width: '100vw',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
        }}>
            <div className="glass-card" style={{
                padding: '40px',
                width: '400px',
                textAlign: 'center',
                animation: 'fadeIn 0.8s ease-out'
            }}>
                <h1 className="neon-text" style={{ marginBottom: '10px' }}>MPS SaaS</h1>
                <p style={{ color: '#94a3b8', marginBottom: '30px' }}>Merkezi Yönetim ve Firma Tanımlama</p>
                
                <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
                    <label style={{ color: '#cbd5e1', fontSize: '14px' }}>Admin Kullanıcı Adı</label>
                    <input 
                        type="text" 
                        className="glass-input" 
                        placeholder="Örn: saas_admin"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoComplete="off"
                    />
                    
                    <label style={{ color: '#cbd5e1', fontSize: '14px' }}>Şifre</label>
                    <input 
                        type="password" 
                        className="glass-input" 
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="off"
                    />

                    <button type="submit" className="glass-button" style={{ width: '100%', marginTop: '20px' }}>
                        Yönetim Paneline Giriş Yap
                    </button>
                </form>

                <div style={{ marginTop: '25px', fontSize: '12px', color: '#64748b' }}>
                    © 2026 MPS Resource Planning Platform
                </div>
            </div>
            
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default AdminLogin;
