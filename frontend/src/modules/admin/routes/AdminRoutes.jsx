import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminProtectedRoute from '../components/AdminProtectedRoute';
import AdminLayout from '../components/AdminLayout';
import AdminDashboard from '../pages/dashboard/AdminDashboard';
import UserManagement from '../pages/users/UserManagement';
import PlatformMatrimonialManagement from '../pages/matrimonial/PlatformMatrimonialManagement';
import EventsDesk from '../pages/events/EventsDesk';
import SystemConfig from '../pages/config/SystemConfig';
import CityManagement from '../pages/cities/CityManagement';
import CommunityHeadManagement from '../pages/community-heads/CommunityHeadManagement';
import HeadDetailsPage from '../pages/community-heads/HeadDetailsPage';
import HeadActivityMonitor from '../pages/community-heads/HeadActivityMonitor';
import HeadReports from '../pages/community-heads/HeadReports';
import SubscriptionManagement from '../pages/subscriptions/SubscriptionManagement';
import GlobalFamilyManagement from '../pages/families/GlobalFamilyManagement';
import GlobalProfessionalOverview from '../pages/professionals/GlobalProfessionalOverview';
import GlobalProfessionalGrid from '../pages/professionals/GlobalProfessionalGrid';
import GlobalProfessionalApprovals from '../pages/professionals/GlobalProfessionalApprovals';
import GlobalProfessionalCategories from '../pages/professionals/GlobalProfessionalCategories';
import GlobalFundManagement from '../pages/fund/GlobalFundManagement';
import DonationManagement from '../../../pages/admin/DonationManagement';
import CommunitiesPage from '../pages/communities/CommunitiesPage';
import AdminLogin from '../pages/login/AdminLogin';

import CityFeedManagement from '../pages/social/CityFeedManagement';
import CommunityFeedManagement from '../pages/social/CommunityFeedManagement';
import AdminPostDetailsPage from '../pages/social/PostDetailsPage';
import { AdminGroupsPage } from '../pages/groups/AdminGroupsPage';
import SuccessStoriesManagement from '../pages/matrimonial/SuccessStoriesManagement';
import AdminDharmashalaManagement from '../pages/dharmashala/AdminDharmashalaManagement';
import { AdminObituaryManagement } from '../pages/obituary/AdminObituaryManagement';
import { AdminCensusManagement } from '../pages/census/AdminCensusManagement';
import { AdminLeadershipManagement } from '../pages/leadership/AdminLeadershipManagement';
import { AdminNotificationsPage } from '../pages/notifications/AdminNotificationsPage';
import { AdminInvitationManagement } from '../pages/invitation/AdminInvitationManagement';
import { AdminVotingManagement } from '../pages/voting/AdminVotingManagement';
import AdminReportsDesk from '../pages/reports/AdminReportsDesk';
import AdminReferralManagement from '../pages/referral/AdminReferralManagement';
import AdminAppShortcutsManagement from '../pages/shortcuts/AdminAppShortcutsManagement';
import { UserAppEditsPage } from '../pages/userAppEdits/UserAppEditsPage';

export const AdminRoutes = () => {
  return (
    <Routes>
      {/* Public Admin Login Route */}
      <Route path="login" element={<AdminLogin />} />

      <Route element={<AdminProtectedRoute />}>
        <Route element={<AdminLayout />}>
          {/* Default /admin redirects to admin dashboard */}
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
        
        {/* Admin Operational Dashboard */}
        <Route path="dashboard" element={<AdminDashboard />} />
        
        {/* Other Admin views */}
        <Route path="users" element={<UserManagement />} />
        <Route path="census" element={<AdminCensusManagement />} />
        <Route path="leadership" element={<AdminLeadershipManagement />} />
        <Route path="matrimonial" element={<PlatformMatrimonialManagement />} />
        <Route path="marketing/success-stories" element={<SuccessStoriesManagement />} />
        <Route path="events" element={<EventsDesk />} />
        <Route path="cities" element={<CityManagement />} />
        {/* Community Head Management */}
        <Route path="community-heads">
          <Route index element={<CommunityHeadManagement />} />
          <Route path="activity" element={<HeadActivityMonitor />} />
          <Route path="reports" element={<HeadReports />} />
          <Route path=":id" element={<HeadDetailsPage />} />
        </Route>
        <Route path="subscriptions" element={<SubscriptionManagement />} />
        <Route path="reports" element={<AdminReportsDesk />} />
        <Route path="config" element={<SystemConfig />} />
        <Route path="families" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="professionals">
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<GlobalProfessionalOverview />} />
          <Route path="grid" element={<GlobalProfessionalGrid />} />
          <Route path="approvals" element={<GlobalProfessionalApprovals />} />
          <Route path="categories" element={<GlobalProfessionalCategories />} />
        </Route>
        <Route path="donations" element={<DonationManagement />} />
        <Route path="funds" element={<GlobalFundManagement />} />


        {/* 📱 Social Module Management */}
        <Route path="social">
          <Route path="city-feed" element={<CityFeedManagement />} />
          <Route path="community-feed" element={<CommunityFeedManagement />} />
          <Route path="post/:id" element={<AdminPostDetailsPage />} />
        </Route>

        {/* 🏛️ Multi-Community Management — Master Admin Core Feature */}
        <Route path="communities" element={<CommunitiesPage />} />
        
        {/* 🏨 Dharmashala Master Supervision */}
        <Route path="dharmashala" element={<AdminDharmashalaManagement />} />

        {/* 🕊️ Obituary Global Supervision */}
        <Route path="obituaries" element={<AdminObituaryManagement />} />

        {/* Global Groups */}
        <Route path="groups" element={<AdminGroupsPage />} />
        
        {/* Notifications & Push Delivery Center */}
        <Route path="notifications" element={<AdminNotificationsPage />} />
        
        {/* 📩 Digital Invitations Supervision */}
        <Route path="invitations" element={<AdminInvitationManagement />} />

        {/* 🗳️ Voting & Elections Supervision */}
        <Route path="voting" element={<AdminVotingManagement />} />

        {/* 🎁 Refer & Earn Management */}
        <Route path="referrals" element={<AdminReferralManagement />} />
        
        {/* ⚡ App Shortcuts & Icon Management */}
        <Route path="shortcuts" element={<AdminAppShortcutsManagement />} />

        {/* 📱 User App Edits & CMS */}
        <Route path="user-app-edits" element={<UserAppEditsPage />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Route>
      </Route>
    </Routes>
  );
};

export default AdminRoutes;
