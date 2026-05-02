require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const JWT_SECRET = process.env.JWT_SECRET || 'artevista-admin-secret-2024';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@artevista.com';

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Multer for memory storage (upload to Supabase)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'), false);
  }
});

// Auth middleware
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ===== AUTH ROUTES =====
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;
  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ email, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, email });
});

app.get('/api/admin/verify', authMiddleware, (req, res) => {
  res.json({ valid: true, email: req.admin.email });
});

// ===== CATEGORIES ROUTES =====
app.get('/api/categories', async (req, res) => {
  const { data, error } = await supabase.from('categories').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/admin/categories', authMiddleware, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const { data, error } = await supabase.from('categories').insert({ name, slug }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/admin/categories/:id', authMiddleware, async (req, res) => {
  const { error } = await supabase.from('categories').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ===== PAINTINGS ROUTES =====
app.get('/api/paintings', async (req, res) => {
  const { category, featured, sold, search, page = 1, limit = 12 } = req.query;
  let query = supabase
    .from('paintings')
    .select('*, categories(name, slug)', { count: 'exact' });

  if (category) query = query.eq('categories.slug', category);
  if (featured === 'true') query = query.eq('is_featured', true);
  if (sold === 'false') query = query.eq('is_sold', false);
  if (search) query = query.ilike('title', `%${search}%`);

  query = query.order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data, count, page: Number(page), limit: Number(limit) });
});

app.get('/api/paintings/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('paintings')
    .select('*, categories(name, slug)')
    .eq('id', req.params.id)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

app.post('/api/admin/paintings', authMiddleware, upload.single('image'), async (req, res) => {
  const { title, artist, description, price, dimensions, medium, year, category_id, is_featured } = req.body;
  let image_url = req.body.image_url || '';

  if (req.file) {
    const ext = req.file.mimetype.split('/')[1];
    const filename = `paintings/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('paintings')
      .upload(filename, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
    if (uploadError) return res.status(500).json({ error: uploadError.message });
    const { data: { publicUrl } } = supabase.storage.from('paintings').getPublicUrl(filename);
    image_url = publicUrl;
  }

  const { data, error } = await supabase.from('paintings').insert({
    title, artist: artist || 'ArteVista', description, price: Number(price),
    dimensions, medium, year: year ? Number(year) : null,
    category_id: category_id || null, image_url,
    is_featured: is_featured === 'true' || is_featured === true
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.put('/api/admin/paintings/:id', authMiddleware, upload.single('image'), async (req, res) => {
  const { title, artist, description, price, dimensions, medium, year, category_id, is_featured, is_sold } = req.body;
  let updateData = {
    title, artist, description, price: Number(price),
    dimensions, medium, year: year ? Number(year) : null,
    category_id: category_id || null,
    is_featured: is_featured === 'true' || is_featured === true,
    is_sold: is_sold === 'true' || is_sold === true,
    updated_at: new Date().toISOString()
  };

  if (req.file) {
    const ext = req.file.mimetype.split('/')[1];
    const filename = `paintings/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('paintings')
      .upload(filename, req.file.buffer, { contentType: req.file.mimetype });
    if (uploadError) return res.status(500).json({ error: uploadError.message });
    const { data: { publicUrl } } = supabase.storage.from('paintings').getPublicUrl(filename);
    updateData.image_url = publicUrl;
  }

  const { data, error } = await supabase.from('paintings').update(updateData).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/admin/paintings/:id', authMiddleware, async (req, res) => {
  const { error } = await supabase.from('paintings').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ===== ADMIN ALL PAINTINGS =====
app.get('/api/admin/paintings', authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from('paintings')
    .select('*, categories(name, slug)')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ===== IMAGE UPLOAD =====
app.post('/api/admin/upload', authMiddleware, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });
  const ext = req.file.mimetype.split('/')[1];
  const filename = `paintings/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from('paintings')
    .upload(filename, req.file.buffer, { contentType: req.file.mimetype });
  if (error) return res.status(500).json({ error: error.message });
  const { data: { publicUrl } } = supabase.storage.from('paintings').getPublicUrl(filename);
  res.json({ url: publicUrl });
});

// SPA fallback for admin
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html')));
app.get('/admin/*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html')));

app.listen(PORT, () => console.log(`ArteVista running on http://localhost:${PORT}`));
