require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const brandsRouter      = require('./routes/brands');
const memberRouter      = require('./routes/member');
const noteRouter        = require('./routes/note');
const authRouter        = require('./routes/auth');
const categoriesRouter  = require('./routes/categories');
const applicationRouter = require('./routes/application');
const analyticsRouter   = require('./routes/analytics');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ── API ──────────────────────────────────────
app.use('/api/brands',      brandsRouter);
app.use('/api/member',      memberRouter);
app.use('/api/note',        noteRouter);
app.use('/api/auth',        authRouter);
app.use('/api/categories',  categoriesRouter);
app.use('/api/application', applicationRouter);
app.use('/api/analytics',   analyticsRouter);

// ── Pages ─────────────────────────────────────
const pub = f => (_, res) => res.sendFile(path.join(__dirname, '../public', f));
app.get('/',                         pub('index.html'));
app.get('/note',                     pub('note.html'));
app.get('/apply',                    pub('apply.html'));
app.get('/admin/review',             pub('admin/review.html'));
app.get('/admin/categories/list',    pub('admin/categories-list.html'));
app.get('/admin/categories/edit',    pub('admin/categories-edit.html'));
app.get('/admin/analytics',          pub('admin/analytics.html'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server on http://localhost:${PORT}`));
