/**
 * matchService.js
 * Calculates match percentage between two MatrimonialProfiles dynamically.
 * Weights are loaded from MatrimonialSettings (Admin-configurable).
 *
 * Only the partner preferences the user has actually set are scored, so the
 * percentage reflects "how well does this profile fit what I asked for".
 */
const MatrimonialSettings = require('../models/MatrimonialSettings');

const DEFAULT_WEIGHTS = {
  community: 20, age: 20, education: 15, profession: 15,
  location: 10, height: 10, lifestyle: 10,
  maritalStatus: 10, religion: 10, income: 10
};

const norm = (v) => (v === undefined || v === null ? '' : String(v)).trim().toLowerCase();

// "Indore, Bhopal" -> ['indore', 'bhopal']
const listOf = (v) => norm(v).split(/[,/|]/).map(s => s.trim()).filter(Boolean);

// Loose text match: either side contains the other, against any listed option.
const textMatches = (pref, value) => {
  const wanted = listOf(pref);
  const have = norm(value);
  if (!wanted.length || !have) return false;
  return wanted.some(w => have.includes(w) || w.includes(have));
};

// "Single", "never_married", "Never Married" are the same thing.
const maritalKey = (v) => {
  const s = norm(v).replace(/[_-]/g, ' ');
  if (!s) return '';
  if (s.includes('never') || s === 'single' || s === 'unmarried') return 'never married';
  if (s.includes('divorc')) return 'divorced';
  if (s.includes('widow')) return 'widowed';
  if (s.includes('separat')) return 'separated';
  return s;
};

// Preference value -> which marital statuses are acceptable (null = any).
const acceptableMarital = (pref) => {
  const s = norm(pref);
  if (!s || s.includes("doesn") || s.includes('any') || s.includes('allowed')) return null;
  if (s.includes('never') || s === 'single') return ['never married'];
  return listOf(pref).map(maritalKey);
};

// Income text -> lakhs per annum (lower bound). "1 CR" -> 100, "10-15 LPA" -> 10, "8-12 Lakhs" -> 8.
const incomeLakhs = (v) => {
  const s = norm(v).replace(/,/g, '');
  const m = s.match(/(\d+(\.\d+)?)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (/cr|crore/.test(s)) return n * 100;
  if (/lpa|lakh|lac|\bl\b/.test(s)) return n;
  if (/k\b|thousand/.test(s)) return (n * 1000) / 100000;
  return n >= 1000 ? n / 100000 : n; // bare numbers: rupees if large, else lakhs
};

const calcAge = (dob) => {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

/**
 * Hard filters ("must match"): age range and marital status. Used to decide whether
 * a profile belongs in "My matches" at all. Unset preferences never exclude anyone.
 */
const passesHardPreferences = (myProfile, targetProfile) => {
  const prefs = myProfile?.preferences || {};
  const age = calcAge(targetProfile.personal?.dateOfBirth);
  if (age !== null) {
    if (prefs.ageMin && age < Number(prefs.ageMin)) return false;
    if (prefs.ageMax && age > Number(prefs.ageMax)) return false;
  }
  const allowed = acceptableMarital(prefs.maritalStatus);
  if (allowed) {
    const theirs = maritalKey(targetProfile.personal?.maritalStatus);
    if (theirs && !allowed.includes(theirs)) return false;
  }
  return true;
};

/**
 * @param {Object} myProfile     - The logged-in user's MatrimonialProfile
 * @param {Object} targetProfile - The profile being viewed
 * @returns {{ matchPercentage: Number, matchedCriteria: String[] }}
 */
const calculateMatchPercentage = async (myProfile, targetProfile, customWeights = null) => {
  let weights = customWeights;
  if (!weights) {
    const settings = await MatrimonialSettings.findOne().lean();
    weights = settings?.matchWeights;
  }
  weights = { ...DEFAULT_WEIGHTS, ...(weights || {}) };

  const prefs = myProfile?.preferences || {};
  let score = 0;
  let possible = 0;
  const matchedCriteria = [];

  // Adds a criterion only when the user expressed a preference for it.
  const check = (key, label, applicable, matched) => {
    if (!applicable) return;
    possible += weights[key] || 0;
    if (matched) {
      score += weights[key] || 0;
      matchedCriteria.push(label);
    }
  };

  check('community', 'Community', !!norm(prefs.community), textMatches(prefs.community, targetProfile.personal?.community));

  const targetAge = calcAge(targetProfile.personal?.dateOfBirth);
  check('age', 'Age', !!(prefs.ageMin || prefs.ageMax),
    targetAge !== null && (!prefs.ageMin || targetAge >= Number(prefs.ageMin)) && (!prefs.ageMax || targetAge <= Number(prefs.ageMax)));

  check('education', 'Education', !!norm(prefs.education), textMatches(prefs.education, targetProfile.education?.highestQualification));
  check('profession', 'Profession', !!norm(prefs.occupation), textMatches(prefs.occupation, targetProfile.education?.profession));
  check('location', 'Location', !!norm(prefs.city), textMatches(prefs.city, targetProfile.location?.city));

  const h = Number(targetProfile.personal?.height);
  check('height', 'Height', !!(prefs.heightMin || prefs.heightMax),
    h > 0 && (!prefs.heightMin || h >= Number(prefs.heightMin)) && (!prefs.heightMax || h <= Number(prefs.heightMax)));

  const allowedMarital = acceptableMarital(prefs.maritalStatus);
  check('maritalStatus', 'Marital Status', !!allowedMarital,
    !!allowedMarital && allowedMarital.includes(maritalKey(targetProfile.personal?.maritalStatus)));

  check('religion', 'Religion', !!norm(prefs.religion), textMatches(prefs.religion, targetProfile.personal?.religion));

  const wantIncome = incomeLakhs(prefs.incomeMin);
  const theirIncome = incomeLakhs(targetProfile.education?.annualIncome);
  check('income', 'Income', wantIncome !== null, theirIncome !== null && theirIncome >= wantIncome);

  // No partner preference set at all: no basis for a score (ordering falls back to activity).
  if (possible === 0) return { matchPercentage: 0, matchedCriteria: [] };

  // Lifestyle: same diet as mine (not a stated preference, so only when both are known).
  const myDiet = norm(myProfile?.lifestyle?.diet);
  const tgDiet = norm(targetProfile.lifestyle?.diet);
  check('lifestyle', 'Lifestyle', !!(myDiet && tgDiet), myDiet === tgDiet);

  const matchPercentage = possible > 0 ? Math.round((score / possible) * 100) : 0;
  return { matchPercentage, matchedCriteria };
};

module.exports = { calculateMatchPercentage, passesHardPreferences, calcAge, incomeLakhs, maritalKey };
