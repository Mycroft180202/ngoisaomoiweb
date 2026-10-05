const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { generateCode } = require('../utils/codeGenerator');

/**
 * GET /api/tickets
 * Danh sách tickets (filter)
 * Quyền: Tất cả nhân viên — chỉ thấy ticket mình tạo hoặc ticket gửi đến phòng ban của mình
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, status, targetDepartment, category, search } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (targetDepartment) filter.targetDepartment = targetDepartment;
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    // Phân quyền: Director được xem tất cả
    // Nhân viên khác chỉ thấy ticket mình tạo hoặc ticket gửi đến phòng ban của mình
    if (req.user.role !== 'director') {
      const permissionFilter = {
        $or: [
          { requester: req.user._id },
          { targetDepartment: req.user.department },
          { assignee: req.user._id }
        ]
      };
      // Luôn dùng $and để gộp filter an toàn, tránh ghi đè $or
      const conditions = [permissionFilter];
      // Di chuyển filter hiện tại vào $and
      const existingFilter = { ...filter };
      delete existingFilter.$and; // tránh nested $and
      if (Object.keys(existingFilter).length > 0) {
        conditions.push(existingFilter);
        // Xóa keys đã di chuyển khỏi filter gốc
        Object.keys(existingFilter).forEach(k => delete filter[k]);
      }
      filter.$and = conditions;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [tickets, total] = await Promise.all([
      Ticket.find(filter)
        .populate('requester', 'fullName avatar department')
        .populate('assignee', 'fullName avatar department')
        .populate('comments.user', 'fullName avatar')
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Ticket.countDocuments(filter)
    ]);

    res.json({
      tickets,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/tickets/:id
 * Chi tiết 1 ticket
 */
