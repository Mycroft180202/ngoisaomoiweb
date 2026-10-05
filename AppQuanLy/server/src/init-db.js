const mongoose = require('mongoose');
const connectDB = require('./config/database');
const User = require('./models/User');
const Tour = require('./models/Tour');
const Task = require('./models/Task');
const Approval = require('./models/Approval');
const Booking = require('./models/Booking');
const Notification = require('./models/Notification');
const Department = require('./models/Department');
const Ticket = require('./models/Ticket');

const init = async () => {
  await connectDB();
  console.log('🌱 Khởi tạo cơ sở dữ liệu chính thức cho công ty...\n');

  // Xóa mọi dữ liệu cũ
  await Promise.all([
    User.deleteMany({}),
    Tour.deleteMany({}),
    Task.deleteMany({}),
    Approval.deleteMany({}),
    Booking.deleteMany({}),
    Notification.deleteMany({}),
    Department.deleteMany({}),
    Ticket.deleteMany({})
  ]);
  console.log('🗑️  Đã xóa sạch dữ liệu cũ');

  // Tạo các phòng ban cốt lõi
  const deptsData = [
    { key: 'director', name: 'Ban Giám Đốc', description: 'Ban quản trị và điều hành cấp cao' },
    { key: 'hr', name: 'Phòng Nhân Sự', description: 'Quản lý nhân sự, tuyển dụng, đào tạo và C&B' },
    { key: 'sale', name: 'Phòng Kinh Doanh', description: 'Bán tour du lịch và tư vấn chăm sóc khách hàng' },
    { key: 'marketing', name: 'Phòng Marketing', description: 'Truyền thông thương hiệu, content, quảng cáo và SEO' },
    { key: 'it', name: 'Phòng IT', description: 'Hỗ trợ kỹ thuật, phát triển và vận hành hệ thống phần mềm' },
    { key: 'vp_luong_tai', name: 'VP Lương Tài, Bắc Ninh', description: 'Văn phòng Lương Tài, Bắc Ninh nhận thông báo và thông tin chung' }
  ];
  const depts = await Department.create(deptsData);
  console.log(`🏢 Đã tạo ${depts.length} phòng ban mặc định`);

  // Tạo tài khoản quản trị viên duy nhất (Giám đốc)
  const adminUser = await User.create({
    username: 'admin',
    passwordHash: 'admin123', // Mật khẩu mặc định, user sẽ được yêu cầu đổi hoặc tự đổi
    fullName: 'Quản Trị Viên',
    email: 'quantri1@newstartour.vn',
    phone: '0901000000',
    department: 'director',
    role: 'director',
    position: 'Quản Trị Hệ Thống',
    needsPasswordChange: true // Bắt đổi mật khẩu trong lần đăng nhập đầu tiên để bảo mật
  });

  console.log(`👥 Đã tạo tài khoản quản trị viên:`);
  console.log(`   - Username: ${adminUser.username}`);
  console.log(`   - Email: ${adminUser.email}`);
  console.log(`   - Mật khẩu: admin123 (yêu cầu đổi khi đăng nhập lần đầu)\n`);

  console.log('✅ Khởi tạo cơ sở dữ liệu hoàn tất!');
  mongoose.connection.close();
};

init().catch(err => {
  console.error('❌ Lỗi khởi tạo cơ sở dữ liệu:', err);
  process.exit(1);
});
