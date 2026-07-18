const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

router.post('/create-order', requireAuth('company', 'candidate'), async (req, res) => {
  const isCompany = req.user.role === 'company';
  const amount = isCompany ? 200 : 99;

  try {
    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: 'INR',
      receipt: req.user.role + '' + req.user.id + '' + Date.now()
    });
    res.json({ order_id: order.id, amount: amount, key_id: process.env.RAZORPAY_KEY_ID });
  } catch (e) {
    res.status(500).json({ error: 'Razorpay order तयार करता आला नाही.' });
  }
});

router.post('/verify', requireAuth('company', 'candidate'), (req, res) => {
  const razorpay_order_id = req.body.razorpay_order_id;
  const razorpay_payment_id = req.body.razorpay_payment_id;
  const razorpay_signature = req.body.razorpay_signature;

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + '|' + razorpay_payment_id)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ error: 'Payment पडताळणी अयशस्वी झाली.' });
  }

  const isCompany = req.user.role === 'company';
  const amount = isCompany ? 200 : 99;
  const table = isCompany ? 'companies' : 'candidates';

  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30);
  const expiryStr = expiry.toISOString().slice(0, 10);

  const sql = 'UPDATE ' + table + ' SET membership_active = 1, membership_expiry = ? WHERE id = ?';
  db.prepare(sql).run(expiryStr, req.user.id);

  db.prepare('INSERT INTO payments (user_type, user_id, amount, method, status) VALUES (?,?,?,?,?)')
    .run(isCompany ? 'company' : 'candidate', req.user.id, amount, 'Razorpay', 'success');

  res.json({ ok: true, expiry: expiryStr, amount: amount });
});

module.exports = router;
