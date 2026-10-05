require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/database');
const authenticate = require('./middleware/auth');
const validateId = require('./middleware/validateId');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const tourRoutes = require('./routes/tours');
const taskRoutes = require('./routes/tasks');
const approvalRoutes = require('./routes/approvals');
const bookingRoutes = require('./routes/bookings');
const dashboardRoutes = require('./routes/dashboard');
const notificationRoutes = require('./routes/notifications');
const departmentRoutes = require('./routes/departments');
const ticketRoutes = require('./routes/tickets');
const announcementRoutes = require('./routes/announcements');
const attendanceRoutes = require('./routes/attendance');
const calendarRoutes = require('./routes/calendar');
const exportRoutes = require('./routes/exports');
const activityRoutes = require('./routes/activity');
const customerRoutes = require('./routes/customers');
const searchRoutes = require('./routes/search');
const chatRoutes = require('./routes/chat');
const documentRoutes = require('./routes/documents');
const kpiRoutes = require('./routes/kpi');
const meetingRoutes = require('./routes/meetings');
const emailRoutingRoutes = require('./routes/emailRouting');
const tourOperationsRoutes = require('./routes/tourOperations');
const publicToursRoutes = require('./routes/publicTours');
const websiteIntegrationsRoutes = require('./routes/websiteIntegrations');
const uiSettingsRoutes = require('./routes/uiSettings');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : '*',
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Validate ObjectId cho mọi route có param :id
app.param('id', (req, res, next, id) => {
  return validateId(req, res, next);
});

// Public routes (không cần đăng nhập)
app.use('/api/auth', authRoutes);
app.use('/api/attendance/uploads', express.static(require('path').join(__dirname, '../uploads/attendance')));
app.use('/api/public/tours', publicToursRoutes);
app.use('/api/integrations/website', websiteIntegrationsRoutes);

// Protected routes (cần đăng nhập)
app.use('/api/users', authenticate, userRoutes);
app.use('/api/tours', authenticate, tourRoutes);
app.use('/api/tasks', authenticate, taskRoutes);
app.use('/api/approvals', authenticate, approvalRoutes);
app.use('/api/bookings', authenticate, bookingRoutes);
app.use('/api/dashboard', authenticate, dashboardRoutes);
app.use('/api/notifications', authenticate, notificationRoutes);
app.use('/api/departments', authenticate, departmentRoutes);
app.use('/api/tickets', authenticate, ticketRoutes);
app.use('/api/announcements', authenticate, announcementRoutes);
app.use('/api/attendance', authenticate, attendanceRoutes);
app.use('/api/calendar', authenticate, calendarRoutes);
app.use('/api/exports', authenticate, exportRoutes);
app.use('/api/activity', authenticate, activityRoutes);
app.use('/api/customers', authenticate, customerRoutes);
app.use('/api/search', authenticate, searchRoutes);
app.use('/api/chat', authenticate, chatRoutes);
app.use('/api/documents', authenticate, documentRoutes);
app.use('/api/kpi', authenticate, kpiRoutes);
app.use('/api/meetings', authenticate, meetingRoutes);
app.use('/api/email-routing', authenticate, emailRoutingRoutes);
app.use('/api/tour-operations', authenticate, tourOperationsRoutes);
app.use('/api/ui-settings', authenticate, uiSettingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

// Phục vụ giao diện React static files khi chạy môi trường Production (nếu có thư mục client)
const fs = require('fs');
const path = require('path');
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*splat', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  // Trả về thông báo trạng thái hoạt động của API cho root path
  app.get('/', (req, res) => {
    res.json({ message: 'TravelOps API is running successfully', status: 'OK' });
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Lỗi server nội bộ' });
});

const { startCronJobs } = require('./cron');
const http = require('http');
const { Server } = require('socket.io');

// Khởi tạo HTTP server và Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions
});

// Lưu io vào app để các routes có thể dùng (vd: req.app.get('io').emit)
app.set('io', io);
global.io = io;

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  // Tham gia phòng theo ID người dùng để nhận thông báo riêng
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`👤 User ${userId} joined room ${userId}`);
  });

  socket.on('chat:join', ({ channel = 'general', department, receiver, userId }) => {
    let room = 'general';
    if (channel === 'department') room = `department:${department}`;
    if (channel === 'direct' && receiver && userId) {
      room = `direct:${[receiver.toString(), userId.toString()].sort().join(':')}`;
    }
    socket.join(room);
  });

  socket.on('chat:typing', ({ channel = 'general', department, receiver, userId, userName }) => {
    let room = 'general';
    if (channel === 'department') room = `department:${department}`;
    if (channel === 'direct' && receiver && userId) {
      room = `direct:${[receiver.toString(), userId.toString()].sort().join(':')}`;
    }
    socket.to(room).emit('chat:typing', { channel, department, receiver, userId, userName });
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Start server
const start = async () => {
  await connectDB();
  startCronJobs();
  server.listen(PORT, () => {
    console.log(`🚀 TravelOps API running on http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔌 WebSocket server is ready`);
  });
};

start();
