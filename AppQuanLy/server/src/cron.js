const Task = require('./models/Task');
const Notification = require('./models/Notification');
const Booking = require('./models/Booking');
const User = require('./models/User');
const Customer = require('./models/Customer');
const { createDatabaseBackup } = require('./services/backupService');

// Format date helper inside cron
const formatDateTime = (date) => {
  if (!date) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
};

async function generateWeeklyReport() {
  console.log('📊 [Cron] Đang khởi tạo báo cáo hiệu suất tuần...');
  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [newBookings, doneTasks, managersAndDirectors] = await Promise.all([
      Booking.find({ createdAt: { $gte: oneWeekAgo }, status: { $ne: 'cancelled' } }),
      Task.countDocuments({ status: 'done', updatedAt: { $gte: oneWeekAgo } }),
      User.find({ $or: [{ role: 'director' }, { role: { $regex: 'manager' } }] })
    ]);

    const totalRevenue = newBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    const revenueFormatted = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalRevenue);

    const title = '📊 Báo cáo tổng hợp hiệu suất tuần qua';
    const message = `Tuần qua hệ thống ghi nhận: ${newBookings.length} đơn đặt tour mới (${revenueFormatted}) và ${doneTasks} công việc đã hoàn thành!`;

    const notifications = managersAndDirectors.map(u => ({
      user: u._id,
      type: 'system',
      title,
      message,
      link: '/'
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
      console.log(`🔔 [Cron] Đã gửi báo cáo tuần cho ${notifications.length} quản lý`);
    }
  } catch (err) {
    console.error('❌ [Cron] Lỗi khi tạo báo cáo tuần:', err);
  }
}

async function checkDeadlines() {
  console.log('⏰ [Cron] Đang kiểm tra deadline các công việc...');
  try {
    const now = new Date();
    // Tìm các task chưa hoàn thành và chưa bị hủy
    const activeTasks = await Task.find({
      status: { $in: ['todo', 'in_progress', 'review'] },
      assignee: { $exists: true, $ne: null },
      deadline: { $exists: true, $ne: null }
    });

    for (const task of activeTasks) {
      const deadline = new Date(task.deadline);
      const diffMs = deadline - now;
      const oneDayMs = 24 * 60 * 60 * 1000;

      if (diffMs < 0) {
        // 1. Việc quá hạn
        const alreadyNotified = await Notification.findOne({
          user: task.assignee,
          type: 'task',
          title: 'Công việc đã quá hạn',
          link: `/tasks/${task._id}`
        });

        if (!alreadyNotified) {
          // Tạo thông báo cho người nhận việc
          await Notification.create({
            user: task.assignee,
            type: 'task',
            title: 'Công việc đã quá hạn',
            message: `Công việc "${task.title}" được giao cho bạn đã quá hạn chót (${formatDateTime(task.deadline)}).`,
            link: `/tasks/${task._id}`
          });

          // Tạo thông báo cho người giao việc
          if (task.createdBy && task.createdBy.toString() !== task.assignee.toString()) {
            await Notification.create({
              user: task.createdBy,
              type: 'task',
              title: 'Công việc quá hạn',
              message: `Công việc "${task.title}" giao cho nhân viên đã quá hạn chót (${formatDateTime(task.deadline)}).`,
              link: `/tasks/${task._id}`
            });
          }
          console.log(`🔔 [Cron] Đã tạo cảnh báo quá hạn cho công việc: ${task.title}`);
        }
      } else if (diffMs <= oneDayMs) {
        // 2. Việc sắp đến hạn (trong vòng 24 giờ tới)
        const alreadyNotified = await Notification.findOne({
          user: task.assignee,
          type: 'task',
          title: 'Công việc sắp đến hạn',
          link: `/tasks/${task._id}`
        });

        if (!alreadyNotified) {
          await Notification.create({
            user: task.assignee,
            type: 'task',
            title: 'Công việc sắp đến hạn',
            message: `Công việc "${task.title}" sắp đến hạn chót (Hạn chót: ${formatDateTime(task.deadline)}).`,
            link: `/tasks/${task._id}`
          });
          console.log(`🔔 [Cron] Đã tạo cảnh báo sắp đến hạn cho công việc: ${task.title}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ [Cron] Lỗi khi kiểm tra deadline:', error);
  }
}

async function checkCustomerFollowUps() {
  console.log('📞 [Cron] Đang kiểm tra lịch hẹn gọi lại khách hàng...');
  try {
    const now = new Date();
    // Tìm các khách hàng có lịch hẹn liên hệ lại sắp tới hoặc đã quá hạn
    const upcomingContacts = await Customer.find({
      nextContactDate: { $exists: true, $ne: null, $lte: new Date(now.getTime() + 30 * 60 * 1000) }
    });

    for (const customer of upcomingContacts) {
      const targetUser = customer.assignedTo || customer.createdBy;
      if (!targetUser) continue;

      const link = `/customers?id=${customer._id}`;
      // Tránh gửi lặp lại thông báo cho cùng một lịch hẹn gọi lại
      const alreadyNotified = await Notification.findOne({
        user: targetUser,
        type: 'system',
        title: 'Nhắc lịch hẹn gọi lại khách hàng',
        link
      });

      if (!alreadyNotified) {
        await Notification.create({
          user: targetUser,
          type: 'system',
          title: 'Nhắc lịch hẹn gọi lại khách hàng',
          message: `Bạn có lịch hẹn gọi điện liên hệ lại với khách hàng ${customer.name} (${customer.phone}) vào lúc ${formatDateTime(customer.nextContactDate)}. Ghi chú: ${customer.nextContactNote || 'Không có'}`,
          link
        });

        // Gửi thông báo thời gian thực qua socket
        if (global.io) {
          global.io.to(targetUser.toString()).emit('new_notification', {
            title: 'Nhắc lịch hẹn gọi lại khách hàng',
            message: `Hẹn gọi lại khách hàng ${customer.name} vào lúc ${formatDateTime(customer.nextContactDate)}.`
          });
        }

        console.log(`🔔 [Cron] Đã tạo thông báo nhắc lịch gọi lại cho khách hàng: ${customer.name}`);
      }
    }
  } catch (error) {
    console.error('❌ [Cron] Lỗi khi kiểm tra lịch hẹn khách hàng:', error);
  }
}

// Khởi chạy vòng lặp kiểm tra
const startCronJobs = () => {
  // Chạy lần đầu tiên sau khi khởi động server
  setTimeout(checkDeadlines, 5000);
  setTimeout(checkCustomerFollowUps, 15000); // Chạy kiểm tra cuộc gọi lại sau 15s
  setTimeout(createDatabaseBackup, 20000); // Tự động backup 20s sau khi khởi động server

  // Chạy kiểm tra định kỳ
  setInterval(checkDeadlines, 60 * 60 * 1000); // Kiểm tra deadline task mỗi giờ
  setInterval(checkCustomerFollowUps, 5 * 60 * 1000); // Kiểm tra lịch gọi lại mỗi 5 phút

  // Tự động backup định kỳ 24h một lần
  setInterval(createDatabaseBackup, 24 * 60 * 60 * 1000);

  // Tự động gửi báo cáo tuần 7 ngày 1 lần
  setInterval(generateWeeklyReport, 7 * 24 * 60 * 60 * 1000);
};

module.exports = { startCronJobs, checkDeadlines, generateWeeklyReport, checkCustomerFollowUps };


