const mongoose = require('mongoose');

const journeySegmentSchema = new mongoose.Schema({
  routeSchedule: { type: mongoose.Schema.Types.ObjectId, ref: 'RouteSchedule', required: true },
  serviceCode: { type: String, required: true, uppercase: true, trim: true },
  travelDate: { type: Date, required: true },
  originStopCode: { type: String, required: true, uppercase: true, trim: true },
  destinationStopCode: { type: String, required: true, uppercase: true, trim: true },
  departure: { type: mongoose.Schema.Types.ObjectId, ref: 'TourDeparture' },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  seatNumbers: { type: [String], default: [] },
  status: { type: String, enum: ['suggested', 'assigned', 'boarded', 'completed', 'cancelled'], default: 'suggested' },
  assignmentSource: { type: String, enum: ['schedule', 'manual'], default: 'schedule' },
  transferStatus: { type: String, enum: ['not_required', 'pending', 'ready', 'missed'], default: 'not_required' },
  note: { type: String, default: '' }
}, { _id: true });

const bookingSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  tour: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour',
    required: true
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerPhone: {
    type: String,
    required: true,
    trim: true
  },
  customerEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  adults: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  children: {
    type: Number,
    default: 0,
    min: 0
  },
  infants: { type: Number, default: 0, min: 0 },
  journeySegments: { type: [journeySegmentSchema], default: [] },
  websiteSource: {
    bookingId: { type: Number },
    bookingCode: { type: String },
    departureId: { type: Number },
    departureCode: { type: String },
    departureDate: { type: Date },
    bookingStatus: { type: String, enum: ['pending', 'confirmed', 'cancelled'] },
    paymentStatus: { type: String, enum: ['unpaid', 'pending', 'paid'] },
    discountCode: { type: String },
    discountAmount: { type: Number, default: 0 },
    lastSyncedAt: { type: Date }
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'paid', 'completed', 'cancelled'],
    default: 'pending'
  },
  note: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

bookingSchema.index({ tour: 1, status: 1 });
bookingSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
