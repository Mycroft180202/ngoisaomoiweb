const express = require('express');
const router = express.Router();
const MeetingRequest = require('../models/MeetingRequest');
const Notification = require('../models/Notification');
const User = require('../models/User');

const isAdminUser = (user) => user?.role === 'director' || user?.role === 'it_manager' || user?.department === 'it';
const isManagerUser = (user) => Boolean(user?.role?.includes('manager')) || isAdminUser(user);

const normalizeDepartments = (departments, fallback = []) => {
  const list = Array.isArray(departments) ? departments : String(departments || '').split(',');
  const cleaned = list.map(item => String(item || '').trim()).filter(Boolean);
  if (!cleaned.length && fallback.length) return fallback;
  return [...new Set(cleaned)];
};

const canViewMeeting = (user, meeting) => {
  if (isAdminUser(user)) return true;
  const creatorId = meeting.createdBy?._id || meeting.createdBy;
  if (creatorId?.toString() === user._id.toString()) return true;
  if (meeting.status !== 'approved') return false;
  return (meeting.departments || []).includes(user.department);
};

const canReviewMeeting = (user, meeting) => {
  if (isAdminUser(user)) return true;
  return Boolean(user.role?.includes('manager') && (meeting.departments || []).includes(user.department));
};

const validateMeetingPayload = ({ title, startTime, endTime, purpose, departments }) => {
  if (!title || !String(title).trim()) return 'Vui lòng nhập tiêu đề cuộc họp';
  if (!purpose || !String(purpose).trim()) return 'Vui lòng nhập mục đích cuộc họp';
  if (!startTime || !endTime) return 'Vui lòng chọn thời gian bắt đầu và kết thúc';
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'Thời gian họp không hợp lệ';
  if (end <= start) return 'Thời gian kết thúc phải sau thời gian bắt đầu';
  if ((end - start) > 8 * 60 * 60 * 1000) return 'Một lượt đăng ký họp không nên quá 8 giờ';
  if (!normalizeDepartments(departments).length) return 'Vui lòng chọn ít nhất một phòng/ban liên quan';
  return '';
};

const hasRoomConflict = async ({ room, startTime, endTime, excludeId }) => {
  const conflict = await MeetingRequest.findOne({
    room,
    status: { $in: ['pending', 'approved'] },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    startTime: { $lt: new Date(endTime) },
    endTime: { $gt: new Date(startTime) }
  }).select('_id title startTime endTime');
  return conflict;
};

const notifyReviewers = async (meeting, actor) => {
  if (meeting.status !== 'pending') return;
  const reviewers = await User.find({
    status: 'active',
    _id: { $ne: actor._id },
    $or: [
      { role: 'director' },
      { department: 'it' },
      { role: 'it_manager' },
      { role: { $regex: 'manager' }, department: { $in: meeting.departments || [] } }
    ]
  }).select('_id');

  if (!reviewers.length) return;
  await Notification.insertMany(reviewers.map(user => ({
    user: user._id,
    type: 'system',
    title: 'Đăng ký họp chờ duyệt',
    message: `${actor.fullName} đăng ký "${meeting.title}" tại ${meeting.room}.`,
    link: '/calendar'
  })));
};

const notifyAudience = async (meeting, actor) => {
  if (meeting.status !== 'approved') return;
  const users = await User.find({
    status: 'active',
    _id: { $ne: actor?._id || actor },
    $or: [
      { department: { $in: meeting.departments || [] } },
      ...(meeting.meetingWithDirector ? [{ role: 'director' }] : [])
    ]
  }).select('_id');

  if (!users.length) return;
  await Notification.insertMany(users.map(user => ({
    user: user._id,
    type: 'system',
    title: 'Lịch họp đã được duyệt',
    message: `"${meeting.title}" đã được duyệt tại ${meeting.room}.`,
    link: '/calendar'
  })));
};

