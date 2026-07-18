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

// Step 1: create a Razorpay order (amount decided server-side, not by the browser)
router.post('/create-order', requireAuth('company', 'candidate'), async (req, res) => {
  const isCompany = req.user.role === 'company';
  const amount = isCompany ? 200 : 99; // in rupees

  try {
    const order = await razorpay.orders.create({
      amount: amount * 100, // paise मध्ये
      currency: 'INR',
      receipt: '${req.user.role}_${req.user.id}_${Date.now()}'
    });
    res.json({ order_id: order.id, amount, key_id: process.env.RAZORPAY_KEY_ID });
  } catch (e) {
    res.status(500).json({ error: 'Razorpay order तयार करता आला नाही.' });
  }
});
}

// Step 2: verify the payment signature Razorpay sends back after checkout
router.post('/verify', requireAuth('company', 'candidate'), (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

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
  
  db.prepare(UPDATE ${table} SET membership_active = 1, membership_expiry = ? WHERE id = ?).run(expiryStr, req.user.id);
    db.prepare('INSERT INTO payments (user_type, user_id, amount, method, status) VALUES (?,?,?,\'Razorpay\',\'success\')')
      .run(isCompany ? 'company' : 'candidate', req.user.id, amount);

  res.json({ ok: true, expiry: expiryStr, amount });
});

module.exports = router;
