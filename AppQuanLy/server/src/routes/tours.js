const express = require('express');
const router = express.Router();
const Tour = require('../models/Tour');
const Booking = require('../models/Booking');
const { requireRole, requireDepartment } = require('../middleware/rbac');

// Tài khoản hệ thống `admin` được toàn quyền quản trị Tour dù role hiện tại
// thuộc phòng IT. Các tài khoản IT khác không tự động nhận quyền này.
const allowSystemAdmin = (middleware) => (req, res, next) => {
  if (req.user?.username?.toLowerCase() === 'admin') {
    return next();
  }
  return middleware(req, res, next);
};

const requireTourEditor = allowSystemAdmin(requireDepartment('director', 'sale'));
const requireTourDeleter = allowSystemAdmin(requireRole('director'));

/**
 * GET /api/tours
 * Danh sách tour (filter, search, paginate)
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, destination, fromDate, toDate } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (destination) filter.destination = { $regex: destination, $options: 'i' };
    if (fromDate || toDate) {
      filter.departureDate = {};
      if (fromDate) filter.departureDate.$gte = new Date(fromDate);
      if (toDate) filter.departureDate.$lte = new Date(toDate);
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { destination: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [tours, total] = await Promise.all([
      Tour.find(filter)
        .populate('saleInCharge', 'fullName')
        .populate('createdBy', 'fullName')
        .sort({ departureDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Tour.countDocuments(filter)
    ]);

    // Đếm bookings cho mỗi tour
    const toursWithBookings = await Promise.all(
      tours.map(async (tour) => {
        const bookingCount = await Booking.aggregate([
          { $match: { tour: tour._id, status: { $ne: 'cancelled' } } },
          { $group: { _id: null, totalAdults: { $sum: '$adults' }, totalChildren: { $sum: '$children' } } }
        ]);
        const tourObj = tour.toObject();
        tourObj.currentGuests = bookingCount.length > 0
          ? bookingCount[0].totalAdults + bookingCount[0].totalChildren
          : 0;
        return tourObj;
      })
    );

    res.json({
      tours: toursWithBookings,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get tours error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/tours/:id
 * Chi tiết tour + bookings
 */
router.get('/:id', async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id)
      .populate('saleInCharge', 'fullName email phone')
      .populate('createdBy', 'fullName');

    if (!tour) {
      return res.status(404).json({ error: 'Không tìm thấy tour' });
    }

    const bookings = await Booking.find({ tour: tour._id })
      .populate('createdBy', 'fullName')
      .sort({ createdAt: -1 });

    const validBookings = bookings.filter(b => b.status !== 'cancelled');
    const totalGuests = validBookings.reduce((sum, b) => sum + b.adults + b.children, 0);
    const totalRevenue = validBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const actualCost = tour.actualCost || 0;
    const netProfit = totalRevenue - actualCost;

    res.json({
      tour: { ...tour.toObject(), currentGuests: totalGuests, totalRevenue, netProfit },
      bookings
    });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * POST /api/tours
 * Tạo tour mới (Director, Sale)
 */
router.post('/', requireTourEditor, async (req, res) => {
  try {
    const {
      code, name, destination, description, durationDays, durationNights,
      price, departureDate, returnDate, maxGuests, itinerary,
      includes, excludes, images, saleInCharge, estimatedCost, actualCost
    } = req.body;

    if (!code || !name || !destination || !durationDays || !price?.adult) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin tour' });
    }

    const existingTour = await Tour.findOne({ code: code.toUpperCase() });
    if (existingTour) {
      return res.status(400).json({ error: 'Mã tour đã tồn tại' });
    }

    const tour = new Tour({
      code, name, destination, description,
      durationDays, durationNights: durationNights || durationDays - 1,
      price, departureDate, returnDate, maxGuests,
      itinerary, includes, excludes, images,
      estimatedCost: estimatedCost || 0,
      actualCost: actualCost || 0,
      saleInCharge: saleInCharge || req.user._id,
      createdBy: req.user._id
    });

    await tour.save();
    res.status(201).json({ tour, message: 'Tạo tour thành công' });
  } catch (error) {
    console.error('Create tour error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * PUT /api/tours/:id
 * Cập nhật tour
 */
router.put('/:id', requireTourEditor, async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id);
    if (!tour) {
      return res.status(404).json({ error: 'Không tìm thấy tour' });
    }

    const allowedFields = [
      'name', 'destination', 'description', 'durationDays', 'durationNights',
      'price', 'status', 'departureDate', 'returnDate', 'maxGuests',
      'itinerary', 'includes', 'excludes', 'images', 'saleInCharge',
      'estimatedCost', 'actualCost'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        tour[field] = req.body[field];
      }
    });

    await tour.save();
    res.json({ tour, message: 'Cập nhật tour thành công' });
  } catch (error) {
    console.error('Update tour error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * DELETE /api/tours/:id
 * Xóa tour (Director only)
 */
router.delete('/:id', requireTourDeleter, async (req, res) => {
  try {
    const tour = await Tour.findByIdAndDelete(req.params.id);
    if (!tour) {
      return res.status(404).json({ error: 'Không tìm thấy tour' });
    }

    // Xóa bookings liên quan
    await Booking.deleteMany({ tour: tour._id });

    res.json({ message: 'Xóa tour thành công' });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
