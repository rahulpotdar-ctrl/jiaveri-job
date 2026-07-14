const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

function sign(role, id) {
  return jwt.sign({ role, id }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

// ---------- CANDIDATE (Job Seeker) ----------
router.post('/candidate/register', (req, res) => {
  const { name, phone, password, category, experience } = req.body;
  if (!name || !phone || !password) return res.status(400).json({ error: 'नाव, मोबाईल नंबर व पासवर्ड आवश्यक आहे.' });
  if (phone.length < 10) return res.status(400).json({ error: 'योग्य मोबाईल नंबर टाका.' });
  if (password.length < 4) return res.status(400).json({ error: 'पासवर्ड किमान 4 अक्षरांचा असावा.' });
  const exists = db.prepare('SELECT id FROM candidates WHERE phone = ?').get(phone);
  if (exists) return res.status(409).json({ error: 'या मोबाईल नंबरने आधीच नोंदणी झाली आहे.' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare(
    `INSERT INTO candidates (name, phone, password_hash, category, experience) VALUES (?,?,?,?,?)`
  ).run(name, phone, hash, category || '', experience || '');
  const token = sign('candidate', info.lastInsertRowid);
  res.json({ token, role: 'candidate', id: info.lastInsertRowid, name });
});

router.post('/candidate/login', (req, res) => {
  const { phone, password } = req.body;
  const cand = db.prepare('SELECT * FROM candidates WHERE phone = ?').get(phone);
  if (!cand || !bcrypt.compareSync(password || '', cand.password_hash)) {
    return res.status(401).json({ error: 'मोबाईल नंबर किंवा पासवर्ड चुकीचा आहे.' });
  }
  const token = sign('candidate', cand.id);
  res.json({ token, role: 'candidate', id: cand.id, name: cand.name });
});

// ---------- COMPANY ----------
router.post('/company/register', (req, res) => {
  const { name, phone, password, category, location } = req.body;
  if (!name || !phone || !password) return res.status(400).json({ error: 'नाव, मोबाईल नंबर व पासवर्ड आवश्यक आहे.' });
  if (phone.length < 10) return res.status(400).json({ error: 'योग्य मोबाईल नंबर टाका.' });
  if (password.length < 4) return res.status(400).json({ error: 'पासवर्ड किमान 4 अक्षरांचा असावा.' });
  const exists = db.prepare('SELECT id FROM companies WHERE phone = ?').get(phone);
  if (exists) return res.status(409).json({ error: 'या मोबाईल नंबरने आधीच नोंदणी झाली आहे.' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare(
    `INSERT INTO companies (name, phone, password_hash, category, location, status) VALUES (?,?,?,?,?,'pending')`
  ).run(name, phone, hash, category || '', location || '');
  db.prepare(`INSERT INTO notifications (user_type, user_id, title, body) VALUES ('company', ?, ?, ?)`)
    .run(info.lastInsertRowid, 'नोंदणी यशस्वी', 'तुमचे खाते Admin मंजुरीच्या प्रतीक्षेत आहे.');
  db.prepare(`INSERT INTO notifications (user_type, user_id, title, body) VALUES ('admin', NULL, ?, ?)`)
    .run('नवीन कंपनी नोंदणी', `${name} यांनी नोंदणी केली आहे — मंजुरी प्रलंबित.`);
  const token = sign('company', info.lastInsertRowid);
  res.json({ token, role: 'company', id: info.lastInsertRowid, name });
});

router.post('/company/login', (req, res) => {
  const { phone, password } = req.body;
  const co = db.prepare('SELECT * FROM companies WHERE phone = ?').get(phone);
  if (!co || !bcrypt.compareSync(password || '', co.password_hash)) {
    return res.status(401).json({ error: 'मोबाईल नंबर किंवा पासवर्ड चुकीचा आहे.' });
  }
  if (co.status === 'blocked') return res.status(403).json({ error: 'तुमचे खाते ब्लॉक केले गेले आहे. Admin शी संपर्क साधा.' });
  const token = sign('company', co.id);
  res.json({ token, role: 'company', id: co.id, name: co.name, status: co.status });
});

// ---------- ADMIN (credentials come from environment variables, no DB row) ----------
router.post('/admin/login', (req, res) => {
  const { phone, password } = req.body;
  if (phone === process.env.ADMIN_PHONE && password === process.env.ADMIN_PASSWORD) {
    const token = sign('admin', 0);
    return res.json({ token, role: 'admin', id: 0, name: 'Admin' });
  }
  res.status(401).json({ error: 'Admin मोबाईल नंबर किंवा पासवर्ड चुकीचा आहे.' });
});

module.exports = router;
