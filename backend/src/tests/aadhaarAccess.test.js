/**
 * Aadhaar role-based visibility — run with `npm test` (no database needed;
 * models are stubbed). Checks what each role actually receives from the API.
 */
process.env.AADHAAR_DATA_KEY = process.env.AADHAAR_DATA_KEY_TEST || 'a'.repeat(64);

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const mongoose = require('mongoose');

const aadhaarCrypto = require('../utils/aadhaarCrypto');
const serializer = require('../utils/aadhaarSerializer');
const { buildRestrictedProfile, buildFullProfile } = require('../middleware/matrimonialPrivacy');
const User = require('../models/User');
const Post = require('../models/Post');
const AadhaarKycRecord = require('../models/AadhaarKycRecord');
const AadhaarAccessLog = require('../models/AadhaarAccessLog');

aadhaarCrypto.resetKeyCache();

// ─── Fixtures ───────────────────────────────────────────────────────────────
const MEMBER_ID = new mongoose.Types.ObjectId();
const ADMIN_ID = new mongoose.Types.ObjectId();
const COMMUNITY_ID = new mongoose.Types.ObjectId();

// A member document as a careless query might return it — including every
// internal Aadhaar field — to prove the mappers drop them.
const memberDoc = () => ({
  _id: MEMBER_ID,
  name: 'Ramu',
  communityId: COMMUNITY_ID,
  isAadharVerified: true,
  aadhaarVerifiedName: 'Ram Kumar Sharma',
  aadhaarLast4: '1234',
  aadhaarVerifiedAt: new Date('2026-11-18T10:00:00Z'),
  aadhaarHash: 'deadbeef',
  aadhaarName: 'Ram Kumar Sharma'
});

const kycRecord = () => ({
  _id: new mongoose.Types.ObjectId(),
  userId: MEMBER_ID,
  provider: 'quickekyc',
  method: 'aadhaar_otp',
  mode: 'live',
  referenceId: 'ref_123',
  verifiedName: 'Ram Kumar Sharma',
  aadhaarLast4: '1234',
  verifiedAt: new Date('2026-11-18T10:00:00Z'),
  encryptedDetails: aadhaarCrypto.encryptJson({ dob: '1995-04-12', gender: 'M', address: '12 MG Road, Indore, Madhya Pradesh, 452001' }),
  encryptedPhoto: aadhaarCrypto.encrypt(Buffer.from('fake-jpeg-bytes')),
  photoMimeType: 'image/jpeg',
  hasPhoto: true,
  detailsStored: true
});

const SENSITIVE_KEYS = ['aadhaarLast4', 'aadhaarHash', 'aadhaarVerifiedAt', 'aadhaarName', 'aadhaarMasked',
  'aadhaarNumber', 'dob', 'gender', 'address', 'photo', 'hasPhoto', 'referenceId', 'encryptedDetails', 'encryptedPhoto'];
const assertNoSensitiveAadhaar = (obj, where) => {
  const json = JSON.stringify(obj);
  SENSITIVE_KEYS.forEach(k => assert.ok(!json.includes(`"${k}"`), `${where} must not contain "${k}"`));
  assert.ok(!json.includes('1234'), `${where} must not contain Aadhaar digits`);
};

// Chainable query stub: .select()/.populate()/.sort()/.limit()/.lean() → value
const queryStub = (value, calls = []) => {
  const q = {
    select: (s) => { calls.push(['select', s]); return q; },
    populate: () => q, sort: () => q, limit: () => q,
    lean: async () => value,
    then: (res, rej) => Promise.resolve(value).then(res, rej)
  };
  return q;
};

const stub = (obj, key, fn) => {
  const original = obj[key];
  obj[key] = fn;
  return () => { obj[key] = original; };
};

