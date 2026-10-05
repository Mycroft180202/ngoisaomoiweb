const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const AUDIT_EXCLUDED_USERNAMES = ['admin', 'huongbd'];

/**
 * GET /api/activity
 * Lấy nhật ký hoạt động (Director, IT, HR)
 */
router.get('/', async (req, res) => {
  try {
    const { role, department } = req.user;
    if (role !== 'director' && department !== 'it' && role !== 'hr_manager') {
      return res.status(403).json({ error: 'Bạn không có quyền xem nhật ký hoạt động' });
    }

    const adminIds = await User.find({ username: { $in: AUDIT_EXCLUDED_USERNAMES } }).distinct('_id');
    const logs = await ActivityLog.find({ user: { $nin: adminIds } })
      .populate('user', 'username fullName department role avatar')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ logs });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Helper function để ghi log từ các controller khác
async function createLog(userId, action, moduleName, description, ip = '') {
  try {
    const user = await User.findById(userId).select('username').lean();
    if (user && AUDIT_EXCLUDED_USERNAMES.includes(user.username?.toLowerCase())) return;
    await ActivityLog.create({
      user: userId,
      action,
      module: moduleName,
      description,
      ipAddress: ip
    });
  } catch (err) {
    console.error('[ActivityLog Error]', err);
  }
}

module.exports = router;
module.exports.createLog = createLog;
