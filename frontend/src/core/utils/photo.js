// Hosts that only ever serve placeholder / stock pictures, never a real member's photo.
// (Older demo data and backend defaults saved Unsplash stock photos as avatars.)
const PLACEHOLDER_HOSTS = ['ui-avatars.com', 'images.unsplash.com', 'pravatar.cc', 'randomuser.me', 'placehold'];

/** True only for a photo the person actually uploaded. */
export const isRealPhoto = (url) =>
  typeof url === 'string' &&
  url.trim() !== '' &&
  !PLACEHOLDER_HOSTS.some((host) => url.includes(host));

/** "Vikas Ji" → "VJ" */
export const getInitials = (name = '') =>
  name.trim().split(/\s+/).map((part) => part[0]).join('').substring(0, 2).toUpperCase() || '?';
