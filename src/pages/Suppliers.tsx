import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { exportPDF } from '../pdfHelper';
import { Plus, CheckCircle, Trash2, ShoppingBag, Download } from 'lucide-react';
import { mockSuppliers, mockDeliveries } from '../mockData';
import type { Supplier, Delivery } from '../types';

// Helper: format Date to local YYYY-MM-DD string without timezone shifting
const formatDateLocal = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const Suppliers: React.FC = () => {
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
    return supplier ? supplier.name : `Fournisseur inconnu (ID: ${id})`;
  };
  
  // New Supplier Form
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierContact, setNewSupplierContact] = useState('');

  // New Delivery Form
  const [delSupplierId, setDelSupplierId] = useState('');
  const [delDate, setDelDate] = useState(formatDateLocal(new Date()));
  const [delLabel, setDelLabel] = useState('');
  const [delQuantity, setDelQuantity] = useState<number | ''>('');
  const [delTotalPrice, setDelTotalPrice] = useState<number | ''>('');

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
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce fournisseur ? Toutes ses livraisons associées seront ignorées.")) {
      setSuppliers(suppliers.filter(s => s.id !== id));
      setDeliveries(deliveries.filter(d => d.supplierId !== id));
    }
  };

  const handleDeleteActiveDelivery = (deliveryId: string, supplierId: string, price: number) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette livraison ?")) {
      setDeliveries(deliveries.filter(d => d.id !== deliveryId));
      setSuppliers(suppliers.map(s => 
        s.id === supplierId 
          ? { ...s, totalOwed: Math.max(0, s.totalOwed - price) }
          : s
      ));
    }
  };

  const handleDeleteArchivedDelivery = (deliveryId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette livraison de l'historique ?")) {
      setArchivedDeliveries(archivedDeliveries.filter(d => d.id !== deliveryId));
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Êtes-vous sûr de vouloir effacer l'intégralité de l'historique archivé ? Cette action est irréversible.")) {
      setArchivedDeliveries([]);
    }
  };

  const handleExportHistoryPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Historique des Livraisons Fournisseurs", 20, 20);
    doc.setFontSize(11);
    doc.text(`Généré le : ${new Date().toLocaleDateString('fr-FR')}`, 20, 28);
    
    // Filters summary
    let filterText = "Filtres appliqués : ";
    if (historySupplierId) {
      filterText += `Fournisseur: ${getSupplierName(historySupplierId)} | `;
    } else {
      filterText += "Tous les fournisseurs | ";
    }
    if (historySearchQuery) filterText += `Recherche: "${historySearchQuery}" | `;
    if (historyStartDate || historyEndDate) {
      filterText += `Période: ${historyStartDate || 'Début'} à ${historyEndDate || 'Fin'}`;
    }
    doc.setFontSize(9);
    doc.text(filterText, 20, 35);
    
    let yOffset = 45;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text("Date", 20, yOffset);
    doc.text("Fournisseur", 50, yOffset);
    doc.text("Produit / Label", 100, yOffset);
    doc.text("Qté", 160, yOffset);
    doc.text("Prix", 180, yOffset);
    doc.setFont('helvetica', 'normal');
    yOffset += 8;
    
    doc.setLineWidth(0.5);
    doc.line(20, yOffset - 3, 195, yOffset - 3);
    
    sortedFilteredHistory.forEach((d) => {
      if (yOffset > 270) {
        doc.addPage();
        yOffset = 20;
        // Repeat headers
        doc.setFont('helvetica', 'bold');
        doc.text("Date", 20, yOffset);
        doc.text("Fournisseur", 50, yOffset);
        doc.text("Produit / Label", 100, yOffset);
        doc.text("Qté", 160, yOffset);
        doc.text("Prix", 180, yOffset);
        doc.setFont('helvetica', 'normal');
        yOffset += 8;
        doc.line(20, yOffset - 3, 195, yOffset - 3);
      }
      
      const supplierName = getSupplierName(d.supplierId);
      const truncatedSupplier = supplierName.length > 20 ? supplierName.slice(0, 18) + ".." : supplierName;
      const truncatedLabel = d.label.length > 28 ? d.label.slice(0, 26) + ".." : d.label;
      
      doc.text(`${d.date}`, 20, yOffset);
      doc.text(`${truncatedSupplier}`, 50, yOffset);
      doc.text(`${truncatedLabel}`, 100, yOffset);
      doc.text(`${d.quantity}`, 160, yOffset);
      doc.text(`${d.totalPrice} DH`, 180, yOffset);
      yOffset += 7;
    });
    
    const grandTotal = sortedFilteredHistory.reduce((sum, d) => sum + Number(d.totalPrice), 0);
    yOffset += 5;
    doc.line(20, yOffset - 3, 195, yOffset - 3);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total :`, 20, yOffset);
    doc.text(`${sortedFilteredHistory.length} livraison(s)`, 50, yOffset);
    doc.text(`${grandTotal} DH`, 180, yOffset);
    
    exportPDF(doc, `Historique_Livraisons_Fournisseurs.pdf`);
  };

  const handleAddSupplier = () => {
    if (newSupplierName.trim()) {
      const newSupplier = {
        id: Date.now().toString(),
        name: newSupplierName,
        contact: newSupplierContact,
        totalOwed: 0
      };
      setSuppliers([...suppliers, newSupplier]);
      
      // Auto-select for delivery if we came from delivery modal
      if (showDeliveryModal) {
        setDelSupplierId(newSupplier.id);
      }
      
      setNewSupplierName('');
      setNewSupplierContact('');
      setShowSupplierModal(false);
    } else {
      alert("Le nom du fournisseur est obligatoire.");
    }
  };

  const handleAddDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!delSupplierId || !delLabel || !delQuantity || !delTotalPrice) {
      alert("Veuillez remplir tous les champs obligatoires.");
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

    setDeliveries([...deliveries, newDelivery]);
    
    // Update supplier totalowed
    setSuppliers(suppliers.map(s => 
      s.id === delSupplierId 
        ? { ...s, totalOwed: s.totalOwed + Number(delTotalPrice) }
        : s
    ));

    // Reset form
    setDelLabel('');
    setDelQuantity('');
    setDelTotalPrice('');
    setShowDeliveryModal(false);
    alert("Dépense / Livraison enregistrée avec succès !");
  };

  const handleClotureDimanche = () => {
    const activeDeliveriesCount = deliveries.length;
    const activeDettes = suppliers.reduce((sum, s) => sum + s.totalOwed, 0);

    if (activeDeliveriesCount === 0 && activeDettes === 0) {
      alert("Aucune livraison ni dette à clôturer cette semaine.");
      return;
    }

    if (!window.confirm(`Êtes-vous sûr de vouloir effectuer la clôture du Dimanche ? Cette action va réinitialiser les dettes, générer les factures PDF pour chaque fournisseur actif, et archiver ${activeDeliveriesCount} livraisons.`)) {
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
      return `${dd}/${mm}`;
    };
    
    const weekRangeStr = `${formatWeekDate(monday)} au ${formatWeekDate(sunday)}`;
    const weekRangeFilename = `${formatWeekDate(monday)}_au_${formatWeekDate(sunday)}`;

    const doc = new jsPDF();
    let hasPages = false;

    suppliers.forEach((supplier) => {
      const supplierDeliveries = getDeliveriesForSupplier(supplier.id);
      if (supplierDeliveries.length === 0 && supplier.totalOwed === 0) return;

      if (hasPages) {
        doc.addPage();
      }
      hasPages = true;

      doc.setFontSize(20);
      doc.text(`Facture / Rapport Hebdomadaire`, 20, 20);
      doc.setFontSize(12);
      doc.text(`Période : Semaine du ${weekRangeStr}`, 20, 28);
      
      doc.setFontSize(14);
      doc.text(`Fournisseur: ${supplier.name}`, 20, 42);
      doc.text(`Contact: ${supplier.contact}`, 20, 52);
      doc.text(`Montant Total Dû: ${supplier.totalOwed} DH`, 20, 62);
      
      let yOffset = 82;
      doc.setFontSize(12);
      doc.text('Détail des livraisons de la semaine:', 20, yOffset);
      yOffset += 10;
      
      doc.setFont('helvetica', 'bold');
      doc.text(`Date`, 20, yOffset);
      doc.text(`Produit`, 50, yOffset);
      doc.text(`Qté`, 120, yOffset);
      doc.text(`Prix`, 150, yOffset);
      doc.setFont('helvetica', 'normal');
      yOffset += 10;

      supplierDeliveries.forEach(d => {
        doc.text(`${d.date}`, 20, yOffset);
        doc.text(`${d.label}`, 50, yOffset);
        doc.text(`${d.quantity}`, 120, yOffset);
        doc.text(`${d.totalPrice} DH`, 150, yOffset);
        yOffset += 10;
      });
    });

    if (!hasPages) {
      doc.setFontSize(20);
      doc.text(`Facture / Rapport Hebdomadaire`, 20, 20);
      doc.setFontSize(12);
      doc.text(`Période : Semaine du ${weekRangeStr}`, 20, 28);
      doc.setFontSize(14);
      doc.text(`Aucune livraison et aucune dette pour cette semaine.`, 20, 50);
    }

    exportPDF(doc, `Toutes_Factures_Cloture_${weekRangeFilename}.pdf`);
    
    // Archiver les livraisons
    setArchivedDeliveries(prev => [...prev, ...deliveries]);

    setSuppliers(suppliers.map(s => ({ ...s, totalOwed: 0 })));
    setDeliveries([]);
    alert("Clôture du Dimanche effectuée ! Les dettes ont été réglées, les PDF générés, et les livraisons archivées.");
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Gestion des Fournisseurs</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-outline" onClick={() => setShowSupplierModal(true)}>
            <Plus size={18} /> Ajouter Fournisseur
          </button>
          <button className="btn btn-primary" onClick={() => setShowDeliveryModal(true)}>
            <ShoppingBag size={18} /> Saisir Dépense
          </button>
          {activeTab === 'current' && (
            <button className="btn btn-outline" onClick={handleClotureDimanche} style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>
              <CheckCircle size={18} /> Clôture Dimanche
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
          Situation de la Semaine
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
          Historique Global (Archivé)
        </button>
      </div>

      {activeTab === 'current' && (
        <div>
          <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
            <input 
              type="text" 
              placeholder="Rechercher un fournisseur par nom..." 
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
                  <th>Nom du Fournisseur</th>
                  <th>Contact</th>
                  <th>Montant Dû (Semaine)</th>
                  <th>Actions</th>
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
                          title="Saisir une dépense pour ce fournisseur"
                          onClick={() => {
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
                          Voir Livraisons
                        </button>
                        <button 
                          className="btn btn-danger"
                          onClick={() => handleDeleteSupplier(supplier.id)}
                          title="Supprimer ce fournisseur"
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
                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>Aucun fournisseur trouvé.</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: 'rgba(0, 0, 0, 0.02)', fontWeight: 'bold', borderTop: '2px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem 1.5rem' }}>Total Dû (Tous les Fournisseurs)</td>
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
              Détail de toutes les livraisons saisies cette semaine
            </h2>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Fournisseur</th>
                    <th>Produit / Label</th>
                    <th>Quantité</th>
                    <th>Prix Total</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map(d => {
                    const supplier = suppliers.find(s => s.id === d.supplierId);
                    return (
                      <tr key={d.id}>
                        <td>{d.date}</td>
                        <td><strong>{supplier ? supplier.name : 'Inconnu'}</strong></td>
                        <td>{d.label}</td>
                        <td>{d.quantity}</td>
                        <td><strong>{d.totalPrice} DH</strong></td>
                        <td>
                          <button 
                            className="btn" 
                            style={{ padding: '0.25rem', backgroundColor: 'transparent', color: 'var(--danger)', cursor: 'pointer' }}
                            title="Supprimer cette livraison"
                            onClick={() => handleDeleteActiveDelivery(d.id, d.supplierId, d.totalPrice)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {deliveries.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                        Aucune livraison saisie cette semaine.
                      </td>
                    </tr>
                  )}
                </tbody>
                {deliveries.length > 0 && (
                  <tfoot>
                    <tr style={{ backgroundColor: 'rgba(0, 0, 0, 0.02)', fontWeight: 'bold' }}>
                      <td colSpan={4} style={{ padding: '1rem 1.5rem' }}>Total de la Semaine</td>
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
                <div className="kpi-label">Nombre total de Livraisons</div>
                <div className="kpi-value">{sortedFilteredHistory.length}</div>
              </div>
            </div>
            <div className="kpi-card" style={{ flex: 1 }}>
              <div className="kpi-content">
                <div className="kpi-label">Dépense Totale Archivée</div>
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
            <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>Filtres de recherche</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Fournisseur</label>
                <select 
                  className="form-input"
                  value={historySupplierId}
                  onChange={e => setHistorySupplierId(e.target.value)}
                >
                  <option value="">Tous les fournisseurs</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Rechercher par produit</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex: Café, Lait..." 
                  value={historySearchQuery}
                  onChange={e => setHistorySearchQuery(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Date Début</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={historyStartDate}
                  onChange={e => setHistoryStartDate(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Date Fin</label>
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
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>

          {/* Actions de l'historique */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <button className="btn btn-primary" onClick={handleExportHistoryPDF} disabled={sortedFilteredHistory.length === 0}>
              <Download size={18} /> Exporter en PDF
            </button>
            {archivedDeliveries.length > 0 && (
              <button className="btn btn-danger" onClick={handleClearHistory}>
                <Trash2 size={18} /> Vider l'historique
              </button>
            )}
          </div>

          {/* Table */}
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Fournisseur</th>
                  <th>Produit / Label</th>
                  <th>Quantité</th>
                  <th>Prix Total</th>
                  <th>Action</th>
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
                      <button 
                        className="btn" 
                        style={{ padding: '0.25rem', backgroundColor: 'transparent', color: 'var(--danger)', cursor: 'pointer' }}
                        title="Supprimer de l'historique"
                        onClick={() => handleDeleteArchivedDelivery(d.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {sortedFilteredHistory.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                      Aucune livraison trouvée dans l'historique.
                    </td>
                  </tr>
                )}
              </tbody>
              {sortedFilteredHistory.length > 0 && (
                <tfoot>
                  <tr style={{ backgroundColor: 'rgba(0, 0, 0, 0.02)', fontWeight: 'bold' }}>
                    <td colSpan={4} style={{ padding: '1rem 1.5rem' }}>Total Filtré</td>
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
            <h2 style={{ marginBottom: '1rem' }}>Livraisons : {selectedSupplier.name}</h2>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button 
                className={`btn ${!showArchiveInModal ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setShowArchiveInModal(false)}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              >
                Livraisons en cours
              </button>
              <button 
                className={`btn ${showArchiveInModal ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setShowArchiveInModal(true)}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              >
                Historique (Archivé)
              </button>
            </div>

            <div className="table-container" style={{ marginBottom: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Produit / Label</th>
                    <th>Qté</th>
                    <th>Prix Total</th>
                    <th>Action</th>
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
                        <button 
                          className="btn" 
                          style={{ padding: '0.25rem', backgroundColor: 'transparent', color: 'var(--danger)', cursor: 'pointer' }}
                          title="Supprimer cette livraison"
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
                      </td>
                    </tr>
                  ))}
                  {(!showArchiveInModal ? getDeliveriesForSupplier(selectedSupplier.id) : getArchivedDeliveriesForSupplier(selectedSupplier.id)).length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                        {showArchiveInModal ? "Aucune livraison archivée pour ce fournisseur." : "Aucune livraison cette semaine."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {!showArchiveInModal ? (
                <h3 style={{ color: 'var(--danger)' }}>Total Dû : {selectedSupplier.totalOwed} DH</h3>
              ) : (
                <h3 style={{ color: 'var(--text-secondary)' }}>
                  Total Archivé : {getArchivedDeliveriesForSupplier(selectedSupplier.id).reduce((sum, d) => sum + Number(d.totalPrice), 0)} DH
                </h3>
              )}
              <button className="btn btn-outline" onClick={() => setSelectedSupplier(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Nouveau Fournisseur */}
      {showSupplierModal && (
        <div className="modal-overlay" onClick={() => setShowSupplierModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1.5rem' }}>Nouveau Fournisseur</h2>
            <div className="form-group">
              <label className="form-label">Nom du Fournisseur</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ex: Boulangerie Centrale" 
                value={newSupplierName}
                onChange={e => setNewSupplierName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contact</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Téléphone ou Email" 
                value={newSupplierContact}
                onChange={e => setNewSupplierContact(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button className="btn btn-outline" onClick={() => setShowSupplierModal(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleAddSupplier}>Sauvegarder</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Nouvelle Livraison (Dépense) */}
      {showDeliveryModal && (
        <div className="modal-overlay" onClick={() => setShowDeliveryModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1.5rem' }}>Saisir une Dépense (Livraison)</h2>
            <form onSubmit={handleAddDelivery}>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label">Fournisseur</label>
                  <a href="#" onClick={(e) => { e.preventDefault(); setShowSupplierModal(true); }} style={{ fontSize: '0.875rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
                    + Nouveau Fournisseur
                  </a>
                </div>
                <select 
                  className="form-input" 
                  value={delSupplierId}
                  onChange={e => setDelSupplierId(e.target.value)}
                  required
                >
                  <option value="">-- Sélectionner un fournisseur --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Date</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={delDate}
                  onChange={e => setDelDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Label de la chose fournie (Produit)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex: Lait, Farine, Café..." 
                  value={delLabel}
                  onChange={e => setDelLabel(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Quantité</label>
                  <input 
                    type="number" 
                    inputMode="decimal"
                    className="form-input" 
                    placeholder="Ex: 10"
                    min="1"
                    value={delQuantity}
                    onChange={e => setDelQuantity(e.target.value ? Number(e.target.value) : '')}
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Prix Total (DH)</label>
                  <input 
                    type="number" 
                    inputMode="decimal"
                    className="form-input" 
                    placeholder="Ex: 50"
                    min="0"
                    step="0.01"
                    value={delTotalPrice}
                    onChange={e => setDelTotalPrice(e.target.value ? Number(e.target.value) : '')}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowDeliveryModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Enregistrer Dépense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