// ─── 1. Serializer (role-based mapper) ──────────────────────────────────────
test('public view (matrimonial viewer / Local Head / Sub Head) = status + verified name only', () => {
  assert.deepEqual(serializer.publicAadhaar(memberDoc()), { isAadhaarVerified: true, aadhaarVerifiedName: 'Ram Kumar Sharma' });
  assert.deepEqual(serializer.publicAadhaar({ isAadharVerified: false, aadhaarVerifiedName: 'X' }), { isAadhaarVerified: false, aadhaarVerifiedName: null });
});

test('withPublicAadhaar strips internal Aadhaar fields from a full user doc', () => {
  const out = serializer.withPublicAadhaar(memberDoc());
  assert.equal(out.isAadhaarVerified, true);
  assert.equal(out.aadhaarVerifiedName, 'Ram Kumar Sharma');
  assertNoSensitiveAadhaar(out, 'withPublicAadhaar');
});

test('self view adds masked number and verified date, nothing else', () => {
  const out = serializer.selfAadhaar(memberDoc());
  assert.deepEqual(Object.keys(out).sort(), ['aadhaarMasked', 'aadhaarVerifiedAt', 'aadhaarVerifiedName', 'isAadhaarVerified']);
  assert.equal(out.aadhaarMasked, 'XXXX-XXXX-1234');
});

test('admin view returns the full decrypted record; number stays masked', () => {
  const record = kycRecord();
  const out = serializer.adminAadhaar(memberDoc(), record, aadhaarCrypto.decryptJson(record.encryptedDetails));
  assert.equal(out.dob, '1995-04-12');
  assert.equal(out.gender, 'Male');
  assert.match(out.address, /Indore/);
  assert.equal(out.aadhaarMasked, 'XXXX-XXXX-1234');
  assert.equal(out.fullNumberStored, false);
  assert.equal(out.referenceId, 'ref_123');
  assert.equal(out.source, 'uidai_otp');
  assert.equal(out.hasPhoto, true);
});

test('admin sub-heads, heads and members are not full-Aadhaar admins', () => {
  assert.equal(serializer.isFullAadhaarAdmin({ role: 'admin' }), true);
  assert.equal(serializer.isFullAadhaarAdmin({ role: 'admin_sub_head' }), false);
  assert.equal(serializer.isFullAadhaarAdmin({ role: 'head' }), false);
  assert.equal(serializer.isFullAadhaarAdmin({ role: 'sub_head', accountType: 'local_head' }), false);
  assert.equal(serializer.isFullAadhaarAdmin({ role: 'user' }), false);
});

// ─── 2. Encryption at rest ──────────────────────────────────────────────────
test('KYC details are AES-GCM encrypted and tamper-evident', () => {
  const enc = aadhaarCrypto.encryptJson({ dob: '1995-04-12' });
  assert.ok(!enc.includes('1995'));
  assert.deepEqual(aadhaarCrypto.decryptJson(enc), { dob: '1995-04-12' });
  const parts = enc.split(':');
  parts[3] = Buffer.from('tampered').toString('base64');
  assert.throws(() => aadhaarCrypto.decryptJson(parts.join(':')));
});

// ─── 3. Matrimonial profile ─────────────────────────────────────────────────
const matrimonialProfile = (isPrivate) => ({
  _id: new mongoose.Types.ObjectId(),
  status: 'active',
  personal: { fullName: 'Ramu S', dateOfBirth: new Date('1995-04-12') },
  visibilitySettings: { visibleOnlyAfterAccept: isPrivate },
  photos: [],
  userId: { _id: MEMBER_ID, name: 'Ramu', verificationStatus: 'verified', ...memberDoc() }
});

test('matrimonial (private profile, not connected): badge + Aadhaar name, nothing else', () => {
  const out = buildRestrictedProfile(matrimonialProfile(true));
  assert.equal(out.aadhaarVerified, true);
  assert.equal(out.aadhaarVerifiedName, 'Ram Kumar Sharma');
  assertNoSensitiveAadhaar(out, 'restricted private profile');
});

