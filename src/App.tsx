import { useState } from 'react';
import AdminDashboard from './pages/AdminDashboard';
import MpsPlanner from './pages/MpsPlanner';
import AdminLogin from './pages/AdminLogin';
import ClientLogin from './pages/ClientLogin';

type ViewState = 'CLIENT_LOGIN' | 'ADMIN_LOGIN' | 'DASHBOARD' | 'PLANNER';

function App() {
  const [view, setView] = useState<ViewState>('CLIENT_LOGIN');
  const [currentTenantId, setCurrentTenantId] = useState<number | null>(null);

  return (
    <>
      {view === 'CLIENT_LOGIN' && (
        <ClientLogin 
          onLogin={(id) => { setCurrentTenantId(id); setView('PLANNER'); }} 
          onAdminSwitch={() => setView('ADMIN_LOGIN')} 
        />
      )}
      
      {view === 'ADMIN_LOGIN' && (
        <AdminLogin onLogin={() => setView('DASHBOARD')} />
      )}
      
      {view === 'DASHBOARD' && (
        <AdminDashboard onOpenPlanner={() => setView('PLANNER')} />
      )}
      
      {view === 'PLANNER' && (
        <MpsPlanner 
          tenantId={currentTenantId}
          onBack={() => view === 'PLANNER' && currentTenantId ? setView('CLIENT_LOGIN') : setView('DASHBOARD')} 
        />
      )}
    </>
  );
}

export default App;
