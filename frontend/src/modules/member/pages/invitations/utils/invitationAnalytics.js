/**
 * Shared helpers that turn a raw invitation document into the numbers and
 * member lists the creator sees under the "Sent" tab.
 *
 * Invitation sub-documents arrive either populated (memberId is a user object)
 * or raw (memberId is an id string), depending on which endpoint last wrote to
 * the cached invitation — every helper here tolerates both shapes.
 */

export const extractId = (value) => {
  if (!value) return '';
  if (typeof value === 'object') return String(value._id || value.id || '');
  return String(value);
};

const initialsFrom = (name) =>
  (name || '?')
    .split(' ')
    .map(part => part[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

/**
 * Merges whatever the invitation carries about a member with the fuller record
 * from the members directory, so avatars and phone numbers show up even when
 * the invitation only stored an id.
 */
export const resolveMember = (memberRef, members = []) => {
  const id = extractId(memberRef);
  const embedded = memberRef && typeof memberRef === 'object' ? memberRef : {};
  const directory = members.find(m => String(m.id || m._id) === id) || {};

  const name = directory.name || embedded.name || 'Community Member';

  return {
    id,
    name,
    avatar: directory.avatar || directory.photo || directory.profileImage || embedded.avatar || null,
    phone: directory.phone || embedded.phone || null,
    city: directory.city || embedded.city || null,
    profession: directory.profession || embedded.profession || null,
    initials: directory.initials || initialsFrom(name)
  };
};

export const getCreatorId = (inv) => extractId(inv?.creatorId);

export const isInvitationCreator = (inv, currentUser) => {
  const creatorId = getCreatorId(inv);
  const userId = String(currentUser?.id || currentUser?._id || '');
  return Boolean(creatorId && userId && creatorId === userId);
};

export const RSVP_STATUS_META = {
  attending: { label: 'Attending', short: 'Attending (Self)', tone: 'emerald' },
  attending_family: { label: 'With Family', short: 'Attending (Family)', tone: 'purple' },
  not_attending: { label: 'Not Attending', short: 'Not Attending', tone: 'rose' },
  pending: { label: 'Pending', short: 'Pending', tone: 'slate' }
};

export const formatRelativeTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
};

/**
 * Builds every list the analytics panel renders:
 *   opened   — members who opened the envelope, most recent first
 *   attending / family / declined — RSVP answers
 *   pending  — invited members who have not answered yet
 */
export const buildInvitationAnalytics = (inv, members = []) => {
  const creatorId = getCreatorId(inv);

  const opened = (inv?.openedBy || [])
    .map(entry => ({
      ...resolveMember(entry.memberId, members),
      openedAt: entry.openedAt,
      lastOpenedAt: entry.lastOpenedAt || entry.openedAt,
      openCount: entry.openCount || 1
    }))
    .filter(m => m.id && m.id !== creatorId)
    .sort((a, b) => new Date(b.lastOpenedAt || 0) - new Date(a.lastOpenedAt || 0));

  const responses = (inv?.rsvps || [])
    .map(entry => ({
      ...resolveMember(entry.memberId, members),
      status: entry.status || 'pending',
      respondedAt: entry.respondedAt
    }))
    .filter(m => m.id)
    .sort((a, b) => new Date(b.respondedAt || 0) - new Date(a.respondedAt || 0));

  const respondedIds = new Set(responses.filter(r => r.status !== 'pending').map(r => r.id));

  const pending = (inv?.invitedMemberIds || [])
    .map(ref => extractId(ref))
    .filter(id => id && id !== creatorId && !respondedIds.has(id))
    .map(id => ({ ...resolveMember(id, members), status: 'pending', respondedAt: null }));

  const attending = responses.filter(r => r.status === 'attending');
  const family = responses.filter(r => r.status === 'attending_family');
  const declined = responses.filter(r => r.status === 'not_attending');

  return {
    opened,
    attending,
    family,
    declined,
    pending,
    all: [...attending, ...family, ...declined, ...pending],
    openedCount: opened.length,
    // Repeat opens included; falls back to unique openers for legacy records
    viewCount: inv?.viewCount || opened.reduce((sum, m) => sum + (m.openCount || 1), 0),
    attendingCount: attending.length,
    familyCount: family.length,
    declinedCount: declined.length,
    pendingCount: pending.length,
    totalAttendingCount: attending.length + family.length
  };
};
