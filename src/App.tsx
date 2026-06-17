import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Suppliers from './pages/Suppliers';
import Income from './pages/Income';
import Staff from './pages/Staff';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Trash from './pages/Trash';
import { Menu, Coffee } from 'lucide-react';
import LoginScreen from './components/LoginScreen';
import ActivationScreen from './components/ActivationScreen';
import { useTranslation } from 'react-i18next';

const App: React.FC = () => {
  const { i18n } = useTranslation();
  const [isActivated, setIsActivated] = useState(() => {
    return localStorage.getItem('app_activated') === 'true';
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('app_authenticated') === 'true';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!isActivated) {
    return <ActivationScreen onActivationSuccess={() => setIsActivated(true)} />;
  }

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <Router>
      <div className="app-container">
        {/* Top Header Bar */}
        <header className="app-header">
          <button 
            className="menu-toggle-btn"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Ouvrir le menu"
            title="Ouvrir le menu"
          >
            <Menu size={24} />
          </button>
          <div className="header-brand">
            <Coffee className="header-logo" size={22} />
            <span className="header-title">SmartCafe</span>
            
            {/* Language Switcher */}
            <div 
              className="lang-switcher" 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.2rem', 
                marginInlineStart: '0.75rem', 
                borderInlineStart: '1px solid var(--border-color)', 
                paddingInlineStart: '0.75rem',
                height: '18px'
              }}
            >
              <button 
                onClick={() => i18n.changeLanguage('fr')} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: i18n.language.startsWith('fr') ? 'var(--success)' : 'var(--text-secondary)', 
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  padding: '0.1rem 0.2rem',
                  lineHeight: 1,
                  transition: 'all 0.2s ease',
                }}
              >
                FR
              </button>
              <span style={{ color: 'var(--border-color)', fontSize: '0.8rem', userSelect: 'none', lineHeight: 1 }}>/</span>
              <button 
                onClick={() => i18n.changeLanguage('ar')} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: i18n.language.startsWith('ar') ? 'var(--success)' : 'var(--text-secondary)', 
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  padding: '0.1rem 0.2rem',
                  lineHeight: 1,
                  transition: 'all 0.2s ease',
                }}
              >
                AR
              </button>
            </div>
          </div>
        </header>

        {/* Sidebar backdrop overlay */}
        {isSidebarOpen && (
          <div 
            className="sidebar-overlay" 
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/income" element={<Income />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/trash" element={<Trash />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
