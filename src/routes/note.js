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
  const v = val => val || '';

  if (brandKey === 'xlab') {
    return `📌 學員基本資料

*學員姓名：${v(formData.memberName)}

*學員背景科系&職業：${v(formData.background)}

*訓練營梯次：${v(formData.campSession)}

*實體/線上：${v(formData.mode)}

*教材名稱：${v(formData.material)}

📞 Demo 過程紀錄

Demo 中聊到的內容：
${v(formData.demoContent)}`;
  }

  if (brandKey === 'nschool') {
    return `📌 學員基本資料
*學員姓名：${v(formData.memberName)}
*學員背景科系&職業：${v(formData.background)}
*購買領域：${v(formData.purchaseDomain)}

🎯 學習目標與動機
*加入學院的期待（短、中、長期目標）：${v(formData.expectation)}
*學員特質/個性：${v(formData.personality)}
*學員故事背景（可自由描述）：${v(formData.story)}

📞 Demo 過程紀錄
Demo 中聊到的內容：${v(formData.demoContent)}
*話術內容：${v(formData.salesScript)}`;
  }

  // xuemi / sixdigital / kkschool
  return `📌 學員基本資料
*學員姓名：${v(formData.memberName)}
*學員背景科系&職業：${v(formData.background)}
*購買領域：${v(formData.purchaseDomain)}

🎯 學習目標與動機
*加入學院的期待（短、中、長期目標）：${v(formData.expectation)}
*學員特質/個性：${v(formData.personality)}
*學員故事背景（可自由描述）：${v(formData.story)}

📞 Demo 過程紀錄
Demo 中聊到的內容：${v(formData.demoContent)}
是否有作品集可提供（是就附上附上連結）：${v(formData.portfolio)}
*話術內容：${v(formData.salesScript)}`;
}

module.exports = router;
