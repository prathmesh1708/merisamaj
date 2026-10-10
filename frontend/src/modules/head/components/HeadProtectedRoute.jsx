import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useHeadAuth } from '../auth/useHeadAuth';
import { useAuth } from '../../../core/auth/useAuth';

const HeadProtectedRoute = () => {
  const { headAuth, adoptHeadSession } = useHeadAuth();
  const { auth } = useAuth();
  const location = useLocation();

  // A Head/Local Head already logged into the Member app can switch here without logging in again
  const canAdoptMemberSession =
    headAuth.isInitialized &&
    !headAuth.isAuthenticated &&
    auth.isAuthenticated &&
    !!auth.accessToken &&
    ['head', 'sub_head', 'admin'].includes(auth.user?.role);

  useEffect(() => {
    if (canAdoptMemberSession) adoptHeadSession(auth.user, auth.accessToken);
  }, [canAdoptMemberSession, adoptHeadSession, auth.user, auth.accessToken]);

  if (!headAuth.isInitialized || canAdoptMemberSession) {
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
