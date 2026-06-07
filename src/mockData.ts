import type { Supplier, Delivery, Employee, FixedExpense, DailyIncome } from './types';

export const mockDailyIncome: DailyIncome[] = [
  { date: new Date().toISOString().split('T')[0], amount: 450 },
];

export const mockSuppliers: Supplier[] = [
  { id: '1', name: 'Boulangerie Centrale', contact: '0612345678', totalOwed: 350 },
  { id: '2', name: 'Distributeur Boissons', contact: '0687654321', totalOwed: 1200 },
  { id: '3', name: 'Fournisseur Café', contact: '0655443322', totalOwed: 800 },
];

export const mockDeliveries: Delivery[] = [
  { id: '1', supplierId: '1', date: '2026-06-02', label: 'Farine (50kg)', quantity: 2, totalPrice: 150 },
  { id: '2', supplierId: '1', date: '2026-06-05', label: 'Sucre (10kg)', quantity: 1, totalPrice: 200 },
  { id: '3', supplierId: '2', date: '2026-06-03', label: 'Sodas (packs)', quantity: 10, totalPrice: 1200 },
  { id: '4', supplierId: '3', date: '2026-06-01', label: 'Grains de café', quantity: 5, totalPrice: 800 },
];

export const mockEmployees: Employee[] = [
  { id: '1', name: 'Ahmed', role: 'Serveur', weeklySalary: 1500 },
  { id: '2', name: 'Fatima', role: 'Barista', weeklySalary: 1800 },
  { id: '3', name: 'Karim', role: 'Caissier', weeklySalary: 1400 },
];

export const mockFixedExpenses: FixedExpense[] = [
  { id: '1', type: 'Loyer', amount: 5000, month: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase()), category: 'Loyer' },
  { id: '2', type: 'Électricité', amount: 800, month: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase()), category: 'Énergie / Eau' },
  { id: '3', type: 'Eau', amount: 300, month: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase()), category: 'Énergie / Eau' },
];
