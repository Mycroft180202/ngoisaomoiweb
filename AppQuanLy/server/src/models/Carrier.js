const mongoose = require('mongoose');

const carrierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  contactName: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  email: { type: String, trim: true, lowercase: true, default: '' },
  address: { type: String, trim: true, default: '' },
  note: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

carrierSchema.index({ name: 1 });

module.exports = mongoose.model('Carrier', carrierSchema);