router.get('/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('requester', 'fullName avatar department email')
      .populate('assignee', 'fullName avatar department email')
      .populate('comments.user', 'fullName avatar');

    if (!ticket) {
      return res.status(404).json({ error: 'Không tìm thấy ticket' });
    }

    // Kiểm tra quyền xem
    if (req.user.role !== 'director') {
      const isRequester = ticket.requester._id.toString() === req.user._id.toString();
      const isTargetDept = ticket.targetDepartment === req.user.department;
      const isAssignee = ticket.assignee && ticket.assignee._id.toString() === req.user._id.toString();
      if (!isRequester && !isTargetDept && !isAssignee) {
        return res.status(403).json({ error: 'Bạn không có quyền xem ticket này' });
      }
    }

    res.json({ ticket });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * POST /api/tickets
 * Tạo ticket mới
 */
router.post('/', async (req, res) => {
  try {
    const { title, description, category, priority, targetDepartment } = req.body;

    if (!title || !targetDepartment) {
      return res.status(400).json({ error: 'Vui lòng nhập tiêu đề và chọn phòng ban hỗ trợ' });
    }

    // Không cho gửi ticket đến chính phòng ban của mình (trừ Director)
    if (req.user.role !== 'director' && targetDepartment === req.user.department) {
      return res.status(400).json({ error: 'Không thể gửi yêu cầu hỗ trợ đến chính phòng ban của bạn. Vui lòng liên hệ trưởng phòng trực tiếp.' });
    }

    // Auto-generate code (atomic, race-condition safe)
    const code = await generateCode('TK', 3);

    const ticket = new Ticket({
      code,
      title,
      description,
      category: category || 'other',
      priority: priority || 'medium',
      requester: req.user._id,
      requesterDepartment: req.user.department,
      targetDepartment
    });

    await ticket.save();

    // Gửi thông báo đến Trưởng phòng của phòng ban đích
    const targetManagers = await User.find({
      department: targetDepartment,
      role: { $regex: /manager/i }
    });

    for (const manager of targetManagers) {
      await Notification.create({
        user: manager._id,
        type: 'ticket',
        title: 'Yêu cầu hỗ trợ mới',
        message: `${req.user.fullName} gửi yêu cầu hỗ trợ: "${title}"`,
        link: '/tickets'
      });
    }

    // Nếu không có manager, gửi thông báo đến tất cả nhân viên phòng ban đích
    if (targetManagers.length === 0) {
      const targetStaff = await User.find({ department: targetDepartment });
      for (const staff of targetStaff) {
        await Notification.create({
          user: staff._id,
          type: 'ticket',
          title: 'Yêu cầu hỗ trợ mới',
          message: `${req.user.fullName} gửi yêu cầu hỗ trợ: "${title}"`,
          link: '/tickets'
        });
      }
    }

    const populated = await Ticket.findById(ticket._id)
      .populate('requester', 'fullName avatar department')
      .populate('assignee', 'fullName avatar department');

    res.status(201).json({ ticket: populated, message: 'Tạo yêu cầu hỗ trợ thành công' });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * PATCH /api/tickets/:id/assign
 * Nhận xử lý ticket (tự assign cho mình)
 */
router.patch('/:id/assign', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Không tìm thấy ticket' });
    }

    // Chỉ nhân viên thuộc phòng ban đích hoặc Director mới được nhận xử lý
    const isDirector = req.user.role === 'director';
    const isTargetDept = req.user.department === ticket.targetDepartment;
    if (!isDirector && !isTargetDept) {
      return res.status(403).json({ error: 'Bạn không thuộc phòng ban được yêu cầu hỗ trợ' });
    }

    // Nếu ticket đã có người xử lý
    if (ticket.assignee) {
      return res.status(400).json({ error: 'Ticket này đã có người tiếp nhận xử lý' });
    }

    ticket.assignee = req.user._id;
    ticket.status = 'assigned';
    await ticket.save();

    // Gửi thông báo đến người tạo ticket
    await Notification.create({
      user: ticket.requester,
      type: 'ticket',
      title: 'Ticket đã được tiếp nhận',
      message: `${req.user.fullName} đã tiếp nhận xử lý yêu cầu "${ticket.title}"`,
      link: '/tickets'
    });

    const populated = await Ticket.findById(ticket._id)
      .populate('requester', 'fullName avatar department')
      .populate('assignee', 'fullName avatar department')
      .populate('comments.user', 'fullName avatar');

    res.json({ ticket: populated, message: 'Đã tiếp nhận xử lý ticket' });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * PATCH /api/tickets/:id/status
 * Cập nhật trạng thái ticket
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['in_progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Không tìm thấy ticket' });
    }

    const isDirector = req.user.role === 'director';
    const isRequester = ticket.requester.toString() === req.user._id.toString();
    const isAssignee = ticket.assignee && ticket.assignee.toString() === req.user._id.toString();

    // Người tạo chỉ được đóng ticket khi đã resolved
    if (status === 'closed') {
      if (!isRequester && !isDirector) {
        return res.status(403).json({ error: 'Chỉ người tạo ticket hoặc Giám đốc mới có thể đóng ticket' });
      }
      if (ticket.status !== 'resolved' && !isDirector) {
        return res.status(400).json({ error: 'Chỉ có thể đóng ticket khi đã được giải quyết' });
      }
    }

    // in_progress và resolved chỉ assignee hoặc Director mới được cập nhật
    if ((status === 'in_progress' || status === 'resolved') && !isAssignee && !isDirector) {
      return res.status(403).json({ error: 'Chỉ người xử lý ticket mới có thể cập nhật trạng thái này' });
    }

    // Phải có assignee trước khi chuyển sang in_progress
    if (status === 'in_progress' && !ticket.assignee) {
      return res.status(400).json({ error: 'Ticket cần có người tiếp nhận xử lý trước khi bắt đầu' });
    }

    ticket.status = status;
    if (status === 'resolved') {
      ticket.resolvedAt = new Date();
    }
    await ticket.save();

    // Gửi thông báo
    const statusNames = {
      in_progress: 'Đang xử lý',
      resolved: 'Đã giải quyết',
      closed: 'Đã đóng'
    };

    if (status === 'resolved' && isAssignee) {
      // Thông báo cho người tạo khi ticket được giải quyết
      await Notification.create({
        user: ticket.requester,
        type: 'ticket',
        title: 'Yêu cầu đã được giải quyết',
        message: `${req.user.fullName} đã giải quyết yêu cầu "${ticket.title}"`,
        link: '/tickets'
      });
    } else if (status === 'closed' && isRequester && ticket.assignee) {
      // Thông báo cho assignee khi ticket bị đóng
      await Notification.create({
        user: ticket.assignee,
        type: 'ticket',
        title: 'Ticket đã được đóng',
        message: `${req.user.fullName} đã đóng ticket "${ticket.title}"`,
        link: '/tickets'
      });
    }

    const populated = await Ticket.findById(ticket._id)
      .populate('requester', 'fullName avatar department')
      .populate('assignee', 'fullName avatar department')
      .populate('comments.user', 'fullName avatar');

    res.json({ ticket: populated, message: `Đã cập nhật trạng thái: ${statusNames[status]}` });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * POST /api/tickets/:id/comments
 * Thêm bình luận trao đổi
 */
router.post('/:id/comments', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Vui lòng nhập nội dung' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Không tìm thấy ticket' });
    }

    // Kiểm tra quyền bình luận: requester, assignee, nhân viên phòng ban đích, Director
    const isDirector = req.user.role === 'director';
    const isRequester = ticket.requester.toString() === req.user._id.toString();
    const isAssignee = ticket.assignee && ticket.assignee.toString() === req.user._id.toString();
    const isTargetDept = req.user.department === ticket.targetDepartment;

    if (!isDirector && !isRequester && !isAssignee && !isTargetDept) {
      return res.status(403).json({ error: 'Bạn không có quyền bình luận trong ticket này' });
    }

    ticket.comments.push({
      user: req.user._id,
      content
    });

    await ticket.save();

    // Gửi thông báo cho bên còn lại
    const commentWriterId = req.user._id.toString();
    const shortContent = content.substring(0, 30) + (content.length > 30 ? '...' : '');

    // Thông báo cho người tạo ticket
    if (ticket.requester.toString() !== commentWriterId) {
      await Notification.create({
        user: ticket.requester,
        type: 'ticket',
        title: 'Bình luận mới trong ticket',
        message: `${req.user.fullName} đã bình luận trong "${ticket.title}": "${shortContent}"`,
        link: '/tickets'
      });
    }

    // Thông báo cho người xử lý
    if (ticket.assignee && ticket.assignee.toString() !== commentWriterId) {
      await Notification.create({
        user: ticket.assignee,
        type: 'ticket',
        title: 'Bình luận mới trong ticket',
        message: `${req.user.fullName} đã bình luận trong "${ticket.title}": "${shortContent}"`,
        link: '/tickets'
      });
    }

    const populated = await Ticket.findById(ticket._id)
      .populate('requester', 'fullName avatar department')
      .populate('assignee', 'fullName avatar department')
      .populate('comments.user', 'fullName avatar');

    res.json({ ticket: populated, message: 'Đã thêm bình luận' });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
