import { formatPrice, buildWhatsAppUrl } from './config.js';

let cart = JSON.parse(localStorage.getItem('cart') || '[]');
let currentPage = 1;
let currentFilters = { category: '', search: '', hideSold: true };
let totalCount = 0;
let allCategories = [];

async function loadCategories() {
  const res = await fetch('/api/categories');
  allCategories = await res.json();
  renderCategoryChips();
}

function renderCategoryChips() {
  const container = document.getElementById('category-chips');
  container.innerHTML = `<button data-cat="" class="filter-chip active-chip px-4 py-1.5 rounded-full text-sm font-medium bg-gold-500 text-white">All</button>`;
  container.innerHTML += allCategories.map(cat => `
    <button data-cat="${cat.slug}" class="filter-chip px-4 py-1.5 rounded-full text-sm font-medium bg-white border border-charcoal-200 text-charcoal-700 hover:border-gold-500 transition-colors">${cat.name}</button>
  `).join('');

  document.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active-chip', 'bg-gold-500', 'text-white', 'border-charcoal-200', 'text-charcoal-700'));
      btn.classList.add('active-chip', 'bg-gold-500', 'text-white');
      currentFilters.category = btn.dataset.cat;
      currentPage = 1;
      loadPaintings();
    });
  });
}

async function loadPaintings() {
  try {
    const params = new URLSearchParams({
      page: currentPage,
      limit: 12,
      ...(currentFilters.category && { category: currentFilters.category }),
      ...(currentFilters.search && { search: currentFilters.search }),
      ...(currentFilters.hideSold && { sold: 'false' })
    });

    const res = await fetch(`/api/paintings?${params}`);
    const { data, count } = await res.json();
    totalCount = count || 0;

    const grid = document.getElementById('gallery-grid');
    grid.innerHTML = data.map(painting => `
      <button onclick="window.openPaintingModal(${JSON.stringify(painting).replace(/"/g, '&quot;')})" class="painting-card group rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-lg transition-all text-left">
        <div class="relative h-72 bg-charcoal-100 overflow-hidden">
          <img src="${painting.image_url}" alt="${painting.title}" class="w-full h-full object-cover" />
          <div class="painting-overlay absolute inset-0 bg-charcoal-900/60 opacity-0 flex items-center justify-center">
            <div class="bg-white text-charcoal-900 px-4 py-2 rounded-full text-sm font-medium">View Details</div>
          </div>
          ${painting.is_featured ? '<div class="absolute top-3 right-3 bg-gold-500 text-white text-xs px-2.5 py-1 rounded-full font-medium">Featured</div>' : ''}
        </div>
        <div class="p-3.5">
          <h3 class="font-serif font-bold text-charcoal-900 text-sm mb-0.5 line-clamp-1">${painting.title}</h3>
          <p class="text-charcoal-400 text-xs mb-2 line-clamp-1">${painting.artist}</p>
          <div class="flex items-center justify-between">
            <span class="font-serif text-base font-bold text-gold-600">${formatPrice(painting.price)}</span>
            <span class="text-xs text-charcoal-400">${painting.dimensions || 'N/A'}</span>
          </div>
        </div>
      </button>
    `).join('');

    document.getElementById('results-count').textContent = `Showing ${data.length} of ${totalCount} paintings`;
    document.getElementById('load-more-btn').classList.toggle('hidden', currentPage * 12 >= totalCount);

    lucide.createIcons();
  } catch (err) {
    console.error('Error loading paintings:', err);
  }
}

