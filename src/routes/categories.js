const express    = require('express');
const router     = express.Router();
const { callAppsScript } = require('../services/appsScript');
const { requireOps, requireAuth } = require('../middleware/opsAuth');

let cache = null, cacheAt = 0;
const TTL = 5 * 60 * 1000;

function invalidate() { cache = null; cacheAt = 0; }

async function getAll(includeInactive) {
  if (!includeInactive && cache && Date.now() - cacheAt < TTL) return cache;
  const r = await callAppsScript('read_categories', { all: includeInactive || false });
  if (!includeInactive) { cache = r.data; cacheAt = Date.now(); }
  return r.data;
}

// GET /api/categories/list?brand=&all=true
router.get('/list', requireAuth, async (req, res) => {
  try {
    const all    = req.query.all === 'true';
    const brand  = req.query.brand;
    let   data   = await getAll(all);
    if (brand) data = data.filter(c => c.brandKey === brand);
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /api/categories/save
router.post('/save', requireOps, async (req, res) => {
  try {
    const r = await callAppsScript('save_category', req.body);
    invalidate();
    res.json(r);
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
module.exports.invalidate = invalidate;
