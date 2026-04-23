const OPS_EMAIL = process.env.OPS_EMAIL || 'penny@mogroup.tw';

// OPS 路由保護：前端在所有 /api/application/* 和 /api/categories/* 請求帶上
// header: x-role: ops  +  x-ops-email: penny@mogroup.tw
function requireOps(req, res, next) {
  const role  = req.headers['x-role'];
  const email = req.headers['x-ops-email'];

  if (role === 'ops' && email === OPS_EMAIL) return next();
  res.status(403).json({ success: false, message: '需要 OPS 權限' });
}

// 顧問路由保護：前端帶 x-brand-key header
function requireBrand(req, res, next) {
  const brandKey = req.headers['x-brand-key'];
  if (brandKey) { req.brandKey = brandKey; return next(); }
  res.status(403).json({ success: false, message: '需要品牌登入' });
}

// 允許品牌登入或經辦登入（用於顧問可觸發的 API）
function requireAuth(req, res, next) {
  const opsOk   = req.headers['x-role'] === 'ops' && req.headers['x-ops-email'] === OPS_EMAIL;
  const brandOk = !!req.headers['x-brand-key'];
  if (opsOk || brandOk) { req.brandKey = req.headers['x-brand-key']; return next(); }
  res.status(403).json({ success: false, message: '請先登入' });
}

module.exports = { requireOps, requireBrand, requireAuth };
