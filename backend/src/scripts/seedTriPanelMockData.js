const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const Community = require('../models/Community');
const Leadership = require('../models/Leadership');
const Donation = require('../models/Donation');
const SuccessStory = require('../models/SuccessStory');
const Event = require('../models/Event');
const Post = require('../models/Post');
const Notification = require('../models/Notification');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/merisamaj';

async function seedTriPanelData() {
  try {
    console.log('🔄 Connecting to MongoDB at:', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB successfully.');

    // ─────────────────────────────────────────────────────────────
    // 1. COMMUNITY SEEDING
    // ─────────────────────────────────────────────────────────────
    let community = await Community.findOne({ slug: 'agrawal-samaj-indore' });
    if (!community) {
      community = await Community.create({
        name: 'Agrawal Samaj Indore',
        slug: 'agrawal-samaj-indore',
        description: 'Official representative body for Agrawal community members in Indore.',
        city: 'Indore',
        bannerUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1200&q=80',
        logoUrl: 'https://ui-avatars.com/api/?name=Agrawal+Samaj&background=6C3BFF&color=ffffff&bold=true',
        isActive: true
      });
      console.log('🏛️  Created Community: Agrawal Samaj Indore');
    } else {
      console.log('🏛️  Existing Community Found: Agrawal Samaj Indore');
    }

    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash('password123', salt);

    // ─────────────────────────────────────────────────────────────
    // 2. MASTER ADMIN USER
    // ─────────────────────────────────────────────────────────────
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Platform Master Admin',
        phone: '9999999999',
        email: 'admin@merisamaj.com',
        password: 'password123',
        plainPassword: 'password123',
        role: 'admin',
        city: 'Indore',
        state: 'Madhya Pradesh',
        accountStatus: 'active',
        verificationStatus: 'verified',
        communityId: community._id,
        community: community.name
      });
      console.log('👑 Created Admin User: 9999999999 / password123');
    } else {
      adminUser.password = 'password123';
      adminUser.plainPassword = 'password123';
      await adminUser.save();
    }

    // ─────────────────────────────────────────────────────────────
    // 3. COMMUNITY HEAD (PRESIDENT)
    // ─────────────────────────────────────────────────────────────
    let headUser = await User.findOne({ role: 'head', communityId: community._id });
    if (!headUser) {
      headUser = await User.create({
        name: 'Dr. Rajesh Agrawal',
        phone: '9826011111',
        email: 'head.indore@merisamaj.com',
        password: 'password123',
        plainPassword: 'password123',
        role: 'head',
        designation: 'Community Head',
        city: 'Indore',
        state: 'Madhya Pradesh',
        bio: 'Dedicated to community welfare, education initiatives and matrimonial facilitation.',
        avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=800&q=80',
        accountStatus: 'active',
        verificationStatus: 'verified',
        communityId: community._id,
        community: community.name,
        termYears: '2024-2027'
      });
      community.headId = headUser._id;
      await community.save();
      console.log('🎖️  Created Community Head: Dr. Rajesh Agrawal (9826011111)');
    } else {
      headUser.designation = 'Community Head';
      headUser.password = 'password123';
      headUser.plainPassword = 'password123';
      headUser.avatar = 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=800&q=80';
      await headUser.save();
    }

    // ─────────────────────────────────────────────────────────────
    // 4. SUB-HEADS / CORE COMMITTEE LEADERSHIP USERS
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
      if (!subUser) {
        subUser = await User.create({
          ...sld,
          password: 'password123',
          plainPassword: 'password123',
          accountStatus: 'active',
          verificationStatus: 'verified',
          communityId: community._id,
          community: community.name
        });
      } else {
        subUser.designation = sld.designation;
        subUser.role = 'sub_head';
        subUser.avatar = sld.avatar;
        subUser.password = 'password123';
        subUser.plainPassword = 'password123';
        await subUser.save();
      }
      seededSubLeaders.push(subUser);
    }
    console.log(`👥 Seeded ${seededSubLeaders.length} Sub-Heads in User collection`);

    // ─────────────────────────────────────────────────────────────
    // 5. DEMOGRAPHIC MEMBERS FOR CENSUS DIVERSITY
    // ─────────────────────────────────────────────────────────────
    const membersData = [
      { name: 'Amit Agrawal', phone: '9826100001', gender: 'Male', dob: new Date('1990-05-15'), qualification: 'B.Tech', profession: 'Software Engineer', city: 'Indore' },
      { name: 'Pooja Agrawal', phone: '9826100002', gender: 'Female', dob: new Date('1994-08-20'), qualification: 'MBA', profession: 'Financial Analyst', city: 'Indore' },
      { name: 'Sanjay Bansal', phone: '9826100003', gender: 'Male', dob: new Date('1982-11-10'), qualification: 'B.Com', profession: 'Textile Business', city: 'Indore' },
      { name: 'Rekha Bansal', phone: '9826100004', gender: 'Female', dob: new Date('1986-03-25'), qualification: 'M.A.', profession: 'Educator', city: 'Indore' },
      { name: 'Master Aarav Bansal', phone: '9826100005', gender: 'Male', dob: new Date('2018-06-12'), qualification: 'School', profession: 'Student', city: 'Indore' },
      { name: 'Miss Ananya Agrawal', phone: '9826100006', gender: 'Female', dob: new Date('2016-09-18'), qualification: 'School', profession: 'Student', city: 'Indore' },
      { name: 'Rakesh Garg', phone: '9826100007', gender: 'Male', dob: new Date('1975-01-05'), qualification: 'CA', profession: 'Chartered Accountant', city: 'Indore' },
      { name: 'Sunita Garg', phone: '9826100008', gender: 'Female', dob: new Date('1979-07-14'), qualification: 'B.Sc', profession: 'Homemaker', city: 'Indore' }
    ];

    const seededMembers = [];
    for (const md of membersData) {
      let mUser = await User.findOne({ phone: md.phone });
      if (!mUser) {
        mUser = await User.create({
          ...md,
          password: 'password123',
          plainPassword: 'password123',
          role: 'user',
          accountStatus: 'active',
          verificationStatus: 'verified',
          communityId: community._id,
          community: community.name
        });
      } else {
        mUser.password = 'password123';
        mUser.plainPassword = 'password123';
        await mUser.save();
      }
      seededMembers.push(mUser);
    }
    console.log(`📊 Seeded ${seededMembers.length} Community Members for Census calculations`);

    // ─────────────────────────────────────────────────────────────
    // 6. CAMPAIGNS & TOP DONORS
    // ─────────────────────────────────────────────────────────────
    // Clear legacy test donations to ensure clean leaderboard
    await Donation.deleteMany({ communityId: community._id });

    // Create Main Donation Campaign
    const campaign = await Donation.create({
      title: 'Indore Samaj Bhawan Nirman & Welfare Campaign',
      shortDescription: 'Supporting construction of community hall, medical dispensary, and scholarship programs.',
      description: 'A multi-purpose welfare campaign for all community members of Indore district.',
      category: 'Infrastructure',
      priority: 'High',
      targetAmount: 1000000,
      raisedAmount: 107100,
      donorCount: 5,
      communityId: community._id,
      status: 'Active',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      createdBy: headUser._id
    });

    const topDonationsData = [
      {
        txnId: 'TXN_' + Date.now() + '_1',
        donorName: 'Dr. Rajesh Agrawal',
        user: headUser._id,
        campaign: campaign._id,
        amount: 51000,
        purpose: 'Samaj Bhawan Nirman Fund',
        paymentMode: 'Online (UPI)',
        status: 'Approved',
        communityId: community._id,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        txnId: 'TXN_' + Date.now() + '_2',
        donorName: 'Vikram Agrawal',
        user: seededSubLeaders[0]._id,
        campaign: campaign._id,
        amount: 25000,
        purpose: 'Shiksha Sahayata Scholarship',
        paymentMode: 'Bank Transfer',
        status: 'Approved',
        communityId: community._id,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
      },
      {
        txnId: 'TXN_' + Date.now() + '_3',
        donorName: 'Ramesh Mittal',
        user: seededSubLeaders[2]._id,
        campaign: campaign._id,
        amount: 15000,
        purpose: 'Gaushala Seva & Chara Fund',
        paymentMode: 'Online (UPI)',
        status: 'Approved',
        communityId: community._id,
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
      },
      {
        txnId: 'TXN_' + Date.now() + '_4',
        donorName: 'Smt. Manju Bansal',
        user: seededSubLeaders[3]._id,
        campaign: campaign._id,
        amount: 11000,
        purpose: 'Vivah Sahayata Yojana',
        paymentMode: 'Online (UPI)',
        status: 'Approved',
        communityId: community._id,
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
      },
      {
        txnId: 'TXN_' + Date.now() + '_5',
        donorName: 'Rakesh Garg',
        user: seededMembers[6]._id,
        campaign: campaign._id,
        amount: 5100,
        purpose: 'General Community Welfare',
        paymentMode: 'Cash',
        status: 'Approved',
        communityId: community._id,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      }
    ];

    for (const td of topDonationsData) {
      await Donation.create(td);
    }
    console.log('❤️  Seeded Top 5 Recent Donors and Donation Campaign');

    // ─────────────────────────────────────────────────────────────
    // 7. MATRIMONIAL SUCCESS STORIES
    // ─────────────────────────────────────────────────────────────
    await SuccessStory.deleteMany({ communityId: community._id });

    const successStoriesData = [
      {
        groomId: seededMembers[0]._id,
        brideId: seededMembers[1]._id,
        title: 'Rajesh & Priya Agrawal',
        shortDescription: 'Found their life partner through MeriSamaj within 3 months of verified listing.',
        story: 'Our families connected through MeriSamaj verified profiles. The gotra match and family verification gave both sides immense peace of mind.',
        coverImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
        weddingDate: new Date('2026-02-14'),
        communityId: community._id,
        featured: true,
        status: 'published',
        displayOrder: 1
      },
      {
        groomId: seededMembers[2]._id,
        brideId: seededMembers[3]._id,
        title: 'Vikram & Sunita Sharma',
        shortDescription: 'Community filter and family background verification made finding our match seamless.',
        story: 'We are truly grateful to MeriSamaj platform for bringing our two families together with complete transparency.',
        coverImage: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80',
        weddingDate: new Date('2026-04-20'),
        communityId: community._id,
        featured: false,
        status: 'published',
        displayOrder: 2
      },
      {
        groomId: seededMembers[6]._id,
        brideId: seededMembers[7]._id,
        title: 'Amit & Kavita Gupta',
        shortDescription: 'Our families met at the Samaj Milan Samaroh after connecting on the app.',
        story: 'A wonderful experience with verified profiles and direct family-to-family dialogue.',
        coverImage: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80',
        weddingDate: new Date('2026-06-10'),
        communityId: community._id,
        featured: false,
        status: 'published',
        displayOrder: 3
      }
    ];

    for (const ss of successStoriesData) {
      await SuccessStory.create(ss);
    }
    console.log('💍 Seeded 3 Matrimonial Success Stories (1 Featured)');

    // ─────────────────────────────────────────────────────────────
    // 8. COMMUNITY EVENTS
    // ─────────────────────────────────────────────────────────────
    await Event.deleteMany({ communityId: community._id });

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
        communityId: community._id,
        status: 'Published'
      },
      {
        title: 'Youth Career & Startup Guidance Seminar',
        titleEn: 'Youth Career & Startup Guidance Seminar',
        description: 'Interactive session with senior community entrepreneurs and IAS officers guiding youth on career growth and startup funding.',
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
        communityId: community._id,
        status: 'Published'
      },
      {
        title: 'Free Mega Health & Dental Checkup Camp',
        titleEn: 'Free Mega Health & Dental Checkup Camp',
        description: 'Comprehensive health screening camp organized by community doctors for senior citizens and families.',
        descriptionEn: 'Free health screening camp organized by community doctors.',
        category: 'Health',
        categoryEn: 'Health',
        venue: 'Agrawal Dharmashala, Chhatribagh, Indore',
        venueEn: 'Agrawal Dharmashala, Indore',
        date: '2026-10-05',
        day: '05',
        month: 'October',
        monthShort: 'OCT',
        time: '09:00 AM - 03:00 PM',
        timeEn: '09:00 AM - 03:00 PM',
        image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80',
        entryFee: 'Free',
        capacity: 500,
        registrationRequired: false,
        createdByRole: 'COMMUNITY_HEAD',
        visibility: 'COMMUNITY',
        communityId: community._id,
        status: 'Published'
      }
    ];

    for (const ev of eventsData) {
      await Event.create(ev);
    }
    console.log('📅 Seeded 3 Community Events');

    // ─────────────────────────────────────────────────────────────
    // 9. SOCIAL POSTS
    // ─────────────────────────────────────────────────────────────
    await Post.deleteMany({ communityId: community._id });

    const postsData = [
      {
        userId: headUser._id,
        authorId: headUser._id,
        communityId: community._id,
        content: 'Greetings to all Samaj members! Our new community center development project has commenced. We invite your valuable suggestions and active participation in upcoming committee meetings.',
        category: 'Announcement',
        feedType: 'community',
        likesCount: 24,
        commentsCount: 6,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        userId: seededSubLeaders[0]._id,
        authorId: seededSubLeaders[0]._id,
        communityId: community._id,
        content: 'Heartiest congratulations to our bright youth members who scored 95%+ in their board exams! A special felicitation ceremony is scheduled during the Annual Mahotsav.',
        category: 'Achievement',
        feedType: 'community',
        likesCount: 42,
        commentsCount: 12,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    ];

    for (const p of postsData) {
      await Post.create(p);
    }
    console.log('📱 Seeded Social Community Posts');

    console.log('\n============================================================');
    console.log('🎉 TRI-PANEL TEST SEED COMPLETED SUCCESSFULLY!');
    console.log('============================================================');
    console.log('🔑 TEST LOGIN CREDENTIALS:');
    console.log('  1. Master Admin Panel  : Phone: 9999999999 | Password: password123 | http://localhost:5173/admin/dashboard');
    console.log('  2. Community Head Panel: Phone: 9826011111 | Password: password123 | http://localhost:5173/head/dashboard');
    console.log('  3. Member Home Page    : Phone: 9826100001 | Password: password123 | http://localhost:5173/member/home');
    console.log('============================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed with error:', error);
    process.exit(1);
  }
}

seedTriPanelData();
