const express = require('express');
const router = express.Router();
const Approval = require('../models/Approval');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { requireManager } = require('../middleware/rbac');
const { generateCode } = require('../utils/codeGenerator');

/**
 * GET /api/approvals
 * Danh sách đề xuất
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type, department, tab } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (department) filter.department = department;

    // Tab filtering
    if (tab === 'pending') {
      // Đề xuất chờ tôi duyệt
      if (req.user.role === 'director') {
        filter.status = 'pending_director';
      } else if (req.user.role === 'hr_manager') {
        filter.status = 'pending_manager';
        filter['approvalFlow'] = {
          $elemMatch: {
            status: 'pending',
            reviewer: req.user._id
          }
        };
      } else if (req.user.role.includes('manager')) {
        filter.status = 'pending_manager';
        filter['approvalFlow'] = {
          $elemMatch: {
            status: 'pending',
            reviewer: req.user._id
          }
        };
      }
    } else if (tab === 'my') {
      // Đề xuất tôi tạo
      filter.createdBy = req.user._id;
    } else if (status) {
      filter.status = status;
    }

    // Staff chỉ thấy đề xuất của mình hoặc phòng mình
    if (!['director'].includes(req.user.role) && !req.user.role.includes('manager') && tab !== 'my') {
      filter.$or = [
        { createdBy: req.user._id },
        { department: req.user.department }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [approvals, total] = await Promise.all([
      Approval.find(filter)
        .populate('createdBy', 'fullName department position avatar')
        .populate('approvalFlow.reviewer', 'fullName position')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Approval.countDocuments(filter)
    ]);

    res.json({
      approvals,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get approvals error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/approvals/:id
 * Chi tiết đề xuất
 */
