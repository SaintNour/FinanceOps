import { lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout.jsx';

const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const ImportPage = lazy(() => import('./pages/ImportPage.jsx'));
const OrdersPage = lazy(() => import('./pages/OrdersPage.jsx'));
const ReconciliationPage = lazy(() => import('./pages/ReconciliationPage.jsx'));
const RefundsPage = lazy(() => import('./pages/RefundsPage.jsx'));
const PeriodsPage = lazy(() => import('./pages/PeriodsPage.jsx'));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage.jsx'));

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/refunds" element={<RefundsPage />} />
          <Route path="/reconciliation" element={<ReconciliationPage />} />
          <Route path="/periods" element={<PeriodsPage />} />
          <Route path="/audit" element={<AuditLogPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
