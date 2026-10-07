const mongoose = require('mongoose');

const routeSegmentSchema = new mongoose.Schema({
  routeSchedule: { type: mongoose.Schema.Types.ObjectId, ref: 'RouteSchedule' },
  serviceCode: { type: String, uppercase: true, trim: true },
  originStopCode: { type: String, uppercase: true, trim: true },
  destinationStopCode: { type: String, uppercase: true, trim: true },
  runDate: Date
}, { _id: false });

const stopSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['departure', 'pickup', 'dropoff', 'visit', 'rest', 'hotel', 'meal'],
    default: 'visit'
  },
  name: { type: String, required: true, trim: true },
  address: { type: String, trim: true, default: '' },
  placeId: { type: String, trim: true, default: '' },
  plannedTime: { type: String, trim: true, default: '' },
  latitude: { type: Number, min: -90, max: 90 },
  longitude: { type: Number, min: -180, max: 180 },
  note: { type: String, trim: true, default: '' },
  order: { type: Number, default: 0 }
});

const itineraryDaySchema = new mongoose.Schema({
  day: { type: Number, required: true, min: 1 },
  date: { type: Date },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  stops: [stopSchema]
});

const assignedVehicleSchema = new mongoose.Schema({
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  driverName: { type: String, trim: true, default: '' },
  driverPhone: { type: String, trim: true, default: '' },
  note: { type: String, trim: true, default: '' }
});

const assignedGuideSchema = new mongoose.Schema({
  guide: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['lead', 'assistant'], default: 'lead' },
  startAt: { type: Date },
  endAt: { type: Date },
  fee: { type: Number, min: 0, default: 0 },
  allowance: { type: Number, min: 0, default: 0 },
  note: { type: String, trim: true, default: '' }
});

const passengerSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  sourceTour: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour' },
  fullName: { type: String, required: true, trim: true },
  phone: { type: String, trim: true, default: '' },
  idNumber: { type: String, trim: true, default: '' },
  passengerType: { type: String, enum: ['adult', 'child'], default: 'adult' },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  seatNumber: { type: String, trim: true, default: '' },
  pickupStopId: { type: mongoose.Schema.Types.ObjectId },
  dropoffStopId: { type: mongoose.Schema.Types.ObjectId },
  pickupNote: { type: String, trim: true, default: '' },
  dropoffNote: { type: String, trim: true, default: '' },
  allocationStatus: {
    type: String,
    enum: ['hold', 'confirmed', 'cancelled'],
    default: 'confirmed'
  },
  holdExpiresAt: Date,
  boardedAt: Date,
  droppedOffAt: Date,
  status: {
    type: String,
    enum: ['waiting', 'boarded', 'absent', 'completed'],
    default: 'waiting'
  }
});

const programDocumentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  originalName: { type: String, required: true, trim: true },
  storedName: { type: String, required: true },
  mimeType: { type: String, default: 'application/pdf' },
  size: { type: Number, required: true, min: 1 },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedAt: { type: Date, default: Date.now }
});

const attendanceRecordSchema = new mongoose.Schema({
  passengerId: { type: mongoose.Schema.Types.ObjectId, required: true },
  fullName: { type: String, required: true, trim: true },
  seatNumber: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['pending', 'present', 'missing', 'excused'], default: 'pending' },
  note: { type: String, trim: true, default: '' },
  checkedAt: Date,
  checkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const attendanceSessionSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  type: { type: String, enum: ['departure', 'after_stop', 'segment', 'arrival', 'custom'], default: 'custom' },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  day: { type: Number, min: 1 },
  stopId: { type: mongoose.Schema.Types.ObjectId },
  fromStopId: { type: mongoose.Schema.Types.ObjectId },
  toStopId: { type: mongoose.Schema.Types.ObjectId },
  scheduledAt: Date,
  note: { type: String, trim: true, default: '' },
  records: [attendanceRecordSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

const tourDepartureSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  tour: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour', required: true },
  routeSegment: { type: routeSegmentSchema, default: undefined },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  departureTime: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, default: '00:00' },
  returnTime: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, default: '23:59' },
  operationalStartAt: { type: Date },
  operationalEndAt: { type: Date },
  actualStartAt: { type: Date },
  actualEndAt: { type: Date },
  status: {
    type: String,
    enum: ['planning', 'open', 'confirmed', 'departing', 'completed', 'cancelled'],
    default: 'planning'
  },
  departurePoint: { type: String, trim: true, default: '' },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedVehicles: [assignedVehicleSchema],
  assignedGuides: [assignedGuideSchema],
  itineraryDays: [itineraryDaySchema],
  passengers: [passengerSchema],
  attendanceSessions: [attendanceSessionSchema],
  programDocuments: [programDocumentSchema],
  publicAccess: {
    token: { type: String, unique: true, sparse: true },
    enabled: { type: Boolean, default: false },
    createdAt: Date
  },
  liveLocation: {
    latitude: Number,
    longitude: Number,
    accuracy: Number,
    updatedAt: Date,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  publicProgress: {
    currentDay: { type: Number, min: 1 },
    nextStopId: { type: mongoose.Schema.Types.ObjectId },
    updatedAt: Date,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  note: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true, optimisticConcurrency: true });

tourDepartureSchema.index({ tour: 1, startDate: 1 });
tourDepartureSchema.index({ 'assignedVehicles.vehicle': 1, startDate: 1, endDate: 1, status: 1 });
tourDepartureSchema.index({ 'assignedGuides.guide': 1, startDate: 1, endDate: 1, status: 1 });

module.exports = mongoose.model('TourDeparture', tourDepartureSchema);
