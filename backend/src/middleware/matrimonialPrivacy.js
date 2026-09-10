/**
 * matrimonialPrivacy.js
 * Server-side field stripper for MatrimonialProfile privacy enforcement.
 * NEVER sends hidden fields to the client — privacy is enforced here, not on the frontend.
 */

const RESTRICTED_FIELDS = [
  'family', 'photos', 'horoscope', 'about',
  'location.address',
  'personal.dateOfBirth',
  'lifestyle',
  'contactSharing'
];

/**
 * buildRestrictedProfile
 * Returns a profile object with only the allowed fields for non-connected viewers.
 * @param {Object} profile - Full MatrimonialProfile object (lean or toObject)
 * @returns {Object} - Restricted profile safe to send to client
 */
const buildRestrictedProfile = (profile) => {
  return {
    _id:      profile._id,
    userId:   profile.userId,
    status:   profile.status,
    visibility: profile.visibility,
    verificationStatus: profile.verificationStatus,
    profileCompletion:  profile.profileCompletion,
    // Only primary photo visible (not full gallery)
    photos: (profile.photos || [])
      .filter(p => !p.isDeleted && p.isPrimary)
      .length > 0
        ? (profile.photos || []).filter(p => !p.isDeleted && p.isPrimary).slice(0, 1)
        : (profile.photos || []).filter(p => !p.isDeleted).slice(0, 1),
    personal: {
      fullName:     profile.personal?.fullName,
      gender:       profile.personal?.gender,
      // Age is derived from DOB but DOB itself is hidden
      height:       profile.personal?.height,
      maritalStatus:profile.personal?.maritalStatus,
      religion:     profile.personal?.religion,
      community:    profile.personal?.community,
      motherTongue: profile.personal?.motherTongue
    },
    age: profile.age, // Virtual (safe to expose)
    education: {
      highestQualification: profile.education?.highestQualification,
      profession:           profile.education?.profession,
      occupation:           profile.education?.occupation
    },
    location: {
      country: profile.location?.country,
      state:   profile.location?.state,
      city:    profile.location?.city
      // address is hidden
    },
    about: {
      biography: profile.about?.biography
        ? profile.about.biography.substring(0, 100) + (profile.about.biography.length > 100 ? '...' : '')
        : null
      // partnerExpectations hidden
    },
    lastActiveAt: profile.lastActiveAt,
    totalProfileViews: profile.totalProfileViews,
    // matchPercentage will be injected by the controller
    isRestricted: true
  };
};

/**
 * buildFullProfile
 * Returns the complete profile for connected (accepted interest) or public profiles.
 * @param {Object} profile - Full MatrimonialProfile object
 * @param {Object} features - User's subscription features (for contact access)
 * @returns {Object}
 */
const buildFullProfile = (profile, features = {}) => {
  const full = profile.toObject ? profile.toObject() : { ...profile };

  // Filter photos to active non-deleted ones
  if (full.photos) {
    full.photos = full.photos.filter(p => !p.isDeleted);
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

  full.isRestricted = false;
  return full;
};

module.exports = { buildRestrictedProfile, buildFullProfile };
