const fetch = require('node-fetch');

const AUTH_URL = 'https://api.kolable.app/api/v1/auth/token';

// In-memory token cache: brandKey -> { token, date }
const tokenCache = new Map();

function getBrands() {
  try {
    let raw = process.env.BRANDS;
    // 移除前後空白與換行
    raw = raw.trim();
    // 如果 Zeabur 包了外層引號，先去掉
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
      raw = raw.slice(1, -1);
    }
    // 移除換行
    raw = raw.replace(/[\r\n]/g, '');
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`BRANDS 環境變數格式錯誤：${e.message}`);
  }
}

function getBrandConfig(brandKey) {
  return getBrands().find(b => b.key === brandKey) || null;
}

async function getAuthToken(brandKey, forceRefresh = false) {
  const today = new Date().toDateString();
  const cached = tokenCache.get(brandKey);

  if (!forceRefresh && cached && cached.date === today) {
    return cached.token;
  }

  const brand = getBrandConfig(brandKey);
  if (!brand) throw new Error(`找不到品牌設定：${brandKey}`);

  const response = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: brand.clientId,
      key: brand.clientKey,
      permission: [],
    }),
  });

  const data = await response.json();

  if (!data?.result?.authToken) {
    throw new Error(`Token 取得失敗：${JSON.stringify(data)}`);
  }

  const token = data.result.authToken;
  tokenCache.set(brandKey, { token, date: today });
  return token;
}

module.exports = { getBrands, getBrandConfig, getAuthToken };
