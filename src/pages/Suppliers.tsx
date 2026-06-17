import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { exportPDF } from '../pdfHelper';
import { Plus, CheckCircle, Trash2, Edit2, ShoppingBag, Download } from 'lucide-react';
import { mockSuppliers, mockDeliveries } from '../mockData';
import { moveToTrash } from '../trashHelper';
import type { Supplier, Delivery } from '../types';
import { useTranslation } from 'react-i18next';

// Helper: format Date to local YYYY-MM-DD string without timezone shifting
const formatDateLocal = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const Suppliers: React.FC = () => {
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('app_suppliers');
    return saved ? JSON.parse(saved) : mockSuppliers;
  });
  
  const [deliveries, setDeliveries] = useState<Delivery[]>(() => {
    const saved = localStorage.getItem('app_deliveries');
    return saved ? JSON.parse(saved) : mockDeliveries;
  });

  const [archivedDeliveries, setArchivedDeliveries] = useState<Delivery[]>(() => {
    const saved = localStorage.getItem('app_deliveries_archive');
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  
  // Tabs and search/filters state
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [historySupplierId, setHistorySupplierId] = useState('');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');

  // Modals state
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchiveInModal, setShowArchiveInModal] = useState(false);

  const filteredSuppliers = suppliers.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const getArchivedDeliveriesForSupplier = (supplierId: string) => {
    return archivedDeliveries.filter(d => d.supplierId === supplierId);
  };

  const getSupplierName = (id: string) => {
    const supplier = suppliers.find(s => s.id === id);
    return supplier ? supplier.name : t('suppliers.unknownSupplier', { id });
  };
  
  // New Supplier Form
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierContact, setNewSupplierContact] = useState('');
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);

  // New Delivery Form
  const [delSupplierId, setDelSupplierId] = useState('');
  const [delDate, setDelDate] = useState(formatDateLocal(new Date()));
  const [delLabel, setDelLabel] = useState('');
  const [delQuantity, setDelQuantity] = useState<string>('');
  const [delTotalPrice, setDelTotalPrice] = useState<string>('');
  const [editingDeliveryId, setEditingDeliveryId] = useState<string | null>(null);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage('');
    }, 4000);
  };

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('app_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem('app_deliveries', JSON.stringify(deliveries));
  }, [deliveries]);

  useEffect(() => {
    localStorage.setItem('app_deliveries_archive', JSON.stringify(archivedDeliveries));
  }, [archivedDeliveries]);

  const getDeliveriesForSupplier = (supplierId: string) => {
    return deliveries.filter(d => d.supplierId === supplierId);
  };

  const filteredHistory = archivedDeliveries.filter(d => {
    const matchSupplier = !historySupplierId || d.supplierId === historySupplierId;
    const matchSearch = !historySearchQuery || d.label.toLowerCase().includes(historySearchQuery.toLowerCase());
    const matchStart = !historyStartDate || d.date >= historyStartDate;
    const matchEnd = !historyEndDate || d.date <= historyEndDate;
    return matchSupplier && matchSearch && matchStart && matchEnd;
  });

  const sortedFilteredHistory = [...filteredHistory].sort((a, b) => b.date.localeCompare(a.date));

  const handleDeleteSupplier = (id: string) => {
    if (window.confirm(t('suppliers.confirmDeleteSupplier'))) {
      const supplier = suppliers.find(s => s.id === id);
      if (supplier) moveToTrash('supplier', supplier);
      
      setSuppliers(suppliers.filter(s => s.id !== id));
      setDeliveries(deliveries.filter(d => d.supplierId !== id));
    }
  };

  const handleDeleteActiveDelivery = (deliveryId: string, supplierId: string, price: number) => {
    if (window.confirm(t('suppliers.confirmDeleteDelivery'))) {
      setDeliveries(deliveries.filter(d => d.id !== deliveryId));
      setSuppliers(suppliers.map(s => 
        s.id === supplierId 
          ? { ...s, totalOwed: Math.max(0, s.totalOwed - price) }
          : s
      ));
    }
  };

  const handleDeleteArchivedDelivery = (deliveryId: string) => {
    if (window.confirm(t('suppliers.confirmDeleteDeliveryHistory'))) {
      const delivery = archivedDeliveries.find(d => d.id === deliveryId);
      if (delivery) moveToTrash('delivery', delivery);
      setArchivedDeliveries(archivedDeliveries.filter(d => d.id !== deliveryId));
    }
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setNewSupplierName(supplier.name);
    setNewSupplierContact(supplier.contact);
    setEditingSupplierId(supplier.id);
    setShowSupplierModal(true);
  };

  const handleEditDelivery = (delivery: Delivery) => {
    setDelSupplierId(delivery.supplierId);
    setDelDate(delivery.date);
    setDelLabel(delivery.label);
    setDelQuantity(delivery.quantity.toString());
    setDelTotalPrice(delivery.totalPrice.toString());
    setEditingDeliveryId(delivery.id);
    setShowDeliveryModal(true);
  };

  const handleClearHistory = () => {
    if (window.confirm(t('suppliers.confirmClearHistory'))) {
      if (archivedDeliveries.length > 0) moveToTrash('delivery', archivedDeliveries);
      setArchivedDeliveries([]);
      showToast(t('suppliers.toastClearHistory'), "info");
    }
  };

  const handleExportHistoryPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text("Historique des Livraisons", pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text(`Généré le : ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, 28, { align: 'center' });
    
    let filterText = "Filtres : ";
    if (historySupplierId) filterText += `Fournisseur: ${getSupplierName(historySupplierId)} | `;
    if (historySearchQuery) filterText += `Rech: "${historySearchQuery}" | `;
    if (historyStartDate || historyEndDate) filterText += `Période: ${historyStartDate || 'Début'} à ${historyEndDate || 'Fin'}`;
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(filterText, pageWidth / 2, 36, { align: 'center' });

    const tableData = sortedFilteredHistory.map(d => [
      d.date,
      getSupplierName(d.supplierId),
      d.label,
      d.quantity,
      `${d.totalPrice} DH`
    ]);

    autoTable(doc, {
      startY: 42,
      head: [['Date', 'Fournisseur', 'Produit / Label', 'Qté', 'Prix']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: {
        4: { fontStyle: 'bold', halign: 'right' },
      }
    });

    const grandTotal = sortedFilteredHistory.reduce((sum, d) => sum + Number(d.totalPrice), 0);
    interface jsPDFWithAutoTable extends jsPDF {
      lastAutoTable?: {
        finalY?: number;
      };
    }
    const finalY = (doc as jsPDFWithAutoTable).lastAutoTable?.finalY || 100;
    
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.roundedRect(14, finalY + 10, pageWidth - 28, 20, 3, 3, 'FD');

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`Total (${sortedFilteredHistory.length} livraisons) :`, 20, finalY + 23);
    
    doc.setTextColor(59, 130, 246);
    doc.text(`${grandTotal} DH`, pageWidth - 20, finalY + 23, { align: 'right' });

    exportPDF(doc, `Historique_Livraisons_Fournisseurs.pdf`);
  };

  const handleAddSupplier = () => {
    if (newSupplierName.trim()) {
      if (editingSupplierId) {
        setSuppliers(suppliers.map(s => s.id === editingSupplierId ? { ...s, name: newSupplierName, contact: newSupplierContact } : s));
      } else {
        const newSupplier = {
          id: Date.now().toString(),
          name: newSupplierName,
          contact: newSupplierContact,
          totalOwed: 0
        };
        setSuppliers([...suppliers, newSupplier]);
        if (showDeliveryModal) {
          setDelSupplierId(newSupplier.id);
        }
      }
      setNewSupplierName('');
      setNewSupplierContact('');
      setEditingSupplierId(null);
      setShowSupplierModal(false);
      showToast(t('suppliers.toastSupplierAdded'), "success");
    } else {
      showToast(t('suppliers.fillAllFields'), "error");
    }
  };

  const handleAddDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!delSupplierId || !delLabel || !delQuantity || !delTotalPrice) {
      showToast(t('suppliers.fillAllFields'), "error");
      return;
    }

    const newDelivery: Delivery = {
      id: Date.now().toString(),
      supplierId: delSupplierId,
      date: delDate,
      label: delLabel,
      quantity: Number(delQuantity),
      totalPrice: Number(delTotalPrice)
    };

    if (editingDeliveryId) {
      const oldDelivery = deliveries.find(d => d.id === editingDeliveryId) || archivedDeliveries.find(d => d.id === editingDeliveryId);
      if (oldDelivery) {
        if (deliveries.find(d => d.id === editingDeliveryId)) {
          setDeliveries(deliveries.map(d => d.id === editingDeliveryId ? newDelivery : d));
          // Adjust supplier totalOwed
          setSuppliers(suppliers.map(s => {
            if (s.id === oldDelivery.supplierId) {
              return { ...s, totalOwed: Math.max(0, s.totalOwed - oldDelivery.totalPrice + newDelivery.totalPrice) };
            }
            if (oldDelivery.supplierId !== newDelivery.supplierId && s.id === newDelivery.supplierId) {
              return { ...s, totalOwed: s.totalOwed + newDelivery.totalPrice };
            }
            return s;
          }));
        } else {
          setArchivedDeliveries(archivedDeliveries.map(d => d.id === editingDeliveryId ? newDelivery : d));
        }
      }
    } else {
      setDeliveries([...deliveries, newDelivery]);
      setSuppliers(suppliers.map(s => 
        s.id === delSupplierId 
          ? { ...s, totalOwed: s.totalOwed + Number(delTotalPrice) }
          : s
      ));
    }

    // Reset form
    setDelLabel('');
    setDelQuantity('');
    setDelTotalPrice('');
    setEditingDeliveryId(null);
    setShowDeliveryModal(false);
    showToast(t('suppliers.toastDeliveryAdded'), "success");
  };

  const handleClotureDimanche = () => {
    const activeDeliveriesCount = deliveries.length;
    const activeDettes = suppliers.reduce((sum, s) => sum + s.totalOwed, 0);

    if (activeDeliveriesCount === 0 && activeDettes === 0) {
      showToast(t('suppliers.noArchivedDeliveries'), "info");
      return;
    }

    if (!window.confirm(t('suppliers.closeWeeklyConfirm'))) {
      return;
    }

    // Calculer la plage de dates de la semaine courante (du lundi au dimanche)
    const today = new Date();
    const currentDay = today.getDay(); // 0: Dimanche, 1: Lundi, ...
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    
    const monday = new Date(today);
    monday.setDate(today.getDate() - distanceToMonday);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const formatWeekDate = (d: Date) => {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return `${dd}-${mm}`;
    };
    
    const weekRangeStr = `${formatWeekDate(monday)} au ${formatWeekDate(sunday)}`;
    const weekRangeFilename = `${formatWeekDate(monday)}_au_${formatWeekDate(sunday)}`;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let hasPages = false;

    suppliers.forEach((supplier) => {
      const supplierDeliveries = getDeliveriesForSupplier(supplier.id);
      if (supplierDeliveries.length === 0 && supplier.totalOwed === 0) return;

      if (hasPages) {
        doc.addPage();
      }
      hasPages = true;

      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59);
      doc.text(`Facture / Rapport Hebdomadaire`, pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139);
      doc.text(`Période : Semaine du ${weekRangeStr}`, pageWidth / 2, 28, { align: 'center' });

      // Info bloc
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.roundedRect(14, 38, pageWidth - 28, 30, 3, 3, 'FD');

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`Fournisseur: ${supplier.name}`, 20, 48);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Contact: ${supplier.contact || 'N/A'}`, 20, 56);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(239, 68, 68); // danger
      doc.text(`Montant Total Dû: ${supplier.totalOwed} DH`, 20, 64);

      const tableData = supplierDeliveries.map(d => [
        d.date,
        d.label,
        d.quantity,
        `${d.totalPrice} DH`
      ]);

      autoTable(doc, {
        startY: 75,
        head: [['Date', 'Produit', 'Qté', 'Prix']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: {
          3: { halign: 'right', fontStyle: 'bold' }
        }
      });
    });

    if (!hasPages) {
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59);
      doc.text(`Facture / Rapport Hebdomadaire`, pageWidth / 2, 20, { align: 'center' });
      doc.setFontSize(14);
      doc.text(`Aucune livraison et aucune dette pour cette semaine.`, pageWidth / 2, 50, { align: 'center' });
    }

    exportPDF(doc, `Toutes_Factures_Cloture_${weekRangeFilename}.pdf`);
    
    // Archiver les livraisons
    setArchivedDeliveries(prev => [...prev, ...deliveries]);

    setSuppliers(suppliers.map(s => ({ ...s, totalOwed: 0 })));
    setDeliveries([]);
    showToast(t('suppliers.weeklySettlementSuccess'), "success");
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('suppliers.title')}</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-outline" onClick={() => { setEditingSupplierId(null); setNewSupplierName(''); setNewSupplierContact(''); setShowSupplierModal(true); }}>
            <Plus size={18} /> {t('suppliers.addSupplier')}
          </button>
          <button className="btn btn-primary" onClick={() => { setEditingDeliveryId(null); setDelSupplierId(''); setDelLabel(''); setDelQuantity(''); setDelTotalPrice(''); setShowDeliveryModal(true); }}>
            <ShoppingBag size={18} /> {t('suppliers.newDelivery')}
          </button>
          {activeTab === 'current' && (
            <button className="btn btn-outline" onClick={handleClotureDimanche} style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>
              <CheckCircle size={18} /> {t('suppliers.closeWeek')}
            </button>
          )}
        </div>
      </div>

      {/* Onglets au niveau de la page */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border-color)', marginBottom: '1.5rem', gap: '2rem' }}>
        <button 
          onClick={() => setActiveTab('current')} 
          style={{ 
            background: 'none', 
            border: 'none', 
            padding: '0.75rem 0.5rem', 
            fontSize: '1rem', 
            fontWeight: 600, 
            color: activeTab === 'current' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'current' ? '3px solid var(--accent-primary)' : '3px solid transparent',
            cursor: 'pointer',
            marginBottom: '-2px',
            transition: 'all 0.2s ease'
          }}
        >
          {t('suppliers.tabCurrent')}
        </button>
        <button 
          onClick={() => setActiveTab('history')} 
          style={{ 
            background: 'none', 
            border: 'none', 
            padding: '0.75rem 0.5rem', 
            fontSize: '1rem', 
            fontWeight: 600, 
            color: activeTab === 'history' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'history' ? '3px solid var(--accent-primary)' : '3px solid transparent',
            cursor: 'pointer',
            marginBottom: '-2px',
            transition: 'all 0.2s ease'
          }}
        >
          {t('suppliers.tabHistory')}
        </button>
      </div>

      {activeTab === 'current' && (
        <div>
          <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
            <input 
              type="text" 
              placeholder={t('common.search')} 
              className="form-input"
              style={{ maxWidth: '350px' }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('suppliers.supplier')}</th>
                  <th>{t('suppliers.contact')}</th>
                  <th>{t('suppliers.amountOwed')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map(supplier => (
                  <tr key={supplier.id}>
                    <td>{supplier.name}</td>
                    <td>{supplier.contact}</td>
                    <td><strong style={{ color: supplier.totalOwed > 0 ? 'var(--danger)' : 'var(--success)' }}>{supplier.totalOwed} DH</strong></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-primary"
                          style={{ padding: '0.5rem' }}
                          title={t('suppliers.newDelivery')}
                          onClick={() => {
                            setEditingDeliveryId(null);
                            setDelLabel('');
                            setDelQuantity('');
                            setDelTotalPrice('');
                            setDelSupplierId(supplier.id);
                            setShowDeliveryModal(true);
                          }}
                        >
                          <Plus size={16} />
                        </button>
                        <button 
                          className="btn btn-outline"
                          onClick={() => {
                            setShowArchiveInModal(false);
                            setSelectedSupplier(supplier);
                          }}
                        >
                          {t('suppliers.deliveryHistory')}
                        </button>
                        <button 
                          className="btn btn-outline"
                          onClick={() => handleEditSupplier(supplier)}
                          title={t('suppliers.editSupplier')}
                          style={{ padding: '0.5rem' }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="btn btn-danger"
                          onClick={() => handleDeleteSupplier(supplier.id)}
                          title={t('suppliers.confirmDeleteSupplier')}
                          style={{ padding: '0.5rem' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredSuppliers.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>{t('common.search')}</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: 'rgba(0, 0, 0, 0.02)', fontWeight: 'bold', borderTop: '2px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem 1.5rem' }}>{t('suppliers.totalAmountOwed')}</td>
                  <td></td>
                  <td style={{ padding: '1rem 1.5rem', color: suppliers.reduce((sum, s) => sum + s.totalOwed, 0) > 0 ? 'var(--danger)' : 'var(--success)', fontSize: '1.05rem' }}>
                    <strong>{suppliers.reduce((sum, s) => sum + s.totalOwed, 0)} DH</strong>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Table of active deliveries of the week */}
          <div style={{ marginTop: '2.5rem' }}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.3rem', fontWeight: 600 }}>
              {t('suppliers.activeDeliveriesTitle')}
            </h2>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('common.date')}</th>
                    <th>{t('suppliers.supplier')}</th>
                    <th>{t('suppliers.product')}</th>
                    <th>{t('suppliers.quantity')}</th>
                    <th>{t('suppliers.price')}</th>
                    <th>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map(d => {
                    const supplier = suppliers.find(s => s.id === d.supplierId);
                    return (
                      <tr key={d.id}>
                        <td>{d.date}</td>
                        <td><strong>{supplier ? supplier.name : t('common.unknown')}</strong></td>
                        <td>{d.label}</td>
                        <td>{d.quantity}</td>
                        <td><strong>{d.totalPrice} DH</strong></td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '0.25rem', cursor: 'pointer' }}
                              title={t('suppliers.editDelivery')}
                              onClick={() => handleEditDelivery(d)}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              className="btn" 
                              style={{ padding: '0.25rem', backgroundColor: 'transparent', color: 'var(--danger)', cursor: 'pointer' }}
                              title={t('suppliers.confirmDeleteDelivery')}
                              onClick={() => handleDeleteActiveDelivery(d.id, d.supplierId, d.totalPrice)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {deliveries.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                        {t('suppliers.noArchivedDeliveries')}
                      </td>
                    </tr>
                  )}
                </tbody>
                {deliveries.length > 0 && (
                  <tfoot>
                    <tr style={{ backgroundColor: 'rgba(0, 0, 0, 0.02)', fontWeight: 'bold' }}>
                      <td colSpan={4} style={{ padding: '1rem 1.5rem' }}>{t('suppliers.tabCurrent')}</td>
                      <td colSpan={2} style={{ padding: '1rem 1.5rem', color: 'var(--danger)' }}>
                        <strong>{deliveries.reduce((sum, d) => sum + Number(d.totalPrice), 0)} DH</strong>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          {/* KPIs */}
          <div className="kpi-grid">
            <div className="kpi-card" style={{ flex: 1 }}>
              <div className="kpi-content">
                <div className="kpi-label">{t('suppliers.deliveryHistory')}</div>
                <div className="kpi-value">{sortedFilteredHistory.length}</div>
              </div>
            </div>
            <div className="kpi-card" style={{ flex: 1 }}>
              <div className="kpi-content">
                <div className="kpi-label">{t('suppliers.totalDette')}</div>
                <div className="kpi-value" style={{ color: 'var(--accent-primary)' }}>
                  {sortedFilteredHistory.reduce((sum, d) => sum + Number(d.totalPrice), 0)} DH
                </div>
              </div>
            </div>
          </div>

          {/* Filtres */}
          <div 
            style={{ 
              backgroundColor: 'var(--bg-secondary)', 
              borderRadius: 'var(--radius-lg)', 
              padding: '1.5rem', 
              boxShadow: 'var(--shadow-sm)', 
              border: '1px solid var(--border-color)', 
              marginBottom: '1.5rem' 
            }}
          >
            <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>{t('reports.summaryTableTitle')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t('suppliers.supplier')}</label>
                <select 
                  className="form-input"
                  value={historySupplierId}
                  onChange={e => setHistorySupplierId(e.target.value)}
                >
                  <option value="">{t('suppliers.allSuppliers')}</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t('suppliers.searchProduct')}</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder={t('suppliers.searchProduct')} 
                  value={historySearchQuery}
                  onChange={e => setHistorySearchQuery(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t('suppliers.startDate')}</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={historyStartDate}
                  onChange={e => setHistoryStartDate(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t('suppliers.endDate')}</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={historyEndDate}
                  onChange={e => setHistoryEndDate(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn btn-outline" 
                  style={{ flex: 1, padding: '0.75rem' }} 
                  onClick={() => {
                    setHistorySupplierId('');
                    setHistorySearchQuery('');
                    setHistoryStartDate('');
                    setHistoryEndDate('');
                  }}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>

          {/* Actions de l'historique */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <button className="btn btn-primary" onClick={handleExportHistoryPDF} disabled={sortedFilteredHistory.length === 0}>
              <Download size={18} /> {t('suppliers.exportHistory')}
            </button>
            {archivedDeliveries.length > 0 && (
              <button className="btn btn-danger" onClick={handleClearHistory}>
                <Trash2 size={18} /> {t('suppliers.clearHistory')}
              </button>
            )}
          </div>

          {/* Table */}
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('common.date')}</th>
                  <th>{t('suppliers.supplier')}</th>
                  <th>{t('suppliers.product')}</th>
                  <th>{t('suppliers.quantity')}</th>
                  <th>{t('suppliers.price')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedFilteredHistory.map(d => (
                  <tr key={d.id}>
                    <td>{d.date}</td>
                    <td><strong>{getSupplierName(d.supplierId)}</strong></td>
                    <td>{d.label}</td>
                    <td>{d.quantity}</td>
                    <td><strong>{d.totalPrice} DH</strong></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '0.25rem', cursor: 'pointer' }}
                          title={t('suppliers.editDelivery')}
                          onClick={() => handleEditDelivery(d)}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="btn" 
                          style={{ padding: '0.25rem', backgroundColor: 'transparent', color: 'var(--danger)', cursor: 'pointer' }}
                          title={t('suppliers.confirmDeleteDeliveryHistory')}
                          onClick={() => handleDeleteArchivedDelivery(d.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sortedFilteredHistory.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                      {t('suppliers.noArchivedDeliveries')}
                    </td>
                  </tr>
                )}
              </tbody>
              {sortedFilteredHistory.length > 0 && (
                <tfoot>
                  <tr style={{ backgroundColor: 'rgba(0, 0, 0, 0.02)', fontWeight: 'bold' }}>
                    <td colSpan={4} style={{ padding: '1rem 1.5rem' }}>{t('suppliers.tabHistory')}</td>
                    <td colSpan={2} style={{ padding: '1rem 1.5rem', color: 'var(--accent-primary)' }}>
                      <strong>{sortedFilteredHistory.reduce((sum, d) => sum + Number(d.totalPrice), 0)} DH</strong>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Voir Livraisons */}
      {selectedSupplier && (
        <div className="modal-overlay" onClick={() => setSelectedSupplier(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <h2 style={{ marginBottom: '1rem' }}>{t('suppliers.deliveryHistory')} : {selectedSupplier.name}</h2>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button 
                className={`btn ${!showArchiveInModal ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setShowArchiveInModal(false)}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              >
                {t('suppliers.tabCurrent')}
              </button>
              <button 
                className={`btn ${showArchiveInModal ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setShowArchiveInModal(true)}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              >
                {t('suppliers.tabHistory')}
              </button>
            </div>

            <div className="table-container" style={{ marginBottom: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('common.date')}</th>
                    <th>{t('suppliers.product')}</th>
                    <th>{t('suppliers.quantity')}</th>
                    <th>{t('suppliers.price')}</th>
                    <th>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(!showArchiveInModal ? getDeliveriesForSupplier(selectedSupplier.id) : getArchivedDeliveriesForSupplier(selectedSupplier.id)).map(d => (
                    <tr key={d.id}>
                      <td>{d.date}</td>
                      <td>{d.label}</td>
                      <td>{d.quantity}</td>
                      <td><strong>{d.totalPrice} DH</strong></td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '0.25rem', cursor: 'pointer' }}
                            title={t('suppliers.editDelivery')}
                            onClick={() => handleEditDelivery(d)}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            className="btn" 
                            style={{ padding: '0.25rem', backgroundColor: 'transparent', color: 'var(--danger)', cursor: 'pointer' }}
                            title={t('suppliers.confirmDeleteDelivery')}
                            onClick={() => {
                              if (!showArchiveInModal) {
                                handleDeleteActiveDelivery(d.id, selectedSupplier.id, d.totalPrice);
                              } else {
                                handleDeleteArchivedDelivery(d.id);
                              }
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!showArchiveInModal ? getDeliveriesForSupplier(selectedSupplier.id) : getArchivedDeliveriesForSupplier(selectedSupplier.id)).length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                        {showArchiveInModal ? t('suppliers.noArchivedDeliveries') : t('suppliers.noArchivedDeliveries')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {!showArchiveInModal ? (
                <h3 style={{ color: 'var(--danger)' }}>{t('suppliers.totalAmountOwed')} : {selectedSupplier.totalOwed} DH</h3>
              ) : (
                <h3 style={{ color: 'var(--text-secondary)' }}>
                  {t('suppliers.totalDette')} : {getArchivedDeliveriesForSupplier(selectedSupplier.id).reduce((sum, d) => sum + Number(d.totalPrice), 0)} DH
                </h3>
              )}
              <button className="btn btn-outline" onClick={() => setSelectedSupplier(null)}>{t('suppliers.closeBtn')}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Nouvelle Livraison (Dépense) */}
      {showDeliveryModal && (
        <div className="modal-overlay" onClick={() => setShowDeliveryModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1.5rem' }}>{editingDeliveryId ? t('suppliers.editDelivery') : t('suppliers.newDelivery')}</h2>
            <form onSubmit={handleAddDelivery}>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label">{t('suppliers.supplier')}</label>
                  <a href="#" onClick={(e) => { e.preventDefault(); setShowSupplierModal(true); }} style={{ fontSize: '0.875rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
                    + {t('suppliers.addSupplier')}
                  </a>
                </div>
                <select 
                  className="form-input" 
                  value={delSupplierId}
                  onChange={e => setDelSupplierId(e.target.value)}
                  required
                >
                  <option value="">-- {t('suppliers.selectSupplier')} --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{t('suppliers.deliveryDate')}</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={delDate}
                  onChange={e => setDelDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('suppliers.productLabel')}</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder={t('suppliers.productPlaceholder')} 
                  value={delLabel}
                  onChange={e => setDelLabel(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">{t('suppliers.quantityLabel')}</label>
                  <input 
                    type="number" 
                    inputMode="decimal"
                    className="form-input" 
                    placeholder={t('suppliers.quantityPlaceholder')}
                    min="1"
                    value={delQuantity}
                    onChange={e => setDelQuantity(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">{t('suppliers.totalPrice')}</label>
                  <input 
                    type="number" 
                    inputMode="decimal"
                    className="form-input" 
                    placeholder={t('suppliers.totalPricePlaceholder')}
                    min="0"
                    step="0.01"
                    value={delTotalPrice}
                    onChange={e => setDelTotalPrice(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => { setEditingDeliveryId(null); setShowDeliveryModal(false); }}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary">{editingDeliveryId ? t('common.save') : t('suppliers.addDeliveryBtn')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Nouveau Fournisseur */}
      {showSupplierModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowSupplierModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1.5rem' }}>{editingSupplierId ? t('suppliers.editSupplier') : t('suppliers.newSupplier')}</h2>
            <div className="form-group">
              <label className="form-label">{t('suppliers.fullName')}</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ex: Boulangerie Centrale" 
                value={newSupplierName}
                onChange={e => setNewSupplierName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('suppliers.phoneContact')}</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Téléphone ou Email" 
                value={newSupplierContact}
                onChange={e => setNewSupplierContact(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button className="btn btn-outline" onClick={() => { setEditingSupplierId(null); setShowSupplierModal(false); }}>{t('common.cancel')}</button>
              <button className="btn btn-primary" onClick={handleAddSupplier}>{editingSupplierId ? t('common.save') : t('suppliers.saveSupplier')}</button>
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

export default Suppliers;
