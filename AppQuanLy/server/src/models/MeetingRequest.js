const mongoose = require('mongoose');

const meetingRequestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  room: {
    type: String,
    required: true,
    trim: true,
    default: 'Phòng họp T5'
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  purpose: {
    type: String,
    required: true,
    trim: true
  },
  meetingWithDirector: {
    type: Boolean,
    default: false
  },
  departments: [{
    type: String,
    trim: true
  }],
  attendeesNote: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  rejectionReason: {
    type: String,
    trim: true,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  }
}, {
  timestamps: true
});

meetingRequestSchema.index({ room: 1, startTime: 1, endTime: 1, status: 1 });
meetingRequestSchema.index({ createdBy: 1, createdAt: -1 });
meetingRequestSchema.index({ departments: 1, startTime: 1 });

module.exports = mongoose.model('MeetingRequest', meetingRequestSchema);
