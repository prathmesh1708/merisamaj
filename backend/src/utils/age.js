// Exact age in whole years (birthday-aware), or null for a missing / invalid date.
const ageOn = (dob, today = new Date()) => {
  const d = dob instanceof Date ? dob : new Date(dob);
  if (!dob || Number.isNaN(d.getTime())) return null;
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return age;
};

// Child Safety Standards Policy: accounts are 18+. Matrimonial follows the
// Prohibition of Child Marriage Act, 2006: 18 for women, 21 for men.
const MIN_ACCOUNT_AGE = 18;
const minMarriageAge = (gender) => (String(gender || '').toLowerCase().startsWith('m') ? 21 : 18);

module.exports = { ageOn, MIN_ACCOUNT_AGE, minMarriageAge };
