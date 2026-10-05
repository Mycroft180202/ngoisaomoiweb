const mongoose = require('mongoose');

/**
 * Tạo mã tự động với cơ chế chống trùng (race condition safe)
 * Sử dụng atomic counter trong collection riêng
 * 
 * @param {string} prefix - Tiền tố mã (VD: 'TASK', 'TK', 'BK', 'APR')
 * @param {number} padLength - Số chữ số tối thiểu (VD: 3 → '001')
 * @returns {Promise<string>} Mã duy nhất (VD: 'TASK-042')
 */

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // prefix name
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', counterSchema);

async function generateCode(prefix, padLength = 3) {
  const counter = await Counter.findByIdAndUpdate(
    prefix,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `${prefix}-${String(counter.seq).padStart(padLength, '0')}`;
}

module.exports = { generateCode, Counter };
