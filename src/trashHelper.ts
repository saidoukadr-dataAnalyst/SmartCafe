export interface TrashItem {
  id: string;
  type: 'supplier' | 'delivery' | 'employee' | 'fixed_expense' | 'income' | 'payroll';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  deletedAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const moveToTrash = (type: TrashItem['type'], data: any | any[]) => {
  const currentTrash = JSON.parse(localStorage.getItem('app_trash') || '[]');
  const now = new Date().toISOString();
  
  if (Array.isArray(data)) {
    const newItems = data.map(item => ({
      id: Math.random().toString(36).substr(2, 9),
      type,
      data: item,
      deletedAt: now
    }));
    localStorage.setItem('app_trash', JSON.stringify([...currentTrash, ...newItems]));
  } else {
    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      data,
      deletedAt: now
    };
    localStorage.setItem('app_trash', JSON.stringify([...currentTrash, newItem]));
  }
};
