/**
 * Matrimonial profile completion — the single source of truth.
 *
 * Only fields a member can actually fill in the app are counted, each with a
 * readable label and the screen where it's filled (MatrimonialVisibilityManager
 * screen ids), so the app can show exactly what's missing.
 *
 * The stored percentage also gates who appears in the feed / search
 * (MatrimonialSettings.profileCompletionRequired), so it's recalculated on every
 * save (model pre-save hook) — see scripts/recalcMatrimonialCompletion.js for
 * existing profiles.
 */
const filled = (v) => v !== undefined && v !== null && String(v).trim() !== '';

const COMPLETION_ITEMS = [
  { key: 'fullName',             label: 'Full name',             screen: 'edit-profile', isFilled: p => filled(p.personal?.fullName) },
  { key: 'dateOfBirth',          label: 'Date of birth',         screen: 'edit-profile', isFilled: p => filled(p.personal?.dateOfBirth) },
  { key: 'gender',               label: 'Gender',                screen: 'edit-profile', isFilled: p => filled(p.personal?.gender) },
  { key: 'maritalStatus',        label: 'Marital status',        screen: 'edit-profile', isFilled: p => filled(p.personal?.maritalStatus) },
  { key: 'community',            label: 'Community',             screen: 'edit-profile', isFilled: p => filled(p.personal?.community) },
  { key: 'gotra',                label: 'Gotra',                 screen: 'edit-profile', isFilled: p => filled(p.personal?.gotra) },
  { key: 'highestQualification', label: 'Highest qualification', screen: 'edit-profile', isFilled: p => filled(p.education?.highestQualification) },
  { key: 'profession',           label: 'Profession',            screen: 'edit-profile', isFilled: p => filled(p.education?.profession) },
  { key: 'annualIncome',         label: 'Annual income',         screen: 'edit-profile', isFilled: p => filled(p.education?.annualIncome) },
  { key: 'diet',                 label: 'Diet',                  screen: 'edit-profile', isFilled: p => filled(p.lifestyle?.diet) },
  { key: 'city',                 label: 'City',                  screen: 'edit-profile', isFilled: p => filled(p.location?.city) },
  { key: 'state',                label: 'State',                 screen: 'edit-profile', isFilled: p => filled(p.location?.state) },
  { key: 'biography',            label: 'About me',              screen: 'edit-profile', isFilled: p => filled(p.about?.biography) },
  { key: 'photos',               label: 'Profile photo',         screen: 'photos',       isFilled: p => (p.photos || []).some(ph => !ph.isDeleted) },
  { key: 'partnerAge',           label: 'Partner age range',     screen: 'preferences',  isFilled: p => filled(p.preferences?.ageMin) && filled(p.preferences?.ageMax) }
];

/** { percentage, completedSections (item keys), missing: [{ key, label, screen }] } */
const calculateCompletion = (profile) => {
  const p = profile?.toObject ? profile.toObject() : (profile || {});
  const completed = [];
  const missing = [];
  COMPLETION_ITEMS.forEach(item => {
    if (item.isFilled(p)) completed.push(item.key);
    else missing.push({ key: item.key, label: item.label, screen: item.screen });
  });
  return {
    percentage: Math.round((completed.length / COMPLETION_ITEMS.length) * 100),
    completedSections: completed,
    missing
  };
};

module.exports = { COMPLETION_ITEMS, calculateCompletion };
