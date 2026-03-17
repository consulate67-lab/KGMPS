import { useState } from 'react';
import AdminDashboard from './pages/AdminDashboard';
import MpsPlanner from './pages/MpsPlanner';
import AdminLogin from './pages/AdminLogin';
import ClientLogin from './pages/ClientLogin';
import MaterialAnalysis from './pages/MaterialAnalysis';

type ViewState = 'CLIENT_LOGIN' | 'ADMIN_LOGIN' | 'DASHBOARD' | 'PLANNER' | 'ANALYSIS';

function App() {
  const [view, setView] = useState<ViewState>('CLIENT_LOGIN');
  const [targetTenantId, setTargetTenantId] = useState<number | null>(null);
  const [isAdminSession, setIsAdminSession] = useState(false);

  return (
    <>
      {view === 'CLIENT_LOGIN' && (
        <ClientLogin 
          onLogin={(id) => { 
            setTargetTenantId(id); 
            setIsAdminSession(false);
            setView('ANALYSIS'); 
          }} 
          onAdminSwitch={() => setView('ADMIN_LOGIN')} 
        />
      )}
      
      {view === 'ADMIN_LOGIN' && (
        <AdminLogin onLogin={() => {
          setIsAdminSession(true);
          setView('DASHBOARD');
        }} />
      )}
      
      {view === 'DASHBOARD' && (
        <AdminDashboard onOpenPlanner={(id) => { 
          setTargetTenantId(id); 
          setView('ANALYSIS'); 
        }} />
      )}

      {view === 'ANALYSIS' && (
        <MaterialAnalysis 
          tenantId={targetTenantId}
          onBack={() => {
            if (isAdminSession) {
              setView('DASHBOARD');
            } else {
              setView('CLIENT_LOGIN');
            }
          }}
          onOpenPlanner={() => setView('PLANNER')}
        />
      )}
      
      {view === 'PLANNER' && (
        <MpsPlanner 
          tenantId={targetTenantId}
          onBack={() => setView('ANALYSIS')} 
        />
      )}
    </>
  );
}

export default App;
