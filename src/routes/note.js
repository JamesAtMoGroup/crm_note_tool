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

  const description = formatNote(formData, staffName, brandKey);
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

function formatNote(formData, staffName, brandKey) {
  const now = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
  const footer = `\n\n---\n記錄人員：${staffName || '-'}\n記錄時間：${now}`;

  if (brandKey === 'xlab') {
    return `【客服溝通紀錄】

📌 學員基本資料
學員姓名：${formData.memberName || '-'}
學員背景科系&職業：${formData.background || '-'}
購買方案：${formData.plan || '-'}
訓練營梯次：${formData.campSession || '-'}
實體/線上：${formData.mode || '-'}
教材名稱：${formData.material || '-'}

📞 Demo 過程紀錄
Demo 中聊到的內容：${formData.demoContent || '-'}` + footer;
  }

  if (brandKey === 'nschool') {
    return `【客服溝通紀錄】

📌 學員基本資料
學員姓名：${formData.memberName || '-'}
學員背景科系&職業：${formData.background || '-'}
購買領域：${formData.purchaseDomain || '-'}

🎯 學習目標與動機
加入學院的期待（短、中、長期目標）：${formData.expectation || '-'}
學員特質/個性：${formData.personality || '-'}
學員故事背景：${formData.story || '-'}

📞 Demo 過程紀錄
Demo 中聊到的內容：${formData.demoContent || '-'}
話術內容：${formData.salesScript || '-'}` + footer;
  }

  // xuemi / sixdigital / kkschool
  return `【客服溝通紀錄】

📌 學員基本資料
學員姓名：${formData.memberName || '-'}
學員背景科系&職業：${formData.background || '-'}
購買領域：${formData.purchaseDomain || '-'}

🎯 學習目標與動機
加入學院的期待（短、中、長期目標）：${formData.expectation || '-'}
學員特質/個性：${formData.personality || '-'}
學員故事背景：${formData.story || '-'}

📞 Demo 過程紀錄
Demo 中聊到的內容：${formData.demoContent || '-'}
是否有作品集可提供：${formData.portfolio || '-'}
話術內容：${formData.salesScript || '-'}` + footer;
}

module.exports = router;
