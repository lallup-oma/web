import { WHATSAPP_NUMBER, formatPrice, buildWhatsAppUrl } from './config.js';

const SUPABASE_URL = window.location.hostname === 'localhost'
  ? 'https://0ec90b57d6e95fcbda19832f.supabase.co'
  : document.querySelector('script[data-supabase-url]')?.dataset.supabaseUrl || 'https://0ec90b57d6e95fcbda19832f.supabase.co';

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw';

let cart = JSON.parse(localStorage.getItem('cart') || '[]');

// Cart Management
function updateCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCart();
  updateCartCount();
}

function addToCart(painting) {
  const existing = cart.find(item => item.id === painting.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...painting, quantity: 1 });
  }
  updateCart();
  showCartNotification();
}

function removeFromCart(paintingId) {
  cart = cart.filter(item => item.id !== paintingId);
  updateCart();
}

function updateQuantity(paintingId, quantity) {
  const item = cart.find(item => item.id === paintingId);
  if (item) {
    item.quantity = Math.max(1, quantity);
    updateCart();
  }
}

function renderCart() {
  const cartItems = document.getElementById('cart-items');
  const cartEmpty = document.getElementById('cart-empty');

  if (cart.length === 0) {
    cartItems.innerHTML = '<p id="cart-empty" class="text-charcoal-400 text-sm text-center py-12">Your cart is empty</p>';
    return;
  }

  cartEmpty.classList.add('hidden');
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
      <button onclick="window.removeFromCart('${item.id}')" class="text-charcoal-400 hover:text-red-500 transition-colors">
        <i data-lucide="trash-2" class="w-4 h-4"></i>
      </button>
    </div>
  `).join('');
  lucide.createIcons();
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

function getCartTotal() {
  return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function updateCartTotal() {
  document.getElementById('cart-total').textContent = formatPrice(getCartTotal());
}

function showCartNotification() {
  const btn = document.getElementById('cart-btn');
  btn.classList.add('animate-bounce');
  setTimeout(() => btn.classList.remove('animate-bounce'), 1000);
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

// Fetch Featured Paintings
async function loadFeatured() {
  try {
    const res = await fetch('/api/paintings?featured=true&limit=3&sold=false');
    const { data } = await res.json();
    const grid = document.getElementById('featured-grid');
    grid.innerHTML = data.map(painting => `
      <div class="painting-card group cursor-pointer rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-lg transition-shadow">
        <div class="relative h-80 overflow-hidden bg-charcoal-100">
          <img src="${painting.image_url}" alt="${painting.title}" class="w-full h-full object-cover" />
          <div class="painting-overlay absolute inset-0 bg-charcoal-900/60 opacity-0 flex items-end p-4">
            <button onclick="window.addToCart(${JSON.stringify(painting).replace(/"/g, '&quot;')})" class="w-full flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-600 text-white py-2.5 rounded-full font-medium text-sm transition-colors">
              <i data-lucide="shopping-bag" class="w-4 h-4"></i> Add to Cart
            </button>
          </div>
        </div>
        <div class="p-4">
          <h3 class="font-serif font-bold text-charcoal-900 text-sm mb-1">${painting.title}</h3>
          <p class="text-charcoal-400 text-xs mb-3">${painting.artist}</p>
          <div class="flex items-center justify-between">
            <span class="font-serif text-lg font-bold text-gold-600">${formatPrice(painting.price)}</span>
            <span class="text-xs bg-charcoal-100 text-charcoal-600 px-2.5 py-1 rounded-full">${painting.dimensions || 'N/A'}</span>
          </div>
        </div>
      </div>
    `).join('');
    lucide.createIcons();

    // Update stats
    const res2 = await fetch('/api/paintings');
    const { count } = await res2.json();
    document.getElementById('stat-paintings').textContent = count || '—';
  } catch (err) {
    console.error('Failed to load featured:', err);
  }
}

// Fetch Categories
async function loadCategories() {
  try {
    const res = await fetch('/api/categories');
    const categories = await res.json();
    const grid = document.getElementById('categories-grid');
    grid.innerHTML = categories.map(cat => `
      <a href="/gallery.html?category=${cat.slug}" class="group p-4 rounded-xl bg-white border border-charcoal-100 hover:border-gold-300 hover:shadow-sm transition-all text-center">
        <div class="w-12 h-12 rounded-full bg-gold-100/50 flex items-center justify-center mx-auto mb-3 group-hover:bg-gold-200 transition-colors">
          <i data-lucide="palette" class="w-6 h-6 text-gold-600"></i>
        </div>
        <h4 class="font-semibold text-charcoal-900 text-sm">${cat.name}</h4>
      </a>
    `).join('');
    lucide.createIcons();
  } catch (err) {
    console.error('Failed to load categories:', err);
  }
}

// Cart UI
document.getElementById('cart-btn').addEventListener('click', () => {
  document.getElementById('cart-sidebar').classList.remove('translate-x-full');
  document.getElementById('cart-backdrop').classList.remove('hidden');
  document.getElementById('cart-backdrop').classList.remove('opacity-0');
});

document.getElementById('close-cart').addEventListener('click', () => {
  document.getElementById('cart-sidebar').classList.add('translate-x-full');
  document.getElementById('cart-backdrop').classList.add('hidden');
  document.getElementById('cart-backdrop').classList.add('opacity-0');
});

document.getElementById('cart-backdrop').addEventListener('click', () => {
  document.getElementById('cart-sidebar').classList.add('translate-x-full');
  document.getElementById('cart-backdrop').classList.add('hidden');
  document.getElementById('cart-backdrop').classList.add('opacity-0');
});

document.getElementById('whatsapp-checkout-btn').addEventListener('click', handleWhatsAppCheckout);

// Mobile menu
document.getElementById('mobile-menu-btn').addEventListener('click', () => {
  document.getElementById('mobile-menu').classList.toggle('hidden');
});

// Expose functions to global scope
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;

// Initialize
renderCart();
updateCartCount();
updateCartTotal();
loadFeatured();
loadCategories();
