const express = require('express');
const { executeGraphQL } = require('../graphql');
const { getBrandConfig } = require('../auth');
const router = express.Router();

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

// POST /api/note
// body: { brandKey, memberId, staffName, formData }
router.post('/', async (req, res) => {
  const { brandKey, memberId, staffName, formData } = req.body;

  if (!brandKey || !memberId || !formData)
    return res.status(400).json({ success: false, message: '缺少必要欄位' });

  const brand = getBrandConfig(brandKey);
  if (!brand)
    return res.status(400).json({ success: false, message: `找不到品牌：${brandKey}` });

  const description = formatNote(formData, staffName);
  const createdAt = new Date().toISOString();

  try {
    const result = await executeGraphQL(INSERT_NOTE, {
      createdAt,
      description,
      memberId,
      authorId: brand.authorId,
    }, brandKey);

    const returning = result?.data?.insert_member_note?.returning;
    if (!returning || returning.length === 0)
      return res.json({ success: false, message: '寫入 CRM 失敗' });

    res.json({ success: true, message: '已成功寫入 CRM', id: returning[0].id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

function formatNote(formData, staffName) {
  const now = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
  return `【客服溝通紀錄】

學員姓名：${formData.memberName || '-'}
背景科系／職業：${formData.background || '-'}
購買方案：${formData.plan || '-'}
訓練營：${formData.camp || '-'}
上課形式：${formData.mode || '-'}
教材：${formData.material || '-'}

溝通紀錄：
${formData.note || '-'}

---
記錄人員：${staffName || '-'}
記錄時間：${now}`;
}

module.exports = router;
