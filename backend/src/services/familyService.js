/**
 * Family Tree Service (Samagra-style Family ID + per-person Member ID)
 *
 * Flow:
 *   1. A member adds a relative → FamilyMember record (pending) in their Family.
 *   2. Approval: Local Head (member's city) → Community Head. If the city has no
 *      Local Head the first stage is skipped; a Community Head may approve directly.
 *   3. If the relative's mobile number belongs to (or later registers) an app user,
 *      they get an invitation to accept/reject. Accepting links their account to the
 *      existing record, so they keep ONE Member ID and are never counted twice.
 *
 * User.familyMembers (legacy array) is rewritten from these records after every
 * change so older screens (profile, head drawer, onboarding) keep working.
 */
const mongoose = require('mongoose');
const User = require('../models/User');
const Family = require('../models/Family');
const FamilyMember = require('../models/FamilyMember');
const Counter = require('../models/Counter');
const cacheService = require('../utils/cacheService');
const { createNotification } = require('./notificationService');
const { genderFromRelation, toHeadRelation, relationForViewer } = require('../utils/familyRelations');

const FAMILY_CODE_BASE = 100000;
const MEMBER_CODE_BASE = 100000;

class FamilyError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const normalizePhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
};

const toDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const idOf = (v) => (v && v._id ? v._id : v);
const sameId = (a, b) => !!a && !!b && idOf(a).toString() === idOf(b).toString();

const nextFamilyCode = async () => `MSF-${FAMILY_CODE_BASE + await Counter.next('familyCode')}`;
const nextMemberCode = async () => `MSM-${MEMBER_CODE_BASE + await Counter.next('memberCode')}`;

const headGenderOf = async (family) => {
  if (!family?.headUserId) return '';
  const head = await User.findById(family.headUserId).select('gender').lean();
  return head?.gender || '';
};

const invalidateCaches = (userIds = []) => {
  cacheService.invalidate('census_summary_');
  userIds.filter(Boolean).forEach(id => cacheService.del(`auth_user_${id}`));
};

// ─── Approver lookup ──────────────────────────────────────────────────────────

const findLocalHeads = (communityId, city) => {
  if (!communityId || !city) return Promise.resolve([]);
  return User.find({
    communityId,
    role: 'sub_head',
    accountType: 'local_head',
    city: new RegExp(`^${escapeRegex(city.trim())}$`, 'i'),
    accountStatus: 'active'
  }).select('_id name').lean();
};

const findCommunityHeads = (communityId) => {
  if (!communityId) return Promise.resolve([]);
  return User.find({
    role: 'head',
    accountStatus: 'active',
    $or: [{ communityId }, { assignedCommunityIds: communityId }]
  }).select('_id name').lean();
};

const reviewerLevel = (user) => {
  const role = (user.role || '').toLowerCase();
  if (['admin', 'super_admin', 'master_admin', 'admin_sub_head'].includes(role)) return 'admin';
  if (user.accountType === 'local_head' || user.subHeadType === 'local') return 'local';
  if (role === 'head') return 'community';
  if (role === 'sub_head' && user.headPermissions?.canManageCensus) return 'community';
  return null;
};

/**
 * @param {string} stage        - 'local' | 'community'
 * @param {string} addedByName  - the member who added this person (always shown to heads)
 * @param {string} forwardedBy  - Local Head name when forwarding to the Community Head
 */
const notifyApprovers = async (record, stage, addedByName, forwardedBy = '') => {
  const heads = stage === 'local'
    ? await findLocalHeads(record.communityId, record.city)
    : await findCommunityHeads(record.communityId);
  const family = await Family.findById(record.familyId).select('familyCode').lean();

  await Promise.all(heads.map(h => createNotification({
    userId: h._id,
    communityId: record.communityId,
    module: 'family',
    type: 'family_member_approval_request',
    title: 'Family Member Approval 👨‍👩‍👧',
    message: `${addedByName || 'A member'} added ${record.name} (${record.relationToHead}, ${record.phone ? `mobile ${record.phone}` : 'no mobile'}) to family ${family?.familyCode || ''}.${forwardedBy ? ` Verified by Local Head ${forwardedBy}.` : ''} Please review.`,
    icon: '👨‍👩‍👧',
    priority: 'high',
    actionUrl: '/head/family-requests',
    referenceId: record._id,
    referenceType: 'FamilyMember'
  })));
};

