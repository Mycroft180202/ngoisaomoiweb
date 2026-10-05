const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },
  address: {
    type: String,
    default: ''
  },
  passportNumber: {
    type: String,
    default: ''
  },
  passportExpiry: {
    type: Date
  },
  source: {
    type: String,
    enum: ['facebook', 'zalo', 'website', 'referral', 'direct', 'other'],
    default: 'direct'
  },
  status: {
    type: String,
    enum: ['potential', 'booked', 'vip', 'blacklisted'],
    default: 'potential'
  },
  notes: {
    type: String,
    default: ''
  },
  nextContactDate: {
    type: Date
  },
  nextContactNote: {
    type: String,
    default: ''
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  contactHistory: [{
    contactDate: { type: Date, default: Date.now },
    note: { type: String, required: true },
    contactedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

customerSchema.index({ name: 'text', phone: 'text', email: 'text' });

module.exports = mongoose.model('Customer', customerSchema);
