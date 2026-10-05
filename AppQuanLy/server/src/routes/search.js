const express = require('express');
const router = express.Router();
const Tour = require('../models/Tour');
const Task = require('../models/Task');
const Customer = require('../models/Customer');
const User = require('../models/User');

/**
 * GET /api/search?q=query
 * Tìm kiếm toàn cục đa đối tượng
 */
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      return res.json({ results: [] });
    }

    const regex = new RegExp(q.trim(), 'i');

    const [tours, tasks, customers, users] = await Promise.all([
      Tour.find({ $or: [{ name: regex }, { code: regex }, { destination: regex }] }).limit(5).select('name code destination'),
      Task.find({ $or: [{ title: regex }, { code: regex }] }).limit(5).select('title code status'),
      Customer.find({ $or: [{ name: regex }, { phone: regex }, { code: regex }] }).limit(5).select('name code phone'),
      User.find({ $or: [{ fullName: regex }, { username: regex }] }).limit(5).select('fullName username role department')
    ]);

    const results = [
      ...tours.map(t => ({ id: t._id, title: t.name, subtitle: `[${t.code}] ${t.destination}`, type: 'tour', link: `/tours?id=${t._id}` })),
      ...tasks.map(t => ({ id: t._id, title: t.title, subtitle: `[${t.code}] - ${t.status}`, type: 'task', link: `/tasks?id=${t._id}` })),
      ...customers.map(c => ({ id: c._id, title: c.name, subtitle: `[${c.code}] SĐT: ${c.phone}`, type: 'customer', link: `/customers?id=${c._id}` })),
      ...users.map(u => ({ id: u._id, title: u.fullName, subtitle: `@${u.username} (${u.department})`, type: 'user', link: `/staff?id=${u._id}` }))
    ];

    res.json({ results });
  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({ error: 'Lỗi tìm kiếm' });
  }
});

module.exports = router;
