import React from 'react';
import { Download, CheckCircle, ChevronDown, ChevronUp, FileSpreadsheet } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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

import type { FixedExpense, DailyIncome, Delivery } from '../types';

interface PayrollRecord {
  date: string;
  amount: number;
}

interface WeeklyReportItem {
  name: string;
  nameAr: string;
  Revenu: number;
  Fournisseurs: number;
  Personnel: number;
  sortKey: string;
  BeneficeNet?: number;
}

// Helper: format Date to local YYYY-MM-DD string without timezone shifting
const formatDateLocal = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const yearlyDataRaw = [
  { name: 'Janvier', Fournisseurs: 15000, Personnel: 9600, FraisFixes: 2000, Revenu: 30000 },
  { name: 'Février', Fournisseurs: 14000, Personnel: 9600, FraisFixes: 2000, Revenu: 28000 },
  { name: 'Mars', Fournisseurs: 16000, Personnel: 9600, FraisFixes: 2000, Revenu: 32000 },
  { name: 'Avril', Fournisseurs: 13500, Personnel: 9600, FraisFixes: 2000, Revenu: 29000 },
  { name: 'Mai', Fournisseurs: 15500, Personnel: 9600, FraisFixes: 2000, Revenu: 31000 },
  { name: 'Juin', Fournisseurs: 11780, Personnel: 9600, FraisFixes: 2000, Revenu: 31100 },
];

