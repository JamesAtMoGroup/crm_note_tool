const fetch = require('node-fetch');

const WEB_APP_URL = process.env.APPS_SCRIPT_WEB_APP_URL;
const TOKEN       = process.env.APPS_SCRIPT_TOKEN;

async function callAppsScript(action, payload = {}) {
  if (!WEB_APP_URL) throw new Error('APPS_SCRIPT_WEB_APP_URL 未設定');
  if (!TOKEN)       throw new Error('APPS_SCRIPT_TOKEN 未設定');

  const res = await fetch(WEB_APP_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ action, token: TOKEN, ...payload }),
    redirect: 'follow',
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Apps Script 回傳失敗');
  return data;
}

module.exports = { callAppsScript };
