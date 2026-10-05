/**
 * Utility helpers cho TravelOps
 */

// Format số tiền VND
export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(amount);
};

// Format ngày tháng
export const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

// Format ngày giờ
export const formatDateTime = (date) => {
  if (!date) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
};

// Relative time (vd: "2 giờ trước")
export const timeAgo = (date) => {
  if (!date) return '';
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 30) return `${diffDays} ngày trước`;
  return formatDate(date);
};

// Lấy initials từ tên
export const getInitials = (name) => {
  if (!name) return '?';
  const words = name.split(' ');
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

// Map department name
export const departmentNames = {
  director: 'Ban Giám Đốc',
  hr: 'Phòng Nhân Sự',
  sale: 'Phòng Kinh Doanh',
  marketing: 'Phòng Marketing',
  it: 'Phòng IT',
  vp_luong_tai: 'VP Lương Tài, Bắc Ninh'
};

// Map role name
export const roleNames = {
  director: 'Giám Đốc',
  hr_manager: 'Trưởng Phòng Nhân Sự',
  hr_staff: 'Nhân Viên Nhân Sự',
  sale_manager: 'Trưởng Phòng Kinh Doanh',
  sale_staff: 'Nhân Viên Kinh Doanh',
  mkt_manager: 'Trưởng Phòng Marketing',
  mkt_staff: 'Nhân Viên Marketing',
  it_manager: 'Trưởng Phòng IT',
  it_staff: 'Nhân Viên IT'
};

// Map status name & color cho các loại
export const taskStatusMap = {
  todo: { label: 'Mới', color: 'ghost' },
  in_progress: { label: 'Đang làm', color: 'primary' },
  review: { label: 'Review', color: 'warning' },
  done: { label: 'Hoàn thành', color: 'success' },
  cancelled: { label: 'Đã hủy', color: 'danger' }
};

export const taskPriorityMap = {
  low: { label: 'Thấp', color: 'ghost' },
  medium: { label: 'Trung bình', color: 'info' },
  high: { label: 'Cao', color: 'warning' },
  urgent: { label: 'Khẩn cấp', color: 'danger' }
};

export const tourStatusMap = {
  draft: { label: 'Nháp', color: 'ghost' },
  active: { label: 'Đang bán', color: 'success' },
  departing: { label: 'Sắp khởi hành', color: 'warning' },
  completed: { label: 'Hoàn thành', color: 'primary' },
  cancelled: { label: 'Đã hủy', color: 'danger' }
};

export const approvalStatusMap = {
  draft: { label: 'Nháp', color: 'ghost' },
  pending_manager: { label: 'Chờ Trưởng phòng', color: 'warning' },
  pending_director: { label: 'Chờ Giám đốc', color: 'info' },
  approved: { label: 'Đã duyệt', color: 'success' },
  rejected: { label: 'Từ chối', color: 'danger' },
  returned: { label: 'Trả lại', color: 'secondary' }
};

export const approvalTypeMap = {
  expense: { label: 'Chi phí / Tạm ứng', icon: '💰' },
  leave: { label: 'Nghỉ phép', icon: '🏖️' },
  travel: { label: 'Công tác', icon: '✈️' },
  purchase: { label: 'Mua sắm', icon: '🛒' },
  partnership: { label: 'Hợp tác', icon: '🤝' },
  other: { label: 'Khác', icon: '📄' }
};

export const bookingStatusMap = {
  pending: { label: 'Chờ xác nhận', color: 'warning' },
  confirmed: { label: 'Đã xác nhận', color: 'info' },
  paid: { label: 'Đã thanh toán', color: 'success' },
  completed: { label: 'Hoàn thành', color: 'primary' },
  cancelled: { label: 'Đã hủy', color: 'danger' }
};

// Department color for charts
export const departmentColors = {
  director: '#8B5CF6',
  hr: '#EC4899',
  sale: '#0EA5E9',
  marketing: '#F97316',
  it: '#22C55E',
  vp_luong_tai: '#14B8A6'
};

// Map ticket status
export const ticketStatusMap = {
  open: { label: 'Mở', color: 'warning' },
  assigned: { label: 'Đã tiếp nhận', color: 'info' },
  in_progress: { label: 'Đang xử lý', color: 'primary' },
  resolved: { label: 'Đã giải quyết', color: 'success' },
  closed: { label: 'Đã đóng', color: 'ghost' }
};

// Map ticket category
export const ticketCategoryMap = {
  software: { label: 'Phần mềm', icon: '💻' },
  hardware: { label: 'Phần cứng', icon: '🖥️' },
  network: { label: 'Mạng', icon: '🌐' },
  account: { label: 'Tài khoản', icon: '🔑' },
  design: { label: 'Thiết kế', icon: '🎨' },
  data: { label: 'Dữ liệu', icon: '📊' },
  other: { label: 'Khác', icon: '📋' }
};
