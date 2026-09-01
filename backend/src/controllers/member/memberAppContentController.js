const AppContent = require('../../models/AppContent');
const Community = require('../../models/Community');
const mongoose = require('mongoose');

// @desc    Get active home content configuration for member app
// @route   GET /api/v1/member/app-content
// @access  Private (Member)
exports.getMemberAppContent = async (req, res) => {
  try {
    let targetCommunityId = req.query.communityId || req.communityId || req.user?.communityId?._id || req.user?.communityId;
    if (!targetCommunityId) {
      const firstComm = await Community.findOne({ status: 'Active' });
      targetCommunityId = firstComm ? firstComm._id : new mongoose.Types.ObjectId('000000000000000000000001');
    }

    let doc = await AppContent.findOne({ communityId: targetCommunityId }).lean();
    if (!doc) {
      // Return default configuration if no custom document exists yet
      doc = {
        heroBanner: {
          backgroundImage: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1200&q=80',
          title: '',
          subtitle: '',
          buttonText: '',
          buttonLink: '/member/directory',
          enabled: true
        },
        exclusiveFeatures: [
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
        ],
        successStories: [
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
          }
        ],
        coreMembers: {
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
        },
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
      };
    }

    // Filter enabled items only for member app
    const activeFeatures = (doc.exclusiveFeatures || [])
      .filter(f => f.enabled)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    const activeStories = (doc.successStories || [])
      .filter(s => s.enabled)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    const activeCommittee = (doc.coreMembers?.committee || [])
      .filter(c => c.enabled)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    return res.status(200).json({
      success: true,
      data: {
        heroBanner: doc.heroBanner || {},
        exclusiveFeatures: activeFeatures,
        successStories: activeStories,
        coreMembers: {
          communityHead: doc.coreMembers?.communityHead || null,
          committee: activeCommittee
        },
        censusBanner: doc.censusBanner || {
          backgroundImage: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=1200&q=80',
          overlayOpacity: 75,
          overlayGradient: 'purple',
          enabled: true
        },
        footerArtwork: doc.footerArtwork || {
          artworkType: 'svg',
          backgroundImage: '',
          hashtagText: '#MeriSamaj',
          caughtUpTitle: "You're all caught up!",
          caughtUpSubtitle: 'Check back later for new updates',
          enabled: true
        }
      }
    });
  } catch (error) {
    console.error('Error in getMemberAppContent:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
