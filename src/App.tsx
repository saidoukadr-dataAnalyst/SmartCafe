import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Suppliers from './pages/Suppliers';
import Income from './pages/Income';
import Staff from './pages/Staff';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';

const App: React.FC = () => {
  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/income" element={<Income />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
