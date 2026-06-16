import React from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Download, 
  DollarSign, 
  ShoppingCart,
  TrendingUp
} from 'lucide-react';
import { exportPDF } from '../pdfHelper';
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



const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const [weeklyIncome, setWeeklyIncome] = React.useState(0);
  const [weeklyExpenses, setWeeklyExpenses] = React.useState(0);
  const [chartData, setChartData] = React.useState<any[]>([]);
  const [monthlyChartData, setMonthlyChartData] = React.useState<any[]>([]);

  const currentMonthName = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());

  React.useEffect(() => {
    const monday = getMondayOfWeek();

    // Parse localStorage data once
    const savedIncomes = localStorage.getItem('app_incomes');
    const incomes = savedIncomes ? JSON.parse(savedIncomes) : [];

    const savedDeliveries = localStorage.getItem('app_deliveries');
    const savedArchive = localStorage.getItem('app_deliveries_archive');
    const activeDeliveries = savedDeliveries ? JSON.parse(savedDeliveries) : [];
    const allDeliveries = [
      ...activeDeliveries,
      ...(savedArchive ? JSON.parse(savedArchive) : [])
    ];

    // Payroll records (validated payments)
    const savedPayroll = localStorage.getItem('app_payroll');
    const payroll = savedPayroll ? JSON.parse(savedPayroll) : [];

    // === BUILD WEEKLY CHART (7 days, real data) ===
    // Group all weekly expenses on Sunday
    let weeklyFournisseursTotal = 0;
    let weeklyPersonnelTotal = 0;

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const dayStr = formatDateLocal(dayDate);

      const dayDeliveries = activeDeliveries.filter((d: any) => d.date === dayStr);
      weeklyFournisseursTotal += dayDeliveries.reduce((sum: number, d: any) => sum + Number(d.totalPrice), 0);

      const dayPayroll = payroll.filter((p: any) => p.date === dayStr);
      weeklyPersonnelTotal += dayPayroll.reduce((sum: number, p: any) => sum + p.amount, 0);
    }

    const weekChart = dayNames.map((name, index) => {
      const dayDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index);
      const dayStr = formatDateLocal(dayDate);
      const dateLabel = dayDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

      const dayIncome = incomes.find((i: any) => i.date === dayStr);
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

    setChartData(weekChart);

    // === WEEKLY KPI ===
    const totalWeeklyIncome = weekChart.reduce((acc, curr) => acc + curr.Revenu, 0);
    const totalWeeklyExpenses = weekChart.reduce((acc, curr) => acc + curr.Fournisseurs + curr.Personnel, 0);
    setWeeklyIncome(totalWeeklyIncome);
    setWeeklyExpenses(totalWeeklyExpenses);

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

    const monthChart = weeksDefinition.map((w) => {
      let weekRevenu = 0;
      let weekFournisseurs = 0;
      let weekPersonnel = 0;

      for (let day = w.start; day <= w.end; day++) {
        const dayDate = new Date(year, month, day);
        const dayStr = formatDateLocal(dayDate);

        const dayIncome = incomes.find((inc: any) => inc.date === dayStr);
        if (dayIncome) weekRevenu += dayIncome.amount;

        const dayDels = allDeliveries.filter((del: any) => del.date === dayStr);
        weekFournisseurs += dayDels.reduce((sum: number, d: any) => sum + Number(d.totalPrice), 0);

        const dayPay = payroll.filter((p: any) => p.date === dayStr);
        weekPersonnel += dayPay.reduce((sum: number, p: any) => sum + p.amount, 0);
      }

      return {
        name: `Sem. ${w.label}`,
        Fournisseurs: weekFournisseurs,
        Personnel: weekPersonnel,
        Revenu: weekRevenu
      };
    });

    setMonthlyChartData(monthChart);
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

    const finalY = (doc as any).lastAutoTable?.finalY || 100;
    
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



  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('dashboard.title')}</h1>
        <button className="btn btn-primary" onClick={handleExport}>
          <Download size={18} /> {t('dashboard.exportWeekly')}
        </button>
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
    </div>
  );
};

export default Dashboard;
