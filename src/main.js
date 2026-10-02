import './style.css';
import { icons } from './icons.js';
import * as api from './api.js';

// ═══════════ STATE ═══════════
const state = {
  token: localStorage.getItem('cd_token') || null,
  user: JSON.parse(localStorage.getItem('cd_user') || 'null'),
  cakes: [],
  basket: { items: [], total: 0 },
  orders: [],
  page: 'home',
  category: 'All',
  selectedCakeId: null,
  selectedCake: null,
  selectedCakeRating: { average: 0, count: 0 },
  selectedCakeReviews: [],
  editCake: null,
};

const isAdmin = () => state.user?.role === 'admin';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=900';
function cakeImg(src) {
  return src || FALLBACK_IMG;
}

// ═══════════ AUTH HELPERS ═══════════
function saveAuth(d) {
  state.token = d.token; state.user = d.user;
  localStorage.setItem('cd_token', d.token);
  localStorage.setItem('cd_user', JSON.stringify(d.user));
}
function clearAuth() {
  state.token = null; state.user = null;
  localStorage.removeItem('cd_token'); localStorage.removeItem('cd_user');
}

// ═══════════ TOAST ═══════════
function toast(msg, type = 'success') {
  const c = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  const ic = type === 'success' ? icons.check : type === 'error' ? icons.x : icons.bell;
  el.innerHTML = `<span>${ic}</span><span>${msg}</span>`;
  c.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(60px)'; el.style.transition = 'all 0.3s'; setTimeout(() => el.remove(), 300); }, 3500);
}

// ═══════════ MODAL ═══════════
function showModal(html) {
  const o = document.getElementById('modal-overlay');
  document.getElementById('modal-content').innerHTML = html;
  o.classList.remove('hidden');
}
function closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); }
document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target.id === 'modal-overlay') closeModal(); });
window.closeModal = closeModal;

