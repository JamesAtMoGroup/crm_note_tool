const express    = require('express');
const router     = express.Router();
const { callAppsScript } = require('../services/appsScript');
const { requireOps }     = require('../middleware/opsAuth');

function monthKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// GET /api/analytics/summary?startDate=&endDate=
router.get('/summary', requireOps, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const r    = await callAppsScript('read_applications', {
      status: 'all', brand: null,
      startDate: startDate || null,
      endDate:   endDate   || null,
    });
    const data = r.data;

    // collect sorted months
    const monthSet = new Set(data.map(a => monthKey(a.createdAt)));
    const months   = [...monthSet].sort();

    // Section A — month × item
    const itemSet = new Set(data.map(a => a.itemName));
    const sectionA = [...itemSet].map(item => {
      const row = { item };
      months.forEach(m => { row[m] = data.filter(a => a.itemName === item && monthKey(a.createdAt) === m).length; });
      row.total = data.filter(a => a.itemName === item).length;
      return row;
    }).sort((a, b) => b.total - a.total);

    // Section B — month × brand
    const brandSet = new Set(data.map(a => a.brandDisplay));
    const sectionB = [...brandSet].map(brand => {
      const row = { brand };
      months.forEach(m => { row[m] = data.filter(a => a.brandDisplay === brand && monthKey(a.createdAt) === m).length; });
      row.total = data.filter(a => a.brandDisplay === brand).length;
      return row;
    }).sort((a, b) => b.total - a.total);

    // Section C — month × status
    const sectionC = months.map(m => ({
      month:    m,
      approved: data.filter(a => a.status === 'approved' && monthKey(a.createdAt) === m).length,
      rejected: data.filter(a => a.status === 'rejected' && monthKey(a.createdAt) === m).length,
      pending:  data.filter(a => a.status === 'pending'  && monthKey(a.createdAt) === m).length,
    }));

    // Section D — deduct% by brand (approved only)
    const approved = data.filter(a => a.status === 'approved');
    const sectionD = [...brandSet].map(brand => {
      const rows  = approved.filter(a => a.brandDisplay === brand);
      const total = rows.reduce((s, a) => s + (parseFloat(a.deductValue) || 0), 0);
      return { brand, count: rows.length, totalDeduct: +total.toFixed(2), avgDeduct: rows.length ? +(total / rows.length).toFixed(2) : 0 };
    }).sort((a, b) => b.totalDeduct - a.totalDeduct);

    // Section E — applicant leaderboard
    const applicantMap = {};
    data.forEach(a => {
      if (!applicantMap[a.applicantName]) applicantMap[a.applicantName] = { applicant: a.applicantName, total: 0, approved: 0, totalDeduct: 0 };
      applicantMap[a.applicantName].total++;
      if (a.status === 'approved') {
        applicantMap[a.applicantName].approved++;
        applicantMap[a.applicantName].totalDeduct += parseFloat(a.deductValue) || 0;
      }
    });
    const sectionE = Object.values(applicantMap)
      .map(e => ({ ...e, totalDeduct: +e.totalDeduct.toFixed(2) }))
      .sort((a, b) => b.totalDeduct - a.totalDeduct);

    res.json({ success: true, data: { months, sectionA, sectionB, sectionC, sectionD, sectionE } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
