const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const uploadChat = require('../middleware/chatUpload');

const formatFileSize = (bytes = 0) => {
  if (!bytes) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

const getRoomKey = ({ channel = 'general', department, receiver, userId }) => {
  const receiverId = receiver?._id || receiver;
  const senderId = userId?._id || userId;
  if (channel === 'direct' && receiverId && senderId) {
    return `direct:${[receiverId.toString(), senderId.toString()].sort().join(':')}`;
  }
  if (channel === 'department') return `department:${department}`;
  return 'general';
};

const canAccessMessage = (user, message) => {
  if (message.channel === 'general') return true;
  if (message.channel === 'department') return message.department === user.department;
  const senderId = message.sender?._id || message.sender;
  const receiverId = message.receiver?._id || message.receiver;
  return [senderId?.toString(), receiverId?.toString()].includes(user._id.toString());
};

const emitChatMessage = (req, message) => {
  const io = req.app.get('io');
  if (!io) return;

  const room = getRoomKey({
    channel: message.channel,
    department: message.department,
    receiver: message.receiver,
    userId: message.sender?._id || message.sender
  });

  io.to(room).emit('chat:new_message', message);
  const receiverId = message.receiver?._id || message.receiver;
  const senderId = message.sender?._id || message.sender;
  if (message.channel === 'direct' && receiverId) {
    io.to(receiverId.toString()).emit('chat:new_direct_message', message);
    io.to(senderId.toString()).emit('chat:new_direct_message', message);
  }
};

/**
 * GET /api/chat/conversations
 * Danh sách kênh/hội thoại nổi bật kèm số tin chưa đọc
 */
router.get('/conversations', async (req, res) => {
  try {
    const userId = req.user._id;
    const users = await User.find({ _id: { $ne: userId }, status: 'active' })
      .select('fullName avatar role department position')
      .sort({ fullName: 1 })
      .limit(100);

    const baseFilters = [
      { channel: 'general' },
      { channel: 'department', department: req.user.department },
      { channel: 'direct', $or: [{ sender: userId }, { receiver: userId }] }
    ];

    const messages = await Message.find({ $or: baseFilters, archivedBy: { $ne: userId } })
      .populate('sender', 'fullName avatar role department')
      .populate('receiver', 'fullName avatar role department')
      .sort({ createdAt: -1 })
      .limit(300);

    const makeStats = (filterFn) => {
      const list = messages.filter(filterFn);
      const unread = list.filter(msg =>
        msg.sender?._id?.toString() !== userId.toString()
        && !msg.readBy?.some(item => item.user?.toString() === userId.toString())
      ).length;
      return { lastMessage: list[0] || null, unread };
    };

    const conversations = [
      {
        id: 'general',
        channel: 'general',
        title: 'Kênh Chung toàn công ty',
        ...makeStats(msg => msg.channel === 'general')
      },
      {
        id: `department:${req.user.department}`,
        channel: 'department',
        department: req.user.department,
        title: `Phòng ${String(req.user.department || '').toUpperCase()}`,
        ...makeStats(msg => msg.channel === 'department' && msg.department === req.user.department)
      },
      ...users.map(user => {
        const stats = makeStats(msg => msg.channel === 'direct' && (
          msg.sender?._id?.toString() === user._id.toString()
          || msg.receiver?._id?.toString() === user._id.toString()
        ));
        return {
          id: `direct:${user._id}`,
          channel: 'direct',
          user,
          title: user.fullName,
          ...stats
        };
      })
    ];

    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/chat/messages
 */
router.get('/messages', async (req, res) => {
  try {
    const { channel = 'general', receiver, department } = req.query;
    const userId = req.user._id;
    const filter = { archivedBy: { $ne: userId } };

    if (channel === 'direct' && receiver) {
      filter.channel = 'direct';
      filter.$or = [
        { sender: userId, receiver },
        { sender: receiver, receiver: userId }
      ];
    } else if (channel === 'department') {
      filter.channel = 'department';
      filter.department = department || req.user.department;
    } else {
      filter.channel = 'general';
    }

    const messages = await Message.find(filter)
      .populate('sender', 'fullName avatar role department')
      .populate('receiver', 'fullName avatar')
      .sort({ createdAt: 1 })
      .limit(150);

    res.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * POST /api/chat/send
 */
router.post('/send', uploadChat.array('files', 5), async (req, res) => {
  try {
    const { channel = 'general', receiver, department, content = '' } = req.body;
    const attachments = (req.files || []).map(file => ({
      originalName: file.originalname,
      storagePath: file.path,
      mimeType: file.mimetype,
      size: file.size
    }));

    if (!content.trim() && attachments.length === 0) {
      return res.status(400).json({ error: 'Tin nhắn cần có nội dung hoặc file đính kèm' });
    }

    const message = new Message({
      sender: req.user._id,
      receiver: channel === 'direct' ? receiver || null : null,
      channel: channel || 'general',
      department: channel === 'department' ? (department || req.user.department) : null,
      content: content.trim(),
      attachments,
      readBy: [{ user: req.user._id, readAt: new Date() }]
    });

    await message.save();

    const populated = await Message.findById(message._id)
      .populate('sender', 'fullName avatar role department')
      .populate('receiver', 'fullName avatar');

    emitChatMessage(req, populated);
    res.status(201).json({ message: populated });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

/**
 * PATCH /api/chat/read
 */
router.patch('/read', async (req, res) => {
  try {
    const { channel = 'general', receiver, department } = req.body;
    const userId = req.user._id;
    const filter = {
      sender: { $ne: userId },
      'readBy.user': { $ne: userId }
    };

    if (channel === 'direct' && receiver) {
      filter.channel = 'direct';
      filter.$or = [
        { sender: userId, receiver },
        { sender: receiver, receiver: userId }
      ];
    } else if (channel === 'department') {
      filter.channel = 'department';
      filter.department = department || req.user.department;
    } else {
      filter.channel = 'general';
    }

    await Message.updateMany(filter, { $push: { readBy: { user: userId, readAt: new Date() } } });
    res.json({ message: 'Đã đánh dấu đã đọc' });
  } catch (error) {
    console.error('Mark chat read error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * PATCH /api/chat/archive
 */
router.patch('/archive', async (req, res) => {
  try {
    const { channel = 'general', receiver, department } = req.body;
    const userId = req.user._id;
    const filter = {};

    if (channel === 'direct' && receiver) {
      filter.channel = 'direct';
      filter.$or = [
        { sender: userId, receiver },
        { sender: receiver, receiver: userId }
      ];
    } else if (channel === 'department') {
      filter.channel = 'department';
      filter.department = department || req.user.department;
    } else {
      filter.channel = 'general';
    }

    await Message.updateMany(filter, { $addToSet: { archivedBy: userId } });
    res.json({ message: 'Đã lưu trữ cuộc trò chuyện' });
  } catch (error) {
    console.error('Archive chat error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

/**
 * GET /api/chat/messages/:id/attachments/:index
 */
router.get('/messages/:id/attachments/:index', async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ error: 'Không tìm thấy tin nhắn' });
    if (!canAccessMessage(req.user, message)) return res.status(403).json({ error: 'Bạn không có quyền tải file này' });

    const attachment = message.attachments?.[Number(req.params.index)];
    if (!attachment || !attachment.storagePath || !fs.existsSync(attachment.storagePath)) {
      return res.status(404).json({ error: 'File không tồn tại' });
    }

    res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.originalName || 'chat-file')}"`);
    fs.createReadStream(attachment.storagePath).pipe(res);
  } catch (error) {
    console.error('Download chat attachment error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

router.formatFileSize = formatFileSize;
module.exports = router;
