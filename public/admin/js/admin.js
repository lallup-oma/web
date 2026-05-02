let authToken = localStorage.getItem('admin_token');
let currentEditingPaintingId = null;
let categories = [];
let paintings = [];

function showScreen(screen) {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('admin-screen').classList.add('hidden');
  document.getElementById(screen).classList.remove('hidden');
}

async function login() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) throw new Error('Invalid credentials');
    const { token } = await res.json();

    localStorage.setItem('admin_token', token);
    authToken = token;
    showScreen('admin-screen');
    loadPaintings();
    loadCategories();
  } catch (err) {
    alert('Login failed: ' + err.message);
  }
}

async function logout() {
  localStorage.removeItem('admin_token');
  authToken = null;
  showScreen('login-screen');
  document.getElementById('login-form').reset();
  document.getElementById('login-password').focus();
}

async function loadPaintings() {
  try {
    const res = await fetch('/api/admin/paintings', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    paintings = await res.json();
    renderPaintings();
  } catch (err) {
    console.error('Error loading paintings:', err);
  }
}

async function loadCategories() {
  try {
    const res = await fetch('/api/categories');
    categories = await res.json();
    renderCategories();
    updateCategorySelect();
  } catch (err) {
    console.error('Error loading categories:', err);
  }
}

function renderPaintings() {
  const list = document.getElementById('paintings-list');
  if (paintings.length === 0) {
    list.innerHTML = '<div class="p-8 text-center text-charcoal-400">No paintings yet. Add one to get started.</div>';
    return;
  }

  list.innerHTML = paintings.map(p => `
    <div class="p-4 flex items-center gap-4 hover:bg-charcoal-50 transition-colors">
      <img src="${p.image_url}" alt="${p.title}" class="w-16 h-16 object-cover rounded-lg" />
      <div class="flex-1">
        <h4 class="font-semibold text-charcoal-900">${p.title}</h4>
        <p class="text-sm text-charcoal-500">${p.artist}</p>
        <div class="flex gap-3 mt-1">
          <span class="text-xs bg-charcoal-100 px-2 py-0.5 rounded">$${p.price}</span>
          ${p.is_featured ? '<span class="text-xs bg-gold-100 text-gold-600 px-2 py-0.5 rounded">Featured</span>' : ''}
          ${p.is_sold ? '<span class="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">Sold</span>' : '<span class="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded">Available</span>'}
        </div>
      </div>
      <div class="flex gap-2">
        <button onclick="window.editPainting('${p.id}')" class="p-2 hover:bg-charcoal-100 rounded-lg transition-colors">
          <i data-lucide="pencil" class="w-4 h-4"></i>
        </button>
        <button onclick="window.deletePainting('${p.id}')" class="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    </div>
  `).join('');
  lucide.createIcons();
}

function renderCategories() {
  const list = document.getElementById('categories-list');
  if (categories.length === 0) {
    list.innerHTML = '<div class="col-span-full p-8 text-center text-charcoal-400">No categories found.</div>';
    return;
  }

  list.innerHTML = categories.map(cat => `
    <div class="p-4 bg-charcoal-50 rounded-lg border border-charcoal-200 flex items-center justify-between">
      <div>
        <h4 class="font-semibold text-charcoal-900">${cat.name}</h4>
        <p class="text-xs text-charcoal-500">${cat.slug}</p>
      </div>
      <button onclick="window.deleteCategory('${cat.id}')" class="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors">
        <i data-lucide="trash-2" class="w-4 h-4"></i>
      </button>
    </div>
  `).join('');
  lucide.createIcons();
}

function updateCategorySelect() {
  const select = document.getElementById('painting-category');
  select.innerHTML = '<option value="">Uncategorized</option>' + categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
}

function openPaintingForm(paintingId = null) {
  currentEditingPaintingId = paintingId;
  const form = document.getElementById('painting-form');
  const title = document.getElementById('form-title');

  if (paintingId) {
    title.textContent = 'Edit Painting';
    const painting = paintings.find(p => p.id === paintingId);
    if (painting) {
      document.getElementById('painting-id').value = painting.id;
      document.getElementById('painting-title').value = painting.title;
      document.getElementById('painting-artist').value = painting.artist;
      document.getElementById('painting-category').value = painting.category_id || '';
      document.getElementById('painting-price').value = painting.price;
      document.getElementById('painting-dimensions').value = painting.dimensions || '';
      document.getElementById('painting-medium').value = painting.medium || '';
      document.getElementById('painting-year').value = painting.year || '';
      document.getElementById('painting-description').value = painting.description || '';
      document.getElementById('painting-featured').checked = painting.is_featured;
      document.getElementById('painting-sold').value = painting.is_sold ? 'true' : 'false';
      document.getElementById('image-preview').innerHTML = `<img src="${painting.image_url}" alt="${painting.title}" class="w-24 h-24 object-cover rounded-lg" />`;
    }
  } else {
    title.textContent = 'Add Painting';
    form.reset();
    document.getElementById('painting-id').value = '';
    document.getElementById('image-preview').innerHTML = '';
  }

  document.getElementById('painting-modal').classList.remove('hidden');
  lucide.createIcons();
}

async function savePainting(e) {
  e.preventDefault();

  const id = document.getElementById('painting-id').value;
  const formData = new FormData();

  formData.append('title', document.getElementById('painting-title').value);
  formData.append('artist', document.getElementById('painting-artist').value);
  formData.append('category_id', document.getElementById('painting-category').value);
  formData.append('price', document.getElementById('painting-price').value);
  formData.append('dimensions', document.getElementById('painting-dimensions').value);
  formData.append('medium', document.getElementById('painting-medium').value);
  formData.append('year', document.getElementById('painting-year').value);
  formData.append('description', document.getElementById('painting-description').value);
  formData.append('is_featured', document.getElementById('painting-featured').checked);
  formData.append('is_sold', document.getElementById('painting-sold').value === 'true');

  const imageFile = document.getElementById('painting-image').files[0];
  if (imageFile) {
    formData.append('image', imageFile);
  }

  try {
    const endpoint = id ? `/api/admin/paintings/${id}` : '/api/admin/paintings';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(endpoint, {
      method,
      headers: { 'Authorization': `Bearer ${authToken}` },
      body: formData
    });

    if (!res.ok) throw new Error('Failed to save');

    alert(id ? 'Painting updated!' : 'Painting added!');
    document.getElementById('painting-modal').classList.add('hidden');
    loadPaintings();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function editPainting(id) {
  openPaintingForm(id);
}

async function deletePainting(id) {
  if (!confirm('Are you sure? This cannot be undone.')) return;

  try {
    const res = await fetch(`/api/admin/paintings/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!res.ok) throw new Error('Failed to delete');

    alert('Painting deleted!');
    loadPaintings();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function saveCategory(e) {
  e.preventDefault();

  const name = document.getElementById('category-name').value;

  try {
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ name })
    });

    if (!res.ok) throw new Error('Failed to save');

    alert('Category added!');
    document.getElementById('category-modal').classList.add('hidden');
    document.getElementById('category-form').reset();
    loadCategories();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function deleteCategory(id) {
  if (!confirm('Are you sure? This cannot be undone.')) return;

  try {
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!res.ok) throw new Error('Failed to delete');

    alert('Category deleted!');
    loadCategories();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));

    btn.classList.add('active');
    document.getElementById(btn.dataset.tab + '-tab').classList.remove('hidden');
  });
});

// Event listeners
document.getElementById('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  login();
});

document.getElementById('logout-btn').addEventListener('click', logout);

document.getElementById('add-painting-btn').addEventListener('click', () => {
  openPaintingForm();
});

document.getElementById('add-category-btn').addEventListener('click', () => {
  document.getElementById('category-modal').classList.remove('hidden');
});

document.getElementById('painting-form').addEventListener('submit', savePainting);
document.getElementById('category-form').addEventListener('submit', saveCategory);

// Expose to global
window.editPainting = editPainting;
window.deletePainting = deletePainting;
window.deleteCategory = deleteCategory;

// Check if logged in
if (authToken) {
  showScreen('admin-screen');
  loadPaintings();
  loadCategories();
} else {
  showScreen('login-screen');
}
