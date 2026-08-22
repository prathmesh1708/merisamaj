const AppShortcut = require('../models/AppShortcut');
const Invitation = require('../models/Invitation');
const Donation = require('../models/Donation');
const Obituary = require('../models/Obituary');

// Helper to seed defaults if DB is empty
const ensureDefaults = async () => {
  await AppShortcut.seedDefaultsIfEmpty();
};

/**
 * @desc   Get active shortcuts for Member Home (Public/Member)
 * @route  GET /api/v1/app-shortcuts
 * @access Public / Member
 */
exports.getPublicShortcuts = async (req, res) => {
  try {
    await ensureDefaults();

    const shortcuts = await AppShortcut.find({ isActive: true }).sort({ order: 1, createdAt: 1 }).lean();

    // Dynamically calculate badge counts if relevant
    let invitationCount = 0;
    let donationCount = 0;
    let obituaryCount = 0;

    try {
      if (Invitation) {
        invitationCount = await Invitation.countDocuments({ status: { $ne: 'cancelled' } }).limit(50);
      }
    } catch (e) {}

    try {
      if (Donation) {
        donationCount = await Donation.countDocuments({ status: 'completed' }).limit(50);
      }
    } catch (e) {}

    try {
      if (Obituary) {
        obituaryCount = await Obituary.countDocuments({ isApproved: { $ne: false } }).limit(50);
      }
    } catch (e) {}

    const enrichedShortcuts = shortcuts.map(sc => {
      let dynamicCount = 0;
      if (sc.key === 'invitations') dynamicCount = invitationCount;
      else if (sc.key === 'contributions') dynamicCount = donationCount;
      else if (sc.key === 'obituary') dynamicCount = obituaryCount;

      return {
        ...sc,
        badgeCount: sc.badgeType === 'dynamic_count' ? dynamicCount : (sc.badgeType === 'manual' ? sc.manualBadgeCount : 0)
      };
    });

    res.status(200).json({
      success: true,
      count: enrichedShortcuts.length,
      data: enrichedShortcuts
    });
  } catch (error) {
    console.error('Error fetching public app shortcuts:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch shortcuts', error: error.message });
  }
};

/**
 * @desc   Get all shortcuts for Admin Panel management
 * @route  GET /api/v1/admin/shortcuts
 * @access Private (Admin)
 */
exports.getAllAdminShortcuts = async (req, res) => {
  try {
    await ensureDefaults();
    const shortcuts = await AppShortcut.find().sort({ order: 1, createdAt: 1 });

    res.status(200).json({
      success: true,
      count: shortcuts.length,
      data: shortcuts
    });
  } catch (error) {
    console.error('Error fetching admin shortcuts:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch shortcuts', error: error.message });
  }
};

/**
 * @desc   Update shortcut details
 * @route  PUT /api/v1/admin/shortcuts/:id
 * @access Private (Admin)
 */
exports.updateShortcut = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      subtitle,
      targetRoute,
      isActive,
      order,
      presetIconKey,
      iconType,
      customIconUrl,
      badgeType,
      manualBadgeCount
    } = req.body;

    const shortcut = await AppShortcut.findById(id);
    if (!shortcut) {
      return res.status(404).json({ success: false, message: 'Shortcut card not found' });
    }

    if (title !== undefined) shortcut.title = title;
    if (subtitle !== undefined) shortcut.subtitle = subtitle;
    if (targetRoute !== undefined) shortcut.targetRoute = targetRoute;
    if (isActive !== undefined) shortcut.isActive = isActive;
    if (order !== undefined) shortcut.order = Number(order);
    if (presetIconKey !== undefined) shortcut.presetIconKey = presetIconKey;
    if (iconType !== undefined) shortcut.iconType = iconType;
    if (customIconUrl !== undefined) shortcut.customIconUrl = customIconUrl;
    if (badgeType !== undefined) shortcut.badgeType = badgeType;
    if (manualBadgeCount !== undefined) shortcut.manualBadgeCount = Number(manualBadgeCount);

    await shortcut.save();

    res.status(200).json({
      success: true,
      message: 'Shortcut card updated successfully',
      data: shortcut
    });
  } catch (error) {
    console.error('Error updating shortcut:', error);
    res.status(500).json({ success: false, message: 'Failed to update shortcut', error: error.message });
  }
};

/**
 * @desc   Upload custom icon image for a shortcut
 * @route  POST /api/v1/admin/shortcuts/:id/icon
 * @access Private (Admin)
 */
exports.uploadShortcutIcon = async (req, res) => {
  try {
    const { id } = req.params;
    const shortcut = await AppShortcut.findById(id);
    if (!shortcut) {
      return res.status(404).json({ success: false, message: 'Shortcut card not found' });
    }

    let iconUrl = '';

    // Handle Cloudinary upload path or memory buffer fallback
    if (req.file) {
      if (req.file.path && (req.file.path.startsWith('http://') || req.file.path.startsWith('https://'))) {
        iconUrl = req.file.path;
      } else if (req.file.buffer) {
        iconUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      }
    } else if (req.body.iconBase64) {
      iconUrl = req.body.iconBase64;
    }

    if (!iconUrl) {
      return res.status(400).json({ success: false, message: 'No icon file or image data provided' });
    }

    shortcut.customIconUrl = iconUrl;
    shortcut.iconType = 'custom_upload';
    await shortcut.save();

    res.status(200).json({
      success: true,
      message: 'Custom icon uploaded successfully',
      data: shortcut
    });
  } catch (error) {
    console.error('Error uploading shortcut icon:', error);
    res.status(500).json({ success: false, message: 'Failed to upload icon', error: error.message });
  }
};

/**
 * @desc   Reset shortcut icon to default preset
 * @route  POST /api/v1/admin/shortcuts/:id/reset
 * @access Private (Admin)
 */
exports.resetShortcutToPreset = async (req, res) => {
  try {
    const { id } = req.params;
    const shortcut = await AppShortcut.findById(id);
    if (!shortcut) {
      return res.status(404).json({ success: false, message: 'Shortcut card not found' });
    }

    shortcut.customIconUrl = '';
    shortcut.iconType = 'preset';
    await shortcut.save();

    res.status(200).json({
      success: true,
      message: 'Shortcut icon reset to default preset',
      data: shortcut
    });
  } catch (error) {
    console.error('Error resetting shortcut:', error);
    res.status(500).json({ success: false, message: 'Failed to reset shortcut', error: error.message });
  }
};
