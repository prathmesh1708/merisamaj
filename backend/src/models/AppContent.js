const mongoose = require('mongoose');

const exclusiveFeatureSchema = new mongoose.Schema({
  id: { type: String, required: true },
  label: { type: String, required: true, trim: true },
  desc: { type: String, default: '', trim: true },
  path: { type: String, required: true, default: '/member/directory' },
  state: { type: mongoose.Schema.Types.Mixed, default: null },
  icon: { type: String, default: 'Briefcase' },
  bgImage: { 
    type: String, 
    default: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=600&q=80' 
  },
  displayOrder: { type: Number, default: 0 },
  enabled: { type: Boolean, default: true }
}, { _id: false });

const successStorySchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true, trim: true },
  tag: { type: String, default: 'Featured Match', trim: true },
  quote: { type: String, default: '', trim: true },
  shortDescription: { type: String, default: '', trim: true },
  coverImage: { 
    type: String, 
    default: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80' 
  },
  weddingDate: { type: String, default: '2024' },
  groomName: { type: String, default: '' },
  brideName: { type: String, default: '' },
  featured: { type: Boolean, default: false },
  displayOrder: { type: Number, default: 0 },
  enabled: { type: Boolean, default: true }
}, { _id: false });

const committeeMemberSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  role: { type: String, default: 'Executive Member', trim: true },
  designation: { type: String, default: 'Executive Member', trim: true },
  avatar: { 
    type: String, 
    default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80' 
  },
  phone: { type: String, default: '' },
  city: { type: String, default: 'Indore' },
  displayOrder: { type: Number, default: 0 },
  enabled: { type: Boolean, default: true }
}, { _id: false });

const appContentSchema = new mongoose.Schema({
  communityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    required: true,
    unique: true,
    index: true
  },
  heroBanner: {
    backgroundImage: {
      type: String,
      default: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1200&q=80'
    },
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    buttonText: { type: String, default: '' },
    buttonLink: { type: String, default: '/member/directory' },
    enabled: { type: Boolean, default: true }
  },
  exclusiveFeatures: {
    type: [exclusiveFeatureSchema],
    default: []
  },
  successStories: {
    type: [successStorySchema],
    default: []
  },
  coreMembers: {
    communityHead: {
      name: { type: String, default: 'Dr. Rajesh Agrawal' },
      role: { type: String, default: 'Community Head (President)' },
      designation: { type: String, default: 'Community Head (President)' },
      avatar: { 
        type: String, 
        default: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=800&q=80' 
      },
      city: { type: String, default: 'Indore' },
      state: { type: String, default: 'Madhya Pradesh' },
      phone: { type: String, default: '+91 98260 12345' },
      termYears: { type: String, default: '2024-2027' },
      enabled: { type: Boolean, default: true }
    },
    committee: {
      type: [committeeMemberSchema],
      default: []
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('AppContent', appContentSchema);
