// Section-by-section inheritance of member home content
// (community → sub-community → location). Shared by the admin editor and the member API.
const AppContent = require('../models/AppContent');
const { SubCommunityAppContent, LocationAppContent, CONTENT_SECTIONS } = AppContent;

/** Sections a sub-community / location document decides itself. Older copies own all. */
const ownedSections = (doc) => (Array.isArray(doc?.customizedSections) ? doc.customizedSections : CONTENT_SECTIONS);

/**
 * Content documents that apply to members of (community, sub-community, city), most
 * specific first: city + sub-community → city (whole community) → sub-community → community.
 * Each entry is { doc (lean), level: 'location' | 'subCommunity' | 'community', label }.
 */
const contentChain = async (communityId, subCommunity = '', city = '') => {
  const sub = String(subCommunity || '').trim();
  const cityKey = String(city || '').trim().toLowerCase();
  const [locations, subDoc, communityDoc] = await Promise.all([
    cityKey
      ? LocationAppContent.find({ communityId, cityKey, subCommunity: { $in: [...(sub ? [sub] : []), ''] } }).lean()
      : [],
    sub ? SubCommunityAppContent.findOne({ communityId, subCommunity: sub }).lean() : null,
    AppContent.findOne({ communityId }).lean()
  ]);
  const chain = [];
  const locSub = sub ? locations.find(l => l.subCommunity === sub) : null;
  const locAll = locations.find(l => !l.subCommunity);
  if (locSub) chain.push({ doc: locSub, level: 'location', label: `${locSub.city} (${sub})` });
  if (locAll) chain.push({ doc: locAll, level: 'location', label: locAll.city });
  if (subDoc) chain.push({ doc: subDoc, level: 'subCommunity', label: sub });
  if (communityDoc) chain.push({ doc: communityDoc, level: 'community', label: 'Community' });
  return chain;
};

/** The value members get for one section, and the level it comes from. */
const resolveSection = (chain, section) => {
  for (const entry of chain) {
    const owns = entry.level === 'community' || ownedSections(entry.doc).includes(section);
    if (owns && entry.doc[section] !== undefined) return { value: entry.doc[section], from: entry };
  }
  return { value: undefined, from: null };
};

/** Every section resolved through the chain, as one plain content object. */
const resolveContent = (chain) => {
  if (!chain.length) return null;
  const merged = {};
  CONTENT_SECTIONS.forEach(section => {
    const { value } = resolveSection(chain, section);
    if (value !== undefined) merged[section] = value;
  });
  return merged;
};

module.exports = { CONTENT_SECTIONS, ownedSections, contentChain, resolveSection, resolveContent };
