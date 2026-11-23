/**
 * Role-based Aadhaar response mapper — the ONLY place that decides which Aadhaar
 * fields reach the client.
 *
 *   Everyone (matrimonial viewers, Local Head, Sub Head, Community Head)
 *        → publicAadhaar:  { isAadhaarVerified, aadhaarVerifiedName }
 *   The member themself
 *        → selfAadhaar:    + { aadhaarMasked, aadhaarVerifiedAt }
 *   Admin (role admin / super_admin / master_admin — NOT admin sub-heads),
 *   only via GET /admin/users/:id/aadhaar (audited)
 *        → adminAadhaar:   full KYC record (DOB, gender, address, photo flag, reference…)
 *
 * The User schema backs this up: aadhaarLast4 / aadhaarVerifiedAt / aadhaarHash are
 * `select: false`, and DOB/gender/address/photo live encrypted in AadhaarKycRecord.
 * The DB field is spelled `isAadharVerified` (legacy); responses use `isAadhaarVerified`.
 */

// Fields a non-admin query may select to build publicAadhaar().
const AADHAAR_PUBLIC_SELECT = 'isAadharVerified aadhaarVerifiedName';

// Never sent to anyone except through adminAadhaar()/selfAadhaar().
const AADHAAR_INTERNAL_FIELDS = ['aadhaarLast4', 'aadhaarHash', 'aadhaarVerifiedAt', 'aadhaarName'];

const FULL_AADHAAR_ROLES = ['admin', 'super_admin', 'master_admin'];

/** Admins who may see full Aadhaar details. Admin sub-heads are excluded. */
const isFullAadhaarAdmin = (viewer) => {
  if (!viewer) return false;
  const roles = [viewer.role, ...(Array.isArray(viewer.roles) ? viewer.roles : [])]
    .filter(Boolean).map(r => String(r).toLowerCase());
  return roles.some(r => FULL_AADHAAR_ROLES.includes(r));
};

const maskAadhaar = (last4) => (/^\d{4}$/.test(String(last4 || '')) ? `XXXX-XXXX-${last4}` : null);

const GENDER_LABELS = { M: 'Male', F: 'Female', T: 'Transgender' };
const genderLabel = (g) => GENDER_LABELS[String(g || '').toUpperCase()] || (g || null);

/** What any viewer may know: verified or not, and the name exactly as on the Aadhaar. */
const publicAadhaar = (user) => {
  const verified = !!user?.isAadharVerified;
  return {
    isAadhaarVerified: verified,
    aadhaarVerifiedName: verified ? (user.aadhaarVerifiedName || null) : null
  };
};

/** The member's own view. Needs a query that selected +aadhaarLast4 +aadhaarVerifiedAt. */
const selfAadhaar = (user) => {
  const base = publicAadhaar(user);
  return {
    ...base,
    aadhaarMasked: base.isAadhaarVerified ? maskAadhaar(user.aadhaarLast4) : null,
    aadhaarVerifiedAt: base.isAadhaarVerified ? (user.aadhaarVerifiedAt || null) : null
  };
};

/**
 * Full Aadhaar object for Admins.
 * @param user    User with +aadhaarLast4 +aadhaarVerifiedAt selected
 * @param record  AadhaarKycRecord (lean) or null
 * @param details decrypted { dob, gender, address } or null
 */
const adminAadhaar = (user, record, details) => {
  const base = publicAadhaar(user);
  const last4 = record?.aadhaarLast4 || user?.aadhaarLast4 || '';
  // Members verified before UIDAI OTP existed (Head approval / old test flow) have no KYC record.
  const source = record ? 'uidai_otp' : (base.isAadhaarVerified ? 'manual' : null);
  return {
    ...base,
    aadhaarVerifiedName: base.aadhaarVerifiedName || record?.verifiedName || null,
    aadhaarMasked: maskAadhaar(last4),
    fullNumberStored: false, // only the last 4 digits are ever kept
    verificationStatus: base.isAadhaarVerified ? 'verified' : 'not_verified',
    verifiedAt: record?.verifiedAt || user?.aadhaarVerifiedAt || null,
    source,
    method: record ? (record.method === 'aadhaar_otp' ? 'Aadhaar OTP (UIDAI)' : record.method) : null,
    provider: record?.provider || null,
    referenceId: record?.referenceId || null,
    mode: record?.mode || null,
    dob: details?.dob || null,
    gender: genderLabel(details?.gender),
    address: details?.address || null,
    hasPhoto: !!record?.hasPhoto,
    detailsStored: !!record?.detailsStored
  };
};

/**
 * A user object safe for non-admin viewers: internal Aadhaar fields removed and
 * the public pair added. Works on lean objects and plain copies.
 */
const withPublicAadhaar = (user) => {
  if (!user || typeof user !== 'object') return user;
  const out = { ...user };
  AADHAAR_INTERNAL_FIELDS.forEach(f => { delete out[f]; });
  return { ...out, ...publicAadhaar(user) };
};

module.exports = {
  AADHAAR_PUBLIC_SELECT,
  AADHAAR_INTERNAL_FIELDS,
  isFullAadhaarAdmin,
  maskAadhaar,
  publicAadhaar,
  selfAadhaar,
  adminAadhaar,
  withPublicAadhaar
};
