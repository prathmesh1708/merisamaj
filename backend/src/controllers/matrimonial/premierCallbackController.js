const PremierCallbackRequest = require('../../models/PremierCallbackRequest');
const User = require('../../models/User');
const { getActiveSubscription } = require('../../middleware/subscriptionMiddleware');
const { createNotification } = require('../../services/notificationService');

exports.submitRequest = async (req, res) => {
  try {
    const existing = await PremierCallbackRequest.findOne({
      userId: req.user._id,
      status: { $in: ['pending', 'contacted'] }
    });
    if (existing) {
      return res.json({ status: 'success', message: 'You already have an open Premier callback request.', data: { request: existing, alreadySubmitted: true } });
    }

    const [user, subscription] = await Promise.all([
      User.findById(req.user._id).select('name phone email city community').lean(),
      getActiveSubscription(req.user._id)
    ]);
    if (!user) return res.status(404).json({ status: 'error', message: 'Member account not found.' });

    const request = await PremierCallbackRequest.create({
      userId: user._id,
      name: user.name,
      phone: user.phone || '',
      email: user.email || '',
      city: user.city || '',
      community: user.community || '',
      currentPlanName: subscription?.planName || 'Free',
      currentPlanEndDate: subscription?.endDate || null
    });

    const admins = await User.find({ role: { $in: ['admin', 'admin_sub_head'] }, isBlocked: { $ne: true } }).select('_id').lean();
    await Promise.all(admins.map(admin => createNotification({
      userId: admin._id,
      module: 'matrimonial',
      type: 'premier_callback_request',
      title: 'New Premier callback request',
      message: `${user.name} requested a Premier Matchmaking callback.`,
      icon: '📞',
      priority: 'high',
      actionUrl: '/admin/subscriptions?tab=premier-requests',
      referenceId: request._id,
      referenceType: 'PremierCallbackRequest'
    })));

    return res.status(201).json({ status: 'success', message: 'Your callback request has been sent to the admin team.', data: { request } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.listRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const query = status && status !== 'all' ? { status } : {};
    const requests = await PremierCallbackRequest.find(query)
      .populate('userId', 'name phone email city community')
      .populate('handledBy', 'name')
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ status: 'success', data: { requests } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.updateRequest = async (req, res) => {
  try {
    const { status, adminNote = '' } = req.body;
    if (!['pending', 'contacted', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Invalid request status.' });
    }
    const request = await PremierCallbackRequest.findByIdAndUpdate(
      req.params.id,
      { $set: { status, adminNote: String(adminNote).slice(0, 2000), handledBy: req.user._id, handledAt: new Date() } },
      { new: true, runValidators: true }
    ).populate('userId', 'name phone email city community').populate('handledBy', 'name');
    if (!request) return res.status(404).json({ status: 'error', message: 'Callback request not found.' });
    return res.json({ status: 'success', message: 'Request updated.', data: { request } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
