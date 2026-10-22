/**
 * modulePermissionController.js
 * APIs for the hierarchical module access system, shared by the Admin panel
 * (Master Admin → Community Heads) and the Head panel (Community Head → Local
 * Heads / Sub-Heads, Local Head → their Sub-Heads). Every rule is enforced in
 * services/modulePermissionService.js — never trust the UI.
 */
const { publicCatalog } = require('../config/moduleCatalog');
const mongoose = require('mongoose');
const svc = require('../services/modulePermissionService');

const sendError = (res, err) => {
  const status = err.status || 500;
  if (status === 500) console.error('[ModulePermissions]', err);
  res.status(status).json({
    status: 'error',
    message: status === 500 ? 'Could not process module permissions.' : err.message,
    ...(err.notOwned ? { notOwned: err.notOwned } : {}),
    ...(err.invalid ? { invalid: err.invalid } : {})
  });
};

// GET /api/v1/permissions/me — catalog + my effective modules (drives menus & guards)
exports.getMyModules = async (req, res) => {
  try {
    const access = await svc.getMyAccess(req.user);
    res.json({ status: 'success', data: { catalog: publicCatalog(), ...access } });
  } catch (err) { sendError(res, err); }
};

// GET /api/v1/permissions/assignable?targetId=|parentId=|communityId=
// Modules that can be given to a user being edited / created (for the Local Head forms)
exports.getAssignable = async (req, res) => {
  try {
    const { targetId, parentId, communityId } = req.query;
    const bad = [targetId, parentId, communityId].find(v => v && !mongoose.Types.ObjectId.isValid(v));
    if (bad) return res.status(400).json({ status: 'error', message: 'Invalid id.' });
    const data = await svc.getAssignable(req.user, { targetId, parentId, communityId });
    res.json({ status: 'success', data: { catalog: publicCatalog(), ...data } });
  } catch (err) { sendError(res, err); }
};

// GET /api/v1/permissions/subordinates?search= — users directly under me
exports.getSubordinates = async (req, res) => {
  try {
    const users = await svc.getSubordinates(req.user, { search: req.query.search });
    res.json({ status: 'success', data: { users } });
  } catch (err) { sendError(res, err); }
};

// PUT /api/v1/permissions/users/:userId — body { modules: [...] } or { inheritAll: true }
exports.assignModules = async (req, res) => {
  try {
    const { modules, inheritAll } = req.body || {};
    if (inheritAll !== undefined && typeof inheritAll !== 'boolean') {
      return res.status(400).json({ status: 'error', message: '`inheritAll` must be true or false.' });
    }
    if (!inheritAll && modules === undefined) {
      return res.status(400).json({ status: 'error', message: 'Send `modules` (array) or `inheritAll: true`.' });
    }
    const result = await svc.assignModules({
      actor: req.user,
      targetId: req.params.userId,
      modules,
      inheritAll: inheritAll === true,
      ipAddress: req.ip
    });
    const cascadeNote = result.cascade.length
      ? ` ${result.cascade.length} user(s) below lost the removed module(s) automatically.`
      : '';
    res.json({
      status: 'success',
      message: result.unchanged ? 'No changes — these modules were already assigned.' : `Module access updated.${cascadeNote}`,
      data: result
    });
  } catch (err) { sendError(res, err); }
};

// GET /api/v1/permissions/audit?targetId=&page=&limit=
exports.getAuditLog = async (req, res) => {
  try {
    const data = await svc.getAuditLog(req.user, req.query);
    res.json({ status: 'success', data });
  } catch (err) { sendError(res, err); }
};
