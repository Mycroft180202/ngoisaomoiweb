/**
 * Role-Based Access Control middleware
 * Kiểm tra role và department của user
 */

// Map role → cấp bậc
const ROLE_LEVELS = {
  director: 3,
  hr_manager: 2, sale_manager: 2, mkt_manager: 2, it_manager: 2,
  hr_staff: 1, sale_staff: 1, mkt_staff: 1, it_staff: 1
};

// Map role → department
const ROLE_DEPARTMENTS = {
  director: 'director',
  hr_manager: 'hr', hr_staff: 'hr',
  sale_manager: 'sale', sale_staff: 'sale',
  mkt_manager: 'marketing', mkt_staff: 'marketing',
  it_manager: 'it', it_staff: 'it'
};

const getRoleLevel = (role) => {
  if (role === 'director') return 3;
  if (role.endsWith('_manager')) return 2;
  if (role.endsWith('_staff')) return 1;
  return 0;
};

/**
 * Yêu cầu user có một trong các role được chỉ định
 * @param  {...string} roles - Danh sách role được phép
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Chưa đăng nhập' });
    }

    // Director luôn có quyền
    if (req.user.role === 'director') {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này' });
    }

    next();
  };
};

/**
 * Yêu cầu user thuộc một trong các department được chỉ định
 * @param  {...string} departments - Danh sách department được phép
 */
const requireDepartment = (...departments) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Chưa đăng nhập' });
    }

    // Director luôn có quyền
    if (req.user.role === 'director') {
      return next();
    }

    if (!departments.includes(req.user.department)) {
      return res.status(403).json({ error: 'Phòng ban của bạn không có quyền truy cập' });
    }

    next();
  };
};

/**
 * Yêu cầu user là manager trở lên
 */
const requireManager = () => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Chưa đăng nhập' });
    }

    const level = getRoleLevel(req.user.role);
    if (level < 2) {
      return res.status(403).json({ error: 'Yêu cầu cấp Trưởng phòng trở lên' });
    }

    next();
  };
};

/**
 * Yêu cầu user là director
 */
const requireDirector = () => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Chưa đăng nhập' });
    }

    if (req.user.role !== 'director') {
      return res.status(403).json({ error: 'Chỉ Giám đốc mới có quyền này' });
    }

    next();
  };
};

const requireITOrDirector = () => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Chưa đăng nhập' });
    }

    if (req.user.role === 'director' || req.user.department === 'it') {
      return next();
    }

    return res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này (Yêu cầu quyền IT hoặc Giám đốc)' });
  };
};

/**
 * Tài khoản quản trị hệ thống duy nhất.
 *
 * Lưu ý: `director` là một vai trò nghiệp vụ và không đồng nghĩa với quyền
 * thay đổi các cấu hình có thể tác động đến toàn bộ giao diện hệ thống.
 */
const isSystemAdmin = (user) => (
  user?.username?.trim().toLowerCase() === 'admin'
);

const requireSystemAdmin = () => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Chưa đăng nhập' });
    }

    if (!isSystemAdmin(req.user)) {
      return res.status(403).json({ error: 'Chỉ tài khoản quản trị hệ thống mới được thay đổi phiên bản giao diện' });
    }

    next();
  };
};

// Quyền mặc định theo role (không cần gán thủ công trong DB)
const ROLE_PERMISSIONS = {
  'attendance.export': ['it_manager', 'hr_manager'],
};

const hasPermission = (user, permission) => {
  if (!user) return false;
  if (user.role === 'director') return true;
  if (user.permissions?.includes(permission)) return true;
  const allowedRoles = ROLE_PERMISSIONS[permission] || [];
  return allowedRoles.includes(user.role);
};

const requirePermission = (permission) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Chưa đăng nhập' });
  if (!hasPermission(req.user, permission)) {
    return res.status(403).json({ error: 'Bạn chưa được cấp quyền thực hiện thao tác này' });
  }
  next();
};

module.exports = {
  requireRole,
  requireDepartment,
  requireManager,
  requireDirector,
  requireITOrDirector,
  requireSystemAdmin,
  requirePermission,
  isSystemAdmin,
  hasPermission,
  ROLE_LEVELS,
  ROLE_DEPARTMENTS
};
