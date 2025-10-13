import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import Layout from './components/Layout';
import HomePage from './components/HomePage';
import SwapPage from './components/SwapPage';
import StakeBTCPage from './components/StakeBTCPage';
import TreasuryPoolPage from './components/TreasuryPoolPage';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/swap" element={<SwapPage />} />
            <Route path="/stake" element={<StakeBTCPage />} />
            <Route path="/pool" element={<TreasuryPoolPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;