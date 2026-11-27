import React, { useState, useEffect } from 'react';
import { PullToRefresh } from './core/components/PullToRefresh';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MemberRoutes } from './modules/member/routes/MemberRoutes';
import AdminRoutes from './modules/admin/routes/AdminRoutes';
import HeadRoutes from './modules/head/routes/HeadRoutes';
import { DataProvider } from './modules/member/context/DataProvider';
import { PostUploadProvider } from './modules/member/context/PostUploadContext';
import { FundProvider } from './modules/member/context/FundContext';
import { AuthProvider } from './core/auth/AuthContext';
import { NotificationProvider } from './modules/member/context/NotificationContext';
import { HeadAuthProvider } from './modules/head/auth/HeadAuthContext';
import { AdminAuthProvider } from './modules/admin/auth/AdminAuthContext';
import { useAxiosPrivate } from './core/auth/useAxiosPrivate';
import ScrollToTop from './components/ScrollToTop';
import { ImageCropHost } from './core/components/ImageCropper';
import LoginAsPage from './pages/LoginAsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import ChildSafetyPage from './pages/ChildSafetyPage';
import LanguageProvider from './core/i18n/LanguageProvider';
import LanguageSync from './core/i18n/LanguageSync';
import FloatingLanguageSwitcher from './core/i18n/FloatingLanguageSwitcher';

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
        <FloatingLanguageSwitcher />
        <Routes>
          {/* Default entry → splash screen, which then opens the "Login as" chooser */}
          <Route path="/" element={<Navigate to="/member/splash" replace />} />

          {/* Single entry: login as Member / Local Head / Community Head */}
          <Route path="/login" element={<LoginAsPage />} />

          {/* Public legal page — no login needed (app stores link here) */}
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/child-safety" element={<ChildSafetyPage />} />
          
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
    <LanguageProvider>
    <AuthProvider>
    <NotificationProvider>
    <HeadAuthProvider>
    <AdminAuthProvider>
    <LanguageSync />
    <AxiosInterceptorProvider>
      <DataProvider>
        <PostUploadProvider>
        <FundProvider>
          <AppContent />
          <PullToRefresh />
          <ImageCropHost />
        </FundProvider>
        </PostUploadProvider>
      </DataProvider>
    </AxiosInterceptorProvider>
    </AdminAuthProvider>
    </HeadAuthProvider>
    </NotificationProvider>
    </AuthProvider>
    </LanguageProvider>
  );
};

export default App;