router.get('/', async (req, res) => {
  try {
    const { month, year, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (month || year) {
      const currentYear = year ? parseInt(year) : new Date().getFullYear();
      const currentMonth = month ? parseInt(month) - 1 : new Date().getMonth();
      filter.startTime = {
        $gte: new Date(currentYear, currentMonth, 1),
        $lte: new Date(currentYear, currentMonth + 1, 0, 23, 59, 59)
      };
    }

    const meetings = await MeetingRequest.find(filter)
      .populate('createdBy', 'fullName department role')
      .populate('reviewedBy', 'fullName department role')
      .sort({ startTime: 1 });

    res.json({ meetings: meetings.filter(item => canViewMeeting(req.user, item)) });
  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, room = 'Phòng họp T5', startTime, endTime, purpose, meetingWithDirector, departments, attendeesNote } = req.body;
    const validationError = validateMeetingPayload({ title, startTime, endTime, purpose, departments });
    if (validationError) return res.status(400).json({ error: validationError });

    const conflict = await hasRoomConflict({ room, startTime, endTime });
    if (conflict) {
      return res.status(409).json({ error: `Phòng họp đã có lịch "${conflict.title}" trong khung giờ này` });
    }

    const targetDepartments = normalizeDepartments(departments, [req.user.department]);
    const status = isManagerUser(req.user) ? 'approved' : 'pending';
    const meeting = new MeetingRequest({
      title: String(title).trim(),
      room: String(room || 'Phòng họp T5').trim(),
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      purpose: String(purpose).trim(),
      meetingWithDirector: Boolean(meetingWithDirector),
      departments: targetDepartments,
      attendeesNote: String(attendeesNote || '').trim(),
      status,
      createdBy: req.user._id,
      reviewedBy: status === 'approved' ? req.user._id : undefined,
      reviewedAt: status === 'approved' ? new Date() : undefined
    });

    await meeting.save();
    await notifyReviewers(meeting, req.user);
    await notifyAudience(meeting, req.user);

    const populated = await MeetingRequest.findById(meeting._id)
      .populate('createdBy', 'fullName department role')
      .populate('reviewedBy', 'fullName department role');

    res.status(201).json({
      meeting: populated,
      message: status === 'pending' ? 'Đã gửi đăng ký họp và chờ duyệt' : 'Đã đăng ký họp'
    });
  } catch (error) {
    console.error('Create meeting error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

router.patch('/:id/review', async (req, res) => {
  try {
    const { action, reason = '' } = req.body;
    if (!['approve', 'reject', 'cancel'].includes(action)) {
      return res.status(400).json({ error: 'Hành động không hợp lệ' });
    }
    const meeting = await MeetingRequest.findById(req.params.id);
    if (!meeting) return res.status(404).json({ error: 'Không tìm thấy đăng ký họp' });

    const isCreator = meeting.createdBy.toString() === req.user._id.toString();
    if (action === 'cancel') {
      if (!isCreator && !isAdminUser(req.user)) return res.status(403).json({ error: 'Bạn không có quyền hủy lịch họp này' });
      meeting.status = 'cancelled';
    } else {
      if (!canReviewMeeting(req.user, meeting)) return res.status(403).json({ error: 'Bạn không có quyền duyệt lịch họp này' });
      if (action === 'approve') {
        const conflict = await hasRoomConflict({
          room: meeting.room,
          startTime: meeting.startTime,
          endTime: meeting.endTime,
          excludeId: meeting._id
        });
        if (conflict) return res.status(409).json({ error: `Phòng họp đã trùng với lịch "${conflict.title}"` });
      }
      meeting.status = action === 'approve' ? 'approved' : 'rejected';
      meeting.rejectionReason = action === 'reject' ? String(reason || '').trim() : '';
      meeting.reviewedBy = req.user._id;
      meeting.reviewedAt = new Date();
    }

    await meeting.save();
    if (action === 'approve') await notifyAudience(meeting, req.user);

    res.json({ meeting, message: action === 'approve' ? 'Đã duyệt lịch họp' : action === 'reject' ? 'Đã từ chối lịch họp' : 'Đã hủy lịch họp' });
  } catch (error) {
    console.error('Review meeting error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
