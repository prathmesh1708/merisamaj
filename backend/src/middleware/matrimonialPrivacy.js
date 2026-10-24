/**
 * matrimonialPrivacy.js
 * Server-side field stripper for MatrimonialProfile privacy enforcement.
 * NEVER sends hidden fields to the client — privacy is enforced here, not on the frontend.
 *
 * What a member sees of someone they are NOT connected with (no accepted interest),
 * decided by the owner's "Visible Only After Request Accept" setting
 * (visibilitySettings.visibleOnlyAfterAccept, on by default = private):
 *
 *   Public profile  (setting off): clear photo · age · education · occupation
 *                                  (no name, no address/location)
 *   Private profile (setting on):  BLURRED photo · name · age · education · occupation · income
 *
 * Nothing else is sent (no account id either: it would lead to the member's social
 * profile, i.e. their name and clear avatar). Once an interest is accepted, both see
 * the full profile. The owner always sees their own full profile.
 */

const idOf = (v) => (v ? String(v._id || v) : null);

/** Private = photo blurred until the owner accepts an interest. On unless switched off. */
const isPhotoPrivate = (profile) => profile?.visibilitySettings?.visibleOnlyAfterAccept !== false;

const activePhotos = (profile) => (profile?.photos || []).filter(p => !p.isDeleted);

/** The photo shown on cards: the primary one, else the first. */
const primaryPhotoOf = (profile) => {
  const photos = activePhotos(profile);
  return photos.find(p => p.isPrimary) || photos[0] || null;
};

// Age from the date of birth. The `age` virtual is missing on lean() results, and the
// DOB itself is never sent to unconnected members, so the server works it out.
const ageOf = (profile) => {
  if (typeof profile?.age === 'number') return profile.age;
  const dob = profile?.personal?.dateOfBirth;
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

/** The name a not-yet-connected member may see (null for public profiles). */
const visibleNameOf = (profile) =>
  (profile && isPhotoPrivate(profile) && profile.personal?.fullName) || null;

/**
 * buildRestrictedProfile
 * What a member who is NOT connected to the owner may receive (see the rules above).
 * Private profiles need photo.blurredUrl (services/matrimonialPhotoBlur.ensureBlurredPhotos);
 * without it no photo is sent rather than the clear one.
 * @param {Object} profile - Full MatrimonialProfile object (lean or toObject)
 * @returns {Object} - Restricted profile safe to send to client
 */
const buildRestrictedProfile = (profile) => {
  const isPrivate = isPhotoPrivate(profile);
  const photo = primaryPhotoOf(profile);
  const owner = profile.userId && typeof profile.userId === 'object' ? profile.userId : null;

  let photos = [];
  if (photo && !isPrivate) photos = [{ _id: photo._id, url: photo.url, isPrimary: true }];
  if (photo && isPrivate && photo.blurredUrl) photos = [{ _id: photo._id, url: photo.blurredUrl, isPrimary: true, isBlurred: true }];

  return {
    _id:      profile._id,
    status:   profile.status,
    verificationStatus: profile.verificationStatus,
    photoPrivate: isPrivate,
    photoBlurred: isPrivate,
    photos,
    photoCount: activePhotos(profile).length,
    personal: isPrivate ? { fullName: profile.personal?.fullName } : {},
    age: ageOf(profile), // DOB itself is never sent
    education: {
      highestQualification: profile.education?.highestQualification,
      profession:           profile.education?.profession,
      occupation:           profile.education?.occupation,
      ...(isPrivate ? { annualIncome: profile.education?.annualIncome } : {})
    },
    // Trust badges (not personal details)
    headVerified:    owner ? owner.verificationStatus === 'verified' : undefined,
    aadhaarVerified: owner ? !!owner.isAadharVerified : undefined,
    lastActiveAt: profile.lastActiveAt,
    createdAt:    profile.createdAt,
    // matchPercentage will be injected by the controller
    isRestricted: true
  };
};

/**
 * buildFullProfile
 * Returns the complete profile for the owner or a connected (accepted interest) member.
 * @param {Object} profile - Full MatrimonialProfile object
 * @param {Object} features - User's subscription features (for contact access)
 * @returns {Object}
 */
const buildFullProfile = (profile, features = {}) => {
  const full = profile.toObject ? profile.toObject() : { ...profile };

  // Filter photos to active non-deleted ones; the blurred copies are internal
  if (full.photos) {
    full.photos = full.photos
      .filter(p => !p.isDeleted)
      .map(({ blurredUrl, blurredPublicId, ...p }) => p);
  }

  // Populated account: only what the profile screens use
  if (full.userId && typeof full.userId === 'object' && full.userId._id) {
    const u = full.userId;
    full.userId = {
      _id: u._id, name: u.name, avatar: u.avatar, phone: u.phone, email: u.email,
      subCommunity: u.subCommunity, verificationStatus: u.verificationStatus, isAadharVerified: u.isAadharVerified
    };
  }

  // Contact info: only expose if user has contactDetailsAccess in their plan
  if (!features.contactDetailsAccess) {
    if (full.contactSharing) {
      full.contactSharing = {
        phone: false,
        email: false
      };
    }
  }

  full.age = ageOf(profile);
  full.photoPrivate = isPhotoPrivate(profile);
  full.photoBlurred = false;
  full.isRestricted = false;
  return full;
};

/** Full profile for the owner or a connected member, restricted otherwise. */
const buildProfileForViewer = (profile, { isOwner = false, isConnected = false, features = {} } = {}) =>
  (isOwner || isConnected) ? { ...buildFullProfile(profile, features), isConnected } : buildRestrictedProfile(profile);

/**
 * Of `userIds`, the ones the viewer has an accepted interest with (either direction).
 * @returns {Promise<Set<string>>}
 */
const connectedUserIds = async (viewerId, userIds) => {
  const ids = (userIds || []).filter(Boolean);
  if (!viewerId || ids.length === 0) return new Set();
  const InterestRequest = require('../models/InterestRequest');
  const accepted = await InterestRequest.find({
    status: 'accepted',
    $or: [
      { senderId: viewerId, receiverId: { $in: ids } },
      { senderId: { $in: ids }, receiverId: viewerId }
    ]
  }).select('senderId receiverId').lean();
  return new Set(accepted.map(i => (idOf(i.senderId) === idOf(viewerId) ? idOf(i.receiverId) : idOf(i.senderId))));
};

module.exports = {
  isPhotoPrivate, primaryPhotoOf, visibleNameOf,
  buildRestrictedProfile, buildFullProfile, buildProfileForViewer, connectedUserIds
};
