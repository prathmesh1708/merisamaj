const AppContent = require('../../models/AppContent');
const SubCommunityAppContent = AppContent.SubCommunityAppContent;
const Community = require('../../models/Community');
const User = require('../../models/User');
const mongoose = require('mongoose');
const cacheService = require('../../utils/cacheService');

// @desc    Get active home content configuration for member app
// @route   GET /api/v1/member/app-content
// @access  Private (Member)
exports.getMemberAppContent = async (req, res) => {
  try {
    let targetCommunityId = req.query.communityId || req.communityId || req.user?.communityId?._id || req.user?.communityId;
    if (!targetCommunityId) {
      const firstComm = await Community.findOne({ isActive: true });
      targetCommunityId = firstComm ? firstComm._id : new mongoose.Types.ObjectId('000000000000000000000001');
    }

    // City-scoped so a Local Head's location banner never leaks to another
    // city's members (or vice versa) via a shared community-wide cache entry.
    const memberCityKey = (req.user?.city || '').trim().toLowerCase() || 'default';
    const memberSubCommunity = (req.user?.subCommunity || '').trim();
    const cacheKey = `app_content_${targetCommunityId.toString()}_${memberSubCommunity.toLowerCase()}_${memberCityKey}`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    let doc = memberSubCommunity
      ? await SubCommunityAppContent.findOne({ communityId: targetCommunityId, subCommunity: memberSubCommunity }).lean()
      : null;
    if (!doc) doc = await AppContent.findOne({ communityId: targetCommunityId }).lean();
    if (!doc) {
      // Return default configuration if no custom document exists yet
      doc = {
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
        coreMembers: { communityHead: null, committee: [] },
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
      };
    }

    // If the viewing member's own city has a Local Head-set hero banner
    // override, it takes priority over the community-wide default below —
    // it's the most specific setting for them.
    try {
      const memberCity = (req.user?.city || '').trim();
      if (memberCity && Array.isArray(doc.locationHeroBanners)) {
        const cityEntry = doc.locationHeroBanners.find(
          b => b.enabled !== false && b.backgroundImage && b.city && b.city.toLowerCase() === memberCity.toLowerCase()
        );
        if (cityEntry) {
          doc.heroBanner = {
            ...(doc.heroBanner || {}),
            backgroundImage: cityEntry.backgroundImage,
            title: cityEntry.title || doc.heroBanner?.title || '',
            subtitle: cityEntry.subtitle || doc.heroBanner?.subtitle || '',
            buttonText: cityEntry.buttonText || doc.heroBanner?.buttonText || '',
            buttonLink: cityEntry.buttonLink || doc.heroBanner?.buttonLink || '/member/directory',
            enabled: true
          };
        }
      }
    } catch (locErr) {
      console.warn('[getMemberAppContent] Failed to resolve location hero banner:', locErr.message);
    }

    // Fallback heroBanner background image to Community bannerUrl if not specifically customized
    try {
      const comm = await Community.findById(targetCommunityId).select('name bannerUrl description logoUrl').lean();
      if (comm && comm.bannerUrl) {
        if (!doc.heroBanner) {
          doc.heroBanner = {
            backgroundImage: comm.bannerUrl,
            title: '',
            subtitle: '',
            buttonText: '',
            buttonLink: '/member/directory',
            enabled: true
          };
        } else if (!doc.heroBanner.backgroundImage) {
          doc.heroBanner.backgroundImage = comm.bannerUrl;
        }
      }
    } catch (commErr) {
      console.warn('[getMemberAppContent] Failed to fetch community fallback banner:', commErr.message);
    }

    // Filter enabled items only for member app
    const activeFeatures = (doc.exclusiveFeatures || [])
      .filter(f => f.enabled)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      .map(f => {
        if (f.id === 'feature_fund' || (f.label && f.label.toLowerCase().includes('fund'))) {
          return { ...f, path: '/member/fund' };
        }
        return f;
      });

    const activeStories = (doc.successStories || [])
      .filter(s => s.enabled)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    const activeCommittee = (doc.coreMembers?.committee || [])
      .filter(c => c.enabled)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    const activeBanners = (doc.promotionalBanners || [])
      .filter(b => b.enabled !== false && typeof b.image === 'string' && b.image.trim())
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    // Dynamically look up real community head user if available
    let dynamicHead = doc.coreMembers?.communityHead || null;
    try {
      const realHeadUser = await User.findOne({
        role: 'head',
        accountStatus: 'active',
        $or: [
          { communityId: targetCommunityId },
          { assignedCommunityIds: targetCommunityId }
        ]
      }).select('_id name phone avatar cover designation city state').lean();

      if (realHeadUser) {
        dynamicHead = {
          _id: realHeadUser._id,
          id: realHeadUser._id,
          name: realHeadUser.name,
          role: realHeadUser.designation || 'Community Head (President)',
          designation: realHeadUser.designation || 'Community Head (President)',
          avatar: realHeadUser.avatar || realHeadUser.cover || dynamicHead?.avatar || '',
          city: realHeadUser.city || '',
          state: realHeadUser.state || '',
          phone: realHeadUser.phone || '',
          enabled: true
        };
      }
    } catch (headErr) {
      console.warn('[getMemberAppContent] Failed to query real head user:', headErr.message);
    }

    const payload = {
      success: true,
      data: {
        heroBanner: doc.heroBanner || {},
        promotionalBanners: activeBanners,
        exclusiveFeatures: activeFeatures,
        successStories: activeStories,
        coreMembers: { communityHead: null, committee: [] },
        donationBanner: doc.donationBanner || {
          badge: 'Community Welfare',
          title: 'Empower & Support Community Causes',
          subtitle: 'Your generous contributions directly fund medical emergencies, education scholarships, temple development, and social welfare initiatives.',
          enabled: true
        },
        censusBanner: doc.censusBanner || {
          backgroundImage: '',
          overlayOpacity: 75,
          overlayGradient: 'purple',
          enabled: true
        },
        footerArtwork: doc.footerArtwork || {
          artworkType: 'svg',
          backgroundImage: '',
          hashtagText: '#ApniSamaj',
          caughtUpTitle: "You're all caught up!",
          caughtUpSubtitle: 'Check back later for new updates',
          enabled: true
        }
      }
    };

    cacheService.set(cacheKey, payload, 300); // 5 min TTL
    return res.status(200).json(payload);
  } catch (error) {
    console.error('Error in getMemberAppContent:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
