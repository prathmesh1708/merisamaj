const mongoose = require('mongoose');

/**
 * Atomic sequence generator (one document per sequence name).
 * Used for human-readable IDs like Family ID (MSF-100001) and Member ID (MSM-100001).
 * Always increment via findOneAndUpdate + $inc — never countDocuments()+1,
 * which hands out duplicate IDs under concurrent requests.
 */
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

counterSchema.statics.next = async function (name) {
  const doc = await this.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return doc.seq;
};

module.exports = mongoose.model('Counter', counterSchema);
