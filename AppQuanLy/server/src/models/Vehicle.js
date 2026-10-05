const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  carrier: { type: mongoose.Schema.Types.ObjectId, ref: 'Carrier', required: true },
  plateNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, trim: true, default: '' },
  vehicleType: { type: String, trim: true, default: 'Xe du lịch' },
  seatCapacity: { type: Number, required: true, min: 1 },
  driverName: { type: String, trim: true, default: '' },
  driverPhone: { type: String, trim: true, default: '' },
  note: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['active', 'maintenance', 'inactive'], default: 'active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

vehicleSchema.index({ carrier: 1, status: 1 });

module.exports = mongoose.model('Vehicle', vehicleSchema);
