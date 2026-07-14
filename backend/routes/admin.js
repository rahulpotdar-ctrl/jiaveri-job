const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth('admin'));

router.get('/companies', (req, res) => {
  res.json(db.prepare('SELECT id, name, phone, category, location, status, membership_active, membership_expiry FROM companies ORDER BY created_at DESC').all());
});

router.put('/companies/:id/status', (req, res) => {
  const { status } = req.body; // approved | blocked
  if (!['approved', 'blocked', 'pending'].includes(status)) return res.status(400).json({ error: 'अवैध स्थिती.' });
  db.prepare('UPDATE companies SET status = ? WHERE id = ?').run(status, req.params.id);
  const co = db.prepare('SELECT name FROM companies WHERE id = ?').get(req.params.id);
  const labels = { approved: 'तुमचे खाते मंजूर झाले आहे!', blocked: 'तुमचे खाते ब्लॉक करण्यात आले आहे.' };
  if (labels[status]) {
    db.prepare(`INSERT INTO notifications (user_type, user_id, title, body) VALUES ('company', ?, ?, ?)`)
      .run(req.params.id, 'खाते स्थिती अपडेट', labels[status]);
  }
  res.json({ ok: true });
});

router.get('/candidates', (req, res) => {
  res.json(db.prepare('SELECT id, name, phone, category, experience, resume_path, membership_active, membership_expiry FROM candidates ORDER BY created_at DESC').all());
});

router.get('/jobs', (req, res) => {
  res.json(db.prepare(`
    SELECT jobs.*, companies.name as company_name FROM jobs
    JOIN companies ON companies.id = jobs.company_id
    ORDER BY jobs.created_at DESC
  `).all());
});

router.put('/jobs/:id/status', (req, res) => {
  const { status } = req.body; // approved | rejected
  if (!['approved', 'rejected', 'pending'].includes(status)) return res.status(400).json({ error: 'अवैध स्थिती.' });
  db.prepare('UPDATE jobs SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ ok: true });
});

router.get('/payments', (req, res) => {
  const rows = db.prepare('SELECT * FROM payments ORDER BY created_at DESC').all();
  const total = rows.reduce((s, p) => s + p.amount, 0);
  res.json({ rows, total });
});

router.get('/memberships', (req, res) => {
  const companies = db.prepare('SELECT id, name, membership_active, membership_expiry FROM companies').all();
  const candidates = db.prepare('SELECT id, name, membership_active, membership_expiry FROM candidates').all();
  res.json({ companies, candidates });
});

module.exports = router;