const notifyUser = (userId, communityId, type, title, message, referenceId) => createNotification({
  userId,
  communityId,
  module: 'family',
  type,
  title,
  message,
  icon: '👨‍👩‍👧',
  priority: 'high',
  actionUrl: '/member/profile/family',
  referenceId,
  referenceType: 'FamilyMember'
});

const sendInvitation = async (record, invitedUser) => {
  const family = await Family.findById(record.familyId).populate('headUserId', 'name').lean();
  const adder = record.addedBy ? await User.findById(record.addedBy).select('name').lean() : null;
  await notifyUser(
    invitedUser._id,
    record.communityId,
    'family_invitation',
    'Family Tree Invitation 👨‍👩‍👧',
    `${adder?.name || family?.headUserId?.name || 'A member'} added you to family ${family?.familyCode || ''}. Accept to link your account.`,
    record._id
  );
};

// ─── Legacy array mirror ──────────────────────────────────────────────────────

const relationLabel = (viewerRecord, record, head) => {
  if (!viewerRecord || viewerRecord.relationToHead === 'Self') {
    return record.relationToHead === 'Relative' && record.relationNote ? record.relationNote : record.relationToHead;
  }
  if (record.relationToHead === 'Self') {
    return relationForViewer(viewerRecord.relationToHead, 'Self', head?.gender, head?.gender) || `Head (${head?.name || ''})`;
  }
  return relationForViewer(viewerRecord.relationToHead, record.relationToHead, head?.gender, record.gender)
    || (record.relationToHead === 'Relative' && record.relationNote)
    || `${record.relationToHead} of ${head?.name || 'Head'}`;
};

const refreshLegacyArrays = async (familyId) => {
  const family = await Family.findById(familyId).lean();
  if (!family) return;
  const head = await User.findById(family.headUserId).select('name gender').lean();
  const records = await FamilyMember.find({ familyId, isRemoved: false }).lean();
  const linked = records.filter(r => r.userId);

  await Promise.all(linked.map(viewer => {
    const entries = records
      .filter(r => !sameId(r._id, viewer._id) && r.linkStatus !== 'declined' && r.approvalStatus !== 'rejected')
      .map(r => ({
        name: r.name,
        relation: relationLabel(viewer, r, head),
        age: r.age,
        dob: r.dob,
        gender: r.gender,
        phone: r.phone,
        mobile: r.phone,
        gotra: r.gotra,
        maritalStatus: r.maritalStatus,
        occupation: r.occupation,
        avatar: r.avatar,
        recordId: r._id,
        memberCode: r.memberCode,
        approvalStatus: r.approvalStatus,
        linkStatus: r.linkStatus
      }));
    return User.updateOne({ _id: viewer.userId }, { $set: { familyMembers: entries } });
  }));

  invalidateCaches(linked.map(r => r.userId));
};

// ─── Family bootstrap ─────────────────────────────────────────────────────────

/**
 * Returns { family, selfRecord } for the user, creating a new Family with the
 * user as head (and an approved "Self" record) when they don't have one yet.
 */
