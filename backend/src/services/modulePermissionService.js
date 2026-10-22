/**
 * modulePermissionService.js
 * Hierarchical module access: Master Admin → Community Head → Local Head → Sub-Head.
 *
 * Rule: a user's EFFECTIVE modules =
 *         (modules their parent gave them, or everything the parent has if not restricted)
 *       ∩ (their parent's effective modules)            ← recursive up to the Master Admin
 *       ∩ (modules switched on by their community's plan)
 *
 * Because the parent intersection is applied on every check, a child can never
 * hold a module its parent lost. Stored grants of restricted descendants are also
 * pruned immediately when an ancestor loses a module (reconcileDescendants), so
 * the stored data matches what is enforced, and each prune is audit-logged.
 *
 * Parent of a user:
 *   Community Head (role 'head')       → Master Admin (has every module)
 *   Local Head / Sub-Head ('sub_head') → parentHeadId; for accounts created without
 *                                        one, their community's Community Head
 */
const User = require('../models/User');
const Community = require('../models/Community');
const PermissionAuditLog = require('../models/PermissionAuditLog');
const cacheService = require('../utils/cacheService');
const { ALL_MODULE_KEYS, MODULE_BY_KEY } = require('../config/moduleCatalog');

const MASTER_ROLES = ['admin', 'super_admin', 'master_admin', 'master'];
const USER_FIELDS = 'name email phone role accountType subHeadType parentHeadId communityId assignedCommunityIds moduleAccess accountStatus city designation avatar createdAt';
const EFFECTIVE_TTL = 30;      // seconds — cache is flushed on every change anyway
const MAX_DEPTH = 6;           // hierarchy is 4 levels; guards against bad parent loops
const MAX_DESCENDANTS = 5000;

const idStr = (v) => (v && (v._id || v))?.toString() || null;
const isMasterAdmin = (u) => MASTER_ROLES.includes((u?.role || '').toLowerCase());
// Admin Sub-Heads live in the Admin panel with their own adminPermissions — not in this tree
const isHierarchyUser = (u) => u?.role === 'head' || (u?.role === 'sub_head' && u?.subHeadType !== 'admin');
const communityIdOf = (u) => idStr(u?.communityId) || idStr(u?.assignedCommunityIds?.[0]) || null;

const httpError = (status, message, extra = {}) => Object.assign(new Error(message), { status, ...extra });

const loadUser = (id) => User.findById(id).select(USER_FIELDS).lean();

const invalidateEffectiveCache = () => cacheService.invalidate('modperm_eff_');

const roleLabel = (u) => {
  if (!u) return 'Master Admin';
  if (isMasterAdmin(u)) return 'Master Admin';
  if (u.role === 'head') return 'Community Head';
  if (u.accountType === 'local_head') return 'Local Head';
  if (u.accountType === 'local_sub_head') return 'Local Sub-Head';
  if (u.accountType === 'community_sub_head') return 'Sub-Community Head';
  if (u.accountType === 'leadership') return 'Leadership Member';
  return 'Sub-Head';
};

// ─── Hierarchy ────────────────────────────────────────────────────────────────

/** The user's parent administrator (lean doc), or null when the parent is the Master Admin */
const resolveParent = async (user) => {
  if (!user || user.role !== 'sub_head') return null;
  if (user.parentHeadId && idStr(user.parentHeadId) !== idStr(user._id)) {
    const parent = await loadUser(user.parentHeadId);
    if (parent && isHierarchyUser(parent)) return parent;
  }
  // Legacy accounts created without parentHeadId → their community's Community Head
  const cid = communityIdOf(user);
  if (!cid) return null;
  return User.findOne({
    role: 'head',
    accountStatus: { $ne: 'deleted' },
    $or: [{ communityId: cid }, { assignedCommunityIds: cid }]
  }).sort({ createdAt: 1 }).select(USER_FIELDS).lean();
};

/** Users whose direct parent is `manager` */
const getDirectChildren = async (manager) => {
  if (isMasterAdmin(manager)) {
    return User.find({ role: 'head', accountStatus: { $ne: 'deleted' } })
      .select(USER_FIELDS).sort({ name: 1 }).lean();
  }
  if (!isHierarchyUser(manager)) return [];

  const or = [{ parentHeadId: manager._id }];
  if (manager.role === 'head') {
    const cids = [...new Set([communityIdOf(manager), ...(manager.assignedCommunityIds || []).map(idStr)].filter(Boolean))];
    if (cids.length) or.push({ parentHeadId: null, communityId: { $in: cids } });
  }
  const candidates = await User.find({
    role: 'sub_head',
    subHeadType: { $ne: 'admin' },
    accountStatus: { $ne: 'deleted' },
    _id: { $ne: manager._id },
    $or: or
  }).select(USER_FIELDS).sort({ name: 1 }).lean();

  // The legacy fallback can match a community with several heads — keep only true children
  const managerId = idStr(manager._id);
  const checks = await Promise.all(candidates.map(async c =>
    idStr(c.parentHeadId) === managerId || idStr((await resolveParent(c))?._id) === managerId));
  return candidates.filter((_, i) => checks[i]);
};

