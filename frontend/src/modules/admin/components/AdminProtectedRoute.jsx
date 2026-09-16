import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../auth/useAdminAuth';

export const AdminProtectedRoute = () => {
  const { adminAuth } = useAdminAuth();
  const location = useLocation();

  if (!adminAuth.isInitialized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a' }}>
        <div style={{ border: '4px solid #334155', borderTopColor: '#6366f1', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Check if authenticated AND role is admin or admin_sub_head
  const isAdminRole = adminAuth.adminUser?.role === 'admin' || 
                      adminAuth.adminUser?.role === 'admin_sub_head' || 
                      (adminAuth.adminUser?.role === 'sub_head' && adminAuth.adminUser?.subHeadType === 'admin');

  if (adminAuth.isAuthenticated && isAdminRole) {
    return <Outlet />;
  }

  // Redirect to admin login, preserve path they wanted to visit
  return <Navigate to="/admin/login" state={{ from: location }} replace />;
};

export default AdminProtectedRoute;