const ensureFamily = async (user) => {
  if (user.familyId) {
    const family = await Family.findOne({ _id: user.familyId, status: 'active' });
    const selfRecord = user.memberRecordId ? await FamilyMember.findById(user.memberRecordId) : null;
    if (family && selfRecord && !selfRecord.isRemoved) {
      // Community/city are chosen during onboarding, possibly after the family was created
      const communityId = idOf(user.communityId) || null;
      if (sameId(family.headUserId, user._id) && communityId && (!family.communityId || !family.city)) {
        family.communityId = family.communityId || communityId;
        family.city = family.city || user.city || '';
        await family.save();
        const orphanRecords = await FamilyMember.find({ familyId: family._id, communityId: null });
        for (const r of orphanRecords) {
          r.communityId = family.communityId;
          r.city = r.city || family.city;
          await r.save();
          if (r.approvalStatus === 'pending') {
            const stage = r.approvals.localHead.status === 'pending' ? 'local' : 'community';
            notifyApprovers(r, stage, user.name).catch(() => {});
          }
        }
      }
      return { family, selfRecord };
    }
  }

  const communityId = idOf(user.communityId) || null;
  const family = await Family.create({
    familyCode: await nextFamilyCode(),
    communityId,
    city: user.city || '',
    headUserId: user._id,
    createdBy: user._id
  });

  const selfRecord = await FamilyMember.create({
    memberCode: await nextMemberCode(),
    familyId: family._id,
    communityId,
    city: user.city || '',
    userId: user._id,
    name: user.name,
    gender: user.gender || '',
    dob: user.dob || null,
    phone: normalizePhone(user.phone),
    gotra: user.gotra || '',
    maritalStatus: user.maritalStatus || '',
    occupation: user.profession || '',
    avatar: user.avatar || null,
    relationToHead: 'Self',
    addedBy: user._id,
    approvalStatus: 'approved',
    approvals: {
      localHead: { status: 'skipped' },
      communityHead: { status: 'skipped' }
    },
    linkStatus: 'self'
  });

  await User.updateOne({ _id: user._id }, { $set: { familyId: family._id, memberRecordId: selfRecord._id } });
  user.familyId = family._id;
  user.memberRecordId = selfRecord._id;
  return { family, selfRecord };
};

// ─── Member CRUD ──────────────────────────────────────────────────────────────

/**
 * @param {Object} actor  - User document of the member adding the relative
 * @param {Object} data   - { name, relation (relative to actor), phone, dob, gender, ... }
 * @param {Object} opts   - { preApproved: bool, skipRefresh: bool } (migration / legacy sync)
 */
const addMember = async (actor, data, opts = {}) => {
  const name = (data.name || '').trim();
  if (!name) throw new FamilyError('Name is required.');
  const relation = (data.relation || '').trim() || 'Relative';

  const { family, selfRecord } = await ensureFamily(actor);
  if (selfRecord.approvalStatus !== 'approved') {
    throw new FamilyError('Your own family membership is still awaiting approval.', 403);
  }

  // Store the relation relative to the family head
  let relationToHead = toHeadRelation(selfRecord.relationToHead, relation, await headGenderOf(family));
  let relationNote = '';
  if (relationToHead === 'Self') {
    throw new FamilyError('This person is already the head of your family.');
  }
  if (!relationToHead) {
    relationToHead = 'Relative';
    relationNote = `${relation} of ${actor.name}`;
  }

  const phone = normalizePhone(data.phone || data.mobile);
  if (phone && phone.length !== 10) throw new FamilyError('Enter a valid 10-digit mobile number.');
  if (phone && phone === normalizePhone(actor.phone)) throw new FamilyError('You cannot add your own mobile number.');

  let invitedUser = null;
  if (phone) {
    const dup = await FamilyMember.findOne({ familyId: family._id, phone, isRemoved: false }).lean();
    if (dup) throw new FamilyError(`${dup.name} with this mobile number is already in your family.`, 409);

    const linkedElsewhere = await FamilyMember.findOne({ phone, userId: { $ne: null }, isRemoved: false })
      .populate('familyId', 'familyCode').lean();
    // A registered user who is alone in their own family can simply be invited; one who
    // already shares a family with others has to be transferred/merged by a head.
    const sharesFamily = linkedElsewhere && await FamilyMember.exists({
      familyId: linkedElsewhere.familyId?._id, isRemoved: false, _id: { $ne: linkedElsewhere._id }
    });
    if (sharesFamily) {
      throw new FamilyError(`This mobile number already belongs to family ${linkedElsewhere.familyId?.familyCode || ''}. Ask the family head or your Local Head to transfer them.`, 409);
    }
    invitedUser = await User.findOne({ phone: { $in: [phone, `91${phone}`, `+91${phone}`] } }).select('_id name').lean();
  }

  const communityId = family.communityId || idOf(actor.communityId) || null;
  const city = family.city || actor.city || '';
  const localHeads = opts.preApproved ? [] : await findLocalHeads(communityId, city);
  const now = new Date();

  const record = await FamilyMember.create({
    memberCode: await nextMemberCode(),
    familyId: family._id,
    communityId,
    city,
    name,
    gender: data.gender || genderFromRelation(relation) || '',
    dob: toDate(data.dob),
    age: data.age ? String(data.age) : '',
    phone,
    gotra: data.gotra || actor.gotra || '',
    maritalStatus: data.maritalStatus || '',
    occupation: data.occupation || '',
    avatar: data.avatar || null,
    relationToHead,
    relationNote,
    addedBy: actor._id,
    approvalStatus: opts.preApproved ? 'approved' : 'pending',
    approvals: opts.preApproved
      ? { localHead: { status: 'skipped', at: now }, communityHead: { status: 'approved', at: now, note: 'Migrated from existing family data' } }
      : { localHead: { status: localHeads.length ? 'pending' : 'skipped' }, communityHead: { status: 'pending' } },
    linkStatus: invitedUser ? 'invited' : 'not_registered'
  });

  if (!opts.preApproved && communityId) {
    notifyApprovers(record, localHeads.length ? 'local' : 'community', actor.name).catch(err =>
      console.warn('[familyService] notifyApprovers failed:', err.message));
  }
  if (invitedUser) {
    sendInvitation(record, invitedUser).catch(err => console.warn('[familyService] invitation failed:', err.message));
  }

  if (!opts.skipRefresh) await refreshLegacyArrays(family._id);
  invalidateCaches();
  return record;
};