const Reports: React.FC = () => {
  const { t, i18n } = useTranslation();

  const [toastMessage, setToastMessage] = React.useState('');
  const [toastType, setToastType] = React.useState<'success' | 'error' | 'info'>('success');

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const getMonthTranslation = (monthName: string) => {
    const parts = monthName.split(' ');
    const name = parts[0];
    const year = parts[1] ? ` ${parts[1]}` : '';
    
    let key: string;
    switch (name) {
      case 'Janvier': key = 'january'; break;
      case 'Février': key = 'february'; break;
      case 'Mars': key = 'march'; break;
      case 'Avril': key = 'april'; break;
      case 'Mai': key = 'may'; break;
      case 'Juin': key = 'june'; break;
      case 'Juillet': key = 'july'; break;
      case 'Août': key = 'august'; break;
      case 'Septembre': key = 'september'; break;
      case 'Octobre': key = 'october'; break;
      case 'Novembre': key = 'november'; break;
      case 'Décembre': key = 'december'; break;
      default: return monthName;
    }
    return t(`months.${key}`) + year;
  };

  const { reportData, weeklyDataState } = React.useMemo(() => {
    // We always calculate relative to the currentMonth string in FR format for storage keys
    const currentMonthStr = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
    const currentMonthPrefix = formatDateLocal(new Date()).slice(0, 7); // e.g., "2026-06"

    // 1. Frais Fixes
    const savedFraisFixes = localStorage.getItem('app_fixed_expenses');
    let totalFraisFixes = 0;
    if (savedFraisFixes) {
      const expenses: FixedExpense[] = JSON.parse(savedFraisFixes);
      // Fixed expenses month strings can be stored in FR or AR depending on when they were created.
      // Let's check both FR and AR representations just in case.
      const currentMonthStrAr = new Date().toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
      const currentMonthExpenses = expenses.filter((e: FixedExpense) => e.month === currentMonthStr || e.month === currentMonthStrAr);
      totalFraisFixes = currentMonthExpenses.reduce((sum: number, e: FixedExpense) => sum + e.amount, 0);
    }

    // 2. Revenus
    const savedIncomes = localStorage.getItem('app_incomes');
    let totalRevenus = 0;
    if (savedIncomes) {
      const incomes: DailyIncome[] = JSON.parse(savedIncomes);
      const currentMonthIncomes = incomes.filter((i: DailyIncome) => i.date.startsWith(currentMonthPrefix));
      totalRevenus = currentMonthIncomes.reduce((sum: number, i: DailyIncome) => sum + i.amount, 0);
    }

    // 3. Fournisseurs (active + archived deliveries)
    const savedDeliveries = localStorage.getItem('app_deliveries');
    const savedArchive = localStorage.getItem('app_deliveries_archive');
    const allDeliveries: Delivery[] = [
      ...(savedDeliveries ? JSON.parse(savedDeliveries) : []),
      ...(savedArchive ? JSON.parse(savedArchive) : [])
    ];
    const currentMonthDeliveries = allDeliveries.filter((d: Delivery) => d.date && d.date.startsWith(currentMonthPrefix));
    const totalFournisseurs = currentMonthDeliveries.reduce((sum: number, d: Delivery) => sum + Number(d.totalPrice), 0);

    // 4. Personnel (actual validated payments)
    const savedPayroll = localStorage.getItem('app_payroll');
    let totalPersonnel = 0;
    if (savedPayroll) {
      const payroll: PayrollRecord[] = JSON.parse(savedPayroll);
      const currentMonthPayroll = payroll.filter((p: PayrollRecord) => p.date && p.date.startsWith(currentMonthPrefix));
      totalPersonnel = currentMonthPayroll.reduce((sum: number, p: PayrollRecord) => sum + p.amount, 0);
    }
    
    // Update the current month (last item in the array) with real data
    const newData = [...yearlyDataRaw];
    const lastIdx = newData.length - 1;
    newData[lastIdx] = { 
      ...newData[lastIdx], 
      FraisFixes: savedFraisFixes ? totalFraisFixes : newData[lastIdx].FraisFixes,
      Revenu: savedIncomes ? totalRevenus : newData[lastIdx].Revenu,
      Fournisseurs: (savedDeliveries || savedArchive) ? totalFournisseurs : newData[lastIdx].Fournisseurs,
      Personnel: savedPayroll ? totalPersonnel : newData[lastIdx].Personnel
    };

    // --- Weekly Aggregation ---
    const weeklyMap = new Map<string, WeeklyReportItem>();

    const addToWeek = (dateStr: string, type: 'Revenu' | 'Fournisseurs' | 'Personnel', amount: number) => {
      if (!dateStr || isNaN(new Date(dateStr).getTime())) return;
      const d = new Date(dateStr);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setDate(diff);
      
      const pad = (n: number) => String(n).padStart(2, '0');
      const sortKey = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const name = `Du ${pad(monday.getDate())}/${pad(monday.getMonth() + 1)} au ${pad(sunday.getDate())}/${pad(sunday.getMonth() + 1)}`;
      const nameAr = `من ${pad(monday.getDate())}/${pad(monday.getMonth() + 1)} إلى ${pad(sunday.getDate())}/${pad(sunday.getMonth() + 1)}`;
      
      if (!weeklyMap.has(sortKey)) {
        weeklyMap.set(sortKey, { name, nameAr, Revenu: 0, Fournisseurs: 0, Personnel: 0, sortKey });
      }
      weeklyMap.get(sortKey)![type] += amount;
    };

    if (savedIncomes) {
      const parsedIncomes: DailyIncome[] = JSON.parse(savedIncomes);
      parsedIncomes.forEach((i: DailyIncome) => addToWeek(i.date, 'Revenu', Number(i.amount) || 0));
    }
    allDeliveries.forEach((d: Delivery) => addToWeek(d.date, 'Fournisseurs', Number(d.totalPrice) || 0));
    if (savedPayroll) {
      const parsedPayroll: PayrollRecord[] = JSON.parse(savedPayroll);
      parsedPayroll.forEach((p: PayrollRecord) => addToWeek(p.date, 'Personnel', Number(p.amount) || 0));
    }

    const sortedWeeks = Array.from(weeklyMap.values())
      .sort((a, b) => b.sortKey.localeCompare(a.sortKey)) // Descending
      .map(w => ({
        ...w,
        BeneficeNet: w.Revenu - (w.Fournisseurs + w.Personnel)
      }));
      
    return {
      reportData: newData,
      weeklyDataState: sortedWeeks
    };
  }, []);

  const weeksByMonth = React.useMemo(() => {
    const groups = new Map<string, typeof weeklyDataState>();
    weeklyDataState.forEach(w => {
      const monthKey = w.sortKey.slice(0, 7); // e.g. "2026-06"
      if (!groups.has(monthKey)) {
        groups.set(monthKey, []);
      }
      groups.get(monthKey)!.push(w);
    });
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [weeklyDataState]);

  const [expandedMonths, setExpandedMonths] = React.useState<Record<string, boolean>>(() => {
    if (weeksByMonth.length > 0) {
      return { [weeksByMonth[0][0]]: true };
    }
    return {};
  });

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => ({ ...prev, [monthKey]: !prev[monthKey] }));
  };


  const yearlyData = reportData.map(data => ({
    ...data,
    BeneficeNet: data.Revenu - (data.Fournisseurs + data.Personnel + data.FraisFixes)
  }));

  const currentMonth = yearlyData[yearlyData.length - 1];

  const profitCurrent = currentMonth.Revenu - (currentMonth.Fournisseurs + currentMonth.Personnel + currentMonth.FraisFixes);

  const handleExport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Titre centré
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text(`Rapport Mensuel : ${currentMonth.name}`, pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text(`Édité le : ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, 28, { align: 'center' });

    // Table for details
    autoTable(doc, {
      startY: 40,
      head: [['Catégorie', 'Montant (DH)']],
      body: [
        ['Revenus générés', currentMonth.Revenu],
        ['Dépenses Fournisseurs', currentMonth.Fournisseurs],
        ['Salaires du Personnel', currentMonth.Personnel],
        ['Frais Fixes', currentMonth.FraisFixes],
        ['Total Dépenses', currentMonth.Fournisseurs + currentMonth.Personnel + currentMonth.FraisFixes],
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 12, cellPadding: 6 },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [30, 41, 59] },
        1: { halign: 'right', textColor: [30, 41, 59] },
      },
    });

    // Rounded box for Total Net
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
    doc.text('Bénéfice Net :', 20, finalY + 23);
    
    const profitColor = profitCurrent >= 0 ? [16, 185, 129] : [239, 68, 68];
    doc.setTextColor(profitColor[0], profitColor[1], profitColor[2]);
    doc.text(`${profitCurrent} DH`, pageWidth - 20, finalY + 23, { align: 'right' });

    exportPDF(doc, `Rapport_Mensuel_${currentMonth.name}.pdf`);
  };

  const handleExportWeekly = () => {
    if (weeklyDataState.length === 0) {
      showToast(t('reports.noWeeklyDataToast'), "info");
      return;
    }
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text(`Historique Hebdomadaire`, pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text(`Édité le : ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, 28, { align: 'center' });

    const tableData = weeklyDataState.map(w => [
      w.name, 
      `${w.Revenu} DH`, 
      `${w.Fournisseurs} DH`, 
      `${w.Personnel} DH`, 
      `${w.BeneficeNet} DH`
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Semaine', 'Revenus', 'Fournisseurs', 'Personnel', 'Bénéfice Net']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 10, cellPadding: 5 },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right', fontStyle: 'bold' }
      },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 4) {
          const val = parseFloat((data.cell.raw || '').toString());
          if (val >= 0) {
            data.cell.styles.textColor = [16, 185, 129];
          } else {
            data.cell.styles.textColor = [239, 68, 68];
          }
        }
      }
    });

    exportPDF(doc, `Historique_Hebdomadaire.pdf`);
  };

  const handleExportMonthlyCSV = () => {
    let csv = `Mois;Revenus (CA);Fournisseurs;Personnel;Frais Fixes;Total Depenses;Benefice Net\n`;
    yearlyData.forEach(d => {
      const monthName = getMonthTranslation(d.name);
      const totalDep = d.Fournisseurs + d.Personnel + d.FraisFixes;
      csv += `"${monthName}";${d.Revenu};${d.Fournisseurs};${d.Personnel};${d.FraisFixes};${totalDep};${d.Revenu - totalDep}\n`;
    });
    exportCSV(csv, `Rapport_Annuel_Mensuel.csv`);
  };

  const handleExportWeeklyCSV = () => {
    if (weeklyDataState.length === 0) {
      showToast(t('reports.noWeeklyDataToast'), "info");
      return;
    }
    let csv = `Semaine;Revenus;Fournisseurs;Personnel;Benefice Net\n`;
    weeklyDataState.forEach(w => {
      const name = i18n.language === 'ar' ? w.nameAr : w.name;
      csv += `"${name}";${w.Revenu};${w.Fournisseurs};${w.Personnel};${w.BeneficeNet}\n`;
    });
    exportCSV(csv, `Historique_Hebdomadaire.csv`);
  };


  const currentMonthLocalizedName = getMonthTranslation(currentMonth.name);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('reports.title')}</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary" onClick={handleExport}>
            <Download size={18} /> {t('common.exportPDF')}
          </button>
          <button className="btn btn-outline" onClick={handleExportMonthlyCSV} style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <FileSpreadsheet size={18} /> {t('common.exportCSV')}
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card" style={{ flex: 1 }}>
          <div className="kpi-content">
            <div className="kpi-label">{t('reports.revenueMonth', { month: currentMonthLocalizedName })}</div>
            <div className="kpi-value" style={{ color: 'var(--success)' }}>{currentMonth.Revenu} DH</div>
          </div>
        </div>
        
        <div className="kpi-card" style={{ flex: 1 }}>
          <div className="kpi-content">
            <div className="kpi-label">{t('reports.fixedExpensesMonth', { month: currentMonthLocalizedName })}</div>
            <div className="kpi-value" style={{ color: '#f59e0b' }}>{currentMonth.FraisFixes} DH</div>
          </div>
        </div>
        
        <div className="kpi-card" style={{ flex: 1 }}>
          <div className="kpi-content">
            <div className="kpi-label">{t('reports.totalExpensesMonth', { month: currentMonthLocalizedName })}</div>
            <div className="kpi-value" style={{ color: 'var(--danger)' }}>{currentMonth.Fournisseurs + currentMonth.Personnel + currentMonth.FraisFixes} DH</div>
          </div>
        </div>

        <div className="kpi-card" style={{ flex: 1 }}>
          <div className="kpi-content">
            <div className="kpi-label">{t('reports.netProfitMonth', { month: currentMonthLocalizedName })}</div>
            <div className="kpi-value" style={{ color: profitCurrent >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {profitCurrent} DH
            </div>
          </div>
        </div>
      </div>

      <div className="chart-container" style={{ marginTop: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 600 }}>
          {t('reports.monthlyComparison')}
        </h2>
        <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yearlyData.map(d => ({ ...d, name: getMonthTranslation(d.name) }))} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
              <Legend />
              <Bar dataKey="Fournisseurs" stackId="depenses" fill="#3b82f6" radius={[0, 0, 0, 0]} name={t('reports.chartFournisseurs')} />
              <Bar dataKey="Personnel" stackId="depenses" fill="#ef4444" radius={[0, 0, 0, 0]} name={t('reports.chartPersonnel')} />
              <Bar dataKey="FraisFixes" stackId="depenses" fill="#f59e0b" radius={[4, 4, 0, 0]} name={t('reports.chartFraisFixes')} />
              <Bar dataKey="Revenu" fill="#10b981" radius={[4, 4, 0, 0]} name={t('reports.chartRevenu')} label={{ position: 'top', fill: '#10b981', fontSize: 10, fontWeight: 'bold' }} />
              <Bar dataKey="BeneficeNet" fill="#8b5cf6" radius={[4, 4, 0, 0]} name={t('reports.chartBenefice')} label={{ position: 'top', fill: '#8b5cf6', fontSize: 10, fontWeight: 'bold' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="table-container" style={{ marginTop: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 600 }}>
          {t('reports.summaryTableTitle')}
        </h2>
        <table className="table">
          <thead>
            <tr>
              <th>{t('reports.tableMonth')}</th>
              <th>{t('reports.tableRevenue')}</th>
              <th>{t('reports.tableSuppliers')}</th>
              <th>{t('reports.tablePersonnel')}</th>
              <th>{t('reports.tableFixedExpenses')}</th>
              <th>{t('reports.tableTotalExpenses')}</th>
              <th>{t('reports.tableNetProfit')}</th>
            </tr>
          </thead>
          <tbody>
            {yearlyData.map((data, idx) => {
              const totalDepenses = data.Fournisseurs + data.Personnel + data.FraisFixes;
              const isPositive = data.BeneficeNet >= 0;
              return (
                <tr key={idx}>
                  <td><strong>{getMonthTranslation(data.name)}</strong></td>
                  <td style={{ color: 'var(--success)' }}>{data.Revenu} DH</td>
                  <td>{data.Fournisseurs} DH</td>
                  <td>{data.Personnel} DH</td>
                  <td>{data.FraisFixes} DH</td>
                  <td style={{ color: 'var(--danger)' }}>{totalDepenses} DH</td>
                  <td style={{ color: isPositive ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                    {isPositive ? `+${data.BeneficeNet}` : data.BeneficeNet} DH
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="page-header" style={{ marginTop: '3rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
          {t('reports.weeklyHistoryTitle')}
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" onClick={handleExportWeekly}>
            <Download size={18} /> {t('common.exportPDF')}
          </button>
          <button className="btn btn-outline" onClick={handleExportWeeklyCSV}>
            <FileSpreadsheet size={18} /> {t('common.exportCSV')}
          </button>
        </div>
      </div>

      <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {weeksByMonth.length > 0 ? weeksByMonth.map(([monthKey, weeks]) => {
          const isExpanded = expandedMonths[monthKey];
          const [year, month] = monthKey.split('-');
          const dateObj = new Date(Number(year), Number(month) - 1, 1);
          const monthName = dateObj.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'fr-FR', { month: 'long', year: 'numeric' });
          
          // Calculate month totals for the weeks in this month
          const totalRev = weeks.reduce((sum, w) => sum + w.Revenu, 0);
          const totalFourn = weeks.reduce((sum, w) => sum + w.Fournisseurs, 0);
          const totalPers = weeks.reduce((sum, w) => sum + w.Personnel, 0);
          const totalNet = totalRev - (totalFourn + totalPers);

          return (
            <div key={monthKey} style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)'
            }}>
              {/* Header Row */}
              <div 
                onClick={() => toggleMonth(monthKey)}
                style={{
                  padding: '1rem 1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  userSelect: 'none',
                  backgroundColor: isExpanded ? 'rgba(59, 130, 246, 0.04)' : 'transparent',
                  borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none',
                  transition: 'background-color 0.2s ease',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {isExpanded ? <ChevronUp size={20} style={{ color: 'var(--accent-primary)' }} /> : <ChevronDown size={20} style={{ color: 'var(--text-secondary)' }} />}
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, textTransform: 'capitalize' }}>{monthName}</span>
                </div>
                
                {/* Quick summary metrics */}
                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                  <span>
                    {t('reports.revenueMonth', { month: '' }).split('(')[0]} : <strong style={{ color: 'var(--success)' }}>{totalRev} DH</strong>
                  </span>
                  <span>
                    {t('reports.totalExpensesMonth', { month: '' }).split('(')[0]} : <strong style={{ color: 'var(--danger)' }}>{totalFourn + totalPers} DH</strong>
                  </span>
                  <span>
                    {t('reports.netProfitMonth', { month: '' }).split('(')[0]} : <strong style={{ color: totalNet >= 0 ? 'var(--success)' : 'var(--danger)' }}>{totalNet} DH</strong>
                  </span>
                </div>
              </div>

              {/* Table Container */}
              {isExpanded && (
                <div className="table-container" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
                  <table className="table" style={{ border: 'none' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                        <th style={{ paddingInlineStart: '2.5rem' }}>{t('reports.tableWeek')}</th>
                        <th>{t('reports.tableWeekRevenues')}</th>
                        <th>{t('reports.tableWeekSuppliers')}</th>
                        <th>{t('reports.tableWeekPersonnel')}</th>
                        <th>{t('reports.tableWeekNetProfit')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weeks.map((week, idx) => {
                        const isPositive = week.BeneficeNet >= 0;
                        return (
                          <tr key={idx}>
                            <td style={{ paddingInlineStart: '2.5rem' }}>
                              <strong>{i18n.language === 'ar' ? week.nameAr : week.name}</strong>
                            </td>
                            <td style={{ color: 'var(--success)' }}>{week.Revenu} DH</td>
                            <td>{week.Fournisseurs} DH</td>
                            <td>{week.Personnel} DH</td>
                            <td style={{ color: isPositive ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                              {isPositive ? `+${week.BeneficeNet}` : week.BeneficeNet} DH
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        }) : (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--text-secondary)'
          }}>
            {t('reports.noWeeklyData')}
          </div>
        )}
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

export default Reports;
