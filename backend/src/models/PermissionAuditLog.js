const mongoose = require('mongoose');

/**
 * PermissionAuditLog — every change to a user's delegated module access
 * (hierarchical module permission system). Written by modulePermissionService.
 *
 * action:
 *   assign          an administrator set the exact modules for a direct subordinate
 *   inherit_all     an administrator switched a subordinate back to "everything I have"
 *   cascade_revoke  modules removed automatically from a descendant because an
 *                   ancestor lost them (cascadeFrom = the change that triggered it)
 */
const permissionAuditLogSchema = new mongoose.Schema(
  {
    actorId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actorName:     { type: String, default: '' },
    actorRole:     { type: String, default: '' },
    targetId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetName:    { type: String, default: '' },
    targetRole:    { type: String, default: '' },
    targetAccountType: { type: String, default: '' },
    communityId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Community', default: null, index: true },
    action:        { type: String, enum: ['assign', 'inherit_all', 'cascade_revoke'], required: true },
    added:         { type: [String], default: [] },
    removed:       { type: [String], default: [] },
    modulesBefore: { type: [String], default: [] },
    modulesAfter:  { type: [String], default: [] },
    cascadeFrom:   { type: mongoose.Schema.Types.ObjectId, ref: 'PermissionAuditLog', default: null },
    ipAddress:     { type: String, default: '' }
  },
  { timestamps: true }
);

permissionAuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PermissionAuditLog', permissionAuditLogSchema);
