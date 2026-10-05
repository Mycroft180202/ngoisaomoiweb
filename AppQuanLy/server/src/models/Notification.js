const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['task', 'approval', 'tour', 'booking', 'ticket', 'system'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  link: {
    type: String,
    default: ''
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

// Middleware để gửi sự kiện real-time sau khi lưu thông báo mới
notificationSchema.post('save', function(doc) {
  if (global.io && doc.user) {
    global.io.to(doc.user.toString()).emit('new_notification', doc);
  }
});

notificationSchema.post('insertMany', function(docs) {
  if (global.io && Array.isArray(docs)) {
    docs.forEach(doc => {
      if (doc.user) {
        global.io.to(doc.user.toString()).emit('new_notification', doc);
      }
    });
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
