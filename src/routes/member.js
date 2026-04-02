const express = require('express');
const { executeGraphQL } = require('../graphql');
const { getBrandConfig } = require('../auth');
const router = express.Router();

const SEARCH_MEMBER = `
  query SEARCH_MEMBER_BY_EMAIL($email: String!, $appId: String!) {
    member(where: {
      email: { _eq: $email }
      app_id: { _eq: $appId }
    }) {
      id
      name
      email
      username
    }
  }
`;

// POST /api/member/search
// body: { email, brandKey }
router.post('/search', async (req, res) => {
  const { email, brandKey } = req.body;

  if (!email || !brandKey)
    return res.status(400).json({ success: false, message: '請提供 email 與 brandKey' });

  const brand = getBrandConfig(brandKey);
  if (!brand)
    return res.status(400).json({ success: false, message: `找不到品牌：${brandKey}` });

  try {
    const result = await executeGraphQL(SEARCH_MEMBER, { email, appId: brand.id }, brandKey);
    const member = result?.data?.member?.[0];

    if (!member)
      return res.json({ success: false, message: '找不到此信箱的會員' });

    res.json({ success: true, data: member });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
