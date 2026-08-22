const mongoose = require('mongoose');

const appShortcutSchema = new mongoose.Schema({
  key: {
    type: String,
    required: [true, 'Shortcut key is required'],
    unique: true,
    trim: true,
    lowercase: true,
  },
  title: {
    type: String,
    required: [true, 'Shortcut title is required'],
    trim: true,
    maxlength: 30,
  },
  subtitle: {
    type: String,
    required: [true, 'Shortcut subtitle is required'],
    trim: true,
    maxlength: 60,
  },
  iconType: {
    type: String,
    enum: ['preset', 'custom_upload'],
    default: 'preset',
  },
  presetIconKey: {
    type: String,
    enum: ['invitations', 'contributions', 'obituary', 'matrimonial', 'events', 'leadership', 'directory', 'custom'],
    default: 'invitations',
  },
  customIconUrl: {
    type: String,
    default: '',
  },
  targetRoute: {
    type: String,
    required: [true, 'Target navigation route is required'],
    trim: true,
  },
  badgeType: {
    type: String,
    enum: ['dynamic_count', 'manual', 'none'],
    default: 'dynamic_count',
  },
  manualBadgeCount: {
    type: Number,
    default: 0,
  },
  order: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Default initial shortcuts seeder helper
appShortcutSchema.statics.seedDefaultsIfEmpty = async function() {
  const count = await this.countDocuments();
  if (count === 0) {
    const defaults = [
      {
        key: 'invitations',
        title: 'Invitations',
        subtitle: 'View new invites',
        iconType: 'preset',
        presetIconKey: 'invitations',
        customIconUrl: '',
        targetRoute: '/member/invitations',
        badgeType: 'dynamic_count',
        order: 1,
        isActive: true,
      },
      {
        key: 'contributions',
        title: 'Contributions',
        subtitle: 'Support the Samaj',
        iconType: 'preset',
        presetIconKey: 'contributions',
        customIconUrl: '',
        targetRoute: '/member/donation',
        badgeType: 'dynamic_count',
        order: 2,
        isActive: true,
      },
      {
        key: 'obituary',
        title: 'Obituary',
        subtitle: 'Heartfelt tributes',
        iconType: 'preset',
        presetIconKey: 'obituary',
        customIconUrl: '',
        targetRoute: '/member/shradhanjali',
        badgeType: 'dynamic_count',
        order: 3,
        isActive: true,
      },
    ];
    await this.insertMany(defaults);
    console.log('[AppShortcut] Default shortcut cards seeded.');
  }
};

module.exports = mongoose.model('AppShortcut', appShortcutSchema);