test('matrimonial (public profile, not connected): badge only — the profile hides names', () => {
  const out = buildRestrictedProfile(matrimonialProfile(false));
  assert.equal(out.aadhaarVerified, true);
  assert.equal(out.aadhaarVerifiedName, null);
  assertNoSensitiveAadhaar(out, 'restricted public profile');
});

test('matrimonial (connected / owner): badge + Aadhaar name, no other Aadhaar field', () => {
  const out = buildFullProfile(matrimonialProfile(false));
  assert.equal(out.aadhaarVerified, true);
  assert.equal(out.aadhaarVerifiedName, 'Ram Kumar Sharma');
  assert.equal(out.userId.aadhaarVerifiedName, 'Ram Kumar Sharma');
  // personal.dateOfBirth is the member's own matrimonial field, not Aadhaar data
  const { personal, ...rest } = out;
  assertNoSensitiveAadhaar(rest, 'full matrimonial profile');
});

// ─── 4. Local Head / Sub Head API ───────────────────────────────────────────
const runController = (handler, req) => new Promise((resolve, reject) => {
  const res = {
    statusCode: 200, headers: {},
    status(c) { this.statusCode = c; return this; },
    set(h) { Object.assign(this.headers, h); return this; },
    json(body) { resolve({ status: this.statusCode, body }); }
  };
  Promise.resolve(handler(req, res)).catch(reject);
});

for (const [label, headUser] of [
  ['Community Head', { _id: ADMIN_ID, role: 'head', communityId: COMMUNITY_ID }],
  ['Local Head', { _id: ADMIN_ID, role: 'sub_head', accountType: 'local_head', city: 'Indore', communityId: COMMUNITY_ID }],
  ['Sub Head', { _id: ADMIN_ID, role: 'sub_head', subHeadType: 'community', communityId: COMMUNITY_ID }]
]) {
  test(`${label}: GET /head/dashboard/members/:id → only isAadhaarVerified + aadhaarVerifiedName`, async () => {
    const { getMemberProfile } = require('../controllers/head/headDashboardController');
    const selects = [];
    const restoreUser = stub(User, 'findOne', () => queryStub(memberDoc(), selects));
    const restorePost = stub(Post, 'find', () => queryStub([]));
    try {
      const { status, body } = await runController(getMemberProfile, { params: { id: String(MEMBER_ID) }, query: {}, user: headUser });
      assert.equal(status, 200);
      assert.equal(body.data.isAadhaarVerified, true);
      assert.equal(body.data.aadhaarVerifiedName, 'Ram Kumar Sharma');
      assertNoSensitiveAadhaar(body, `${label} member profile`);
      const selected = selects.find(([k]) => k === 'select')[1];
      assert.ok(!/aadhaarLast4|aadhaarHash|aadhaarVerifiedAt/.test(selected), 'head query must not select internal Aadhaar fields');
    } finally { restoreUser(); restorePost(); }
  });
}

// ─── 5. Admin-only Aadhaar endpoints (HTTP) ─────────────────────────────────
const startAdminApp = async (currentUser) => {
  const app = express();
  app.use((req, _res, next) => { req.user = currentUser; next(); });
  app.use('/api/v1/admin/users', require('../routes/admin/userRoutes'));
  const server = await new Promise(r => { const s = app.listen(0, () => r(s)); });
  return { server, base: `http://127.0.0.1:${server.address().port}/api/v1/admin/users/${MEMBER_ID}` };
};

const withAdminStubs = async (fn) => {
  const logs = [];
  const restores = [
    stub(User, 'findById', () => queryStub(memberDoc())),
    stub(AadhaarKycRecord, 'findOne', () => queryStub(kycRecord())),
    stub(AadhaarAccessLog, 'create', async (doc) => { logs.push(doc); return doc; })
  ];
  try { await fn(logs); } finally { restores.forEach(r => r()); }
};

