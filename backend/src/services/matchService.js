/**
 * matchService.js
 * Calculates match percentage between two MatrimonialProfiles dynamically.
 * Weights are loaded from MatrimonialSettings (Admin-configurable).
 */
const MatrimonialSettings = require('../models/MatrimonialSettings');

/**
 * @param {Object} myProfile     - The logged-in user's MatrimonialProfile
 * @param {Object} targetProfile - The profile being viewed
 * @returns {{ matchPercentage: Number, matchedCriteria: String[] }}
 */
const calculateMatchPercentage = async (myProfile, targetProfile, customWeights = null) => {
  // Load admin-configurable weights (fallback to defaults if not set)
  let weights = customWeights;
  if (!weights) {
    let settings = await MatrimonialSettings.findOne().lean();
    weights = settings?.matchWeights;
  }
  if (!weights) {
    weights = {
      community: 20, age: 20, education: 15, profession: 15,
      location: 10, height: 10, lifestyle: 10
    };
  }

  let score = 0;
  const matchedCriteria = [];

  // ─── 1. Community (20%) ──────────────────────────────────────────────────
  const myPrefCommunity  = myProfile.preferences?.community;
  const targetCommunity  = targetProfile.personal?.community;
  if (myPrefCommunity && targetCommunity &&
      myPrefCommunity.toLowerCase() === targetCommunity.toLowerCase()) {
    score += weights.community;
    matchedCriteria.push('Community');
  }

  // ─── 2. Age (20%) ────────────────────────────────────────────────────────
  const targetAge = calcAge(targetProfile.personal?.dateOfBirth);
  const ageMin = myProfile.preferences?.ageMin;
  const ageMax = myProfile.preferences?.ageMax;
  if (targetAge !== null && ageMin && ageMax && targetAge >= ageMin && targetAge <= ageMax) {
    score += weights.age;
    matchedCriteria.push('Age');
  }

  // ─── 3. Education (15%) ──────────────────────────────────────────────────
  const myPrefEdu    = myProfile.preferences?.education;
  const targetEdu    = targetProfile.education?.highestQualification;
  if (myPrefEdu && targetEdu && myPrefEdu.toLowerCase() === targetEdu.toLowerCase()) {
    score += weights.education;
    matchedCriteria.push('Education');
  }

  // ─── 4. Profession (15%) ─────────────────────────────────────────────────
  const myPrefProf   = myProfile.preferences?.occupation;
  const targetProf   = targetProfile.education?.profession;
  if (myPrefProf && targetProf && myPrefProf.toLowerCase() === targetProf.toLowerCase()) {
    score += weights.profession;
    matchedCriteria.push('Profession');
  }

  // ─── 5. Location (10%) ───────────────────────────────────────────────────
  const myPrefCity   = myProfile.preferences?.city;
  const targetCity   = targetProfile.location?.city;
  if (myPrefCity && targetCity && myPrefCity.toLowerCase() === targetCity.toLowerCase()) {
    score += weights.location;
    matchedCriteria.push('Location');
  }

  // ─── 6. Height (10%) ─────────────────────────────────────────────────────
  const myHeightMin  = myProfile.preferences?.heightMin;
  const myHeightMax  = myProfile.preferences?.heightMax;
  const targetHeight = targetProfile.personal?.height;
  if (targetHeight && myHeightMin && myHeightMax &&
      targetHeight >= myHeightMin && targetHeight <= myHeightMax) {
    score += weights.height;
    matchedCriteria.push('Height');
  }

  // ─── 7. Lifestyle / Diet (10%) ───────────────────────────────────────────
  // Here we check if target's diet aligns with typical preference similarities
  const myDiet = myProfile.lifestyle?.diet;
  const tgDiet = targetProfile.lifestyle?.diet;
  if (myDiet && tgDiet && myDiet.toLowerCase() === tgDiet.toLowerCase()) {
    score += weights.lifestyle;
    matchedCriteria.push('Lifestyle');
  }

  const totalPossible = Object.values(weights).reduce((sum, w) => sum + w, 0);
  const matchPercentage = Math.round((score / totalPossible) * 100);

  return { matchPercentage, matchedCriteria };
};

// ─── Helper ──────────────────────────────────────────────────────────────────
const calcAge = (dob) => {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

module.exports = { calculateMatchPercentage, calcAge };
