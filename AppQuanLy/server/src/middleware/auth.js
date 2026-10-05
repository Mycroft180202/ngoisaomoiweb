const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'travelops_secret_key_2026';

/**
 * Middleware xác thực JWT token
 * Attach user info vào req.user
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const queryToken = req.query?.token;
    if ((!authHeader || !authHeader.startsWith('Bearer ')) && !queryToken) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập' });
    }

    const token = queryToken || authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      return res.status(401).json({ error: 'Tài khoản không tồn tại' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Tài khoản đã bị vô hiệu hóa' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Phiên đăng nhập hết hạn' });
    }
    return res.status(401).json({ error: 'Token không hợp lệ' });
  }
};

module.exports = authenticate;
