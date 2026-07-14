const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth('company', 'candidate', 'admin'), (req, res) => {
  const userType = req.user.role === 'candidate' ? 'candidate' : req.user.role; // company | candidate | admin
  let rows;
  if (userType === 'admin') {
    rows = db.prepare('SELECT * FROM notifications WHERE user_type = \'admin\' ORDER BY created_at DESC LIMIT 50').all();
  } else {
    rows = db.prepare('SELECT * FROM notifications WHERE user_type = ? AND user_id = ? ORDER BY created_at DESC LIMIT 50').all(userType, req.user.id);
  }
  res.json(rows);
});

router.put('/read-all', requireAuth('company', 'candidate', 'admin'), (req, res) => {
  const userType = req.user.role === 'candidate' ? 'candidate' : req.user.role;
  if (userType === 'admin') {
    db.prepare('UPDATE notifications SET unread = 0 WHERE user_type = \'admin\'').run();
  } else {
    db.prepare('UPDATE notifications SET unread = 0 WHERE user_type = ? AND user_id = ?').run(userType, req.user.id);
  }
  res.json({ ok: true });
});

module.exports = router;
