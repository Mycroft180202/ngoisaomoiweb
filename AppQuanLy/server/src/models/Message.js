const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  channel: {
    type: String, // 'general' | 'department' | 'direct'
    default: 'general'
  },
  department: {
    type: String
  },
  content: {
    type: String,
    trim: true,
    default: ''
  },
  attachments: [{
    originalName: { type: String, trim: true, default: '' },
    storagePath: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    size: { type: Number, default: 0 }
  }],
  readBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }],
  archivedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

messageSchema.index({ channel: 1, createdAt: 1 });
messageSchema.index({ sender: 1, receiver: 1 });
messageSchema.index({ receiver: 1, createdAt: -1 });
messageSchema.index({ department: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
