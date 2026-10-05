const mongoose = require('mongoose');

const itinerarySchema = new mongoose.Schema({
  day: { type: Number, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  meals: [{ type: String }],
  overnight: { type: String, default: '' }
}, { _id: false });

const tourSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  destination: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  durationDays: {
    type: Number,
    required: true,
    min: 1
  },
  durationNights: {
    type: Number,
    required: true,
    min: 0
  },
  price: {
    adult: { type: Number, required: true, min: 0 },
    child: { type: Number, default: 0, min: 0 },
    surcharge: { type: Number, default: 0, min: 0 }
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'departing', 'completed', 'cancelled'],
    default: 'draft'
  },
  departureDate: {
    type: Date
  },
  returnDate: {
    type: Date
  },
  maxGuests: {
    type: Number,
    default: 30
  },
  estimatedCost: {
    type: Number,
    default: 0,
    min: 0
  },
  actualCost: {
    type: Number,
    default: 0,
    min: 0
  },
  itinerary: [itinerarySchema],
  includes: [{ type: String }],
  excludes: [{ type: String }],
  images: [{ type: String }],
  saleInCharge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  websiteSource: {
    tourId: { type: Number },
    slug: { type: String },
    documentUrl: { type: String, default: '' },
    isInternational: { type: Boolean, default: false },
    infantPrice: { type: Number, default: 0 },
    promotionPrice: { type: Number, default: 0 },
    thumbnail: { type: String, default: '' },
    snapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
    departures: { type: [mongoose.Schema.Types.Mixed], default: [] },
    lastSyncedAt: { type: Date }
  }
}, {
  timestamps: true
});

// Virtual: số khách đã đặt (sẽ tính từ bookings)
tourSchema.virtual('currentGuests', {
  ref: 'Booking',
  localField: '_id',
  foreignField: 'tour',
  count: false
});

// Index cho tìm kiếm
tourSchema.index({ name: 'text', destination: 'text' });
tourSchema.index({ status: 1, departureDate: 1 });
tourSchema.index({ 'websiteSource.tourId': 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Tour', tourSchema);
