const DiscountCode = require('../../models/DiscountCode');
const DiscountCodeUsage = require('../../models/DiscountCodeUsage');
const UserSubscription = require('../../models/UserSubscription');

const validatePayload = (body) => {
  const code = String(body.code || '').trim().toUpperCase();
  const discountType = body.discountType;
  const discountValue = Number(body.discountValue);
  if (!/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(code)) throw new Error('Code must be 3–40 letters, numbers, hyphens, or underscores.');
  if (!['percentage', 'fixed'].includes(discountType)) throw new Error('Choose a percentage or fixed discount.');
  if (!Number.isFinite(discountValue) || discountValue <= 0 || (discountType === 'percentage' && discountValue > 100)) {
    throw new Error(discountType === 'percentage' ? 'Percentage must be between 1 and 100.' : 'Discount amount must be greater than zero.');
  }
  const startsAt = body.startsAt ? new Date(body.startsAt) : null;
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  if (startsAt && Number.isNaN(startsAt.getTime())) throw new Error('Start date is invalid.');
  if (expiresAt && Number.isNaN(expiresAt.getTime())) throw new Error('Expiry date is invalid.');
  if (startsAt && expiresAt && expiresAt <= startsAt) throw new Error('Expiry must be after the start date.');
  return {
    code, discountType, discountValue,
    description: String(body.description || '').trim(),
    maxDiscountAmount: Math.max(0, Number(body.maxDiscountAmount) || 0),
    minOrderAmount: Math.max(0, Number(body.minOrderAmount) || 0),
    startsAt, expiresAt,
    maxUses: Math.max(0, Math.floor(Number(body.maxUses) || 0)),
    maxUsesPerUser: Math.max(1, Math.floor(Number(body.maxUsesPerUser) || 1)),
    planType: ['all', 'matrimonial', 'app'].includes(body.planType) ? body.planType : 'all',
    planIds: Array.isArray(body.planIds) ? body.planIds : [],
    isActive: body.isActive !== false
  };
};

exports.listDiscountCodes = async (req, res) => {
  try {
    const codes = await DiscountCode.find().sort({ createdAt: -1 }).lean();
    const enriched = await Promise.all(codes.map(async code => {
      const [usedCount, reservedCount] = await Promise.all([
        DiscountCodeUsage.countDocuments({ discountCodeId: code._id }),
        UserSubscription.countDocuments({ couponCodeId: code._id, couponReserved: true, status: 'pending' })
      ]);
      return { ...code, usedCount, reservedCount };
    }));
    res.json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createDiscountCode = async (req, res) => {
  try {
    const data = validatePayload(req.body);
    const exists = await DiscountCode.exists({ code: data.code });
    if (exists) return res.status(409).json({ success: false, message: 'That code already exists.' });
    const code = await DiscountCode.create({ ...data, createdBy: req.user._id });
    res.status(201).json({ success: true, data: code, message: 'Discount code created.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateDiscountCode = async (req, res) => {
  try {
    const data = validatePayload(req.body);
    const code = await DiscountCode.findById(req.params.id);
    if (!code) return res.status(404).json({ success: false, message: 'Discount code not found.' });
    if (data.code !== code.code && await DiscountCode.exists({ _id: { $ne: code._id }, code: data.code })) {
      return res.status(409).json({ success: false, message: 'That code already exists.' });
    }
    Object.assign(code, data, { updatedBy: req.user._id });
    await code.save();
    res.json({ success: true, data: code, message: 'Discount code updated.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.disableDiscountCode = async (req, res) => {
  try {
    const code = await DiscountCode.findByIdAndUpdate(req.params.id, { $set: { isActive: false, updatedBy: req.user._id } }, { new: true });
    if (!code) return res.status(404).json({ success: false, message: 'Discount code not found.' });
    res.json({ success: true, data: code, message: 'Discount code disabled.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