/** Every user below `root`, parents before children */
const getDescendants = async (root) => {
  const out = [];
  const seen = new Set([idStr(root._id)]);
  const queue = [root];
  while (queue.length && out.length < MAX_DESCENDANTS) {
    const current = queue.shift();
    for (const child of await getDirectChildren(current)) {
      const id = idStr(child._id);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(child);
      queue.push(child);
    }
  }
  return out;
};

const isDirectParent = async (manager, target) => {
  if (isMasterAdmin(manager)) return target.role === 'head';
  if (!isHierarchyUser(manager) || !isHierarchyUser(target)) return false;
  return idStr((await resolveParent(target))?._id) === idStr(manager._id);
};

// ─── Effective modules ────────────────────────────────────────────────────────

/** Modules the community's plan allows (Community.settings.<x>Enabled !== false) */
const communityAllowedModules = async (user) => {
  const cid = communityIdOf(user);
  if (!cid) return ALL_MODULE_KEYS;
  const key = `modperm_comm_${cid}`;
  let allowed = cacheService.get(key);
  if (!allowed) {
    const community = await Community.findById(cid).select('settings').lean();
    allowed = ALL_MODULE_KEYS.filter(k => {
      const setting = MODULE_BY_KEY.get(k).communitySetting;
      return !setting || community?.settings?.[setting] !== false;
    });
    cacheService.set(key, allowed, 60);
  }
  return allowed;
};

/**
 * Effective module keys for a user id (always read fresh from the DB, never from
 * the cached req.user, so a change applies within one request).
 */
const getEffectiveModules = async (userId, depth = 0) => {
  if (!userId) return [];
  const cacheKey = `modperm_eff_${idStr(userId)}`;
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  const user = await loadUser(userId);
  let effective;
  if (!user || user.accountStatus === 'deleted') {
    effective = [];
  } else if (isMasterAdmin(user)) {
    effective = [...ALL_MODULE_KEYS];
  } else if (!isHierarchyUser(user) || depth > MAX_DEPTH) {
    effective = [];
  } else {
    const parent = await resolveParent(user);
    const parentModules = parent ? await getEffectiveModules(parent._id, depth + 1) : ALL_MODULE_KEYS;
    const own = user.moduleAccess?.restricted ? (user.moduleAccess.modules || []) : parentModules;
    const communityModules = await communityAllowedModules(user);
    effective = ALL_MODULE_KEYS.filter(k =>
      own.includes(k) && parentModules.includes(k) && communityModules.includes(k));
  }
  cacheService.set(cacheKey, effective, EFFECTIVE_TTL);
  return effective;
};

const hasModule = async (userId, moduleKey) => (await getEffectiveModules(userId)).includes(moduleKey);

// ─── Assignment ───────────────────────────────────────────────────────────────

const diff = (a, b) => a.filter(k => !b.includes(k));

const summarize = async (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  accountType: user.accountType || null,
  roleLabel: roleLabel(user),
  designation: user.designation,
  city: user.city,
  avatar: user.avatar,
  accountStatus: user.accountStatus,
  restricted: !!user.moduleAccess?.restricted,
  assignedModules: user.moduleAccess?.restricted ? (user.moduleAccess.modules || []) : [],
  effectiveModules: await getEffectiveModules(user._id),
  assignedBy: user.moduleAccess?.assignedBy || null,
  updatedAt: user.moduleAccess?.updatedAt || null
});

/**
 * Remove from every restricted descendant the modules its parent no longer has.
 * Runs parents-first, so a prune at one level flows down to the next.
 */
