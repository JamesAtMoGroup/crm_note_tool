const express    = require('express');
const router     = express.Router();
const { callAppsScript } = require('../services/appsScript');
const { requireOps }     = require('../middleware/opsAuth');
const { BRAND_DISPLAY_NAMES } = require('../constants/brands');

// POST /api/application/create
router.post('/create', requireOps, async (req, res) => {
  try {
    const { brandKey, applicantName, memberEmail, memberId, memberName,
            categoryId, customItemName, purpose, requirement, note,
            itemName, deductType, deductValue } = req.body;

    const brandDisplay = BRAND_DISPLAY_NAMES[brandKey] || brandKey;
    const finalItem    = categoryId === 'CUSTOM' ? customItemName : itemName;

    const r = await callAppsScript('append_application', {
      brandKey, brandDisplay, applicantName,
      memberEmail, memberId, memberName,
      categoryId, itemName: finalItem,
      deductType, deductValue: deductValue ?? null,
      purpose, requirement, note: note || '',
    });
    res.json(r);
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET /api/application/list
router.get('/list', requireOps, async (req, res) => {
  try {
    const { status, brand, startDate, endDate } = req.query;
    const r = await callAppsScript('read_applications', {
      status: status || 'all',
      brand:  brand  || null,
      startDate: startDate || null,
      endDate:   endDate   || null,
    });
    res.json(r);
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /api/application/review
router.post('/review', requireOps, async (req, res) => {
  try {
    const r = await callAppsScript('update_application_status', req.body);
    res.json(r);
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET /api/application/export  (CSV download)
router.get('/export', requireOps, async (req, res) => {
  try {
    const { status, brand, startDate, endDate } = req.query;
    const r = await callAppsScript('read_applications', {
      status: status || 'all', brand: brand || null,
      startDate: startDate || null, endDate: endDate || null,
    });

    const rows   = r.data;
    const header = ['申請單號','送出時間','品牌','brandKey','申請人姓名','學員姓名',
                    '學員email','member_id','分類項目名稱','分類ID','扣%類型','扣%值',
                    '目的','需求','備註','狀態','審核時間','審核人','拒絕原因','是否已寄送','最後更新時間'];
    const cols   = ['applicationId','createdAt','brandDisplay','brandKey','applicantName',
                    'memberName','memberEmail','memberId','itemName','categoryId','deductType',
                    'deductValue','purpose','requirement','note','status','reviewedAt','reviewedBy',
                    'rejectReason','emailSent','updatedAt'];

    const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines  = [header.map(escape).join(','),
                    ...rows.map(row => cols.map(k => escape(row[k])).join(','))];

    const start = startDate || 'all';
    const end   = endDate   || 'all';
    const filename = encodeURIComponent(`特殊申請log_${start}_${end}.csv`);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
    res.send('﻿' + lines.join('\r\n'));
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
