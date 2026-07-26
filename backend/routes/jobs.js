const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Public/candidate: search approved jobs (optional ?category=)
// Candidate: browse jobs matching their own category — free, no membership needed
router.get('/', requireAuth('candidate'), (req, res) => {
  const cand = db.prepare('SELECT category FROM candidates WHERE id = ?').get(req.user.id);
  const jobs = db.prepare(`
    SELECT jobs.*, companies.name as company_name, companies.location as company_location
    FROM jobs JOIN companies ON companies.id = jobs.company_id
    WHERE jobs.status = 'approved' AND jobs.category = ?
    ORDER BY jobs.created_at DESC
  `).all(cand.category);
  res.json(jobs);
});
// Company: my vacancies (all statuses)
router.get('/mine', requireAuth('company'), (req, res) => {
  const jobs = db.prepare('SELECT * FROM jobs WHERE company_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json(jobs);
});

// Company: post a new vacancy (goes to Admin for approval)
router.post('/', requireAuth('company'), (req, res) => {
  const co = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.user.id);
  if (co.status !== 'approved') return res.status(403).json({ error: 'तुमचे खाते अजून Admin ने मंजूर केलेले नाही.' });
  if (!co.membership_active) return res.status(402).json({ error: 'व्हॅकन्सी पोस्ट करण्यासाठी आधी सदस्यत्व सक्रिय करा (₹200).' });
  const { title, category, location, salary, description } = req.body;
  if (!title) return res.status(400).json({ error: 'पदाचे नाव आवश्यक आहे.' });
  const info = db.prepare(
    `INSERT INTO jobs (company_id, title, category, location, salary, description, status) VALUES (?,?,?,?,?,?, 'pending')`
  ).run(req.user.id, title, category || '', location || '', salary || '', description || '');
  res.json({ id: info.lastInsertRowid });
});

// Company: edit own vacancy
router.put('/:id', requireAuth('company'), (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  if (!job || job.company_id !== req.user.id) return res.status(404).json({ error: 'व्हॅकन्सी सापडली नाही.' });
  const { title, category, location, salary, description } = req.body;
  db.prepare(`UPDATE jobs SET title=?, category=?, location=?, salary=?, description=? WHERE id=?`)
    .run(title ?? job.title, category ?? job.category, location ?? job.location, salary ?? job.salary, description ?? job.description, job.id);
  res.json({ ok: true });
});

// Company: delete own vacancy
router.delete('/:id', requireAuth('company'), (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  if (!job || job.company_id !== req.user.id) return res.status(404).json({ error: 'व्हॅकन्सी सापडली नाही.' });
  db.prepare('DELETE FROM applications WHERE job_id = ?').run(job.id);
  db.prepare('DELETE FROM jobs WHERE id = ?').run(job.id);
  res.json({ ok: true });
});

module.exports = router;
