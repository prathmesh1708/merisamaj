const AppContent = require('../../models/AppContent');
const Community = require('../../models/Community');
const mongoose = require('mongoose');

// Helper to get or create default AppContent document for a community
const getDefaultFeatures = () => [
  {
    id: 'feature_prof',
    label: 'Professional Network',
    desc: 'Find jobs & hire within the community',
    path: '/member/professionals',
    state: null,
    icon: 'Briefcase',
    bgImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80',
    displayOrder: 1,
    enabled: true
  },
  {
    id: 'feature_dir',
    label: 'Directory',
    desc: 'Browse Samaj Members',
    path: '/member/directory',
    state: null,
    icon: 'BookOpen',
    bgImage: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=600&q=80',
    displayOrder: 2,
    enabled: true
  },
  {
    id: 'feature_groups',
    label: 'Groups',
    desc: 'Discussions & Interest Groups',
    path: '/member/social',
    state: { tab: 'groups' },
    icon: 'Users',
    bgImage: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=600&q=80',
    displayOrder: 3,
    enabled: true
  },
  {
    id: 'feature_voting',
    label: 'Voting',
    desc: 'Community Polls & Elections',
    path: '/member/voting',
    state: null,
    icon: 'Vote',
    bgImage: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?auto=format&fit=crop&w=600&q=80',
    displayOrder: 4,
    enabled: true
  },
  {
    id: 'feature_dharmashala',
    label: 'Dharmashala',
    desc: 'Book Rooms & Bhawans',
    path: '/member/dharmashala',
    state: null,
    icon: 'Building',
    bgImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
    displayOrder: 5,
    enabled: true
  },
  {
    id: 'feature_fund',
    label: 'Samaj Fund',
    desc: 'Community Donations & Campaigns',
    path: '/member/donation',
    state: null,
    icon: 'Wallet',
    bgImage: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=600&q=80',
    displayOrder: 6,
    enabled: true
  }
];

const getDefaultStories = () => [
  {
    id: 'story_1',
    title: 'Rajesh & Priya Agrawal',
    tag: 'Featured Match',
    quote: 'Found their life partner through MeriSamaj within 3 months of verified listing.',
    shortDescription: 'Found their life partner through MeriSamaj within 3 months of verified listing.',
    coverImage: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=800&q=80',
    weddingDate: '2024',
    groomName: 'Rajesh Agrawal',
    brideName: 'Priya Agrawal',
    featured: true,
    displayOrder: 1,
    enabled: true
  },
  {
    id: 'story_2',
    title: 'Amit & Neha Gupta',
    tag: 'Met through Samaj Matrimony',
    quote: 'Blessed with wonderful families connecting together smoothly and respectfully.',
    shortDescription: 'Blessed with wonderful families connecting together smoothly.',
    coverImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
    weddingDate: '2023',
    groomName: 'Amit Gupta',
    brideName: 'Neha Gupta',
    featured: false,
    displayOrder: 2,
    enabled: true
  },
  {
    id: 'story_3',
    title: 'Vikas & Pooja Mittal',
    tag: 'Met through Samaj Matrimony',
    quote: 'A seamless journey from verified community directory to matrimonial bliss.',
    shortDescription: 'A seamless journey from directory to matrimonial bliss.',
    coverImage: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80',
    weddingDate: '2024',
    groomName: 'Vikas Mittal',
    brideName: 'Pooja Mittal',
    featured: false,
    displayOrder: 3,
    enabled: true
  }
];

const getDefaultCoreMembers = () => ({
  communityHead: {
    name: 'Dr. Rajesh Agrawal',
    role: 'Community Head (President)',
    designation: 'Community Head (President)',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=800&q=80',
    city: 'Indore',
    state: 'Madhya Pradesh',
    phone: '+91 98260 12345',
    termYears: '2024-2027',
    enabled: true
  },
  committee: [
    {
      id: 'comm_1',
      name: 'Smt. Manju Bansal',
      role: 'Women Cell Incharge',
      designation: 'Women Cell Incharge',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      phone: '+91 98261 22334',
      city: 'Indore',
      displayOrder: 1,
      enabled: true
    },
    {
      id: 'comm_2',
      name: 'Ramesh Mittal',
      role: 'Treasurer',
      designation: 'Treasurer',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      phone: '+91 98262 33445',
      city: 'Indore',
      displayOrder: 2,
      enabled: true
    },
    {
      id: 'comm_3',
      name: 'Sunil Gupta',
      role: 'General Secretary',
      designation: 'General Secretary',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
      phone: '+91 98263 44556',
      city: 'Indore',
      displayOrder: 3,
      enabled: true
    },
    {
      id: 'comm_4',
      name: 'Vikas Garg',
      role: 'Vice President',
      designation: 'Vice President',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
      phone: '+91 98264 55667',
      city: 'Indore',
      displayOrder: 4,
      enabled: true
    }
  ]
});

