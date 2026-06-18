import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { exportPDF } from '../pdfHelper';
import { exportCSV } from '../csvHelper';
import { Plus, CheckCircle, Trash2, Edit2, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { mockEmployees } from '../mockData';
import { moveToTrash } from '../trashHelper';
import type { Employee } from '../types';
import { useTranslation } from 'react-i18next';

// Helper: format Date to local YYYY-MM-DD string without timezone shifting
const formatDateLocal = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const generateId = () => Date.now().toString();

const Staff: React.FC = () => {
  const { t } = useTranslation();
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

  const getStatusTranslation = (status?: string) => {
    return (status || 'En attente') === 'Payé' ? t('staff.paid') : t('staff.pending');
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
    showToast(t('staff.paySuccess', { total: totalWeekly }), 'success');
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
          id: generateId(),
          name: newName,
          role: newRole,
          weeklySalary: parseFloat(newSalary)
        }]);
      }
      resetForm();
    } else {
      showToast(t('staff.fillAllFields'), "error");
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
    if (window.confirm(t('staff.confirmDelete'))) {
      const employee = employees.find(e => e.id === id);
      if (employee) moveToTrash('employee', employee);
      setEmployees(employees.filter(e => e.id !== id));
    }
  };

  const handleExportStaffPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text("Liste du Personnel & Salaires", pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text(`Généré le : ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, 28, { align: 'center' });

    const tableData = employees.map(e => [
      e.name,
      e.role,
      `${e.weeklySalary} DH`,
      getStatusTranslation(e.status)
    ]);

    autoTable(doc, {
      startY: 38,
      head: [['Nom Complet', 'Rôle / Poste', 'Salaire Hebdomadaire', 'Statut de Paiement']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 10, cellPadding: 5 },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'center', fontStyle: 'bold' }
      }
    });

    const totalWeekly = employees.reduce((sum, e) => sum + e.weeklySalary, 0);
    interface jsPDFWithAutoTable extends jsPDF {
      lastAutoTable?: {
        finalY?: number;
      };
    }
    const finalY = (doc as jsPDFWithAutoTable).lastAutoTable?.finalY || 100;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.roundedRect(14, finalY + 10, pageWidth - 28, 16, 3, 3, 'FD');

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`Total Salaires Hebdomadaires:`, 20, finalY + 20);
    doc.setTextColor(59, 130, 246);
    doc.text(`${totalWeekly} DH`, pageWidth - 20, finalY + 20, { align: 'right' });

    exportPDF(doc, `Personnel_Salaires.pdf`);
  };

  const handleExportStaffCSV = () => {
    let csv = `Nom Complet;Role;Salaire Hebdomadaire (DH);Statut de Paiement\n`;
    employees.forEach(e => {
      const name = e.name.replace(/"/g, '""');
      const role = e.role.replace(/"/g, '""');
      const status = getStatusTranslation(e.status);
      csv += `"${name}";"${role}";${e.weeklySalary};"${status}"\n`;
    });
    const totalWeekly = employees.reduce((sum, e) => sum + e.weeklySalary, 0);
    csv += `\nTotal;;${totalWeekly} DH\n`;
    
    exportCSV(csv, `Personnel_Salaires.csv`);
  };

  const handleExportPaySlip = (employee: Employee) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    const cafeName = localStorage.getItem('app_cafe_name') || 'SmartCafe';
    doc.text(t('staff.paySlipTitle'), pageWidth / 2, 25, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text(cafeName, pageWidth / 2, 33, { align: 'center' });

    // Decorative Line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(14, 40, pageWidth - 14, 40);

    // Metadata Table
    autoTable(doc, {
      startY: 50,
      body: [
        [t('staff.name'), employee.name],
        [t('staff.role'), employee.role],
        [t('staff.weeklySalary'), `${employee.weeklySalary} DH`],
        [t('staff.paySlipDate'), new Date().toLocaleDateString('fr-FR')],
        [t('staff.paymentStatus'), getStatusTranslation(employee.status)]
      ],
      theme: 'grid',
      styles: { fontSize: 11, cellPadding: 6 },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [100, 116, 139], cellWidth: 60 },
        1: { textColor: [30, 41, 59] }
      }
    });

    interface jsPDFWithAutoTable extends jsPDF {
      lastAutoTable?: {
        finalY?: number;
      };
    }
    const finalY = (doc as jsPDFWithAutoTable).lastAutoTable?.finalY || 110;

    // Paid Stamp
    const isPaid = (employee.status || 'En attente') === 'Payé';
    if (isPaid) {
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(74, 222, 128);
      doc.setLineWidth(1);
      doc.roundedRect(pageWidth - 70, finalY + 15, 56, 18, 2, 2, 'FD');
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 163, 74);
      doc.text(t('staff.paid').toUpperCase(), pageWidth - 42, finalY + 27, { align: 'center' });
    } else {
      doc.setFillColor(255, 251, 235);
      doc.setDrawColor(251, 191, 36);
      doc.setLineWidth(1);
      doc.roundedRect(pageWidth - 70, finalY + 15, 56, 18, 2, 2, 'FD');
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(217, 119, 6);
      doc.text(t('staff.pending').toUpperCase(), pageWidth - 42, finalY + 27, { align: 'center' });
    }

    // Signature Area
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(t('staff.paySlipSignature'), 25, finalY + 30);
    doc.line(25, finalY + 50, 75, finalY + 50);

    exportPDF(doc, `Fiche_de_paie_${employee.name.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('staff.title')}</h1>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus size={18} /> {t('staff.addEmployee')}
          </button>
          <button className="btn btn-primary" onClick={handleValidationPaie}>
            <CheckCircle size={18} /> {t('staff.validatePay')}
          </button>
          <button className="btn btn-outline" onClick={handleExportStaffPDF} title="Exporter en PDF">
            <Download size={18} /> PDF
          </button>
          <button className="btn btn-outline" onClick={handleExportStaffCSV} title="Exporter en CSV">
            <FileSpreadsheet size={18} /> CSV
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>{t('staff.name')}</th>
              <th>{t('staff.role')}</th>
              <th>{t('staff.weeklySalary')}</th>
              <th>{t('staff.paymentStatus')}</th>
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
                      {getStatusTranslation(employee.status)}
                    </span>
                    <button 
                      className="btn btn-outline"
                      onClick={() => handleExportPaySlip(employee)}
                      title={t('staff.paySlip')}
                      style={{ padding: '0.25rem 0.5rem', color: 'var(--accent-primary)', borderColor: 'rgba(59, 130, 246, 0.2)' }}
                    >
                      <FileText size={14} />
                    </button>
                    <button 
                      className="btn btn-outline"
                      onClick={() => handleEditEmployee(employee)}
                      title={t('staff.editEmployee')}
                      style={{ padding: '0.25rem 0.5rem' }}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      className="btn btn-danger"
                      onClick={() => handleDeleteEmployee(employee.id)}
                      title={t('staff.confirmDelete')}
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
              <td style={{ padding: '1rem 1.5rem' }}>{t('staff.totalWeekly')}</td>
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
            <h2 style={{ marginBottom: '1.5rem' }}>{editingId ? t('staff.editEmployee') : t('staff.newEmployee')}</h2>
            <div className="form-group">
              <label className="form-label">{t('staff.name')}</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder={t('staff.fullNamePlaceholder')} 
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('staff.role')}</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder={t('staff.rolePlaceholder')} 
                value={newRole}
                onChange={e => setNewRole(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('staff.weeklySalary')} (DH)</label>
              <input 
                type="number" 
                inputMode="decimal"
                className="form-input" 
                placeholder={t('staff.salaryPlaceholder')} 
                value={newSalary}
                onChange={e => setNewSalary(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button className="btn btn-outline" onClick={resetForm}>{t('common.cancel')}</button>
              <button className="btn btn-primary" onClick={handleAddEmployee}>{editingId ? t('common.save') : t('staff.save')}</button>
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