const assertCanManage = async (actor, record) => {
  if (!actor.familyId || !sameId(actor.familyId, record.familyId)) {
    throw new FamilyError('This member is not part of your family.', 403);
  }
  const family = await Family.findById(record.familyId).lean();
  const isHead = sameId(family.headUserId, actor._id);
  if (!isHead && !sameId(record.addedBy, actor._id)) {
    throw new FamilyError('Only the family head or the person who added this member can change it.', 403);
  }
  return { family, isHead };
};

const updateMember = async (actor, recordId, data, opts = {}) => {
  const record = await FamilyMember.findOne({ _id: recordId, isRemoved: false });
  if (!record) throw new FamilyError('Family member not found.', 404);
  if (record.relationToHead === 'Self') throw new FamilyError('Edit your own details from your profile.');
  await assertCanManage(actor, record);

  const isLinked = !!record.userId; // linked people manage their own profile details
  let needsReapproval = false;

  if (!isLinked) {
    if (data.name !== undefined && data.name.trim() && data.name.trim() !== record.name) {
      record.name = data.name.trim();
      needsReapproval = true;
    }
    if (data.dob !== undefined) record.dob = toDate(data.dob);
    if (data.gender !== undefined) record.gender = data.gender;
    if (data.maritalStatus !== undefined) record.maritalStatus = data.maritalStatus;
    if (data.occupation !== undefined) record.occupation = data.occupation;
    if (data.gotra !== undefined) record.gotra = data.gotra;
    if (data.avatar !== undefined) record.avatar = data.avatar;

    const phone = data.phone !== undefined || data.mobile !== undefined ? normalizePhone(data.phone || data.mobile) : record.phone;
    if (phone !== record.phone) {
      if (phone && phone.length !== 10) throw new FamilyError('Enter a valid 10-digit mobile number.');
      record.phone = phone;
      const invitedUser = phone ? await User.findOne({ phone }).select('_id').lean() : null;
      record.linkStatus = invitedUser ? 'invited' : 'not_registered';
      if (invitedUser) sendInvitation(record, invitedUser).catch(() => {});
    }
  }

  if (data.relation) {
    const selfRecord = await FamilyMember.findById(actor.memberRecordId).lean();
    const family = await Family.findById(record.familyId).select('headUserId').lean();
    const rel = toHeadRelation(selfRecord?.relationToHead, data.relation.trim(), await headGenderOf(family));
    const newRel = rel && rel !== 'Self' ? rel : 'Relative';
    const newNote = rel && rel !== 'Self' ? '' : `${data.relation.trim()} of ${actor.name}`;
    if (newRel !== record.relationToHead || newNote !== record.relationNote) {
      record.relationToHead = newRel;
      record.relationNote = newNote;
      needsReapproval = true;
    }
  }

  if (needsReapproval && record.approvalStatus !== 'pending' && !opts.skipReapproval) {
    const localHeads = await findLocalHeads(record.communityId, record.city);
    record.approvalStatus = 'pending';
    record.approvals = {
      localHead: { status: localHeads.length ? 'pending' : 'skipped' },
      communityHead: { status: 'pending' }
    };
    await record.save();
    if (record.communityId) {
      notifyApprovers(record, localHeads.length ? 'local' : 'community', actor.name).catch(() => {});
    }
  } else {
    await record.save();
  }

  if (!opts.skipRefresh) await refreshLegacyArrays(record.familyId);
  invalidateCaches();
  return record;
};

