const mongoose = require('mongoose');

const routeStopSchema = new mongoose.Schema({
  code: { type: String, required: true, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true },
  address: { type: String, trim: true, default: '' },
  latitude: { type: Number, min: -90, max: 90 },
  longitude: { type: Number, min: -180, max: 180 },
  sequence: { type: Number, required: true, min: 0 }
}, { _id: true });

const routeServiceSchema = new mongoose.Schema({
  code: { type: String, required: true, trim: true, uppercase: true },
  originStopCode: { type: String, required: true, trim: true, uppercase: true },
  destinationStopCode: { type: String, required: true, trim: true, uppercase: true },
  departureTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  arrivalTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  daysOfWeek: { type: [Number], default: [], validate: value => value.every(day => Number.isInteger(day) && day >= 0 && day <= 6) },
  defaultVehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  active: { type: Boolean, default: true }
}, { _id: true });

const routeScheduleSchema = new mongoose.Schema({
  tour: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour', required: true },
  code: { type: String, required: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  timezone: { type: String, default: 'Asia/Ho_Chi_Minh' },
  stops: { type: [routeStopSchema], default: [] },
  services: { type: [routeServiceSchema], default: [] },
  transferMinutes: { type: Number, default: 45, min: 0 },
  autoSuggest: { type: Boolean, default: true },
  active: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

routeScheduleSchema.index({ tour: 1, active: 1 });
routeScheduleSchema.index({ tour: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('RouteSchedule', routeScheduleSchema);
