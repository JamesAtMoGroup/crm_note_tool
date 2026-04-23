const express    = require('express');
const router     = express.Router();
const { callAppsScript } = require('../services/appsScript');
const { requireOps, requireAuth } = require('../middleware/opsAuth');
const { BRAND_DISPLAY_NAMES } = require('../constants/brands');
const { executeGraphQL } = require('../graphql');
const { getBrandConfig } = require('../auth');

const INSERT_NOTE = `
  mutation InsertNote(
    $createdAt: timestamptz
    $description: String
    $memberId: String
    $authorId: String
  ) {
    insert_member_note(objects: {
      created_at: $createdAt
      description: $description
      member_id: $memberId
      author_id: $authorId
      status: ""
    }) {
      returning { id }
    }
  }
`;

async function writeCrmNote(brandKey, memberId, description) {
  const brand = getBrandConfig(brandKey);
  if (!brand || !memberId) return;
  await executeGraphQL(INSERT_NOTE, {
    createdAt:   new Date().toISOString(),
    description,
    memberId,
    authorId:    brand.authorId,
  }, brandKey);
}

function fmtDeduct(deductType, deductValue) {
  if (deductType === '固定')    return `扣 ${deductValue ?? 0}%`;
  if (deductType === '不扣')    return '不扣';
  if (deductType === '個案評估') return '個案評估';
  return deductType || '';
}

// POST /api/application/create
router.post('/create', requireAuth, async (req, res) => {
  try {
    const { brandKey, applicantName, memberEmail, memberId, memberName,
            categoryId, customItemName, purpose, requirement, note,
            itemName, deductType, deductValue, managerApproval } = req.body;

    const brandDisplay = BRAND_DISPLAY_NAMES[brandKey] || brandKey;
    const finalItem    = categoryId === 'CUSTOM' ? customItemName : itemName;

    const r = await callAppsScript('append_application', {
      brandKey, brandDisplay, applicantName,
      memberEmail, memberId, memberName,
      categoryId, itemName: finalItem,
      deductType, deductValue: deductValue ?? null,
      purpose, requirement, note: note || '',
      managerApproval: managerApproval || '',
    });

    // CRM note（送出時）
    if (r.success && memberId) {
      const desc = `📋 特殊申請送出\n申請人：${applicantName}\n項目：${finalItem}\n類型：${fmtDeduct(deductType, deductValue)}\n目的：${purpose}\n需求：${requirement}${managerApproval ? `\n主管同意：經 ${managerApproval} 主管同意` : ''}\n申請單號：${r.applicationId}`;
      writeCrmNote(brandKey, memberId, desc).catch(e => console.error('[CRM note create]', e.message));
    }

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
// Extra fields for CRM note (not forwarded to Apps Script): memberId, brandKey, itemName
router.post('/review', requireOps, async (req, res) => {
  try {
    const { memberId, brandKey, itemName, decision, deductPercent, rejectReason, ...scriptPayload } = req.body;

    const r = await callAppsScript('update_application_status', { decision, deductPercent, rejectReason, ...scriptPayload });

    // CRM note（審核時）
    if (r.success && memberId && brandKey) {
      let desc;
      if (decision === 'approved') {
        const deductStr = deductPercent != null ? `扣 ${deductPercent}%` : fmtDeduct(scriptPayload.currentDeductType, deductPercent);
        desc = `✅ 特殊申請核准\n項目：${itemName || ''}\n${deductPercent != null ? `扣%：${deductPercent}%` : ''}\n申請單號：${scriptPayload.applicationId}`.trim();
      } else {
        desc = `❌ 特殊申請拒絕\n項目：${itemName || ''}\n原因：${rejectReason || ''}\n申請單號：${scriptPayload.applicationId}`;
      }
      writeCrmNote(brandKey, memberId, desc).catch(e => console.error('[CRM note review]', e.message));
    }

    res.json(r);
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /api/application/note  (update internal ops note)
router.post('/note', requireOps, async (req, res) => {
  try {
    const { applicationId, internalNote } = req.body;
    if (!applicationId) return res.status(400).json({ success: false, message: '缺少 applicationId' });
    const r = await callAppsScript('update_application_note', { applicationId, internalNote: internalNote || '' });
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
                    '目的','需求','備註','狀態','審核時間','審核人','拒絕原因','是否已寄送','最後更新時間','主管同意','經辦備注'];
    const cols   = ['applicationId','createdAt','brandDisplay','brandKey','applicantName',
                    'memberName','memberEmail','memberId','itemName','categoryId','deductType',
                    'deductValue','purpose','requirement','note','status','reviewedAt','reviewedBy',
                    'rejectReason','emailSent','updatedAt','managerApproval','internalNote'];

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
