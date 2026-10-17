import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

const PublicRoute = () => {
  const { auth } = useAuth();

  if (!auth.isInitialized) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-surface">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  if (auth.isAuthenticated) {
    // Already logged in: only someone without a community still needs the setup steps.
    // Everyone else goes Home (it offers "Continue profile setup" for unfinished profiles).
    // The old "just registered" marker is cleared here — left behind, it sent members
    // back to Step 1 every time they opened the Login page.
    const hasCommunity = !!(auth.user?.communityId || auth.user?.community);
    if (!hasCommunity) {
      return <Navigate to="/member/onboarding" replace />;
    }
    try { localStorage.removeItem('merisamaj_just_registered'); } catch { /* storage unavailable */ }
    return <Navigate to="/member/home" replace />;
  }

  return <Outlet />;
};

export default PublicRoute;
