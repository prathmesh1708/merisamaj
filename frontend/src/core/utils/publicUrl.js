// The address put into links members share (referral invites, posts).
// Never VITE_CLIENT_URL: on the server that holds several comma-separated
// origins (incl. localhost) and was pasted into shared links as-is.
// Override with VITE_PUBLIC_APP_URL (one URL) if the domain ever changes.
export const DEFAULT_PUBLIC_APP_URL = 'https://apnisamaj.com';

export const publicAppUrl = () => {
  const configured = String(import.meta.env.VITE_PUBLIC_APP_URL || '').split(',')[0].trim();
  return (configured || DEFAULT_PUBLIC_APP_URL).replace(/\/+$/, '');
};
