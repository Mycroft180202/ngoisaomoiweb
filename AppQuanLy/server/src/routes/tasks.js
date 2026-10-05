const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { generateCode } = require('../utils/codeGenerator');

/**
 * GET /api/tasks
 * Danh sách task (filter)
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, status, department, assignee, priority, search, startDate, endDate } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (department) filter.department = department;
    if (assignee) filter.assignee = assignee;
    if (priority) filter.priority = priority;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    // Phân quyền: Director được xem tất cả các đầu việc của mọi phòng ban
    // Trưởng phòng và nhân viên chỉ thấy task thuộc phòng ban mình hoặc liên quan đến mình (được giao/tạo bởi mình)
    let permissionFilter = null;
    if (req.user.role !== 'director') {
      permissionFilter = {
        $or: [
          { department: req.user.department },
          { assignee: req.user._id },
          { createdBy: req.user._id }
        ]
      };
    }

    // Lọc theo tuần (tuần hiện tại/tuần chọn + dồn công việc chưa hoàn thành từ tuần trước)
    let timeFilter = null;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      timeFilter = {
        $or: [
          // A: Việc trong tuần
          { createdAt: { $gte: start, $lte: end } },
          // B: Việc trễ hạn của tuần cũ (chưa hoàn thành và chưa hủy)
          {
            status: { $in: ['todo', 'in_progress', 'review'] },
            createdAt: { $lt: start }
          }
        ]
      };
    }

    // Gộp tất cả các bộ lọc vào query filter
    const queryConditions = [];
    if (permissionFilter) queryConditions.push(permissionFilter);
    if (timeFilter) queryConditions.push(timeFilter);

    if (queryConditions.length > 0) {
      filter.$and = queryConditions;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('assignee', 'fullName avatar department')
        .populate('createdBy', 'fullName')
        .populate('comments.user', 'fullName avatar')
        .sort({ isPinned: -1, priority: -1, deadline: 1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Task.countDocuments(filter)
    ]);

    res.json({
      tasks,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/tasks/:id
 * Chi tiết task
 */
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'fullName avatar department email')
      .populate('createdBy', 'fullName avatar')
      .populate('comments.user', 'fullName avatar');

    if (!task) {
      return res.status(404).json({ error: 'Không tìm thấy công việc' });
    }

    // Kiểm tra quyền xem chi tiết công việc
    if (req.user.role !== 'director') {
      const creatorId = task.createdBy?._id?.toString() || task.createdBy?.toString();
      const assigneeId = task.assignee?._id?.toString() || task.assignee?.toString();
      const isAssignee = assigneeId === req.user._id.toString();
      const isCreator = creatorId === req.user._id.toString();
      const isSameDept = task.department === req.user.department;
      if (!isAssignee && !isCreator && !isSameDept) {
        return res.status(403).json({ error: 'Bạn không có quyền xem công việc này' });
      }
    }

    res.json({ task });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * POST /api/tasks
 * Tạo task mới
 */
