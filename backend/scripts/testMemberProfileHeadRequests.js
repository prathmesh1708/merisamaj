const { authorize } = require('../src/middleware/authMiddleware');
const familyService = require('../src/services/familyService');

console.log('====================================================');
console.log('🧪 VERIFYING COMMUNITY MEMBER & FAMILY REQUEST PERMISSIONS');
console.log('====================================================\n');

// Mock Express req, res, next
const createMockContext = (user) => {
  const req = {
    user: {
      _id: '507f1f77bcf86cd799439011',
      communityId: '507f1f77bcf86cd799439022',
      ...user
    },
    communityId: '507f1f77bcf86cd799439022'
  };
  let statusCode = 200;
  let responseData = null;
  let nextCalled = false;

  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      responseData = data;
      return res;
    }
  };

  const next = () => {
    nextCalled = true;
  };

  return { req, res, next, getResult: () => ({ statusCode, responseData, nextCalled }) };
};

let allPassed = true;

const checkRbac = (title, user, expectedAllowed) => {
  const middleware = authorize('head', 'sub_head', 'admin', 'super_admin', 'master_admin');
  const { req, res, next, getResult } = createMockContext(user);
  middleware(req, res, next);
  const result = getResult();

  const success = result.nextCalled === expectedAllowed;
  const statusLabel = success ? '✅ PASS' : '❌ FAIL';
  const actionLabel = result.nextCalled ? 'ALLOWED (200 OK)' : `BLOCKED (${result.statusCode} Forbidden)`;
  console.log(`[${statusLabel}] ${title} => ${actionLabel}`);
  if (!success) allPassed = false;
};

console.log('--- TEST GROUP 1: BACKEND RBAC AUTHORIZATION ---');
checkRbac('1. Standard Local Head (role: "sub_head", accountType: "local_head")', { role: 'sub_head', accountType: 'local_head' }, true);
checkRbac('2. Sub-Head with subHeadType: "local"', { role: 'sub_head', subHeadType: 'local' }, true);
checkRbac('3. Member assigned as Local Head (role: "user", accountType: "local_head")', { role: 'user', accountType: 'local_head' }, true);
checkRbac('4. Multi-role user (role: "user", roles: ["local_head"])', { role: 'user', roles: ['local_head'] }, true);
checkRbac('5. Multi-role user (role: "member", roles: ["sub_head"])', { role: 'member', roles: ['sub_head'] }, true);
checkRbac('6. Local Head by designation (role: "user", designation: "Local Head")', { role: 'user', designation: 'Local Head' }, true);
checkRbac('7. Standard Community Head (role: "head")', { role: 'head' }, true);
checkRbac('8. Community Head by accountType (role: "user", accountType: "community_head")', { role: 'user', accountType: 'community_head' }, true);
checkRbac('9. Multi-role user (role: "user", roles: ["head"])', { role: 'user', roles: ['head'] }, true);
checkRbac('10. Community Head by designation (role: "user", designation: "Community Head")', { role: 'user', designation: 'Community Head' }, true);
checkRbac('11. Master Admin (role: "master_admin")', { role: 'master_admin' }, true);
checkRbac('12. Admin (role: "admin")', { role: 'admin' }, true);
checkRbac('13. Regular Member (role: "user", no head roles/accountType)', { role: 'user' }, false);
checkRbac('14. Regular Member (role: "member", no head roles/accountType)', { role: 'member' }, false);
checkRbac('15. Guest or unknown role (role: "guest")', { role: 'guest' }, false);

console.log('\n--- TEST GROUP 2: FAMILY REQUEST REVIEWER LEVEL ---');
const checkReviewerLevel = (title, user, expectedLevel) => {
  const level = familyService.reviewerLevel(user);
  const success = level === expectedLevel;
  const statusLabel = success ? '✅ PASS' : '❌ FAIL';
  console.log(`[${statusLabel}] ${title} => Level: '${level}' (expected: '${expectedLevel}')`);
  if (!success) allPassed = false;
};

checkReviewerLevel('1. Local Head (sub_head + local_head)', { role: 'sub_head', accountType: 'local_head' }, 'local');
checkReviewerLevel('2. Local Head (user + local_head accountType)', { role: 'user', accountType: 'local_head' }, 'local');
checkReviewerLevel('3. Local Head (roles: ["local_head"])', { role: 'user', roles: ['local_head'] }, 'local');
checkReviewerLevel('4. Community Head (role: "head")', { role: 'head' }, 'community');
checkReviewerLevel('5. Community Head (user + community_head accountType)', { role: 'user', accountType: 'community_head' }, 'community');
checkReviewerLevel('6. Community Head (roles: ["community_head"])', { role: 'user', roles: ['community_head'] }, 'community');
checkReviewerLevel('7. Master Admin (role: "master_admin")', { role: 'master_admin' }, 'admin');
checkReviewerLevel('8. Regular Member (role: "user")', { role: 'user' }, null);
checkReviewerLevel('9. Regular Member (role: "member")', { role: 'member' }, null);

console.log('\n====================================================');
if (allPassed) {
  console.log('🎉 ALL PERMISSION & ROLE TESTS PASSED SUCCESSFULLY!');
} else {
  console.log('❌ SOME TESTS FAILED! Review output above.');
}
console.log('====================================================\n');

process.exit(allPassed ? 0 : 1);
