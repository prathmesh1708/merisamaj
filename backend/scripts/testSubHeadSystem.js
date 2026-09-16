/**
 * Verification test script for Sub-Head System
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const config = require('../src/config/config');
const User = require('../src/models/User');
const Community = require('../src/models/Community');

async function runTests() {
  console.log('--- Starting Sub-Head Management System Verification ---');

  const mongoUri = config.mongoUri || 'mongodb://localhost:27017/merisamaj';
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log(' Connected to MongoDB successfully.');
  } catch (err) {
    console.log('⚠️ MongoDB not running or remote URI unreachable directly:', err.message);
    console.log('Validating model schemas and logic in-memory...');
  }

  // 1. Validate User Model Schema Definitions
  const userSchema = User.schema;
  const roleEnum = userSchema.path('role').enumValues;
  console.log('1. User Role Enum:', roleEnum);
  if (!roleEnum.includes('admin_sub_head')) {
    throw new Error("❌ 'admin_sub_head' missing from User role enum");
  }

  const subHeadTypeEnum = userSchema.path('subHeadType').enumValues;
  console.log('2. User subHeadType Enum:', subHeadTypeEnum);
  if (!subHeadTypeEnum.includes('admin') || !subHeadTypeEnum.includes('community') || !subHeadTypeEnum.includes('local')) {
    throw new Error('❌ subHeadType enum missing required values');
  }

  // Check adminPermissions schema
  const adminPermPaths = Object.keys(userSchema.paths).filter(p => p.startsWith('adminPermissions.'));
  console.log(`3. Admin Permissions configured (${adminPermPaths.length} flags):`, adminPermPaths.slice(0, 5), '...');
  if (adminPermPaths.length < 10) {
    throw new Error('❌ adminPermissions flags not properly defined');
  }

  // Check headPermissions schema
  const headPermPaths = Object.keys(userSchema.paths).filter(p => p.startsWith('headPermissions.'));
  console.log(`4. Head Permissions configured (${headPermPaths.length} flags):`, headPermPaths.slice(0, 5), '...');
  if (!headPermPaths.includes('headPermissions.canManageSubHeads')) {
    throw new Error("❌ 'canManageSubHeads' missing from headPermissions");
  }

  // 5. Validate Middleware logic
  const { authorizeModule, authorizeAdminModule } = require('../src/middleware/authorizeModule');
  const { authorize } = require('../src/middleware/authMiddleware');

  // Test authorizeAdminModule
  const reqAdminSubHead = {
    user: {
      role: 'admin_sub_head',
      adminPermissions: {
        canViewDashboard: true,
        canViewUsers: true,
        canManageFunds: false
      }
    }
  };

  let nextCalled = false;
  const nextFn = () => { nextCalled = true; };

  // Allowed module test
  authorizeAdminModule('canViewUsers')(reqAdminSubHead, {}, nextFn);
  if (!nextCalled) throw new Error('❌ authorizeAdminModule failed on allowed permission');
  console.log('5. authorizeAdminModule granted allowed permission correctly.');

  // Blocked module test
  nextCalled = false;
  let statusResult = null;
  let jsonResult = null;
  const resMock = {
    status: (code) => {
      statusResult = code;
      return {
        json: (data) => { jsonResult = data; }
      };
    }
  };

  authorizeAdminModule('canManageFunds')(reqAdminSubHead, resMock, nextFn);
  if (nextCalled || statusResult !== 403) {
    throw new Error('❌ authorizeAdminModule failed to block unauthorized permission');
  }
  console.log('6. authorizeAdminModule blocked unauthorized permission with 403 successfully.');

  // 6. Validate Scoping logic
  const { applyScopeFilter } = require('../src/utils/queryScopeHelper');
  
  // Local Sub-Head test
  const dummyCommId = new mongoose.Types.ObjectId();
  const reqLocalSubHead = {
    user: {
      role: 'sub_head',
      subHeadType: 'local',
      accountType: 'local_sub_head',
      city: 'Indore',
      communityId: dummyCommId
    },
    communityId: dummyCommId
  };

  const scopedFilter = applyScopeFilter(reqLocalSubHead, { isActive: true });
  console.log('7. Scoped filter generated for Local Sub-Head:', scopedFilter);
  if (!scopedFilter.city || !scopedFilter.city.test('Indore')) {
    throw new Error('❌ City scoping missing for Local Sub-Head');
  }

  console.log('--- ALL UNIT TESTS PASSED SUCCESSFULLY! ---');
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
