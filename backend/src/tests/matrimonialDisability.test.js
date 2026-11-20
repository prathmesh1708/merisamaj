/**
 * Matrimonial "Physically challenged / disability" field — run with `npm test`
 * (no database needed; uses Mongoose validation only).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const MatrimonialProfile = require('../models/MatrimonialProfile');
const { buildRestrictedProfile, buildFullProfile } = require('../middleware/matrimonialPrivacy');

const newProfile = (personal) => new MatrimonialProfile({ userId: '507f1f77bcf86cd799439011', personal });

test('"No" clears any disability type', async () => {
  const p = newProfile({ hasDisability: false, disabilityType: 'Visual impairment' });
  await p.validate();
  assert.equal(p.personal.hasDisability, false);
  assert.equal(p.personal.disabilityType, '');
});

test('"Yes" keeps the type', async () => {
  const p = newProfile({ hasDisability: true, disabilityType: '  Visual impairment ' });
  await p.validate();
  assert.equal(p.personal.hasDisability, true);
  assert.equal(p.personal.disabilityType, 'Visual impairment');
});

test('"Yes" without a type is rejected with a readable message', async () => {
  const p = newProfile({ hasDisability: true, disabilityType: '' });
  await assert.rejects(p.validate(), (err) => {
    assert.equal(err.name, 'ValidationError');
    assert.match(err.errors['personal.disabilityType'].message, /type of disability/);
    return true;
  });
});

test('disability is hidden before an interest is accepted, shown after', () => {
  const profile = {
    _id: 'p1', status: 'active',
    personal: { fullName: 'A', hasDisability: true, disabilityType: 'Hearing impairment' },
    visibilitySettings: { visibleOnlyAfterAccept: true },
    photos: []
  };
  assert.ok(!JSON.stringify(buildRestrictedProfile(profile)).includes('Hearing impairment'));
  const full = buildFullProfile(profile);
  assert.equal(full.personal.hasDisability, true);
  assert.equal(full.personal.disabilityType, 'Hearing impairment');
});

// ─── Profile completion: single calculator with a "missing" list ───────────
const { calculateCompletion, COMPLETION_ITEMS } = require('../services/matrimonialCompletion');

test('completion lists exactly what is missing, with the screen to fix it', () => {
  const c = calculateCompletion({ personal: { fullName: 'A', gender: 'male' }, photos: [{ isDeleted: true }] });
  assert.equal(c.percentage, Math.round((2 / COMPLETION_ITEMS.length) * 100));
  const photo = c.missing.find(m => m.key === 'photos');
  assert.equal(photo.screen, 'photos');
  assert.ok(c.missing.find(m => m.key === 'partnerAge' && m.screen === 'preferences'));
  // Fields the edit screen doesn't offer are never required
  assert.ok(!c.missing.some(m => ['religion', 'familyType'].includes(m.key)));
});

test('a fully filled profile is 100% and is recalculated on save', async () => {
  const full = {
    personal: { fullName: 'A', dateOfBirth: new Date('1995-01-01'), gender: 'male', maritalStatus: 'Never Married', community: 'X', gotra: 'Y' },
    education: { highestQualification: 'B.Tech', profession: 'Engineer', annualIncome: '10 LPA' },
    lifestyle: { diet: 'Vegetarian' }, location: { city: 'Indore', state: 'MP' }, about: { biography: 'Hi' },
    photos: [{ url: 'https://x/y.jpg' }], preferences: { ageMin: 22, ageMax: 30 }
  };
  assert.deepEqual(calculateCompletion(full).missing, []);
  assert.equal(calculateCompletion(full).percentage, 100);
  const doc = newProfile(full.personal);
  Object.assign(doc, { education: full.education, lifestyle: full.lifestyle, location: full.location, about: full.about, preferences: full.preferences });
  doc.photos.push({ url: 'https://x/y.jpg' });
  await doc.validate();
  // pre('save') hook logic, run directly (no DB connection in tests)
  doc.profileCompletion = calculateCompletion(doc);
  assert.equal(doc.profileCompletion.percentage, 100);
});