/**
 * Removing an unlinked person soft-deletes the record. Removing a LINKED person
 * moves them into a new family of their own — they keep their Member ID.
 */
const removeMember = async (actor, recordId, opts = {}) => {
  const record = await FamilyMember.findOne({ _id: recordId, isRemoved: false });
  if (!record) throw new FamilyError('Family member not found.', 404);
  if (record.relationToHead === 'Self') throw new FamilyError('The family head cannot be removed.');
  await assertCanManage(actor, record);

  const oldFamilyId = record.familyId;
  if (record.userId) {
    await detachLinkedRecord(record);
  } else {
    record.isRemoved = true;
    await record.save();
  }

  if (!opts.skipRefresh) await refreshLegacyArrays(oldFamilyId);
  invalidateCaches([record.userId]);
};

const detachLinkedRecord = async (record) => {
  const user = await User.findById(record.userId).select('_id name city communityId');
  const family = await Family.create({
    familyCode: await nextFamilyCode(),
    communityId: record.communityId,
    city: user?.city || record.city,
    headUserId: record.userId,
    createdBy: record.userId
  });
  record.familyId = family._id;
  record.relationToHead = 'Self';
  record.relationNote = '';
  record.linkStatus = 'self';
  record.approvalStatus = 'approved';
  await record.save();
  await User.updateOne({ _id: record.userId }, { $set: { familyId: family._id, memberRecordId: record._id, familyMembers: [] } });
};

// ─── Head approval ────────────────────────────────────────────────────────────

const listRequests = async (reviewer, filter) => {
  const level = reviewerLevel(reviewer);
  if (!level) throw new FamilyError('You are not allowed to review family requests.', 403);

  return FamilyMember.find(filter)
    .populate('familyId', 'familyCode headUserId')
    .populate('addedBy', 'name phone avatar')
    .populate('userId', 'name phone avatar')
    .sort({ createdAt: -1 })
    .lean();
};

const assertReviewerScope = (reviewer, record, level) => {
  if (level === 'admin') return;
  const commIds = [idOf(reviewer.communityId), ...(reviewer.assignedCommunityIds || []).map(idOf)].filter(Boolean);
  if (!commIds.some(c => sameId(c, record.communityId))) {
    throw new FamilyError('This request belongs to another community.', 403);
  }
  if (level === 'local' && (record.city || '').toLowerCase() !== (reviewer.city || '').toLowerCase()) {
    throw new FamilyError('This request belongs to another city.', 403);
  }
};

