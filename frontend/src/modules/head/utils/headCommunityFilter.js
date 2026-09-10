/**
 * Utility to filter members for a Community Head based on their assigned communities.
 * Admin users see all members, while Head users see only members belonging to their assigned communities.
 */
export const filterMembersForHead = (membersList = [], headUser = null) => {
  if (!membersList || !Array.isArray(membersList)) return [];
  if (!headUser || headUser.role === 'admin') return membersList; // Admin sees all members

  const assignedIds = new Set();
  const assignedNames = new Set();

  if (Array.isArray(headUser.assignedCommunityIds)) {
    headUser.assignedCommunityIds.forEach(c => {
      if (typeof c === 'string') {
        assignedIds.add(c);
        assignedNames.add(c.toLowerCase());
      } else if (c && typeof c === 'object') {
        if (c._id) assignedIds.add(c._id.toString());
        if (c.id) assignedIds.add(c.id.toString());
        if (c.name) assignedNames.add(c.name.toLowerCase());
      }
    });
  }

  if (headUser.assignedCommunityId) {
    const c = headUser.assignedCommunityId;
    if (typeof c === 'string') {
      assignedIds.add(c);
      assignedNames.add(c.toLowerCase());
    } else if (c && typeof c === 'object') {
      if (c._id) assignedIds.add(c._id.toString());
      if (c.id) assignedIds.add(c.id.toString());
      if (c.name) assignedNames.add(c.name.toLowerCase());
    }
  }

  if (headUser.communityId) {
    const c = headUser.communityId;
    if (typeof c === 'string') {
      assignedIds.add(c);
      assignedNames.add(c.toLowerCase());
    } else if (c && typeof c === 'object') {
      if (c._id) assignedIds.add(c._id.toString());
      if (c.id) assignedIds.add(c.id.toString());
      if (c.name) assignedNames.add(c.name.toLowerCase());
    }
  }

  if (headUser.community && typeof headUser.community === 'string') {
    assignedNames.add(headUser.community.toLowerCase());
  }

  // If no community is assigned to this head user
  if (assignedIds.size === 0 && assignedNames.size === 0) {
    return [];
  }

  const isLocalHead = (headUser.role === 'sub_head' || headUser.accountType === 'local_head') && headUser.city;
  const targetCity = isLocalHead ? headUser.city.toLowerCase().trim() : null;

  return membersList.filter(m => {
    // 1. Gather all community IDs associated with this member
    const memberCommIds = new Set();
    if (m.communityId) {
      if (typeof m.communityId === 'string') memberCommIds.add(m.communityId);
      else if (m.communityId._id) memberCommIds.add(m.communityId._id.toString());
      else if (m.communityId.id) memberCommIds.add(m.communityId.id.toString());
    }
    if (m.assignedCommunityId) {
      if (typeof m.assignedCommunityId === 'string') memberCommIds.add(m.assignedCommunityId);
      else if (m.assignedCommunityId._id) memberCommIds.add(m.assignedCommunityId._id.toString());
    }
    if (Array.isArray(m.assignedCommunityIds)) {
      m.assignedCommunityIds.forEach(cid => {
        if (typeof cid === 'string') memberCommIds.add(cid);
        else if (cid && typeof cid === 'object' && (cid._id || cid.id)) memberCommIds.add((cid._id || cid.id).toString());
      });
    }

    const mCommunityName = (m.community || m.communityName || m.communityId?.name || '').toLowerCase();

    // Check if any member community ID or name matches head's assigned communities
    let matchesCommId = false;
    for (const cid of memberCommIds) {
      if (assignedIds.has(cid)) {
        matchesCommId = true;
        break;
      }
    }

    const matchesCommName = mCommunityName && assignedNames.has(mCommunityName);
    const matchesCommunity = matchesCommId || matchesCommName;
    if (!matchesCommunity) return false;

    // If logged in as Local Head, filter exclusively for their assigned city
    if (targetCity) {
      const mCity = (typeof m.city === 'object' && m.city?.name ? m.city.name : (m.city || '')).toLowerCase().trim();
      if (mCity !== targetCity) {
        return false;
      }
    }

    return true;
  });
};
