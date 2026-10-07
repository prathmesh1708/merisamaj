const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name:          { type: String, required: true, unique: true, trim: true },
    description:   { type: String },
    price:         { type: Number, required: true },           // In INR (0 for Free)
    durationInDays:{ type: Number, required: true },           // 0 for perpetual Free plan
    displayOrder:  { type: Number, default: 0 },               // For UI ordering
    isActive:      { type: Boolean, default: true },
    isFeatured:    { type: Boolean, default: false },          // Highlighted in UI
    originalPrice: { 
      type: Number, 
      default: null,
      validate: {
        validator: function(v) {
          if (v == null) return true;
          // In an update query, `this` might not be the document. We skip validation if `this.price` is undefined.
          if (this.price === undefined) return true;
          return v >= this.price;
        },
        message: 'Original price must be greater than or equal to the current price.'
      }
    },
    badge: { 
      type: String, 
      default: '', 
      maxlength: [40, 'Badge text cannot exceed 40 characters'],
      trim: true
    },
    themeColor: { 
      type: String, 
      default: '#f43f5e',
      validate: {
        validator: function(v) {
          if (!v) return true;
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message: 'Theme color must be a valid HEX code (e.g., #f43f5e).'
      }
    },

    // ─── Numerical Feature Limits (-1 = unlimited) ─────────────────────────
    features: {
      profileViewsPerDay:     { type: Number, default: 10 },   // -1 = unlimited
      interestLimit:          { type: Number, default: 5 },    // Per month; -1 = unlimited
      messageLimit:           { type: Number, default: -1 },   // -1 = unlimited
      advancedFilters:        { type: Boolean, default: false },
      visitorHistory:         { type: Boolean, default: false },
      chat:                   { type: Boolean, default: false },
      profileBoosts:          { type: Number, default: 0 },    // Per month
      highlightProfile:       { type: Boolean, default: false },
      priorityListing:        { type: Boolean, default: false },
      contactDetailsAccess:   { type: Boolean, default: false }, // After acceptance
      unlimitedShortlist:     { type: Boolean, default: false },
      readReceipts:           { type: Boolean, default: false },
      profileBadge:           { type: Boolean, default: false }, // Premium badge in search
      crossCommunityVisibility: { type: Boolean, default: false }, // See/be seen by other communities' profiles
      communityFilter:        { type: Boolean, default: false }  // Community & sub-community filter on matches
    },

    // ─── Audit ───────────────────────────────────────────────────────────────
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
