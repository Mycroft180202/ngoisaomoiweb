const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String, // Định dạng YYYY-MM-DD
    required: true
  },
  checkIn: {
    type: Date,
    default: null
  },
  checkOut: {
    type: Date
  },
  workHours: {
    type: Number, // Số giờ làm việc trong ngày
    default: 0
  },
  overtimeHours: {
    type: Number, // Số giờ tăng ca trong ngày
    default: 0
  },
  overtimeApproved: {
    type: Boolean, // Chỉ tính tăng ca khi quản lý xác nhận cho bản ghi
    default: false
  },
  status: {
    type: String,
    enum: ['present', 'late', 'half_day', 'missing_checkout', 'leave', 'holiday', 'company_trip', 'off_day'],
    default: 'present'
  },
  note: {
    type: String,
    default: ''
  },
  proofUrl: {
    type: String, // Legacy - Link bằng chứng duyệt nghỉ phép
    default: ''
  },
  evidences: [{
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileType: { type: String, enum: ['image', 'pdf', 'doc', 'other'], default: 'other' },
    fileSize: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }]
}, {
  timestamps: true
});

attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
