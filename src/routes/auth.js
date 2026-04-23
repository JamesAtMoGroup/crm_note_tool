const express  = require('express');
const router   = express.Router();
const OPS_EMAIL = process.env.OPS_EMAIL || 'ops@qraft.app';

// POST /api/auth/ops-login
// body: { email }
router.post('/ops-login', (req, res) => {
  const { email } = req.body;
  if (!email || email !== OPS_EMAIL) {
    return res.status(401).json({ success: false, message: '帳號不正確' });
  }
  res.json({ success: true, role: 'ops', email: OPS_EMAIL });
});

module.exports = router;
