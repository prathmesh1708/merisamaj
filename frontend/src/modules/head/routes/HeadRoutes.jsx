import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HeadLayout from '../components/HeadLayout';
import HeadDashboard from '../pages/dashboard/HeadDashboard';
import MemberManagement from '../pages/members/MemberManagement';
import FundGovernance from '../pages/funds/FundGovernance';
import ElectionCommission from '../pages/elections/ElectionCommission';
import HomepageContentManager from '../pages/home/HomepageContentManager';
import EventManagement from '../pages/events/EventManagement';
import ProfessionalDirectoryManagement from '../pages/professionals/ProfessionalDirectoryManagement';
import HeadProfessionalCategories from '../pages/professionals/HeadProfessionalCategories';
import MatrimonialManagement from '../pages/matrimonial/MatrimonialManagement';
import CommunityEngagement from '../pages/engagement/CommunityEngagement';
import InvitationManagement from '../pages/invitation/InvitationManagement';
import DonationManagement from '../pages/donation/DonationManagement';
import ObituaryManagement from '../pages/obituary/ObituaryManagement';
import DharmashalaManagement from '../pages/dharmashala/DharmashalaManagement';
import HeadProtectedRoute from '../components/HeadProtectedRoute';
import HeadLoginPage from '../pages/login/HeadLoginPage';


import SocialCityFeed from '../pages/social/SocialCityFeed';
import SocialCommunityFeed from '../pages/social/SocialCommunityFeed';
import { HeadGroupsPage } from '../pages/groups/HeadGroupsPage';
import HeadLeadershipManagement from '../pages/leadership/HeadLeadershipManagement';
import LocalCommunityManagement from '../pages/local-community/LocalCommunityManagement';
import { HeadCensusManagement } from '../pages/census/HeadCensusManagement';
import { HeadNotificationCenter } from '../pages/notifications/HeadNotificationCenter';
import HeadProfileSettings from '../pages/profile/HeadProfileSettings';
import CommunitySettings from '../pages/settings/CommunitySettings';

export const HeadRoutes = () => {
  return (
    <Routes>
      {/* ── Public Route: Head Login ── */}
      <Route path="login" element={<HeadLoginPage />} />

      {/* ── Protected Routes: require Head authentication ── */}
      <Route element={<HeadProtectedRoute />}>
        <Route element={<HeadLayout />}>
          {/* Default /head → dashboard */}
          <Route index element={<Navigate to="/head/dashboard" replace />} />

          {/* Head Dashboard */}
          <Route path="dashboard" element={<HeadDashboard />} />

          {/* Head Profile Settings */}
          <Route path="profile" element={<HeadProfileSettings />} />

          {/* Social Feed Moderation Desk */}
          <Route path="social">
            <Route path="city-feed" element={<SocialCityFeed />} />
            <Route path="community-feed" element={<SocialCommunityFeed />} />
          </Route>
          
          <Route path="groups" element={<HeadGroupsPage />} />

          {/* Member Management Desk */}
          <Route path="members" element={<MemberManagement />} />
          <Route path="census" element={<HeadCensusManagement />} />

          {/* Other Head views */}
          <Route path="events" element={<EventManagement />} />
          <Route path="professionals">
            <Route index element={<ProfessionalDirectoryManagement />} />
            <Route path="categories" element={<HeadProfessionalCategories />} />
          </Route>
          <Route path="invitations" element={<InvitationManagement />} />
          <Route path="donations" element={<DonationManagement />} />
          <Route path="obituaries" element={<ObituaryManagement />} />
          <Route path="dharmashala" element={<DharmashalaManagement />} />
          <Route path="matrimonial" element={<MatrimonialManagement />} />
          <Route path="funds" element={<FundGovernance />} />
          <Route path="elections" element={<ElectionCommission />} />

          <Route path="notifications" element={<HeadNotificationCenter />} />
          <Route path="home-content" element={<HomepageContentManager />} />
          <Route path="engagement" element={<CommunityEngagement />} />
          <Route path="leadership" element={<HeadLeadershipManagement />} />
          <Route path="local-community" element={<LocalCommunityManagement />} />
          <Route path="settings" element={<CommunitySettings />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/head/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default HeadRoutes;
