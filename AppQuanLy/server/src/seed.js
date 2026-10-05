const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/database');
const User = require('./models/User');
const Tour = require('./models/Tour');
const Task = require('./models/Task');
const Approval = require('./models/Approval');
const Booking = require('./models/Booking');
const Notification = require('./models/Notification');
const Department = require('./models/Department');
const Ticket = require('./models/Ticket');

const seed = async () => {
  await connectDB();
  console.log('🌱 Bắt đầu tạo dữ liệu mẫu...\n');

  // Xóa dữ liệu cũ
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
  console.log('🗑️  Đã xóa dữ liệu cũ');

  // ========== DEPARTMENTS (Phòng ban cốt lõi) ==========
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

  // ========== USERS (35 nhân viên) ==========
  const usersData = [
    // Giám đốc
    { username: 'giamdoc', passwordHash: '123456', fullName: 'Trần Minh Đức', email: 'duc.tm@travelops.vn', phone: '0901000001', department: 'director', role: 'director', position: 'Giám Đốc' },

    // Phòng Nhân Sự (6 người)
    { username: 'hr.manager', passwordHash: '123456', fullName: 'Nguyễn Thị Hương', email: 'huong.nt@travelops.vn', phone: '0901000002', department: 'hr', role: 'hr_manager', position: 'Trưởng Phòng Nhân Sự' },
    { username: 'hr.staff1', passwordHash: '123456', fullName: 'Lê Văn Hoàng', email: 'hoang.lv@travelops.vn', phone: '0901000003', department: 'hr', role: 'hr_staff', position: 'Nhân Viên Nhân Sự' },
    { username: 'hr.staff2', passwordHash: '123456', fullName: 'Phạm Thị Mai', email: 'mai.pt@travelops.vn', phone: '0901000004', department: 'hr', role: 'hr_staff', position: 'Nhân Viên Nhân Sự' },
    { username: 'hr.staff3', passwordHash: '123456', fullName: 'Đỗ Thanh Tùng', email: 'tung.dt@travelops.vn', phone: '0901000005', department: 'hr', role: 'hr_staff', position: 'Nhân Viên Tuyển Dụng' },
    { username: 'hr.staff4', passwordHash: '123456', fullName: 'Vũ Thị Lan', email: 'lan.vt@travelops.vn', phone: '0901000006', department: 'hr', role: 'hr_staff', position: 'Nhân Viên Hành Chính' },
    { username: 'hr.staff5', passwordHash: '123456', fullName: 'Bùi Quang Huy', email: 'huy.bq@travelops.vn', phone: '0901000007', department: 'hr', role: 'hr_staff', position: 'Nhân Viên C&B' },

    // Phòng Sale (10 người)
    { username: 'sale.manager', passwordHash: '123456', fullName: 'Hoàng Văn Nam', email: 'nam.hv@travelops.vn', phone: '0901000008', department: 'sale', role: 'sale_manager', position: 'Trưởng Phòng Kinh Doanh' },
    { username: 'sale.staff1', passwordHash: '123456', fullName: 'Trần Thị Ngọc', email: 'ngoc.tt@travelops.vn', phone: '0901000009', department: 'sale', role: 'sale_staff', position: 'Nhân Viên Kinh Doanh' },
    { username: 'sale.staff2', passwordHash: '123456', fullName: 'Nguyễn Hữu Phúc', email: 'phuc.nh@travelops.vn', phone: '0901000010', department: 'sale', role: 'sale_staff', position: 'Nhân Viên Kinh Doanh' },
    { username: 'sale.staff3', passwordHash: '123456', fullName: 'Lê Thị Thanh', email: 'thanh.lt@travelops.vn', phone: '0901000011', department: 'sale', role: 'sale_staff', position: 'Nhân Viên Kinh Doanh' },
    { username: 'sale.staff4', passwordHash: '123456', fullName: 'Phạm Đức Anh', email: 'anh.pd@travelops.vn', phone: '0901000012', department: 'sale', role: 'sale_staff', position: 'Nhân Viên Kinh Doanh' },
    { username: 'sale.staff5', passwordHash: '123456', fullName: 'Võ Thị Kim', email: 'kim.vt@travelops.vn', phone: '0901000013', department: 'sale', role: 'sale_staff', position: 'Nhân Viên Tư Vấn Tour' },
    { username: 'sale.staff6', passwordHash: '123456', fullName: 'Đặng Quốc Bảo', email: 'bao.dq@travelops.vn', phone: '0901000014', department: 'sale', role: 'sale_staff', position: 'Nhân Viên Tư Vấn Tour' },
    { username: 'sale.staff7', passwordHash: '123456', fullName: 'Hồ Thị Yến', email: 'yen.ht@travelops.vn', phone: '0901000015', department: 'sale', role: 'sale_staff', position: 'Nhân Viên Điều Hành Tour' },
    { username: 'sale.staff8', passwordHash: '123456', fullName: 'Ngô Văn Trung', email: 'trung.nv@travelops.vn', phone: '0901000016', department: 'sale', role: 'sale_staff', position: 'Nhân Viên Điều Hành Tour' },
    { username: 'sale.staff9', passwordHash: '123456', fullName: 'Lý Thị Hồng', email: 'hong.lt@travelops.vn', phone: '0901000017', department: 'sale', role: 'sale_staff', position: 'Nhân Viên CSKH' },

    // Phòng Marketing (7 người)
    { username: 'mkt.manager', passwordHash: '123456', fullName: 'Phan Thị Duyên', email: 'duyen.pt@travelops.vn', phone: '0901000018', department: 'marketing', role: 'mkt_manager', position: 'Trưởng Phòng Marketing' },
    { username: 'mkt.staff1', passwordHash: '123456', fullName: 'Trịnh Văn Khoa', email: 'khoa.tv@travelops.vn', phone: '0901000019', department: 'marketing', role: 'mkt_staff', position: 'Nhân Viên Content' },
    { username: 'mkt.staff2', passwordHash: '123456', fullName: 'Nguyễn Thùy Linh', email: 'linh.nt@travelops.vn', phone: '0901000020', department: 'marketing', role: 'mkt_staff', position: 'Nhân Viên Content' },
    { username: 'mkt.staff3', passwordHash: '123456', fullName: 'Cao Minh Tuấn', email: 'tuan.cm@travelops.vn', phone: '0901000021', department: 'marketing', role: 'mkt_staff', position: 'Nhân Viên Thiết Kế' },
    { username: 'mkt.staff4', passwordHash: '123456', fullName: 'Mai Thị Ánh', email: 'anh.mt@travelops.vn', phone: '0901000022', department: 'marketing', role: 'mkt_staff', position: 'Nhân Viên Digital Ads' },
    { username: 'mkt.staff5', passwordHash: '123456', fullName: 'Dương Văn Sơn', email: 'son.dv@travelops.vn', phone: '0901000023', department: 'marketing', role: 'mkt_staff', position: 'Nhân Viên SEO' },
    { username: 'mkt.staff6', passwordHash: '123456', fullName: 'Lâm Thị Phương', email: 'phuong.lt@travelops.vn', phone: '0901000024', department: 'marketing', role: 'mkt_staff', position: 'Nhân Viên Social Media' },

    // Phòng IT (5 người)
    { username: 'it.manager', passwordHash: '123456', fullName: 'Đinh Công Minh', email: 'minh.dc@travelops.vn', phone: '0901000025', department: 'it', role: 'it_manager', position: 'Trưởng Phòng IT' },
    { username: 'it.staff1', passwordHash: '123456', fullName: 'Trần Quốc Đạt', email: 'dat.tq@travelops.vn', phone: '0901000026', department: 'it', role: 'it_staff', position: 'Lập Trình Viên' },
    { username: 'it.staff2', passwordHash: '123456', fullName: 'Nguyễn Bá Long', email: 'long.nb@travelops.vn', phone: '0901000027', department: 'it', role: 'it_staff', position: 'Lập Trình Viên' },
    { username: 'it.staff3', passwordHash: '123456', fullName: 'Lê Hải Đăng', email: 'dang.lh@travelops.vn', phone: '0901000028', department: 'it', role: 'it_staff', position: 'Quản Trị Hệ Thống' },
    { username: 'it.staff4', passwordHash: '123456', fullName: 'Phạm Thế Vinh', email: 'vinh.pt@travelops.vn', phone: '0901000029', department: 'it', role: 'it_staff', position: 'Kỹ Thuật Viên' },
  ];

  const users = await User.create(usersData);
  console.log(`👥 Đã tạo ${users.length} nhân viên`);

  // Map users by role
  const director = users.find(u => u.role === 'director');
  const saleManager = users.find(u => u.role === 'sale_manager');
  const saleStaff = users.filter(u => u.role === 'sale_staff');
  const mktManager = users.find(u => u.role === 'mkt_manager');
  const mktStaff = users.filter(u => u.role === 'mkt_staff');
  const hrManager = users.find(u => u.role === 'hr_manager');
  const itManager = users.find(u => u.role === 'it_manager');
  const itStaff = users.filter(u => u.role === 'it_staff');

  // ========== TOURS (15 tour) ==========
  const toursData = [
    {
      code: 'TOUR-DN-001', name: 'Tour Đà Nẵng - Hội An - Bà Nà 4N3Đ', destination: 'Đà Nẵng, Hội An',
      description: 'Khám phá thành phố đáng sống nhất Việt Nam với bãi biển Mỹ Khê, Phố cổ Hội An lung linh và Bà Nà Hills huyền ảo.',
      durationDays: 4, durationNights: 3, price: { adult: 5990000, child: 3990000, surcharge: 1500000 },
      status: 'active', departureDate: new Date('2026-07-15'), returnDate: new Date('2026-07-18'), maxGuests: 30,
      itinerary: [
        { day: 1, title: 'TP.HCM - Đà Nẵng', description: 'Bay đến Đà Nẵng, check-in khách sạn, tham quan Cầu Rồng', meals: ['Trưa', 'Tối'] },
        { day: 2, title: 'Bà Nà Hills', description: 'Tham quan Bà Nà Hills, Cầu Vàng, Fantasy Park', meals: ['Sáng', 'Trưa', 'Tối'] },
        { day: 3, title: 'Hội An', description: 'Phố cổ Hội An, làng gốm Thanh Hà, rừng dừa Bảy Mẫu', meals: ['Sáng', 'Trưa', 'Tối'] },
        { day: 4, title: 'Đà Nẵng - TP.HCM', description: 'Mua sắm đặc sản, bay về TP.HCM', meals: ['Sáng', 'Trưa'] }
      ],
      includes: ['Vé máy bay khứ hồi', 'Khách sạn 4 sao', 'Xe đưa đón', 'Bữa ăn theo chương trình', 'Hướng dẫn viên'],
      excludes: ['Chi phí cá nhân', 'Tip HDV', 'Đồ uống'],
      saleInCharge: saleStaff[0]._id, createdBy: saleManager._id
    },
    {
      code: 'TOUR-PQ-001', name: 'Tour Phú Quốc Thiên Đường Biển 3N2Đ', destination: 'Phú Quốc',
      description: 'Tận hưởng thiên đường biển đảo Phú Quốc với bãi Sao tuyệt đẹp, lặn ngắm san hô và sunset câu mực.',
      durationDays: 3, durationNights: 2, price: { adult: 4490000, child: 2990000, surcharge: 1200000 },
      status: 'active', departureDate: new Date('2026-07-20'), returnDate: new Date('2026-07-22'), maxGuests: 25,
      itinerary: [
        { day: 1, title: 'TP.HCM - Phú Quốc', description: 'Bay đến Phú Quốc, Bãi Sao, Sunset Sanato', meals: ['Trưa', 'Tối'] },
        { day: 2, title: 'Tour 4 Đảo', description: 'Lặn ngắm san hô, câu cá, Hòn Thơm Nature Park', meals: ['Sáng', 'Trưa', 'Tối'] },
        { day: 3, title: 'Phú Quốc - TP.HCM', description: 'VinWonders, mua sắm, bay về', meals: ['Sáng', 'Trưa'] }
      ],
      includes: ['Vé máy bay', 'Khách sạn 4 sao', 'Tàu tour đảo'],
      excludes: ['Chi phí cá nhân', 'Vé VinWonders'],
      saleInCharge: saleStaff[1]._id, createdBy: saleManager._id
    },
    {
      code: 'TOUR-DL-001', name: 'Tour Đà Lạt Mộng Mơ 3N2Đ', destination: 'Đà Lạt',
      description: 'Thành phố ngàn hoa với thác Datanla, đồi chè Cầu Đất, và những quán cà phê view đẹp nhất Tây Nguyên.',
      durationDays: 3, durationNights: 2, price: { adult: 3290000, child: 2290000, surcharge: 800000 },
      status: 'active', departureDate: new Date('2026-07-25'), returnDate: new Date('2026-07-27'), maxGuests: 35,
      itinerary: [
        { day: 1, title: 'TP.HCM - Đà Lạt', description: 'Xe đưa đón, Thác Datanla, chợ đêm Đà Lạt', meals: ['Trưa', 'Tối'] },
        { day: 2, title: 'Khám phá Đà Lạt', description: 'Đồi chè Cầu Đất, QUE Garden, Thiền Viện Trúc Lâm', meals: ['Sáng', 'Trưa', 'Tối'] },
        { day: 3, title: 'Đà Lạt - TP.HCM', description: 'Vườn dâu, mua sắm đặc sản, về TP.HCM', meals: ['Sáng', 'Trưa'] }
      ],
      includes: ['Xe giường nằm', 'Khách sạn 3 sao', 'Bữa ăn'],
      excludes: ['Chi phí cá nhân'],
      saleInCharge: saleStaff[2]._id, createdBy: saleManager._id
    },
    {
      code: 'TOUR-NT-001', name: 'Tour Nha Trang - Vinpearl 4N3Đ', destination: 'Nha Trang',
      description: 'Biển xanh cát trắng Nha Trang, Vinpearl Land, và ẩm thực hải sản tươi sống.',
      durationDays: 4, durationNights: 3, price: { adult: 5490000, child: 3490000, surcharge: 1300000 },
      status: 'active', departureDate: new Date('2026-08-01'), returnDate: new Date('2026-08-04'), maxGuests: 30,
      itinerary: [
        { day: 1, title: 'TP.HCM - Nha Trang', description: 'Bay đến Nha Trang, tắm biển, chợ đêm', meals: ['Trưa', 'Tối'] },
        { day: 2, title: 'Tour đảo', description: 'Hòn Mun, Hòn Tằm, lặn biển', meals: ['Sáng', 'Trưa', 'Tối'] },
        { day: 3, title: 'Vinpearl Land', description: 'Cả ngày tại Vinpearl Land', meals: ['Sáng', 'Trưa', 'Tối'] },
        { day: 4, title: 'Nha Trang - TP.HCM', description: 'Tháp Bà Ponagar, mua sắm, bay về', meals: ['Sáng', 'Trưa'] }
      ],
      includes: ['Vé máy bay', 'Khách sạn 4 sao', 'Vé Vinpearl'],
      excludes: ['Chi phí cá nhân'],
      saleInCharge: saleStaff[3]._id, createdBy: saleManager._id
    },
    {
      code: 'TOUR-SG-001', name: 'Tour Sài Gòn City 2N1Đ', destination: 'TP. Hồ Chí Minh',
      description: 'Khám phá Sài Gòn năng động: Nhà thờ Đức Bà, Địa đạo Củ Chi, Bến Nhà Rồng.',
      durationDays: 2, durationNights: 1, price: { adult: 1990000, child: 1290000, surcharge: 500000 },
      status: 'active', departureDate: new Date('2026-07-10'), returnDate: new Date('2026-07-11'), maxGuests: 40,
      itinerary: [
        { day: 1, title: 'Sài Gòn cổ kính', description: 'Nhà thờ Đức Bà, Bưu điện, Dinh Độc Lập, Bến Thành', meals: ['Trưa', 'Tối'] },
        { day: 2, title: 'Địa đạo Củ Chi', description: 'Tham quan Địa đạo Củ Chi, Bến Nhà Rồng', meals: ['Sáng', 'Trưa'] }
      ],
      includes: ['Xe đưa đón', 'Khách sạn 3 sao', 'Bữa ăn', 'Vé tham quan'],
      excludes: ['Chi phí cá nhân'],
      saleInCharge: saleStaff[4]._id, createdBy: saleManager._id
    },
    {
      code: 'TOUR-HP-001', name: 'Tour Hạ Long - Sapa 5N4Đ', destination: 'Hạ Long, Sapa',
      description: 'Combo Hạ Long - Sapa: Vịnh Hạ Long di sản thế giới và ruộng bậc thang Sapa hùng vĩ.',
      durationDays: 5, durationNights: 4, price: { adult: 7990000, child: 5490000, surcharge: 2000000 },
      status: 'active', departureDate: new Date('2026-08-10'), returnDate: new Date('2026-08-14'), maxGuests: 25,
      itinerary: [
        { day: 1, title: 'TP.HCM - Hà Nội - Hạ Long', description: 'Bay ra Hà Nội, xe đến Hạ Long', meals: ['Trưa', 'Tối'] },
        { day: 2, title: 'Vịnh Hạ Long', description: 'Du thuyền vịnh Hạ Long, hang Sửng Sốt', meals: ['Sáng', 'Trưa', 'Tối'] },
        { day: 3, title: 'Hạ Long - Sapa', description: 'Xe đến Sapa, chợ đêm Sapa', meals: ['Sáng', 'Trưa', 'Tối'] },
        { day: 4, title: 'Sapa', description: 'Fansipan, bản Cát Cát, ruộng bậc thang', meals: ['Sáng', 'Trưa', 'Tối'] },
        { day: 5, title: 'Sapa - Hà Nội - TP.HCM', description: 'Về Hà Nội, bay về TP.HCM', meals: ['Sáng', 'Trưa'] }
      ],
      includes: ['Vé máy bay', 'Du thuyền Hạ Long', 'Khách sạn 4 sao', 'Xe đưa đón'],
      excludes: ['Cáp treo Fansipan', 'Chi phí cá nhân'],
      saleInCharge: saleStaff[0]._id, createdBy: director._id
    },
    {
      code: 'TOUR-HUE-001', name: 'Tour Huế - Đại Nội 3N2Đ', destination: 'Huế',
      description: 'Cố đô Huế với Đại Nội, lăng tẩm triều Nguyễn, sông Hương thơ mộng.',
      durationDays: 3, durationNights: 2, price: { adult: 4290000, child: 2890000, surcharge: 1000000 },
      status: 'active', departureDate: new Date('2026-08-05'), returnDate: new Date('2026-08-07'), maxGuests: 30,
      itinerary: [
        { day: 1, title: 'TP.HCM - Huế', description: 'Bay đến Huế, Đại Nội', meals: ['Trưa', 'Tối'] },
        { day: 2, title: 'Lăng tẩm', description: 'Lăng Tự Đức, Lăng Khải Định, chùa Thiên Mụ', meals: ['Sáng', 'Trưa', 'Tối'] },
        { day: 3, title: 'Huế - TP.HCM', description: 'Chợ Đông Ba, bay về TP.HCM', meals: ['Sáng', 'Trưa'] }
      ],
      includes: ['Vé máy bay', 'Khách sạn', 'Bữa ăn', 'Vé tham quan'],
      excludes: ['Chi phí cá nhân'],
      saleInCharge: saleStaff[5]._id, createdBy: saleManager._id
    },
    {
      code: 'TOUR-QN-001', name: 'Tour Quy Nhơn - Phú Yên 4N3Đ', destination: 'Quy Nhơn, Phú Yên',
      description: 'Vùng đất \"Hoa vàng cỏ xanh\" với Ghềnh Đá Đĩa, Eo Gió và bãi biển hoang sơ.',
      durationDays: 4, durationNights: 3, price: { adult: 4990000, child: 3290000, surcharge: 1100000 },
      status: 'active', departureDate: new Date('2026-08-15'), returnDate: new Date('2026-08-18'), maxGuests: 25,
      itinerary: [
        { day: 1, title: 'TP.HCM - Quy Nhơn', description: 'Bay đến Quy Nhơn, Eo Gió, Kỳ Co', meals: ['Trưa', 'Tối'] },
        { day: 2, title: 'Quy Nhơn', description: 'Tháp Bánh Ít, Ghềnh Ráng, hải sản', meals: ['Sáng', 'Trưa', 'Tối'] },
        { day: 3, title: 'Phú Yên', description: 'Ghềnh Đá Đĩa, Mũi Điện, Xứ Nẫu', meals: ['Sáng', 'Trưa', 'Tối'] },
        { day: 4, title: 'Phú Yên - TP.HCM', description: 'Nhà thờ Mằng Lăng, bay về', meals: ['Sáng', 'Trưa'] }
      ],
      includes: ['Vé máy bay', 'Khách sạn', 'Xe đưa đón'],
      excludes: ['Chi phí cá nhân'],
      saleInCharge: saleStaff[6]._id, createdBy: saleManager._id
    },
    {
      code: 'TOUR-TL-001', name: 'Tour Thái Lan - Bangkok - Pattaya 5N4Đ', destination: 'Bangkok, Pattaya (Thái Lan)',
      description: 'Tour quốc tế: Bangkok sầm uất, Pattaya biển xanh, chùa Phật Vàng và show Alcazar.',
      durationDays: 5, durationNights: 4, price: { adult: 8990000, child: 6490000, surcharge: 2500000 },
      status: 'active', departureDate: new Date('2026-09-01'), returnDate: new Date('2026-09-05'), maxGuests: 30,
      itinerary: [
        { day: 1, title: 'TP.HCM - Bangkok', description: 'Bay đến Bangkok, chợ đêm Asiatique', meals: ['Tối'] },
        { day: 2, title: 'Bangkok', description: 'Hoàng Cung, Wat Pho, Wat Arun, Siam Paragon', meals: ['Sáng', 'Trưa', 'Tối'] },
        { day: 3, title: 'Bangkok - Pattaya', description: 'Nong Nooch, đảo San Hô', meals: ['Sáng', 'Trưa', 'Tối'] },
        { day: 4, title: 'Pattaya', description: 'Alcazar Show, Walking Street, Icon Siam', meals: ['Sáng', 'Trưa', 'Tối'] },
        { day: 5, title: 'Bangkok - TP.HCM', description: 'Mua sắm, bay về', meals: ['Sáng', 'Trưa'] }
      ],
      includes: ['Vé máy bay', 'Khách sạn 4 sao', 'Visa Thái Lan', 'Bảo hiểm du lịch'],
      excludes: ['Chi phí cá nhân', 'Tip HDV'],
      saleInCharge: saleStaff[1]._id, createdBy: director._id
    },
    {
      code: 'TOUR-SG-002', name: 'Tour Singapore - Malaysia 5N4Đ', destination: 'Singapore, Kuala Lumpur',
      description: 'Khám phá 2 quốc gia: Singapore hiện đại và Malaysia đa sắc tộc.',
      durationDays: 5, durationNights: 4, price: { adult: 11990000, child: 8990000, surcharge: 3000000 },
      status: 'draft', departureDate: new Date('2026-10-01'), returnDate: new Date('2026-10-05'), maxGuests: 25,
      itinerary: [
        { day: 1, title: 'TP.HCM - Singapore', description: 'Bay đến Singapore, Gardens by the Bay', meals: ['Tối'] },
        { day: 2, title: 'Singapore', description: 'Universal Studios, Sentosa Island', meals: ['Sáng', 'Trưa', 'Tối'] },
        { day: 3, title: 'Singapore - KL', description: 'Merlion, Marina Bay, bus sang Malaysia', meals: ['Sáng', 'Trưa', 'Tối'] },
        { day: 4, title: 'Kuala Lumpur', description: 'Tháp đôi Petronas, Batu Caves, Bukit Bintang', meals: ['Sáng', 'Trưa', 'Tối'] },
        { day: 5, title: 'KL - TP.HCM', description: 'Mua sắm, bay về', meals: ['Sáng', 'Trưa'] }
      ],
      includes: ['Vé máy bay', 'Khách sạn 4 sao', 'Bảo hiểm'],
      excludes: ['Visa Singapore', 'Chi phí cá nhân'],
      saleInCharge: saleStaff[3]._id, createdBy: saleManager._id
    },
    {
      code: 'TOUR-CM-001', name: 'Tour Cần Thơ - Miền Tây 2N1Đ', destination: 'Cần Thơ, Miền Tây',
      description: 'Trải nghiệm sông nước miền Tây: chợ nổi Cái Răng, vườn trái cây và ẩm thực đồng bằng.',
      durationDays: 2, durationNights: 1, price: { adult: 1790000, child: 1190000, surcharge: 400000 },
      status: 'active', departureDate: new Date('2026-07-12'), returnDate: new Date('2026-07-13'), maxGuests: 40,
      itinerary: [
        { day: 1, title: 'TP.HCM - Cần Thơ', description: 'Xe đến Cần Thơ, bến Ninh Kiều, chợ đêm', meals: ['Trưa', 'Tối'] },
        { day: 2, title: 'Chợ nổi - TP.HCM', description: 'Chợ nổi Cái Răng, vườn trái cây, về TP.HCM', meals: ['Sáng', 'Trưa'] }
      ],
      includes: ['Xe đưa đón', 'Khách sạn', 'Bữa ăn', 'Thuyền chợ nổi'],
      excludes: ['Chi phí cá nhân'],
      saleInCharge: saleStaff[7]._id, createdBy: saleManager._id
    },
    {
      code: 'TOUR-VP-001', name: 'Tour Vũng Tàu Weekend 2N1Đ', destination: 'Vũng Tàu',
      description: 'Getaway cuối tuần: biển Vũng Tàu, Tượng Chúa, Hải Đăng và hải sản tươi ngon.',
      durationDays: 2, durationNights: 1, price: { adult: 1590000, child: 990000, surcharge: 400000 },
      status: 'completed', departureDate: new Date('2026-06-20'), returnDate: new Date('2026-06-21'), maxGuests: 35,
      itinerary: [
        { day: 1, title: 'TP.HCM - Vũng Tàu', description: 'Xe đến Vũng Tàu, Bãi Sau, Tượng Chúa', meals: ['Trưa', 'Tối'] },
        { day: 2, title: 'Vũng Tàu - TP.HCM', description: 'Hải Đăng, White Palace, về TP.HCM', meals: ['Sáng', 'Trưa'] }
      ],
      includes: ['Xe đưa đón', 'Khách sạn', 'Bữa ăn'],
      excludes: ['Chi phí cá nhân'],
      saleInCharge: saleStaff[2]._id, createdBy: saleManager._id
    },
    {
      code: 'TOUR-MC-001', name: 'Tour Mũi Né - Phan Thiết 3N2Đ', destination: 'Mũi Né, Phan Thiết',
      description: 'Đồi cát Mũi Né, suối Tiên, Tháp Chàm Poshanư và resort bên biển.',
      durationDays: 3, durationNights: 2, price: { adult: 3490000, child: 2390000, surcharge: 900000 },
      status: 'active', departureDate: new Date('2026-08-20'), returnDate: new Date('2026-08-22'), maxGuests: 30,
      itinerary: [
        { day: 1, title: 'TP.HCM - Mũi Né', description: 'Xe đến Mũi Né, Đồi cát trắng, Suối Tiên', meals: ['Trưa', 'Tối'] },
        { day: 2, title: 'Mũi Né', description: 'Bãi đá Ông Địa, Tháp Poshanư, làng chài', meals: ['Sáng', 'Trưa', 'Tối'] },
        { day: 3, title: 'Mũi Né - TP.HCM', description: 'Tự do resort, về TP.HCM', meals: ['Sáng', 'Trưa'] }
      ],
      includes: ['Xe đưa đón', 'Resort 4 sao', 'Bữa ăn'],
      excludes: ['Chi phí cá nhân', 'Xe jeep đồi cát'],
      saleInCharge: saleStaff[4]._id, createdBy: saleManager._id
    },
    {
      code: 'TOUR-KG-001', name: 'Tour Hàn Quốc - Seoul 5N4Đ', destination: 'Seoul, Nami (Hàn Quốc)',
      description: 'Xứ sở Kim Chi: Cung Gyeongbok, Đảo Nami, Myeongdong Shopping và K-Culture.',
      durationDays: 5, durationNights: 4, price: { adult: 13990000, child: 10990000, surcharge: 3500000 },
      status: 'draft', departureDate: new Date('2026-11-15'), returnDate: new Date('2026-11-19'), maxGuests: 20,
      itinerary: [
        { day: 1, title: 'TP.HCM - Seoul', description: 'Bay đến Seoul Incheon, N Seoul Tower', meals: ['Tối'] },
        { day: 2, title: 'Seoul', description: 'Cung Gyeongbok, Bukchon Hanok, Insadong', meals: ['Sáng', 'Trưa', 'Tối'] },
        { day: 3, title: 'Đảo Nami', description: 'Đảo Nami, Petite France, Garden of Morning Calm', meals: ['Sáng', 'Trưa', 'Tối'] },
        { day: 4, title: 'Seoul Shopping', description: 'Myeongdong, Gangnam, COEX Mall', meals: ['Sáng', 'Trưa', 'Tối'] },
        { day: 5, title: 'Seoul - TP.HCM', description: 'Lotte Mart, bay về', meals: ['Sáng'] }
      ],
      includes: ['Vé máy bay', 'Khách sạn 4 sao', 'Visa Hàn Quốc', 'Bảo hiểm'],
      excludes: ['Chi phí cá nhân', 'Mua sắm'],
      saleInCharge: saleStaff[1]._id, createdBy: director._id
    }
  ];

  const tours = await Tour.insertMany(toursData);
  console.log(`🏖️  Đã tạo ${tours.length} tour`);

  // ========== TASKS (25 task) ==========
  const tasksData = [
    { code: 'TASK-001', title: 'Thiết kế brochure Tour Đà Nẵng Hè 2026', description: 'Thiết kế brochure quảng cáo cho tour Đà Nẵng - Hội An mùa hè', status: 'in_progress', priority: 'high', assignee: mktStaff[2]._id, department: 'marketing', deadline: new Date('2026-07-05'), tags: ['design', 'tour'], createdBy: mktManager._id },
    { code: 'TASK-002', title: 'Viết content Facebook cho Tour Phú Quốc', description: 'Viết 5 bài content Facebook quảng bá tour Phú Quốc', status: 'todo', priority: 'high', assignee: mktStaff[0]._id, department: 'marketing', deadline: new Date('2026-07-10'), tags: ['content', 'social'], createdBy: mktManager._id },
    { code: 'TASK-003', title: 'Chạy Google Ads cho Tour Hè', description: 'Setup và chạy chiến dịch Google Ads cho các tour mùa hè', status: 'in_progress', priority: 'medium', assignee: mktStaff[3]._id, department: 'marketing', deadline: new Date('2026-07-15'), tags: ['ads', 'google'], createdBy: mktManager._id },
    { code: 'TASK-004', title: 'Liên hệ đối tác khách sạn Đà Nẵng', description: 'Đàm phán giá phòng mùa cao điểm với các khách sạn đối tác', status: 'done', priority: 'urgent', assignee: saleStaff[0]._id, department: 'sale', deadline: new Date('2026-06-30'), tags: ['partner', 'hotel'], createdBy: saleManager._id },
    { code: 'TASK-005', title: 'Tuyển dụng HDV tiếng Anh', description: 'Tuyển 2 hướng dẫn viên du lịch tiếng Anh cho tour quốc tế', status: 'in_progress', priority: 'high', assignee: users[3]._id, department: 'hr', deadline: new Date('2026-07-20'), tags: ['recruitment'], createdBy: hrManager._id },
    { code: 'TASK-006', title: 'Backup database hệ thống', description: 'Thực hiện backup database định kỳ tháng 7', status: 'todo', priority: 'medium', assignee: itStaff[2]._id, department: 'it', deadline: new Date('2026-07-01'), tags: ['backup', 'database'], createdBy: itManager._id },
    { code: 'TASK-007', title: 'Xử lý booking Tour Vũng Tàu', description: 'Xác nhận và xử lý 15 booking cho tour Vũng Tàu cuối tuần', status: 'done', priority: 'urgent', assignee: saleStaff[7]._id, department: 'sale', deadline: new Date('2026-06-18'), tags: ['booking'], createdBy: saleManager._id },
    { code: 'TASK-008', title: 'Cập nhật giá tour mùa Thu', description: 'Cập nhật bảng giá cho tất cả các tour mùa Thu 2026', status: 'todo', priority: 'medium', assignee: saleStaff[3]._id, department: 'sale', deadline: new Date('2026-08-15'), tags: ['pricing'], createdBy: saleManager._id },
    { code: 'TASK-009', title: 'Chụp ảnh Tour Đà Lạt', description: 'Chụp ảnh và quay video cho tour Đà Lạt để làm marketing', status: 'review', priority: 'medium', assignee: mktStaff[1]._id, department: 'marketing', deadline: new Date('2026-07-28'), tags: ['photo', 'video'], createdBy: mktManager._id },
    { code: 'TASK-010', title: 'Đào tạo nhân viên mới phòng Sale', description: 'Đào tạo quy trình bán tour cho 2 nhân viên mới', status: 'in_progress', priority: 'high', assignee: saleManager._id, department: 'sale', deadline: new Date('2026-07-15'), tags: ['training'], createdBy: director._id },
    { code: 'TASK-011', title: 'Fix bug trang web booking', description: 'Sửa lỗi form booking không hiển thị giá trẻ em', status: 'in_progress', priority: 'urgent', assignee: itStaff[0]._id, department: 'it', deadline: new Date('2026-06-28'), tags: ['bug', 'website'], createdBy: itManager._id },
    { code: 'TASK-012', title: 'Làm hợp đồng với hãng bay', description: 'Soạn và ký hợp đồng với Vietnam Airlines cho mùa cao điểm', status: 'review', priority: 'high', assignee: saleStaff[4]._id, department: 'sale', deadline: new Date('2026-07-10'), tags: ['contract', 'airline'], createdBy: saleManager._id },
    { code: 'TASK-013', title: 'Tổ chức team building Q3', description: 'Lên kế hoạch team building cho toàn công ty quý 3', status: 'todo', priority: 'low', assignee: users[4]._id, department: 'hr', deadline: new Date('2026-08-30'), tags: ['event', 'team'], createdBy: hrManager._id },
    { code: 'TASK-014', title: 'Review SEO website tháng 7', description: 'Phân tích traffic, keyword ranking và đề xuất cải thiện', status: 'todo', priority: 'medium', assignee: mktStaff[4]._id, department: 'marketing', deadline: new Date('2026-07-30'), tags: ['seo', 'analytics'], createdBy: mktManager._id },
    { code: 'TASK-015', title: 'Nâng cấp server', description: 'Nâng cấp RAM và SSD cho server production', status: 'todo', priority: 'high', assignee: itStaff[2]._id, department: 'it', deadline: new Date('2026-07-20'), tags: ['server', 'upgrade'], createdBy: itManager._id },
    { code: 'TASK-016', title: 'Chuẩn bị tài liệu Tour Thái Lan', description: 'Chuẩn bị hồ sơ visa, thông tin tour cho khách hàng', status: 'todo', priority: 'high', assignee: saleStaff[1]._id, department: 'sale', deadline: new Date('2026-08-20'), tags: ['document', 'visa'], createdBy: saleManager._id },
    { code: 'TASK-017', title: 'Thiết kế email marketing Tour Hè', description: 'Thiết kế template email cho chiến dịch Tour Hè', status: 'done', priority: 'medium', assignee: mktStaff[2]._id, department: 'marketing', deadline: new Date('2026-06-25'), tags: ['email', 'design'], createdBy: mktManager._id },
    { code: 'TASK-018', title: 'Đánh giá KPI Q2', description: 'Tổng hợp và đánh giá KPI quý 2 cho toàn bộ nhân sự', status: 'in_progress', priority: 'high', assignee: hrManager._id, department: 'hr', deadline: new Date('2026-07-10'), tags: ['kpi', 'hr'], createdBy: director._id },
    { code: 'TASK-019', title: 'Chăm sóc khách hàng VIP', description: 'Gọi điện chăm sóc 50 khách hàng VIP, gửi ưu đãi tour mới', status: 'in_progress', priority: 'medium', assignee: saleStaff[8]._id, department: 'sale', deadline: new Date('2026-07-15'), tags: ['vip', 'care'], createdBy: saleManager._id },
    { code: 'TASK-020', title: 'Setup SSL cho subdomain', description: 'Cài đặt SSL Let\'s Encrypt cho booking.travelops.vn', status: 'done', priority: 'medium', assignee: itStaff[0]._id, department: 'it', deadline: new Date('2026-06-20'), tags: ['ssl', 'security'], createdBy: itManager._id },
    { code: 'TASK-021', title: 'Quay TikTok Tour Phú Quốc', description: 'Quay 10 video TikTok ngắn quảng bá Tour Phú Quốc', status: 'todo', priority: 'medium', assignee: mktStaff[5]._id, department: 'marketing', deadline: new Date('2026-07-18'), tags: ['tiktok', 'video'], createdBy: mktManager._id },
    { code: 'TASK-022', title: 'Kiểm tra bảo hiểm tour quốc tế', description: 'Đối chiếu và gia hạn bảo hiểm du lịch cho tour quốc tế', status: 'review', priority: 'high', assignee: saleStaff[6]._id, department: 'sale', deadline: new Date('2026-07-25'), tags: ['insurance'], createdBy: saleManager._id },
    { code: 'TASK-023', title: 'Gia hạn hợp đồng nhân sự', description: 'Gia hạn hợp đồng cho 5 nhân viên hết hạn tháng 8', status: 'todo', priority: 'high', assignee: users[2]._id, department: 'hr', deadline: new Date('2026-07-30'), tags: ['contract', 'hr'], createdBy: hrManager._id },
    { code: 'TASK-024', title: 'Phân tích đối thủ cạnh tranh', description: 'Nghiên cứu giá tour và chiến lược marketing của 3 đối thủ chính', status: 'todo', priority: 'medium', assignee: mktStaff[0]._id, department: 'marketing', deadline: new Date('2026-08-10'), tags: ['research', 'competitor'], createdBy: mktManager._id },
    { code: 'TASK-025', title: 'Cập nhật app mobile', description: 'Fix crash và cập nhật UI cho app booking mobile', status: 'in_progress', priority: 'urgent', assignee: itStaff[1]._id, department: 'it', deadline: new Date('2026-07-05'), tags: ['mobile', 'bug'], createdBy: itManager._id },
  ];

  const tasks = await Task.insertMany(tasksData);
  console.log(`📋 Đã tạo ${tasks.length} công việc`);

  // ========== APPROVALS (20 đề xuất) ==========
  const approvalsData = [
    { code: 'APR-001', type: 'expense', title: 'Đề xuất chi phí quảng cáo Facebook Tour Hè 2026', content: 'Đề xuất ngân sách 15 triệu VND cho chiến dịch Facebook Ads quảng bá tour mùa hè.', amount: 15000000, department: 'marketing', status: 'approved', createdBy: mktStaff[3]._id, approvalFlow: [{ stepOrder: 1, roleRequired: 'manager', reviewer: mktManager._id, status: 'approved', note: 'Đồng ý, ngân sách hợp lý', reviewedAt: new Date('2026-06-20') }, { stepOrder: 2, roleRequired: 'director', reviewer: director._id, status: 'approved', note: 'OK, triển khai ngay', reviewedAt: new Date('2026-06-21') }] },
    { code: 'APR-002', type: 'travel', title: 'Đề xuất công tác khảo sát Tour Hạ Long', content: 'Cần đi khảo sát tour Hạ Long - Sapa 3 ngày để kiểm tra chất lượng dịch vụ đối tác.', amount: 8000000, department: 'sale', status: 'approved', createdBy: saleStaff[0]._id, approvalFlow: [{ stepOrder: 1, roleRequired: 'manager', reviewer: saleManager._id, status: 'approved', note: 'Cần thiết, duyệt', reviewedAt: new Date('2026-06-18') }, { stepOrder: 2, roleRequired: 'director', reviewer: director._id, status: 'approved', note: 'Đồng ý', reviewedAt: new Date('2026-06-19') }] },
    { code: 'APR-003', type: 'leave', title: 'Xin nghỉ phép 3 ngày', content: 'Xin phép nghỉ từ 15-17/07 để về quê giỗ ông bà.', amount: 0, department: 'marketing', status: 'approved', createdBy: mktStaff[1]._id, approvalFlow: [{ stepOrder: 1, roleRequired: 'manager', reviewer: mktManager._id, status: 'approved', note: 'OK', reviewedAt: new Date('2026-06-25') }, { stepOrder: 2, roleRequired: 'director', reviewer: director._id, status: 'approved', note: 'Đồng ý', reviewedAt: new Date('2026-06-25') }] },
    { code: 'APR-004', type: 'purchase', title: 'Mua 2 laptop cho phòng IT', content: 'Đề xuất mua 2 laptop Dell Latitude mới cho nhân viên phòng IT (máy cũ đã hỏng).', amount: 36000000, department: 'it', status: 'pending_director', createdBy: itStaff[0]._id, approvalFlow: [{ stepOrder: 1, roleRequired: 'manager', reviewer: itManager._id, status: 'approved', note: 'Cần thiết cho công việc', reviewedAt: new Date('2026-06-24') }, { stepOrder: 2, roleRequired: 'director', reviewer: director._id, status: 'pending' }] },
    { code: 'APR-005', type: 'expense', title: 'Chi phí in brochure Tour Hè', content: 'In 1000 brochure quảng cáo tour mùa hè tại nhà in ABC.', amount: 5500000, department: 'marketing', status: 'pending_manager', createdBy: mktStaff[2]._id, approvalFlow: [{ stepOrder: 1, roleRequired: 'manager', reviewer: mktManager._id, status: 'pending' }, { stepOrder: 2, roleRequired: 'director', reviewer: director._id, status: 'pending' }] },
    { code: 'APR-006', type: 'leave', title: 'Xin nghỉ phép 1 ngày đi khám bệnh', content: 'Xin nghỉ ngày 28/06 để đi khám sức khỏe định kỳ.', amount: 0, department: 'sale', status: 'approved', createdBy: saleStaff[2]._id, approvalFlow: [{ stepOrder: 1, roleRequired: 'manager', reviewer: saleManager._id, status: 'approved', note: 'OK', reviewedAt: new Date('2026-06-26') }, { stepOrder: 2, roleRequired: 'director', reviewer: director._id, status: 'approved', note: 'Đồng ý', reviewedAt: new Date('2026-06-26') }] },
    { code: 'APR-007', type: 'partnership', title: 'Hợp tác với KOL quảng bá tour', content: 'Đề xuất hợp tác với KOL du lịch @travelvietnam (500K followers) để review tour Phú Quốc.', amount: 20000000, department: 'marketing', status: 'pending_director', createdBy: mktManager._id, approvalFlow: [{ stepOrder: 1, roleRequired: 'director', reviewer: director._id, status: 'pending' }] },
    { code: 'APR-008', type: 'expense', title: 'Tạm ứng chi phí tour Thái Lan', content: 'Tạm ứng chi phí đặt cọc khách sạn và vé máy bay cho tour Thái Lan tháng 9.', amount: 50000000, department: 'sale', status: 'pending_manager', createdBy: saleStaff[1]._id, approvalFlow: [{ stepOrder: 1, roleRequired: 'manager', reviewer: saleManager._id, status: 'pending' }, { stepOrder: 2, roleRequired: 'director', reviewer: director._id, status: 'pending' }] },
    { code: 'APR-009', type: 'purchase', title: 'Mua bàn ghế văn phòng', content: 'Đề xuất mua 5 bộ bàn ghế văn phòng mới cho khu vực phòng Sale.', amount: 25000000, department: 'hr', status: 'rejected', createdBy: users[2]._id, approvalFlow: [{ stepOrder: 1, roleRequired: 'manager', reviewer: hrManager._id, status: 'approved', note: 'Cần thiết', reviewedAt: new Date('2026-06-22') }, { stepOrder: 2, roleRequired: 'director', reviewer: director._id, status: 'rejected', note: 'Ngân sách Q3 hạn chế, hoãn sang Q4', reviewedAt: new Date('2026-06-23') }] },
    { code: 'APR-010', type: 'travel', title: 'Công tác khảo sát Tour Hàn Quốc', content: 'Đề xuất đi khảo sát tour Hàn Quốc 5 ngày để chuẩn bị mở tour mùa Thu.', amount: 25000000, department: 'sale', status: 'pending_director', createdBy: saleManager._id, approvalFlow: [{ stepOrder: 1, roleRequired: 'director', reviewer: director._id, status: 'pending' }] },
    { code: 'APR-011', type: 'leave', title: 'Xin nghỉ phép 5 ngày đi du lịch', content: 'Xin phép nghỉ từ 01-05/08 để đi du lịch gia đình.', amount: 0, department: 'it', status: 'approved', createdBy: itStaff[1]._id, approvalFlow: [{ stepOrder: 1, roleRequired: 'manager', reviewer: itManager._id, status: 'approved', note: 'OK, đã sắp xếp người thay', reviewedAt: new Date('2026-06-25') }, { stepOrder: 2, roleRequired: 'director', reviewer: director._id, status: 'approved', note: 'Đồng ý', reviewedAt: new Date('2026-06-25') }] },
    { code: 'APR-012', type: 'expense', title: 'Chi phí chạy TikTok Ads', content: 'Ngân sách 8 triệu cho TikTok Ads tháng 7 quảng bá tour nội địa.', amount: 8000000, department: 'marketing', status: 'pending_manager', createdBy: mktStaff[5]._id, approvalFlow: [{ stepOrder: 1, roleRequired: 'manager', reviewer: mktManager._id, status: 'pending' }, { stepOrder: 2, roleRequired: 'director', reviewer: director._id, status: 'pending' }] },
    { code: 'APR-013', type: 'other', title: 'Đề xuất thay đổi giờ làm việc mùa hè', content: 'Đề xuất điều chỉnh giờ làm việc 7h30-16h30 trong tháng 7-8 (tránh nắng nóng).', amount: 0, department: 'hr', status: 'returned', createdBy: hrManager._id, approvalFlow: [{ stepOrder: 1, roleRequired: 'director', reviewer: director._id, status: 'returned', note: 'Cần khảo sát ý kiến toàn bộ nhân viên trước', reviewedAt: new Date('2026-06-24') }] },
    { code: 'APR-014', type: 'expense', title: 'Thuê xe 45 chỗ Tour Đà Lạt', content: 'Thuê xe giường nằm 45 chỗ cho 3 chuyến Tour Đà Lạt tháng 7.', amount: 12000000, department: 'sale', status: 'approved', createdBy: saleStaff[5]._id, approvalFlow: [{ stepOrder: 1, roleRequired: 'manager', reviewer: saleManager._id, status: 'approved', note: 'Giá hợp lý', reviewedAt: new Date('2026-06-23') }, { stepOrder: 2, roleRequired: 'director', reviewer: director._id, status: 'approved', note: 'OK', reviewedAt: new Date('2026-06-24') }] },
    { code: 'APR-015', type: 'purchase', title: 'Mua máy in màu A3', content: 'Đề xuất mua 1 máy in màu A3 cho phòng Marketing in tài liệu quảng cáo.', amount: 15000000, department: 'marketing', status: 'pending_director', createdBy: mktStaff[2]._id, approvalFlow: [{ stepOrder: 1, roleRequired: 'manager', reviewer: mktManager._id, status: 'approved', note: 'Cần thiết cho in brochure', reviewedAt: new Date('2026-06-25') }, { stepOrder: 2, roleRequired: 'director', reviewer: director._id, status: 'pending' }] },
    { code: 'APR-016', type: 'leave', title: 'Xin nghỉ phép 2 ngày', content: 'Xin nghỉ 10-11/07 vì lý do gia đình.', amount: 0, department: 'hr', status: 'pending_manager', createdBy: users[5]._id, approvalFlow: [{ stepOrder: 1, roleRequired: 'manager', reviewer: hrManager._id, status: 'pending' }, { stepOrder: 2, roleRequired: 'director', reviewer: director._id, status: 'pending' }] },
    { code: 'APR-017', type: 'expense', title: 'Chi phí sửa chữa văn phòng', content: 'Sửa máy lạnh phòng Sale và thay bóng đèn LED tầng 2.', amount: 7500000, department: 'hr', status: 'approved', createdBy: users[6]._id, approvalFlow: [{ stepOrder: 1, roleRequired: 'manager', reviewer: hrManager._id, status: 'approved', note: 'Cần thiết', reviewedAt: new Date('2026-06-20') }, { stepOrder: 2, roleRequired: 'director', reviewer: director._id, status: 'approved', note: 'OK', reviewedAt: new Date('2026-06-20') }] },
    { code: 'APR-018', type: 'partnership', title: 'Ký hợp đồng với nhà hàng tour Huế', content: 'Ký hợp đồng dài hạn với nhà hàng Cơm Hến Hà Thành phục vụ bữa ăn tour Huế.', amount: 0, department: 'sale', status: 'approved', createdBy: saleStaff[5]._id, approvalFlow: [{ stepOrder: 1, roleRequired: 'manager', reviewer: saleManager._id, status: 'approved', note: 'Đã khảo sát, chất lượng tốt', reviewedAt: new Date('2026-06-22') }, { stepOrder: 2, roleRequired: 'director', reviewer: director._id, status: 'approved', note: 'Đồng ý ký 1 năm', reviewedAt: new Date('2026-06-22') }] },
    { code: 'APR-019', type: 'expense', title: 'Nâng cấp hosting website', content: 'Nâng cấp gói hosting từ Basic lên Business cho website travelops.vn.', amount: 3600000, department: 'it', status: 'approved', createdBy: itStaff[2]._id, approvalFlow: [{ stepOrder: 1, roleRequired: 'manager', reviewer: itManager._id, status: 'approved', note: 'Website cần tốc độ tốt hơn', reviewedAt: new Date('2026-06-19') }, { stepOrder: 2, roleRequired: 'director', reviewer: director._id, status: 'approved', note: 'OK', reviewedAt: new Date('2026-06-19') }] },
    { code: 'APR-020', type: 'other', title: 'Đề xuất tổ chức workshop chụp ảnh', content: 'Tổ chức workshop chụp ảnh du lịch cho team Marketing để nâng cao chất lượng ảnh tour.', amount: 5000000, department: 'marketing', status: 'pending_manager', createdBy: mktStaff[1]._id, approvalFlow: [{ stepOrder: 1, roleRequired: 'manager', reviewer: mktManager._id, status: 'pending' }, { stepOrder: 2, roleRequired: 'director', reviewer: director._id, status: 'pending' }] },
  ];

  const approvals = await Approval.insertMany(approvalsData);
  console.log(`📄 Đã tạo ${approvals.length} đề xuất`);

  // ========== BOOKINGS (30 booking) ==========
  const bookingsData = [];
  const customerNames = [
    'Nguyễn Văn An', 'Trần Thị Bình', 'Lê Quốc Cường', 'Phạm Thị Diệu', 'Hoàng Minh Em',
    'Vũ Thị Phương', 'Đỗ Văn Giang', 'Bùi Thị Hoa', 'Ngô Thanh Tùng', 'Lý Thị Kim',
    'Dương Văn Long', 'Mai Thị Nga', 'Cao Đức Oanh', 'Đinh Thị Phương', 'Trịnh Văn Quân',
    'Hồ Thị Rằng', 'Phan Văn Sơn', 'Lâm Thị Tuyết', 'Châu Văn Uy', 'Tạ Thị Vân',
    'Nguyễn Hữu Xuân', 'Trần Thị Yến', 'Lê Đình Zalo', 'Phạm Văn Bảo', 'Hoàng Thị Cúc',
    'Vũ Đức Dũng', 'Đỗ Thị Ái', 'Bùi Quang Hải', 'Ngô Thị Lan', 'Lý Văn Minh'
  ];

  const statuses = ['pending', 'confirmed', 'paid', 'completed', 'paid', 'confirmed'];
  const activeToursList = tours.filter(t => ['active', 'completed'].includes(t.status));

  for (let i = 0; i < 30; i++) {
    const tour = activeToursList[i % activeToursList.length];
    const adults = Math.floor(Math.random() * 3) + 1;
    const children = Math.floor(Math.random() * 2);
    bookingsData.push({
      code: `BK-${String(i + 1).padStart(3, '0')}`,
      tour: tour._id,
      customerName: customerNames[i],
      customerPhone: `09${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      customerEmail: `customer${i + 1}@email.com`,
      adults,
      children,
      totalPrice: (adults * tour.price.adult) + (children * tour.price.child),
      status: statuses[i % statuses.length],
      note: i % 3 === 0 ? 'Khách VIP, cần chăm sóc đặc biệt' : '',
      createdBy: saleStaff[i % saleStaff.length]._id,
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000)
    });
  }

  const bookings = await Booking.insertMany(bookingsData);
  console.log(`🎫 Đã tạo ${bookings.length} booking`);

  // ========== TICKETS (Yêu cầu hỗ trợ) ==========
  const hrStaff = users.filter(u => u.role === 'hr_staff');
  const ticketsData = [
    {
      code: 'TK-001', title: 'Lỗi phần mềm CRM không đăng nhập được',
      description: 'Từ sáng nay em không thể đăng nhập vào hệ thống CRM trên máy tính. Trình duyệt báo lỗi 500. Em đã thử xóa cache và đổi trình duyệt nhưng vẫn không được.',
      category: 'software', priority: 'high', status: 'resolved',
      requester: hrStaff[0]._id, requesterDepartment: 'hr',
      targetDepartment: 'it', assignee: itStaff[0]._id,
      resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      comments: [
        { user: itStaff[0]._id, content: 'Em kiểm tra xong rồi ạ, do session hết hạn. Em đã reset lại, chị thử đăng nhập lại nhé.', createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
        { user: hrStaff[0]._id, content: 'Đã đăng nhập được rồi, cảm ơn em!', createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }
      ]
    },
    {
      code: 'TK-002', title: 'Yêu cầu thiết kế banner khuyến mãi Hè 2026',
      description: 'Bên Sale cần 3 banner quảng cáo cho chiến dịch khuyến mãi mùa hè. Kích thước: 1200x628 (Facebook), 1080x1080 (Instagram), 728x90 (Web). Deadline: cuối tuần này.',
      category: 'design', priority: 'medium', status: 'in_progress',
      requester: saleStaff[0]._id, requesterDepartment: 'sale',
      targetDepartment: 'marketing', assignee: mktStaff[2]._id,
      comments: [
        { user: mktStaff[2]._id, content: 'Em nhận việc rồi ạ, sẽ gửi bản draft trước thứ 5.', createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }
      ]
    },
    {
      code: 'TK-003', title: 'Máy in tầng 3 bị kẹt giấy liên tục',
      description: 'Máy in Canon ở tầng 3 bị kẹt giấy liên tục từ hôm qua, đã thử gỡ giấy nhiều lần nhưng vẫn tái phát. Cần kỹ thuật viên kiểm tra.',
      category: 'hardware', priority: 'medium', status: 'assigned',
      requester: hrStaff[1]._id, requesterDepartment: 'hr',
      targetDepartment: 'it', assignee: itStaff[3]._id
    },
    {
      code: 'TK-004', title: 'Cấp tài khoản email cho nhân viên mới',
      description: 'Phòng HR vừa nhận 2 nhân viên mới (Nguyễn Văn A và Trần Thị B), cần tạo email công ty @travelops.vn cho họ.',
      category: 'account', priority: 'high', status: 'open',
      requester: hrManager._id, requesterDepartment: 'hr',
      targetDepartment: 'it'
    },
    {
      code: 'TK-005', title: 'Mạng WiFi văn phòng chập chờn',
      description: 'Mạng WiFi tầng 2 bị chập chờn từ 14h chiều nay, ảnh hưởng đến công việc của cả phòng Sale. Cần kiểm tra router.',
      category: 'network', priority: 'urgent', status: 'in_progress',
      requester: saleManager._id, requesterDepartment: 'sale',
      targetDepartment: 'it', assignee: itStaff[2]._id,
      comments: [
        { user: itStaff[2]._id, content: 'Em đang kiểm tra router tầng 2, có vẻ bị quá tải. Em sẽ restart và cấu hình lại.', createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) }
      ]
    },
    {
      code: 'TK-006', title: 'Xuất báo cáo doanh thu quý 2',
      description: 'Cần phòng IT hỗ trợ xuất báo cáo doanh thu quý 2/2026 từ hệ thống, bao gồm breakdown theo tour và theo tháng.',
      category: 'data', priority: 'medium', status: 'open',
      requester: saleStaff[2]._id, requesterDepartment: 'sale',
      targetDepartment: 'it'
    },
    {
      code: 'TK-007', title: 'Cập nhật nội dung trang web tour Đà Nẵng',
      description: 'Cần cập nhật mô tả, giá tour và hình ảnh cho tour Đà Nẵng - Hội An trên website chính. Nội dung mới đã gửi qua email.',
      category: 'software', priority: 'low', status: 'closed',
      requester: mktManager._id, requesterDepartment: 'marketing',
      targetDepartment: 'it', assignee: itStaff[1]._id,
      resolvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      comments: [
        { user: itStaff[1]._id, content: 'Đã cập nhật xong, chị kiểm tra lại giúp em nhé.', createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) },
        { user: mktManager._id, content: 'OK rồi em, cảm ơn nhé!', createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }
      ]
    },
    {
      code: 'TK-008', title: 'Hỗ trợ đăng bài lên fanpage',
      description: 'Bên Sale có bài viết review tour Phú Quốc từ khách hàng, nhờ Marketing hỗ trợ edit và đăng lên fanpage.',
      category: 'design', priority: 'low', status: 'open',
      requester: saleStaff[4]._id, requesterDepartment: 'sale',
      targetDepartment: 'marketing'
    },
    {
      code: 'TK-009', title: 'Reset mật khẩu tài khoản email',
      description: 'Em quên mật khẩu email công ty, đã thử khôi phục nhưng không nhận được mã OTP. Nhờ IT reset giúp.',
      category: 'account', priority: 'medium', status: 'resolved',
      requester: mktStaff[0]._id, requesterDepartment: 'marketing',
      targetDepartment: 'it', assignee: itStaff[0]._id,
      resolvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      comments: [
        { user: itStaff[0]._id, content: 'Em đã reset mật khẩu, mật khẩu mới là 123456. Anh đăng nhập và đổi lại mật khẩu ngay nhé.', createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }
      ]
    },
    {
      code: 'TK-010', title: 'Cài đặt phần mềm kế toán mới',
      description: 'Phòng HR cần cài đặt phần mềm MISA trên 3 máy tính để phục vụ công tác C&B. Nhờ IT hỗ trợ.',
      category: 'software', priority: 'high', status: 'assigned',
      requester: hrStaff[4]._id, requesterDepartment: 'hr',
      targetDepartment: 'it', assignee: itStaff[3]._id
    }
  ];

  const ticketDocs = await Ticket.insertMany(ticketsData);
  console.log(`🎫 Đã tạo ${ticketDocs.length} ticket hỗ trợ`);

  console.log('\n✅ Seed hoàn tất!');
  console.log('\n📌 Tài khoản đăng nhập:');
  console.log('  Giám Đốc:       giamdoc / 123456');
  console.log('  TP. Nhân Sự:    hr.manager / 123456');
  console.log('  TP. Kinh Doanh: sale.manager / 123456');
  console.log('  TP. Marketing:  mkt.manager / 123456');
  console.log('  TP. IT:         it.manager / 123456');
  console.log('  NV Sale:        sale.staff1 / 123456');
  console.log('  NV Marketing:   mkt.staff1 / 123456');
  console.log('  NV IT:          it.staff1 / 123456');

  process.exit(0);
};

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
