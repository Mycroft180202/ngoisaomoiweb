const express = require('express');
const router = express.Router();
const Tour = require('../models/Tour');
const Task = require('../models/Task');
const Approval = require('../models/Approval');
const MeetingRequest = require('../models/MeetingRequest');

/**
 * GET /api/calendar/events
 * Trả về danh sách sự kiện tổng hợp cho lịch: Tour, Deadline Task, Đơn nghỉ phép/đi công tác
 */
router.get('/events', async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();
    const currentMonth = month ? parseInt(month) - 1 : new Date().getMonth();

    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

    const [tours, tasks, approvals, meetings] = await Promise.all([
      Tour.find({
        departureDate: { $gte: startOfMonth, $lte: endOfMonth }
      }).select('name destination departureDate returnDate price status maxSeats bookedSeats'),

      Task.find({
        deadline: { $gte: startOfMonth, $lte: endOfMonth }
      }).populate('assignee', 'fullName').select('title code status priority deadline department'),

      Approval.find({
        status: 'approved',
        $or: [
          { startDate: { $gte: startOfMonth, $lte: endOfMonth } },
          { createdAt: { $gte: startOfMonth, $lte: endOfMonth } }
        ]
      }).populate('createdBy', 'fullName department').select('title type startDate endDate createdBy status')
      ,
      MeetingRequest.find({
        status: 'approved',
        startTime: { $gte: startOfMonth, $lte: endOfMonth },
        $or: [
          { createdBy: req.user._id },
          { departments: req.user.department },
          ...(req.user.role === 'director' || req.user.department === 'it' ? [{}] : [])
        ]
      }).populate('createdBy', 'fullName department').select('title room startTime endTime purpose meetingWithDirector departments createdBy status')
    ]);

    const events = [];

    // Format Tours
    tours.forEach(tour => {
      events.push({
        id: tour._id,
        title: `✈️ Tour: ${tour.name}`,
        date: tour.departureDate,
        endDate: tour.returnDate,
        type: 'tour',
        badgeColor: '#0EA5E9',
        details: `${tour.destination} • Chỗ: ${tour.bookedSeats}/${tour.maxSeats}`
      });
    });

    // Format Tasks
    tasks.forEach(task => {
      events.push({
        id: task._id,
        title: `📋 Deadline: ${task.code} - ${task.title}`,
        date: task.deadline,
        type: 'task',
        badgeColor: task.priority === 'urgent' ? '#EF4444' : '#EAB308',
        details: `Người làm: ${task.assignee?.fullName || 'Chưa giao'} • TR: ${task.status}`
      });
    });

    // Format Approvals (Nghỉ phép, công tác)
    approvals.forEach(app => {
      events.push({
        id: app._id,
        title: `${app.type === 'leave' ? '🏖️ Nghỉ phép' : '💼 Công tác'}: ${app.createdBy?.fullName}`,
        date: app.startDate || app.createdAt,
        endDate: app.endDate,
        type: app.type,
        badgeColor: '#22C55E',
        details: app.title
      });
    });

    meetings.forEach(meeting => {
      events.push({
        id: meeting._id,
        title: `🏢 Họp: ${meeting.title}`,
        date: meeting.startTime,
        endDate: meeting.endTime,
        type: 'meeting',
        badgeColor: '#06B6D4',
        details: `${meeting.room} • ${meeting.purpose}`
      });
    });

    res.json({ events });
  } catch (error) {
    console.error('Get calendar events error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
