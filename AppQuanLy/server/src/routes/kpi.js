const express = require('express');
const router = express.Router();
const KPI = require('../models/KPI');
const User = require('../models/User');
const Task = require('../models/Task');

/**
 * GET /api/kpi/summary
 * Đánh giá tổng quan KPI phòng ban hoặc cá nhân
 */
router.get('/summary', async (req, res) => {
  try {
    const { month, department } = req.query;
    const currentMonth = month || new Date().toISOString().slice(0, 7);

    const userFilter = {};
    if (department) userFilter.department = department;

    const users = await User.find(userFilter).select('fullName department role position avatar');
    const userIds = users.map(u => u._id);

    const kpiRecords = await KPI.find({ user: { $in: userIds }, month: currentMonth });

    const results = await Promise.all(users.map(async (u) => {
      let kpi = kpiRecords.find(k => k.user.toString() === u._id.toString());
      
      // Tự động tính sơ bộ nếu chưa có bản ghi
      if (!kpi) {
        const completedTasksCount = await Task.countDocuments({ assignee: u._id, status: 'done' });
        const totalTasksCount = await Task.countDocuments({ assignee: u._id });
        const calcTaskScore = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 85;

        kpi = {
          user: u._id,
          month: currentMonth,
          taskScore: calcTaskScore,
          revenueScore: 85,
          disciplineScore: 95,
          managerReview: 'Hoàn thành nhiệm vụ'
        };
      } else {
        kpi = kpi.toObject();
      }

      const overallScore = Math.round((kpi.taskScore + kpi.revenueScore + kpi.disciplineScore) / 3);
      return {
        ...kpi,
        userInfo: u,
        overallScore,
        grade: overallScore >= 90 ? 'A (Xuất sắc)' : overallScore >= 80 ? 'B (Tốt)' : overallScore >= 70 ? 'C (Khá)' : 'D (Cần cố gắng)'
      };
    }));

    res.json({ results, month: currentMonth });
  } catch (error) {
    console.error('Get KPI summary error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * POST /api/kpi/evaluate
 * Đánh giá/cập nhật điểm KPI cho nhân viên
 */
router.post('/evaluate', async (req, res) => {
  try {
    const { userId, month, taskScore, revenueScore, disciplineScore, managerReview } = req.body;
    if (!userId || !month) {
      return res.status(400).json({ error: 'Vui lòng chọn nhân viên và tháng đánh giá' });
    }

    let kpi = await KPI.findOne({ user: userId, month });
    if (kpi) {
      if (taskScore !== undefined) kpi.taskScore = taskScore;
      if (revenueScore !== undefined) kpi.revenueScore = revenueScore;
      if (disciplineScore !== undefined) kpi.disciplineScore = disciplineScore;
      if (managerReview !== undefined) kpi.managerReview = managerReview;
      kpi.evaluatedBy = req.user._id;
    } else {
      kpi = new KPI({
        user: userId,
        month,
        taskScore: taskScore || 80,
        revenueScore: revenueScore || 80,
        disciplineScore: disciplineScore || 100,
        managerReview: managerReview || '',
        evaluatedBy: req.user._id
      });
    }

    await kpi.save();
    res.json({ kpi, message: 'Cập nhật KPI thành công!' });
  } catch (error) {
    console.error('Evaluate KPI error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