router.get('/:id', async (req, res) => {
  try {
    const approval = await Approval.findById(req.params.id)
      .populate('createdBy', 'fullName department position avatar email')
      .populate('approvalFlow.reviewer', 'fullName position avatar');

    if (!approval) {
      return res.status(404).json({ error: 'Không tìm thấy đề xuất' });
    }

    res.json({ approval });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * POST /api/approvals
 * Tạo đề xuất mới
 */
router.post('/', async (req, res) => {
  try {
    const { type, title, content, amount, attachments } = req.body;

    if (!type || !title) {
      return res.status(400).json({ error: 'Vui lòng nhập loại và tiêu đề đề xuất' });
    }

    // Auto-generate code (atomic, race-condition safe)
    const code = await generateCode('APR', 3);

    // Mọi đề xuất/xin phép đi qua Trưởng phòng Nhân sự trước.
    const hrManager = await User.findOne({
      role: 'hr_manager',
      status: 'active'
    });
    if (!hrManager && req.user.role !== 'director') {
      return res.status(400).json({ error: 'Chưa có Trưởng phòng Nhân sự active để nhận đề xuất' });
    }

    // Xây dựng approval flow
    const approvalFlow = [];

    if (req.user.role !== 'director') {
      approvalFlow.push({
        stepOrder: 1,
        roleRequired: 'manager',
        reviewer: hrManager?._id,
        status: 'pending'
      });
    }

    const approval = new Approval({
      code,
      type,
      title,
      content,
      amount: amount || 0,
      department: req.user.department,
      status: approvalFlow.length > 0
        ? (approvalFlow[0].roleRequired === 'manager' ? 'pending_manager' : 'pending_director')
        : 'approved', // Director tạo → tự duyệt luôn
      approvalFlow,
      attachments,
      createdBy: req.user._id
    });

    await approval.save();

    // Gửi notification cho người duyệt đầu tiên
    if (approvalFlow.length > 0 && approvalFlow[0].reviewer) {
      await Notification.create({
        user: approvalFlow[0].reviewer,
        type: 'approval',
        title: 'Đề xuất mới cần HR duyệt',
        message: `${req.user.fullName} gửi đề xuất: ${title}`,
        link: `/approvals/${approval._id}`
      });
    }

    const populated = await Approval.findById(approval._id)
      .populate('createdBy', 'fullName department position avatar')
      .populate('approvalFlow.reviewer', 'fullName position');

    res.status(201).json({ approval: populated, message: 'Tạo đề xuất thành công' });
  } catch (error) {
    console.error('Create approval error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * PATCH /api/approvals/:id/review
 * Duyệt / Từ chối / Trả lại (Manager, Director)
 */
router.patch('/:id/review', requireManager(), async (req, res) => {
  try {
    const { action, note, requireDirectorApproval } = req.body; // action: 'approved' | 'rejected' | 'returned'

    if (!['approved', 'rejected', 'returned'].includes(action)) {
      return res.status(400).json({ error: 'Hành động không hợp lệ' });
    }

    const approval = await Approval.findById(req.params.id);
    if (!approval) {
      return res.status(404).json({ error: 'Không tìm thấy đề xuất' });
    }

    // Tìm step hiện tại cần duyệt
    const currentStep = approval.approvalFlow.find(step => step.status === 'pending');
    if (!currentStep) {
      return res.status(400).json({ error: 'Đề xuất này đã được xử lý' });
    }

    // Kiểm tra quyền duyệt
    const isDirector = req.user.role === 'director' && currentStep.roleRequired === 'director';
    const isAssignedReviewer = currentStep.reviewer?.toString() === req.user._id.toString();
    const isManager = req.user.role.includes('manager') && currentStep.roleRequired === 'manager' && isAssignedReviewer;
    if (!isDirector && !isManager) {
      return res.status(403).json({ error: 'Bạn không có quyền duyệt đề xuất này' });
    }

    // Cập nhật step
    currentStep.status = action;
    currentStep.reviewer = req.user._id;
    currentStep.note = note || '';
    currentStep.reviewedAt = new Date();

    if (action === 'approved') {
      let nextStep = approval.approvalFlow.find(
        step => step.stepOrder > currentStep.stepOrder && step.status === 'pending'
      );

      if (!nextStep && currentStep.roleRequired === 'manager' && req.user.role === 'hr_manager' && requireDirectorApproval) {
        const director = await User.findOne({ role: 'director', status: 'active' });
        approval.approvalFlow.push({
          stepOrder: currentStep.stepOrder + 1,
          roleRequired: 'director',
          reviewer: director?._id,
          status: 'pending'
        });
        nextStep = approval.approvalFlow[approval.approvalFlow.length - 1];
      }

      if (nextStep) {
        approval.status = nextStep.roleRequired === 'director' ? 'pending_director' : 'pending_manager';

        // Notify người duyệt tiếp
        if (nextStep.reviewer) {
          await Notification.create({
            user: nextStep.reviewer,
            type: 'approval',
            title: 'Đề xuất cần duyệt',
            message: `Đề xuất "${approval.title}" đã qua bước duyệt, cần bạn xét duyệt tiếp`,
            link: `/approvals/${approval._id}`
          });
        }
      } else {
        approval.status = 'approved';
      }
    } else if (action === 'rejected') {
      approval.status = 'rejected';
    } else if (action === 'returned') {
      approval.status = 'returned';
      // Reset tất cả steps
      approval.approvalFlow.forEach(step => {
        step.status = 'pending';
        step.reviewedAt = undefined;
        step.note = '';
      });
    }

    await approval.save();

    // Notify người tạo
    const statusText = action === 'approved' ? 'được duyệt' : action === 'rejected' ? 'bị từ chối' : 'cần bổ sung';
    await Notification.create({
      user: approval.createdBy,
      type: 'approval',
      title: `Đề xuất ${statusText}`,
      message: `Đề xuất "${approval.title}" đã ${statusText} bởi ${req.user.fullName}`,
      link: `/approvals/${approval._id}`
    });

    const populated = await Approval.findById(approval._id)
      .populate('createdBy', 'fullName department position avatar')
      .populate('approvalFlow.reviewer', 'fullName position');

    res.json({ approval: populated, message: `Đã ${statusText} đề xuất` });
  } catch (error) {
    console.error('Review approval error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * DELETE /api/approvals/:id
 * Hủy đề xuất (chỉ owner, khi còn draft/returned)
 */
router.delete('/:id', async (req, res) => {
  try {
    const approval = await Approval.findById(req.params.id);
    if (!approval) {
      return res.status(404).json({ error: 'Không tìm thấy đề xuất' });
    }

    if (approval.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'director') {
      return res.status(403).json({ error: 'Bạn không có quyền xóa' });
    }

    if (!['draft', 'returned'].includes(approval.status) && req.user.role !== 'director') {
      return res.status(400).json({ error: 'Chỉ có thể xóa đề xuất nháp hoặc đã trả lại' });
    }

    await Approval.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xóa đề xuất' });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
