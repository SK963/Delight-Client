// API client – all communication with the API Gateway

const API = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, ''); // empty = same origin (dev proxy), or remote gateway URL (production)

function getToken() { return localStorage.getItem('cd_token'); }

function headers() {
  const h = { 'Content-Type': 'application/json' };
  const t = getToken();
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}

async function request(method, path, body) {
  const opts = { method, headers: headers() };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Request failed (${res.status})`);
  return data;
}

// ── Auth ────────────────────────────────────────────────
export async function apiRegister(email, password, name) {
  return request('POST', '/api/auth/register', { email, password, name });
}

export async function apiLogin(email, password) {
  return request('POST', '/api/auth/login', { email, password });
}

// ── Catalog ─────────────────────────────────────────────
export async function apiGetCakes(filters = {}) {
  const p = new URLSearchParams();
  if (filters.name) p.set('name', filters.name);
  if (filters.category && filters.category !== 'All') p.set('category', filters.category);
  const qs = p.toString();
  return request('GET', `/api/cakes${qs ? '?' + qs : ''}`);
}

export async function apiGetCake(id) {
  return request('GET', `/api/cakes/${id}`);
}

// ── Basket ──────────────────────────────────────────────
export async function apiGetBasket() {
  return request('GET', '/api/basket');
}

export async function apiAddToBasket(cakeId, quantity = 1) {
  return request('POST', '/api/basket/items', { cakeId, quantity });
}

export async function apiUpdateBasketItem(cakeId, quantity) {
  return request('PATCH', `/api/basket/items/${cakeId}`, { quantity });
}

export async function apiRemoveBasketItem(cakeId) {
  return request('DELETE', `/api/basket/items/${cakeId}`);
}

// ── Orders ──────────────────────────────────────────────
export async function apiCheckout(email) {
  return request('POST', '/api/orders/checkout', { customerEmail: email });
}

export async function apiGetOrders() {
  return request('GET', '/api/orders');
}

// ── Ratings ─────────────────────────────────────────────
export async function apiGetRatingSummary(cakeId) {
  return request('GET', `/api/cakes/${cakeId}/ratings/summary`);
}

export async function apiGetRatings(cakeId) {
  return request('GET', `/api/cakes/${cakeId}/ratings`);
}

export async function apiSubmitRating(cakeId, score, comment, customerName) {
  return request('POST', `/api/cakes/${cakeId}/ratings`, { score, comment, customerName });
}

// ── Notifications ───────────────────────────────────────
export async function apiGetNotifications() {
  return request('GET', '/api/notifications');
}

// ── Admin: Catalog CRUD ─────────────────────────────────
export async function apiGetAllCakes() {
  return request('GET', '/api/cakes?showAll=true');
}

export async function apiCreateCake(formData) {
  const opts = {
    method: 'POST',
    headers: {},
    body: formData  // FormData (multipart) – browser sets Content-Type automatically
  };
  const t = getToken();
  if (t) opts.headers['Authorization'] = `Bearer ${t}`;
  const res = await fetch('/api/cakes', opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Failed to create cake');
  return data;
}

export async function apiUpdateCake(id, formData) {
  const opts = {
    method: 'PUT',
    headers: {},
    body: formData
  };
  const t = getToken();
  if (t) opts.headers['Authorization'] = `Bearer ${t}`;
  const res = await fetch(`/api/cakes/${id}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Failed to update cake');
  return data;
}

export async function apiDeleteCake(id) {
  return request('DELETE', `/api/cakes/${id}`);
}

export async function apiUpdateStock(id, quantity) {
  return request('PATCH', `/api/cakes/${id}/stock`, { quantity });
}