function openPaintingModal(painting) {
  const modal = document.getElementById('painting-modal');
  const content = document.getElementById('modal-content');

  content.innerHTML = `
    <div class="flex flex-col md:flex-row gap-6 p-6">
      <div class="flex-1">
        <img src="${painting.image_url}" alt="${painting.title}" class="w-full h-auto rounded-xl object-cover" />
      </div>
      <div class="flex-1 flex flex-col justify-between">
        <div>
          <p class="text-gold-600 text-xs font-medium tracking-widest uppercase mb-2">${painting.categories?.name || 'Uncategorized'}</p>
          <h2 class="font-serif text-3xl font-bold text-charcoal-900 mb-2">${painting.title}</h2>
          <p class="text-charcoal-500 mb-4">by <span class="font-semibold">${painting.artist}</span></p>

          <div class="space-y-3 mb-6 pb-6 border-b border-charcoal-100">
            ${painting.dimensions ? `<div class="flex justify-between"><span class="text-charcoal-600 text-sm">Dimensions</span><span class="font-semibold text-charcoal-900">${painting.dimensions}</span></div>` : ''}
            ${painting.medium ? `<div class="flex justify-between"><span class="text-charcoal-600 text-sm">Medium</span><span class="font-semibold text-charcoal-900">${painting.medium}</span></div>` : ''}
            ${painting.year ? `<div class="flex justify-between"><span class="text-charcoal-600 text-sm">Year</span><span class="font-semibold text-charcoal-900">${painting.year}</span></div>` : ''}
          </div>

          ${painting.description ? `<p class="text-charcoal-500 leading-relaxed mb-6">${painting.description}</p>` : ''}
        </div>

        <div>
          <div class="text-3xl font-bold text-gold-600 mb-4">${formatPrice(painting.price)}</div>
          <button onclick="window.addToCart(${JSON.stringify(painting).replace(/"/g, '&quot;')})" class="w-full flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-600 text-white py-3.5 rounded-full font-medium transition-colors mb-3">
            <i data-lucide="shopping-bag" class="w-5 h-5"></i>
            Add to Cart
          </button>
          <button onclick="document.getElementById('painting-modal').classList.add('hidden')" class="w-full py-3 border border-charcoal-200 rounded-full font-medium text-charcoal-700 hover:bg-charcoal-50 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
  lucide.createIcons();
}

function addToCart(painting) {
  const existing = cart.find(item => item.id === painting.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...painting, quantity: 1 });
  }
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
  alert('Added to cart!');
  document.getElementById('painting-modal').classList.add('hidden');
}

function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.getElementById('cart-count');
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function renderCart() {
  const cartItems = document.getElementById('cart-items');
  if (cart.length === 0) {
    cartItems.innerHTML = '<p id="cart-empty" class="text-charcoal-400 text-sm text-center py-12">Your cart is empty</p>';
    return;
  }

  cartItems.innerHTML = cart.map(item => `
    <div class="flex gap-3 p-3 border border-charcoal-100 rounded-lg">
      <img src="${item.image_url}" alt="${item.title}" class="w-16 h-16 object-cover rounded-lg" />
      <div class="flex-1">
        <h4 class="text-sm font-semibold text-charcoal-900">${item.title}</h4>
        <p class="text-xs text-charcoal-400 mb-2">${item.artist}</p>
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold text-gold-600">${formatPrice(item.price)}</span>
          <div class="flex items-center gap-1 bg-charcoal-100 rounded-full px-2 py-1">
            <button onclick="window.updateQuantity('${item.id}', ${item.quantity - 1})" class="text-xs px-1 hover:text-gold-600">−</button>
            <span class="text-xs font-medium w-4 text-center">${item.quantity}</span>
            <button onclick="window.updateQuantity('${item.id}', ${item.quantity + 1})" class="text-xs px-1 hover:text-gold-600">+</button>
          </div>
        </div>
      </div>
      <button onclick="window.removeFromCart('${item.id}')" class="text-charcoal-400 hover:text-red-500">
        <i data-lucide="trash-2" class="w-4 h-4"></i>
      </button>
    </div>
  `).join('');
  lucide.createIcons();
}

function removeFromCart(paintingId) {
  cart = cart.filter(item => item.id !== paintingId);
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
  renderCart();
}

function updateQuantity(paintingId, quantity) {
  const item = cart.find(item => item.id === paintingId);
  if (item) {
    item.quantity = Math.max(1, quantity);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
  }
}

function getCartTotal() {
  return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function handleWhatsAppCheckout() {
  if (cart.length === 0) {
    alert('Your cart is empty');
    return;
  }
  const items = cart.map(item => `${item.title} by ${item.artist} (${formatPrice(item.price)} x${item.quantity})`).join('\n');
  const total = formatPrice(getCartTotal());
  const msg = `Hi! I'd like to purchase:\n\n${items}\n\nTotal: ${total}\n\nPlease confirm details and arrange payment.`;
  window.open(buildWhatsAppUrl(msg), '_blank');
}

// Event listeners
document.getElementById('search-input').addEventListener('input', (e) => {
  currentFilters.search = e.target.value;
  currentPage = 1;
  loadPaintings();
});

document.getElementById('sort-select').addEventListener('change', (e) => {
  // Sorting handled by client-side would be done here if needed
});

document.getElementById('hide-sold').addEventListener('change', (e) => {
  currentFilters.hideSold = e.checked;
  currentPage = 1;
  loadPaintings();
});

document.getElementById('load-more-btn').addEventListener('click', () => {
  currentPage++;
  loadPaintings();
});

document.getElementById('cart-btn').addEventListener('click', () => {
  document.getElementById('cart-sidebar').classList.remove('translate-x-full');
  document.getElementById('cart-backdrop').classList.remove('hidden');
});

document.getElementById('close-cart').addEventListener('click', () => {
  document.getElementById('cart-sidebar').classList.add('translate-x-full');
  document.getElementById('cart-backdrop').classList.add('hidden');
});

document.getElementById('cart-backdrop').addEventListener('click', () => {
  document.getElementById('cart-sidebar').classList.add('translate-x-full');
  document.getElementById('cart-backdrop').classList.add('hidden');
});

document.getElementById('modal-backdrop').addEventListener('click', () => {
  document.getElementById('painting-modal').classList.add('hidden');
});

document.getElementById('whatsapp-checkout-btn').addEventListener('click', handleWhatsAppCheckout);

document.getElementById('mobile-menu-btn').addEventListener('click', () => {
  document.getElementById('mobile-menu').classList.toggle('hidden');
});

// Expose to global
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.openPaintingModal = openPaintingModal;

// Initialize
loadCategories();
loadPaintings();
renderCart();
updateCartCount();
document.getElementById('cart-total').textContent = formatPrice(0);
