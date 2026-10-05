const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const CompanySetting = require('../models/CompanySetting');
const upload = require('../middleware/upload');
const { createLog } = require('./activity');
const { requirePermission } = require('../middleware/rbac');

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  return (forwarded || req.socket.remoteAddress || '').split(',')[0].trim().replace(/^::ffff:/, '');
};

const formatLogTime = (value) => value
  ? new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value))
  : '—';

const attendanceStatusLabels = {
  present: 'Đúng giờ',
  late: 'Đi muộn',
  half_day: 'Nghỉ nửa ngày',
  missing_checkout: 'Quên chấm công ra về',
  leave: 'Nghỉ phép',
  holiday: 'Nghỉ lễ',
  company_trip: 'Du lịch công ty',
  off_day: 'Ngày nghỉ tuần'
};

const workedAttendanceStatuses = ['present', 'late', 'half_day', 'missing_checkout'];

// Xác thực quyền ở server trước khi client tạo tệp Excel.
router.post('/authorize-export', requirePermission('attendance.export'), (req, res) => {
  res.json({ allowed: true });
});

// Helper lấy chuỗi ngày hôm nay YYYY-MM-DD
const getTodayString = () => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
};

// Helper lấy cấu hình chấm công chung
const getGlobalRules = async () => {
  let config = await CompanySetting.findOne({ key: 'global_attendance_rules' });
  if (!config) {
    return {
      checkInTime: '08:30',
      checkOutTime: '17:30',
      allowedLateMinutes: 0,
      standardWorkHours: 8,
      allowOvertime: false,
      lunchBreakStart: '12:00',
      lunchBreakEnd: '13:00'
    };
  }
  return config.value;
};

// Helper lấy danh sách ngày đặc biệt
const getSpecialDays = async () => {
  let config = await CompanySetting.findOne({ key: 'special_days_calendar' });
  return config ? config.value : [];
};

// Tạo thời điểm theo múi giờ công ty. Container production chạy UTC, vì vậy
// không dùng setHours() theo timezone của server cho giờ nghỉ trưa.
const createVietnamTime = (date, time) => {
  const normalizedTime = /^\d{2}:\d{2}$/.test(time) ? `${time}:00` : time;
  return new Date(`${date}T${normalizedTime}+07:00`);
};

const isSaturday = (date) => {
  const [year, month, day] = String(date || '').split('-').map(Number);
  return Boolean(year && month && day) && new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 6;
};

const getStandardWorkHoursForDate = (date, rules, specialDays = []) => {
  const specialDay = specialDays.find((item) => item.date === date);
  // Thứ Bảy là ca làm tiêu chuẩn nửa ngày (4 giờ), nhưng vẫn là một
  // ngày đi làm đầy đủ và phải được ghi nhận trạng thái "present".
  if (isSaturday(date) || specialDay?.type === 'half_day') return 4;
  return Number(rules.standardWorkHours) || 8;
};

// Dung sai chấm công: không làm tròn giảm thời gian thực tế và từ x.8 giờ
// được ghi nhận thành giờ kế tiếp (ví dụ 3.8 -> 4, 7.9 -> 8).
const roundFriendlyWorkHours = (hours) => {
  const rawValue = Math.max(0, Number(hours) || 0);
  const value = Math.ceil((rawValue - Number.EPSILON) * 10) / 10;
  return value - Math.floor(value) >= 0.8 ? Math.ceil(value) : value;
};

const getVietnamTimeParts = (value) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(new Date(value));
  return {
    hour: Number(parts.find((part) => part.type === 'hour')?.value || 0),
    minute: Number(parts.find((part) => part.type === 'minute')?.value || 0)
  };
};

const resolveWorkedDayStatus = ({ checkIn, workHours, standardWorkHours, rules }) => {
  const { hour, minute } = getVietnamTimeParts(checkIn);
  if (hour >= 13) return 'half_day';

  const [ruleHour, ruleMinute] = String(rules.checkInTime || '08:30').split(':').map(Number);
  const allowedLateMinutes = Number(rules.allowedLateMinutes) || 0;
  const lateLimit = ruleHour * 60 + ruleMinute + allowedLateMinutes;
  const checkInMinutes = hour * 60 + minute;
  if (allowedLateMinutes > 0 ? checkInMinutes >= lateLimit : checkInMinutes > lateLimit) return 'late';

  return workHours >= standardWorkHours ? 'present' : 'half_day';
};