const reconcileDescendants = async (root, { actor, triggerLogId, ipAddress }) => {
  const changes = [];
  for (const d of await getDescendants(root)) {
    if (!d.moduleAccess?.restricted) continue; // inherits — already narrowed by the intersection
    const parent = await resolveParent(d);
    const parentModules = parent ? await getEffectiveModules(parent._id) : ALL_MODULE_KEYS;
    const current = d.moduleAccess.modules || [];
    const kept = current.filter(k => parentModules.includes(k));
    const removed = diff(current, kept);
    if (!removed.length) continue;

    await User.updateOne({ _id: d._id }, { $set: { 'moduleAccess.modules': kept, 'moduleAccess.updatedAt': new Date() } });
    invalidateEffectiveCache();
    await PermissionAuditLog.create({
      actorId: actor._id, actorName: actor.name, actorRole: roleLabel(actor),
      targetId: d._id, targetName: d.name, targetRole: d.role, targetAccountType: d.accountType || '',
      communityId: communityIdOf(d),
      action: 'cascade_revoke',
      removed, modulesBefore: current, modulesAfter: kept,
      cascadeFrom: triggerLogId, ipAddress
    });
    changes.push({ userId: d._id, name: d.name, roleLabel: roleLabel(d), removed });
  }
  return changes;
};

/**
 * Set the modules of a DIRECT subordinate.
 *   modules: exact list (subset of the actor's effective modules), or
 *   inheritAll: true → subordinate gets whatever the actor has, now and later
 */
const assignModules = async ({ actor, targetId, modules, inheritAll = false, ipAddress = '' }) => {
  if (!isMasterAdmin(actor) && !isHierarchyUser(actor)) {
    throw httpError(403, 'Only the Master Admin and Heads can delegate modules.');
  }
  const target = await loadUser(targetId);
  if (!target || target.accountStatus === 'deleted') throw httpError(404, 'User not found.');
  if (idStr(target._id) === idStr(actor._id)) throw httpError(400, 'You cannot change your own module access.');
  // The Master Admin may set any account in the tree; everyone else only their direct reports.
  // Either way the ceiling is the target's parent's modules (child ⊆ parent).
  const actorIsMaster = isMasterAdmin(actor);
  if (actorIsMaster ? !isHierarchyUser(target) : !(await isDirectParent(actor, target))) {
    throw httpError(403, 'You can only manage module access of users directly under you.');
  }
  const targetParent = await resolveParent(target);

  let nextModules = [];
  if (!inheritAll) {
    if (!Array.isArray(modules) || modules.some(m => typeof m !== 'string')) {
      throw httpError(400, '`modules` must be an array of module keys.');
    }
    const unique = [...new Set(modules)];
    if (unique.length !== modules.length) throw httpError(400, 'Duplicate modules in the request.');
    const invalid = unique.filter(k => !MODULE_BY_KEY.has(k));
    if (invalid.length) throw httpError(400, `Unknown module(s): ${invalid.join(', ')}`, { invalid });
    const ceiling = actorIsMaster
      ? (targetParent ? await getEffectiveModules(targetParent._id) : ALL_MODULE_KEYS)
      : await getEffectiveModules(actor._id);
    const notOwned = unique.filter(k => !ceiling.includes(k));
    if (notOwned.length) {
      const labels = notOwned.map(k => MODULE_BY_KEY.get(k).label).join(', ');
      throw httpError(403, actorIsMaster && targetParent
        ? `${targetParent.name} (${roleLabel(targetParent)}) doesn't have: ${labels}. Grant it to them first.`
        : `You cannot assign modules you don't have: ${labels}`, { notOwned });
    }
    nextModules = ALL_MODULE_KEYS.filter(k => unique.includes(k)); // catalog order
  }

  const wasRestricted = !!target.moduleAccess?.restricted;
  const previous = target.moduleAccess?.modules || [];
  const unchanged = inheritAll
    ? !wasRestricted
    : wasRestricted && previous.length === nextModules.length && nextModules.every(k => previous.includes(k));
  if (unchanged) {
    return { unchanged: true, user: await summarize(target), cascade: [] };
  }

  const before = await getEffectiveModules(target._id);
  await User.updateOne({ _id: target._id }, {
    $set: {
      'moduleAccess.restricted': !inheritAll,
      'moduleAccess.modules': nextModules,
      'moduleAccess.assignedBy': actor._id,
      'moduleAccess.updatedAt': new Date()
    }
  });
  invalidateEffectiveCache();
  const after = await getEffectiveModules(target._id);

  const log = await PermissionAuditLog.create({
    actorId: actor._id, actorName: actor.name, actorRole: roleLabel(actor),
    targetId: target._id, targetName: target.name, targetRole: target.role, targetAccountType: target.accountType || '',
    communityId: communityIdOf(target),
    action: inheritAll ? 'inherit_all' : 'assign',
    added: diff(after, before), removed: diff(before, after),
    modulesBefore: before, modulesAfter: after,
    ipAddress
  });

  const cascade = await reconcileDescendants(target, { actor, triggerLogId: log._id, ipAddress });
  return { unchanged: false, user: await summarize(await loadUser(target._id)), cascade, auditId: log._id };
};

// ─── Read APIs ────────────────────────────────────────────────────────────────

