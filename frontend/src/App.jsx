import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Placeholder from './pages/Placeholder';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/app" element={<DashboardLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="receipts" element={<Placeholder title="Receipts" />} />
          <Route path="deliveries" element={<Placeholder title="Deliveries" />} />
          <Route path="transfers" element={<Placeholder title="Internal Transfers" />} />
          <Route path="adjustments" element={<Placeholder title="Stock Adjustments" />} />
          <Route path="history" element={<Placeholder title="Move History" />} />
          <Route path="settings" element={<Placeholder title="Settings" />} />
          <Route path="profile" element={<Placeholder title="Profile" />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
