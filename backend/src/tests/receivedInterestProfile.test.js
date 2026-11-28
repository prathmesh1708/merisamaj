const { test } = require('node:test');
const assert = require('node:assert');
const { buildReceivedInterestProfile } = require('../middleware/matrimonialPrivacy');

const makeProfile = (privatePhoto) => ({
  _id: 'p1',
  status: 'active',
  userId: { _id: 'u1', name: 'Vishu', phone: '9999999999', email: 'v@x.com', subCommunity: 'Bagwan Mali', verificationStatus: 'verified', isAadharVerified: true },
  personal: { fullName: 'Vishu malakar', gender: 'female', dateOfBirth: new Date('2000-01-01'), gotra: 'Kashyap', height: 160 },
  education: { highestQualification: 'M.com', occupation: 'Teacher', annualIncome: '5 LPA' },
  family: { fatherName: 'Ram' },
  about: { bio: 'Hello' },
  location: { city: 'Sanawad', state: 'MP', address: 'House 12, Main Road' },
  contactSharing: { phone: true, email: true },
  visibilitySettings: { visibleOnlyAfterAccept: privatePhoto },
  photos: [{ _id: 'ph1', url: 'https://img/clear.jpg', blurredUrl: 'https://img/blur.jpg', isPrimary: true }]
});

test('a sender of a pending interest shows full details to the receiver', () => {
  const out = buildReceivedInterestProfile(makeProfile(true), { canViewPhotos: true });
  assert.strictEqual(out.isRestricted, false);
  assert.strictEqual(out.personal.gotra, 'Kashyap');
  assert.strictEqual(out.family.fatherName, 'Ram');
  assert.strictEqual(out.about.bio, 'Hello');
  assert.strictEqual(out.location.city, 'Sanawad');
  assert.strictEqual(out.userId.subCommunity, 'Bagwan Mali');
  assert.strictEqual(out.detailsUnlockedByInterest, true);
});

test('contact details, address, age and date of birth stay hidden', () => {
  const out = buildReceivedInterestProfile(makeProfile(true), { canViewPhotos: true });
  assert.strictEqual(out.userId.phone, undefined);
  assert.strictEqual(out.userId.email, undefined);
  assert.strictEqual(out.location.address, undefined);
  assert.deepStrictEqual(out.contactSharing, { phone: false, email: false });
  assert.strictEqual(out.age, undefined);
  assert.strictEqual(out.personal.dateOfBirth, undefined);
});

test('photos follow the usual rules: private blurred, public clear only with the plan', () => {
  const priv = buildReceivedInterestProfile(makeProfile(true), { canViewPhotos: true });
  assert.strictEqual(priv.photoBlurred, true);
  assert.deepStrictEqual(priv.photos.map(p => p.url), ['https://img/blur.jpg']);

  const pubNoPlan = buildReceivedInterestProfile(makeProfile(false), { canViewPhotos: false });
  assert.strictEqual(pubNoPlan.photoBlurred, true);
  assert.strictEqual(pubNoPlan.photoLockedByPlan, true);
  assert.ok(!JSON.stringify(pubNoPlan).includes('clear.jpg'), 'clear photo URL must not be sent');

  const pubWithPlan = buildReceivedInterestProfile(makeProfile(false), { canViewPhotos: true });
  assert.strictEqual(pubWithPlan.photoBlurred, false);
  assert.deepStrictEqual(pubWithPlan.photos.map(p => p.url), ['https://img/clear.jpg']);
});
