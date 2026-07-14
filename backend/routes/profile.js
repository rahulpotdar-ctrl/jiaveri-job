const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const safe = Date.now() + '_' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, safe);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB max

// Candidate profile
router.get('/candidate/me', requireAuth('candidate'), (req, res) => {
  const cand = db.prepare('SELECT id, name, phone, category, experience, resume_path, membership_active, membership_expiry FROM candidates WHERE id = ?').get(req.user.id);
  res.json(cand);
});

router.put('/candidate/me', requireAuth('candidate'), (req, res) => {
  const { name, category, experience } = req.body;
  db.prepare('UPDATE candidates SET name = COALESCE(?,name), category = COALESCE(?,category), experience = COALESCE(?,experience) WHERE id = ?')
    .run(name || null, category || null, experience || null, req.user.id);
  res.json({ ok: true });
});

router.post('/candidate/me/resume', requireAuth('candidate'), upload.single('resume'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'फाईल आवश्यक आहे.' });
  db.prepare('UPDATE candidates SET resume_path = ? WHERE id = ?').run(req.file.filename, req.user.id);
  res.json({ ok: true, filename: req.file.filename });
});

// Company profile
router.get('/company/me', requireAuth('company'), (req, res) => {
  const co = db.prepare('SELECT id, name, phone, category, location, status, membership_active, membership_expiry FROM companies WHERE id = ?').get(req.user.id);
  res.json(co);
});

router.put('/company/me', requireAuth('company'), (req, res) => {
  const { name, category, location } = req.body;
  db.prepare('UPDATE companies SET name = COALESCE(?,name), category = COALESCE(?,category), location = COALESCE(?,location) WHERE id = ?')
    .run(name || null, category || null, location || null, req.user.id);
  res.json({ ok: true });
});

module.exports = router;
