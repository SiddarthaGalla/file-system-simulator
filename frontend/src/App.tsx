import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StorageProvider } from './context/StorageContext';
import { ToastProvider } from './context/ToastContext';

import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { FileManagement } from './pages/FileManagement';
import { StorageDevices } from './pages/StorageDevices';
import { StorageMap } from './pages/StorageMap';
import { FragmentationAnalysis } from './pages/FragmentationAnalysis';
import { AllocationAlgorithms } from './pages/AllocationAlgorithms';
import { GAOptimization } from './pages/GAOptimization';
import { Defragmentation } from './pages/Defragmentation';
import { PerformanceMonitor } from './pages/PerformanceMonitor';
import { ComparisonAnalytics } from './pages/ComparisonAnalytics';
import { ReportsHistory } from './pages/ReportsHistory';
import { Settings } from './pages/Settings';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas-light flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-ink-primary border-t-lime rounded-full animate-spin" />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <StorageProvider>
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Application Routes */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Dashboard />} />
                <Route path="/files" element={<FileManagement />} />
                <Route path="/devices" element={<StorageDevices />} />
                <Route path="/storage-map" element={<StorageMap />} />
                <Route path="/fragmentation" element={<FragmentationAnalysis />} />
                <Route path="/allocation" element={<AllocationAlgorithms />} />
                <Route path="/optimization" element={<GAOptimization />} />
                <Route path="/defragmentation" element={<Defragmentation />} />
                <Route path="/performance" element={<PerformanceMonitor />} />
                <Route path="/comparison" element={<ComparisonAnalytics />} />
                <Route path="/reports" element={<ReportsHistory />} />
                <Route path="/settings" element={<Settings />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </StorageProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};

export default App;
