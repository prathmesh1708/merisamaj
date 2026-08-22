const Donation = require('../models/Donation');
const User = require('../models/User');
const { handleDonationPayment } = require('../utils/paymentHandler');
const { notifyDonationReceived, notifyDonationReceipt } = require('../services/notificationService');
const { applyScopeFilter } = require('../utils/queryScopeHelper');

const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /member/donations — Server-side filtered to status: "Active", isDeleted: false, and scoped by Community/City
exports.getActiveDonations = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 10 } = req.query;
    let filter = {
      status: 'Active',
      isDeleted: false
    };

    if (category && category !== 'all' && category !== 'All') {
      const cleanCat = escapeRegex(category.trim());
      filter.category = { $regex: cleanCat, $options: 'i' };
    }

    if (search && search.trim()) {
      const cleanSearch = search.trim();
      const escaped = escapeRegex(cleanSearch);
      filter.$or = [
        { title: new RegExp(`^${escaped}`, 'i') },
        { title: new RegExp(escaped, 'i') }
      ];
    }

    // Apply Centralized 2-Level Multi-Tenancy Scope (Community mandatory + City optional)
    filter = applyScopeFilter(req, filter);

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Use .select() to exclude heavy nested arrays (recentDonations) and description from grid listing payload
    // Use .lean() to bypass Mongoose hydration overhead
    const donations = await Donation.find(filter)
      .select('-recentDonations -description')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const totalCount = await Donation.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: donations,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        hasMore: skip + donations.length < totalCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /member/donations/:id — Get single donation details (Community Scoped)
exports.getDonationById = async (req, res) => {
  try {
    const filter = applyScopeFilter(req, { _id: req.params.id, isDeleted: false });
    const donation = await Donation.findOne(filter).lean();

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation campaign not found or access denied' });
    }

    res.status(200).json({
      success: true,
      data: donation
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /member/donations/:id/donate — Donate to campaign (Community Scoped)
exports.donate = async (req, res) => {
  try {
    const { amount, donorName } = req.body;
    const donationId = req.params.id;

    const filter = applyScopeFilter(req, { _id: donationId, status: 'Active', isDeleted: false });
    const donation = await Donation.findOne(filter);

    if (!donation) {
      return res.status(400).json({ success: false, message: 'Donation campaign is closed, inactive, or belongs to another community' });
    }

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid donation amount' });
    }

    const name = donorName && donorName.trim() ? donorName.trim() : (req.user?.name || 'Anonymous');

    // Trigger payment handler pipeline
    const paymentResult = await handleDonationPayment(donationId, parsedAmount, { donorName: name, userId: req.user?._id });

    // Atomically update raisedAmount, donorCount, and push to recentDonations
    const updatedDonation = await Donation.findByIdAndUpdate(
      donationId,
      {
        $inc: { raisedAmount: parsedAmount, donorCount: 1 },
        $push: {
          recentDonations: {
            $each: [{
              donorName: name,
              amount: parsedAmount,
              date: new Date(),
              paymentStatus: paymentResult.paymentStatus || 'success'
            }],
            $position: 0,
            $slice: 50 // Keep top 50 recent donors
          }
        }
      },
      { new: true }
    );

    // ── Non-critical notifications ──────────────────────────────────────────
    try {
      // Find the community head (if this campaign belongs to a community)
      // The simple Donation model doesn't store communityId, so we skip head lookup
      // and notify only admins + the donor.
      const adminIds = await User.find({ role: 'admin' }).distinct('_id');
      await notifyDonationReceived(
        null,       // headId — not available from this model; override below if needed
        adminIds,
        name,
        parsedAmount,
        updatedDonation.title,
        updatedDonation._id
      );
      if (req.user?._id) {
        await notifyDonationReceipt(req.user._id, parsedAmount, updatedDonation.title, updatedDonation._id);
      }
    } catch (notifyErr) {
      console.warn('[Notify] Donation notifications failed:', notifyErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Donation processed successfully',
      payment: paymentResult,
      data: updatedDonation
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
