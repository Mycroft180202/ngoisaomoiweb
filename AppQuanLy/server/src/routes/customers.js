const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Booking = require('../models/Booking');
const MarketingCampaignReport = require('../models/MarketingCampaignReport');
const Document = require('../models/Document');
const generateCode = require('../utils/codeGenerator');

const canAccessMarketingReports = (user) => {
  return user?.role === 'director' || user?.role === 'it_manager' || user?.department === 'it' || user?.department === 'marketing';
};

const canManageMarketingReports = (user) => {
  return user?.role === 'director' || user?.role === 'it_manager' || user?.department === 'it';
};

const requireMarketingReportAccess = (req, res, next) => {
  if (!canAccessMarketingReports(req.user)) {
    return res.status(403).json({ error: 'Bạn không có quyền truy cập báo cáo Marketing' });
  }
  next();
};

const requireMarketingReportManager = (req, res, next) => {
  if (!canManageMarketingReports(req.user)) {
    return res.status(403).json({ error: 'Bạn không có quyền quản trị báo cáo Marketing' });
  }
  next();
};

const normalizeDepartments = (departments, fallback = 'marketing') => {
  const list = Array.isArray(departments) ? departments : [fallback];
  const cleaned = list.map(item => String(item || '').trim()).filter(Boolean);
  return cleaned.length ? [...new Set(cleaned)] : ['marketing'];
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const normalized = String(value)
    .trim()
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeCampaignRow = (row) => ({
  reportStart: toDate(row.reportStart),
  reportEnd: toDate(row.reportEnd),
  campaignName: String(row.campaignName || '').trim(),
  delivery: String(row.delivery || '').trim(),
  spend: toNumber(row.spend),
  reach: toNumber(row.reach),
  impressions: toNumber(row.impressions),
  results: toNumber(row.results),
  resultIndicator: String(row.resultIndicator || '').trim(),
  costPerResult: toNumber(row.costPerResult),
  messagingConversations: toNumber(row.messagingConversations),
  costPerMessagingConversation: toNumber(row.costPerMessagingConversation),
  messagingContacts: toNumber(row.messagingContacts),
  newMessagingContacts: toNumber(row.newMessagingContacts),
  returningMessagingConnections: toNumber(row.returningMessagingConnections),
  purchases: toNumber(row.purchases),
  costPerPurchase: toNumber(row.costPerPurchase),
  purchaseRoas: toNumber(row.purchaseRoas)
});

const inferCampaignSpend = (row) => {
  if ((row.spend || 0) > 0) return row.spend;
  if ((row.costPerPurchase || 0) > 0 && (row.purchases || 0) > 0) {
    return row.costPerPurchase * row.purchases;
  }
  if ((row.costPerResult || 0) > 0 && (row.results || 0) > 0) {
    return row.costPerResult * row.results;
  }
  const messageCount = row.messagingConversations || row.messagingContacts || 0;
  if ((row.costPerMessagingConversation || 0) > 0 && messageCount > 0) {
    return row.costPerMessagingConversation * messageCount;
  }
  return 0;
};

const enrichCampaignRow = (row) => ({
  ...row,
  spend: inferCampaignSpend(row)
});

const calculateCampaignTotals = (rows) => rows.reduce((totals, row) => {
  totals.spend += row.spend || 0;
  totals.reach += row.reach || 0;
  totals.impressions += row.impressions || 0;
  totals.results += row.results || 0;
  totals.messagingConversations += row.messagingConversations || 0;
  totals.messagingContacts += row.messagingContacts || 0;
  totals.newMessagingContacts += row.newMessagingContacts || 0;
  totals.purchases += row.purchases || 0;
  return totals;
}, {
  spend: 0,
  reach: 0,
  impressions: 0,
  results: 0,
  messagingConversations: 0,
  messagingContacts: 0,
  newMessagingContacts: 0,
  purchases: 0
});

const serializeCampaignReport = (report) => {
  const reportObject = typeof report.toObject === 'function' ? report.toObject() : report;
  const rows = (reportObject.rows || [])
    .map(row => enrichCampaignRow(normalizeCampaignRow(row)))
    .filter(row => row.campaignName);

  return {
    ...reportObject,
    rows,
    rowCount: rows.length,
    totals: calculateCampaignTotals(rows)
  };
};

/**
 * GET /api/customers
 * Danh sách khách hàng
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, source, status } = req.query;
    const filter = {};

    if (source) filter.source = source;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [customers, total] = await Promise.all([
      Customer.find(filter)
        .populate('createdBy', 'fullName')
        .populate('assignedTo', 'fullName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Customer.countDocuments(filter)
    ]);

    res.json({
      customers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/customers/marketing-stats
 * Thống kê hoạt động Marketing
 */
router.get('/marketing-stats', async (req, res) => {
  try {
    // 1. Phân bố nguồn khách hàng (source)
    const sourceStats = await Customer.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ]);

    // 2. Phân bố trạng thái khách hàng (status)
    const statusStats = await Customer.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // 3. Lịch sử khách hàng mới theo tháng (trong 6 tháng gần nhất)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const newCustomersMonthly = await Customer.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // 4. Doanh thu và số lượng booking của từng nguồn
    const allBookings = await Booking.find({ status: { $ne: 'cancelled' } }).select('customerPhone totalPrice');
    const allCustomers = await Customer.find({}).select('phone source');

    const customerSourceMap = {};
    allCustomers.forEach(c => {
      if (c.phone) {
        customerSourceMap[c.phone.trim()] = c.source;
      }
    });

    const sourceRevenue = { facebook: 0, zalo: 0, website: 0, referral: 0, direct: 0, other: 0 };
    const sourceBookingCount = { facebook: 0, zalo: 0, website: 0, referral: 0, direct: 0, other: 0 };

    allBookings.forEach(b => {
      if (b.customerPhone) {
        const phoneKey = b.customerPhone.trim();
        const src = customerSourceMap[phoneKey] || 'other';
        sourceRevenue[src] = (sourceRevenue[src] || 0) + (b.totalPrice || 0);
        sourceBookingCount[src] = (sourceBookingCount[src] || 0) + 1;
      }
    });

    res.json({
      sourceStats: sourceStats.map(s => ({ source: s._id, count: s.count })),
      statusStats: statusStats.map(s => ({ status: s._id, count: s.count })),
      newCustomersMonthly: newCustomersMonthly.map(m => ({
        month: `${String(m._id.month).padStart(2, '0')}/${m._id.year}`,
        count: m.count
      })),
      sourceRevenue,
      sourceBookingCount
    });
  } catch (error) {
    console.error('Marketing stats error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/customers/marketing-campaign-reports
 * Danh sách các file báo cáo Facebook Ads đã upload
 */
router.get('/marketing-campaign-reports', requireMarketingReportAccess, async (req, res) => {
  try {
    const reports = await MarketingCampaignReport.find({})
      .populate('uploadedBy', 'fullName role department')
      .select('-rows')
      .sort({ createdAt: -1 })
      .limit(24);

    res.json({ reports });
  } catch (error) {
    console.error('Get marketing campaign reports error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/customers/marketing-campaign-reports/:reportId
 * Chi tiết một báo cáo Facebook Ads
 */
router.get('/marketing-campaign-reports/:reportId', requireMarketingReportAccess, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.reportId)) {
      return res.status(400).json({ error: 'ID báo cáo không hợp lệ' });
    }

    const report = await MarketingCampaignReport.findById(req.params.reportId)
      .populate('uploadedBy', 'fullName role department');

    if (!report) {
      return res.status(404).json({ error: 'Không tìm thấy báo cáo Marketing' });
    }

    res.json({ report: serializeCampaignReport(report) });
  } catch (error) {
    console.error('Get marketing campaign report detail error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * POST /api/customers/marketing-campaign-reports/:reportId/archive-document
 * Lưu báo cáo Marketing vào thư viện tài liệu nội bộ
 */
router.post('/marketing-campaign-reports/:reportId/archive-document', requireMarketingReportManager, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.reportId)) {
      return res.status(400).json({ error: 'ID báo cáo không hợp lệ' });
    }

    const report = await MarketingCampaignReport.findById(req.params.reportId);
    if (!report) {
      return res.status(404).json({ error: 'Không tìm thấy báo cáo Marketing' });
    }

    const targetDepartments = normalizeDepartments(req.body.departments, 'marketing');
    const folder = String(req.body.folder || 'Báo cáo Marketing').trim();
    const name = String(req.body.name || `Báo cáo Marketing - ${report.fileName}`).trim();
    const description = String(req.body.description || 'Báo cáo Facebook Ads đã được duyệt và lưu trữ từ module Báo Cáo Marketing.').trim();

    let document = await Document.findOne({
      sourceType: 'marketing_report',
      sourceRef: report._id
    });

    if (document) {
      document.name = name;
      document.folder = folder;
      document.description = description;
      document.department = targetDepartments[0] || 'marketing';
      document.departments = targetDepartments;
      document.fileUrl = `/quanly/marketing-report?reportId=${report._id}`;
      document.fileType = 'marketing_report';
      document.fileSize = `${report.rowCount || 0} chiến dịch`;
      await document.save();
    } else {
      document = await Document.create({
        name,
        fileUrl: `/quanly/marketing-report?reportId=${report._id}`,
        fileType: 'marketing_report',
        fileSize: `${report.rowCount || 0} chiến dịch`,
        folder,
        description,
        content: `Chi tiêu: ${report.totals?.spend || 0} VND\nKết quả: ${report.totals?.results || 0}\nNgười nhắn tin: ${report.totals?.messagingContacts || report.totals?.messagingConversations || 0}\nLượt mua: ${report.totals?.purchases || 0}`,
        department: targetDepartments[0] || 'marketing',
        departments: targetDepartments,
        sourceType: 'marketing_report',
        sourceRef: report._id,
        sourceModel: 'MarketingCampaignReport',
        uploadedBy: req.user._id
      });
    }

    const populated = await Document.findById(document._id).populate('uploadedBy', 'fullName role department');
    res.status(201).json({ document: populated, message: 'Đã lưu báo cáo vào thư viện tài liệu' });
  } catch (error) {
    console.error('Archive marketing report document error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * DELETE /api/customers/marketing-campaign-reports/:reportId
 * Gỡ báo cáo Marketing upload nhầm
 */
router.delete('/marketing-campaign-reports/:reportId', requireMarketingReportAccess, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.reportId)) {
      return res.status(400).json({ error: 'ID báo cáo không hợp lệ' });
    }

    const report = await MarketingCampaignReport.findById(req.params.reportId);
    if (!report) {
      return res.status(404).json({ error: 'Không tìm thấy báo cáo Marketing' });
    }

    const isUploader = report.uploadedBy?.toString() === req.user._id.toString();
    if (!canManageMarketingReports(req.user) && !isUploader) {
      return res.status(403).json({ error: 'Bạn chỉ có thể gỡ báo cáo do mình upload' });
    }

    await Promise.all([
      MarketingCampaignReport.findByIdAndDelete(report._id),
      Document.deleteMany({ sourceType: 'marketing_report', sourceRef: report._id })
    ]);

    res.json({ message: 'Đã gỡ báo cáo Marketing' });
  } catch (error) {
    console.error('Delete marketing campaign report error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * POST /api/customers/marketing-campaign-reports
 * Lưu dữ liệu đã trích xuất từ file Facebook Ads XLSX
 */
router.post('/marketing-campaign-reports', requireMarketingReportAccess, async (req, res) => {
  try {
    const { fileName = '', rows = [] } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'File báo cáo không có dòng dữ liệu hợp lệ' });
    }

    if (rows.length > 5000) {
      return res.status(400).json({ error: 'File quá lớn, vui lòng upload tối đa 5.000 dòng mỗi lần' });
    }

    const normalizedRows = rows
      .map(normalizeCampaignRow)
      .map(enrichCampaignRow)
      .filter(row => row.campaignName);

    if (normalizedRows.length === 0) {
      return res.status(400).json({ error: 'Không tìm thấy chiến dịch hợp lệ trong file báo cáo' });
    }

    const dateValues = normalizedRows
      .flatMap(row => [row.reportStart, row.reportEnd])
      .filter(Boolean)
      .sort((a, b) => a - b);

    const report = await MarketingCampaignReport.create({
      fileName: String(fileName || 'facebook-ads-report.xlsx').trim(),
      reportStart: dateValues[0] || null,
      reportEnd: dateValues[dateValues.length - 1] || null,
      rowCount: normalizedRows.length,
      totals: calculateCampaignTotals(normalizedRows),
      rows: normalizedRows,
      uploadedBy: req.user._id
    });

    const populated = await MarketingCampaignReport.findById(report._id)
      .populate('uploadedBy', 'fullName role department');

    res.status(201).json({ report: serializeCampaignReport(populated), message: 'Đã trích xuất và lưu báo cáo Facebook Ads' });
  } catch (error) {
    console.error('Create marketing campaign report error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/customers/upcoming-contacts
 * Danh sách cuộc gọi / liên hệ chăm sóc sắp tới của nhân viên
 */
router.get('/upcoming-contacts', async (req, res) => {
  try {
    const list = await Customer.find({
      assignedTo: req.user._id,
      nextContactDate: { $exists: true, $ne: null }
    })
    .populate('createdBy', 'fullName')
    .sort({ nextContactDate: 1 });
    res.json({ list });
  } catch (error) {
    console.error('Get upcoming contacts error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/customers/:id
 * Chi tiết khách hàng + lịch sử đặt tour
 */
router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate('createdBy', 'fullName')
      .populate('assignedTo', 'fullName')
      .populate('contactHistory.contactedBy', 'fullName');
    if (!customer) {
      return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
    }

    // Tìm các booking có số điện thoại trùng hoặc chứa thông tin khách hàng
    const bookings = await Booking.find({
      $or: [
        { customerPhone: customer.phone },
        { customerEmail: customer.email && customer.email.length > 0 ? customer.email : 'NON_EXISTENT' }
      ]
    }).populate('tour', 'name code departureDate').sort({ createdAt: -1 });

    res.json({ customer, bookings });
  } catch (error) {
    console.error('Get customer detail error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * POST /api/customers
 * Tạo khách hàng mới
 */
router.post('/', async (req, res) => {
  try {
    const { name, phone, email, address, passportNumber, passportExpiry, source, status, notes, nextContactDate, nextContactNote, assignedTo } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Vui lòng nhập tên và số điện thoại khách hàng' });
    }

    const existingPhone = await Customer.findOne({ phone: phone.trim() });
    if (existingPhone) {
      return res.status(400).json({ error: `Số điện thoại ${phone} đã tồn tại trong hệ thống với mã ${existingPhone.code}` });
    }

    const code = await generateCode('CUS', Customer);
    
    const contactHistory = [];
    if (notes && notes.trim().length > 0) {
      contactHistory.push({
        note: notes.trim(),
        contactedBy: req.user._id,
        contactDate: new Date()
      });
    }

    const customer = new Customer({
      code,
      name,
      phone: phone.trim(),
      email,
      address,
      passportNumber,
      passportExpiry: passportExpiry || null,
      source: source || 'direct',
      status: status || 'potential',
      notes,
      nextContactDate: nextContactDate || null,
      nextContactNote: nextContactNote || '',
      assignedTo: assignedTo || req.user._id,
      contactHistory,
      createdBy: req.user._id
    });

    await customer.save();
    res.status(201).json({ customer, message: 'Thêm khách hàng thành công!' });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * PUT /api/customers/:id
 * Cập nhật thông tin khách hàng
 */
router.put('/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
    }

    const allowed = ['name', 'phone', 'email', 'address', 'passportNumber', 'passportExpiry', 'source', 'status', 'notes', 'nextContactDate', 'nextContactNote', 'assignedTo'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'passportExpiry' || field === 'nextContactDate') {
          customer[field] = req.body[field] ? new Date(req.body[field]) : null;
        } else {
          customer[field] = req.body[field];
        }
      }
    });

    await customer.save();
    res.json({ customer, message: 'Cập nhật khách hàng thành công!' });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * POST /api/customers/:id/contact-history
 * Ghi nhận lịch sử liên hệ / ghi chú cuộc gọi mới
 */
router.post('/:id/contact-history', async (req, res) => {
  try {
    const { note, nextContactDate, nextContactNote } = req.body;
    if (!note) {
      return res.status(400).json({ error: 'Vui lòng nhập ghi chú cuộc gọi' });
    }

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
    }

    // Đẩy vào mảng lịch sử liên hệ
    customer.contactHistory.push({
      note,
      contactedBy: req.user._id,
      contactDate: new Date()
    });

    // Cập nhật notes chung bằng cách prepend ghi chú mới vào đầu
    customer.notes = `${note}\n-----------------\n${customer.notes || ''}`;

    // Cập nhật lịch hẹn liên hệ tiếp theo nếu có truyền lên
    if (nextContactDate !== undefined) {
      customer.nextContactDate = nextContactDate ? new Date(nextContactDate) : null;
    }
    if (nextContactNote !== undefined) {
      customer.nextContactNote = nextContactNote || '';
    }

    await customer.save();

    // Populate thông tin người liên hệ trước khi trả về client
    const updatedCustomer = await Customer.findById(customer._id)
      .populate('createdBy', 'fullName')
      .populate('assignedTo', 'fullName')
      .populate('contactHistory.contactedBy', 'fullName');

    res.json({ customer: updatedCustomer, message: 'Đã ghi nhận lịch sử liên hệ thành công!' });
  } catch (error) {
    console.error('Add contact history error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * DELETE /api/customers/:id
 * Xóa khách hàng
 */
router.delete('/:id', async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
    }
    res.json({ message: 'Đã xóa thông tin khách hàng' });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
