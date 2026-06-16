import React, { useState, useEffect } from 'react';
import { RotateCcw, Trash2, CheckCircle, Package, User, DollarSign, Truck } from 'lucide-react';
import type { TrashItem } from '../trashHelper';
import type { Supplier } from '../types';

const Trash: React.FC = () => {
  const [trashItems, setTrashItems] = useState<TrashItem[]>(() => {
    // Migration from old app_trash_deliveries to app_trash
    const oldTrash = localStorage.getItem('app_trash_deliveries');
    let oldDeliveries: any[] = [];
    if (oldTrash) {
      oldDeliveries = JSON.parse(oldTrash).map((d: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        type: 'delivery',
        data: d,
        deletedAt: new Date().toISOString()
      }));
      localStorage.removeItem('app_trash_deliveries');
    }

    const saved = localStorage.getItem('app_trash');
    const existingTrash = saved ? JSON.parse(saved) : [];
    
    const combined = [...existingTrash, ...oldDeliveries];
    if (oldDeliveries.length > 0) {
      localStorage.setItem('app_trash', JSON.stringify(combined));
    }
    return combined;
  });
  
  const [suppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('app_suppliers');
    return saved ? JSON.parse(saved) : [];
  });

  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 4000);
  };

  useEffect(() => {
    localStorage.setItem('app_trash', JSON.stringify(trashItems));
  }, [trashItems]);

  const getSupplierName = (id: string) => {
    const supplier = suppliers.find(s => s.id === id);
    return supplier ? supplier.name : `Inconnu`;
  };

  const handleRestoreItem = (item: TrashItem) => {
    if (window.confirm("Voulez-vous restaurer cet élément ?")) {
      // Logic based on type
      let storageKey = '';
      if (item.type === 'delivery') storageKey = 'app_deliveries_archive';
      if (item.type === 'supplier') storageKey = 'app_suppliers';
      if (item.type === 'employee') storageKey = 'app_employees';
      if (item.type === 'fixed_expense') storageKey = 'app_fixed_expenses';
      
      if (storageKey) {
        const currentData = JSON.parse(localStorage.getItem(storageKey) || '[]');
        currentData.push(item.data);
        localStorage.setItem(storageKey, JSON.stringify(currentData));
      }
      
      setTrashItems(trashItems.filter(t => t.id !== item.id));
      showToast("Élément restauré avec succès.", "success");
    }
  };

  const handleEmptyTrash = () => {
    if (trashItems.length === 0) return;
    if (window.confirm("Voulez-vous vider la corbeille définitivement ? Cette action est irréversible.")) {
      setTrashItems([]);
      showToast("La corbeille a été vidée définitivement.", "info");
    }
  };

  const handleDeletePermanent = (id: string) => {
    if (window.confirm("Voulez-vous supprimer définitivement cet élément ?")) {
      setTrashItems(trashItems.filter(d => d.id !== id));
      showToast("Élément supprimé définitivement.", "info");
    }
  };

  const renderItemDetails = (item: TrashItem) => {
    if (item.type === 'delivery') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong>Livraison: {item.data.label}</strong>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Fournisseur: {getSupplierName(item.data.supplierId)} | Prix: {item.data.totalPrice} DH</span>
        </div>
      );
    }
    if (item.type === 'supplier') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong>Fournisseur: {item.data.name}</strong>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Contact: {item.data.contact}</span>
        </div>
      );
    }
    if (item.type === 'employee') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong>Employé: {item.data.name}</strong>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Rôle: {item.data.role} | Salaire: {item.data.weeklySalary} DH</span>
        </div>
      );
    }
    if (item.type === 'fixed_expense') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong>Charge: {item.data.type} ({item.data.category})</strong>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Mois: {item.data.month} | Montant: {item.data.amount} DH</span>
        </div>
      );
    }
    return <span>Élément inconnu</span>;
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'delivery': return <Package size={20} color="#3b82f6" />;
      case 'supplier': return <Truck size={20} color="#f59e0b" />;
      case 'employee': return <User size={20} color="#10b981" />;
      case 'fixed_expense': return <DollarSign size={20} color="#ef4444" />;
      default: return <Package size={20} />;
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Trash2 size={28} /> Corbeille
        </h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="btn btn-danger" 
            onClick={handleEmptyTrash}
            disabled={trashItems.length === 0}
          >
            <Trash2 size={18} /> Vider la Corbeille
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Détails de l'élément</th>
              <th>Date de suppression</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {trashItems.map(item => (
              <tr key={item.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {getItemIcon(item.type)}
                    <span style={{ textTransform: 'capitalize' }}>
                      {item.type === 'fixed_expense' ? 'Charge' : 
                       item.type === 'delivery' ? 'Livraison' : 
                       item.type === 'supplier' ? 'Fournisseur' : 
                       item.type === 'employee' ? 'Employé' : item.type}
                    </span>
                  </div>
                </td>
                <td>{renderItemDetails(item)}</td>
                <td>{new Date(item.deletedAt).toLocaleString('fr-FR')}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '0.25rem', cursor: 'pointer', color: 'var(--success)', borderColor: 'var(--success)' }}
                      title="Restaurer"
                      onClick={() => handleRestoreItem(item)}
                    >
                      <RotateCcw size={16} />
                    </button>
                    <button 
                      className="btn" 
                      style={{ padding: '0.25rem', backgroundColor: 'transparent', color: 'var(--danger)', cursor: 'pointer' }}
                      title="Supprimer définitivement"
                      onClick={() => handleDeletePermanent(item.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {trashItems.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  La corbeille est vide.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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

export default Trash;