const withEffectiveAttendanceStatus = (record) => {
  const item = typeof record?.toObject === 'function' ? record.toObject() : { ...record };
  const protectedStatuses = ['leave', 'holiday', 'company_trip', 'off_day'];
  if (item.checkIn && !item.checkOut && item.date < getTodayString() && !protectedStatuses.includes(item.status)) {
    item.status = 'missing_checkout';
  }
  return item;
};

const calculateWorkSummary = async ({ checkIn, checkOut, date, fallbackOvertimeHours = 0, overtimeApproved = false }) => {
  if (!checkIn || !checkOut) {
    return {
      workHours: 0,
      overtimeHours: Number(fallbackOvertimeHours) || 0
    };
  }

  const rules = await getGlobalRules();
  const checkInTime = new Date(checkIn);
  const checkOutTime = new Date(checkOut);
  if (Number.isNaN(checkInTime.getTime()) || Number.isNaN(checkOutTime.getTime()) || checkOutTime <= checkInTime) {
    return {
      workHours: 0,
      overtimeHours: Number(fallbackOvertimeHours) || 0
    };
  }

  let hours = Math.max(0, (checkOutTime - checkInTime) / (1000 * 60 * 60));

  if (rules.lunchBreakStart && rules.lunchBreakEnd) {
    const workDate = date || new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(checkInTime);
    const lunchStart = createVietnamTime(workDate, rules.lunchBreakStart);
    const lunchEnd = createVietnamTime(workDate, rules.lunchBreakEnd);

    const overlapStart = checkInTime > lunchStart ? checkInTime : lunchStart;
    const overlapEnd = checkOutTime < lunchEnd ? checkOutTime : lunchEnd;
    if (overlapStart < overlapEnd) {
      hours -= (overlapEnd - overlapStart) / (1000 * 60 * 60);
    }
  }

  hours = roundFriendlyWorkHours(hours);

  const specialDays = await getSpecialDays();
  const standardWorkHours = getStandardWorkHoursForDate(date, rules, specialDays);
  let overtime = 0;
  if (rules.allowOvertime && overtimeApproved && hours > standardWorkHours) {
    overtime = roundFriendlyWorkHours(hours - standardWorkHours);
  }

  return {
    workHours: hours,
    overtimeHours: overtime,
    standardWorkHours
  };
};

/**
 * GET /api/attendance/today
 * Lấy trạng thái chấm công hôm nay của user hiện tại
 */
