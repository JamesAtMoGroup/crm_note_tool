const express = require('express');
const { getBrands } = require('../auth');
const router = express.Router();

// GET /api/brands
router.get('/', (req, res) => {
  try {
    const brands = getBrands();
    res.json({
      success: true,
      data: brands.map(b => ({ key: b.key, name: b.name })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
