/**
 * Head Social Feed — Community Isolation Test Suite
 *
 * Asserts the exact filters headSocialController hands to Mongoose, and the
 * jurisdiction guard on the moderation endpoints. Runs fully on mocks — no
 * database connection required.
 *
 * Regression coverage for three isolation defects:
 *   1. getCityFeed built a scoped filter, then queried the UNSCOPED one, so a
 *      Head saw every community's city posts.
 *   2. getCommunityFeed's $or contained a bare { feedType: 'community' } clause
 *      with no community constraint, matching all communities globally.
 *   3. softDeletePost/restorePost/getPostDetails accepted a city match as an
 *      ALTERNATIVE to a community match, so a Head could moderate another
 *      community's posts whenever the two shared a city.
 *
 * Usage:
 *   npm run test:head-scope     (or: node scripts/testHeadSocialScope.js)
 */
const mongoose = require('mongoose');
const Post      = require('../src/models/Post');
const City      = require('../src/models/City');
const Community = require('../src/models/Community');
const User      = require('../src/models/User');

const OID = s => new mongoose.Types.ObjectId(s);
const COMM_A = OID('aaaaaaaaaaaaaaaaaaaaaaaa');
const COMM_B = OID('bbbbbbbbbbbbbbbbbbbbbbbb');
const CITY_1 = OID('cccccccccccccccccccccccc');

let captured = [];
const chain = { populate(){return this}, sort(){return this}, skip(){return this}, limit(){return this},
                then(r){return Promise.resolve([]).then(r)} };
Post.find = f => { captured.push(f); return chain; };
Post.countDocuments = async f => { captured.push(f); return 0; };
City.find = () => ({ select(){return this}, sort(){return this}, limit(){return this},
                     then(r){return Promise.resolve([]).then(r)} });
Community.findById = async () => ({ _id: COMM_A, name: 'Community A', city: 'Indore', cityIds: [CITY_1] });
Community.findOne  = async () => ({ _id: COMM_A, name: 'Community A', city: 'Indore', cityIds: [CITY_1] });
City.findOne = async () => ({ _id: CITY_1, name: 'Indore' });
User.find = () => ({ select: async () => [] });

const ctrl = require('../src/controllers/head/headSocialController');

const mkRes = () => { const r = {}; r.status = c => (r.code = c, r); r.json = b => (r.body = b, r); return r; };
const headReq = (query = {}) => ({ query, communityId: COMM_A,
  user: { _id: OID('dddddddddddddddddddddddd'), role: 'head', communityId: COMM_A,
          assignedCommunityIds: [COMM_A], city: 'Indore' } });

console.log('===================================================');
console.log('HEAD SOCIAL FEED - COMMUNITY ISOLATION TEST SUITE');
console.log('===================================================');

let pass = 0, fail = 0;
const check = (name, cond, detail) => {
  if (cond) { console.log('  ✓', name); pass++; }
  else { console.log('  ✗', name, '\n      ', detail); fail++; }
};

(async () => {
  console.log('\n--- getCityFeed: default (All Cities) ---');
  captured = [];
  await ctrl.getCityFeed(headReq({ cityId: 'all' }), mkRes());
  let f = captured[0] || {};
  check('community scope applied', String(f.communityId) === String(COMM_A), JSON.stringify(f));
  check('no bogus string `city` field', !('city' in f), JSON.stringify(f));
  check('find + count use the SAME filter', JSON.stringify(captured[0]) === JSON.stringify(captured[1]), JSON.stringify(captured));

  console.log('\n--- getCityFeed: specific city selected ---');
  captured = [];
  await ctrl.getCityFeed(headReq({ cityId: CITY_1.toString() }), mkRes());
  f = captured[0] || {};
  check('community scope still applied', String(f.communityId) === String(COMM_A), JSON.stringify(f));
  check('cityId narrowed to selection', String(f.cityId) === String(CITY_1), JSON.stringify(f));

  console.log('\n--- getCommunityFeed ---');
  captured = [];
  await ctrl.getCommunityFeed(headReq({}), mkRes());
  f = captured[0] || {};
  check('communityId is a hard AND', !!f.communityId && !f.$or, JSON.stringify(f));
  check('scoped to own community only', JSON.stringify(f.communityId) === JSON.stringify({ $in: [COMM_A] }), JSON.stringify(f.communityId));
  check('no unbounded feedType clause', JSON.stringify(f.feedType) === JSON.stringify({ $in: ['community','both'] }), JSON.stringify(f.feedType));

  console.log('\n--- getCommunityFeed: search term must not widen scope ---');
  captured = [];
  await ctrl.getCommunityFeed(headReq({ search: 'ram' }), mkRes());
  f = captured[0] || {};
  check('community AND survives a search $or', String(JSON.stringify(f.communityId)) === JSON.stringify({ $in: [COMM_A] }), JSON.stringify(f));

  console.log('\n--- softDeletePost: cross-community post ---');
  Post.findById = async () => ({ _id: OID('eeeeeeeeeeeeeeeeeeeeeeee'), communityId: COMM_B, cityId: CITY_1,
                                 save: async () => {} });
  let res = mkRes();
  await ctrl.softDeletePost({ ...headReq({}), params: { id: 'eeeeeeeeeeeeeeeeeeeeeeee' } }, res);
  check('403 on other community, same city', res.code === 403, 'got ' + res.code + ' ' + JSON.stringify(res.body));

  console.log('\n--- softDeletePost: own-community post ---');
  let saved = false;
  Post.findById = async () => ({ _id: OID('eeeeeeeeeeeeeeeeeeeeeeee'), communityId: COMM_A, cityId: CITY_1,
                                 save: async () => { saved = true; } });
  res = mkRes();
  await ctrl.softDeletePost({ ...headReq({}), params: { id: 'eeeeeeeeeeeeeeeeeeeeeeee' } }, res);
  check('own community still deletable', saved === true && res.code !== 403, 'saved=' + saved + ' code=' + res.code);

  console.log('\n' + (fail === 0 ? '✅ ' : '❌ ') + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail === 0 ? 0 : 1);
})();
