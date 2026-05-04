const express = require('express');
const router  = express.Router();

// FEEDBACK_ALLOWLIST env: comma-separated emails
// e.g. FEEDBACK_ALLOWLIST=penny@mogroup.tw,chris@mogroup.tw,zac@mogroup.tw
function getAllowlist() {
  const raw = process.env.FEEDBACK_ALLOWLIST || '';
  return raw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
}

// POST /api/feedback/login  body: { email }
router.post('/login', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ success: false, message: '請輸入 email' });
  }
  const allowlist = getAllowlist();
  if (!allowlist.includes(email)) {
    return res.status(403).json({ success: false, message: '此 email 不在授權名單中，請洽管理員' });
  }
  res.json({ success: true, email });
});

// POST /api/feedback/verify  body: { email }  — 用於送出表單前再次確認
router.post('/verify', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const allowlist = getAllowlist();
  res.json({ success: allowlist.includes(email), email });
});

module.exports = router;