for (const [label, user] of [
  ['member', { _id: ADMIN_ID, role: 'user' }],
  ['Community Head', { _id: ADMIN_ID, role: 'head' }],
  ['Local Head', { _id: ADMIN_ID, role: 'sub_head', accountType: 'local_head' }],
  ['Admin Sub-Head', { _id: ADMIN_ID, role: 'admin_sub_head' }]
]) {
  test(`${label} calling the admin Aadhaar endpoints gets 403 and nothing is logged`, async () => {
    await withAdminStubs(async (logs) => {
      const { server, base } = await startAdminApp(user);
      try {
        for (const url of [`${base}/aadhaar`, `${base}/aadhaar/photo`]) {
          const res = await fetch(url);
          assert.equal(res.status, 403, url);
          assertNoSensitiveAadhaar(await res.json(), `403 body for ${label}`);
        }
        assert.equal(logs.length, 0);
      } finally { server.close(); }
    });
  });
}

test('Admin GET /admin/users/:id/aadhaar → full details, no-store, audit-logged', async () => {
  await withAdminStubs(async (logs) => {
    const { server, base } = await startAdminApp({ _id: ADMIN_ID, role: 'admin' });
    try {
      const res = await fetch(`${base}/aadhaar`);
      assert.equal(res.status, 200);
      assert.match(res.headers.get('cache-control'), /no-store/);
      const { data } = await res.json();
      assert.equal(data.aadhaarVerifiedName, 'Ram Kumar Sharma');
      assert.equal(data.dob, '1995-04-12');
      assert.equal(data.gender, 'Male');
      assert.match(data.address, /Indore/);
      assert.equal(data.aadhaarMasked, 'XXXX-XXXX-1234');
      assert.equal(data.method, 'Aadhaar OTP (UIDAI)');
      assert.equal(data.referenceId, 'ref_123');
      assert.ok(!('encryptedDetails' in data) && !('aadhaarHash' in data));
      assert.equal(logs.length, 1);
      assert.equal(String(logs[0].adminId), String(ADMIN_ID));
      assert.equal(String(logs[0].userId), String(MEMBER_ID));
      assert.equal(logs[0].action, 'view_details');
    } finally { server.close(); }
  });
});

test('Admin GET /admin/users/:id/aadhaar/photo → decrypted image bytes, audit-logged', async () => {
  await withAdminStubs(async (logs) => {
    const { server, base } = await startAdminApp({ _id: ADMIN_ID, role: 'admin' });
    try {
      const res = await fetch(`${base}/aadhaar/photo`);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('content-type'), 'image/jpeg');
      assert.match(res.headers.get('cache-control'), /no-store/);
      assert.equal(Buffer.from(await res.arrayBuffer()).toString(), 'fake-jpeg-bytes');
      assert.equal(logs.length, 1);
      assert.equal(logs[0].action, 'view_photo');
    } finally { server.close(); }
  });
});

// ─── 6. Schema: internal fields are hidden from every query by default ──────
test('User schema hides aadhaarLast4 / aadhaarVerifiedAt / aadhaarHash unless explicitly selected', () => {
  ['aadhaarLast4', 'aadhaarVerifiedAt', 'aadhaarHash'].forEach(f => {
    assert.equal(User.schema.path(f).options.select, false, f);
  });
  assert.equal(User.schema.path('aadhaarName'), undefined);
  ['encryptedDetails', 'encryptedPhoto'].forEach(f => {
    assert.equal(AadhaarKycRecord.schema.path(f).options.select, false, f);
  });
});

// ─── 7. Matrimonial: age / DOB only for the owner ───────────────────────────
test('matrimonial: other members never get age or date of birth; the owner does', () => {
  const restricted = buildRestrictedProfile(matrimonialProfile(true));
  assert.ok(!('age' in restricted));
  assert.ok(!JSON.stringify(restricted).includes('dateOfBirth'));

  const connected = buildFullProfile(matrimonialProfile(false));
  assert.ok(!('age' in connected));
  assert.ok(!('dateOfBirth' in (connected.personal || {})));

  const owner = buildFullProfile(matrimonialProfile(false), {}, { isOwner: true });
  assert.equal(typeof owner.age, 'number');
  assert.ok(owner.personal.dateOfBirth);
});
