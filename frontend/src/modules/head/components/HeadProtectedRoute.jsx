import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useHeadAuth } from '../auth/useHeadAuth';

const HeadProtectedRoute = () => {
  const { headAuth } = useHeadAuth();
  const location = useLocation();

  if (!headAuth.isInitialized) {
    return (
      <div className="h-screen w-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f0527 0%, #1a0845 50%, #0d1b4b 100%)' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400" />
      </div>
    );
  }

  return headAuth.isAuthenticated ? (
    <Outlet />
  ) : (
    <Navigate to="/head/login" state={{ from: location }} replace />
  );
};

export default HeadProtectedRoute;
