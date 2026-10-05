const mongoose = require('mongoose');

const ticketCommentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ticketSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['software', 'hardware', 'network', 'account', 'design', 'data', 'other'],
    default: 'other'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'assigned', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requesterDepartment: {
    type: String,
    required: true
  },
  targetDepartment: {
    type: String,
    required: true
  },
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  comments: [ticketCommentSchema],
  resolvedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

ticketSchema.index({ status: 1, targetDepartment: 1 });
ticketSchema.index({ requester: 1 });
ticketSchema.index({ assignee: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);