const reviewMember = async (reviewer, recordId, action, note = '') => {
  if (!['approve', 'reject'].includes(action)) throw new FamilyError('Action must be approve or reject.');
  const level = reviewerLevel(reviewer);
  if (!level) throw new FamilyError('You are not allowed to review family requests.', 403);

  const record = await FamilyMember.findOne({ _id: recordId, isRemoved: false });
  if (!record) throw new FamilyError('Request not found.', 404);
  if (record.approvalStatus !== 'pending') throw new FamilyError(`This request is already ${record.approvalStatus}.`, 409);
  assertReviewerScope(reviewer, record, level);

  const stamp = { by: reviewer._id, at: new Date(), note };
  const family = await Family.findById(record.familyId).select('familyCode').lean();

  if (action === 'reject') {
    const stage = level === 'local' ? 'localHead' : 'communityHead';
    record.approvals[stage] = { status: 'rejected', ...stamp };
    record.approvalStatus = 'rejected';
    await record.save();
    if (record.addedBy) {
      notifyUser(record.addedBy, record.communityId, 'family_member_rejected', 'Family Member Not Approved',
        `${record.name} was not approved for family ${family?.familyCode || ''}.${note ? ` Reason: ${note}` : ''}`, record._id).catch(() => {});
    }
  } else if (level === 'local') {
    if (record.approvals.localHead.status !== 'pending') throw new FamilyError('Local Head approval is not required for this request.', 409);
    record.approvals.localHead = { status: 'approved', ...stamp };
    await record.save();
    const adder = record.addedBy ? await User.findById(record.addedBy).select('name').lean() : null;
    notifyApprovers(record, 'community', adder?.name, reviewer.name).catch(() => {});
  } else {
    if (record.approvals.localHead.status === 'pending') {
      record.approvals.localHead = { status: 'overridden', ...stamp };
    }
    record.approvals.communityHead = { status: 'approved', ...stamp };
    record.approvalStatus = 'approved';
    await record.save();

    const recipients = [record.addedBy, record.userId].filter(Boolean);
    const unique = [...new Set(recipients.map(String))];
    unique.forEach(uid => notifyUser(uid, record.communityId, 'family_member_approved', 'Family Member Approved ✅',
      `${record.name} (${record.memberCode}) is now part of family ${family?.familyCode || ''} in the Jangana.`, record._id).catch(() => {}));
  }

  await refreshLegacyArrays(record.familyId);
  invalidateCaches();
  return record;
};

// ─── Invitations (relative registered on the app) ────────────────────────────

const listInvitations = async (user) => {
  const phone = normalizePhone(user.phone);
  if (!phone) return [];
  return FamilyMember.find({ phone, userId: null, linkStatus: 'invited', isRemoved: false, approvalStatus: { $ne: 'rejected' } })
    .populate({ path: 'familyId', select: 'familyCode headUserId', populate: { path: 'headUserId', select: 'name avatar' } })
    .populate('addedBy', 'name avatar')
    .lean();
};

