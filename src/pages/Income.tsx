import React, { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Plus, CalendarDays, CheckCircle } from 'lucide-react';
import { mockDailyIncome } from '../mockData';
import type { DailyIncome } from '../types';
import { useTranslation } from 'react-i18next';

// Helper: format Date to local YYYY-MM-DD string without timezone shifting
const formatDateLocal = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const Income: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [incomes, setIncomes] = useState<DailyIncome[]>(() => {
    const saved = localStorage.getItem('app_incomes');
    return saved ? JSON.parse(saved) : mockDailyIncome;
  });
  const [date, setDate] = useState<Date>(new Date());
  const [amount, setAmount] = useState<string>('');

  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const formattedDate = formatDateLocal(date);
  const incomeForDate = incomes.find(i => i.date === formattedDate);

  const handleAddIncome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    
    const val = parseFloat(amount);
    
    // Update or add
    let newIncomes;
    if (incomeForDate) {
      newIncomes = incomes.map(i => i.date === formattedDate ? { ...i, amount: val } : i);
    } else {
      newIncomes = [...incomes, { date: formattedDate, amount: val }];
    }
    
    setIncomes(newIncomes);
    localStorage.setItem('app_incomes', JSON.stringify(newIncomes));
    setAmount('');
    showToast(t('income.successSave'), 'success');
  };

  const tileContent = ({ date, view }: { date: Date, view: string }) => {
    if (view === 'month') {
      const d = formatDateLocal(date);
      const inc = incomes.find(i => i.date === d);
      if (inc) {
        return <p style={{ color: 'var(--success)', fontWeight: 'bold', fontSize: '0.75rem', marginTop: '0.25rem' }}>{inc.amount} DH</p>;
      }
    }
    return null;
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('income.title')}</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        <div className="kpi-card" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarDays size={20} /> {t('income.selectDate')}
          </h2>
          <Calendar 
            onChange={(val) => {
              if (val instanceof Date) {
                setDate(val);
              }
            }} 
            value={date} 
            tileContent={tileContent}
            className="custom-calendar"
          />
        </div>

        <div className="kpi-card" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '2rem', height: 'fit-content' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>
            {t('income.detailsFor')} {date.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'fr-FR')}
          </h2>
          
          <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-md)', width: '100%' }}>
            <p className="kpi-label" style={{ color: 'var(--success)' }}>{t('income.registeredRevenue')}</p>
            <p className="kpi-value" style={{ color: 'var(--success)' }}>
              {incomeForDate ? `${incomeForDate.amount} DH` : t('income.noRevenue')}
            </p>
          </div>

          <form onSubmit={handleAddIncome} style={{ width: '100%' }}>
            <div className="form-group">
              <label className="form-label">{t('income.enterAmount')}</label>
              <input 
                type="number" 
                inputMode="decimal"
                className="form-input" 
                placeholder="Ex: 850" 
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              <Plus size={18} /> {t('income.saveRevenue')}
            </button>
          </form>
        </div>
      </div>
      <style>{`
        .custom-calendar {
          border: none !important;
          width: 100% !important;
          background: transparent !important;
          font-family: inherit !important;
        }
        .react-calendar__tile--active {
          background: var(--accent-primary) !important;
          border-radius: var(--radius-md);
        }
        .react-calendar__tile--now {
          background: rgba(59, 130, 246, 0.1) !important;
          border-radius: var(--radius-md);
        }
        .react-calendar__tile {
          padding: 1em 0.5em !important;
          transition: all 0.2s ease;
        }
        .react-calendar__tile:hover {
          background: rgba(0,0,0,0.05) !important;
          border-radius: var(--radius-md);
        }
      `}</style>
      
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: toastType === 'error' ? 'var(--danger)' : toastType === 'info' ? 'var(--accent-primary)' : 'var(--success)',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toastType === 'success' && <CheckCircle size={20} />}
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default Income;
