const mongoose = require('mongoose');

const approvalStepSchema = new mongoose.Schema({
  stepOrder: {
    type: Number,
    required: true
  },
  roleRequired: {
    type: String,
    required: true,
    enum: ['manager', 'director']
  },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'returned'],
    default: 'pending'
  },
  note: {
    type: String,
    default: ''
  },
  reviewedAt: {
    type: Date
  }
});

const approvalSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  type: {
    type: String,
    required: true,
    enum: ['expense', 'leave', 'travel', 'purchase', 'partnership', 'other']
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    default: ''
  },
  amount: {
    type: Number,
    default: 0,
    min: 0
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  department: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'pending_manager', 'pending_director', 'approved', 'rejected', 'returned'],
    default: 'draft'
  },
  approvalFlow: [approvalStepSchema],
  attachments: [{
    name: { type: String },
    url: { type: String }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

approvalSchema.index({ status: 1, department: 1 });
approvalSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Approval', approvalSchema);
