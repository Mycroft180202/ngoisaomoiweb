const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const Notification = require('../models/Notification');
const User = require('../models/User');

const requireAnnouncementWrite = (req, res, next) => {
  const { role, department } = req.user;
  const canWrite = role === 'director' || role.includes('manager') || department === 'it';
  if (!canWrite) {
    return res.status(403).json({ error: 'Bạn không có quyền đăng tin thông báo' });
  }
  next();
};

/**
 * GET /api/announcements
 * Lấy danh sách thông báo bảng tin
 */
router.get('/', async (req, res) => {
  try {
    const { role, department } = req.user;
    const filter = {};

    // Phân quyền hiển thị bảng tin
    // Giám đốc và IT thấy hết
    if (role !== 'director' && department !== 'it') {
      filter.targetDepartment = { $in: ['all', department] };
    }

    const announcements = await Announcement.find(filter)
      .populate('createdBy', 'fullName role avatar position')
      .sort({ pinned: -1, createdAt: -1 });

    res.json({ announcements });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * POST /api/announcements
 * Đăng thông báo mới
 */
router.post('/', requireAnnouncementWrite, async (req, res) => {
  try {
    const { title, content, targetDepartment, pinned } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Vui lòng nhập tiêu đề và nội dung' });
    }

    const announcement = new Announcement({
      title,
      content,
      targetDepartment: targetDepartment || 'all',
      pinned: pinned || false,
      createdBy: req.user._id
    });

    await announcement.save();

    // Tạo thông báo đẩy (system notification) cho người dùng thuộc đối tượng nhận tin
    const notificationFilter = {};
    if (targetDepartment && targetDepartment !== 'all') {
      notificationFilter.department = targetDepartment;
    }
    // Không tự gửi thông báo cho chính mình (người đăng)
    notificationFilter._id = { $ne: req.user._id };

    const targetUsers = await User.find(notificationFilter);
    const notifications = targetUsers.map(u => ({
      user: u._id,
      type: 'system',
      title: '📢 Có thông báo bảng tin mới',
      message: `Tiêu đề: ${title}`,
      link: '/announcements'
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    const populated = await Announcement.findById(announcement._id)
      .populate('createdBy', 'fullName role avatar position');

    res.status(201).json({ announcement: populated, message: 'Đăng tin thành công' });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * PUT /api/announcements/:id
 * Sửa thông báo
 */
router.put('/:id', requireAnnouncementWrite, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ error: 'Không tìm thấy thông báo bảng tin' });
    }

    // Manager chỉ được sửa thông báo của chính họ tạo (Director và IT sửa của ai cũng được)
    const isDirectorOrIT = req.user.role === 'director' || req.user.department === 'it';
    const isCreator = announcement.createdBy.toString() === req.user._id.toString();
    if (!isDirectorOrIT && !isCreator) {
      return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa thông báo của người khác' });
    }

    const allowedFields = ['title', 'content', 'targetDepartment', 'pinned'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        announcement[field] = req.body[field];
      }
    });

    await announcement.save();

    const populated = await Announcement.findById(announcement._id)
      .populate('createdBy', 'fullName role avatar position');

    res.json({ announcement: populated, message: 'Cập nhật bảng tin thành công' });
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * DELETE /api/announcements/:id
 * Xóa thông báo
 */
router.delete('/:id', requireAnnouncementWrite, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ error: 'Không tìm thấy thông báo bảng tin' });
    }

    const isDirectorOrIT = req.user.role === 'director' || req.user.department === 'it';
    const isCreator = announcement.createdBy.toString() === req.user._id.toString();
    if (!isDirectorOrIT && !isCreator) {
      return res.status(403).json({ error: 'Bạn không có quyền xóa thông báo của người khác' });
    }

    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Xóa thông báo bảng tin thành công' });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
