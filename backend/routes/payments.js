const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ⚠️ हे सध्या मॅन्युअल पेमेंट रेकॉर्डिंग आहे — पैसे प्रत्यक्ष हलत नाहीत.
// खरं Razorpay/Cashfree इथे जोडायचं झाल्यास: फ्रंटएंडने आधी त्यांचं Checkout उघडायचं,
// gateway कडून यशस्वी payment झाल्याचा webhook/verification आल्यावरच ही रुट कॉल करायची.
router.post('/pay', requireAuth('company', 'candidate'), (req, res) => {
  const { method } = req.body;
  const isCompany = req.user.role === 'company';
  const amount = isCompany ? 200 : 99;
  const table = isCompany ? 'companies' : 'candidates';

  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30);
  const expiryStr = expiry.toISOString().slice(0, 10);

  db.prepare(`UPDATE ${table} SET membership_active = 1, membership_expiry = ? WHERE id = ?`).run(expiryStr, req.user.id);
  db.prepare('INSERT INTO payments (user_type, user_id, amount, method, status) VALUES (?,?,?,?,\'success\')')
    .run(isCompany ? 'company' : 'candidate', req.user.id, amount, method || 'UPI');

  res.json({ ok: true, expiry: expiryStr, amount });
});

module.exports = router;
