const express = require('express');
const router = express.Router();
const Tour = require('../models/Tour');
const Task = require('../models/Task');
const Booking = require('../models/Booking');
const Approval = require('../models/Approval');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const Notification = require('../models/Notification');

/**
 * GET /api/dashboard/stats
 * Thống kê tổng quan (filtered by role)
 */
router.get('/stats', async (req, res) => {
  try {
    const { role, department, _id: userId } = req.user;

    // Chỉ Director và Manager mới được xem dashboard stats
    if (role !== 'director' && !role.includes('manager')) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập thông tin dashboard' });
    }

    // Bộ lọc công việc theo quyền hạn (Director thấy hết, Trưởng phòng/Nhân viên thấy việc phòng ban mình hoặc liên quan đến mình)
    const statsTaskFilter = {};
    if (role !== 'director') {
      statsTaskFilter.$or = [
        { department },
        { assignee: userId },
        { createdBy: userId }
      ];
    }

    // Stats chung
    const [
      totalUsers,
      totalTours,
      activeTours,
      totalTasks,
      totalBookings,
      pendingApprovals
    ] = await Promise.all([
      User.countDocuments({ status: 'active' }),
      Tour.countDocuments(),
      Tour.countDocuments({ status: 'active' }),
      Task.countDocuments(statsTaskFilter),
      Booking.countDocuments({ status: { $ne: 'cancelled' } }),
      role === 'director'
        ? Approval.countDocuments({ status: 'pending_director' })
        : role.includes('manager')
          ? Approval.countDocuments({ status: 'pending_manager', department })
          : Approval.countDocuments({ createdBy: userId, status: { $in: ['pending_manager', 'pending_director'] } })
    ]);

    // Task stats by status
    const taskStats = await Task.aggregate([
      { $match: statsTaskFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const tasksByStatus = {
      todo: 0, in_progress: 0, review: 0, done: 0
    };
    taskStats.forEach(s => { tasksByStatus[s._id] = s.count; });

    // Doanh thu (chỉ Director & Sale)
    let revenue = null;
    if (role === 'director' || department === 'sale') {
      const revenueData = await Booking.aggregate([
        { $match: { status: { $in: ['paid', 'completed'] } } },
        {
          $group: {
            _id: { $month: '$createdAt' },
            total: { $sum: '$totalPrice' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);
      revenue = revenueData;
    }

    // Tour sắp khởi hành (7 ngày tới)
    const upcomingTours = await Tour.find({
      status: 'active',
      departureDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    })
      .populate('saleInCharge', 'fullName')
      .sort({ departureDate: 1 })
      .limit(5);

    // Tasks sắp deadline (3 ngày tới)
    const urgentTaskFilter = {
      status: { $ne: 'done' },
      deadline: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      }
    };
    // Gộp filter quyền hạn bằng $and để tránh ghi đè $or
    if (Object.keys(statsTaskFilter).length > 0) {
      urgentTaskFilter.$and = [statsTaskFilter];
    }

    const urgentTasks = await Task.find(urgentTaskFilter)
      .populate('assignee', 'fullName avatar')
      .sort({ deadline: 1 })
      .limit(5);

    // Phân bố nhân sự theo phòng ban
    const staffByDept = await User.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$department', count: { $sum: 1 } } }
    ]);

    res.json({
      stats: {
        totalUsers,
        totalTours,
        activeTours,
        totalTasks,
        totalBookings,
        pendingApprovals,
        tasksByStatus
      },
      revenue,
      upcomingTours,
      urgentTasks,
      staffByDept
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/dashboard/revenue
 * Doanh thu chi tiết theo thời gian
 */
router.get('/revenue', async (req, res) => {
  try {
    const { role } = req.user;
    
    // Chỉ Director và Manager mới được xem dashboard stats
    if (role !== 'director' && !role.includes('manager')) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập thông tin doanh thu' });
    }
    const { year = new Date().getFullYear() } = req.query;

    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${parseInt(year) + 1}-01-01`);

    const monthlyRevenue = await Booking.aggregate([
      {
        $match: {
          status: { $in: ['paid', 'completed'] },
          createdAt: { $gte: startDate, $lt: endDate }
        }
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          revenue: { $sum: '$totalPrice' },
          bookings: { $sum: 1 },
          guests: { $sum: { $add: ['$adults', '$children'] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Format thành 12 tháng
    const result = Array.from({ length: 12 }, (_, i) => {
      const data = monthlyRevenue.find(m => m._id === i + 1);
      return {
        month: i + 1,
        revenue: data?.revenue || 0,
        bookings: data?.bookings || 0,
        guests: data?.guests || 0
      };
    });

    res.json({ revenue: result, year: parseInt(year) });
  } catch (error) {
    console.error('Revenue error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/dashboard/my-summary
 * Tóm tắt dữ liệu cá nhân dành cho nhân viên (không có quyền xem dashboard chung)
 */
router.get('/my-summary', async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Đếm các đầu việc đang xử lý (todo, in_progress, review) giao cho tôi
    // 2. Đếm các ticket hỗ trợ do tôi tạo chưa đóng
    // 3. Đếm các đề xuất tôi tạo đang chờ duyệt
    // 4. Lấy danh sách việc gấp sắp đến hạn (3 ngày tới)
    // 5. Lấy danh sách ticket gần nhất
    const [
      activeTasksCount,
      activeTicketsCount,
      pendingApprovalsCount,
      urgentTasks,
      recentTickets,
      recentNotifications
    ] = await Promise.all([
      Task.countDocuments({ assignee: userId, status: { $in: ['todo', 'in_progress', 'review'] } }),
      Ticket.countDocuments({ requester: userId, status: { $ne: 'closed' } }),
      Approval.countDocuments({ createdBy: userId, status: { $in: ['pending_manager', 'pending_director'] } }),
      Task.find({
        assignee: userId,
        status: { $in: ['todo', 'in_progress', 'review'] },
        deadline: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        }
      })
        .sort({ deadline: 1 })
        .limit(5),
      Ticket.find({ requester: userId })
        .sort({ createdAt: -1 })
        .limit(5),
      Notification.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    res.json({
      summary: {
        activeTasksCount,
        activeTicketsCount,
        pendingApprovalsCount
      },
      urgentTasks,
      recentTickets,
      recentNotifications
    });
  } catch (error) {
    console.error('Get my-summary error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
