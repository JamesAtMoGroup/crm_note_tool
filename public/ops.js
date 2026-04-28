// Shared OPS utilities

// Brands are fetched from /api/brands (sourced from brands.txt / Zeabur BRANDS env)
// loadBrands() caches result for 5 min; populates BRAND_DISPLAY map
let BRAND_DISPLAY = {};
let APPLY_BRANDS  = [];
let _brandsCache  = null;
let _brandsCacheAt = 0;
const BRANDS_TTL = 5 * 60 * 1000;

async function loadBrands() {
  if (_brandsCache && Date.now() - _brandsCacheAt < BRANDS_TTL) return _brandsCache;
  const res  = await fetch('/api/brands');
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Failed to load brands');
  _brandsCache  = json.data; // [{ key, name }, ...]
  _brandsCacheAt = Date.now();
  // Repopulate maps
  BRAND_DISPLAY = {};
  json.data.forEach(b => { BRAND_DISPLAY[b.key] = b.name; });
  APPLY_BRANDS  = json.data.filter(b => b.key !== 'aischool').map(b => b.key);
  return _brandsCache;
}

// Fill a <select> with brand options. opts: { excludeAischool, includeEmpty, emptyLabel }
function fillBrandSelect(selectEl, opts = {}) {
  if (!selectEl) return;
  const list = (_brandsCache || []).filter(b => opts.excludeAischool ? b.key !== 'aischool' : true);
  const empty = opts.includeEmpty
    ? `<option value="">${opts.emptyLabel || '請選擇'}</option>`
    : '';
  selectEl.innerHTML = empty + list.map(b => `<option value="${b.key}">${b.name}</option>`).join('');
}

function getOpsSession() {
  try {
    const s = localStorage.getItem('opsSession');
    if (!s) return null;
    const obj = JSON.parse(s);
    if (Date.now() - obj.loginAt > 30 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem('opsSession'); return null;
    }
    return obj;
  } catch { return null; }
}

function opsLogout() {
  localStorage.removeItem('opsSession');
  location.href = '/';
}

function opsHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-role': 'ops',
    'x-ops-email': 'penny@mogroup.tw',
  };
}

async function opsGet(url) {
  const res = await fetch(url, { headers: opsHeaders() });
  return res.json();
}

async function opsPost(url, body) {
  const res = await fetch(url, { method: 'POST', headers: opsHeaders(), body: JSON.stringify(body) });
  return res.json();
}

function initOpsPage(activePath) {
  if (!getOpsSession()) { location.href = '/'; return; }
  // Highlight active nav link
  document.querySelectorAll('.nav a').forEach(a => {
    if (a.getAttribute('href') === activePath) a.classList.add('active');
  });
}

function showAlert(el, msg, type = 'error') {
  el.textContent = msg;
  el.className = `alert alert-${type} show`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function deductBadgeHtml(deductType, deductValue) {
  if (!deductType) return '';
  if (deductType === '固定') {
    const v = parseFloat(deductValue) || 0;
    if (v === 0) return `<div class="deduct-badge deduct-green">✅ 此項不扣業績</div>`;
    return `<div class="deduct-badge deduct-red">⚠️ 此項將扣承攬業績 ${v}%</div>`;
  }
  if (deductType === '個案評估') return `<div class="deduct-badge deduct-yellow">⚠️ 此項為個案評估，最終扣%由審核時決定</div>`;
  if (deductType === '不扣')    return `<div class="deduct-badge deduct-green">✅ 此項不扣業績</div>`;
  return `<div class="deduct-badge deduct-yellow">⚠️ 非既有需求，最終扣%由審核時決定</div>`;
}

function statusBadge(status) {
  const map = { pending: ['badge-pending','待審核'], approved: ['badge-approved','已核准'], rejected: ['badge-rejected','已拒絕'] };
  const [cls, label] = map[status] || ['','—'];
  return `<span class="badge ${cls}">${label}</span>`;
}
