// Instagram-style compact relative time for comments: "now", "5m", "4h", "3d", "1w", "12w".
// Instagram keeps counting in weeks instead of switching to months/years.
export const formatCommentTime = (value, now = Date.now()) => {
  if (!value) return 'now';
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return 'now';

  const seconds = Math.max(0, Math.floor((now - time) / 1000));
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
};
