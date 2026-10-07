const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, enum: ['vehicle', 'restaurant', 'hotel', 'ticket', 'flight', 'insurance', 'other'], required: true },
  contactName: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  email: { type: String, trim: true, default: '' },
  address: { type: String, trim: true, default: '' },
  bankAccount: { type: String, trim: true, default: '' },
  note: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });
module.exports = mongoose.model('TourSupplier', schema);
