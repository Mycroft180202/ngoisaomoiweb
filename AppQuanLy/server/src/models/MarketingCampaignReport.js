const mongoose = require('mongoose');

const campaignRowSchema = new mongoose.Schema({
  reportStart: { type: Date },
  reportEnd: { type: Date },
  campaignName: { type: String, trim: true, default: '' },
  delivery: { type: String, trim: true, default: '' },
  spend: { type: Number, default: 0 },
  reach: { type: Number, default: 0 },
  impressions: { type: Number, default: 0 },
  results: { type: Number, default: 0 },
  resultIndicator: { type: String, trim: true, default: '' },
  costPerResult: { type: Number, default: 0 },
  messagingConversations: { type: Number, default: 0 },
  costPerMessagingConversation: { type: Number, default: 0 },
  messagingContacts: { type: Number, default: 0 },
  newMessagingContacts: { type: Number, default: 0 },
  returningMessagingConnections: { type: Number, default: 0 },
  purchases: { type: Number, default: 0 },
  costPerPurchase: { type: Number, default: 0 },
  purchaseRoas: { type: Number, default: 0 }
}, { _id: false });

const marketingCampaignReportSchema = new mongoose.Schema({
  fileName: { type: String, trim: true, default: '' },
  reportStart: { type: Date },
  reportEnd: { type: Date },
  rowCount: { type: Number, default: 0 },
  totals: {
    spend: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    results: { type: Number, default: 0 },
    messagingConversations: { type: Number, default: 0 },
    messagingContacts: { type: Number, default: 0 },
    newMessagingContacts: { type: Number, default: 0 },
    purchases: { type: Number, default: 0 }
  },
  rows: [campaignRowSchema],
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

marketingCampaignReportSchema.index({ createdAt: -1 });
marketingCampaignReportSchema.index({ uploadedBy: 1, createdAt: -1 });

module.exports = mongoose.model('MarketingCampaignReport', marketingCampaignReportSchema);
