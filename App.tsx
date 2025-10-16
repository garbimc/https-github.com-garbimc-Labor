import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Demand from './pages/Demand';
import TimeClock from './pages/TimeClock';
import Integration from './pages/Integration';
import Planning from './pages/Planning';
import EmployeeDetail from './pages/EmployeeDetail';
import Operations from './pages/Operations';
import Users from './pages/Users';
import ApiConfig from './pages/ApiConfig';
import WorldMap from './pages/WorldMap';

const routes: { [key: string]: React.ComponentType } = {
  'dashboard': Dashboard,
  'employees': Employees,
  'employee-detail': EmployeeDetail,
  'demand': Demand,
  'time-clock': TimeClock,
  'integration': Integration,
  'planning': Planning,
  'operations': Operations,
  'users': Users,
  'api-config': ApiConfig,
  'world-map': WorldMap
};

const AppContent: React.FC = () => {
    const { user } = useAuth();
    const [hash, setHash] = useState(window.location.hash.slice(1) || 'dashboard');

    useEffect(() => {
        const handleHashChange = () => {
            const newHash = window.location.hash.slice(1) || 'dashboard';
            if (newHash !== hash) {
                setHash(newHash);
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        // Set initial hash in case it's not the default
        handleHashChange();

        return () => {
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, [hash]);

    if (!user) {
        return <Login />;
    }

    const Page = routes[hash] || Dashboard;

    return (
        <div className="flex h-screen bg-slate-50">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-8">
                <Page />
            </main>
        </div>
    );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
