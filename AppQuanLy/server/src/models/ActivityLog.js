const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true // e.g. 'CREATE_TASK', 'UPDATE_TASK', 'CHECK_IN', 'CREATE_BOOKING'
  },
  module: {
    type: String,
    required: true // e.g. 'tasks', 'bookings', 'tickets', 'attendance'
  },
  description: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String
  }
}, {
  timestamps: true
});

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ user: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
