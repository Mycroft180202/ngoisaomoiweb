const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Tour = require('../models/Tour');
const Notification = require('../models/Notification');
const { requireDepartment } = require('../middleware/rbac');
const { generateCode } = require('../utils/codeGenerator');
const { updateWebsiteBookingStatus } = require('../services/websiteBookingSync');

/**
 * GET /api/bookings
 * Danh sách booking
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, tour, search } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (tour) filter.tour = tour;
    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('tour', 'name code departureDate destination')
        .populate('createdBy', 'fullName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Booking.countDocuments(filter)
    ]);

    res.json({
      bookings,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * POST /api/bookings
 * Tạo booking (Sale)
 */
router.post('/', requireDepartment('director', 'sale'), async (req, res) => {
  try {
    const { tour: tourId, customerName, customerPhone, customerEmail, adults, children, note } = req.body;

    if (!tourId || !customerName || !customerPhone) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin' });
    }

    const tour = await Tour.findById(tourId);
    if (!tour) {
      return res.status(404).json({ error: 'Không tìm thấy tour' });
    }

    // Tính giá
    const adultsCount = adults || 1;
    const childrenCount = children || 0;
    const totalPrice = (adultsCount * tour.price.adult) + (childrenCount * tour.price.child);

    // Auto-generate code (atomic, race-condition safe)
    const code = await generateCode('BK', 3);

    const booking = new Booking({
      code,
      tour: tourId,
      customerName,
      customerPhone,
      customerEmail,
      adults: adultsCount,
      children: childrenCount,
      totalPrice,
      note,
      createdBy: req.user._id
    });

    await booking.save();

    const populated = await Booking.findById(booking._id)
      .populate('tour', 'name code departureDate')
      .populate('createdBy', 'fullName');

    res.status(201).json({ booking: populated, message: 'Tạo booking thành công' });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * PUT /api/bookings/:id
 * Cập nhật booking
 */
router.put('/:id', requireDepartment('director', 'sale'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Không tìm thấy booking' });
    }

    const allowedFields = ['customerName', 'customerPhone', 'customerEmail', 'adults', 'children', 'totalPrice', 'note'];
    if (booking.websiteSource?.bookingId) {
      return res.status(409).json({ error: 'Đơn website cần sửa thông tin và báo giá trên CMS để tránh lệch dữ liệu.' });
    }
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        booking[field] = req.body[field];
      }
    });

    await booking.save();

    const populated = await Booking.findById(booking._id)
      .populate('tour', 'name code departureDate')
      .populate('createdBy', 'fullName');

    res.json({ booking: populated, message: 'Cập nhật thành công' });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * PATCH /api/bookings/:id/status
 * Đổi trạng thái booking
 */
router.patch('/:id/status', requireDepartment('director', 'sale'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'confirmed', 'paid', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
    }

    let booking = await Booking.findById(req.params.id)
      .populate('tour', 'name code')
      .populate('createdBy', 'fullName');

    if (!booking) {
      return res.status(404).json({ error: 'Không tìm thấy booking' });
    }

    if (booking.websiteSource?.bookingId) {
      booking = await updateWebsiteBookingStatus(booking, status);
    } else if (/^NST-\d{8}-\d+$/.test(booking.code)) {
      return res.status(409).json({ error: 'Đơn website cũ cần đồng bộ lại từ CMS trước khi duyệt trên CRM.' });
    } else {
      booking.status = status;
      await booking.save();
    }

    res.json({ booking, message: 'Đã cập nhật trạng thái' });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Lỗi server' });
  }
});

module.exports = router;