const respondToInvitation = async (user, recordId, accept) => {
  const phone = normalizePhone(user.phone);
  const record = await FamilyMember.findOne({ _id: recordId, isRemoved: false });
  if (!record || record.userId || record.phone !== phone || record.linkStatus !== 'invited') {
    throw new FamilyError('Invitation not found or already answered.', 404);
  }

  if (!accept) {
    record.linkStatus = 'declined';
    await record.save();
    if (record.addedBy) {
      notifyUser(record.addedBy, record.communityId, 'family_invitation_declined', 'Family Invitation Declined',
        `${user.name} declined to be linked as ${record.name} in your family tree.`, record._id).catch(() => {});
    }
    await refreshLegacyArrays(record.familyId);
    invalidateCaches();
    return { record };
  }

  const targetFamilyId = record.familyId;
  let finalRecord = record;

  // Already in a family? Bring their existing record (and Member ID) along.
  const currentFamily = user.familyId ? await Family.findOne({ _id: user.familyId, status: 'active' }) : null;
  const ownRecord = user.memberRecordId ? await FamilyMember.findOne({ _id: user.memberRecordId, isRemoved: false }) : null;

  if (currentFamily && ownRecord) {
    if (sameId(currentFamily._id, targetFamilyId)) throw new FamilyError('You are already part of this family.', 409);

    const isHead = sameId(currentFamily.headUserId, user._id);
    const othersCount = await FamilyMember.countDocuments({ familyId: currentFamily._id, isRemoved: false, _id: { $ne: ownRecord._id } });
    if (isHead && othersCount > 0) {
      throw new FamilyError(`You are the head of family ${currentFamily.familyCode} with ${othersCount} member(s). Contact your Local Head to merge the two families.`, 409);
    }

    ownRecord.familyId = targetFamilyId;
    ownRecord.communityId = record.communityId;
    ownRecord.city = record.city;
    ownRecord.relationToHead = record.relationToHead;
    ownRecord.relationNote = record.relationNote;
    ownRecord.addedBy = record.addedBy;
    ownRecord.approvalStatus = record.approvalStatus;
    ownRecord.approvals = record.approvals;
    ownRecord.linkStatus = 'linked';
    await ownRecord.save();
    await FamilyMember.deleteOne({ _id: record._id }); // the placeholder record is superseded
    finalRecord = ownRecord;

    if (othersCount === 0) {
      currentFamily.status = 'dissolved';
      await currentFamily.save();
    } else {
      await refreshLegacyArrays(currentFamily._id);
    }
  } else {
    record.userId = user._id;
    record.linkStatus = 'linked';
    // The person's own profile now takes precedence over what the relative typed
    record.name = user.name || record.name;
    if (user.gender) record.gender = user.gender;
    if (user.dob) record.dob = user.dob;
    if (user.avatar) record.avatar = user.avatar;
    await record.save();
  }

  await User.updateOne({ _id: user._id }, { $set: { familyId: targetFamilyId, memberRecordId: finalRecord._id } });
  user.familyId = targetFamilyId;
  user.memberRecordId = finalRecord._id;

  if (finalRecord.addedBy) {
    notifyUser(finalRecord.addedBy, finalRecord.communityId, 'family_invitation_accepted', 'Family Invitation Accepted 🎉',
      `${user.name} accepted and is now linked to your family tree.`, finalRecord._id).catch(() => {});
  }

  await refreshLegacyArrays(targetFamilyId);
  invalidateCaches([user._id]);
  return { record: finalRecord };
};

/** Called right after registration: turn any waiting family entries into invitations. */
const activatePendingInvitations = async (user) => {
  const phone = normalizePhone(user.phone);
  if (!phone) return;
  const records = await FamilyMember.find({ phone, userId: null, linkStatus: 'not_registered', isRemoved: false });
  for (const record of records) {
    record.linkStatus = 'invited';
    await record.save();
    await sendInvitation(record, user);
  }
};

// ─── Read model for the member app ────────────────────────────────────────────

/**
 * Activity: a member is ACTIVE once they have a MeriSamaj account (linked/self).
 * Until then they are INACTIVE — or DUMMY when no mobile number was given (e.g. a child).
 * Jangana: approved members are counted (active or not); pending wait for the heads.
 */
const activityStatusOf = (r) => (r.userId ? 'active' : (r.phone ? 'inactive' : 'dummy'));
const janganaStatusOf = (r) => {
  if (r.linkStatus === 'declined' || r.approvalStatus === 'rejected') return 'excluded';
  return r.approvalStatus === 'approved' ? 'counted' : 'pending';
};

const summarize = (records) => {
  const summary = { total: records.length, active: 0, inactive: 0, dummy: 0, counted: 0, pending: 0, excluded: 0 };
  records.forEach(r => {
    summary[activityStatusOf(r)]++;
    summary[janganaStatusOf(r)]++;
  });
  return summary;
};

