const UserSubscription = require('../models/UserSubscription');
const User = require('../models/User');
const DiscountCode = require('../models/DiscountCode');

async function releaseExpiredReservations(now = new Date(), limit = 100) {
  const expired = await UserSubscription.find({ status: 'pending', paymentStatus: 'pending', checkoutExpiresAt: { $lte: now }, reservationReleasedAt: null }).select('_id userId pointsRedeemed couponCodeId').sort({ checkoutExpiresAt: 1 }).limit(limit).lean();
  let released = 0;
  for (const purchase of expired) {
    const closed = await UserSubscription.updateOne({ _id: purchase._id, status: 'pending', paymentStatus: 'pending', reservationReleasedAt: null }, { $set: { status: 'cancelled', paymentStatus: 'cancelled', couponReserved: false, reservationReleasedAt: now } });
    if (!closed.modifiedCount) continue;
    if (purchase.pointsRedeemed) await User.updateOne({ _id: purchase.userId, pointsReserved: { $gte: purchase.pointsRedeemed } }, { $inc: { pointsReserved: -purchase.pointsRedeemed } });
    if (purchase.couponCodeId) await DiscountCode.updateOne({ _id: purchase.couponCodeId, reservedCount: { $gt: 0 } }, { $inc: { reservedCount: -1 } });
    released++;
  }
  return released;
}

module.exports = { releaseExpiredReservations };