/**
 * Which modules can be given to a user (or to a new user about to be created
 * under a given parent), plus where they come from. Used by the Local Head /
 * Sub-Head forms in the Admin and Head panels.
 *   targetId    existing user being edited
 *   parentId    parent of a user being created (defaults to the actor)
 *   communityId Master Admin creating a Local Head: parent = that community's Head
 */
const getAssignable = async (actor, { targetId, parentId, communityId } = {}) => {
  const actorIsMaster = isMasterAdmin(actor);
  if (!actorIsMaster && !isHierarchyUser(actor)) throw httpError(403, 'Not allowed.');

  let target = null;
  let parent = null;
  if (targetId) {
    target = await loadUser(targetId);
    if (!target || !isHierarchyUser(target)) throw httpError(404, 'User not found.');
    parent = await resolveParent(target);
    if (!actorIsMaster && idStr(parent?._id) !== idStr(actor._id)) {
      throw httpError(403, 'You can only manage module access of users directly under you.');
    }
  } else if (parentId) {
    if (!actorIsMaster && idStr(parentId) !== idStr(actor._id)) throw httpError(403, 'Not allowed.');
    parent = await loadUser(parentId);
    if (!parent || !isHierarchyUser(parent)) throw httpError(404, 'Parent administrator not found.');
  } else if (communityId && actorIsMaster) {
    parent = await User.findOne({
      role: 'head', accountStatus: { $ne: 'deleted' },
      $or: [{ communityId }, { assignedCommunityIds: communityId }]
    }).sort({ createdAt: 1 }).select(USER_FIELDS).lean();
  } else if (!actorIsMaster) {
    parent = await loadUser(actor._id);
  }

  return {
    available: parent ? await getEffectiveModules(parent._id) : [...ALL_MODULE_KEYS],
    parent: parent
      ? { _id: parent._id, name: parent.name, roleLabel: roleLabel(parent) }
      : { _id: null, name: 'Master Admin', roleLabel: 'Master Admin' },
    target: target ? await summarize(target) : null
  };
};

const getMyAccess = async (actor) => {
  const me = isMasterAdmin(actor) ? actor : await loadUser(actor._id);
  const parent = isMasterAdmin(me) ? null : await resolveParent(me);
  const children = await getDirectChildren(me);
  return {
    modules: await getEffectiveModules(me._id),
    isMasterAdmin: isMasterAdmin(me),
    roleLabel: roleLabel(me),
    parent: isMasterAdmin(me) ? null : (parent
      ? { _id: parent._id, name: parent.name, roleLabel: roleLabel(parent) }
      : { _id: null, name: 'Master Admin', roleLabel: 'Master Admin' }),
    restricted: !!me.moduleAccess?.restricted,
    subordinateCount: children.length,
    canDelegate: isMasterAdmin(me) || me.role === 'head' || me.accountType === 'local_head' || children.length > 0
  };
};

const getSubordinates = async (actor, { search = '' } = {}) => {
  if (!isMasterAdmin(actor) && !isHierarchyUser(actor)) throw httpError(403, 'Not allowed.');
  const me = isMasterAdmin(actor) ? actor : await loadUser(actor._id);
  let children = await getDirectChildren(me);
  const q = String(search || '').trim().toLowerCase();
  if (q) {
    children = children.filter(c =>
      [c.name, c.email, c.phone, c.city, c.designation, roleLabel(c)].some(v => (v || '').toString().toLowerCase().includes(q)));
  }
  return Promise.all(children.map(summarize));
};

/** Audit entries the actor may see: everything for the Master Admin, otherwise their own subtree */
const getAuditLog = async (actor, { targetId, limit = 50, page = 1 } = {}) => {
  const filter = {};
  if (!isMasterAdmin(actor)) {
    if (!isHierarchyUser(actor)) throw httpError(403, 'Not allowed.');
    const me = await loadUser(actor._id);
    const scope = [me, ...(await getDescendants(me))].map(u => u._id);
    filter.$or = [{ actorId: me._id }, { targetId: { $in: scope } }];
  }
  if (targetId) filter.targetId = targetId;
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const [entries, total] = await Promise.all([
    PermissionAuditLog.find(filter).sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).lean(),
    PermissionAuditLog.countDocuments(filter)
  ]);
  return { entries, total, page: safePage, limit: safeLimit };
};

module.exports = {
  isMasterAdmin,
  isHierarchyUser,
  roleLabel,
  resolveParent,
  getDirectChildren,
  getDescendants,
  getEffectiveModules,
  hasModule,
  assignModules,
  getMyAccess,
  getAssignable,
  getSubordinates,
  getAuditLog,
  invalidateEffectiveCache
};