const getFamilyView = async (user) => {
  if (!user.familyId) return { family: null, members: [], self: null };
  const family = await Family.findOne({ _id: user.familyId, status: 'active' })
    .populate('headUserId', 'name gender avatar phone').lean();
  if (!family) return { family: null, members: [], self: null };

  const records = await FamilyMember.find({ familyId: family._id, isRemoved: false }).sort({ createdAt: 1 }).lean();
  const viewer = records.find(r => sameId(r._id, user.memberRecordId)) || null;
  const head = family.headUserId;
  const isHead = sameId(head?._id, user._id);

  const members = records
    .filter(r => !viewer || !sameId(r._id, viewer._id))
    .map(r => ({
      id: r._id,
      memberCode: r.memberCode,
      name: r.name,
      relation: relationLabel(viewer, r, head),
      relationToHead: r.relationToHead,
      gender: r.gender,
      dob: r.dob ? r.dob.toISOString().slice(0, 10) : '',
      age: r.age,
      phone: r.phone,
      maritalStatus: r.maritalStatus,
      occupation: r.occupation,
      avatar: r.avatar,
      approvalStatus: r.approvalStatus,
      approvals: r.approvals,
      linkStatus: r.linkStatus,
      isLinked: !!r.userId,
      activityStatus: activityStatusOf(r),
      janganaStatus: janganaStatusOf(r),
      canManage: r.relationToHead !== 'Self' && (isHead || sameId(r.addedBy, user._id))
    }));

  return {
    family: {
      id: family._id,
      familyCode: family.familyCode,
      city: family.city,
      head: head ? { id: head._id, name: head.name, avatar: head.avatar } : null,
      isHead
    },
    self: viewer ? {
      id: viewer._id,
      memberCode: viewer.memberCode,
      relationToHead: viewer.relationToHead,
      approvalStatus: viewer.approvalStatus
    } : null,
    summary: summarize(records),
    members
  };
};

// ─── Legacy sync (onboarding / profile update still send familyMembers[]) ─────

/**
 * @param {Object} user            - User document (already saved)
 * @param {Array}  entries         - familyMembers[] as sent by the client
 * @param {Array}  previousEntries - the user's familyMembers[] before this update
 */
const syncLegacyFamilyMembers = async (user, entries, previousEntries = []) => {
  if (!Array.isArray(entries)) return;
  const { family, selfRecord } = await ensureFamily(user);
  if (selfRecord.approvalStatus !== 'approved') return;

  const seen = new Set();
  for (const entry of entries) {
    if (!entry) continue;
    let recordId = entry.recordId && mongoose.Types.ObjectId.isValid(entry.recordId) ? entry.recordId.toString() : null;
    if (recordId) seen.add(recordId);
    if (!entry.name) continue;

    // Clients holding a stale copy may resend entries without recordId — match by name
    if (!recordId) {
      const nameRegex = new RegExp(`^${escapeRegex(entry.name.trim())}$`, 'i');
      const byName = await FamilyMember.findOne({ familyId: family._id, isRemoved: false, name: nameRegex }).select('_id').lean();
      if (byName) {
        recordId = byName._id.toString();
        seen.add(recordId);
      }
    }

    try {
      if (recordId) {
        const existing = await FamilyMember.findOne({ _id: recordId, familyId: family._id, isRemoved: false });
        if (!existing) continue;
        // Only re-send the relation when it was changed from what we mirrored
        const mirrored = (previousEntries || []).find(m => m.recordId && m.recordId.toString() === recordId);
        const payload = { ...entry };
        if (!mirrored || mirrored.relation === entry.relation) delete payload.relation;
        if (existing.userId) delete payload.name;
        await updateMember(user, recordId, payload, { skipRefresh: true });
      } else {
        const created = await addMember(user, entry, { skipRefresh: true });
        seen.add(created._id.toString());
      }
    } catch (err) {
      if (!(err instanceof FamilyError)) throw err;
      console.warn('[familyService] legacy sync skipped entry:', err.message);
    }
  }

  // Entries the user deleted from the array → remove the ones they manage
  const managed = await FamilyMember.find({
    familyId: family._id, isRemoved: false, relationToHead: { $ne: 'Self' }, addedBy: user._id
  }).select('_id');
  for (const r of managed) {
    if (!seen.has(r._id.toString())) {
      await removeMember(user, r._id, { skipRefresh: true }).catch(err => console.warn('[familyService] legacy remove skipped:', err.message));
    }
  }

  await refreshLegacyArrays(family._id);
};

module.exports = {
  FamilyError,
  activityStatusOf,
  janganaStatusOf,
  normalizePhone,
  reviewerLevel,
  ensureFamily,
  addMember,
  updateMember,
  removeMember,
  listRequests,
  reviewMember,
  listInvitations,
  respondToInvitation,
  activatePendingInvitations,
  getFamilyView,
  syncLegacyFamilyMembers,
  refreshLegacyArrays
};
