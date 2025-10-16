import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Role } from '../enums';
import { DashboardIcon } from './icons/DashboardIcon';
import { EmployeeIcon } from './icons/EmployeeIcon';
import { DemandIcon } from './icons/DemandIcon';
import { ClockIcon } from './icons/ClockIcon';
import { ApiIcon } from './icons/ApiIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { UsersIcon } from './icons/UsersIcon';
import { ConfigIcon } from './icons/ConfigIcon';
import { LogoutIcon } from './icons/LogoutIcon';
import { UserProfileIcon } from './icons/UserProfileIcon';
import { MapIcon } from './icons/MapIcon';
import OperationSwitcher from './OperationSwitcher';
import { Gear3DIcon } from './icons/Gear3DIcon';

interface NavLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
}

const NavLink: React.FC<NavLinkProps> = ({ href, icon, label }) => {
  const [isActive, setIsActive] = useState(false);
  
  useEffect(() => {
    const handleHashChange = () => {
      const currentHash = window.location.hash.slice(1) || 'dashboard';
      setIsActive(currentHash === href);
    };
    
    handleHashChange(); // Set initial state
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [href]);
  
  return (
    <a href={`#${href}`} className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
        isActive 
          ? 'bg-blue-600 text-white shadow' 
          : 'text-slate-600 hover:bg-slate-200'
      }`}>
      {icon}
      <span className="ml-3">{label}</span>
    </a>
  );
};

const Sidebar: React.FC = () => {
    const { user, logout } = useAuth();
    const isAdmin = user?.role === Role.ADMIN;
    
    const navItems = [
        { href: 'dashboard', icon: <DashboardIcon />, label: 'Dashboard' },
        { href: 'employees', icon: <EmployeeIcon />, label: 'Funcionários' },
        { href: 'employee-detail', icon: <UserProfileIcon />, label: 'Análise Individual' },
        { href: 'demand', icon: <DemandIcon />, label: 'Demanda' },
        { href: 'time-clock', icon: <ClockIcon />, label: 'Controle de Ponto' },
        { href: 'integration', icon: <ApiIcon />, label: 'Integração' },
        { href: 'planning', icon: <CalendarIcon />, label: 'Planejamento' },
    ];

    const adminNavItems = [
        { href: 'operations', icon: <DashboardIcon />, label: 'Operações' },
        { href: 'world-map', icon: <MapIcon />, label: 'Mapa Global' },
        { href: 'users', icon: <UsersIcon />, label: 'Usuários' },
        { href: 'api-config', icon: <ConfigIcon />, label: 'API Config' },
    ];
    
    return (
        <aside className="w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
            <div className="flex items-center justify-center p-4 border-b border-slate-200">
                <Gear3DIcon className="w-8 h-8 text-blue-600" />
                <h1 className="text-xl font-bold text-slate-800 ml-2">LaborSync</h1>
            </div>
            
            <OperationSwitcher />

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                <h3 className="px-3 pb-2 text-xs font-bold uppercase text-slate-400 tracking-wider">Menu</h3>
                {navItems.map(item => <NavLink key={item.href} {...item} />)}

                {isAdmin && (
                    <>
                        <h3 className="px-3 pt-4 pb-2 text-xs font-bold uppercase text-slate-400 tracking-wider">Admin</h3>
                        {adminNavItems.map(item => <NavLink key={item.href} {...item} />)}
                    </>
                )}
            </nav>

            <div className="p-4 border-t border-slate-200">
                <div className="p-3 bg-slate-100 rounded-lg flex items-center">
                    <UserProfileIcon />
                    <div className="ml-3">
                        <p className="text-sm font-semibold text-slate-800">{user?.username}</p>
                        <p className="text-xs text-slate-500">{user?.role}</p>
                    </div>
                </div>
                 <button onClick={logout} className="w-full flex items-center justify-center mt-3 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                    <LogoutIcon />
                    <span className="ml-3">Sair</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;