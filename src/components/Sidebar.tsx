import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, ShoppingCart, FileText, Banknote, Wallet, Sun, Moon, X } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  React.useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <LayoutDashboard size={24} />
          <span>SmartCafe</span>
        </div>
        <button 
          onClick={onClose} 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--text-sidebar)', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            padding: '0.25rem' 
          }}
          title="Fermer le menu"
        >
          <X size={20} />
        </button>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/" className={({isActive}) => isActive ? "nav-item active" : "nav-item"} onClick={onClose} end>
          <LayoutDashboard size={20} />
          <span>Tableau de Bord</span>
        </NavLink>
        <NavLink to="/suppliers" className={({isActive}) => isActive ? "nav-item active" : "nav-item"} onClick={onClose}>
          <ShoppingCart size={20} />
          <span>Fournisseurs</span>
        </NavLink>
        <NavLink to="/income" className={({isActive}) => isActive ? "nav-item active" : "nav-item"} onClick={onClose}>
          <Wallet size={20} />
          <span>Revenus</span>
        </NavLink>
        <NavLink to="/staff" className={({isActive}) => isActive ? "nav-item active" : "nav-item"} onClick={onClose}>
          <Users size={20} />
          <span>Personnel</span>
        </NavLink>
        <NavLink to="/expenses" className={({isActive}) => isActive ? "nav-item active" : "nav-item"} onClick={onClose}>
          <Banknote size={20} />
          <span>Frais Fixes</span>
        </NavLink>
        <NavLink to="/reports" className={({isActive}) => isActive ? "nav-item active" : "nav-item"} onClick={onClose}>
          <FileText size={20} />
          <span>Rapport Mensuel</span>
        </NavLink>
      </nav>
      <div className="sidebar-footer" style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <button 
          onClick={toggleTheme} 
          className="btn btn-outline" 
          style={{ 
            width: '100%', 
            justifyContent: 'center', 
            gap: '0.75rem', 
            color: 'var(--text-sidebar)', 
            borderColor: 'rgba(255,255,255,0.1)',
            backgroundColor: 'rgba(255,255,255,0.05)',
            cursor: 'pointer'
          }}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          <span>{theme === 'dark' ? 'Mode Clair' : 'Mode Sombre'}</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
