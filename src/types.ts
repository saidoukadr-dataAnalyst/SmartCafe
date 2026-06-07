export interface Supplier {
  id: string;
  name: string;
  contact: string;
  totalOwed: number;
}

export interface Delivery {
  id: string;
  supplierId: string;
  date: string;
  label: string;
  quantity: number;
  totalPrice: number;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  weeklySalary: number;
  status?: 'En attente' | 'Payé';
}

export interface FixedExpense {
  id: string;
  type: string;
  amount: number;
  month: string;
  category?: string;
}

export interface DailyIncome {
  date: string; // YYYY-MM-DD
  amount: number;
}
