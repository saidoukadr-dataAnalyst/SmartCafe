import React from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Download, 
  DollarSign, 
  ShoppingCart,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import { exportPDF } from '../pdfHelper';
import { exportCSV } from '../csvHelper';
import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

// Helper: format Date to local YYYY-MM-DD string without timezone shifting
const formatDateLocal = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Helper: get Monday of the current week (no date mutation)
const getMondayOfWeek = (): Date => {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
  return monday;
};



import type { DailyIncome, Delivery, Supplier } from '../types';

interface PayrollRecord {
  date: string;
  amount: number;
}

interface ChartDataPoint {
  name: string;
  Fournisseurs: number;
  Personnel: number;
  Revenu: number;
}

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const [cafeName] = React.useState(() => localStorage.getItem('app_cafe_name') || 'SmartCafe');
  const [showMondayPrompt, setShowMondayPrompt] = React.useState<boolean>(() => {
    // 1. Check if today is Monday (1)
    const today = new Date();
    const isMonday = today.getDay() === 1;
    if (!isMonday) return false;

    // 2. Check if already prompted today
    const todayStr = today.toISOString().split('T')[0];
    const lastPrompt = localStorage.getItem('app_last_monday_prompt');
    if (lastPrompt === todayStr) return false;

    // 3. Check if there are active deliveries or suppliers with debt
    const savedDeliveries = localStorage.getItem('app_deliveries');
    const activeDels = savedDeliveries ? JSON.parse(savedDeliveries) : [];
    
    const savedSuppliers = localStorage.getItem('app_suppliers');
    const sups: Supplier[] = savedSuppliers ? JSON.parse(savedSuppliers) : [];
    const hasDebts = sups.some((s: Supplier) => s.totalOwed > 0);

    return activeDels.length > 0 || hasDebts;
  });

  const handleMondayCloseConfirm = () => {
    const savedDeliveries = localStorage.getItem('app_deliveries');
    const deliveries: Delivery[] = savedDeliveries ? JSON.parse(savedDeliveries) : [];
    
    const savedSuppliers = localStorage.getItem('app_suppliers');
    const suppliers: Supplier[] = savedSuppliers ? JSON.parse(savedSuppliers) : [];

    if (deliveries.length === 0 && suppliers.reduce((sum, s) => sum + s.totalOwed, 0) === 0) {
      setShowMondayPrompt(false);
      return;
    }

    // Previous week Monday to Sunday
    const today = new Date();
    const distanceToMonday = today.getDay() === 0 ? 6 : today.getDay() - 1;
    const prevMonday = new Date(today);
    prevMonday.setDate(today.getDate() - distanceToMonday - 7);
    
    const sunday = new Date(prevMonday);
    sunday.setDate(prevMonday.getDate() + 6);
    
    const formatWeekDate = (d: Date) => {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return `${dd}-${mm}`;
    };
    
    const weekRangeStr = `${formatWeekDate(prevMonday)} au ${formatWeekDate(sunday)}`;
    const weekRangeFilename = `${formatWeekDate(prevMonday)}_au_${formatWeekDate(sunday)}`;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let hasPages = false;

    suppliers.forEach((supplier) => {
      const supplierDeliveries = deliveries.filter(d => d.supplierId === supplier.id);
      if (supplierDeliveries.length === 0 && supplier.totalOwed === 0) return;

      if (hasPages) doc.addPage();
      hasPages = true;

      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59);
      doc.text(`Facture / Rapport Hebdomadaire`, pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139);
      doc.text(`Période : Semaine du ${weekRangeStr}`, pageWidth / 2, 28, { align: 'center' });

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
      doc.setTextColor(239, 68, 68);
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

    if (hasPages) {
      exportPDF(doc, `Toutes_Factures_Cloture_${weekRangeFilename}.pdf`);
    }

    // Archive deliveries
    const savedArchive = localStorage.getItem('app_deliveries_archive');
    const archived = savedArchive ? JSON.parse(savedArchive) : [];
    localStorage.setItem('app_deliveries_archive', JSON.stringify([...archived, ...deliveries]));

    // Reset debts and active deliveries
    const updatedSuppliers = suppliers.map(s => ({ ...s, totalOwed: 0 }));
    localStorage.setItem('app_suppliers', JSON.stringify(updatedSuppliers));
    localStorage.setItem('app_deliveries', JSON.stringify([]));

    localStorage.setItem('app_last_monday_prompt', today.toISOString().split('T')[0]);
    setShowMondayPrompt(false);
    window.location.reload();
  };

  const handleMondayCloseLater = () => {
    localStorage.setItem('app_last_monday_prompt', new Date().toISOString().split('T')[0]);
    setShowMondayPrompt(false);
  };

  const currentMonthName = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());

  const { chartData, weeklyIncome, weeklyExpenses, monthlyChartData } = React.useMemo(() => {
    const monday = getMondayOfWeek();

    // Parse localStorage data once
    const savedIncomes = localStorage.getItem('app_incomes');
    const incomes: DailyIncome[] = savedIncomes ? JSON.parse(savedIncomes) : [];

    const savedDeliveries = localStorage.getItem('app_deliveries');
    const savedArchive = localStorage.getItem('app_deliveries_archive');
    const activeDeliveries: Delivery[] = savedDeliveries ? JSON.parse(savedDeliveries) : [];
    const allDeliveries: Delivery[] = [
      ...activeDeliveries,
      ...(savedArchive ? JSON.parse(savedArchive) : [])
    ];

    // Payroll records (validated payments)
    const savedPayroll = localStorage.getItem('app_payroll');
    const payroll: PayrollRecord[] = savedPayroll ? JSON.parse(savedPayroll) : [];

    // === BUILD WEEKLY CHART (7 days, real data) ===
    // Group all weekly expenses on Sunday
    let weeklyFournisseursTotal = 0;
    let weeklyPersonnelTotal = 0;

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const dayStr = formatDateLocal(dayDate);

      const dayDeliveries = activeDeliveries.filter((d: Delivery) => d.date === dayStr);
      weeklyFournisseursTotal += dayDeliveries.reduce((sum: number, d: Delivery) => sum + Number(d.totalPrice), 0);

      const dayPayroll = payroll.filter((p: PayrollRecord) => p.date === dayStr);
      weeklyPersonnelTotal += dayPayroll.reduce((sum: number, p: PayrollRecord) => sum + p.amount, 0);
    }

    const weekChart: ChartDataPoint[] = dayNames.map((name, index) => {
      const dayDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index);
      const dayStr = formatDateLocal(dayDate);
      const dateLabel = dayDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

      const dayIncome = incomes.find((i: DailyIncome) => i.date === dayStr);
      const dayRevenu = dayIncome ? dayIncome.amount : 0;

      // Group weekly expenses on Sunday (index 6)
      const isSunday = index === 6;
      const dayFournisseurs = isSunday ? weeklyFournisseursTotal : 0;
      const dayPersonnel = isSunday ? weeklyPersonnelTotal : 0;

      return {
        name: `${name} ${dateLabel}`,
        Fournisseurs: dayFournisseurs,
        Personnel: dayPersonnel,
        Revenu: dayRevenu
      };
    });

    // === WEEKLY KPI ===
    const totalWeeklyIncome = weekChart.reduce((acc, curr) => acc + curr.Revenu, 0);
    const totalWeeklyExpenses = weekChart.reduce((acc, curr) => acc + curr.Fournisseurs + curr.Personnel, 0);

    // === BUILD MONTHLY CHART (4 standard weeks, real data) ===
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // Find last day of the current month
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

    const weeksDefinition = [
      { start: 1, end: 7, label: "01-07" },
      { start: 8, end: 14, label: "08-14" },
      { start: 15, end: 21, label: "15-21" },
      { start: 22, end: lastDayOfMonth, label: `22-${String(lastDayOfMonth).padStart(2, '0')}` }
    ];

    const monthChart: ChartDataPoint[] = weeksDefinition.map((w) => {
      let weekRevenu = 0;
      let weekFournisseurs = 0;
      let weekPersonnel = 0;

      for (let day = w.start; day <= w.end; day++) {
        const dayDate = new Date(year, month, day);
        const dayStr = formatDateLocal(dayDate);

        const dayIncome = incomes.find((inc: DailyIncome) => inc.date === dayStr);
        if (dayIncome) weekRevenu += dayIncome.amount;

        const dayDels = allDeliveries.filter((del: Delivery) => del.date === dayStr);
        weekFournisseurs += dayDels.reduce((sum: number, d: Delivery) => sum + Number(d.totalPrice), 0);

        const dayPay = payroll.filter((p: PayrollRecord) => p.date === dayStr);
        weekPersonnel += dayPay.reduce((sum: number, p: PayrollRecord) => sum + p.amount, 0);
      }

      return {
        name: `Sem. ${w.label}`,
        Fournisseurs: weekFournisseurs,
        Personnel: weekPersonnel,
        Revenu: weekRevenu
      };
    });

    return {
      chartData: weekChart,
      weeklyIncome: totalWeeklyIncome,
      weeklyExpenses: totalWeeklyExpenses,
      monthlyChartData: monthChart
    };
  }, []);

  const netProfit = weeklyIncome - weeklyExpenses;

  // Week range without date mutation
  const getWeekRange = () => {
    const monday = getMondayOfWeek();
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
    return `(du ${monday.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} au ${sunday.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })})`;
  };

  const handleExport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text(`Rapport Hebdomadaire Global`, pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(100, 116, 139);
    doc.text(getWeekRange(), pageWidth / 2, 28, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`Édité le : ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, 36, { align: 'center' });
    
    // Calculate weekly sums from the daily chartData
    const weeklyFournisseurs = chartData.reduce((acc, curr) => acc + curr.Fournisseurs, 0);
    const weeklyPersonnel = chartData.reduce((acc, curr) => acc + curr.Personnel, 0);
    const weeklyRevenu = chartData.reduce((acc, curr) => acc + curr.Revenu, 0);
    const net = weeklyRevenu - weeklyFournisseurs - weeklyPersonnel;

    autoTable(doc, {
      startY: 50,
      head: [['Catégorie', 'Montant (DH)']],
      body: [
        ['Chiffre d\'Affaires (Revenus)', weeklyRevenu],
        ['Dépenses Fournisseurs', weeklyFournisseurs],
        ['Salaires du Personnel', weeklyPersonnel],
        ['Total Dépenses', weeklyFournisseurs + weeklyPersonnel],
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 12, cellPadding: 6 },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [30, 41, 59] },
        1: { halign: 'right', textColor: [30, 41, 59] },
      },
    });

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
    doc.text('Bénéfice Net (Semaine) :', 20, finalY + 23);
    
    const profitColor = net >= 0 ? [16, 185, 129] : [239, 68, 68];
    doc.setTextColor(profitColor[0], profitColor[1], profitColor[2]);
    doc.text(`${net} DH`, pageWidth - 20, finalY + 23, { align: 'right' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text("Ce rapport inclut la synthèse globale de la semaine. Les factures détaillées par", 20, finalY + 45);
    doc.text("fournisseur sont générées lors de la Clôture du Dimanche dans l'onglet Fournisseurs.", 20, finalY + 50);

    exportPDF(doc, "Rapport_Hebdomadaire.pdf");
  };



  const handleExportWeeklyCSV = () => {
    let csv = `Categorie;Montant (DH)\n`;
    const weeklyFournisseurs = chartData.reduce((acc, curr) => acc + curr.Fournisseurs, 0);
    const weeklyPersonnel = chartData.reduce((acc, curr) => acc + curr.Personnel, 0);
    const weeklyRevenu = chartData.reduce((acc, curr) => acc + curr.Revenu, 0);
    
    csv += `Chiffre d'Affaires (Revenus);${weeklyRevenu}\n`;
    csv += `Dépenses Fournisseurs;${weeklyFournisseurs}\n`;
    csv += `Salaires du Personnel;${weeklyPersonnel}\n`;
    csv += `Total Dépenses;${weeklyFournisseurs + weeklyPersonnel}\n`;
    csv += `Bénéfice Net;${weeklyRevenu - weeklyFournisseurs - weeklyPersonnel}\n`;
    
    exportCSV(csv, `Rapport_Hebdomadaire_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>{t('dashboard.title')}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{cafeName}</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', fontWeight: 700, letterSpacing: '0.5px' }}>By Oukadr</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary" onClick={handleExport}>
              <Download size={18} /> {t('common.exportPDF')}
            </button>
            <button className="btn btn-outline" onClick={handleExportWeeklyCSV} style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
              <FileSpreadsheet size={18} /> {t('common.exportCSV')}
            </button>
          </div>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card" style={{ flex: 1 }}>
          <div className="kpi-icon" style={{ color: 'var(--success)', backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
            <TrendingUp size={24} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">{t('dashboard.revenue')}</div>
            <div className="kpi-value" style={{ color: 'var(--success)' }}>{weeklyIncome} DH</div>
          </div>
        </div>

        <div className="kpi-card" style={{ flex: 1 }}>
          <div className="kpi-icon" style={{ color: 'var(--danger)', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
            <ShoppingCart size={24} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">{t('dashboard.supplierExpenses')}</div>
            <div className="kpi-value" style={{ color: 'var(--danger)' }}>{weeklyExpenses} DH</div>
          </div>
        </div>

        <div className="kpi-card" style={{ flex: 1 }}>
          <div className="kpi-icon" style={{ color: 'var(--accent-primary)', backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
            <DollarSign size={24} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">{t('dashboard.netProfit')}</div>
            <div className="kpi-value" style={{ color: netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {netProfit} DH
            </div>
          </div>
        </div>
      </div>

      <div className="chart-container">
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 600 }}>
          Bilan de la Semaine Courante {getWeekRange()}
        </h2>
        <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
              <Legend />
              <Bar dataKey="Fournisseurs" stackId="depenses" fill="#3b82f6" radius={[0, 0, 0, 0]} name="Fournisseurs" />
              <Bar dataKey="Personnel" stackId="depenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Personnel" />
              <Bar dataKey="Revenu" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenu (Chiffre d'Affaires)" label={{ position: 'top', fill: '#10b981', fontSize: 10, fontWeight: 'bold' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-container" style={{ marginTop: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 600 }}>
          Bilan du Mois de {currentMonthName}
        </h2>
        <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={monthlyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
              <Legend />
              <Bar dataKey="Fournisseurs" stackId="depenses" fill="#3b82f6" radius={[0, 0, 0, 0]} name="Fournisseurs" />
              <Bar dataKey="Personnel" stackId="depenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Personnel" />
              <Bar dataKey="Revenu" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenu (Chiffre d'Affaires)" label={{ position: 'top', fill: '#10b981', fontSize: 10, fontWeight: 'bold' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* MODAL: Monday Weekly Close Prompt */}
      {showMondayPrompt && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="modal-content" style={{ maxWidth: '500px', textAlign: 'center', padding: '2rem' }}>
            <h2 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>{t('suppliers.mondayResetTitle')}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.6' }}>
              {t('suppliers.mondayResetMessage')}
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn btn-outline" onClick={handleMondayCloseLater}>
                {t('suppliers.mondayResetLater')}
              </button>
              <button className="btn btn-primary" onClick={handleMondayCloseConfirm}>
                {t('suppliers.mondayResetConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
