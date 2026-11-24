const test = require('node:test');
const assert = require('node:assert');
const { resolveSection, resolveContent, ownedSections, CONTENT_SECTIONS } = require('../utils/appContentInheritance');

const community = { doc: { footerArtwork: { hashtagText: '#Community' }, heroBanner: { title: 'Community hero' } }, level: 'community' };

test('a section the sub-community never edited follows the community', () => {
  const sub = { doc: { customizedSections: ['heroBanner'], footerArtwork: { hashtagText: '#StaleCopy' }, heroBanner: { title: 'Sub hero' } }, level: 'subCommunity' };
  const merged = resolveContent([sub, community]);
  assert.strictEqual(merged.footerArtwork.hashtagText, '#Community');
  assert.strictEqual(merged.heroBanner.title, 'Sub hero');
});

test('a location owning a section wins over its sub-community and community', () => {
  const loc = { doc: { customizedSections: ['footerArtwork'], footerArtwork: { hashtagText: '#City' } }, level: 'location' };
  const sub = { doc: { customizedSections: ['footerArtwork'], footerArtwork: { hashtagText: '#Sub' } }, level: 'subCommunity' };
  assert.strictEqual(resolveSection([loc, sub, community], 'footerArtwork').value.hashtagText, '#City');
  assert.strictEqual(resolveSection([sub, community], 'footerArtwork').value.hashtagText, '#Sub');
});

test('older full copies (no customizedSections) keep owning every section', () => {
  assert.deepStrictEqual(ownedSections({}), CONTENT_SECTIONS);
  const legacy = { doc: { footerArtwork: { hashtagText: '#Legacy' } }, level: 'subCommunity' };
  assert.strictEqual(resolveSection([legacy, community], 'footerArtwork').value.hashtagText, '#Legacy');
});

test('an empty chain resolves to nothing', () => {
  assert.strictEqual(resolveContent([]), null);
});
