const AppContent = require('../../models/AppContent');
const SubCommunityAppContent = AppContent.SubCommunityAppContent;
const Community = require('../../models/Community');
const mongoose = require('mongoose');
const cacheService = require('../../utils/cacheService');

const saveAndInvalidate = async (doc) => {
  await doc.save();
  cacheService.invalidate('app_content_');
};

// Helper to get or create default AppContent document for a community
const getOrCreateAppContent = async (communityId, subCommunity = '') => {
  const targetCommunityId = communityId?._id || communityId;
  if (!targetCommunityId || !mongoose.Types.ObjectId.isValid(targetCommunityId)) {
    throw new Error('Select a valid community before editing app content.');
  }

  const community = await Community.findById(targetCommunityId).select('subCommunities').lean();
  if (!community) throw new Error('The selected community was not found.');

  let normalizedSubCommunity = '';
  if (typeof subCommunity === 'string' && subCommunity.trim()) {
    const requestedName = subCommunity.trim().toLocaleLowerCase();
    const matchedSubCommunity = (community.subCommunities || []).find(sub =>
      sub.isActive !== false && String(sub.name || '').trim().toLocaleLowerCase() === requestedName
    );
    if (!matchedSubCommunity) {
      throw new Error('The selected sub-community does not belong to this community.');
    }
    normalizedSubCommunity = matchedSubCommunity.name;
  }

  const ContentModel = normalizedSubCommunity ? SubCommunityAppContent : AppContent;
  let doc = await ContentModel.findOne(normalizedSubCommunity
    ? { communityId: targetCommunityId, subCommunity: normalizedSubCommunity }
    : { communityId: targetCommunityId });
  if (!doc) {
    doc = await ContentModel.create({
      communityId: targetCommunityId,
      ...(normalizedSubCommunity ? { subCommunity: normalizedSubCommunity } : {}),
      promotionalBanners: [],
      heroBanner: {
        backgroundImage: '',
        title: '',
        subtitle: '',
        buttonText: '',
        buttonLink: '/member/directory',
        enabled: true
      },
      exclusiveFeatures: [],
      successStories: [],
      coreMembers: { communityHead: { name: '', role: '', designation: '', avatar: '', city: '', state: '', phone: '', termYears: '', enabled: false }, committee: [] },
      donationBanner: {
        badge: 'Community Welfare',
        title: 'Empower & Support Community Causes',
        subtitle: 'Your generous contributions directly fund medical emergencies, education scholarships, temple development, and social welfare initiatives.',
        enabled: true
      },
      censusBanner: {
        backgroundImage: '',
        overlayOpacity: 75,
        overlayGradient: 'purple',
        enabled: true
      },
      footerArtwork: {
        artworkType: 'svg',
        backgroundImage: '',
        hashtagText: '#ApniSamaj',
        caughtUpTitle: "You're all caught up!",
        caughtUpSubtitle: 'Check back later for new updates',
        enabled: true
      }
    });
    if (normalizedSubCommunity) {
      const communityDefaults = await AppContent.findOne({ communityId: targetCommunityId }).lean();
      if (communityDefaults) {
        [
          'promotionalBanners', 'heroBanner', 'locationHeroBanners', 'exclusiveFeatures',
          'successStories', 'coreMembers', 'donationBanner', 'censusBanner', 'footerArtwork'
        ].forEach((field) => {
          if (communityDefaults[field] !== undefined) doc[field] = communityDefaults[field];
        });
        await saveAndInvalidate(doc);
      }
    }
  } else {
    // An empty banner array is an intentional admin choice (all banners
    // deleted), so do not repopulate it with starter banners on later reads.
    let modified = false;
    if (!doc.donationBanner) {
      doc.donationBanner = {
        badge: 'Community Welfare',
        title: 'Empower & Support Community Causes',
        subtitle: 'Your generous contributions directly fund medical emergencies, education scholarships, temple development, and social welfare initiatives.',
        enabled: true
      };
      modified = true;
    }
    if (!doc.censusBanner) {
      doc.censusBanner = {
        backgroundImage: '',
        overlayOpacity: 75,
        overlayGradient: 'purple',
        enabled: true
      };
      modified = true;
    }
    if (!doc.footerArtwork) {
      doc.footerArtwork = {
        artworkType: 'svg',
        backgroundImage: '',
        hashtagText: '#ApniSamaj',
        caughtUpTitle: "You're all caught up!",
        caughtUpSubtitle: 'Check back later for new updates',
        enabled: true
      };
      modified = true;
    }
    if (modified) {
      await saveAndInvalidate(doc);
    }
  }
  return doc;
};

