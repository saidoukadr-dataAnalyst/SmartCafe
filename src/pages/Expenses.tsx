import React, { useState } from 'react';
import { Plus, Trash2, Edit2, CheckCircle } from 'lucide-react';
import { mockFixedExpenses } from '../mockData';
import { moveToTrash } from '../trashHelper';
import type { FixedExpense } from '../types';

const categoryColors: Record<string, { bg: string; text: string }> = {
  'Loyer': { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' },
  'Énergie / Eau': { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' },
  'Internet / Télécom': { bg: 'rgba(139, 92, 246, 0.15)', text: '#8b5cf6' },
  'Fournitures': { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981' },
  'Autres': { bg: 'rgba(100, 116, 139, 0.15)', text: '#64748b' }
};

const categories = ['Loyer', 'Énergie / Eau', 'Internet / Télécom', 'Fournitures', 'Autres'];

const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<FixedExpense[]>(() => {
    const saved = localStorage.getItem('app_fixed_expenses');
    return saved ? JSON.parse(saved) : mockFixedExpenses;
  });

  React.useEffect(() => {
    localStorage.setItem('app_fixed_expenses', JSON.stringify(expenses));
  }, [expenses]);
  const [showModal, setShowModal] = useState(false);

  const [newType, setNewType] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newMonth, setNewMonth] = useState('');
  const [newCategory, setNewCategory] = useState('Autres');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleAddExpense = () => {
    if (newType.trim() && newAmount && newMonth) {
      // Format month from YYYY-MM to readable (if needed) or keep as is.
      const dateObj = new Date(newMonth + '-01');
      const formattedMonth = dateObj.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
      
      if (editingId) {
        setExpenses(expenses.map(e => e.id === editingId ? {
          ...e,
          type: newType,
          amount: parseFloat(newAmount),
          month: formattedMonth,
          category: newCategory
        } : e));
      } else {
        setExpenses([...expenses, {
          id: Date.now().toString(),
          type: newType,
          amount: parseFloat(newAmount),
          month: formattedMonth,
          category: newCategory
        }]);
      }
      resetForm();
    } else {
      showToast("Veuillez remplir tous les champs.", "error");
    }
  };

  const resetForm = () => {
    setNewType('');
    setNewAmount('');
    setNewMonth('');
    setNewCategory('Autres');
    setEditingId(null);
    setShowModal(false);
  };

  const handleEditExpense = (expense: FixedExpense) => {
    setNewType(expense.type);
    setNewAmount(expense.amount.toString());
    
    // We need to convert formattedMonth back to YYYY-MM if possible, or just require re-entry if complex.
    // For simplicity, let's try to map it back or just leave it empty if parsing is hard.
    // Actually, HTML input type="month" expects YYYY-MM.
    // Let's create a mapping or just set it to current month.
    const monthMap: Record<string, string> = {
      'Janvier': '01', 'Février': '02', 'Mars': '03', 'Avril': '04', 'Mai': '05', 'Juin': '06',
      'Juillet': '07', 'Août': '08', 'Septembre': '09', 'Octobre': '10', 'Novembre': '11', 'Décembre': '12'
    };
    const parts = expense.month.split(' ');
    let yyyymm = '';
    if (parts.length === 2 && monthMap[parts[0]]) {
      yyyymm = `${parts[1]}-${monthMap[parts[0]]}`;
    }
    setNewMonth(yyyymm);
    
    setNewCategory(expense.category || 'Autres');
    setEditingId(expense.id);
    setShowModal(true);
  };

  const handleDeleteExpense = (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette charge ?")) {
      const expense = expenses.find(e => e.id === id);
      if (expense) moveToTrash('fixed_expense', expense);
      setExpenses(expenses.filter(e => e.id !== id));
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Frais Fixes Mensuels</h1>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus size={18} /> Ajouter une Charge
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Type de Charge</th>
              <th>Catégorie</th>
              <th>Mois</th>
              <th>Montant</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map(expense => {
              const cat = expense.category || 'Autres';
              const colors = categoryColors[cat] || categoryColors['Autres'];
              return (
                <tr key={expense.id}>
                  <td>{expense.type}</td>
                  <td>
                    <span style={{ 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '9999px', 
                      fontSize: '0.75rem', 
                      fontWeight: 600,
                      backgroundColor: colors.bg,
                      color: colors.text
                    }}>
                      {cat}
                    </span>
                  </td>
                  <td>{expense.month}</td>
                  <td><strong>{expense.amount} DH</strong></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-outline"
                        onClick={() => handleEditExpense(expense)}
                        title="Modifier cette charge"
                        style={{ padding: '0.25rem 0.5rem' }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        className="btn btn-danger"
                        onClick={() => handleDeleteExpense(expense.id)}
                        title="Supprimer cette charge"
                        style={{ padding: '0.25rem 0.5rem' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: 'rgba(0, 0, 0, 0.02)', fontWeight: 'bold', borderTop: '2px solid var(--border-color)' }}>
              <td style={{ padding: '1rem 1.5rem' }}>Total Charges Récurrentes</td>
              <td></td>
              <td></td>
              <td style={{ padding: '1rem 1.5rem', color: 'var(--warning)', fontSize: '1.05rem' }}>
                <strong>{expenses.reduce((sum, e) => sum + e.amount, 0)} DH</strong>
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1.5rem' }}>{editingId ? "Modifier la Charge" : "Nouvelle Charge Récurrente"}</h2>
            <div className="form-group">
              <label className="form-label">Type (ex: Loyer, Internet...)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Saisir le type" 
                value={newType}
                onChange={e => setNewType(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Catégorie</label>
              <select 
                className="form-input" 
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Montant (DH)</label>
              <input 
                type="number" 
                inputMode="decimal"
                className="form-input" 
                placeholder="Ex: 500" 
                value={newAmount}
                onChange={e => setNewAmount(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Mois Concerné</label>
              <input 
                type="month" 
                className="form-input" 
                value={newMonth}
                onChange={e => setNewMonth(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button className="btn btn-outline" onClick={resetForm}>Annuler</button>
              <button className="btn btn-primary" onClick={handleAddExpense}>{editingId ? "Enregistrer" : "Ajouter"}</button>
            </div>
          </div>
        </div>
      )}

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

export default Expenses;
