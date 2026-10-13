const mongoose = require('mongoose');

const obituaryCommentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  initials: {
    type: String
  },
  text: {
    type: String,
    required: true
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const obituarySchema = new mongoose.Schema({
  deceasedName: {
    type: String,
    required: true,
    trim: true
  },
  deceasedNameEn: {
    type: String,
    trim: true
  },
  prefix: {
    type: String,
    trim: true
  },
  age: {
    type: Number,
    required: true
  },
  birthDate: {
    type: String
  },
  dateOfPassing: {
    type: String,
    required: true
  },
  funeralDetails: {
    type: {
      type: String,
      trim: true
    },
    date: {
      type: String
    },
    time: {
      type: String
    },
    venue: {
      type: String,
      trim: true
    }
  },
  ceremonies: [{
    type: {
      type: String,
      trim: true
    },
    date: {
      type: String,
      trim: true
    },
    time: {
      type: String,
      trim: true
    },
    venue: {
      type: String,
      trim: true
    }
  }],
  message: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String // URL from Cloudinary
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  relation: {
    type: String,
    trim: true
  },
  /**
   * communityId — PRIMARY community isolation key (ObjectId).
   * Server-set from req.user.communityId on create.
   * @deprecated `community` String field below — will be removed after migration.
   */
  communityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    index: true,
    default: null,
  },
  // @deprecated — use communityId (ObjectId) instead. Not required: many accounts only
  // have communityId, and requiring this text made creating a Shradhanjali fail.
  community: {
    type: String,
    default: '',
    index: true
  },
  haathJodeUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  malaArpanUsers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    count: {
      type: Number,
      default: 0
    }
  }],
  views: {
    type: Number,
    default: 0
  },
  viewedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  shares: {
    type: Number,
    default: 0
  },
  saves: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [obituaryCommentSchema],
  privacy: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  familyContact: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Approved'
  }
}, {
  timestamps: true
});

obituarySchema.index({ communityId: 1, status: 1, createdAt: -1 });
obituarySchema.index({ communityId: 1, creatorId: 1, createdAt: -1 });
obituarySchema.index({ communityId: 1, 'funeralDetails.type': 1, createdAt: -1 });
obituarySchema.index({ deceasedName: 'text', message: 'text' });

const Obituary = mongoose.model('Obituary', obituarySchema);

module.exports = Obituary;
