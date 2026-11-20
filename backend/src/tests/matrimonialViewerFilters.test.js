const test = require('node:test');
const assert = require('node:assert');
const { viewerFilterBlock, viewerFilterCondition } = require('../utils/matrimonialCommunityScope');

const traits = (over = {}) => ({
  aadhaarVerified: false,
  communityVerified: false,
  locationPatterns: [/^Indore(,|$)/i, /^Madhya Pradesh$/i, /,\s*Madhya Pradesh$/i],
  ...over
});

test('viewer filters are ignored until saved from the settings screen', () => {
  const vs = { aadharVerifiedOnly: true, communityVerifiedOnly: true, selectedLocations: { enabled: true, locations: ['Pune, Maharashtra'] } };
  assert.strictEqual(viewerFilterBlock(vs, traits()), null);
});

test('Aadhaar-only profile blocks unverified viewers and admits verified ones', () => {
  const vs = { viewerFiltersActive: true, aadharVerifiedOnly: true };
  assert.strictEqual(viewerFilterBlock(vs, traits()), 'aadhaar');
  assert.strictEqual(viewerFilterBlock(vs, traits({ aadhaarVerified: true })), null);
});

test('community-verified-only profile blocks unverified viewers', () => {
  const vs = { viewerFiltersActive: true, communityVerifiedOnly: true };
  assert.strictEqual(viewerFilterBlock(vs, traits()), 'community');
  assert.strictEqual(viewerFilterBlock(vs, traits({ communityVerified: true })), null);
});

test('location filter matches city or state; an empty list means no limit', () => {
  const on = (locations) => ({ viewerFiltersActive: true, selectedLocations: { enabled: true, locations } });
  assert.strictEqual(viewerFilterBlock(on(['Indore, Madhya Pradesh']), traits()), null);
  assert.strictEqual(viewerFilterBlock(on(['Madhya Pradesh']), traits()), null);
  assert.strictEqual(viewerFilterBlock(on(['Bhopal, Madhya Pradesh']), traits()), null); // same state
  assert.strictEqual(viewerFilterBlock(on(['Pune, Maharashtra']), traits()), 'location');
  assert.strictEqual(viewerFilterBlock(on([]), traits()), null);
  assert.strictEqual(viewerFilterBlock({ viewerFiltersActive: true, selectedLocations: { enabled: false, locations: ['Pune'] } }, traits()), null);
});

test('list condition only excludes profiles whose active filters the viewer fails', () => {
  const verified = viewerFilterCondition(traits({ aadhaarVerified: true, communityVerified: true }));
  assert.strictEqual(verified.$nor.length, 1); // location rule only
  const unverified = viewerFilterCondition(traits());
  assert.strictEqual(unverified.$nor.length, 3);
  unverified.$nor.forEach(rule => assert.strictEqual(rule['visibilitySettings.viewerFiltersActive'], true));
});
