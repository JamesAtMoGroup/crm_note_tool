// Shared OPS utilities

const BRAND_DISPLAY = {
  xuemi: '學米', sixdigital: '無限', kkschool: 'nschool職能',
  nschool: 'nschool財經', xlab: 'xlab', aischool: 'AI未來學院',
};
const APPLY_BRANDS = ['xuemi','sixdigital','kkschool','nschool','xlab'];

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
    'x-ops-email': 'ops@qraft.app',
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