const getOrCreateAppContent = async (communityId) => {
  let targetCommunityId = communityId;
  if (!targetCommunityId) {
    const firstComm = await Community.findOne({ status: 'Active' });
    targetCommunityId = firstComm ? firstComm._id : new mongoose.Types.ObjectId('000000000000000000000001');
  }

  let doc = await AppContent.findOne({ communityId: targetCommunityId });
  if (!doc) {
    doc = await AppContent.create({
      communityId: targetCommunityId,
      heroBanner: {
        backgroundImage: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1200&q=80',
        title: '',
        subtitle: '',
        buttonText: '',
        buttonLink: '/member/directory',
        enabled: true
      },
      exclusiveFeatures: getDefaultFeatures(),
      successStories: getDefaultStories(),
      coreMembers: getDefaultCoreMembers(),
      censusBanner: {
        backgroundImage: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=1200&q=80',
        overlayOpacity: 75,
        overlayGradient: 'purple',
        enabled: true
      },
      footerArtwork: {
        artworkType: 'svg',
        backgroundImage: '',
        hashtagText: '#MeriSamaj',
        caughtUpTitle: "You're all caught up!",
        caughtUpSubtitle: 'Check back later for new updates',
        enabled: true
      }
    });
  } else {
    let modified = false;
    if (!doc.censusBanner) {
      doc.censusBanner = {
        backgroundImage: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=1200&q=80',
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
        hashtagText: '#MeriSamaj',
        caughtUpTitle: "You're all caught up!",
        caughtUpSubtitle: 'Check back later for new updates',
        enabled: true
      };
      modified = true;
    }
    if (modified) {
      await doc.save();
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
    const doc = await getOrCreateAppContent(targetCommunityId);
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
    const doc = await getOrCreateAppContent(targetCommunityId);

    const { backgroundImage, title, subtitle, buttonText, buttonLink, enabled } = req.body;
    if (backgroundImage !== undefined) doc.heroBanner.backgroundImage = backgroundImage;
    if (title !== undefined) doc.heroBanner.title = title;
    if (subtitle !== undefined) doc.heroBanner.subtitle = subtitle;
    if (buttonText !== undefined) doc.heroBanner.buttonText = buttonText;
    if (buttonLink !== undefined) doc.heroBanner.buttonLink = buttonLink;
    if (enabled !== undefined) doc.heroBanner.enabled = enabled;

    await doc.save();
    return res.status(200).json({
      success: true,
      message: 'Header banner updated successfully',
      data: doc.heroBanner
    });
  } catch (error) {
    console.error('Error updating hero banner:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Community Census Banner
// @route   PUT /api/v1/admin/user-app-edits/census
// @access  Admin
exports.updateCensusBanner = async (req, res) => {
  try {
    const targetCommunityId = req.body.communityId || req.communityId || req.user?.communityId;
    const doc = await getOrCreateAppContent(targetCommunityId);

    const { backgroundImage, overlayOpacity, overlayGradient, enabled } = req.body;
    if (!doc.censusBanner) {
      doc.censusBanner = {};
    }
    if (backgroundImage !== undefined) doc.censusBanner.backgroundImage = backgroundImage;
    if (overlayOpacity !== undefined) doc.censusBanner.overlayOpacity = Number(overlayOpacity);
    if (overlayGradient !== undefined) doc.censusBanner.overlayGradient = overlayGradient;
    if (enabled !== undefined) doc.censusBanner.enabled = enabled;

    await doc.save();
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
    const doc = await getOrCreateAppContent(targetCommunityId);

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

    await doc.save();
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
    const doc = await getOrCreateAppContent(targetCommunityId);

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
    await doc.save();

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
    const doc = await getOrCreateAppContent(targetCommunityId);

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

    await doc.save();
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
    const doc = await getOrCreateAppContent(targetCommunityId);

    doc.exclusiveFeatures = doc.exclusiveFeatures.filter(f => f.id !== id);
    await doc.save();

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
    const doc = await getOrCreateAppContent(targetCommunityId);

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
      coverImage: coverImage || 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=800&q=80',
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
    await doc.save();

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
    const doc = await getOrCreateAppContent(targetCommunityId);

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

    await doc.save();
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
    const doc = await getOrCreateAppContent(targetCommunityId);

    doc.successStories = doc.successStories.filter(s => s.id !== id);
    await doc.save();

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
    const doc = await getOrCreateAppContent(targetCommunityId);

    const fields = ['name', 'role', 'designation', 'avatar', 'city', 'state', 'phone', 'termYears', 'enabled'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        doc.coreMembers.communityHead[f] = req.body[f];
      }
    });

    await doc.save();
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
    const doc = await getOrCreateAppContent(targetCommunityId);

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
    await doc.save();

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
    const doc = await getOrCreateAppContent(targetCommunityId);

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

    await doc.save();
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
    const doc = await getOrCreateAppContent(targetCommunityId);

    doc.coreMembers.committee = doc.coreMembers.committee.filter(m => m.id !== id);
    await doc.save();

    return res.status(200).json({
      success: true,
      message: 'Committee member deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting committee member:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