// ═══════════ NAVIGATION ═══════════
function go(page, param = null) {
  state.page = page;
  if (page === 'detail' && param) {
    state.selectedCakeId = param;
  }
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window._go = go;
window._openDetail = (id) => go('detail', id);

// ═══════════ STARS ═══════════
function stars(avg, size = 18) {
  let h = '';
  const score = Math.round(Number(avg) || 0);
  for (let i = 1; i <= 5; i++) {
    const f = i <= score;
    h += `<span class="star-btn ${f ? 'star-filled' : 'star-empty'}" style="width:${size}px;height:${size}px;display:inline-flex">${f ? icons.starFill : icons.starLine}</span>`;
  }
  return h;
}

// ═══════════ SKELETON ═══════════
function skeletons(n) {
  return Array.from({ length: n }, () => `
    <div style="border-radius:20px;overflow:hidden;background:#fff;box-shadow:var(--shadow-sm)">
      <div class="skeleton" style="height:220px;border-radius:0"></div>
      <div style="padding:20px;display:flex;flex-direction:column;gap:10px">
        <div class="skeleton" style="height:14px;width:80px"></div>
        <div class="skeleton" style="height:18px;width:70%"></div>
        <div class="skeleton" style="height:12px;width:100%"></div>
        <div style="display:flex;justify-content:space-between"><div class="skeleton" style="height:24px;width:50px"></div><div class="skeleton" style="height:38px;width:90px;border-radius:12px"></div></div>
      </div>
    </div>`).join('');
}

// ═══════════ STOCK & EGGLESS BADGES ═══════════
function stockBadge(qty) {
  if (qty === undefined || qty === null) return '';
  if (qty <= 0) return `<span class="tag" style="background:#FEE2E2;color:#991B1B">Out of Stock</span>`;
  if (qty <= 5) return `<span class="tag" style="background:#FEF3C7;color:#92400E">Only ${qty} left</span>`;
  return `<span class="tag" style="background:#D1FAE5;color:#065F46">In Stock: ${qty}</span>`;
}

function egglessBadge() {
  return `<span class="eggless-badge"><span class="eggless-icon"></span> 100% Eggless</span>`;
}

// ═══════════ RENDER ═══════════
function render() {
  const app = document.getElementById('app');
  app.innerHTML = navbar() + `<main class="main page-enter">${page()}</main>`;
  updateBadge();
}

function page() {
  switch (state.page) {
    case 'catalog':         return pageCatalog();
    case 'detail':          return pageDetail();
    case 'basket':          return pageBasket();
    case 'checkout':        return pageCheckout();
    case 'orders':          return pageOrders();
    case 'payment-success': return pagePaymentSuccess();
    case 'admin':           return pageAdmin();
    case 'admin-add':       return pageAdminForm();
    case 'admin-edit':      return pageAdminForm(true);
    default:                return pageHome();
  }
}

// ═══════════ NAVBAR ═══════════
function navbar() {
  const adminLinks = isAdmin() ? `
    <button class="nav-link ${state.page.startsWith('admin')?'active':''}" onclick="_go('admin')">
      ${icons.package} Inventory
    </button>` : '';

  const authHtml = state.user
    ? `<div style="display:flex;align-items:center;gap:8px" class="hide-mobile">
        <div style="display:flex;align-items:center;gap:8px;background:rgba(245,230,211,0.65);padding:4px 12px;border-radius:20px;border:1px solid rgba(139,94,60,0.15)">
          <div style="width:24px;height:24px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700">
            ${(state.user.name || 'U').charAt(0).toUpperCase()}
          </div>
          <span style="font-size:0.85rem;font-weight:600;color:var(--primary-dark)">${state.user.name}</span>
          ${isAdmin() ? '<span class="tag" style="background:#DBEAFE;color:#1E40AF;font-size:0.65rem;padding:1px 6px">ADMIN</span>' : ''}
        </div>
        <button class="btn btn-sm" onclick="_logout()" style="background:#FEE2E2;color:#991B1B;border:1px solid #FCA5A5;font-weight:600;padding:6px 12px;display:inline-flex;align-items:center;gap:6px;border-radius:10px" title="Sign out of your account">
          ${icons.logout} Logout
        </button>
       </div>`
    : `<button class="btn btn-primary btn-sm" onclick="_showAuth('login')">${icons.user} Sign In</button>`;

  return `
  <nav class="navbar">
    <div class="navbar-inner">
      <a class="logo" onclick="_go('home')">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--cta)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 21h20"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-4h6v4"/><circle cx="12" cy="11" r="2"/></svg>
        <span>Cake Delight</span>
      </a>
      <div class="nav-links">
        <button class="nav-link ${state.page==='home'?'active':''}" onclick="_go('home')">Home</button>
        <button class="nav-link ${state.page==='catalog'?'active':''}" onclick="_go('catalog')">Cakes</button>
        <button class="nav-link ${state.page==='orders'?'active':''}" onclick="_go('orders')">My Orders</button>
        ${adminLinks}
      </div>
      <div class="nav-right">
        <button class="nav-icon-btn" onclick="_go('basket')" aria-label="Basket">
          ${icons.cart}
          <span class="badge-count" id="basket-badge" style="display:none">0</span>
        </button>
        ${authHtml}
        <button class="nav-icon-btn mobile-toggle" onclick="_toggleMobile()" aria-label="Menu">${icons.menu}</button>
      </div>
    </div>
    <div class="mobile-menu" id="mobile-menu">
      ${state.user ? `
        <div style="padding:12px 14px;background:rgba(245,230,211,0.5);border-radius:12px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-weight:700;color:var(--primary-dark)">${state.user.name}</div>
            <div style="font-size:0.8rem;color:rgba(60,31,10,0.5)">${state.user.email} ${isAdmin() ? '• Admin' : ''}</div>
          </div>
          <button class="btn btn-sm" onclick="_logout();_toggleMobile()" style="background:#FEE2E2;color:#991B1B;border:1px solid #FCA5A5;font-weight:600;padding:6px 12px">
            Logout
          </button>
        </div>` : `
        <button class="btn btn-primary" onclick="_showAuth('login');_toggleMobile()" style="width:100%;margin-bottom:10px;justify-content:center">
          ${icons.user} Sign In / Register
        </button>`
      }
      <button class="nav-link" onclick="_go('home');_toggleMobile()">Home</button>
      <button class="nav-link" onclick="_go('catalog');_toggleMobile()">Cakes</button>
      <button class="nav-link" onclick="_go('orders');_toggleMobile()">My Orders</button>
      ${isAdmin() ? '<button class="nav-link" onclick="_go(\'admin\');_toggleMobile()">Inventory</button>' : ''}
      ${state.user ? `
        <button class="nav-link" onclick="_logout();_toggleMobile()" style="color:#DC2626;font-weight:700;display:flex;align-items:center;gap:8px;margin-top:8px">
          ${icons.logout} Sign Out
        </button>` : ''
      }
    </div>
  </nav>`;
}

function updateBadge() {
  const b = document.getElementById('basket-badge');
  if (!b) return;
  const n = state.basket.items?.length || 0;
  b.textContent = n; b.style.display = n > 0 ? 'flex' : 'none';
}

window._toggleMobile = () => document.getElementById('mobile-menu')?.classList.toggle('open');

// ═══════════ AUTH MODAL ═══════════
window._showAuth = (mode = 'login') => {
  const isLogin = mode === 'login';
  showModal(`
    <h2 class="modal-title">${isLogin ? 'Welcome Back' : 'Create Account'}</h2>
    <form class="modal-form" onsubmit="_handleAuth(event,'${mode}')">
      ${!isLogin ? `<div class="input-group"><label for="auth-name">Full Name</label><input id="auth-name" class="input" type="text" placeholder="Rohan Sharma" required /></div>` : ''}
      <div class="input-group"><label for="auth-email">Email</label><input id="auth-email" class="input" type="email" placeholder="rohan@example.com" required /></div>
      <div class="input-group"><label for="auth-pwd">Password</label><input id="auth-pwd" class="input" type="password" placeholder="Min 6 characters" required minlength="6" /></div>
      <button type="submit" class="btn btn-primary" id="auth-btn" style="width:100%;justify-content:center">${isLogin ? 'Sign In' : 'Create Account'}</button>
    </form>
    <div class="modal-footer">
      ${isLogin ? "Don't have an account?" : 'Already have an account?'}
      <button onclick="_showAuth('${isLogin ? 'register' : 'login'}')">${isLogin ? 'Sign Up' : 'Sign In'}</button>
    </div>
  `);
};

window._handleAuth = async (e, mode) => {
  e.preventDefault();
  const btn = document.getElementById('auth-btn');
  btn.disabled = true; btn.textContent = 'Please wait...';
  try {
    const email = document.getElementById('auth-email').value;
    const pwd = document.getElementById('auth-pwd').value;
    if (mode === 'register') {
      const name = document.getElementById('auth-name').value;
      const d = await api.apiRegister(email, pwd, name); saveAuth(d); toast('Account created!');
    } else {
      const d = await api.apiLogin(email, pwd); saveAuth(d); toast(`Welcome back, ${state.user.name}!`);
    }
    closeModal(); loadBasket(); render();
  } catch (err) {
    toast(err.message, 'error'); btn.disabled = false; btn.textContent = mode === 'login' ? 'Sign In' : 'Create Account';
  }
};

window._logout = () => { clearAuth(); state.basket = { items: [], total: 0 }; toast('Signed out', 'info'); render(); };

// ═══════════ BASKET LOADING ═══════════
async function loadBasket() {
  if (!state.token) return;
  try { state.basket = await api.apiGetBasket(); updateBadge(); } catch {}
}

// ═══════════ HOME PAGE ═══════════
function pageHome() {
  setTimeout(loadFeatured, 0);
  return `
    <section class="hero anim-fade">
      <div class="hero-content">
        <h1 class="anim-slide-up" style="animation-delay:80ms">Fresh Handcrafted Cakes for Every Celebration</h1>
        <p class="anim-slide-up" style="animation-delay:160ms">100% Eggless artisan cakes, Rasmalai fusion specialties & rich Belgian chocolate delights — delivered fresh to your doorstep in 2-3 hours.</p>
        <div class="hero-actions anim-slide-up" style="animation-delay:240ms">
          <button class="btn btn-primary" onclick="_go('catalog')">${icons.arrowRight} Browse Cakes</button>
          ${!state.token ? `<button class="btn btn-secondary" onclick="_showAuth('register')">Create Account</button>` : ''}
          ${isAdmin() ? `<button class="btn btn-secondary" onclick="_go('admin')">${icons.package} Manage Inventory</button>` : ''}
        </div>
      </div>
      <div class="hero-circle-1"></div><div class="hero-circle-2"></div>
    </section>
    <section>
      <div class="section-header">
        <div><h2>Our Best Sellers</h2><p class="subtitle">Most loved by families across the city</p></div>
        <button class="btn btn-ghost" onclick="_go('catalog')">View All ${icons.arrowRight}</button>
      </div>
      <div class="grid grid-3 stagger" id="featured-grid">${skeletons(3)}</div>
    </section>
    <section style="margin-top:64px">
      <h2 style="text-align:center;margin-bottom:40px;font-size:1.75rem;color:var(--primary-dark)">Why Choose Cake Delight?</h2>
      <div class="grid grid-3 stagger">
        ${hiwCard(icons.search, '100% Eggless & Fresh', 'Baked fresh with pure ingredients, premium dairy cream and authentic flavours.', 1)}
        ${hiwCard(icons.cart, 'Affordable Luxury', 'Artisan bakery quality at honest middle-class friendly pricing starting ₹249.', 2)}
        ${hiwCard(icons.creditCard, 'Fast & Safe Delivery', 'Convenient UPI/Card payment with live order confirmation and express doorstep delivery.', 3)}
      </div>
    </section>`;
}

function hiwCard(ic, title, desc, step) {
  return `<div class="glass-card hiw-card anim-slide-up" style="animation-delay:${step*100}ms"><div class="hiw-icon">${ic}</div><div class="hiw-step">PROMISE ${step}</div><div class="hiw-title">${title}</div><p class="hiw-desc">${desc}</p></div>`;
}

async function loadFeatured() {
  try {
    state.cakes = await api.apiGetCakes();
    const cakes = state.cakes.slice(0, 3);
    const ratings = await Promise.allSettled(cakes.map(c => api.apiGetRatingSummary(c._id).catch(() => ({ average: 0, count: 0 }))));
    const el = document.getElementById('featured-grid');
    if (el) el.innerHTML = cakes.map((c, i) => cakeCard(c, ratings[i]?.value || { average: 0, count: 0 }, i)).join('');
  } catch {
    const el = document.getElementById('featured-grid');
    if (el) el.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:rgba(60,31,10,0.4)"><p>Unable to load cakes. Is the backend running?</p></div>`;
  }
}

// ═══════════ CAKE CARD ═══════════
function cakeCard(cake, rating, idx) {
  const outOfStock = cake.quantity !== undefined && cake.quantity <= 0;
  const src = cakeImg(cake.imageUrl);
  return `
    <div class="cake-card clickable-card anim-slide-up" style="animation-delay:${idx*80}ms${outOfStock ? ';opacity:0.7' : ''}" onclick="_openDetail('${cake._id}')">
      <div style="overflow:hidden;position:relative">
        <img class="cake-img" src="${src}" alt="${cake.name}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'" />
        <div style="position:absolute;top:12px;left:12px;display:flex;flex-direction:column;gap:6px">
          ${egglessBadge()}
        </div>
        ${outOfStock ? '<div style="position:absolute;inset:0;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center"><span style="background:#991B1B;color:#fff;padding:8px 20px;border-radius:8px;font-weight:700;font-size:0.9rem">OUT OF STOCK</span></div>' : ''}
      </div>
      <div class="cake-body">
        <div class="cake-meta">
          <span class="tag tag-category">${cake.category || 'Bakery'}</span>
          <span style="font-size:0.8rem;color:rgba(60,31,10,0.5);font-weight:600">${cake.weight || '500g'}</span>
          ${stockBadge(cake.quantity)}
        </div>
        <h3 class="cake-name">${cake.name}</h3>
        <p class="cake-desc">${cake.description || ''}</p>
        <div style="margin: 4px 0 10px 0; display:flex; align-items:center; gap:6px">
          <div class="stars">${stars(rating.average, 15)}</div>
          <span style="font-weight:700;font-size:0.85rem;color:var(--primary-dark)">${rating.average > 0 ? rating.average.toFixed(1) : 'New'}</span>
          <span style="color:rgba(60,31,10,0.4);font-size:0.78rem">(${rating.count} reviews)</span>
        </div>
        <div class="cake-footer" onclick="event.stopPropagation()">
          <div>
            <span class="cake-price" style="font-size:1.4rem;font-weight:800;color:var(--cta)">₹${cake.price}</span>
          </div>
          <div class="cake-actions">
            <button class="btn btn-ghost btn-sm" onclick="_openDetail('${cake._id}')" title="View details & reviews">Details</button>
            <button class="btn btn-primary btn-sm" onclick="_addToBasket('${cake._id}')" ${outOfStock ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}>
              ${icons.cart} ${outOfStock ? 'Sold Out' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </div>`;
}

// ═══════════ CATALOG PAGE ═══════════
function pageCatalog() {
  const cats = ['All', 'Chocolate', 'Fusion', 'Fruit', 'Birthday', 'Wedding', 'Cupcake'];
  setTimeout(loadCatalog, 0);
  return `
    <div class="anim-fade"><h1 style="font-size:2rem;color:var(--primary-dark);margin-bottom:4px">Fresh Bakery Collection</h1><p style="color:rgba(60,31,10,0.45);margin-bottom:24px">Handcrafted daily with pure ingredients & fair pricing in INR (₹)</p></div>
    <div class="pills anim-slide-up" style="margin-bottom:20px">${cats.map(c => `<button class="pill ${state.category===c?'active':''}" onclick="_filter('${c}')">${c}</button>`).join('')}</div>
    <div class="search-wrap anim-slide-up" style="animation-delay:80ms;margin-bottom:32px">${icons.search}<input class="input" placeholder="Search Rasmalai, Chocolate, Fruit cakes..." oninput="_search(this.value)" /></div>
    <div class="grid grid-3 stagger" id="cakes-grid">${skeletons(6)}</div>`;
}

async function loadCatalog() {
  try {
    const filters = {}; if (state.category !== 'All') filters.category = state.category;
    state.cakes = await api.apiGetCakes(filters);
    const ratings = await Promise.allSettled(state.cakes.map(c => api.apiGetRatingSummary(c._id).catch(() => ({ average: 0, count: 0 }))));
    const el = document.getElementById('cakes-grid');
    if (!el) return;
    if (!state.cakes.length) { el.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:rgba(60,31,10,0.4)">No cakes found</div>`; return; }
    el.innerHTML = state.cakes.map((c, i) => cakeCard(c, ratings[i]?.value || { average: 0, count: 0 }, i)).join('');
  } catch {
    const el = document.getElementById('cakes-grid');
    if (el) el.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:rgba(60,31,10,0.4)">Unable to load cakes</div>`;
  }
}

window._filter = (cat) => { state.category = cat; render(); };
window._search = (q) => {
  const el = document.getElementById('cakes-grid');
  if (!el) return;
  const f = state.cakes.filter(c => c.name.toLowerCase().includes(q.toLowerCase()) || c.description?.toLowerCase().includes(q.toLowerCase()) || c.flavour?.toLowerCase().includes(q.toLowerCase()));
  if (!f.length) { el.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:rgba(60,31,10,0.4)">No cakes match "${q}"</div>`; return; }
  el.innerHTML = f.map((c, i) => cakeCard(c, { average: 0, count: 0 }, i)).join('');
};

// ═══════════ PRODUCT DETAIL PAGE ═══════════
function pageDetail() {
  setTimeout(loadDetailData, 0);
  return `
    <div id="detail-root">
      <button class="btn btn-ghost" onclick="_go('catalog')" style="margin-bottom:16px">← Back to Cakes</button>
      <div class="skeleton" style="height:480px;border-radius:24px"></div>
    </div>`;
}

async function loadDetailData() {
  const root = document.getElementById('detail-root');
  if (!root || !state.selectedCakeId) return;

  try {
    const [cake, ratingSummary, reviews] = await Promise.all([
      api.apiGetCake(state.selectedCakeId),
      api.apiGetRatingSummary(state.selectedCakeId).catch(() => ({ average: 0, count: 0 })),
      api.apiGetRatings(state.selectedCakeId).catch(() => [])
    ]);

    state.selectedCake = cake;
    state.selectedCakeRating = ratingSummary;
    state.selectedCakeReviews = reviews;

    const outOfStock = cake.quantity !== undefined && cake.quantity <= 0;
    const highlights = cake.highlights?.length ? cake.highlights : [
      '100% Eggless Artisan Cake',
      'Fresh Baked On Order',
      'Premium Natural Ingredients',
      'Free Delivery Available'
    ];

    root.innerHTML = `
      <div class="anim-fade">
        <button class="btn btn-ghost" onclick="_go('catalog')" style="margin-bottom:20px;padding:6px 12px">← Back to Cakes</button>
        
        <div class="detail-layout">
          <!-- Left: Large Image & Badges -->
          <div class="detail-img-wrap anim-slide-up">
            <img src="${cakeImg(cake.imageUrl)}" alt="${cake.name}" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'" />
            <div style="position:absolute;top:16px;left:16px;display:flex;flex-direction:column;gap:8px">
              ${egglessBadge()}
              <span class="tag tag-category" style="font-size:0.85rem;padding:6px 12px">${cake.category || 'Bakery'}</span>
            </div>
            <div style="position:absolute;bottom:16px;left:16px">
              ${stockBadge(cake.quantity)}
            </div>
          </div>

          <!-- Right: Details, Highlights & Add to Basket -->
          <div class="glass-card detail-info anim-slide-up" style="animation-delay:80ms;padding:32px">
            <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:12px">
              <h1 class="detail-title">${cake.name}</h1>
            </div>

            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <div class="stars">${stars(ratingSummary.average, 20)}</div>
              <span style="font-weight:700;font-size:1.1rem;color:var(--primary-dark)">${ratingSummary.average > 0 ? ratingSummary.average.toFixed(1) : 'New'}</span>
              <a href="#reviews-section" style="color:var(--primary);text-decoration:underline;font-size:0.9rem">(${ratingSummary.count} verified customer reviews)</a>
            </div>

            <div class="detail-price-row">
              <span class="detail-price">₹${cake.price}</span>
              <span class="detail-weight">${cake.weight || '500g'}</span>
              <span style="font-size:0.85rem;color:#059669;font-weight:600">Inclusive of all taxes</span>
            </div>

            ${cake.flavour ? `<div style="font-size:0.95rem;color:var(--chocolate)"><strong>Flavour Profile:</strong> ${cake.flavour}</div>` : ''}

            <p style="color:var(--chocolate-light);font-size:1.025rem;line-height:1.6">${cake.description || ''}</p>

            <div class="detail-highlights">
              ${highlights.map(h => `<div class="detail-highlight-item">${icons.check} <span>${h}</span></div>`).join('')}
            </div>

            <div class="delivery-promise-box">
              <span style="font-size:1.4rem">⚡</span>
              <div>
                <strong>Guaranteed Express Delivery:</strong> Baked fresh and delivered within 2-3 hours in sanitized temperature-controlled boxes.
              </div>
            </div>

            <div style="display:flex;align-items:center;gap:16px;margin-top:12px;flex-wrap:wrap">
              <div class="qty-row" style="background:#fff;padding:4px 12px;border-radius:12px;border:1px solid rgba(139,94,60,0.2)">
                <button class="qty-btn" onclick="_updateDetailQty(-1)">${icons.minus}</button>
                <span id="detail-qty-val" class="qty-val" style="font-size:1.1rem;font-weight:700;min-width:32px;text-align:center">1</span>
                <button class="qty-btn" onclick="_updateDetailQty(1)">${icons.plus}</button>
              </div>

              <button class="btn btn-primary" id="detail-add-btn" onclick="_addDetailToBasket('${cake._id}')" style="flex:1;min-width:200px;justify-content:center;font-size:1.05rem;padding:14px 28px" ${outOfStock ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}>
                ${icons.cart} ${outOfStock ? 'Out of Stock' : 'Add to Basket (₹' + cake.price + ')'}
              </button>
            </div>
          </div>
        </div>

        <!-- Reviews & Rating Section -->
        <div id="reviews-section" class="reviews-container anim-slide-up" style="animation-delay:160ms">
          <div class="section-header">
            <div>
              <h2 style="font-size:1.75rem;color:var(--primary-dark)">Customer Reviews & Ratings</h2>
              <p class="subtitle">Real feedback from verified cake lovers</p>
            </div>
          </div>

          <div class="reviews-grid">
            <!-- Left: Score Summary & Write Review Form -->
            <div style="display:flex;flex-direction:column;gap:20px">
              <div class="glass-card review-score-card">
                <div class="review-score-num">${ratingSummary.average > 0 ? ratingSummary.average.toFixed(1) : '5.0'}</div>
                <div class="stars">${stars(ratingSummary.average || 5, 24)}</div>
                <p style="color:rgba(60,31,10,0.5);font-size:0.9rem">Based on ${ratingSummary.count} reviews</p>
              </div>

              <!-- Write a Review Form -->
              <div class="glass-card" style="padding:24px">
                <h3 style="font-size:1.15rem;color:var(--primary-dark);margin-bottom:12px">Write a Customer Review</h3>
                <form onsubmit="_submitDetailReview(event, '${cake._id}')" style="display:flex;flex-direction:column;gap:12px">
                  <div class="input-group">
                    <label>Your Rating *</label>
                    <div id="detail-star-picker" style="display:flex;gap:8px;font-size:1.6rem">
                      ${[1,2,3,4,5].map(i => `<button type="button" class="star-btn ${i<=5?'star-filled':'star-empty'}" onclick="_pickDetailStar(${i})" style="width:32px;height:32px">${icons.starFill}</button>`).join('')}
                    </div>
                  </div>
                  <div class="input-group">
                    <label>Your Name *</label>
                    <input id="rev-name" class="input" type="text" placeholder="e.g. Priya Patel" value="${state.user?.name || ''}" required />
                  </div>
                  <div class="input-group">
                    <label>Your Review *</label>
                    <textarea id="rev-comment" class="input" rows="3" placeholder="Share your experience (flavour, freshness, delivery)..." required></textarea>
                  </div>
                  <button type="submit" class="btn btn-primary" id="rev-submit-btn" style="justify-content:center;margin-top:6px">
                    Submit Review
                  </button>
                </form>
              </div>
            </div>

            <!-- Right: List of Reviews -->
            <div>
              <h3 style="font-size:1.2rem;color:var(--primary-dark);margin-bottom:16px">Customer Feedback (${reviews.length})</h3>
              <div id="reviews-list">
                ${reviews.length ? reviews.map(r => `
                  <div class="glass-card review-card anim-slide-up">
                    <div class="review-header">
                      <div class="reviewer-meta">
                        <div class="reviewer-avatar">${(r.customerName || 'U').charAt(0).toUpperCase()}</div>
                        <div>
                          <div class="reviewer-name">${r.customerName || 'Verified Buyer'}</div>
                          <div class="review-date">${new Date(r.createdAt || Date.now()).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                        </div>
                      </div>
                      <div class="stars">${stars(r.score, 16)}</div>
                    </div>
                    <p class="review-text">${r.comment || 'Delicious cake, loved by everyone!'}</p>
                  </div>`).join('') : `
                  <div class="glass-card" style="text-align:center;padding:40px 20px;color:rgba(60,31,10,0.5)">
                    <p style="font-size:1.05rem;margin-bottom:8px">No reviews yet for this cake.</p>
                    <p style="font-size:0.85rem">Be the first to share your thoughts!</p>
                  </div>`}
              </div>
            </div>
          </div>
        </div>
      </div>`;
    
    window._detailStarScore = 5;
    window._detailQty = 1;
  } catch (err) {
    root.innerHTML = `<div style="text-align:center;padding:60px;color:rgba(60,31,10,0.4)">Unable to load cake details: ${err.message}</div>`;
  }
}

window._updateDetailQty = (delta) => {
  const current = window._detailQty || 1;
  const max = state.selectedCake?.quantity || 99;
  const next = Math.max(1, Math.min(max, current + delta));
  window._detailQty = next;
  const el = document.getElementById('detail-qty-val');
  if (el) el.textContent = next;
  const btn = document.getElementById('detail-add-btn');
  if (btn && state.selectedCake) {
    btn.innerHTML = `${icons.cart} Add to Basket (₹${(state.selectedCake.price * next).toFixed(0)})`;
  }
};

window._addDetailToBasket = async (cakeId) => {
  if (!state.token) { _showAuth('login'); toast('Please sign in first', 'info'); return; }
  const qty = window._detailQty || 1;
  try {
    state.basket = await api.apiAddToBasket(cakeId, qty);
    updateBadge();
    toast(`Added ${qty} item(s) to basket!`);
  } catch (e) {
    toast(e.message, 'error');
  }
};

window._pickDetailStar = (n) => {
  window._detailStarScore = n;
  document.querySelectorAll('#detail-star-picker button').forEach((b, i) => {
    b.className = `star-btn ${i < n ? 'star-filled' : 'star-empty'}`;
    b.innerHTML = i < n ? icons.starFill : icons.starLine;
  });
};

window._submitDetailReview = async (e, cakeId) => {
  e.preventDefault();
  const btn = document.getElementById('rev-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Submitting...';

  const name = document.getElementById('rev-name').value;
  const comment = document.getElementById('rev-comment').value;
  const score = window._detailStarScore || 5;

  try {
    await api.apiSubmitRating(cakeId, score, comment, name);
    toast('Thank you! Review posted.');
    loadDetailData();
  } catch (err) {
    toast(err.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Submit Review';
  }
};

// ═══════════ ADD TO BASKET FROM CARD ═══════════
window._addToBasket = async (id) => {
  if (!state.token) { _showAuth('login'); toast('Please sign in first', 'info'); return; }
  try { state.basket = await api.apiAddToBasket(id, 1); updateBadge(); toast('Added to basket!'); } catch (e) { toast(e.message, 'error'); }
};

// ═══════════ BASKET PAGE ═══════════
function pageBasket() {
  if (!state.token) return authPrompt('Sign in to view your basket');
  setTimeout(async () => { try { state.basket = await api.apiGetBasket(); updateBadge(); reRenderBasket(); } catch {} }, 0);
  return `<div id="basket-root"><h1 class="anim-fade" style="font-size:2rem;color:var(--primary-dark);margin-bottom:32px">Your Shopping Basket</h1><div class="skeleton" style="height:200px;max-width:600px;margin:0 auto"></div></div>`;
}

function reRenderBasket() {
  const root = document.getElementById('basket-root'); if (!root) return;
  if (!state.basket.items?.length) { root.innerHTML = emptyState(icons.cart, 'Your Basket is Empty', 'Explore our delicious handcrafted cakes & treats!', 'Browse Cakes', 'catalog'); return; }
  root.innerHTML = `
    <h1 class="anim-fade" style="font-size:2rem;color:var(--primary-dark);margin-bottom:32px">Your Shopping Basket</h1>
    <div class="basket-layout">
      <div class="basket-items stagger">${state.basket.items.map((item, i) => `
        <div class="glass-card basket-item anim-slide-up" style="animation-delay:${i*60}ms">
          <img class="basket-item-img" src="${cakeImg(item.imageUrl)}" alt="${item.name}" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'" />
          <div class="basket-item-info">
            <div class="basket-item-name" style="font-size:1.05rem;font-weight:700;color:var(--primary-dark)">${item.name}</div>
            <div class="basket-item-price-each" style="margin-top:2px">₹${item.price} each ${item.weight ? '• <span style="font-weight:600">' + item.weight + '</span>' : ''}</div>
          </div>
          <div class="qty-row">
            <button class="qty-btn" onclick="_updateQty('${item.cakeId}',${Math.max(1,item.quantity-1)})">${icons.minus}</button>
            <span class="qty-val">${item.quantity}</span>
            <button class="qty-btn" onclick="_updateQty('${item.cakeId}',${item.quantity+1})">${icons.plus}</button>
          </div>
          <span class="basket-item-total" style="font-size:1.15rem;font-weight:800;color:var(--cta)">₹${(item.price*item.quantity).toFixed(0)}</span>
          <button class="btn-icon" onclick="_removeItem('${item.cakeId}')" style="color:#EF4444" title="Remove item">${icons.trash}</button>
        </div>`).join('')}</div>
      <div class="glass-card summary-card anim-slide-up" style="animation-delay:100ms">
        <h3>Order Bill Summary</h3>
        <div class="summary-row"><span class="label">Items Total (${state.basket.items.length})</span><span class="value">₹${state.basket.total?.toFixed(0)}</span></div>
        <div class="summary-row free"><span class="label">Doorstep Delivery</span><span class="value">FREE</span></div>
        <div class="summary-row"><span class="label">Taxes & Packaging</span><span class="value">₹0 (Included)</span></div>
        <hr class="summary-divider" />
        <div class="summary-row summary-total"><span class="label">Grand Total</span><span class="value" style="color:var(--cta);font-size:1.4rem">₹${state.basket.total?.toFixed(0)}</span></div>
        <button class="btn btn-primary" onclick="_go('checkout')" style="width:100%;justify-content:center;margin-top:20px">${icons.creditCard} Proceed to Payment</button>
      </div>
    </div>`;
}

window._updateQty = async (id, qty) => { try { state.basket = await api.apiUpdateBasketItem(id, qty); updateBadge(); reRenderBasket(); } catch (e) { toast(e.message, 'error'); } };
window._removeItem = async (id) => { try { state.basket = await api.apiRemoveBasketItem(id); updateBadge(); reRenderBasket(); toast('Item removed'); } catch (e) { toast(e.message, 'error'); } };

// ═══════════ CHECKOUT PAGE ═══════════
function pageCheckout() {
  if (!state.token) return authPrompt('Sign in to checkout');
  if (!state.basket.items?.length) return emptyState(icons.cart, 'Basket is Empty', 'Add some cakes first.', 'Browse Cakes', 'catalog');
  return `
    <div class="anim-fade" style="margin-bottom:28px">
      <h1 style="font-size:2rem;color:var(--primary-dark);display:flex;align-items:center;gap:10px">
        <span style="width:28px;height:28px;display:inline-flex;color:var(--cta);flex-shrink:0">${icons.lock}</span>
        Secure Indian Checkout
      </h1>
    </div>
    <div class="checkout-layout">
      <div class="glass-card anim-slide-up" style="padding:28px">
        <h3 style="font-size:1.15rem;color:var(--primary-dark);margin-bottom:16px">${icons.creditCard} Select Payment Method</h3>
        
        <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap">
          <button type="button" class="pill active" id="pay-opt-upi" onclick="_selectPayMethod('upi')">UPI / GPay / PhonePe</button>
          <button type="button" class="pill" id="pay-opt-card" onclick="_selectPayMethod('card')">Debit / Credit Card</button>
          <button type="button" class="pill" id="pay-opt-cod" onclick="_selectPayMethod('cod')">Cash on Delivery</button>
        </div>

        <form class="payment-form" onsubmit="_processPayment(event)">
          <div class="input-group"><label>Delivery Email (for invoice & tracking)</label><input id="pay-email" class="input" type="email" value="${state.user?.email||''}" required /></div>
          <div class="input-group"><label>Recipient Name</label><input id="pay-name" class="input" type="text" value="${state.user?.name||''}" required /></div>
          <div class="input-group"><label>Delivery Address</label><input id="pay-addr" class="input" type="text" placeholder="Flat / Street / Landmark / Pincode" value="Flat 402, Green Valley Apartments, Mumbai - 400001" required /></div>

          <div id="payment-fields-area">
            <div class="input-group">
              <label>UPI ID / VPA</label>
              <input id="pay-upi" class="input" type="text" placeholder="yourname@okhdfcbank or yourname@paytm" value="rohan@okaxis" required />
            </div>
          </div>

          <div class="secure-badge">${icons.shield} 100% Safe & Encrypted Payments. Powered by Cake Delight Secure Gateway.</div>
          <button type="submit" class="btn btn-primary" id="pay-btn" style="width:100%;justify-content:center;margin-top:8px;font-size:1.1rem;padding:14px">
            Pay ₹${state.basket.total?.toFixed(0)} & Confirm Order
          </button>
        </form>
      </div>

      <div class="glass-card order-review anim-slide-up" style="animation-delay:100ms;align-self:start;position:sticky;top:88px">
        <h3>Order Items</h3>
        ${state.basket.items.map(i => `
          <div class="review-item" style="display:flex;align-items:center;gap:12px">
            <img src="${cakeImg(i.imageUrl)}" alt="${i.name}" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'" style="width:44px;height:44px;border-radius:10px;object-fit:cover;flex-shrink:0;border:1px solid rgba(139,94,60,0.15)" />
            <span class="name" style="flex:1"><strong>${i.name}</strong> <span style="color:rgba(60,31,10,0.4)">x${i.quantity}</span></span>
            <span class="price" style="font-weight:700">₹${(i.price*i.quantity).toFixed(0)}</span>
          </div>`).join('')}
        <hr class="summary-divider" /><div class="review-item"><span class="name">Delivery Fee</span><span class="price" style="color:#059669">FREE</span></div><hr class="summary-divider" />
        <div class="review-item" style="font-size:1.2rem"><span style="font-weight:700;color:var(--primary-dark)">Amount Payable</span><span style="font-weight:800;color:var(--cta)">₹${state.basket.total?.toFixed(0)}</span></div>
        <button class="btn btn-ghost" onclick="_go('basket')" style="width:100%;justify-content:center;margin-top:16px">Back to Basket</button>
      </div>
    </div>`;
}

window._selectPayMethod = (method) => {
  document.querySelectorAll('#pay-opt-upi, #pay-opt-card, #pay-opt-cod').forEach(el => el.classList.remove('active'));
  document.getElementById(`pay-opt-${method}`)?.classList.add('active');
  const area = document.getElementById('payment-fields-area');
  if (!area) return;

  if (method === 'upi') {
    area.innerHTML = `<div class="input-group"><label>UPI ID / VPA</label><input id="pay-upi" class="input" type="text" placeholder="yourname@okaxis or yourname@paytm" value="rohan@okaxis" required /></div>`;
  } else if (method === 'card') {
    area.innerHTML = `
      <div class="input-group"><label>Card Number (Visa / RuPay / Mastercard)</label><input id="pay-card" class="input" type="text" placeholder="4242 4242 4242 4242" maxlength="19" required oninput="_formatCard(this)" /></div>
      <div class="card-row"><div class="input-group"><label>Expiry</label><input id="pay-exp" class="input" type="text" placeholder="MM/YY" maxlength="5" required oninput="_formatExpiry(this)" /></div><div class="input-group"><label>CVV</label><input id="pay-cvc" class="input" type="text" placeholder="123" maxlength="4" required /></div></div>`;
  } else {
    area.innerHTML = `<div style="padding:12px;background:rgba(245,230,211,0.5);border-radius:10px;font-size:0.9rem;color:var(--primary-dark)">💵 Cash on Delivery chosen. Please keep exact cash of ₹${state.basket.total?.toFixed(0)} ready upon delivery.</div>`;
  }
};

window._formatCard = (el) => { let v = el.value.replace(/\D/g, '').substring(0, 16); el.value = v.replace(/(.{4})/g, '$1 ').trim(); };
window._formatExpiry = (el) => { let v = el.value.replace(/\D/g, '').substring(0, 4); if (v.length > 2) v = v.substring(0, 2) + '/' + v.substring(2); el.value = v; };
window._processPayment = async (e) => {
  e.preventDefault(); const btn = document.getElementById('pay-btn'); btn.disabled = true; btn.innerHTML = 'Connecting to Payment Gateway...';
  await new Promise(r => setTimeout(r, 1200));
  try { await api.apiCheckout(document.getElementById('pay-email').value); state.basket = { items: [], total: 0 }; updateBadge(); go('payment-success'); }
  catch (err) { toast(err.message, 'error'); btn.disabled = false; btn.innerHTML = `${icons.lock} Pay ₹${state.basket.total?.toFixed(0)} & Confirm Order`; }
};

function pagePaymentSuccess() {
  return `
    <div class="empty-state anim-fade">
      <div class="empty-icon" style="background:rgba(5,150,105,0.1);color:#059669">${icons.check}</div>
      <h2 style="color:#059669">Order Confirmed Successfully!</h2>
      <p>Thank you for choosing Cake Delight. Your order has been placed and our chefs have begun preparing your fresh cake.</p>
      <div style="display:flex;gap:12px;justify-content:center;margin-top:24px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="_go('orders')">${icons.package} View My Orders</button>
        <button class="btn btn-secondary" onclick="_go('catalog')">Continue Shopping</button>
      </div>
    </div>`;
}

// ═══════════ ORDERS PAGE ═══════════
function pageOrders() {
  if (!state.token) return authPrompt('Sign in to view your orders');
  setTimeout(loadOrders, 0);
  return `<div id="orders-root"><h1 class="anim-fade" style="font-size:2rem;color:var(--primary-dark);margin-bottom:32px">My Order History</h1><div class="skeleton" style="height:120px"></div><div class="skeleton" style="height:120px;margin-top:12px"></div></div>`;
}

async function loadOrders() {
  const root = document.getElementById('orders-root'); if (!root) return;
  try {
    state.orders = await api.apiGetOrders();
    if (!state.orders.length) { root.innerHTML = emptyState(icons.package, 'No Orders Yet', 'Your order history will appear here after your first delicious order.', 'Browse Cakes', 'catalog'); return; }
    root.innerHTML = `<h1 class="anim-fade" style="font-size:2rem;color:var(--primary-dark);margin-bottom:32px">My Order History</h1><div class="stagger">${state.orders.map((o, i) => `
      <div class="glass-card order-card anim-slide-up" style="animation-delay:${i*80}ms">
        <div class="order-header"><div><div class="order-id">Order #${o._id.slice(-8).toUpperCase()}</div><div class="order-date">${new Date(o.createdAt).toLocaleDateString('en-IN',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div></div><div class="order-right"><span class="tag tag-confirmed">${o.status}</span><span class="order-total" style="font-size:1.25rem;font-weight:800;color:var(--cta)">₹${o.total?.toFixed(0)}</span></div></div>
        <div class="order-items">${o.items.map(it => `<div class="order-item-chip"><strong>${it.name}</strong><span>x${it.quantity}</span><span style="color:var(--primary)">₹${(it.price * it.quantity).toFixed(0)}</span></div>`).join('')}</div>
      </div>`).join('')}</div>`;
  } catch { root.innerHTML = `<div style="text-align:center;padding:60px;color:rgba(60,31,10,0.4)">Unable to load orders</div>`; }
}

// ═══════════ ADMIN: INVENTORY DASHBOARD ═══════════
function pageAdmin() {
  if (!isAdmin()) return authPrompt('Admin access required');
  setTimeout(loadInventory, 0);
  return `
    <div class="anim-fade" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:32px">
      <div><h1 style="font-size:2rem;color:var(--primary-dark)">Bakery Inventory & Catalog</h1><p style="color:rgba(60,31,10,0.45)">Manage cakes, pricing in INR (₹), and live stock</p></div>
      <button class="btn btn-primary" onclick="_go('admin-add')">${icons.plus} Add New Cake</button>
    </div>
    <div id="inventory-root"><div class="skeleton" style="height:400px"></div></div>`;
}

async function loadInventory() {
  const root = document.getElementById('inventory-root'); if (!root) return;
  try {
    const cakes = await api.apiGetAllCakes();
    if (!cakes.length) { root.innerHTML = emptyState(icons.package, 'No Cakes Yet', 'Add your first cake to get started.', 'Add Cake', 'admin-add'); return; }
    root.innerHTML = `
      <div class="glass-card" style="overflow-x:auto;padding:0">
        <table class="admin-table">
          <thead><tr><th>Image</th><th>Cake Details</th><th>Category</th><th>Price (₹)</th><th>Stock Units</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${cakes.map(c => `
            <tr>
              <td><img src="${cakeImg(c.imageUrl)}" alt="${c.name}" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'" style="width:60px;height:60px;object-fit:cover;border-radius:10px" /></td>
              <td><strong>${c.name}</strong><br><span style="font-size:0.8rem;color:rgba(60,31,10,0.5)">${c.weight || '500g'} | ${c.eggless !== false ? 'Eggless' : 'Contains Egg'}</span></td>
              <td><span class="tag tag-category">${c.category || '-'}</span></td>
              <td><strong>₹${c.price}</strong></td>
              <td>
                <div class="qty-row" style="justify-content:center">
                  <button class="qty-btn" onclick="_adjustStock('${c._id}', ${Math.max(0,c.quantity-1)})">${icons.minus}</button>
                  <span class="qty-val">${c.quantity}</span>
                  <button class="qty-btn" onclick="_adjustStock('${c._id}', ${c.quantity+1})">${icons.plus}</button>
                </div>
              </td>
              <td>${stockBadge(c.quantity)}</td>
              <td>
                <div style="display:flex;gap:8px;justify-content:center;align-items:center">
                  <button class="btn btn-sm" onclick="_editCake('${c._id}')" style="background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE;font-weight:600;padding:6px 12px;display:inline-flex;align-items:center;gap:6px;border-radius:8px;cursor:pointer" title="Edit product details, price, quantity & image">
                    ${icons.edit} <span>Edit</span>
                  </button>
                  <button class="btn btn-sm" onclick="_deleteCake('${c._id}','${c.name.replace(/'/g,"\\'")}')" style="background:#FEE2E2;color:#991B1B;border:1px solid #FCA5A5;font-weight:600;padding:6px 12px;display:inline-flex;align-items:center;gap:6px;border-radius:8px;cursor:pointer" title="Delete product from database">
                    ${icons.trash} <span>Delete</span>
                  </button>
                </div>
              </td>
            </tr>`).join('')}</tbody>
        </table>
      </div>`;
  } catch (e) { root.innerHTML = `<div style="text-align:center;padding:60px;color:rgba(60,31,10,0.4)">Unable to load inventory: ${e.message}</div>`; }
}

window._adjustStock = async (id, qty) => {
  try { await api.apiUpdateStock(id, qty); toast('Stock updated'); loadInventory(); } catch (e) { toast(e.message, 'error'); }
};

window._editCake = async (id) => {
  try { state.editCake = await api.apiGetCake(id); go('admin-edit'); } catch (e) { toast(e.message, 'error'); }
};

window._deleteCake = (id, name) => {
  showModal(`
    <h2 class="modal-title">Delete Cake</h2>
    <p style="color:rgba(60,31,10,0.55);margin-bottom:24px">Are you sure you want to delete <strong>"${name}"</strong> from catalog?</p>
    <div style="display:flex;gap:12px">
      <button class="btn btn-ghost" onclick="closeModal()" style="flex:1;justify-content:center">Cancel</button>
      <button class="btn btn-primary" onclick="_confirmDelete('${id}')" style="flex:1;justify-content:center;background:#991B1B">${icons.trash} Delete</button>
    </div>
  `);
};

window._confirmDelete = async (id) => {
  try { await api.apiDeleteCake(id); closeModal(); toast('Cake deleted'); go('admin'); } catch (e) { toast(e.message, 'error'); }
};

// ═══════════ ADMIN: ADD/EDIT CAKE FORM ═══════════
function pageAdminForm(isEdit = false) {
  if (!isAdmin()) return authPrompt('Admin access required');
  const c = isEdit ? state.editCake : {};
  return `
    <div class="anim-fade" style="max-width:720px;margin:0 auto">
      <button class="btn btn-ghost" onclick="_go('admin')" style="margin-bottom:16px">← Back to Inventory</button>
      <div class="glass-card" style="padding:32px">
        <h2 style="font-size:1.5rem;color:var(--primary-dark);margin-bottom:24px">${isEdit ? 'Edit Cake Details' : 'Add New Cake to Bakery'}</h2>
        <form onsubmit="_saveCake(event, ${isEdit ? `'${c._id}'` : 'null'})" class="payment-form">
          <div class="input-group"><label>Cake Name *</label><input id="ck-name" class="input" type="text" value="${c.name||''}" required placeholder="e.g. Royal Rasmalai Fusion Cake" /></div>
          <div class="input-group"><label>Description</label><textarea id="ck-desc" class="input" rows="3" placeholder="Describe flavour, sponge, and toppings...">${c.description||''}</textarea></div>
          
          <div class="card-row">
            <div class="input-group"><label>Category</label>
              <select id="ck-cat" class="input">
                ${['Chocolate','Fusion','Fruit','Birthday','Wedding','Cupcake','Other'].map(cat => `<option value="${cat}" ${c.category===cat?'selected':''}>${cat}</option>`).join('')}
              </select>
            </div>
            <div class="input-group"><label>Price (₹ INR) *</label><input id="ck-price" class="input" type="number" min="0" value="${c.price||''}" placeholder="e.g. 499" required /></div>
          </div>

          <div class="card-row">
            <div class="input-group"><label>Weight / Size</label><input id="ck-weight" class="input" type="text" value="${c.weight||'500g'}" placeholder="e.g. 500g or 1 Kg" /></div>
            <div class="input-group"><label>Dietary Type</label>
              <select id="ck-eggless" class="input">
                <option value="true" ${c.eggless!==false?'selected':''}>100% Eggless</option>
                <option value="false" ${c.eggless===false?'selected':''}>Contains Egg</option>
              </select>
            </div>
          </div>

          <div class="card-row">
            <div class="input-group"><label>Quantity in Stock *</label><input id="ck-qty" class="input" type="number" min="0" value="${c.quantity!==undefined?c.quantity:20}" required /></div>
            <div class="input-group"><label>Flavour Profile</label><input id="ck-flavour" class="input" type="text" value="${c.flavour||''}" placeholder="e.g. Cardamom Saffron Cream" /></div>
          </div>

          <div class="input-group">
            <label>Product Image (Upload File OR Enter Web URL)</label>
            <div id="upload-zone" class="upload-zone" onclick="document.getElementById('ck-image').click()">
              <input id="ck-image" type="file" accept="image/*" style="display:none" onchange="_previewImage(this)" />
              <div id="upload-preview">
                ${c.imageUrl ? `<img src="${cakeImg(c.imageUrl)}" alt="Preview" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'" style="max-height:180px;border-radius:12px" />` : `
                  <div style="color:var(--primary);margin-bottom:8px">${icons.plus}</div>
                  <p style="font-weight:600;color:var(--primary-dark)">Click to upload cake photo</p>
                  <p style="font-size:0.8rem;color:rgba(60,31,10,0.4)">JPEG, PNG, WebP — Saved directly in MongoDB</p>
                `}
              </div>
            </div>
          </div>
          <div class="input-group">
            <label>Or External Image URL</label>
            <input id="ck-imgurl" class="input" type="url" value="${c.imageUrl?.startsWith('http') ? c.imageUrl : ''}" placeholder="https://images.unsplash.com/photo-..." oninput="_previewUrl(this.value)" />
          </div>
          <button type="submit" class="btn btn-primary" id="save-btn" style="width:100%;justify-content:center;margin-top:8px;font-size:1rem;padding:14px">
            ${icons.check} ${isEdit ? 'Save Changes' : 'Add Cake to Store'}
          </button>
        </form>
      </div>
    </div>`;
}

window._previewImage = (input) => {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('upload-preview').innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-height:180px;border-radius:12px" />`;
  };
  reader.readAsDataURL(file);
};

window._previewUrl = (url) => {
  if (!url || !url.startsWith('http')) return;
  document.getElementById('upload-preview').innerHTML = `<img src="${url}" alt="Preview" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'" style="max-height:180px;border-radius:12px" />`;
};

window._saveCake = async (e, id) => {
  e.preventDefault();
  const btn = document.getElementById('save-btn'); btn.disabled = true; btn.textContent = 'Saving to Database...';

  const fd = new FormData();
  fd.append('name', document.getElementById('ck-name').value);
  fd.append('description', document.getElementById('ck-desc').value);
  fd.append('category', document.getElementById('ck-cat').value);
  fd.append('price', document.getElementById('ck-price').value);
  fd.append('quantity', document.getElementById('ck-qty').value);
  fd.append('weight', document.getElementById('ck-weight').value);
  fd.append('eggless', document.getElementById('ck-eggless').value);
  fd.append('flavour', document.getElementById('ck-flavour').value);

  const imageInput = document.getElementById('ck-image');
  const urlInput = document.getElementById('ck-imgurl');

  if (imageInput.files[0]) {
    fd.append('image', imageInput.files[0]);
  } else if (urlInput?.value?.trim()) {
    fd.append('imageUrl', urlInput.value.trim());
  } else if (id && state.editCake?.imageUrl) {
    fd.append('imageUrl', state.editCake.imageUrl);
  }

  try {
    if (id) { await api.apiUpdateCake(id, fd); toast('Cake updated in database!'); }
    else { await api.apiCreateCake(fd); toast('Cake saved to database!'); }
    go('admin');
  } catch (err) {
    toast(err.message, 'error'); btn.disabled = false; btn.textContent = id ? 'Save Changes' : 'Add Cake';
  }
};

// ═══════════ SHARED UI ═══════════
function emptyState(ic, title, desc, btnText, btnPage) {
  return `<div class="empty-state anim-fade"><div class="empty-icon">${ic}</div><h2>${title}</h2><p>${desc}</p><button class="btn btn-primary" onclick="_go('${btnPage}')">${btnText}</button></div>`;
}
function authPrompt(msg) {
  return `<div class="empty-state anim-fade"><div class="empty-icon">${icons.user}</div><h2>${msg}</h2><p>Create an account or sign in to continue.</p><button class="btn btn-primary" onclick="_showAuth('login')">Sign In</button></div>`;
}

// ═══════════ INIT ═══════════
render();
if (state.token) loadBasket();
