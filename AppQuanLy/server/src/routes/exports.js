const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Tour = require('../models/Tour');

// Helper định dạng CSV với BOM UTF-8 (để mở bằng Excel không bị lỗi font Tiếng Việt)
const sendCsvResponse = (res, filename, headers, rows) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  // Thêm UTF-8 BOM (\uFEFF)
  let csvContent = '\uFEFF';
  csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\r\n';

  rows.forEach(row => {
    csvContent += row.map(cell => {
      const val = cell === null || cell === undefined ? '' : String(cell);
      return `"${val.replace(/"/g, '""')}"`;
    }).join(',') + '\r\n';
  });

  res.send(csvContent);
};

/**
 * GET /api/exports/tasks
 * Xuất danh sách công việc ra Excel
 */
router.get('/tasks', async (req, res) => {
  try {
    const tasks = await Task.find({}).populate('assignee', 'fullName').populate('createdBy', 'fullName').sort({ createdAt: -1 });

    const headers = ['Mã Công Việc', 'Tiêu Đề', 'Trạng Thái', 'Độ Ưu Tiên', 'Phòng Ban', 'Người Thực Hiện', 'Hạn Chót', 'Ngày Tạo'];
    const rows = tasks.map(t => [
      t.code,
      t.title,
      t.status === 'todo' ? 'Mới' : t.status === 'in_progress' ? 'Đang làm' : t.status === 'review' ? 'Review' : t.status === 'done' ? 'Hoàn thành' : 'Đã hủy',
      t.priority,
      t.department,
      t.assignee?.fullName || 'Chưa giao',
      t.deadline ? new Date(t.deadline).toLocaleDateString('vi-VN') : '',
      new Date(t.createdAt).toLocaleDateString('vi-VN')
    ]);

    sendCsvResponse(res, `Danh_Sach_Cong_Viec_${Date.now()}.csv`, headers, rows);
  } catch (error) {
    console.error('Export tasks error:', error);
    res.status(500).json({ error: 'Lỗi xuất báo cáo' });
  }
});

/**
 * GET /api/exports/bookings
 * Xuất danh sách đặt tour ra Excel
 */
router.get('/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find({}).populate('tour', 'name code').populate('createdBy', 'fullName').sort({ createdAt: -1 });

    const headers = ['Mã Booking', 'Tên Khách Hàng', 'Số Điện Thoại', 'Email', 'Tour', 'Số Khách', 'Tổng Tiền', 'Trạng Thái', 'Ngày Đặt'];
    const rows = bookings.map(b => [
      b.code,
      b.customerName,
      b.customerPhone,
      b.customerEmail || '',
      b.tour ? `[${b.tour.code}] ${b.tour.name}` : '',
      b.numberOfGuests,
      b.totalAmount,
      b.status === 'confirmed' ? 'Đã xác nhận' : b.status === 'completed' ? 'Hoàn thành' : b.status === 'cancelled' ? 'Đã hủy' : 'Chờ xử lý',
      new Date(b.createdAt).toLocaleDateString('vi-VN')
    ]);

    sendCsvResponse(res, `Danh_Sach_Dat_Tour_${Date.now()}.csv`, headers, rows);
  } catch (error) {
    console.error('Export bookings error:', error);
    res.status(500).json({ error: 'Lỗi xuất báo cáo' });
  }
});

/**
 * GET /api/exports/staff
 * Xuất danh sách nhân sự ra Excel
 */
router.get('/staff', async (req, res) => {
  try {
    const staff = await User.find({}).select('-passwordHash').sort({ department: 1, fullName: 1 });

    const headers = ['Mã/Username', 'Họ Và Tên', 'Phòng Ban', 'Chức Vụ', 'Vai Trò', 'Email', 'Số Điện Thoại', 'Trạng Thái'];
    const rows = staff.map(u => [
      u.username,
      u.fullName,
      u.department,
      u.position,
      u.role,
      u.email || '',
      u.phone || '',
      u.status === 'active' ? 'Đang làm việc' : 'Đã nghỉ'
    ]);

    sendCsvResponse(res, `Danh_Sach_Nhan_Su_${Date.now()}.csv`, headers, rows);
  } catch (error) {
    console.error('Export staff error:', error);
    res.status(500).json({ error: 'Lỗi xuất báo cáo' });
  }
});

module.exports = router;
