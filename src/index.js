require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const brandsRouter = require('./routes/brands');
const memberRouter = require('./routes/member');
const noteRouter   = require('./routes/note');

const app = express();

app.use(cors());
app.use(express.json());

// 靜態前端
app.use(express.static(path.join(__dirname, '../public')));

// API 路由
app.use('/api/brands', brandsRouter);
app.use('/api/member', memberRouter);
app.use('/api/note',   noteRouter);

// 所有非 API 請求回傳 index.html（SPA fallback）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
