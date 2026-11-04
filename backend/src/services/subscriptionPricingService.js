const DiscountCode = require('../models/DiscountCode');
const DiscountCodeUsage = require('../models/DiscountCodeUsage');
const ReferralService = require('./referralService');
const UserSubscription = require('../models/UserSubscription');
const User = require('../models/User');
const { money, calculateTotals } = require('./subscriptionPricingMath');

const quoteSubscription = async ({ userId, plan, code = '', pointsToRedeem = 0, planType = 'matrimonial', reserveAware = false }) => {
  const listPrice = money(plan.price);
  const config = await ReferralService.getOrCreateConfig();
  const pointsRequested = Math.floor(Number(pointsToRedeem) || 0);
  const user = await User.findById(userId).select('pointsBalance pointsReserved').lean();
  if (!user) throw new Error('User not found.');
  if (pointsRequested < 0) throw new Error('Points cannot be negative.');
  if (pointsRequested && config.subscriptionPointsEnabled === false) throw new Error('Points cannot be used for subscription purchases right now.');
  if (pointsRequested && pointsRequested < Number(config.minSubscriptionRedeemPoints || 1)) {
    throw new Error(`Use at least ${config.minSubscriptionRedeemPoints} points, or enter 0.`);
  }
  const pointsAvailable = Math.max(0, (Number(user.pointsBalance) || 0) - (Number(user.pointsReserved) || 0));
  if (pointsRequested > pointsAvailable) throw new Error('You do not have enough available points.');
  const maxPoints = Number(config.maxSubscriptionRedeemPoints || 0);
  if (maxPoints > 0 && pointsRequested > maxPoints) throw new Error(`You can use at most ${maxPoints} points per purchase.`);

  let appliedCode = '';
  let codeType = '';
  let codeDiscount = 0;
  let discountCodeId = null;

  if (String(code || '').trim()) {
    const normalized = String(code).trim().toUpperCase();
    const discount = await DiscountCode.findOne({ code: normalized, isActive: true }).lean();
    if (discount) {
      const now = new Date();
      if (discount.startsAt && new Date(discount.startsAt) > now) throw new Error('This discount code is not active yet.');
      if (discount.expiresAt && new Date(discount.expiresAt) < now) throw new Error('This discount code has expired.');
      if (discount.planType !== 'all' && discount.planType !== planType) throw new Error('This code cannot be used for this subscription.');
      if (discount.planIds?.length && !discount.planIds.some(id => String(id) === String(plan._id))) throw new Error('This code is not valid for the selected plan.');
      if (listPrice < Number(discount.minOrderAmount || 0)) throw new Error(`This code requires a minimum purchase of ₹${discount.minOrderAmount}.`);
      if (discount.maxUses > 0 && discount.usedCount + discount.reservedCount >= discount.maxUses) throw new Error('This discount code has reached its usage limit.');
      const alreadyUsed = await DiscountCodeUsage.countDocuments({ discountCodeId: discount._id, userId });
      const reservedByUser = await UserSubscription.countDocuments({ userId, couponCodeId: discount._id, couponReserved: true, status: 'pending' });
      if (alreadyUsed + reservedByUser >= Number(discount.maxUsesPerUser || 1)) throw new Error('You have already used this discount code the maximum number of times.');

      codeDiscount = discount.discountType === 'percentage'
        ? money(listPrice * Number(discount.discountValue) / 100)
        : money(discount.discountValue);
      if (Number(discount.maxDiscountAmount) > 0) codeDiscount = Math.min(codeDiscount, Number(discount.maxDiscountAmount));
      discountCodeId = discount._id;
      appliedCode = normalized;
      codeType = 'discount';
    } else {
      const referrer = await User.findOne({ referralCode: normalized }).select('_id referralCode').lean();
      if (!referrer) throw new Error('Invalid referral or discount code.');
      if (String(referrer._id) === String(userId)) throw new Error('You cannot use your own referral code.');
      if (config.referralDiscountEnabled !== true || Number(config.referralDiscountValue) <= 0) throw new Error('Referral discounts are not currently available.');
      codeDiscount = config.referralDiscountType === 'fixed'
        ? money(config.referralDiscountValue)
        : money(listPrice * Number(config.referralDiscountValue) / 100);
      if (Number(config.referralDiscountMaxAmount) > 0) codeDiscount = Math.min(codeDiscount, Number(config.referralDiscountMaxAmount));
      appliedCode = normalized;
      codeType = 'referral';
    }
  }

  // Keep a payable amount for Razorpay; discount and points can never produce a
  // negative or zero gateway order. The backend remains the only price authority.
  const rate = Math.max(0, Number(config.rupeesPerSubscriptionPoint) || 0);
  const totals = calculateTotals({ listPrice, codeDiscount, pointsRequested, pointsRate: rate });
  codeDiscount = totals.codeDiscount;

  return {
    planId: plan._id,
    planName: plan.name,
    planType,
    listPrice,
    originalPrice: Number(plan.originalPrice) > listPrice ? Number(plan.originalPrice) : listPrice,
    code: appliedCode,
    codeType,
    discountCodeId,
    codeDiscount,
    pointsAvailable,
    pointsRequested,
    pointsRedeemed: totals.pointsRedeemed,
    pointsDiscount: totals.pointsDiscount,
    pointsConversionRate: rate,
    finalAmount: totals.finalAmount,
    currency: 'INR'
  };
};

module.exports = { quoteSubscription };
