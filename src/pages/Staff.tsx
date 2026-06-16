import React, { useState } from 'react';
import { Plus, CheckCircle, Trash2, Edit2 } from 'lucide-react';
import { mockEmployees } from '../mockData';
import { moveToTrash } from '../trashHelper';
import type { Employee } from '../types';

// Helper: format Date to local YYYY-MM-DD string without timezone shifting
const formatDateLocal = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const Staff: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('app_staff');
    return saved ? JSON.parse(saved) : mockEmployees;
  });

  React.useEffect(() => {
    localStorage.setItem('app_staff', JSON.stringify(employees));
  }, [employees]);
  const [showModal, setShowModal] = useState(false);
  
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newSalary, setNewSalary] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleValidationPaie = () => {
    const totalWeekly = employees.reduce((sum, e) => sum + e.weeklySalary, 0);
    const todayStr = formatDateLocal(new Date());
    
    // Save payroll record
    const savedPayroll = localStorage.getItem('app_payroll');
    const payroll = savedPayroll ? JSON.parse(savedPayroll) : [];
    payroll.push({ date: todayStr, amount: totalWeekly });
    localStorage.setItem('app_payroll', JSON.stringify(payroll));

    setEmployees(employees.map(e => ({ ...e, status: 'Payé' })));
    showToast(`Paie de la semaine validée ! Total versé : ${totalWeekly} DH`, 'success');
  };

  const handleAddEmployee = () => {
    if (newName.trim() && newRole.trim() && newSalary) {
      if (editingId) {
        setEmployees(employees.map(e => e.id === editingId ? {
          ...e,
          name: newName,
          role: newRole,
          weeklySalary: parseFloat(newSalary)
        } : e));
      } else {
        setEmployees([...employees, {
          id: Date.now().toString(),
          name: newName,
          role: newRole,
          weeklySalary: parseFloat(newSalary)
        }]);
      }
      resetForm();
    } else {
      showToast("Veuillez remplir tous les champs.", "error");
    }
  };

  const resetForm = () => {
    setNewName('');
    setNewRole('');
    setNewSalary('');
    setEditingId(null);
    setShowModal(false);
  };

  const handleEditEmployee = (employee: Employee) => {
    setNewName(employee.name);
    setNewRole(employee.role);
    setNewSalary(employee.weeklySalary.toString());
    setEditingId(employee.id);
    setShowModal(true);
  };

  const handleDeleteEmployee = (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cet employé ?")) {
      const employee = employees.find(e => e.id === id);
      if (employee) moveToTrash('employee', employee);
      setEmployees(employees.filter(e => e.id !== id));
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Gestion du Personnel</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-outline" onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus size={18} /> Ajouter Employé
          </button>
          <button className="btn btn-primary" onClick={handleValidationPaie}>
            <CheckCircle size={18} /> Valider la Paie (Semaine)
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Rôle</th>
              <th>Salaire Hebdomadaire</th>
              <th>Statut Paiement</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(employee => (
              <tr key={employee.id}>
                <td>{employee.name}</td>
                <td>{employee.role}</td>
                <td><strong>{employee.weeklySalary} DH</strong></td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '9999px', 
                      fontSize: '0.75rem', 
                      fontWeight: 600,
                      backgroundColor: (employee.status || 'En attente') === 'Payé' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: (employee.status || 'En attente') === 'Payé' ? 'var(--success)' : 'var(--warning)'
                    }}>
                      {employee.status || 'En attente'}
                    </span>
                    <button 
                      className="btn btn-outline"
                      onClick={() => handleEditEmployee(employee)}
                      title="Modifier cet employé"
                      style={{ padding: '0.25rem 0.5rem' }}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      className="btn btn-danger"
                      onClick={() => handleDeleteEmployee(employee.id)}
                      title="Supprimer cet employé"
                      style={{ padding: '0.25rem 0.5rem' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: 'rgba(0, 0, 0, 0.02)', fontWeight: 'bold', borderTop: '2px solid var(--border-color)' }}>
              <td style={{ padding: '1rem 1.5rem' }}>Total Salaires Hebdomadaires</td>
              <td></td>
              <td style={{ padding: '1rem 1.5rem', color: 'var(--accent-primary)', fontSize: '1.05rem' }}>
                <strong>{employees.reduce((sum, e) => sum + e.weeklySalary, 0)} DH</strong>
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1.5rem' }}>{editingId ? "Modifier l'Employé" : "Nouvel Employé"}</h2>
            <div className="form-group">
              <label className="form-label">Nom complet</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ex: Ahmed" 
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Rôle</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ex: Barista" 
                value={newRole}
                onChange={e => setNewRole(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Salaire Hebdomadaire (DH)</label>
              <input 
                type="number" 
                inputMode="decimal"
                className="form-input" 
                placeholder="Ex: 1500" 
                value={newSalary}
                onChange={e => setNewSalary(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button className="btn btn-outline" onClick={resetForm}>Annuler</button>
              <button className="btn btn-primary" onClick={handleAddEmployee}>{editingId ? "Enregistrer" : "Sauvegarder"}</button>
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

export default Staff;
