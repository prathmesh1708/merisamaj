const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const dns = require('dns');

// Resolve DNS for MongoDB Atlas SRV lookup
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Models
const User = require('../models/User');
const Community = require('../models/Community');
const Leadership = require('../models/Leadership');
const Donation = require('../models/Donation');
const SuccessStory = require('../models/SuccessStory');
const Event = require('../models/Event');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const UserNotification = require('../models/UserNotification');
const MatrimonialProfile = require('../models/MatrimonialProfile');
const Dharmashala = require('../models/Dharmashala');
const DharmashalaRoom = require('../models/DharmashalaRoom');
const DharmashalaBooking = require('../models/DharmashalaBooking');
const Fund = require('../models/Fund');
const Contribution = require('../models/Contribution');
const FundExpense = require('../models/FundExpense');
const Invitation = require('../models/Invitation');
const Obituary = require('../models/Obituary');
const Voting = require('../models/Voting');
const Category = require('../models/Category');
const Professional = require('../models/Professional');
const Group = require('../models/Group');
const Story = require('../models/Story');
const AppContent = require('../models/AppContent');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/merisamaj';

async function seedAllModules() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB successfully.');

    // ─────────────────────────────────────────────────────────────
    // 1. COMMUNITIES SEEDING / UPDATES
    // ─────────────────────────────────────────────────────────────
    const defaultSettings = {
      matrimonialEnabled: true,
      donationEnabled: true,
      invitationEnabled: true,
      eventEnabled: true,
      directoryEnabled: true,
      dharmashalaEnabled: true,
      obituaryEnabled: true,
      socialFeedEnabled: true,
      chatEnabled: true,
      announcementChannelEnabled: true,
      groupCreationPolicy: 'head_admin'
    };

    let agrawalComm = await Community.findOne({ slug: 'agrawal-samaj-indore' });
    const agrawalPayload = {
      name: 'Agrawal Samaj Indore',
      slug: 'agrawal-samaj-indore',
      description: 'Official representative body for Agrawal community members in Indore. Dedicated to social welfare, youth career mentoring, matrimonial facilitation, and cultural harmony.',
      city: 'Indore',
      bannerUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1200&q=80',
      logoUrl: 'https://ui-avatars.com/api/?name=Agrawal+Samaj&background=6C3BFF&color=ffffff&bold=true',
      isActive: true,
      settings: defaultSettings
    };

    if (!agrawalComm) {
      agrawalComm = await Community.create(agrawalPayload);
      console.log('🏛️  Created Community: Agrawal Samaj Indore');
    } else {
      Object.assign(agrawalComm, agrawalPayload);
      await agrawalComm.save();
      console.log('🏛️  Updated Community Settings: Agrawal Samaj Indore');
    }

    // Also ensure Meri Samaj community exists & is active
    let meriSamajComm = await Community.findOne({ name: 'Meri Samaj' });
    if (!meriSamajComm) {
      meriSamajComm = await Community.create({
        name: 'Meri Samaj',
        slug: 'meri-samaj',
        city: 'Indore',
        description: 'Central Samaj community for all members across regions.',
        isActive: true,
        settings: defaultSettings
      });
      console.log('🏛️  Created Community: Meri Samaj');
    } else {
      meriSamajComm.settings = defaultSettings;
      meriSamajComm.isActive = true;
      await meriSamajComm.save();
    }

    const allTargetCommunities = [agrawalComm, meriSamajComm];
    const targetCommunityIds = allTargetCommunities.map(c => c._id);

    // ─────────────────────────────────────────────────────────────
    // 2. MASTER ADMIN USERS
    // ─────────────────────────────────────────────────────────────
    let adminUser = await User.findOne({ email: 'admin@merisamaj.com' });
    if (!adminUser) {
      adminUser = await User.findOne({ phone: '7777777777' });
    }
    const adminData = {
      name: 'System Admin',
      phone: '7777777777',
      email: 'admin@merisamaj.com',
      password: 'Admin@123',
      plainPassword: 'Admin@123',
      role: 'admin',
      city: 'Indore',
      state: 'Madhya Pradesh',
      accountStatus: 'active',
      verificationStatus: 'verified',
      isVerified: true,
      communityId: agrawalComm._id,
      community: agrawalComm.name,
      assignedCommunityIds: targetCommunityIds
    };

    if (!adminUser) {
      adminUser = await User.create(adminData);
      console.log('👑 Created Admin User: admin@merisamaj.com / Admin@123');
    } else {
      Object.assign(adminUser, adminData);
      await adminUser.save();
      console.log('👑 Verified Admin User: admin@merisamaj.com / Admin@123');
    }

    // ─────────────────────────────────────────────────────────────
    // 3. COMMUNITY HEAD (PRESIDENT)
    // ─────────────────────────────────────────────────────────────
    let headUser = await User.findOne({ email: 'head.indore@merisamaj.com' });
    if (!headUser) {
      headUser = await User.findOne({ phone: '9826011111' });
    }
    const headData = {
      name: 'Dr. Rajesh Agrawal',
      phone: '9826011111',
      email: 'head.indore@merisamaj.com',
      password: 'Head@123',
      plainPassword: 'Head@123',
      role: 'head',
      designation: 'Community Head (President)',
      city: 'Indore',
      state: 'Madhya Pradesh',
      bio: 'Serving Agrawal Samaj since 2018. Leading health camps, education scholarships, and matrimonial matching initiatives.',
      avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=800&q=80',
      accountStatus: 'active',
      verificationStatus: 'verified',
      isVerified: true,
      communityId: agrawalComm._id,
      community: agrawalComm.name,
      termYears: '2024-2027',
      headPermissions: {
        canViewDashboard: true,
        canViewMembers: true,
        canAddMembers: true,
        canEditMembers: true,
        canRemoveMembers: true,
        canExportMembers: true,
        canViewProfiles: true,
        canApproveProfiles: true,
        canEditProfiles: true,
        canViewEvents: true,
        canCreateEvents: true,
        canEditEvents: true,
        canDeleteEvents: true,
        canManageBookings: true,
        canViewDonations: true,
        canCreateDonationCampaigns: true,
        canManageExpenses: true,
        canViewFunds: true,
        canManageFunds: true,
        canViewLeadership: true,
        canManageLeadership: true,
        canViewDharmashala: true,
        canManageDharmashala: true,
        canViewSocial: true,
        canManageSocial: true,
        canViewKitchen: true,
        canManageKitchen: true,
        canViewDirectory: true,
        canManageDirectory: true,
        canViewInvitations: true,
        canCreateInvitations: true,
        canManageInvitations: true,
        canViewObituary: true,
        canManageObituary: true,
        canViewElections: true,
        canManageElections: true,
        canViewHomeContent: true,
        canManageHomeContent: true,
        canSendNotifications: true,
        canViewReports: true
      }
    };

    if (!headUser) {
      headUser = await User.create(headData);
    } else {
      Object.assign(headUser, headData);
      await headUser.save();
    }
    agrawalComm.headId = headUser._id;
    await agrawalComm.save();
    console.log('🎖️  Created/Updated Head User: head.indore@merisamaj.com / Head@123 (9826011111)');

    // ─────────────────────────────────────────────────────────────
    // 4. SUB-HEADS / COMMITTEE LEADERS
    // ─────────────────────────────────────────────────────────────
    const subLeadersData = [
      {
        name: 'Vikram Agrawal',
        phone: '9826022222',
        email: 'vikram.vp@merisamaj.com',
        designation: 'Vice President',
        role: 'sub_head',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
        city: 'Indore',
        state: 'Madhya Pradesh'
      },
      {
        name: 'Sunil Gupta',
        phone: '9826033333',
        email: 'sunil.sec@merisamaj.com',
        designation: 'General Secretary',
        role: 'sub_head',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
        city: 'Indore',
        state: 'Madhya Pradesh'
      },
      {
        name: 'Ramesh Mittal',
        phone: '9826044444',
        email: 'ramesh.treasurer@merisamaj.com',
        designation: 'Treasurer',
        role: 'sub_head',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
        city: 'Indore',
        state: 'Madhya Pradesh'
      },
      {
        name: 'Smt. Manju Bansal',
        phone: '9826055555',
        email: 'manju.women@merisamaj.com',
        designation: 'Women Cell Incharge',
        role: 'sub_head',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
        city: 'Indore',
        state: 'Madhya Pradesh'
      }
    ];

    const seededSubLeaders = [];
    for (const sld of subLeadersData) {
      let subUser = await User.findOne({ phone: sld.phone });
      const subUserPayload = {
        ...sld,
        password: 'Password123',
        plainPassword: 'Password123',
        accountStatus: 'active',
        verificationStatus: 'verified',
        isVerified: true,
        communityId: agrawalComm._id,
        community: agrawalComm.name
      };
      if (!subUser) {
        subUser = await User.create(subUserPayload);
      } else {
        Object.assign(subUser, subUserPayload);
        await subUser.save();
      }
      seededSubLeaders.push(subUser);
    }
    console.log(`👥 Seeded ${seededSubLeaders.length} Sub-Heads`);

    // ─────────────────────────────────────────────────────────────
    // 5. DEMOGRAPHIC MEMBERS (Including Rahul Sharma 9999999999)
    // ─────────────────────────────────────────────────────────────
    const membersData = [
      { name: 'Rahul Sharma', email: 'default@samaj.com', phone: '9999999999', gender: 'Male', dob: new Date('1992-06-10'), gotra: 'Sharma', qualification: 'B.Tech IT', profession: 'Product Manager', city: 'Indore', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80' },
      { name: 'Amit Agrawal', email: 'amit.member@merisamaj.com', phone: '9826100001', gender: 'Male', dob: new Date('1993-05-15'), gotra: 'Garg', qualification: 'B.Tech CS', profession: 'Software Engineer', city: 'Indore', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80' },
      { name: 'Pooja Agrawal', email: 'pooja.member@merisamaj.com', phone: '9826100002', gender: 'Female', dob: new Date('1996-08-20'), gotra: 'Bansal', qualification: 'MBA Finance', profession: 'Financial Analyst', city: 'Indore', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80' },
      { name: 'Sanjay Bansal', email: 'sanjay.member@merisamaj.com', phone: '9826100003', gender: 'Male', dob: new Date('1982-11-10'), gotra: 'Bansal', qualification: 'B.Com', profession: 'Textile Business', city: 'Indore', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80' },
      { name: 'Rekha Bansal', email: 'rekha.member@merisamaj.com', phone: '9826100004', gender: 'Female', dob: new Date('1986-03-25'), gotra: 'Mittal', qualification: 'M.A. B.Ed', profession: 'Senior Educator', city: 'Indore', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80' },
      { name: 'Dr. Rohan Mittal', email: 'rohan.doc@merisamaj.com', phone: '9826100009', gender: 'Male', dob: new Date('1991-04-12'), gotra: 'Mittal', qualification: 'MD General Medicine', profession: 'Doctor / Physician', city: 'Indore', avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80' },
      { name: 'Neha Jindal', email: 'neha.jindal@merisamaj.com', phone: '9826100010', gender: 'Female', dob: new Date('1995-10-08'), gotra: 'Jindal', qualification: 'MS Data Science', profession: 'Data Scientist', city: 'Indore', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80' },
      { name: 'Rakesh Garg', email: 'rakesh.ca@merisamaj.com', phone: '9826100007', gender: 'Male', dob: new Date('1975-01-05'), gotra: 'Garg', qualification: 'FCA, B.Com', profession: 'Chartered Accountant', city: 'Indore', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80' },
      { name: 'Sunita Garg', email: 'sunita.garg@merisamaj.com', phone: '9826100008', gender: 'Female', dob: new Date('1979-07-14'), gotra: 'Kansal', qualification: 'B.Sc Interior Design', profession: 'Interior Decorator', city: 'Indore', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80' }
    ];

    const seededMembers = [];
    for (const md of membersData) {
      let mUser = await User.findOne({ phone: md.phone });
      const mUserPayload = {
        ...md,
        password: 'Password123',
        plainPassword: 'Password123',
        role: 'user',
        accountStatus: 'active',
        verificationStatus: 'verified',
        isVerified: true,
        communityId: agrawalComm._id,
        community: agrawalComm.name
      };
      if (!mUser) {
        mUser = await User.create(mUserPayload);
      } else {
        Object.assign(mUser, mUserPayload);
        await mUser.save();
      }
      seededMembers.push(mUser);
    }
    console.log(`📊 Seeded ${seededMembers.length} Community Members`);

    // ─────────────────────────────────────────────────────────────
    // 6. LOOP TO SEED MODULE DATA FOR ALL ACTIVE COMMUNITIES
    // ─────────────────────────────────────────────────────────────
    await Invitation.deleteMany({});
    await Donation.deleteMany({});
    await SuccessStory.deleteMany({});
    await Event.deleteMany({});
    await Dharmashala.deleteMany({});
    await DharmashalaRoom.deleteMany({});
    await DharmashalaBooking.deleteMany({});
    await Fund.deleteMany({});
    await Contribution.deleteMany({});
    await FundExpense.deleteMany({});
    await Obituary.deleteMany({});
    await Voting.deleteMany({});
    await Professional.deleteMany({});
    await Post.deleteMany({});
    await Story.deleteMany({});
    await Group.deleteMany({});
    await UserNotification.deleteMany({});

    for (const comm of allTargetCommunities) {
      console.log(`\n📦 Seeding modules for community: ${comm.name} (${comm._id})...`);

      // ─── A. INVITATIONS ───
      const invitationsData = [
        {
          communityId: comm._id,
          title: 'Shubh Vivah: Aarav & Sneha',
          hostName: 'Shri Suresh & Smt. Anita Agrawal',
          date: '2026-11-21',
          timeProgram: '07:00 PM Onwards',
          location: 'Sayaji Hotel Crystal Ballroom, H-1 Scheme No. 54, Vijay Nagar, Indore',
          contact: '9826100003',
          message: 'We cordially invite you and your family to grace the auspicious wedding ceremony of our son Aarav with Sneha.',
          images: ['https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80'],
          creatorId: seededMembers[3]._id,
          status: 'Approved',
          rsvps: [
            { memberId: headUser._id, status: 'attending_family', respondedAt: new Date() },
            { memberId: seededMembers[1]._id, status: 'attending', respondedAt: new Date() }
          ]
        },
        {
          communityId: comm._id,
          title: 'Griha Pravesh & Shanti Havan',
          hostName: 'Rakesh & Sunita Garg',
          date: '2026-10-18',
          timeProgram: '10:00 AM - 02:00 PM',
          location: 'Villa 14, Silver Springs, AB Road, Indore',
          contact: '9826100007',
          message: 'You are warmly invited with your family for our new housewarming havan and mahaprasad.',
          images: ['https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80'],
          creatorId: seededMembers[7]._id,
          status: 'Approved',
          rsvps: [
            { memberId: headUser._id, status: 'attending', respondedAt: new Date() }
          ]
        }
      ];

      for (const inv of invitationsData) {
        await Invitation.create(inv);
      }
      console.log(`  💌 Seeded ${invitationsData.length} Invitations`);

      // ─── B. EVENTS ───
      const eventsData = [
        {
          title: 'Annual Agrawal Samaj Mahotsav 2026',
          titleEn: 'Annual Agrawal Samaj Mahotsav 2026',
          description: 'Grand annual gathering of all community families featuring cultural performances, student felicitations, and banquet dinner.',
          descriptionEn: 'Grand annual gathering of all community families with cultural performances.',
          category: 'Cultural',
          categoryEn: 'Cultural',
          venue: 'Brilliant Convention Centre, Vijay Nagar, Indore',
          venueEn: 'Brilliant Convention Centre, Indore',
          date: '2026-09-15',
          day: '15',
          month: 'September',
          monthShort: 'SEP',
          time: '05:00 PM - 10:00 PM',
          timeEn: '05:00 PM - 10:00 PM',
          image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80',
          entryFee: 'Free for Members',
          capacity: 1000,
          registrationRequired: true,
          createdByRole: 'COMMUNITY_HEAD',
          visibility: 'COMMUNITY',
          communityId: comm._id,
          status: 'Published'
        },
        {
          title: 'Youth Career & Startup Mentoring Seminar',
          titleEn: 'Youth Career & Startup Mentoring Seminar',
          description: 'Interactive session with senior community entrepreneurs and IAS officers guiding youth on career opportunities.',
          descriptionEn: 'Interactive career guidance session for community youth.',
          category: 'Education',
          categoryEn: 'Education',
          venue: 'Samaj Bhawan Auditorium, Tukoganj, Indore',
          venueEn: 'Samaj Bhawan, Tukoganj, Indore',
          date: '2026-09-28',
          day: '28',
          month: 'September',
          monthShort: 'SEP',
          time: '10:00 AM - 01:00 PM',
          timeEn: '10:00 AM - 01:00 PM',
          image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
          entryFee: 'Free',
          capacity: 300,
          registrationRequired: true,
          createdByRole: 'COMMUNITY_HEAD',
          visibility: 'COMMUNITY',
          communityId: comm._id,
          status: 'Published'
        }
      ];

      for (const ev of eventsData) {
        await Event.create(ev);
      }
      console.log(`  📅 Seeded Events`);

      // ─── C. DONATIONS & CAMPAIGN ───
      const campaign = await Donation.create({
        title: 'Indore Samaj Bhawan Nirman & Welfare Campaign',
        shortDescription: 'Supporting construction of modern community hall, medical dispensary, and scholarship programs.',
        description: 'A multi-purpose welfare campaign for all community members of Indore district.',
        category: 'Infrastructure',
        priority: 'High',
        targetAmount: 1000000,
        raisedAmount: 107100,
        donorCount: 5,
        communityId: comm._id,
        status: 'Active',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        createdBy: headUser._id
      });

      const topDonationsData = [
        { txnId: 'TXN_' + Date.now() + '_1', donorName: 'Dr. Rajesh Agrawal', user: headUser._id, campaign: campaign._id, amount: 51000, purpose: 'Samaj Bhawan Nirman Fund', paymentMode: 'Online (UPI)', status: 'Approved', communityId: comm._id, createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        { txnId: 'TXN_' + Date.now() + '_2', donorName: 'Vikram Agrawal', user: seededSubLeaders[0]._id, campaign: campaign._id, amount: 25000, purpose: 'Shiksha Sahayata Scholarship', paymentMode: 'Bank Transfer', status: 'Approved', communityId: comm._id, createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
        { txnId: 'TXN_' + Date.now() + '_3', donorName: 'Ramesh Mittal', user: seededSubLeaders[2]._id, campaign: campaign._id, amount: 15000, purpose: 'Gaushala Seva Fund', paymentMode: 'Online (UPI)', status: 'Approved', communityId: comm._id, createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) }
      ];

      for (const td of topDonationsData) {
        await Donation.create(td);
      }
      console.log(`  ❤️  Seeded Donations`);

      // ─── D. MATRIMONIAL SUCCESS STORIES ───
      const successStoriesData = [
        {
          groomId: seededMembers[1]._id,
          brideId: seededMembers[2]._id,
          title: 'Rajesh & Priya Agrawal',
          shortDescription: 'Found their life partner through MeriSamaj within 3 months of verified listing.',
          story: 'Our families connected through MeriSamaj verified profiles. The gotra match and family background verification gave both sides complete peace of mind.',
          coverImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
          weddingDate: new Date('2026-02-14'),
          communityId: comm._id,
          featured: true,
          status: 'published',
          displayOrder: 1
        }
      ];

      for (const ss of successStoriesData) {
        await SuccessStory.create(ss);
      }

      // ─── E. DHARMASHALAS & ROOMS ───
      const dharmashala1 = await Dharmashala.create({
        name: 'Shri Ram Dharmashala & Atithi Grah',
        description: 'Modern, clean accommodation for families visiting Indore. Located 1 km from Indore Junction Railway Station with pure vegetarian dining.',
        address: 'Near Chhatribagh Square, Main Road, Indore',
        city: 'Indore',
        state: 'Madhya Pradesh',
        pincode: '452002',
        contactPerson: 'Mr. Ramesh Sharma (Manager)',
        contactNumber: '9827012345',
        email: 'shriram.dharmashala@samaj.com',
        image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
        status: 'Active',
        isFeatured: true,
        amenities: ['AC Rooms', 'Elevator / Lift', '24x7 RO Hot & Cold Water', 'CCTV Security', 'Free Parking', 'Pure Veg Dining'],
        pricePerDay: 500,
        rules: 'Check-in: 10:00 AM, Check-out: 10:00 AM. Government photo ID required for all adult guests.',
        communityId: comm._id
      });

      const room101 = await DharmashalaRoom.create({
        dharmashala: dharmashala1._id,
        roomNumber: '101',
        roomName: 'Deluxe AC Room 101',
        floor: '1st Floor',
        roomCategory: 'Deluxe',
        isAc: true,
        capacity: 2,
        maxGuests: 3,
        price: 700,
        status: 'Available'
      });

      await DharmashalaBooking.create({
        communityId: comm._id,
        bookingId: 'BK-' + Date.now().toString().slice(-6) + '-' + comm.name.slice(0, 3).toUpperCase(),
        dharmashala: dharmashala1._id,
        rooms: [room101._id],
        user: seededMembers[0]._id,
        status: 'confirmed',
        checkIn: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        checkOut: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        nights: 2,
        roomType: 'AC',
        totalAmount: 1400,
        bookedBy: seededMembers[0].name,
        phone: seededMembers[0].phone,
        guestCount: 2,
        purpose: 'Family Visit & Samaj Mahotsav',
        paymentStatus: 'Paid'
      });
      console.log(`  🏨 Seeded Dharmashalas`);

      // ─── F. SAMAJ FUNDS ───
      const fund1 = await Fund.create({
        name: 'Samaj Bhawan Maintenance & Cleanliness Fund',
        purpose: 'Ongoing operational upkeep, lift maintenance, sanitization, and electricity backup for Bhawan.',
        description: 'Annual mandatory maintenance contribution for all active households.',
        targetAmount: 200000,
        contributionPerMember: 1000,
        dueDate: new Date('2026-10-31'),
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        status: 'Active',
        scope: 'COMMUNITY',
        communityId: comm._id,
        assignedMembers: seededMembers.map(m => m._id),
        createdBy: headUser._id
      });

      for (const member of seededMembers) {
        await Contribution.create({
          fundId: fund1._id,
          memberId: member._id,
          communityId: comm._id,
          assignedAmount: 1000,
          paidAmount: 1000,
          lastPaymentDate: new Date(),
          transactions: [
            {
              amount: 1000,
              paymentMode: 'Online (UPI)',
              txnId: 'TXN_FUND_' + Math.random().toString(36).substring(7).toUpperCase(),
              paidAt: new Date()
            }
          ]
        });
      }

      await FundExpense.create({
        fundId: fund1._id,
        communityId: comm._id,
        title: 'Lift AMC & Service Maintenance',
        description: 'Quarterly lift inspection and lubrication by Johnson Lifts',
        amount: 8500,
        category: 'Maintenance',
        addedBy: 'Treasurer',
        receiptAttached: true
      });
      console.log(`  💰 Seeded Funds & Ledger`);

      // ─── G. OBITUARY / SHRADHANJALI ───
      await Obituary.create({
        communityId: comm._id,
        community: comm.name,
        deceasedName: 'Late Shri Radheshyam Agrawal',
        deceasedNameEn: 'Late Shri Radheshyam Agrawal',
        prefix: 'Shri',
        age: 82,
        birthDate: '1944-03-12',
        dateOfPassing: '2026-08-15',
        funeralDetails: {
          type: 'Cremation Completed',
          date: '2026-08-15',
          time: '04:00 PM',
          venue: 'Muktidham, Rambagh, Indore'
        },
        ceremonies: [
          {
            type: 'Besna & Prayer Meeting',
            date: '2026-08-28',
            time: '04:00 PM - 05:30 PM',
            venue: 'Agrawal Bhawan, Tukoganj, Indore'
          }
        ],
        message: 'A revered elder of our community, respected social worker, and founder of Agrawal Vachanalaya Indore. His exemplary kindness will continue to inspire generations.',
        image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
        familyContact: 'Ramesh Agrawal (Son) - 9826044444',
        relation: 'Eldest Patriarch',
        creatorId: headUser._id
      });

      // ─── H. VOTING / ELECTIONS ───
      await Voting.create({
        title: 'Indore Agrawal Samaj Executive Council Election 2026',
        description: 'Cast your ballot to select the Executive Council President and Key Office Bearers for the term 2026-2029.',
        type: 'Community Election',
        status: 'Active',
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-09-30'),
        communityId: comm._id,
        createdBy: headUser._id,
        candidates: [
          {
            name: 'Dr. Rajesh Agrawal',
            initials: 'RA',
            age: 56,
            profession: 'Senior Physician & Social Reformer',
            avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80',
            shortIntro: 'Focusing on education scholarships, youth startup hubs, and digitized matrimonial assistance.',
            experience: '6 Years serving as President with 100% transparency.',
            manifesto: ['Build digital telemedicine center at Bhawan', 'Expand youth scholarship corpus to ₹25 Lakhs', 'Zero-fee matrimonial registration for all members']
          }
        ]
      });

      // ─── I. SOCIAL POSTS & GROUPS ───
      await Post.create({
        userId: headUser._id,
        authorId: headUser._id,
        communityId: comm._id,
        content: `🙏 Warm greetings to all respected Samaj members of ${comm.name}! Work on our new community center development project is progressing smoothly.`,
        category: 'Announcement',
        feedType: 'community',
        likesCount: 58,
        commentsCount: 14,
        createdAt: new Date()
      });

      await Group.create({
        name: `${comm.name} Youth & Career Forum`,
        description: 'Connecting young professionals, entrepreneurs, students, and tech enthusiasts.',
        category: 'Youth',
        type: 'public',
        communityId: comm._id,
        creator: headUser._id,
        avatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=200&q=80',
        members: [
          { userId: headUser._id, role: 'head', joinedAt: new Date() },
          { userId: seededMembers[0]._id, role: 'member', joinedAt: new Date() }
        ]
      });

      // ─── J. NOTIFICATIONS ───
      for (const m of seededMembers) {
        await UserNotification.create({
          userId: m._id,
          communityId: comm._id,
          module: 'invitations',
          type: 'invitation_received',
          priority: 'normal',
          icon: '💌',
          title: 'New Community Invitation 💌',
          message: 'You have been cordially invited to "Shubh Vivah: Aarav & Sneha".',
          actionUrl: '/member/invitations'
        });
      }
    }

    // Seed Matrimonial Profiles
    await MatrimonialProfile.deleteMany({});
    const matrimonialProfilesData = [
      {
        userId: seededMembers[1]._id, // Amit Agrawal
        communityId: agrawalComm._id,
        status: 'active',
        visibility: 'public',
        verificationStatus: 'verified',
        profileCompletion: { percentage: 100, completedSections: ['personal', 'education', 'family', 'photos'] },
        personal: {
          fullName: 'Amit Agrawal',
          gender: 'male',
          dateOfBirth: new Date('1993-05-15'),
          height: 178,
          weight: 72,
          maritalStatus: 'Never Married',
          caste: 'Agrawal',
          gotra: 'Garg',
          motherTongue: 'Hindi',
          city: 'Indore',
          state: 'Madhya Pradesh',
          country: 'India',
          aboutMe: 'Software engineer at a multinational company in Indore. Passionate about technology, badminton, and family values.'
        },
        education: {
          highestQualification: 'B.Tech Computer Science',
          workingWith: 'Private Sector MNC',
          occupation: 'Senior Software Engineer',
          annualIncome: '₹24 - 30 Lakhs'
        },
        family: {
          fatherName: 'Shri Ramavatar Agrawal',
          fatherOccupation: 'Retired Banker',
          motherName: 'Smt. Shanti Agrawal',
          motherOccupation: 'Homemaker',
          brothers: 1,
          sisters: 1,
          familyType: 'Joint',
          familyValues: 'Moderate'
        },
        photos: [{ url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80', isPrimary: true, isVerified: true, status: 'approved' }]
      },
      {
        userId: seededMembers[2]._id, // Pooja Agrawal
        communityId: agrawalComm._id,
        status: 'active',
        visibility: 'public',
        verificationStatus: 'verified',
        profileCompletion: { percentage: 100, completedSections: ['personal', 'education', 'family', 'photos'] },
        personal: {
          fullName: 'Pooja Agrawal',
          gender: 'female',
          dateOfBirth: new Date('1996-08-20'),
          height: 165,
          weight: 56,
          maritalStatus: 'Never Married',
          caste: 'Agrawal',
          gotra: 'Bansal',
          motherTongue: 'Hindi',
          city: 'Indore',
          state: 'Madhya Pradesh',
          country: 'India',
          aboutMe: 'MBA graduate working as a Financial Analyst at an investment firm. Love classical music, travel, and cultural traditions.'
        },
        education: {
          highestQualification: 'MBA Finance',
          workingWith: 'Financial Services Firm',
          occupation: 'Financial Analyst',
          annualIncome: '₹15 - 20 Lakhs'
        },
        family: {
          fatherName: 'Shri Kailash Agrawal',
          fatherOccupation: 'Business (Textiles)',
          motherName: 'Smt. Maya Agrawal',
          motherOccupation: 'Homemaker',
          brothers: 1,
          sisters: 0,
          familyType: 'Nuclear',
          familyValues: 'Traditional'
        },
        photos: [{ url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80', isPrimary: true, isVerified: true, status: 'approved' }]
      }
    ];

    for (const mp of matrimonialProfilesData) {
      await MatrimonialProfile.create(mp);
    }

    // ─────────────────────────────────────────────────────────────
    // 17. APP CONTENT (USER APP EDITS) SEEDING
    // ─────────────────────────────────────────────────────────────
    console.log('🎨 Seeding AppContent (User App Edits)...');
    await AppContent.deleteMany({});
    for (const comm of allTargetCommunities) {
      await AppContent.create({
        communityId: comm._id,
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
          },
          {
            id: 'story_2',
            title: 'Amit & Neha Gupta',
            tag: 'Met through Samaj Matrimony',
            quote: 'Blessed with wonderful families connecting together smoothly.',
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
            quote: 'A seamless journey from directory to matrimonial bliss.',
            shortDescription: 'A seamless journey from directory to matrimonial bliss.',
            coverImage: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80',
            weddingDate: '2024',
            groomName: 'Vikas Mittal',
            brideName: 'Pooja Mittal',
            featured: false,
            displayOrder: 3,
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
        }
      });
    }
    console.log('✅ Seeded AppContent for all communities');

    console.log('\n============================================================');
    console.log('🎉 ALL MODULES DATA SEED (MULTI-COMMUNITY) COMPLETED!');
    console.log('============================================================');
    console.log('🔑 TEST LOGIN CREDENTIALS:');
    console.log('  1. Member User 1 (Indore): Phone: 9826100001 | Password: Password123');
    console.log('  2. Member User 2 (Default): Phone: 9999999999 | Password: Password123');
    console.log('  3. Community Head        : Phone: 9826011111 | Password: Head@123');
    console.log('  4. Master Admin          : Email: admin@merisamaj.com (or Phone: 7777777777) | Password: Admin@123');
    console.log('============================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed with error:', error);
    process.exit(1);
  }
}

seedAllModules();