// ─── ADMIN ENDPOINTS ───

// @desc    Get all customizable App Content for active community
// @route   GET /api/v1/admin/user-app-edits
// @access  Admin/SuperAdmin
exports.getAppContent = async (req, res) => {
  try {
    const targetCommunityId = req.query.communityId || req.communityId || req.user?.communityId;
    const doc = await getOrCreateAppContent(targetCommunityId, req.body?.subCommunity || req.query?.subCommunity || '');
    return res.status(200).json({
      success: true,
      data: doc
    });
  } catch (error) {
    console.error('Error in getAppContent:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Top Header / Greeting Banner
// @route   PUT /api/v1/admin/user-app-edits/hero
// @access  Admin
exports.updateHeroBanner = async (req, res) => {
  try {
    const targetCommunityId = req.body.communityId || req.communityId || req.user?.communityId;
    const doc = await getOrCreateAppContent(targetCommunityId, req.body?.subCommunity || req.query?.subCommunity || null);

    // Prefer a real uploaded file (goes to Cloudinary, returns a URL) over a
    // raw `backgroundImage` string — a base64 data URL must never be stored
    // here, since every consumer of this value (including a legacy
    // localStorage-only mirror on the frontend) would then be holding a
    // multi-MB string, which is exactly what previously exhausted the
    // browser's localStorage quota and broke unrelated login flows.
    const { resolveAvatarUpload } = require('../../utils/avatarUploadHelper');
    const uploadedImageUrl = await resolveAvatarUpload(req, `community_${targetCommunityId}`);

    const { backgroundImage, title, subtitle, buttonText, buttonLink, enabled } = req.body;
    if (uploadedImageUrl) {
      doc.heroBanner.backgroundImage = uploadedImageUrl;
    } else if (backgroundImage !== undefined && !backgroundImage.startsWith('data:')) {
      doc.heroBanner.backgroundImage = backgroundImage;
    }
    if (title !== undefined) doc.heroBanner.title = title;
    if (subtitle !== undefined) doc.heroBanner.subtitle = subtitle;
    if (buttonText !== undefined) doc.heroBanner.buttonText = buttonText;
    if (buttonLink !== undefined) doc.heroBanner.buttonLink = buttonLink;
    if (enabled !== undefined) doc.heroBanner.enabled = enabled;

    await saveAndInvalidate(doc);
    return res.status(200).json({
      success: true,
      message: 'Header banner updated successfully',
      data: doc.heroBanner
    });
  } catch (error) {
    console.error('Error in updateHeroBanner:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update the Donations page banner (badge, title, subtitle, bannerImage). Reused by
//          both the Admin panel and the Head panel (Community Head + Local Head) —
//          a Head request never sends `communityId`, so it always scopes to
//          their own `req.user.communityId`, never another community's content.
// @route   PUT /api/v1/admin/user-app-edits/donation-banner
// @route   PUT /api/v1/head/app-content/donation-banner
// @access  Admin, Head, Sub-Head (Local Head)
exports.updateDonationBanner = async (req, res) => {
  try {
    const { resolveAvatarUpload } = require('../../utils/avatarUploadHelper');
    const targetCommunityId = req.body.communityId || req.communityId || req.user?.communityId;
    const doc = await getOrCreateAppContent(targetCommunityId, req.body?.subCommunity || req.query?.subCommunity || null);

    // Resolve uploaded banner image file (if provided)
    const uploadedImageUrl = await resolveAvatarUpload(req, `community_${targetCommunityId}`);
    if (uploadedImageUrl) {
      doc.donationBanner.bannerImage = uploadedImageUrl;
    }

    const { badge, title, subtitle, enabled } = req.body;
    if (badge !== undefined) doc.donationBanner.badge = badge;
    if (title !== undefined) doc.donationBanner.title = title;
    if (subtitle !== undefined) doc.donationBanner.subtitle = subtitle;
    if (enabled !== undefined) doc.donationBanner.enabled = enabled;

    await saveAndInvalidate(doc);
    return res.status(200).json({
      success: true,
      message: 'Donation banner updated successfully',
      data: doc.donationBanner
    });
  } catch (error) {
    console.error('Error in updateDonationBanner:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get the requesting Local Head's own per-city home hero banner
//          override (so their edit form can be pre-filled). Only a Local
//          Head/Local Sub-Head account (one that has its own `city`) may
//          use this — a Community Head manages the community-wide hero
//          banner instead, not a location-specific one.
// @route   GET /api/v1/head/app-content/location-hero
// @access  Head (Local Head / Local Sub-Head only)
exports.getLocationHeroBanner = async (req, res) => {
  try {
    const city = (req.user?.city || '').trim();
    if (!city) {
      return res.status(403).json({ success: false, message: 'Only Local Heads (accounts with their own city/location) can manage a location-specific home banner.' });
    }
    const targetCommunityId = req.communityId || req.user?.communityId;
    const doc = await getOrCreateAppContent(targetCommunityId, req.body?.subCommunity || req.query?.subCommunity || null);
    const entry = (doc.locationHeroBanners || []).find(b => b.city.toLowerCase() === city.toLowerCase());
    return res.status(200).json({
      success: true,
      data: entry || { city, backgroundImage: '', title: '', subtitle: '', buttonText: '', buttonLink: '/member/directory', enabled: true }
    });
  } catch (error) {
    console.error('Error in getLocationHeroBanner:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create/update the requesting Local Head's own per-city home hero
//          banner override. Scoped strictly to `req.user.city` — a Local
//          Head can never touch another location's banner.
// @route   PUT /api/v1/head/app-content/location-hero
// @access  Head (Local Head / Local Sub-Head only)
exports.updateLocationHeroBanner = async (req, res) => {
  try {
    const city = (req.user?.city || '').trim();
    if (!city) {
      return res.status(403).json({ success: false, message: 'Only Local Heads (accounts with their own city/location) can manage a location-specific home banner.' });
    }
    const { resolveAvatarUpload } = require('../../utils/avatarUploadHelper');
    const targetCommunityId = req.communityId || req.user?.communityId;
    const doc = await getOrCreateAppContent(targetCommunityId, req.body?.subCommunity || req.query?.subCommunity || null);

    if (!Array.isArray(doc.locationHeroBanners)) doc.locationHeroBanners = [];
    let entry = doc.locationHeroBanners.find(b => b.city.toLowerCase() === city.toLowerCase());
    if (!entry) {
      entry = { city, backgroundImage: '', title: '', subtitle: '', buttonText: '', buttonLink: '/member/directory', enabled: true };
      doc.locationHeroBanners.push(entry);
      entry = doc.locationHeroBanners[doc.locationHeroBanners.length - 1];
    }

    const uploadedImageUrl = await resolveAvatarUpload(req, `location_hero_${targetCommunityId}_${city}`);
    if (uploadedImageUrl) entry.backgroundImage = uploadedImageUrl;

    const { title, subtitle, buttonText, buttonLink, enabled } = req.body;
    if (title !== undefined) entry.title = title;
    if (subtitle !== undefined) entry.subtitle = subtitle;
    if (buttonText !== undefined) entry.buttonText = buttonText;
    if (buttonLink !== undefined) entry.buttonLink = buttonLink;
    if (enabled !== undefined) entry.enabled = enabled;
    entry.updatedBy = req.user._id;
    entry.updatedAt = new Date();

    doc.markModified('locationHeroBanners');
    await saveAndInvalidate(doc);
    return res.status(200).json({
      success: true,
      message: `Home banner for ${city} updated successfully`,
      data: entry
    });
  } catch (error) {
    console.error('Error in updateLocationHeroBanner:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


// @desc    Update Community Census Banner
// @route   PUT /api/v1/admin/user-app-edits/census
// @access  Admin
exports.updateCensusBanner = async (req, res) => {
  try {
    const targetCommunityId = req.body.communityId || req.communityId || req.user?.communityId;
    const doc = await getOrCreateAppContent(targetCommunityId, req.body?.subCommunity || req.query?.subCommunity || null);

    const { backgroundImage, overlayOpacity, overlayGradient, enabled } = req.body;
    if (!doc.censusBanner) {
      doc.censusBanner = {};
    }
    if (backgroundImage !== undefined) doc.censusBanner.backgroundImage = backgroundImage;
    if (overlayOpacity !== undefined) doc.censusBanner.overlayOpacity = Number(overlayOpacity);
    if (overlayGradient !== undefined) doc.censusBanner.overlayGradient = overlayGradient;
    if (enabled !== undefined) doc.censusBanner.enabled = enabled;

    await saveAndInvalidate(doc);
    return res.status(200).json({
      success: true,
      message: 'Community census banner updated successfully',
      data: doc.censusBanner
    });
  } catch (error) {
    console.error('Error updating census banner:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update End of Feed / Footer Artwork
// @route   PUT /api/v1/admin/user-app-edits/footer-artwork
// @access  Admin
exports.updateFooterArtwork = async (req, res) => {
  try {
    const targetCommunityId = req.body.communityId || req.communityId || req.user?.communityId;
    const doc = await getOrCreateAppContent(targetCommunityId, req.body?.subCommunity || req.query?.subCommunity || null);

    const { artworkType, backgroundImage, hashtagText, caughtUpTitle, caughtUpSubtitle, enabled } = req.body;
    if (!doc.footerArtwork) {
      doc.footerArtwork = {};
    }
    if (artworkType !== undefined) doc.footerArtwork.artworkType = artworkType;
    if (backgroundImage !== undefined) doc.footerArtwork.backgroundImage = backgroundImage;
    if (hashtagText !== undefined) doc.footerArtwork.hashtagText = hashtagText;
    if (caughtUpTitle !== undefined) doc.footerArtwork.caughtUpTitle = caughtUpTitle;
    if (caughtUpSubtitle !== undefined) doc.footerArtwork.caughtUpSubtitle = caughtUpSubtitle;
    if (enabled !== undefined) doc.footerArtwork.enabled = enabled;

    await saveAndInvalidate(doc);
    return res.status(200).json({
      success: true,
      message: 'Footer artwork updated successfully',
      data: doc.footerArtwork
    });
  } catch (error) {
    console.error('Error updating footer artwork:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


// ─── EXCLUSIVE FEATURES CRUD ───

// @desc    Add new Exclusive Feature
// @route   POST /api/v1/admin/user-app-edits/features
// @access  Admin
exports.createFeature = async (req, res) => {
  try {
    const targetCommunityId = req.body.communityId || req.communityId || req.user?.communityId;
    const doc = await getOrCreateAppContent(targetCommunityId, req.body?.subCommunity || req.query?.subCommunity || null);

    const { label, desc, path, state, icon, bgImage, displayOrder, enabled } = req.body;
    if (!label) {
      return res.status(400).json({ success: false, message: 'Feature label is required' });
    }

    const newFeature = {
      id: `feat_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      label,
      desc: desc || '',
      path: path || '/member/directory',
      state: state || null,
      icon: icon || 'Briefcase',
      bgImage: bgImage || 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=600&q=80',
      displayOrder: displayOrder !== undefined ? displayOrder : doc.exclusiveFeatures.length + 1,
      enabled: enabled !== undefined ? enabled : true
    };

    doc.exclusiveFeatures.push(newFeature);
    await saveAndInvalidate(doc);

    return res.status(201).json({
      success: true,
      message: 'Feature added successfully',
      data: newFeature
    });
  } catch (error) {
    console.error('Error creating feature:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Exclusive Feature
// @route   PUT /api/v1/admin/user-app-edits/features/:id
// @access  Admin
exports.updateFeature = async (req, res) => {
  try {
    const { id } = req.params;
    const targetCommunityId = req.body.communityId || req.communityId || req.user?.communityId;
    const doc = await getOrCreateAppContent(targetCommunityId, req.body?.subCommunity || req.query?.subCommunity || null);

    const featureIndex = doc.exclusiveFeatures.findIndex(f => f.id === id);
    if (featureIndex === -1) {
      return res.status(404).json({ success: false, message: 'Feature not found' });
    }

    const fields = ['label', 'desc', 'path', 'state', 'icon', 'bgImage', 'displayOrder', 'enabled'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        doc.exclusiveFeatures[featureIndex][f] = req.body[f];
      }
    });

    await saveAndInvalidate(doc);
    return res.status(200).json({
      success: true,
      message: 'Feature updated successfully',
      data: doc.exclusiveFeatures[featureIndex]
    });
  } catch (error) {
    console.error('Error updating feature:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete Exclusive Feature
// @route   DELETE /api/v1/admin/user-app-edits/features/:id
// @access  Admin
exports.deleteFeature = async (req, res) => {
  try {
    const { id } = req.params;
    const targetCommunityId = req.query.communityId || req.communityId || req.user?.communityId;
    const doc = await getOrCreateAppContent(targetCommunityId, req.body?.subCommunity || req.query?.subCommunity || null);

    doc.exclusiveFeatures = doc.exclusiveFeatures.filter(f => f.id !== id);
    await saveAndInvalidate(doc);

    return res.status(200).json({
      success: true,
      message: 'Feature removed successfully'
    });
  } catch (error) {
    console.error('Error deleting feature:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── SUCCESS STORIES CRUD ───

// @desc    Add Success Story
// @route   POST /api/v1/admin/user-app-edits/success-stories
// @access  Admin
exports.createSuccessStory = async (req, res) => {
  try {
    const targetCommunityId = req.body.communityId || req.communityId || req.user?.communityId;
    const doc = await getOrCreateAppContent(targetCommunityId, req.body?.subCommunity || req.query?.subCommunity || null);

    const { title, tag, quote, shortDescription, coverImage, weddingDate, groomName, brideName, featured, displayOrder, enabled } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Story title / couple name is required' });
    }

    const newStory = {
      id: `story_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      title,
      tag: tag || 'Featured Match',
      quote: quote || shortDescription || '',
      shortDescription: shortDescription || quote || '',
      coverImage: coverImage || '',
      weddingDate: weddingDate || '2024',
      groomName: groomName || '',
      brideName: brideName || '',
      featured: featured !== undefined ? featured : false,
      displayOrder: displayOrder !== undefined ? displayOrder : doc.successStories.length + 1,
      enabled: enabled !== undefined ? enabled : true
    };

    if (newStory.featured) {
      doc.successStories.forEach(s => { s.featured = false; });
    }

    doc.successStories.push(newStory);
    await saveAndInvalidate(doc);

    return res.status(201).json({
      success: true,
      message: 'Success story created successfully',
      data: newStory
    });
  } catch (error) {
    console.error('Error creating success story:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Success Story
// @route   PUT /api/v1/admin/user-app-edits/success-stories/:id
// @access  Admin
exports.updateSuccessStory = async (req, res) => {
  try {
    const { id } = req.params;
    const targetCommunityId = req.body.communityId || req.communityId || req.user?.communityId;
    const doc = await getOrCreateAppContent(targetCommunityId, req.body?.subCommunity || req.query?.subCommunity || null);

    const storyIndex = doc.successStories.findIndex(s => s.id === id);
    if (storyIndex === -1) {
      return res.status(404).json({ success: false, message: 'Success story not found' });
    }

    if (req.body.featured === true) {
      doc.successStories.forEach(s => { s.featured = false; });
    }

    const fields = ['title', 'tag', 'quote', 'shortDescription', 'coverImage', 'weddingDate', 'groomName', 'brideName', 'featured', 'displayOrder', 'enabled'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        doc.successStories[storyIndex][f] = req.body[f];
      }
    });

    await saveAndInvalidate(doc);
    return res.status(200).json({
      success: true,
      message: 'Success story updated successfully',
      data: doc.successStories[storyIndex]
    });
  } catch (error) {
    console.error('Error updating success story:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete Success Story
// @route   DELETE /api/v1/admin/user-app-edits/success-stories/:id
// @access  Admin
exports.deleteSuccessStory = async (req, res) => {
  try {
    const { id } = req.params;
    const targetCommunityId = req.query.communityId || req.communityId || req.user?.communityId;
    const doc = await getOrCreateAppContent(targetCommunityId, req.body?.subCommunity || req.query?.subCommunity || null);

    doc.successStories = doc.successStories.filter(s => s.id !== id);
    await saveAndInvalidate(doc);

    return res.status(200).json({
      success: true,
      message: 'Success story deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting success story:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── CORE MEMBERS & LEADERSHIP CRUD ───

// @desc    Update Community Head Banner
// @route   PUT /api/v1/admin/user-app-edits/core-members/head
// @access  Admin
exports.updateCommunityHead = async (req, res) => {
  try {
    const targetCommunityId = req.body.communityId || req.communityId || req.user?.communityId;
    const doc = await getOrCreateAppContent(targetCommunityId, req.body?.subCommunity || req.query?.subCommunity || null);

    const fields = ['name', 'role', 'designation', 'avatar', 'city', 'state', 'phone', 'termYears', 'enabled'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        doc.coreMembers.communityHead[f] = req.body[f];
      }
    });

    await saveAndInvalidate(doc);
    return res.status(200).json({
      success: true,
      message: 'Community Head profile updated successfully',
      data: doc.coreMembers.communityHead
    });
  } catch (error) {
    console.error('Error updating community head:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add Committee Member
// @route   POST /api/v1/admin/user-app-edits/core-members/committee
// @access  Admin
exports.createCommitteeMember = async (req, res) => {
  try {
    const targetCommunityId = req.body.communityId || req.communityId || req.user?.communityId;
    const doc = await getOrCreateAppContent(targetCommunityId, req.body?.subCommunity || req.query?.subCommunity || null);

    const { name, role, designation, avatar, phone, city, displayOrder, enabled } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Member name is required' });
    }

    const newMember = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name,
      role: role || designation || 'Executive Member',
      designation: designation || role || 'Executive Member',
      avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      phone: phone || '',
      city: city || 'Indore',
      displayOrder: displayOrder !== undefined ? displayOrder : doc.coreMembers.committee.length + 1,
      enabled: enabled !== undefined ? enabled : true
    };

    doc.coreMembers.committee.push(newMember);
    await saveAndInvalidate(doc);

    return res.status(201).json({
      success: true,
      message: 'Committee member added successfully',
      data: newMember
    });
  } catch (error) {
    console.error('Error creating committee member:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Committee Member
// @route   PUT /api/v1/admin/user-app-edits/core-members/committee/:id
// @access  Admin
exports.updateCommitteeMember = async (req, res) => {
  try {
    const { id } = req.params;
    const targetCommunityId = req.body.communityId || req.communityId || req.user?.communityId;
    const doc = await getOrCreateAppContent(targetCommunityId, req.body?.subCommunity || req.query?.subCommunity || null);

    const memberIndex = doc.coreMembers.committee.findIndex(m => m.id === id);
    if (memberIndex === -1) {
      return res.status(404).json({ success: false, message: 'Committee member not found' });
    }

    const fields = ['name', 'role', 'designation', 'avatar', 'phone', 'city', 'displayOrder', 'enabled'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        doc.coreMembers.committee[memberIndex][f] = req.body[f];
      }
    });

    await saveAndInvalidate(doc);
    return res.status(200).json({
      success: true,
      message: 'Committee member updated successfully',
      data: doc.coreMembers.committee[memberIndex]
    });
  } catch (error) {
    console.error('Error updating committee member:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete Committee Member
// @route   DELETE /api/v1/admin/user-app-edits/core-members/committee/:id
// @access  Admin
exports.deleteCommitteeMember = async (req, res) => {
  try {
    const { id } = req.params;
    const targetCommunityId = req.query.communityId || req.communityId || req.user?.communityId;
    const doc = await getOrCreateAppContent(targetCommunityId, req.body?.subCommunity || req.query?.subCommunity || null);

    doc.coreMembers.committee = doc.coreMembers.committee.filter(m => m.id !== id);
    await saveAndInvalidate(doc);

    return res.status(200).json({
      success: true,
      message: 'Committee member deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting committee member:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PROMOTIONAL SLIDING BANNERS ───

// @desc    Create Promotional Banner
// @route   POST /api/v1/admin/user-app-edits/promotional-banners
// @access  Admin
exports.createPromotionalBanner = async (req, res) => {
  try {
    const targetCommunityId = req.body.communityId || req.communityId || req.user?.communityId;
    const doc = await getOrCreateAppContent(targetCommunityId, req.body?.subCommunity || req.query?.subCommunity || null);

    const newBanner = {
      id: req.body.id || `promo_${Date.now()}`,
      tag: req.body.tag || 'Announcement',
      tagColor: req.body.tagColor || 'from-purple-600 to-indigo-600 text-white',
      title: req.body.title || 'Special Announcement',
      subtitle: req.body.subtitle || '',
      buttonText: req.body.buttonText || 'View Details',
      link: req.body.link || '/member/events',
      image: req.body.image || '',
      accentColor: req.body.accentColor || '#7C3AED',
      displayOrder: req.body.displayOrder !== undefined ? req.body.displayOrder : (doc.promotionalBanners?.length || 0) + 1,
      enabled: req.body.enabled !== false
    };

    if (!doc.promotionalBanners) doc.promotionalBanners = [];
    doc.promotionalBanners.push(newBanner);
    await saveAndInvalidate(doc);

    return res.status(201).json({
      success: true,
      message: 'Promotional banner added successfully',
      data: newBanner
    });
  } catch (error) {
    console.error('Error creating promotional banner:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Promotional Banner
// @route   PUT /api/v1/admin/user-app-edits/promotional-banners/:id
// @access  Admin
exports.updatePromotionalBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const targetCommunityId = req.body.communityId || req.communityId || req.user?.communityId;
    const doc = await getOrCreateAppContent(targetCommunityId, req.body?.subCommunity || req.query?.subCommunity || null);

    if (!doc.promotionalBanners) doc.promotionalBanners = [];
    const bannerIndex = doc.promotionalBanners.findIndex(b => b.id === id);
    if (bannerIndex === -1) {
      return res.status(404).json({ success: false, message: 'Promotional banner not found' });
    }

    const fields = ['tag', 'tagColor', 'title', 'subtitle', 'buttonText', 'link', 'image', 'accentColor', 'displayOrder', 'enabled'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        doc.promotionalBanners[bannerIndex][f] = req.body[f];
      }
    });

    await saveAndInvalidate(doc);
    return res.status(200).json({
      success: true,
      message: 'Promotional banner updated successfully',
      data: doc.promotionalBanners[bannerIndex]
    });
  } catch (error) {
    console.error('Error updating promotional banner:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete Promotional Banner
// @route   DELETE /api/v1/admin/user-app-edits/promotional-banners/:id
// @access  Admin
exports.deletePromotionalBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const targetCommunityId = req.query.communityId || req.communityId || req.user?.communityId;
    const doc = await getOrCreateAppContent(targetCommunityId, req.body?.subCommunity || req.query?.subCommunity || null);

    if (!doc.promotionalBanners) doc.promotionalBanners = [];
    doc.promotionalBanners = doc.promotionalBanners.filter(b => b.id !== id);
    await saveAndInvalidate(doc);

    return res.status(200).json({
      success: true,
      message: 'Promotional banner deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting promotional banner:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
