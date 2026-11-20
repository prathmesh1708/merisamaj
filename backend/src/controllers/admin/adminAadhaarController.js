const mongoose = require('mongoose');
const User = require('../../models/User');
const AadhaarKycRecord = require('../../models/AadhaarKycRecord');
const AadhaarAccessLog = require('../../models/AadhaarAccessLog');
const aadhaarCrypto = require('../../utils/aadhaarCrypto');
const { adminAadhaar } = require('../../utils/aadhaarSerializer');

// Routes using these handlers are guarded by authorize('admin_only'), which
// rejects admin sub-heads, heads and members with 403 (routes/admin/userRoutes.js).

const logAccess = (req, userId, action) => AadhaarAccessLog.create({
  adminId: req.user._id,
  userId,
  action,
  ip: String(req.ip || '').slice(0, 64),
  userAgent: String(req.get('user-agent') || '').slice(0, 300)
});

const decryptDetails = (record) => {
  if (!record?.encryptedDetails) return null;
  try {
    return aadhaarCrypto.decryptJson(record.encryptedDetails);
  } catch (err) {
    console.error('[AdminAadhaar] could not decrypt KYC details:', err.message);
    return null;
  }
};

// @desc    Full Aadhaar details of a member (audited)
// @route   GET /api/v1/admin/users/:id/aadhaar
// @access  Admin only (not admin sub-heads)
exports.getUserAadhaar = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid user ID.' });
    }
    const user = await User.findById(req.params.id)
      .select('name isAadharVerified aadhaarVerifiedName +aadhaarLast4 +aadhaarVerifiedAt')
      .lean();
    if (!user) return res.status(404).json({ status: 'fail', message: 'User not found' });

    const record = await AadhaarKycRecord.findOne({ userId: user._id }).select('+encryptedDetails').lean();
    const details = decryptDetails(record);

    await logAccess(req, user._id, 'view_details');

    res.set('Cache-Control', 'no-store, private');
    res.status(200).json({
      status: 'success',
      data: {
        ...adminAadhaar(user, record, details),
        detailsReadable: !record?.encryptedDetails || !!details
      }
    });
  } catch (error) {
    console.error('Get User Aadhaar Error:', error.message);
    res.status(500).json({ status: 'error', message: 'Failed to load Aadhaar details' });
  }
};

// @desc    The UIDAI e-Aadhaar photo (image bytes, never a public URL; audited)
// @route   GET /api/v1/admin/users/:id/aadhaar/photo
// @access  Admin only (not admin sub-heads)
exports.getUserAadhaarPhoto = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid user ID.' });
    }
    const record = await AadhaarKycRecord.findOne({ userId: req.params.id })
      .select('+encryptedPhoto photoMimeType hasPhoto userId')
      .lean();
    if (!record?.hasPhoto || !record.encryptedPhoto) {
      return res.status(404).json({ status: 'fail', message: 'No Aadhaar photo stored for this member.' });
    }

    let image;
    try {
      image = aadhaarCrypto.decryptToBuffer(record.encryptedPhoto);
    } catch (err) {
      console.error('[AdminAadhaar] could not decrypt photo:', err.message);
      return res.status(500).json({ status: 'error', message: 'Aadhaar photo could not be decrypted.' });
    }

    await logAccess(req, record.userId, 'view_photo');

    res.set({
      'Content-Type': record.photoMimeType || 'image/jpeg',
      'Cache-Control': 'no-store, private',
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff'
    });
    res.status(200).send(image);
  } catch (error) {
    console.error('Get User Aadhaar Photo Error:', error.message);
    res.status(500).json({ status: 'error', message: 'Failed to load Aadhaar photo' });
  }
};
