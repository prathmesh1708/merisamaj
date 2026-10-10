import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MemberRoutes } from './modules/member/routes/MemberRoutes';
import AdminRoutes from './modules/admin/routes/AdminRoutes';
import HeadRoutes from './modules/head/routes/HeadRoutes';
import { DataProvider } from './modules/member/context/DataProvider';
import { FundProvider } from './modules/member/context/FundContext';
import { AuthProvider } from './core/auth/AuthContext';
import { NotificationProvider } from './modules/member/context/NotificationContext';
import { HeadAuthProvider } from './modules/head/auth/HeadAuthContext';
import { AdminAuthProvider } from './modules/admin/auth/AdminAuthContext';
import { useAxiosPrivate } from './core/auth/useAxiosPrivate';
import ScrollToTop from './components/ScrollToTop';
import LoginAsPage from './pages/LoginAsPage';

const AxiosInterceptorProvider = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  useAxiosPrivate();
  
  // Wait for the next tick so useAxiosPrivate's useEffect has run
  useEffect(() => {
    setIsReady(true);
  }, []);

  if (!isReady) return null;
  return <>{children}</>;
};

const AppContent = () => {
  return (
    <div className="desktop-wrapper">
      <div className="app-container bg-transparent">
      <div className="aura-bg" />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          {/* Default entry → splash screen, which then opens the "Login as" chooser */}
          <Route path="/" element={<Navigate to="/member/splash" replace />} />

          {/* Single entry: login as Member / Local Head / Community Head */}
          <Route path="/login" element={<LoginAsPage />} />
          
          {/* Route all /member/* requests to MemberRoutes */}
          <Route path="/member/*" element={<MemberRoutes />} />

          {/* Route all /admin/* requests to AdminRoutes */}
          <Route path="/admin/*" element={<AdminRoutes />} />

          {/* Route all /head/* requests to HeadRoutes */}
          <Route path="/head/*" element={<HeadRoutes />} />
        </Routes>
      </BrowserRouter>
    </div>
  </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
    <NotificationProvider>
    <HeadAuthProvider>
    <AdminAuthProvider>
    <AxiosInterceptorProvider>
      <DataProvider>
        <FundProvider>
          <AppContent />
        </FundProvider>
      </DataProvider>
    </AxiosInterceptorProvider>
    </AdminAuthProvider>
    </HeadAuthProvider>
    </NotificationProvider>
    </AuthProvider>
  );
};

export default App;