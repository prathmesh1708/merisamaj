const { buildProfileForViewer, connectedUserIds } = require('../middleware/matrimonialPrivacy');
const { ensureBlurredPhotos } = require('./matrimonialPhotoBlur');
const { getEffectiveFeatures } = require('../middleware/subscriptionMiddleware');

// Profiles as this viewer may see them (full once connected, restricted otherwise;
// photos blurred unless the viewer's plan includes photo access)
const presentProfiles = async (viewerId, profiles) => {
  const list = profiles.filter(Boolean);
  const [connected, { features }] = await Promise.all([
    connectedUserIds(viewerId, list.map(p => p.userId?._id || p.userId)),
    getEffectiveFeatures(viewerId)
  ]);
  const canViewPhotos = !!features?.viewProfilePhotos;
  const isConnected = (p) => connected.has(String(p.userId?._id || p.userId));
  await ensureBlurredPhotos(list.filter(p => !isConnected(p)), { includePublic: !canViewPhotos });
  return new Map(list.map(p => [String(p._id), buildProfileForViewer(p, { isConnected: isConnected(p), canViewPhotos })]));
};

module.exports = { presentProfiles };
