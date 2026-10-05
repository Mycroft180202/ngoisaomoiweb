const cron = require('node-cron');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const { createDatabaseBackup } = require('./backupService');

function initCronJobs() {
  console.log('[Cron] Khởi tạo các lịch trình tự động...');

  // 1. Kiểm tra deadline công việc mỗi 30 phút
  cron.schedule('*/30 * * * *', async () => {
    try {
      console.log('[Cron] Đang kiểm tra công việc sắp đến hạn...');
      const now = new Date();
      const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Tìm các việc chưa hoàn thành, chưa hủy, deadline nằm trong khoảng 24h tới hoặc đã quá hạn, và chưa nhắc nhở trong 12h qua
      const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
      const tasksToRemind = await Task.find({
        status: { $in: ['todo', 'in_progress', 'review'] },
        deadline: { $lte: next24h },
        $or: [
          { remindedAt: { $exists: false } },
          { remindedAt: { $lt: twelveHoursAgo } }
        ]
      }).populate('assignee', 'fullName');

      for (const task of tasksToRemind) {
        if (!task.assignee) continue;

        const isOverdue = new Date(task.deadline) < now;
        const title = isOverdue ? `⚠️ Công việc quá hạn: ${task.code}` : `⏰ Nhắc nhở hạn chót: ${task.code}`;
        const message = isOverdue
          ? `Công việc "${task.title}" đã quá hạn chót (${new Date(task.deadline).toLocaleString('vi-VN')}). Vui lòng cập nhật ngay!`
          : `Công việc "${task.title}" sắp đến hạn chót (${new Date(task.deadline).toLocaleString('vi-VN')}).`;

        await Notification.create({
          user: task.assignee._id,
          title,
          message,
          type: isOverdue ? 'danger' : 'warning',
          link: '/tasks'
        });

        task.remindedAt = now;
        await task.save();
      }
    } catch (err) {
      console.error('[Cron Error - Task Reminder]', err);
    }
  });

  // 2. Tự động sao lưu dữ liệu mỗi ngày lúc 01:00 đêm (0 1 * * *)
  cron.schedule('0 1 * * *', async () => {
    console.log('[Cron] Bắt đầu sao lưu dữ liệu định kỳ hàng ngày...');
    await createDatabaseBackup();
  });
}

module.exports = {
  initCronJobs
};
