const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  fileUrl: {
    type: String,
    default: ''
  },
  fileType: {
    type: String,
    enum: ['pdf', 'doc', 'excel', 'image', 'marketing_report', 'text', 'other'],
    default: 'other'
  },
  fileSize: {
    type: String,
    default: '0 KB'
  },
  originalName: {
    type: String,
    trim: true,
    default: ''
  },
  storagePath: {
    type: String,
    default: ''
  },
  mimeType: {
    type: String,
    default: ''
  },
  folder: {
    type: String,
    trim: true,
    default: 'Tài liệu chung'
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  content: {
    type: String,
    trim: true,
    default: ''
  },
  department: {
    type: String,
    default: 'all'
  },
  departments: [{
    type: String,
    trim: true
  }],
  visibility: {
    type: String,
    enum: ['private', 'shared'],
    default: 'shared'
  },
  approvalStatus: {
    type: String,
    enum: ['draft_private', 'pending', 'approved', 'rejected'],
    default: 'approved'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true,
    default: ''
  },
  sourceType: {
    type: String,
    enum: ['manual', 'marketing_report'],
    default: 'manual'
  },
  sourceRef: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'sourceModel'
  },
  sourceModel: {
    type: String,
    enum: ['MarketingCampaignReport'],
    default: undefined
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

documentSchema.index({ department: 1, createdAt: -1 });
documentSchema.index({ departments: 1, createdAt: -1 });
documentSchema.index({ folder: 1, createdAt: -1 });
documentSchema.index({ sourceType: 1, sourceRef: 1 });
documentSchema.index({ approvalStatus: 1, department: 1, createdAt: -1 });
documentSchema.index({ uploadedBy: 1, visibility: 1, createdAt: -1 });

module.exports = mongoose.model('Document', documentSchema);