router.get('/today', async (req, res) => {
  try {
    const todayStr = getTodayString();
    const attendance = await Attendance.findOne({ user: req.user._id, date: todayStr });
    res.json({ attendance: attendance || null, attendanceRequired: req.user.attendanceRequired !== false });
  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// Helper xác thực Wi-Fi
const verifyWifi = async (req) => {
  try {
    const config = await CompanySetting.findOne({ key: 'wifi_attendance_config' });
    if (config && config.value && config.value.enabled) {
      const { allowedIPs = [], allowedSSIDs = [] } = config.value;
      
      const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
      const cleanIp = clientIp.replace(/^::ffff:/, '');
      const clientSSID = req.body.wifiSSID;

      // 1. So khớp SSID trước (dành cho Desktop App)
      if (clientSSID && allowedSSIDs.some(ssid => ssid.toLowerCase() === clientSSID.toLowerCase())) {
        return { verified: true };
      }

      // 2. So khớp IP Public
      if (allowedIPs.length > 0) {
        if (allowedIPs.includes(cleanIp) || allowedIPs.includes(clientIp)) {
          return { verified: true };
        }
      }

      return { 
        verified: false, 
        error: `Không thể chấm công. Bạn phải kết nối Wi-Fi công ty.\nIP hiện tại của bạn: ${cleanIp}` + (clientSSID ? `\nWi-Fi SSID hiện tại: ${clientSSID}` : '')
      };
    }
    return { verified: true };
  } catch (err) {
    console.error('Verify Wi-Fi error:', err);
    return { verified: false, error: 'Lỗi xác thực Wi-Fi hệ thống' };
  }
};

/**
 * GET /api/attendance/wifi-config
 * Lấy cấu hình Wi-Fi chấm công (Chỉ dành cho Director, IT, HR Manager)
 */
router.get('/wifi-config', async (req, res) => {
  try {
    const { role } = req.user;
    if (role !== 'director' && role !== 'it_manager' && role !== 'hr_manager') {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập cấu hình Wi-Fi' });
    }

    let config = await CompanySetting.findOne({ key: 'wifi_attendance_config' });
    if (!config) {
      config = {
        key: 'wifi_attendance_config',
        value: {
          enabled: false,
          allowedIPs: [],
          allowedSSIDs: []
        }
      };
    }

    const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    const cleanIp = clientIp.replace(/^::ffff:/, '');

    res.json({
      config: config.value,
      currentIp: cleanIp
    });
  } catch (error) {
    console.error('Get wifi config error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * PUT /api/attendance/wifi-config
 * Cập nhật cấu hình Wi-Fi chấm công (Chỉ dành cho Director, IT, HR Manager)
 */
router.put('/wifi-config', async (req, res) => {
  try {
    const { role } = req.user;
    if (role !== 'director' && role !== 'it_manager' && role !== 'hr_manager') {
      return res.status(403).json({ error: 'Bạn không có quyền cập nhật cấu hình Wi-Fi' });
    }

    const { enabled, allowedIPs, allowedSSIDs } = req.body;

    const cleanIPs = Array.isArray(allowedIPs) 
      ? allowedIPs.map(ip => ip.trim()).filter(ip => ip !== '')
      : [];
    const cleanSSIDs = Array.isArray(allowedSSIDs)
      ? allowedSSIDs.map(ssid => ssid.trim()).filter(ssid => ssid !== '')
      : [];

    let config = await CompanySetting.findOne({ key: 'wifi_attendance_config' });
    if (!config) {
      config = new CompanySetting({
        key: 'wifi_attendance_config',
        value: {
          enabled,
          allowedIPs: cleanIPs,
          allowedSSIDs: cleanSSIDs
        }
      });
    } else {
      config.value = {
        enabled,
        allowedIPs: cleanIPs,
        allowedSSIDs: cleanSSIDs
      };
      config.markModified('value');
    }

    await config.save();

    const statusText = enabled ? 'Bật' : 'Tắt';
    const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    const cleanIp = clientIp.replace(/^::ffff:/, '');
    await createLog(
      req.user._id,
      'UPDATE_WIFI_CONFIG',
      'attendance',
      `Thay đổi cấu hình Wi-Fi chấm công: ${statusText} ràng buộc, IP được phép: [${cleanIPs.join(', ')}], SSID được phép: [${cleanSSIDs.join(', ')}]`,
      cleanIp
    );

    res.json({ config: config.value, message: 'Cập nhật cấu hình Wi-Fi thành công!' });
  } catch (error) {
    console.error('Update wifi config error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/attendance/rules
 * Lấy quy tắc chấm công chung
 */
router.get('/rules', async (req, res) => {
  try {
    const rules = await getGlobalRules();
    res.json({ rules });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * PUT /api/attendance/rules
 * Cập nhật quy tắc chấm công chung (Director, IT, HR Manager)
 */
router.put('/rules', async (req, res) => {
  try {
    const { role } = req.user;
    if (role !== 'director' && role !== 'it_manager' && role !== 'hr_manager') {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }
    const { checkInTime, checkOutTime, allowedLateMinutes, standardWorkHours, allowOvertime, lunchBreakStart, lunchBreakEnd } = req.body;
    let config = await CompanySetting.findOne({ key: 'global_attendance_rules' });
    const newValue = {
      checkInTime: checkInTime || '08:30',
      checkOutTime: checkOutTime || '17:30',
      allowedLateMinutes: Number(allowedLateMinutes) || 0,
      standardWorkHours: Number(standardWorkHours) || 8,
      allowOvertime: !!allowOvertime,
      lunchBreakStart: lunchBreakStart || '12:00',
      lunchBreakEnd: lunchBreakEnd || '13:00'
    };

    if (!config) {
      config = new CompanySetting({ key: 'global_attendance_rules', value: newValue });
    } else {
      config.value = newValue;
      config.markModified('value');
    }
    await config.save();
    
    const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    await createLog(req.user._id, 'UPDATE_ATTENDANCE_RULES', 'attendance', 'Cập nhật quy tắc chấm công chung', clientIp.replace(/^::ffff:/, ''));

    res.json({ rules: config.value, message: 'Cập nhật quy tắc thành công' });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/attendance/special-days
 * Lấy danh sách ngày làm việc đặc biệt / ngày lễ
 */
router.get('/special-days', async (req, res) => {
  try {
    const list = await getSpecialDays();
    res.json({ list });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * PUT /api/attendance/special-days
 * Cập nhật danh sách ngày đặc biệt (Director, IT, HR Manager)
 */
router.put('/special-days', async (req, res) => {
  try {
    const { role } = req.user;
    if (role !== 'director' && role !== 'it_manager' && role !== 'hr_manager') {
      return res.status(403).json({ error: 'Không có quyền cập nhật lịch ngày đặc biệt' });
    }
    const { list } = req.body;
    let config = await CompanySetting.findOne({ key: 'special_days_calendar' });
    if (!config) {
      config = new CompanySetting({ key: 'special_days_calendar', value: list || [] });
    } else {
      config.value = list || [];
      config.markModified('value');
    }
    await config.save();
    
    const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    await createLog(req.user._id, 'UPDATE_SPECIAL_DAYS', 'attendance', 'Cập nhật danh sách ngày đặc biệt/ngày lễ', clientIp.replace(/^::ffff:/, ''));

    res.json({ list: config.value, message: 'Cập nhật lịch ngày đặc biệt thành công' });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * POST /api/attendance/check-in
 * Điểm danh vào ca
 */
router.post('/check-in', async (req, res) => {
  try {
    if (req.user.attendanceRequired === false) {
      return res.status(400).json({ error: 'Tài khoản này không bắt buộc chấm công' });
    }
    // Xác thực kết nối Wi-Fi công ty
    const wifiVerify = await verifyWifi(req);
    if (!wifiVerify.verified) {
      return res.status(400).json({ error: wifiVerify.error });
    }
    const todayStr = getTodayString();
    let attendance = await Attendance.findOne({ user: req.user._id, date: todayStr });

    if (attendance) {
      return res.status(400).json({ error: 'Bạn đã điểm danh vào ca hôm nay rồi' });
    }

    const rules = await getGlobalRules();
    const [ruleHour, ruleMinute] = rules.checkInTime.split(':').map(Number);
    const allowLate = rules.allowedLateMinutes || 0;
    
    const limitTotalMinutes = ruleHour * 60 + ruleMinute + allowLate;

    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    });
    const [hourStr, minuteStr] = formatter.format(now).split(':');
    const localHour = Number(hourStr);
    const localMinute = Number(minuteStr);
    const currentTotalMinutes = localHour * 60 + localMinute;
    
    let isLate = false;
    let computedStatus = 'present';

    if (localHour >= 13) {
      computedStatus = 'half_day';
      isLate = true;
    } else if (allowLate > 0 ? currentTotalMinutes >= limitTotalMinutes : currentTotalMinutes > limitTotalMinutes) {
      computedStatus = 'late';
      isLate = true;
    }

    attendance = new Attendance({
      user: req.user._id,
      date: todayStr,
      checkIn: now,
      status: computedStatus,
      note: req.body.note || ''
    });

    await attendance.save();
    await createLog(
      req.user._id,
      'ATTENDANCE_CHECK_IN',
      'attendance',
      `${req.user.fullName} chấm công vào lúc ${formatLogTime(attendance.checkIn)} ngày ${todayStr} · ${attendanceStatusLabels[computedStatus] || computedStatus}`,
      getClientIp(req)
    );
    
    // Phát sự kiện cập nhật chấm công thời gian thực
    if (req.app.get('io')) {
      req.app.get('io').emit('attendance_update', { date: todayStr });
    }

    let message = 'Điểm danh thành công!';
    if (computedStatus === 'late') message = 'Đã điểm danh vào ca (Đi muộn)';
    if (computedStatus === 'half_day') message = 'Đã điểm danh vào ca (Tính nửa ngày)';
    res.status(201).json({ attendance, message });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * POST /api/attendance/check-out
 * Điểm danh ra ca
 */
router.post('/check-out', async (req, res) => {
  try {
    if (req.user.attendanceRequired === false) {
      return res.status(400).json({ error: 'Tài khoản này không bắt buộc chấm công' });
    }
    // Xác thực kết nối Wi-Fi công ty
    const wifiVerify = await verifyWifi(req);
    if (!wifiVerify.verified) {
      return res.status(400).json({ error: wifiVerify.error });
    }
    const todayStr = getTodayString();
    const attendance = await Attendance.findOne({ user: req.user._id, date: todayStr });

    if (!attendance) {
      return res.status(400).json({ error: 'Bạn chưa điểm danh vào ca hôm nay' });
    }

    if (attendance.checkOut) {
      return res.status(400).json({ error: 'Bạn đã điểm danh ra ca hôm nay rồi' });
    }

    const rules = await getGlobalRules();
    const now = new Date();
    attendance.checkOut = now;
    
    // Tính giờ làm việc (tính bằng giờ, làm tròn 1 chữ số thập phân)
    const diffMs = now - new Date(attendance.checkIn);
    let hours = Math.max(0, parseFloat((diffMs / (1000 * 60 * 60)).toFixed(1)));
    
    // Khấu trừ giờ nghỉ trưa
    if (rules.lunchBreakStart && rules.lunchBreakEnd) {
      const checkInTime = new Date(attendance.checkIn);
      const checkOutTime = now;
      
      const lunchStart = createVietnamTime(todayStr, rules.lunchBreakStart);
      const lunchEnd = createVietnamTime(todayStr, rules.lunchBreakEnd);

      // Overlap logic:
      const overlapStart = checkInTime > lunchStart ? checkInTime : lunchStart;
      const overlapEnd = checkOutTime < lunchEnd ? checkOutTime : lunchEnd;
      
      if (overlapStart < overlapEnd) {
        const overlapMs = overlapEnd - overlapStart;
        const overlapHours = overlapMs / (1000 * 60 * 60);
        hours -= overlapHours;
      }
    }
    
    hours = roundFriendlyWorkHours(hours);
    
    // Xác định số giờ làm tiêu chuẩn cho ngày hôm nay (Check xem có phải ngày làm nửa buổi đặc biệt không)
    const specialDays = await getSpecialDays();
    const currentStandardWorkHours = getStandardWorkHoursForDate(todayStr, rules, specialDays);
    if (isSaturday(todayStr) && hours >= 3.8 && hours < 4) hours = 4;
    
    attendance.workHours = hours;

    // Chấm công ra chỉ ghi nhận giờ làm thực tế. Tăng ca cần quản lý xác nhận riêng.
    attendance.overtimeHours = attendance.overtimeApproved && rules.allowOvertime && hours > currentStandardWorkHours
      ? roundFriendlyWorkHours(hours - currentStandardWorkHours)
      : 0;

    attendance.status = resolveWorkedDayStatus({
      checkIn: attendance.checkIn,
      workHours: hours,
      standardWorkHours: currentStandardWorkHours,
      rules
    });

    await attendance.save();
    await createLog(
      req.user._id,
      'ATTENDANCE_CHECK_OUT',
      'attendance',
      `${req.user.fullName} chấm công ra lúc ${formatLogTime(attendance.checkOut)} ngày ${todayStr} · Tổng ${attendance.workHours} giờ · ${attendanceStatusLabels[attendance.status] || attendance.status}`,
      getClientIp(req)
    );

    // Phát sự kiện cập nhật chấm công thời gian thực
    if (req.app.get('io')) {
      req.app.get('io').emit('attendance_update', { date: todayStr });
    }

    res.json({ attendance, message: 'Điểm danh ra ca thành công!' });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/attendance/my-history
 * Lịch sử chấm công cá nhân
 */
router.get('/my-history', async (req, res) => {
  try {
    const history = await Attendance.find({ user: req.user._id })
      .sort({ date: -1 })
      .limit(31);
    res.json({ history: history.map(withEffectiveAttendanceStatus) });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/attendance/list
 * Báo cáo chấm công cho quản lý (Director, HR, Manager)
 */
router.get('/list', async (req, res) => {
  try {
    const { role, department } = req.user;
    const { date, user: targetUser, month } = req.query;

    const filter = {};
    const isSingleDay = !month; // Khi query theo ngày mới merge nhân viên vắng
    if (month) {
      filter.date = { $regex: `^${month}` };
    } else if (date) {
      filter.date = date;
    } else {
      filter.date = getTodayString();
    }

    if (targetUser) filter.user = targetUser;

    const list = await Attendance.find(filter)
      .populate('user', 'fullName department role avatar position email')
      .sort({ date: 1, checkIn: -1 });

    // Lọc theo phòng ban nếu là manager (trừ HR/Director/IT)
    const filteredList = list.filter(item => {
      if (role === 'director' || department === 'it' || role === 'hr_manager') return true;
      if (role.includes('manager')) return item.user?.department === department;
      return item.user?._id.toString() === req.user._id.toString();
    }).map(withEffectiveAttendanceStatus);

    // Khi query theo ngày đơn lẻ → merge nhân viên chưa có bản ghi (vắng không phép / ngày nghỉ / lễ)
    if (isSingleDay && !targetUser) {
      const queryDate = date || getTodayString();
      
      // Lấy ngày trong tuần (Chủ nhật = 0, Thứ hai = 1,...)
      const [yr, mt, dy] = queryDate.split('-').map(Number);
      const dateObj = new Date(yr, mt - 1, dy);
      const dayOfWeek = dateObj.getDay();

      const specialDays = await getSpecialDays();
      const todaySpecialDay = specialDays.find(d => d.date === queryDate);

      let defaultStatus = 'absent';
      if (todaySpecialDay) {
        if (todaySpecialDay.type === 'holiday') defaultStatus = 'holiday';
        else if (todaySpecialDay.type === 'company_trip') defaultStatus = 'company_trip';
        else if (todaySpecialDay.type === 'off_day') defaultStatus = 'off_day';
      } else if (dayOfWeek === 0) {
        defaultStatus = 'off_day'; // Chủ nhật mặc định là ngày nghỉ
      }

      // Lấy tất cả user active
      let userFilter = {};
      if (role.includes('manager') && role !== 'hr_manager' && role !== 'director' && department !== 'it') {
        userFilter.department = department;
      }
      userFilter.status = 'active';
      userFilter.attendanceRequired = { $ne: false };
      const allUsers = await User.find(userFilter).select('fullName department role avatar position email attendanceRequired').lean();
      
      // Tìm user đã có bản ghi
      const checkedInUserIds = new Set(filteredList.map(item => item.user?._id?.toString()).filter(Boolean));
      
      // Tạo bản ghi "giả" cho user chưa chấm công
      const absentRecords = allUsers
        .filter(u => !checkedInUserIds.has(u._id.toString()))
        .map(u => ({
          _id: null,
          user: u,
          date: queryDate,
          status: defaultStatus,
          checkIn: null,
          checkOut: null,
          workHours: 0,
          overtimeHours: 0,
          note: '',
          evidences: []
        }));
      
      return res.json({ list: [...filteredList, ...absentRecords] });
    }

    res.json({ list: filteredList });
  } catch (error) {
    console.error('Get attendance list error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * POST /api/attendance/manual
 * Thêm mới bản ghi chấm công (dành cho quản lý)
 */
router.post('/manual', async (req, res) => {
  try {
    const { role } = req.user;
    if (role !== 'director' && role !== 'it_manager' && role !== 'hr_manager') {
      return res.status(403).json({ error: 'Không có quyền thêm' });
    }
    const { targetUser, date, status, checkIn, checkOut, workHours, overtimeHours, overtimeApproved, note, proofUrl } = req.body;
    
    let attendance = await Attendance.findOne({ user: targetUser, date });
    if (attendance) {
      return res.status(400).json({ error: 'Đã tồn tại bản ghi chấm công trong ngày này' });
    }

    if (workedAttendanceStatuses.includes(status) && !checkIn) {
      return res.status(400).json({ error: 'Vui lòng nhập giờ vào thực tế cho ngày có làm việc' });
    }
    const nextCheckIn = checkIn ? new Date(checkIn) : null;
    const nextCheckOut = checkOut ? new Date(checkOut) : null;
    if (nextCheckOut && !nextCheckIn) {
      return res.status(400).json({ error: 'Vui lòng nhập giờ vào trước khi nhập giờ ra' });
    }
    if (nextCheckIn && Number.isNaN(nextCheckIn.getTime())) {
      return res.status(400).json({ error: 'Giờ vào không hợp lệ' });
    }
    if (nextCheckOut && Number.isNaN(nextCheckOut.getTime())) {
      return res.status(400).json({ error: 'Giờ ra không hợp lệ' });
    }
    if (nextCheckOut && nextCheckOut <= nextCheckIn) {
      return res.status(400).json({ error: 'Giờ ra phải sau giờ vào' });
    }
    const computed = await calculateWorkSummary({
      checkIn: nextCheckIn,
      checkOut: nextCheckOut,
      date,
      fallbackOvertimeHours: overtimeHours,
      overtimeApproved: overtimeApproved === true
    });

    attendance = new Attendance({
      user: targetUser,
      date,
      status: status || 'leave',
      checkIn: nextCheckIn,
      checkOut: nextCheckOut,
      workHours: nextCheckOut ? computed.workHours : (Number(workHours) || 0),
      overtimeHours: overtimeApproved === true
        ? (nextCheckOut ? computed.overtimeHours : (Number(overtimeHours) || 0))
        : 0,
      overtimeApproved: overtimeApproved === true,
      note: note || '',
      proofUrl: proofUrl || ''
    });

    await attendance.save();
    const targetEmployee = await User.findById(targetUser).select('fullName');
    await createLog(
      req.user._id,
      'CREATE_ATTENDANCE_MANUAL',
      'attendance',
      `${req.user.fullName} thêm chấm công thủ công cho ${targetEmployee?.fullName || 'nhân viên'} ngày ${date}: ${formatLogTime(attendance.checkIn)}–${formatLogTime(attendance.checkOut)}, ${attendance.workHours} giờ, ${attendanceStatusLabels[attendance.status] || attendance.status}`,
      getClientIp(req)
    );

    // Phát sự kiện cập nhật chấm công thời gian thực
    if (req.app.get('io')) {
      req.app.get('io').emit('attendance_update', { date });
    }

    res.status(201).json({ attendance, message: 'Thêm bản ghi chấm công thành công' });
  } catch (error) {
    console.error('Manual attendance error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * PUT /api/attendance/:id
 * Cập nhật bản ghi chấm công (dành cho quản lý)
 */
router.put('/:id', async (req, res) => {
  try {
    const { role } = req.user;
    if (role !== 'director' && role !== 'it_manager' && role !== 'hr_manager') {
      return res.status(403).json({ error: 'Không có quyền cập nhật' });
    }
    const { status, checkIn, checkOut, workHours, overtimeHours, overtimeApproved, note, proofUrl } = req.body;
    
    let attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ error: 'Không tìm thấy bản ghi' });
    }
    const before = {
      checkIn: attendance.checkIn,
      checkOut: attendance.checkOut,
      workHours: attendance.workHours,
      overtimeHours: attendance.overtimeHours,
      overtimeApproved: attendance.overtimeApproved,
      status: attendance.status,
      note: attendance.note
    };

    if (status) attendance.status = status;
    if (checkIn) attendance.checkIn = new Date(checkIn);
    if (checkOut) attendance.checkOut = new Date(checkOut);
    if (attendance.checkIn && attendance.checkOut && attendance.checkOut <= attendance.checkIn) {
      return res.status(400).json({ error: 'Giờ ra phải sau giờ vào' });
    }
    if (attendance.checkIn && attendance.checkOut) {
      const computed = await calculateWorkSummary({
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        date: attendance.date,
        fallbackOvertimeHours: overtimeHours,
        overtimeApproved: overtimeApproved !== undefined ? overtimeApproved === true : attendance.overtimeApproved
      });
      attendance.workHours = computed.workHours;
      attendance.overtimeHours = computed.overtimeHours;
      if (!['leave', 'holiday', 'company_trip', 'off_day'].includes(attendance.status)) {
        const rules = await getGlobalRules();
        attendance.status = resolveWorkedDayStatus({
          checkIn: attendance.checkIn,
          workHours: computed.workHours,
          standardWorkHours: computed.standardWorkHours,
          rules
        });
      }
    } else {
      if (workHours !== undefined) attendance.workHours = Number(workHours) || 0;
      if (overtimeHours !== undefined) attendance.overtimeHours = Number(overtimeHours) || 0;
    }
    if (overtimeApproved !== undefined) {
      attendance.overtimeApproved = overtimeApproved === true;
      if (!attendance.overtimeApproved) attendance.overtimeHours = 0;
    }
    if (note !== undefined) attendance.note = note;
    if (proofUrl !== undefined) attendance.proofUrl = proofUrl;

    await attendance.save();
    const targetEmployee = await User.findById(attendance.user).select('fullName');
    const changes = [];
    if (String(before.checkIn || '') !== String(attendance.checkIn || '')) changes.push(`giờ vào ${formatLogTime(before.checkIn)} → ${formatLogTime(attendance.checkIn)}`);
    if (String(before.checkOut || '') !== String(attendance.checkOut || '')) changes.push(`giờ ra ${formatLogTime(before.checkOut)} → ${formatLogTime(attendance.checkOut)}`);
    if (before.workHours !== attendance.workHours) changes.push(`số giờ ${before.workHours || 0} → ${attendance.workHours || 0}`);
    if (before.overtimeHours !== attendance.overtimeHours) changes.push(`tăng ca ${before.overtimeHours || 0} → ${attendance.overtimeHours || 0}`);
    if (before.overtimeApproved !== attendance.overtimeApproved) changes.push(attendance.overtimeApproved ? 'xác nhận tính tăng ca' : 'bỏ xác nhận tăng ca');
    if (before.status !== attendance.status) changes.push(`trạng thái ${attendanceStatusLabels[before.status] || before.status} → ${attendanceStatusLabels[attendance.status] || attendance.status}`);
    if (before.note !== attendance.note) changes.push('cập nhật ghi chú');
    await createLog(
      req.user._id,
      'UPDATE_ATTENDANCE',
      'attendance',
      `${req.user.fullName} sửa chấm công của ${targetEmployee?.fullName || 'nhân viên'} ngày ${attendance.date}: ${changes.join('; ') || 'lưu lại bản ghi không đổi'}`,
      getClientIp(req)
    );

    // Phát sự kiện cập nhật chấm công thời gian thực
    if (req.app.get('io')) {
      req.app.get('io').emit('attendance_update', { date: attendance.date });
    }

    res.json({ attendance, message: 'Cập nhật bản ghi chấm công thành công' });
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * POST /api/attendance/:id/evidence
 * Upload file bằng chứng cho bản ghi chấm công
 */
router.post('/:id/evidence', upload.array('files', 5), async (req, res) => {
  try {
    const { role } = req.user;
    if (role !== 'director' && role !== 'it_manager' && role !== 'hr_manager') {
      return res.status(403).json({ error: 'Không có quyền thêm bằng chứng' });
    }

    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ error: 'Không tìm thấy bản ghi chấm công' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Vui lòng chọn ít nhất 1 file' });
    }

    const getFileType = (mimetype) => {
      if (mimetype.startsWith('image/')) return 'image';
      if (mimetype === 'application/pdf') return 'pdf';
      if (mimetype.includes('word') || mimetype.includes('document')) return 'doc';
      return 'other';
    };

    const newEvidences = req.files.map(file => ({
      fileName: file.originalname,
      fileUrl: `/api/attendance/uploads/${file.filename}`,
      fileType: getFileType(file.mimetype),
      fileSize: file.size,
      uploadedBy: req.user._id
    }));

    attendance.evidences.push(...newEvidences);
    await attendance.save();
    const targetEmployee = await User.findById(attendance.user).select('fullName');
    await createLog(
      req.user._id,
      'ADD_ATTENDANCE_EVIDENCE',
      'attendance',
      `${req.user.fullName} thêm ${newEvidences.length} bằng chứng chấm công cho ${targetEmployee?.fullName || 'nhân viên'} ngày ${attendance.date}: ${newEvidences.map(item => item.fileName).join(', ')}`,
      getClientIp(req)
    );

    res.json({ 
      attendance, 
      message: `Đã tải lên ${newEvidences.length} file bằng chứng` 
    });
  } catch (error) {
    console.error('Upload evidence error:', error);
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

/**
 * DELETE /api/attendance/:id/evidence/:evidenceId
 * Xóa 1 file bằng chứng
 */
router.delete('/:id/evidence/:evidenceId', async (req, res) => {
  try {
    const { role } = req.user;
    if (role !== 'director' && role !== 'it_manager' && role !== 'hr_manager') {
      return res.status(403).json({ error: 'Không có quyền xóa bằng chứng' });
    }

    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ error: 'Không tìm thấy bản ghi' });
    }

    const evidence = attendance.evidences.id(req.params.evidenceId);
    if (!evidence) {
      return res.status(404).json({ error: 'Không tìm thấy file bằng chứng' });
    }

    // Xóa file vật lý
    const filename = evidence.fileUrl.split('/').pop();
    const filePath = path.join(__dirname, '../../uploads/attendance', filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    attendance.evidences.pull(req.params.evidenceId);
    await attendance.save();
    const targetEmployee = await User.findById(attendance.user).select('fullName');
    await createLog(
      req.user._id,
      'DELETE_ATTENDANCE_EVIDENCE',
      'attendance',
      `${req.user.fullName} xóa bằng chứng “${evidence.fileName}” của ${targetEmployee?.fullName || 'nhân viên'} ngày ${attendance.date}`,
      getClientIp(req)
    );

    res.json({ attendance, message: 'Đã xóa file bằng chứng' });
  } catch (error) {
    console.error('Delete evidence error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/attendance/uploads/:filename
 * Serve file evidence
 */
router.get('/uploads/:filename', (req, res) => {
  const filePath = path.join(__dirname, '../../uploads/attendance', req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'File không tồn tại' });
  }
});

module.exports = router;
