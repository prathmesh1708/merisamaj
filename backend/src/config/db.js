const mongoose = require('mongoose');
const config = require('./config');

const connectDB = async () => {
  try {
    if (!config.mongoUri) {
      throw new Error('MONGO_URI environment variable is not defined!');
    }
    const conn = await mongoose.connect(config.mongoUri, {
      // Modern mongoose version doesn't require deprecated options
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Clean up stale legacy unique index on donations collection if present
    try {
      await conn.connection.collection('donations').dropIndex('txnId_1');
      console.log('Cleaned up legacy txnId_1 index on donations collection.');
    } catch (indexErr) {
      // Index not found or already dropped, ignore
    }

    // Seed default users for testing if they don't exist
    const User = require('../models/User');

    // 1. Seed/Update Default Member
    const defaultPhone = '9999999999';
    const defaultEmail = 'default@samaj.com';
    const defaultPassword = 'Password123';
    let memberUser = await User.findOne({ phone: defaultPhone });

    if (!memberUser) {
      await User.create({
        phone: defaultPhone,
        email: defaultEmail,
        password: defaultPassword, // Auto-hashed by user pre-save hook
        name: 'Default Member',
        role: 'user',
        community: 'Agrawal Samaj',
        city: 'Indore',
        isVerified: true
      });
      console.log('Default Samaj Member seeded successfully (Phone: 9999999999, Password: Password123).');
    } else {
      // Ensure role and password are correct
      memberUser.password = defaultPassword;
      memberUser.role = 'user';
      await memberUser.save();
    }

    // 2. Seed/Update Default Head User
    const headEmail = 'head@example.com';
    const headPassword = 'Head@123';
    const headPhone = '8888888888';
    
    let headUser = await User.findOne({ email: headEmail });

    if (!headUser) {
      // Fallback: check if the phone is already used
      headUser = await User.findOne({ phone: headPhone });
    }

    if (!headUser) {
      await User.create({
        phone: headPhone,
        email: headEmail,
        password: headPassword, // Auto-hashed by user pre-save hook
        name: 'Shri Mohan Lal',
        role: 'head',
        community: 'Meri Samaj',
        city: 'Indore',
        isVerified: true
      });
      console.log('Default Head (President) seeded successfully (Email: head@example.com, Password: Head@123).');
    } else {
      // Force update role and password to match our required config
      headUser.email = headEmail;
      headUser.password = headPassword;
      headUser.role = 'head';
      headUser.isVerified = true;
      await headUser.save();
      console.log('Default Head (President) database state verified and updated successfully.');
    }

    // 2b. Seed/Update Default Admin User
    const adminEmail = 'admin@gmail.com';
    const adminPassword = 'Admin!@#123';
    const adminPhone = '7777777777';

    let adminUser = await User.findOne({ email: adminEmail });
    if (!adminUser) {
      adminUser = await User.findOne({ phone: adminPhone });
    }

    if (!adminUser) {
      await User.create({
        phone: adminPhone,
        email: adminEmail,
        password: adminPassword, // Pre-save hook hashes this
        name: 'System Admin',
        role: 'admin',
        city: 'Indore',
        isVerified: true,
        accountStatus: 'active',
        verificationStatus: 'verified'
      });
      console.log('Default Admin seeded successfully (Email: admin@gmail.com, Password: Admin!@#123).');
    } else {
      adminUser.email = adminEmail;
      adminUser.password = adminPassword;
      adminUser.role = 'admin';
      adminUser.isVerified = true;
      adminUser.accountStatus = 'active';
      adminUser.verificationStatus = 'verified';
      await adminUser.save();
      console.log('Default Admin database state verified and updated successfully.');
    }


    // 3. Seed Default Dharmashalas and Rooms
    const Dharmashala = require('../models/Dharmashala');
    const DharmashalaRoom = require('../models/DharmashalaRoom');
    
    const dharmashalasCount = await Dharmashala.countDocuments();
    if (dharmashalasCount === 0) {
      const seededProperties = await Dharmashala.create([
        {
          name: 'Shri Ram Dharmashala',
          description: 'Shri Ram Dharmashala offers comfortable stay options for families and community members visiting Indore. Close to the railway station.',
          address: 'Railway Road, Indore, M.P.',
          city: 'Indore',
          state: 'Madhya Pradesh',
          pincode: '452001',
          googleMapsUrl: 'https://maps.google.com',
          latitude: '22.7196',
          longitude: '75.8577',
          contactPerson: 'Mr. Rajesh Sharma',
          contactNumber: '9827012345',
          email: 'shriram@samaj.com',
          status: 'Active',
          isFeatured: true,
          amenities: ['Parking', 'Lift', 'WiFi', 'CCTV', 'RO Water', 'Hot Water'],
          checkInTime: '10:00',
          checkOutTime: '10:00',
          image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600&auto=format&fit=crop',
          galleryImages: [
            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=600&h=400&fit=crop'
          ],
          community: 'Meri Samaj'
        },
        {
          name: 'Shri Krishna Dharmashala',
          description: 'Shri Krishna Dharmashala in Vijay Nagar offers pure vegetarian food facilities and comfortable lodging arrangements.',
          address: 'Vijay Nagar, Indore, M.P.',
          city: 'Indore',
          state: 'Madhya Pradesh',
          pincode: '452010',
          googleMapsUrl: 'https://maps.google.com',
          latitude: '22.7533',
          longitude: '75.8937',
          contactPerson: 'Mr. Sunil Gupta',
          contactNumber: '9926054321',
          email: 'shrikrishna@samaj.com',
          status: 'Active',
          isFeatured: false,
          amenities: ['Parking', 'CCTV', 'Kitchen', 'Dining Hall', 'Generator', 'Temple'],
          checkInTime: '11:00',
          checkOutTime: '11:00',
          image: 'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?q=80&w=600&auto=format&fit=crop',
          galleryImages: [
            'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?q=80&w=600&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1582719478250-c8940026e95c?w=600&h=400&fit=crop'
          ],
          community: 'Agrawal Samaj'
        }
      ]);

      // Seed corresponding rooms for each property
      for (const prop of seededProperties) {
        const roomsToCreate = [
          {
            dharmashala: prop._id,
            roomNumber: '101',
            roomName: 'Deluxe Suite',
            floor: '1st Floor',
            roomCategory: 'Suite',
            isAc: true,
            capacity: 2,
            extraMattressAllowed: true,
            maxGuests: 4,
            price: prop.name.includes('Ram') ? 1800 : 1500,
            weekendPrice: 2000,
            status: 'Available'
          },
          {
            dharmashala: prop._id,
            roomNumber: '102',
            roomName: 'Standard Room',
            floor: '1st Floor',
            roomCategory: 'Standard',
            isAc: false,
            capacity: 2,
            extraMattressAllowed: true,
            maxGuests: 3,
            price: 1000,
            weekendPrice: 1200,
            status: 'Available'
          },
          {
            dharmashala: prop._id,
            roomNumber: '103',
            roomName: 'Standard Room',
            floor: '1st Floor',
            roomCategory: 'Standard',
            isAc: false,
            capacity: 2,
            extraMattressAllowed: false,
            maxGuests: 2,
            price: 800,
            weekendPrice: 900,
            status: 'Available'
          }
        ];
        
        await DharmashalaRoom.create(roomsToCreate);
        
        // Sync counts
        prop.totalRooms = 3;
        prop.acRooms = 1;
        prop.generalRooms = 2;
        await prop.save();
      }
      console.log('Default Dharmashala items and rooms seeded successfully.');
    }

    // Seed Samaj Funds
    const Fund = require('../models/Fund');
    const Contribution = require('../models/Contribution');
    const FundExpense = require('../models/FundExpense');
    
    const fundsCount = await Fund.countDocuments();
    if (fundsCount === 0) {
      const Community = require('../models/Community');
      let community = await Community.findOne({ name: 'Meri Samaj' });
      if (!community) {
        community = await Community.create({
          name: 'Meri Samaj',
          city: 'Indore',
          state: 'Madhya Pradesh',
          country: 'India'
        });
      }
      
      // Update seeded users to have communityId
      await User.updateMany({ community: 'Meri Samaj' }, { communityId: community._id });
      await User.updateMany({ phone: defaultPhone }, { communityId: community._id, name: 'Rahul Sharma' }); // Ensure name matches mock
      
      // Seed other mock members so they are available in dues and reports
      const mockMembersData = [
        { name: 'Manish Jain', phone: '9822000010', email: 'manish@samaj.com' },
        { name: 'Ashok Agrawal', phone: '9755000088', email: 'ashok@samaj.com' },
        { name: 'Sonu Gupta', phone: '9687000021', email: 'sonu@samaj.com' },
        { name: 'Virendra Joshi', phone: '9826000033', email: 'virendra@samaj.com' },
        { name: 'Mahesh Patel', phone: '9988000044', email: 'mahesh@samaj.com' },
        { name: 'Sanjay Kumar', phone: '9766000022', email: 'sanjay@samaj.com' },
        { name: 'Dinesh Verma', phone: '9123000055', email: 'dinesh@samaj.com' }
      ];

      for (const m of mockMembersData) {
        let existing = await User.findOne({ phone: m.phone });
        if (!existing) {
          await User.create({
            phone: m.phone,
            email: m.email,
            password: 'Password123',
            name: m.name,
            role: 'user',
            community: 'Meri Samaj',
            communityId: community._id,
            city: 'Indore',
            isVerified: true
          });
        }
      }

      const rahul = await User.findOne({ phone: defaultPhone });
      const manish = await User.findOne({ phone: '9822000010' });
      const ashok = await User.findOne({ phone: '9755000088' });
      const sonu = await User.findOne({ phone: '9687000021' });
      const virendra = await User.findOne({ phone: '9826000033' });
      const mahesh = await User.findOne({ phone: '9988000044' });
      const sanjay = await User.findOne({ phone: '9766000022' });
      const dinesh = await User.findOne({ phone: '9123000055' });

      const f1 = await Fund.create({
        name: 'Dharamshala Maintenance Fund',
        purpose: 'Annual maintenance and repair of the Samaj Dharamshala',
        description: 'We are raising funds for repairing the roof, painting the main hall, and upgrading the community kitchen facilities before the upcoming festival season.',
        targetAmount: 500000,
        contributionPerMember: 2500,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        dueDate: new Date('2024-12-31'),
        status: 'Active',
        communityId: community._id,
        assignedMembers: [rahul._id, manish._id, ashok._id, sonu._id, virendra._id, mahesh._id, sanjay._id, dinesh._id]
      });

      const f2 = await Fund.create({
        name: 'Education Scholarship Fund 2024',
        purpose: 'Support bright students from underprivileged families',
        description: 'Provide financial assistance to 50 meritorious students for their higher education fees.',
        targetAmount: 250000,
        contributionPerMember: 1000,
        startDate: new Date('2024-05-01'),
        endDate: new Date('2024-08-15'),
        dueDate: new Date('2024-08-15'),
        status: 'Active',
        communityId: community._id,
        assignedMembers: [rahul._id, manish._id, sonu._id, mahesh._id, dinesh._id]
      });

      // Seed contributions
      await Contribution.create([
        { fundId: f1._id, memberId: rahul._id, communityId: community._id, assignedAmount: 2500, paidAmount: 0, transactions: [] },
        { fundId: f1._id, memberId: manish._id, communityId: community._id, assignedAmount: 2500, paidAmount: 1000, lastPaymentDate: new Date('2024-06-10'), transactions: [{ txnId: 'TXN_DHF1', amount: 1000, paymentMode: 'UPI', date: new Date('2024-06-10') }] },
        { fundId: f1._id, memberId: ashok._id, communityId: community._id, assignedAmount: 2500, paidAmount: 0, transactions: [] },
        { fundId: f1._id, memberId: sonu._id, communityId: community._id, assignedAmount: 2500, paidAmount: 2500, lastPaymentDate: new Date('2024-06-01'), transactions: [{ txnId: 'TXN_DHF2', amount: 2500, paymentMode: 'UPI', date: new Date('2024-06-01') }] },
        { fundId: f1._id, memberId: virendra._id, communityId: community._id, assignedAmount: 2500, paidAmount: 0, transactions: [] },
        { fundId: f1._id, memberId: mahesh._id, communityId: community._id, assignedAmount: 2500, paidAmount: 2500, lastPaymentDate: new Date('2024-06-05'), transactions: [{ txnId: 'TXN_DHF3', amount: 2500, paymentMode: 'UPI', date: new Date('2024-06-05') }] },
        { fundId: f1._id, memberId: sanjay._id, communityId: community._id, assignedAmount: 2500, paidAmount: 1500, lastPaymentDate: new Date('2024-06-12'), transactions: [{ txnId: 'TXN_DHF4', amount: 1500, paymentMode: 'UPI', date: new Date('2024-06-12') }] },
        { fundId: f1._id, memberId: dinesh._id, communityId: community._id, assignedAmount: 2500, paidAmount: 2500, lastPaymentDate: new Date('2024-06-14'), transactions: [{ txnId: 'TXN_DHF5', amount: 2500, paymentMode: 'UPI', date: new Date('2024-06-14') }] }
      ]);

      await Contribution.create([
        { fundId: f2._id, memberId: rahul._id, communityId: community._id, assignedAmount: 1000, paidAmount: 1000, lastPaymentDate: new Date('2024-07-01'), transactions: [{ txnId: 'TXN_SCH1', amount: 1000, paymentMode: 'UPI', date: new Date('2024-07-01') }] },
        { fundId: f2._id, memberId: manish._id, communityId: community._id, assignedAmount: 1000, paidAmount: 500, lastPaymentDate: new Date('2024-07-05'), transactions: [{ txnId: 'TXN_SCH2', amount: 500, paymentMode: 'UPI', date: new Date('2024-07-05') }] },
        { fundId: f2._id, memberId: sonu._id, communityId: community._id, assignedAmount: 1000, paidAmount: 0, transactions: [] },
        { fundId: f2._id, memberId: mahesh._id, communityId: community._id, assignedAmount: 1000, paidAmount: 1000, lastPaymentDate: new Date('2024-07-10'), transactions: [{ txnId: 'TXN_SCH3', amount: 1000, paymentMode: 'UPI', date: new Date('2024-07-10') }] },
        { fundId: f2._id, memberId: dinesh._id, communityId: community._id, assignedAmount: 1000, paidAmount: 0, transactions: [] }
      ]);

      // Seed expenses
      await FundExpense.create([
        { fundId: f1._id, communityId: community._id, title: 'Roof Waterproofing', amount: 45000, category: 'Maintenance', date: new Date('2024-05-15'), addedBy: 'Admin (Ramesh)', receiptAttached: true },
        { fundId: f1._id, communityId: community._id, title: 'Plumbing Repairs', amount: 12500, category: 'Maintenance', date: new Date('2024-06-02'), addedBy: 'Admin (Ramesh)', receiptAttached: false },
        { fundId: f2._id, communityId: community._id, title: 'First Semester Fees', amount: 150000, category: 'Education', date: new Date('2024-06-10'), addedBy: 'Admin (Ramesh)', receiptAttached: true }
      ]);

      console.log('Samaj Funds and ledger records seeded successfully.');
    }

    // Seed Professional Listings (Real only)
    const Professional = require('../models/Professional');
    await Professional.deleteMany({
      companyName: {
        $in: [
          'Sharma Industries',
          'Yadav Construction',
          'Gupta Classes',
          'Agrawal Diagnostics',
          'Verma Law Associates',
          'Mehta Architects',
          'Jain Health Clinic'
        ]
      }
    });

    // Seed Categories
    const Category = require('../models/Category');
    const categoryCount = await Category.countDocuments({});
    if (categoryCount === 0) {
      await Category.create([
        { name: 'Education', key: 'education', icon: 'GraduationCap', isActive: true },
        { name: 'Health', key: 'health', icon: 'Heart', isActive: true },
        { name: 'Construction', key: 'construction', icon: 'Hammer', isActive: true },
        { name: 'Manufacturing', key: 'manufacturing', icon: 'Building', isActive: true },
        { name: 'Others', key: 'others', icon: 'MoreHorizontal', isActive: true }
      ]);
      console.log('Default Business Categories seeded successfully.');
    }

    // Auto-run data migration to backfill existing users & posts
    const runMigration = require('../scripts/migratePostsAndUsers');
    await runMigration();

  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

module.exports = connectDB;
