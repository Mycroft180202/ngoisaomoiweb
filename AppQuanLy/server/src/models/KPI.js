const mongoose = require('mongoose');

const kpiSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  month: {
    type: String, // YYYY-MM
    required: true
  },
  taskScore: {
    type: Number, // Điểm hoàn thành công việc (0 - 100)
    default: 80
  },
  revenueScore: {
    type: Number, // Điểm doanh số / hỗ trợ (0 - 100)
    default: 80
  },
  disciplineScore: {
    type: Number, // Điểm chuyên cần (0 - 100)
    default: 100
  },
  managerReview: {
    type: String,
    default: 'Hoàn thành tốt công việc trong tháng'
  },
  evaluatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

kpiSchema.index({ user: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('KPI', kpiSchema);
