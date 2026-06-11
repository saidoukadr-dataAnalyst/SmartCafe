import React from 'react';
import { Download, CheckCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { exportPDF } from '../pdfHelper';
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
  const [reportData, setReportData] = React.useState(yearlyDataRaw);
  const [weeklyDataState, setWeeklyDataState] = React.useState<any[]>([]);

  const [toastMessage, setToastMessage] = React.useState('');
  const [toastType, setToastType] = React.useState<'success' | 'error' | 'info'>('success');

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 4000);
  };

  React.useEffect(() => {
    const currentMonthStr = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
    const currentMonthPrefix = formatDateLocal(new Date()).slice(0, 7); // e.g., "2026-06"

    // 1. Frais Fixes
    const savedFraisFixes = localStorage.getItem('app_fixed_expenses');
    let totalFraisFixes = 0;
    if (savedFraisFixes) {
      const expenses = JSON.parse(savedFraisFixes);
      const currentMonthExpenses = expenses.filter((e: any) => e.month === currentMonthStr);
      totalFraisFixes = currentMonthExpenses.reduce((sum: number, e: any) => sum + e.amount, 0);
    }

    // 2. Revenus
    const savedIncomes = localStorage.getItem('app_incomes');
    let totalRevenus = 0;
    if (savedIncomes) {
      const incomes = JSON.parse(savedIncomes);
      const currentMonthIncomes = incomes.filter((i: any) => i.date.startsWith(currentMonthPrefix));
      totalRevenus = currentMonthIncomes.reduce((sum: number, i: any) => sum + i.amount, 0);
    }

    // 3. Fournisseurs (active + archived deliveries)
    const savedDeliveries = localStorage.getItem('app_deliveries');
    const savedArchive = localStorage.getItem('app_deliveries_archive');
    let totalFournisseurs = 0;
    const allDeliveries = [
      ...(savedDeliveries ? JSON.parse(savedDeliveries) : []),
      ...(savedArchive ? JSON.parse(savedArchive) : [])
    ];
    const currentMonthDeliveries = allDeliveries.filter((d: any) => d.date && d.date.startsWith(currentMonthPrefix));
    totalFournisseurs = currentMonthDeliveries.reduce((sum: number, d: any) => sum + Number(d.totalPrice), 0);

    // 4. Personnel (actual validated payments)
    const savedPayroll = localStorage.getItem('app_payroll');
    let totalPersonnel = 0;
    if (savedPayroll) {
      const payroll = JSON.parse(savedPayroll);
      const currentMonthPayroll = payroll.filter((p: any) => p.date && p.date.startsWith(currentMonthPrefix));
      totalPersonnel = currentMonthPayroll.reduce((sum: number, p: any) => sum + p.amount, 0);
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
    setReportData(newData);

    // --- Weekly Aggregation ---
    const weeklyMap = new Map<string, { name: string, Revenu: number, Fournisseurs: number, Personnel: number, sortKey: string }>();

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
      
      if (!weeklyMap.has(sortKey)) {
        weeklyMap.set(sortKey, { name, Revenu: 0, Fournisseurs: 0, Personnel: 0, sortKey });
      }
      weeklyMap.get(sortKey)![type] += amount;
    };

    if (savedIncomes) {
      JSON.parse(savedIncomes).forEach((i: any) => addToWeek(i.date, 'Revenu', Number(i.amount) || 0));
    }
    allDeliveries.forEach((d: any) => addToWeek(d.date, 'Fournisseurs', Number(d.totalPrice) || 0));
    if (savedPayroll) {
      JSON.parse(savedPayroll).forEach((p: any) => addToWeek(p.date, 'Personnel', Number(p.amount) || 0));
    }

    const sortedWeeks = Array.from(weeklyMap.values())
      .sort((a, b) => b.sortKey.localeCompare(a.sortKey)) // Descending
      .map(w => ({
        ...w,
        BeneficeNet: w.Revenu - (w.Fournisseurs + w.Personnel)
      }));
      
    setWeeklyDataState(sortedWeeks);
  }, []);

  const yearlyData = reportData.map(data => ({
    ...data,
    BeneficeNet: data.Revenu - (data.Fournisseurs + data.Personnel + data.FraisFixes)
  }));

  const currentMonth = yearlyData[yearlyData.length - 1];

  const profitCurrent = currentMonth.Revenu - (currentMonth.Fournisseurs + currentMonth.Personnel + currentMonth.FraisFixes);

  const handleExport = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(`Rapport Mensuel (${currentMonth.name})`, 20, 20);
    doc.setFontSize(14);
    doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, 20, 30);
    
    doc.text(`Bilan du mois de ${currentMonth.name} :`, 20, 50);
    doc.setFontSize(12);
    doc.text(`- Revenus générés : ${currentMonth.Revenu} DH`, 30, 60);
    doc.text(`- Dépenses Fournisseurs : ${currentMonth.Fournisseurs} DH`, 30, 70);
    doc.text(`- Salaires du Personnel : ${currentMonth.Personnel} DH`, 30, 80);
    doc.text(`- Frais Fixes : ${currentMonth.FraisFixes} DH`, 30, 90);
    doc.text(`- Total Dépenses : ${currentMonth.Fournisseurs + currentMonth.Personnel + currentMonth.FraisFixes} DH`, 30, 105);
    doc.text(`- Bénéfice Net : ${profitCurrent} DH`, 30, 115);
    
    exportPDF(doc, `Rapport_Mensuel_${currentMonth.name}.pdf`);
  };

  const handleExportWeekly = () => {
    if (weeklyDataState.length === 0) {
      showToast("Aucune donnée hebdomadaire disponible.", "info");
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(`Historique Hebdomadaire`, 20, 20);
    doc.setFontSize(14);
    doc.text(`Édité le : ${new Date().toLocaleDateString('fr-FR')}`, 20, 30);
    
    let yOffset = 50;
    doc.setFontSize(12);
    
    weeklyDataState.forEach((week) => {
      if (yOffset > 270) {
        doc.addPage();
        yOffset = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.text(`Semaine : ${week.name}`, 20, yOffset);
      doc.setFont('helvetica', 'normal');
      yOffset += 8;
      doc.text(`- Revenus : ${week.Revenu} DH`, 30, yOffset);
      yOffset += 8;
      doc.text(`- Dépenses Fournisseurs : ${week.Fournisseurs} DH`, 30, yOffset);
      yOffset += 8;
      doc.text(`- Salaires Personnel : ${week.Personnel} DH`, 30, yOffset);
      yOffset += 8;
      doc.text(`- Bénéfice Net : ${week.BeneficeNet} DH`, 30, yOffset);
      yOffset += 15;
    });

    exportPDF(doc, `Historique_Hebdomadaire.pdf`);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Rapport Mensuel</h1>
        <button className="btn btn-primary" onClick={handleExport}>
          <Download size={18} /> Exporter le rapport mensuel
        </button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card" style={{ flex: 1 }}>
          <div className="kpi-content">
            <div className="kpi-label">Revenu de ce mois ({currentMonth.name})</div>
            <div className="kpi-value" style={{ color: 'var(--success)' }}>{currentMonth.Revenu} DH</div>
          </div>
        </div>
        
        <div className="kpi-card" style={{ flex: 1 }}>
          <div className="kpi-content">
            <div className="kpi-label">Frais Fixes de ce mois ({currentMonth.name})</div>
            <div className="kpi-value" style={{ color: '#f59e0b' }}>{currentMonth.FraisFixes} DH</div>
          </div>
        </div>
        
        <div className="kpi-card" style={{ flex: 1 }}>
          <div className="kpi-content">
            <div className="kpi-label">Dépenses de ce mois ({currentMonth.name})</div>
            <div className="kpi-value" style={{ color: 'var(--danger)' }}>{currentMonth.Fournisseurs + currentMonth.Personnel + currentMonth.FraisFixes} DH</div>
          </div>
        </div>

        <div className="kpi-card" style={{ flex: 1 }}>
          <div className="kpi-content">
            <div className="kpi-label">Bénéfice Net de ce mois ({currentMonth.name})</div>
            <div className="kpi-value" style={{ color: profitCurrent >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {profitCurrent} DH
            </div>
          </div>
        </div>
      </div>

      <div className="chart-container" style={{ marginTop: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 600 }}>
          Comparaison Mensuelle (Revenus vs Dépenses)
        </h2>
        <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yearlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
              <Legend />
              <Bar dataKey="Fournisseurs" stackId="depenses" fill="#3b82f6" radius={[0, 0, 0, 0]} name="Fournisseurs" />
              <Bar dataKey="Personnel" stackId="depenses" fill="#ef4444" radius={[0, 0, 0, 0]} name="Personnel" />
              <Bar dataKey="FraisFixes" stackId="depenses" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Frais Fixes" />
              <Bar dataKey="Revenu" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenu" label={{ position: 'top', fill: '#10b981', fontSize: 10, fontWeight: 'bold' }} />
              <Bar dataKey="BeneficeNet" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Bénéfice Net" label={{ position: 'top', fill: '#8b5cf6', fontSize: 10, fontWeight: 'bold' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="table-container" style={{ marginTop: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 600 }}>
          Tableau Récapitulatif Mensuel (DH)
        </h2>
        <table className="table">
          <thead>
            <tr>
              <th>Mois</th>
              <th>Revenus (CA)</th>
              <th>Dépenses Fournisseurs</th>
              <th>Salaires Personnel</th>
              <th>Frais Fixes</th>
              <th>Total Dépenses</th>
              <th>Bénéfice Net</th>
            </tr>
          </thead>
          <tbody>
            {yearlyData.map((data, idx) => {
              const totalDepenses = data.Fournisseurs + data.Personnel + data.FraisFixes;
              const isPositive = data.BeneficeNet >= 0;
              return (
                <tr key={idx}>
                  <td><strong>{data.name}</strong></td>
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
          Historique Hebdomadaire
        </h2>
        <button className="btn btn-outline" onClick={handleExportWeekly}>
          <Download size={18} /> Exporter Historique Semaines
        </button>
      </div>

      <div className="table-container" style={{ marginTop: '1.5rem' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Semaine</th>
              <th>Revenus</th>
              <th>Fournisseurs</th>
              <th>Personnel</th>
              <th>Bénéfice Net</th>
            </tr>
          </thead>
          <tbody>
            {weeklyDataState.length > 0 ? weeklyDataState.map((week, idx) => {
              const isPositive = week.BeneficeNet >= 0;
              return (
                <tr key={idx}>
                  <td><strong>{week.name}</strong></td>
                  <td style={{ color: 'var(--success)' }}>{week.Revenu} DH</td>
                  <td>{week.Fournisseurs} DH</td>
                  <td>{week.Personnel} DH</td>
                  <td style={{ color: isPositive ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                    {isPositive ? `+${week.BeneficeNet}` : week.BeneficeNet} DH
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Aucune donnée hebdomadaire enregistrée.
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

export default Reports;
