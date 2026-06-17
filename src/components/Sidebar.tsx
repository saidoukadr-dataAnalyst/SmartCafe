import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, ShoppingCart, FileText, Banknote, Wallet, Sun, Moon, X, Lock, LogOut, Trash2 } from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
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

  const handleLogout = () => {
    sessionStorage.removeItem('app_authenticated');
    window.location.reload();
  };

  return (
    <>
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
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <LayoutDashboard size={20} />
            <span>{t('sidebar.dashboard')}</span>
          </NavLink>
          
          <NavLink to="/suppliers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <ShoppingCart size={20} />
            <span>{t('sidebar.suppliers')}</span>
          </NavLink>

          <NavLink to="/income" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <Banknote size={20} />
            <span>{t('sidebar.income')}</span>
          </NavLink>
          
          <NavLink to="/staff" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <Users size={20} />
            <span>{t('sidebar.staff')}</span>
          </NavLink>
          
          <NavLink to="/expenses" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <Wallet size={20} />
            <span>{t('sidebar.expenses')}</span>
          </NavLink>
          
          <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <FileText size={20} />
            <span>{t('sidebar.reports')}</span>
          </NavLink>

          <NavLink to="/trash" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <Trash2 size={20} />
            <span>{t('sidebar.trash')}</span>
          </NavLink>
          
          <button 
            onClick={() => {
              setIsPasswordModalOpen(true);
              onClose();
            }}
            className="nav-item"
            style={{ 
              background: 'none', 
              border: 'none', 
              width: '100%', 
              textAlign: 'start', 
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 'inherit'
            }}
          >
            <Lock size={20} />
            <span>{t('sidebar.security')}</span>
          </button>
        </nav>
        <div className="sidebar-footer" style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
            <span>{theme === 'dark' ? t('sidebar.lightMode') : t('sidebar.darkMode')}</span>
          </button>
          
          <button 
            onClick={handleLogout} 
            className="btn btn-outline" 
            style={{ 
              width: '100%', 
              justifyContent: 'center', 
              gap: '0.75rem', 
              color: '#ef4444', 
              borderColor: 'rgba(239, 68, 68, 0.2)',
              backgroundColor: 'rgba(239, 68, 68, 0.05)',
              cursor: 'pointer',
              marginTop: '0.25rem'
            }}
          >
            <LogOut size={18} />
            <span>{t('sidebar.logout')}</span>
          </button>
        </div>
      </div>

      <ChangePasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
      />
    </>
  );
};

export default Sidebar;
