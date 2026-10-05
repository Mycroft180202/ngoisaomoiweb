const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireRole } = require('../middleware/rbac');

const requireUserAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Chưa đăng nhập' });
  }
  if (req.user.role === 'director' || req.user.role === 'hr_manager' || req.user.department === 'it') {
    return next();
  }
  return res.status(403).json({ error: 'Bạn không có quyền quản lý nhân viên (Yêu cầu vai trò Giám đốc, Trưởng phòng Nhân sự hoặc phòng IT)' });
};

const requireUserDelete = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Chưa đăng nhập' });
  }
  if (req.user.role === 'director' || req.user.department === 'it') {
    return next();
  }
  return res.status(403).json({ error: 'Chỉ Giám đốc hoặc phòng IT mới được phép xóa tài khoản nhân sự' });
};

/**
 * GET /api/users
 * Danh sách nhân viên (search, filter, paginate)
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, department, role, status } = req.query;

    const filter = {};
    if (department) filter.department = department;
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash')
        .sort({ department: 1, role: 1, fullName: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(filter)
    ]);

    res.json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/users/:id
 * Chi tiết nhân viên
 */
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy nhân viên' });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * POST /api/users
 * Tạo nhân viên mới (Director, HR)
 */
router.post('/', requireUserAdmin, async (req, res) => {
  try {
    const { username, password, fullName, email, phone, department, role, position, attendanceRequired, permissions } = req.body;

    if (!username || !password || !fullName || !department || !role || !position) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin bắt buộc' });
    }

    // Check username exists
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
    }

    const user = new User({
      username,
      passwordHash: password,
      fullName,
      email,
      phone,
      department,
      role,
      position,
      attendanceRequired: attendanceRequired !== false,
      permissions: Array.isArray(permissions) ? permissions : [],
      needsPasswordChange: true // Bắt buộc đổi mật khẩu lần đầu
    });

    await user.save();
    res.status(201).json({ user: user.toJSON(), message: 'Tạo nhân viên thành công' });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * PUT /api/users/:id
 * Cập nhật nhân viên (Director, HR, IT)
 */
router.put('/:id', requireUserAdmin, async (req, res) => {
  try {
    const { username, fullName, email, phone, department, role, position, status, attendanceRequired, permissions } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy nhân viên' });
    }

    if (username && username.toLowerCase() !== user.username.toLowerCase()) {
      const existingUser = await User.findOne({ username: username.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
      }
      user.username = username.toLowerCase();
    }

    if (fullName) user.fullName = fullName;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (department) user.department = department;
    if (role) user.role = role;
    if (position) user.position = position;
    if (attendanceRequired !== undefined) user.attendanceRequired = attendanceRequired === true || attendanceRequired === 'true';
    if (permissions !== undefined && (req.user.role === 'director' || req.user.department === 'it')) {
      user.permissions = Array.isArray(permissions) ? permissions : [];
    }
    if (status) user.status = status;

    await user.save();
    res.json({ user: user.toJSON(), message: 'Cập nhật thành công' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * PATCH /api/users/:id/reset-password
 * Đặt lại mật khẩu nhân viên về mặc định (123456) và yêu cầu đổi mật khẩu ở lần đăng nhập tiếp theo
 * Quyền: Director, HR Manager, IT
 */
router.patch('/:id/reset-password', requireUserAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy nhân viên' });
    }

    user.passwordHash = '123456';
    user.needsPasswordChange = true;
    await user.save();

    res.json({ message: 'Đặt lại mật khẩu thành công về "123456". Nhân viên cần đổi mật khẩu ở lần đăng nhập tới.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * DELETE /api/users/:id
 * Xóa nhân viên (Director, IT)
 */
router.delete('/:id', requireUserDelete, async (req, res) => {
  try {
    // Không cho xóa chính mình
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ error: 'Không thể xóa tài khoản của chính mình' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy nhân viên' });
    }

    res.json({ message: 'Xóa nhân viên thành công' });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
