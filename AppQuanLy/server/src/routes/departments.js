const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const { requireITOrDirector } = require('../middleware/rbac');

/**
 * GET /api/departments
 * Danh sách phòng ban
 */
router.get('/', async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 });
    res.json({ departments });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * POST /api/departments
 * Thêm phòng ban mới (Director, IT)
 */
router.post('/', requireITOrDirector(), async (req, res) => {
  try {
    const { key, name, description } = req.body;

    if (!key || !name) {
      return res.status(400).json({ error: 'Vui lòng nhập mã và tên phòng ban' });
    }

    const trimmedKey = key.trim().toLowerCase();

    // Check if key already exists
    const existing = await Department.findOne({ key: trimmedKey });
    if (existing) {
      return res.status(400).json({ error: 'Mã phòng ban đã tồn tại' });
    }

    const dept = new Department({
      key: trimmedKey,
      name: name.trim(),
      description: description || ''
    });

    await dept.save();
    res.status(201).json({ department: dept, message: 'Thêm phòng ban thành công' });
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * PUT /api/departments/:id
 * Cập nhật phòng ban (Director, IT)
 */
router.put('/:id', requireITOrDirector(), async (req, res) => {
  try {
    const { name, description } = req.body;

    const dept = await Department.findById(req.params.id);
    if (!dept) {
      return res.status(404).json({ error: 'Không tìm thấy phòng ban' });
    }

    // Do not allow changing key because it's linked to users roles/department
    if (name) dept.name = name.trim();
    if (description !== undefined) dept.description = description;

    await dept.save();
    res.json({ department: dept, message: 'Cập nhật phòng ban thành công' });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * DELETE /api/departments/:id
 * Xóa phòng ban (Director, IT)
 */
router.delete('/:id', requireITOrDirector(), async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) {
      return res.status(404).json({ error: 'Không tìm thấy phòng ban' });
    }

    // Prevent deleting core system departments
    const coreDepts = ['director', 'hr', 'sale', 'marketing', 'it'];
    if (coreDepts.includes(dept.key)) {
      return res.status(400).json({ error: 'Không thể xóa phòng ban hệ thống cốt lõi' });
    }

    // Check if there are users in this department
    const User = require('../models/User');
    const userCount = await User.countDocuments({ department: dept.key });
    if (userCount > 0) {
      return res.status(400).json({ error: 'Không thể xóa phòng ban đang có nhân viên' });
    }

    await Department.findByIdAndDelete(req.params.id);
    res.json({ message: 'Xóa phòng ban thành công' });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