router.post('/', async (req, res) => {
  try {
    const { title, description, priority, assignee, department, deadline, tags, subtasks } = req.body;

    if (!title || !department) {
      return res.status(400).json({ error: 'Vui lòng nhập tiêu đề và phòng ban' });
    }

    // RBAC validation
    if (req.user.role !== 'director') {
      if (department !== req.user.department) {
        return res.status(403).json({ error: 'Bạn chỉ được tạo công việc thuộc phòng ban của mình' });
      }
      if (assignee) {
        const assigneeUser = await User.findById(assignee);
        if (!assigneeUser || assigneeUser.department !== req.user.department) {
          return res.status(403).json({ error: 'Bạn chỉ được phân bổ công việc cho nhân viên thuộc phòng ban của mình' });
        }
      }
    }

    // Auto-generate code (atomic, race-condition safe)
    const code = await generateCode('TASK', 3);

    const task = new Task({
      code,
      title,
      description,
      priority: priority || 'medium',
      assignee,
      department,
      deadline,
      tags,
      subtasks,
      createdBy: req.user._id
    });

    await task.save();

    // Tạo notification cho người được giao
    if (assignee && assignee !== req.user._id.toString()) {
      await Notification.create({
        user: assignee,
        type: 'task',
        title: 'Công việc mới',
        message: `Bạn được giao công việc: ${title}`,
        link: `/tasks/${task._id}`
      });
    }

    const populated = await Task.findById(task._id)
      .populate('assignee', 'fullName avatar department')
      .populate('createdBy', 'fullName');

    res.status(201).json({ task: populated, message: 'Tạo công việc thành công' });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * PUT /api/tasks/:id
 * Cập nhật task
 */
router.put('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Không tìm thấy công việc' });
    }

    // Permission check for editing
    const isCreator = task.createdBy.toString() === req.user._id.toString();
    const isAssignee = task.assignee && task.assignee.toString() === req.user._id.toString();
    const isManagerOfDept = req.user.role.includes('manager') && req.user.department === task.department;
    const isDirector = req.user.role === 'director';

    if (!isCreator && !isAssignee && !isManagerOfDept && !isDirector) {
      return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa công việc này' });
    }

    // RBAC validation for updates
    if (req.user.role !== 'director') {
      if (req.body.department && req.body.department !== req.user.department) {
        return res.status(403).json({ error: 'Bạn chỉ được cập nhật công việc thuộc phòng ban của mình' });
      }
      if (req.body.assignee) {
        const assigneeUser = await User.findById(req.body.assignee);
        if (!assigneeUser || assigneeUser.department !== req.user.department) {
          return res.status(403).json({ error: 'Bạn chỉ được phân bổ công việc cho nhân viên thuộc phòng ban của mình' });
        }
      }
    }

    const allowedFields = ['title', 'description', 'priority', 'assignee', 'department', 'deadline', 'tags', 'subtasks'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        task[field] = req.body[field];
      }
    });

    await task.save();

    const populated = await Task.findById(task._id)
      .populate('assignee', 'fullName avatar department')
      .populate('createdBy', 'fullName')
      .populate('comments.user', 'fullName avatar');

    res.json({ task: populated, message: 'Cập nhật thành công' });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * PATCH /api/tasks/:id/status
 * Đổi trạng thái task (Kanban move)
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['todo', 'in_progress', 'review', 'done'].includes(status)) {
      return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Không tìm thấy công việc' });
    }

    // Permission check: Director, manager of task's department, task creator, or task assignee
    const isDirector = req.user.role === 'director';
    const isManagerOfDept = req.user.role.includes('manager') && req.user.department === task.department;
    const isCreator = task.createdBy.toString() === req.user._id.toString();
    const isAssignee = task.assignee && task.assignee.toString() === req.user._id.toString();

    if (!isDirector && !isManagerOfDept && !isCreator && !isAssignee) {
      return res.status(403).json({ error: 'Bạn không có quyền chuyển trạng thái công việc này' });
    }

    // Restrict "done" (Hoàn thành) status changes
    if (status === 'done') {
      const isIT = req.user.department === 'it';
      if (!isDirector && !isIT && !isManagerOfDept) {
        return res.status(403).json({ error: 'Chỉ Giám đốc, Trưởng phòng liên quan hoặc bộ phận IT mới được đánh dấu Hoàn thành công việc.' });
      }
      // Chỉ cho phép chuyển sang Hoàn thành khi task đang ở trạng thái Review
      if (task.status !== 'review') {
        return res.status(400).json({ error: 'Chỉ có thể chuyển sang Hoàn thành khi công việc đang ở trạng thái Review.' });
      }
    }

    // 1-hour status change cooldown (skipped for director, or when transitioning: todo->in_progress, in_progress->review)
    const isProgressiveMove = 
      (task.status === 'todo' && status === 'in_progress') || 
      (task.status === 'in_progress' && status === 'review');

    if (!isDirector && !isProgressiveMove && task.lastStatusChange) {
      const oneHour = 60 * 60 * 1000;
      const timeDiff = new Date() - new Date(task.lastStatusChange);
      if (timeDiff < oneHour) {
        const remainingMinutes = Math.ceil((oneHour - timeDiff) / (60 * 1000));
        return res.status(400).json({ 
          error: `Hành động bị chặn. Vui lòng đợi thêm ${remainingMinutes} phút trước khi di chuyển công việc này tiếp.` 
        });
      }
    }

    task.status = status;
    task.lastStatusChange = new Date();
    await task.save();

    // Gửi thông báo đến người giao việc (creator) nếu người di chuyển khác người giao việc
    if (task.createdBy.toString() !== req.user._id.toString()) {
      const statusNames = {
        todo: 'Mới',
        in_progress: 'Đang làm',
        review: 'Review',
        done: 'Hoàn thành'
      };
      await Notification.create({
        user: task.createdBy,
        type: 'task',
        title: 'Cập nhật trạng thái công việc',
        message: `${req.user.fullName} đã chuyển công việc "${task.title}" sang trạng thái "${statusNames[status]}"`,
        link: `/tasks`
      });
    }

    const populated = await Task.findById(task._id)
      .populate('assignee', 'fullName avatar department')
      .populate('createdBy', 'fullName');

    res.json({ task: populated, message: 'Đã cập nhật trạng thái' });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * POST /api/tasks/:id/comments
 * Thêm comment
 */
