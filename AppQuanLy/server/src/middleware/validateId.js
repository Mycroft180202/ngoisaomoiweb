const mongoose = require('mongoose');

/**
 * Middleware kiểm tra tham số :id có phải ObjectId hợp lệ không
 * Tránh lỗi CastError 500 khi truyền id sai định dạng
 */
const validateId = (req, res, next) => {
  const { id } = req.params;
  if (id && !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'ID không hợp lệ' });
  }
  next();
};

module.exports = validateId;
