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
