import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

const MemberProtectedRoute = () => {
  const { auth } = useAuth();
  const location = useLocation();

  if (!auth.isInitialized) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-surface">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  if (auth.isAuthenticated) {
    const hasCommunity = !!(auth.user?.communityId || auth.user?.community);
    const isOnboardingPath = location.pathname.startsWith('/member/onboarding') || location.pathname.startsWith('/member/splash');
    
    // Allow onboarding if explicitly resuming from home, newly registered, or onboarding resume step is set
    const isResumingOnboarding = !!localStorage.getItem('merisamaj_onboarding_resume_step') ||
                                 localStorage.getItem('merisamaj_just_registered') === 'true' ||
                                 localStorage.getItem('merisamaj_onboarding_from_home') === 'true';

    // Redirect authenticated users without a community to the onboarding flow
    if (!hasCommunity && !isOnboardingPath) {
      return <Navigate to="/member/onboarding" replace />;
    }
    
    // If onboarding is complete and not resuming, prevent navigating back to onboarding screen
    if (hasCommunity && location.pathname.startsWith('/member/onboarding') && !isResumingOnboarding) {
      return <Navigate to="/member/home" replace />;
    }
    
    return <Outlet />;
  }

  return <Navigate to="/member/login" state={{ from: location }} replace />;
};

export default MemberProtectedRoute;
