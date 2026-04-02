const fetch = require('node-fetch');

const AUTH_URL = 'https://api.kolable.app/api/v1/auth/token';

// In-memory token cache: brandKey -> { token, date }
const tokenCache = new Map();

function getBrands() {
  try {
    const raw = process.env.BRANDS;
    // 移除換行與多餘空白後再 parse
    return JSON.parse(raw.replace(/\s+/g, ' '));
  } catch (e) {
    throw new Error('BRANDS 環境變數格式錯誤，請確認是合法 JSON');
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