router.post('/:id/comments', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Vui lòng nhập nội dung' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Không tìm thấy công việc' });
    }

    task.comments.push({
      user: req.user._id,
      content
    });

    await task.save();

    // Gửi thông báo bình luận mới
    const commentWriterId = req.user._id.toString();
    const shortContent = content.substring(0, 30) + (content.length > 30 ? '...' : '');

    // 1. Thông báo cho người tạo việc
    if (task.createdBy.toString() !== commentWriterId) {
      await Notification.create({
        user: task.createdBy,
        type: 'task',
        title: 'Bình luận mới trong công việc',
        message: `${req.user.fullName} đã bình luận trong "${task.title}": "${shortContent}"`,
        link: `/tasks/${task._id}`
      });
    }

    // 2. Thông báo cho người nhận việc
    if (task.assignee && task.assignee.toString() !== commentWriterId) {
      await Notification.create({
        user: task.assignee,
        type: 'task',
        title: 'Bình luận mới trong công việc',
        message: `${req.user.fullName} đã bình luận trong "${task.title}": "${shortContent}"`,
        link: `/tasks/${task._id}`
      });
    }

    const populated = await Task.findById(task._id)
      .populate('assignee', 'fullName avatar department')
      .populate('createdBy', 'fullName')
      .populate('comments.user', 'fullName avatar');

    res.json({ task: populated, message: 'Đã thêm bình luận' });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * DELETE /api/tasks/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Không tìm thấy công việc' });
    }

    const isDirector = req.user.role === 'director';
    const isIT = req.user.department === 'it';
    const isCreator = task.createdBy.toString() === req.user._id.toString();
    const isManager = req.user.role.includes('manager');

    // Rule: Director và IT được huỷ bất kỳ lúc nào
    if (isDirector || isIT) {
      task.status = 'cancelled';
      await task.save();
      return res.json({ task, message: 'Đã hủy công việc thành công (Lưu trữ)' });
    }

    // Rule: Trưởng phòng tạo task có thể tự hủy trước 12h đêm cùng ngày
    if (isManager && isCreator) {
      const createdDate = new Date(task.createdAt);
      const now = new Date();
      const isSameDay = 
        createdDate.getFullYear() === now.getFullYear() &&
        createdDate.getMonth() === now.getMonth() &&
        createdDate.getDate() === now.getDate();

      if (isSameDay) {
        task.status = 'cancelled';
        await task.save();
        return res.json({ task, message: 'Đã hủy công việc thành công (Lưu trữ)' });
      } else {
        return res.status(403).json({ error: 'Đã quá 12h đêm cùng ngày tạo, bạn không thể tự hủy công việc này' });
      }
    }

    return res.status(403).json({ error: 'Bạn không có quyền hủy công việc này' });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * PATCH /api/tasks/:id/pin
 * Ghim / Bỏ ghim công việc quan trọng
 */
router.patch('/:id/pin', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Không tìm thấy công việc' });
    }

    task.isPinned = !task.isPinned;
    await task.save();

    const populated = await Task.findById(task._id)
      .populate('assignee', 'fullName avatar department')
      .populate('createdBy', 'fullName')
      .populate('comments.user', 'fullName avatar');

    res.json({ task: populated, message: task.isPinned ? 'Đã ghim công việc' : 'Đã bỏ ghim công việc' });
  } catch (error) {
    console.error('Pin task error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
