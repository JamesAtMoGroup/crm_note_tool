# CRM Note Tool

內部客服溝通紀錄工具，填寫後自動同步至 CRM member_note。

## 專案結構

```
crm-note-tool/
├── src/
│   ├── index.js          # Express 主程式
│   ├── auth.js           # Token 管理（含快取）
│   ├── graphql.js        # Hasura GraphQL 客戶端
│   └── routes/
│       ├── brands.js     # GET  /api/brands
│       ├── member.js     # POST /api/member/search
│       └── note.js       # POST /api/note
├── public/
│   └── index.html        # 前端表單
├── .env.example
└── package.json
```

## 本地開發

```bash
# 1. 安裝套件
npm install

# 2. 建立環境變數
cp .env.example .env
# 編輯 .env，填入各品牌的 clientId / clientKey

# 3. 啟動
npm run dev        # 開發模式（nodemon）
npm start          # 正式模式
```

## 部署到 Zeabur

1. 將此專案推上 GitHub
2. 在 Zeabur 新增服務 → 選擇 GitHub repo
3. Zeabur 會自動偵測 Node.js 並執行 `npm start`
4. 在 Zeabur 的「環境變數」設定頁填入 `.env.example` 的所有變數
5. 部署完成後取得網址，分享給客服團隊使用

## 環境變數說明

| 變數 | 說明 |
|------|------|
| `PORT` | 伺服器埠號（Zeabur 自動設定，不需手動填） |
| `BRANDS` | 品牌設定 JSON，含 clientId / clientKey / authorId |

## API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/brands` | 取得品牌清單 |
| POST | `/api/member/search` | 用信箱搜尋會員 |
| POST | `/api/note` | 寫入溝通紀錄至 CRM |
