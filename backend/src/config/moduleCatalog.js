/**
 * moduleCatalog.js
 * The single list of delegable Head-panel modules for the hierarchical module
 * access system (Master Admin → Community Head → Local Head → Sub-Head).
 *
 * A module groups the existing granular `User.headPermissions` flags of one area.
 * Access to an action needs BOTH:
 *   1. the module granted down the hierarchy (services/modulePermissionService.js), and
 *   2. the existing granular flag (middleware/authorizeModule.js) — unchanged.
 *
 * Fields:
 *   key               stable id stored in User.moduleAccess.modules
 *   headPermissionKeys existing headPermissions flags that belong to this module
 *   headPaths          Head-panel page paths (frontend menu + direct-URL guard)
 *   apiMounts          /api/v1/head/* sub-paths blocked server-side without the module
 *   communitySetting   Community.settings flag; when the community's plan switches it
 *                      off, nobody in that community gets the module ("system restriction")
 *
 * To add a module: add an entry here — the APIs, admin/head UI and guards pick it up.
 */
const MODULE_CATALOG = [
  {
    key: 'members', label: 'Members', category: 'Community',
    description: 'Member list, verifications, approvals and family requests',
    headPermissionKeys: ['canViewMembers', 'canAddMembers', 'canEditMembers', 'canRemoveMembers', 'canExportMembers'],
    headPaths: ['/head/members', '/head/family-requests'],
    apiMounts: ['/dashboard/members', '/family-requests']
  },
  {
    key: 'census', label: 'Community Census', category: 'Community',
    description: 'Census records and census update requests',
    headPermissionKeys: ['canViewCensus', 'canManageCensus'],
    headPaths: ['/head/census'],
    apiMounts: ['/census']
  },
  {
    key: 'social', label: 'Social & Groups', category: 'Community',
    description: 'City / community feeds, post moderation and community groups',
    headPermissionKeys: ['canViewSocial', 'canManageSocial'],
    headPaths: ['/head/social', '/head/groups', '/head/engagement'],
    apiMounts: ['/social', '/groups'],
    communitySetting: 'socialFeedEnabled'
  },
  {
    key: 'directory', label: 'Professional Directory', category: 'Community',
    description: 'Professional listings, approvals and categories',
    headPermissionKeys: ['canViewDirectory', 'canManageDirectory'],
    headPaths: ['/head/professionals'],
    apiMounts: ['/professional'],
    communitySetting: 'directoryEnabled'
  },
  {
    key: 'matrimonial', label: 'Matrimonial', category: 'Community',
    description: 'Matrimonial profiles, approvals and success stories',
    headPermissionKeys: ['canViewProfiles', 'canApproveProfiles', 'canEditProfiles'],
    headPaths: ['/head/matrimonial'],
    apiMounts: ['/matrimonial'],
    communitySetting: 'matrimonialEnabled'
  },
  {
    key: 'events', label: 'Events', category: 'Events & Governance',
    description: 'Create, edit and manage events and bookings',
    headPermissionKeys: ['canViewEvents', 'canCreateEvents', 'canEditEvents', 'canDeleteEvents', 'canManageBookings'],
    headPaths: ['/head/events'],
    apiMounts: ['/events'],
    communitySetting: 'eventEnabled'
  },
  {
    key: 'invitations', label: 'Invitations', category: 'Events & Governance',
    description: 'Digital invitations',
    headPermissionKeys: ['canViewInvitations', 'canCreateInvitations', 'canManageInvitations'],
    headPaths: ['/head/invitations'],
    apiMounts: ['/invitations'],
    communitySetting: 'invitationEnabled'
  },
  {
    key: 'notifications', label: 'Notification Center', category: 'Events & Governance',
    description: 'Broadcasts, scheduled alerts and templates',
    headPermissionKeys: ['canSendNotifications'],
    headPaths: ['/head/notifications'],
    apiMounts: ['/notifications']
  },
  {
    key: 'funds', label: 'Fund Governance', category: 'Finance',
    description: 'Samaj funds, contributions, expenses and fund accounts',
    headPermissionKeys: ['canViewFunds', 'canManageFunds'],
    headPaths: ['/head/funds'],
    apiMounts: ['/funds', '/fund-accounts']
  },
  {
    key: 'donations', label: 'Donation Campaigns', category: 'Finance',
    description: 'Donation campaigns, expenses and cash collection',
    headPermissionKeys: ['canViewDonations', 'canCreateDonationCampaigns', 'canManageExpenses', 'canCollectCashDonations'],
    headPaths: ['/head/donations'],
    apiMounts: ['/donations'],
    communitySetting: 'donationEnabled'
  },
  {
    key: 'obituary', label: 'Obituaries', category: 'Events & Governance',
    description: 'Obituary posts and condolences',
    headPermissionKeys: ['canViewObituary', 'canManageObituary'],
    headPaths: ['/head/obituaries'],
    apiMounts: ['/obituaries'],
    communitySetting: 'obituaryEnabled'
  },
  {
    key: 'dharmashala', label: 'Dharmashalas', category: 'Events & Governance',
    description: 'Dharmashalas, rooms, bookings and maintenance',
    headPermissionKeys: ['canViewDharmashala', 'canManageDharmashala'],
    headPaths: ['/head/dharmashala'],
    apiMounts: ['/dharmashala'],
    communitySetting: 'dharmashalaEnabled'
  },
  {
    key: 'subHeads', label: 'Sub-Heads', category: 'Team',
    description: 'Create and manage Sub-Heads',
    headPermissionKeys: ['canManageSubHeads'],
    headPaths: ['/head/sub-heads'],
    apiMounts: ['/sub-heads']
  },
  {
    key: 'leadership', label: 'Leadership & Team', category: 'Team',
    description: 'Leadership directory, groups and Mantri Mandal',
    headPermissionKeys: ['canViewLeadership', 'canManageLeadership'],
    headPaths: ['/head/leadership'],
    apiMounts: ['/leadership']
  },
  {
    key: 'localCommunity', label: 'Local Community', category: 'Team',
    description: 'Create and manage Local Heads',
    headPermissionKeys: ['canManageLocalCommunity'],
    headPaths: ['/head/local-community'],
    apiMounts: ['/local-community']
  },
  {
    key: 'elections', label: 'Election Commission', category: 'Platform',
    description: 'Elections and voting',
    headPermissionKeys: ['canViewElections', 'canManageElections'],
    headPaths: ['/head/elections'],
    apiMounts: ['/voting']
  },
  {
    key: 'homeContent', label: 'Home Content', category: 'Platform',
    description: 'Home page banners and app content',
    headPermissionKeys: ['canViewHomeContent', 'canManageHomeContent'],
    headPaths: ['/head/home-content'],
    apiMounts: ['/app-content']
  }
];

const ALL_MODULE_KEYS = MODULE_CATALOG.map(m => m.key);
const MODULE_BY_KEY = new Map(MODULE_CATALOG.map(m => [m.key, m]));

// headPermissions flag → module key (e.g. 'canCreateEvents' → 'events')
const MODULE_BY_PERMISSION_KEY = new Map(
  MODULE_CATALOG.flatMap(m => m.headPermissionKeys.map(p => [p, m.key]))
);

// What the frontend needs (no server-only fields)
const publicCatalog = () =>
  MODULE_CATALOG.map(({ key, label, category, description, headPaths, communitySetting }) =>
    ({ key, label, category, description, headPaths, communitySetting: communitySetting || null }));

module.exports = {
  MODULE_CATALOG,
  ALL_MODULE_KEYS,
  MODULE_BY_KEY,
  MODULE_BY_PERMISSION_KEY,
  publicCatalog
};
