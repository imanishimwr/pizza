/**
 * API client.
 *
 * Rules this module enforces, so no caller has to remember them:
 *   - A failing request THROWS. It never returns an empty array, a cached copy
 *     or a hardcoded fixture and lets the UI render that as if it were real.
 *   - The bearer token is attached centrally from the stored session, so no
 *     call site can forget it.
 *   - Server error messages are surfaced verbatim; 5xx messages are written for
 *     end users by the server and are safe to display.
 */

const _apiBaseRaw = import.meta.env.VITE_API_BASE_URL;
if (!_apiBaseRaw) {
  console.warn(
    '[apiService] VITE_API_BASE_URL is not set. ' +
    'Falling back to relative /api (works locally via Vite proxy, ' +
    'but WILL break in production). Add it to your .env file.'
  );
}
const API_BASE_URL = (_apiBaseRaw || '/api').replace(/\/$/, '');

const TOKEN_KEY = 'hotpot_token_v1';
const USER_KEY = 'hotpot_user_v1';
const CART_KEY = 'hotpot_cart_v1';
const WISHLIST_KEY = 'hotpot_wishlist_v1';
const TRACKED_ORDER_KEY = 'hotpot_tracked_order_id_v1';

const STORAGE_KEYS = { TOKEN_KEY, USER_KEY, CART_KEY, WISHLIST_KEY, TRACKED_ORDER_KEY };

/** Notified whenever the server rejects our token, so the app can sign out. */
const authListeners = new Set();
const notifyAuthLost = () => {
  for (const fn of authListeners) {
    try {
      fn();
    } catch (err) {
      console.error('[auth] listener failed', err);
    }
  }
};
export const onAuthLost = (fn) => {
  authListeners.add(fn);
  return () => authListeners.delete(fn);
};

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------
function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    // A corrupt entry is worse than none — drop it so it cannot break every read.
    try {
      localStorage.removeItem(key);
    } catch {
      /* storage disabled (private mode) — nothing to clean up */
    }
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`[storage] could not write ${key}`, err);
  }
}

export const session = {
  getToken: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  getUser: () => readJSON(USER_KEY, null),
  set({ token, user }) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch (err) {
      console.error('[storage] could not store token', err);
    }
    writeJSON(USER_KEY, user);
  },
  updateUser(user) {
    writeJSON(USER_KEY, user);
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage disabled */
    }
    writeJSON(USER_KEY, null);
  },
  isAuthenticated() {
    return Boolean(session.getToken());
  },
  role() {
    const user = session.getUser();
    return user?.role ? normalizeRole(user.role) : null;
  }
};

export const ROLES = {
  USER: 'customer',
  ADMIN: 'admin',
  KITCHEN: 'kitchen',
  RIDER: 'delivery'
};

export function normalizeRole(role) {
  const r = String(role || '').toLowerCase().trim();
  if (r === 'admin') return 'admin';
  if (r === 'kitchen') return 'kitchen';
  if (r === 'delivery' || r === 'rider') return 'delivery';
  return 'customer';
}

export function hasRole(user, allowedRoles = []) {
  if (!user) return false;
  const userRole = normalizeRole(user.role);
  const normalizedAllowed = allowedRoles.map((r) => normalizeRole(r));
  return normalizedAllowed.includes(userRole);
}

// ---------------------------------------------------------------------------
// Core request helper
// ---------------------------------------------------------------------------
export class ApiError extends Error {
  constructor(message, { status = 0, body = null, cause = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.cause = cause;
  }
}

/** Thrown when the caller explicitly opted into a cached read. */
export class OfflineError extends ApiError {
  constructor(message, cause) {
    super(message, { cause });
    this.name = 'OfflineError';
  }
}

async function request(path, { method = 'GET', body, auth = true, signal } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (auth) {
    const token = session.getToken();
    if (!token) throw new ApiError('Please sign in to continue.', { status: 401 });
    headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    // A network failure is not an empty dataset. Say so.
    throw new ApiError('Cannot reach the server. Check your connection and try again.', { cause: err });
  }

  const isJSON = res.headers.get('content-type')?.includes('application/json');
  const payload = isJSON ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    // 401 means the session is gone. Drop it so the UI stops pretending to be
    // signed in instead of failing one request at a time.
    if (res.status === 401) {
      session.clear();
      notifyAuthLost();
    }
    throw new ApiError(payload?.error || `Request failed (${res.status}).`, { status: res.status, body: payload });
  }

  return payload;
}

const qs = (params) => {
  const entries = Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return entries.length ? `?${new URLSearchParams(entries)}` : '';
};

// ---------------------------------------------------------------------------
// Menu — IndexedDB-backed cache (survives page refresh) + in-memory L1 cache
// ---------------------------------------------------------------------------

const IDB_NAME = 'hotpot_cache';
const IDB_STORE = 'meals';
const IDB_KEY = 'menu';
const MEALS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/** Open (or reuse) the IndexedDB database. */
function openCacheDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

/** Read the cached meals record from IndexedDB. Returns null if missing. */
async function idbRead() {
  try {
    const db = await openCacheDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/** Persist a meals array to IndexedDB with a timestamp. */
async function idbWrite(data) {
  try {
    const db = await openCacheDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put({ data, ts: Date.now() }, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Non-critical — silently ignore IDB write failures
  }
}

/** Clear the meals record from IndexedDB. */
async function idbClear() {
  try {
    const db = await openCacheDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}

// L1: in-memory cache (instant within the same tab session)
let _mealsL1 = null;
let _mealsL1Ts = 0;

export async function clearMealsCache() {
  _mealsL1 = null;
  _mealsL1Ts = 0;
  await idbClear();
}

/**
 * getMeals — stale-while-revalidate strategy:
 *   1. If the L1 in-memory cache is fresh  → return instantly (0 ms).
 *   2. Else if IndexedDB has a fresh entry  → return from IDB, revalidate in background if near expiry.
 *   3. Else fetch from network, store in both IDB and L1.
 */
export const getMeals = async ({ signal, forceRefresh = false } = {}) => {
  const now = Date.now();

  // L1 hit
  if (!forceRefresh && _mealsL1 && (now - _mealsL1Ts < MEALS_CACHE_TTL)) {
    return _mealsL1;
  }

  // L2: IndexedDB hit
  if (!forceRefresh) {
    const cached = await idbRead();
    if (cached && (now - cached.ts < MEALS_CACHE_TTL)) {
      // Populate L1
      _mealsL1 = cached.data;
      _mealsL1Ts = cached.ts;

      // Background revalidate if past half-life (5 min)
      if (now - cached.ts > MEALS_CACHE_TTL / 2) {
        request('/meals', { auth: false }).then((fresh) => {
          const arr = Array.isArray(fresh) ? fresh : [];
          _mealsL1 = arr;
          _mealsL1Ts = Date.now();
          idbWrite(arr);
        }).catch(() => {});
      }

      return _mealsL1;
    }
  }

  // Cache miss or force refresh — fetch from network
  const fresh = await request('/meals', { auth: false, signal });
  const arr = Array.isArray(fresh) ? fresh : [];
  _mealsL1 = arr;
  _mealsL1Ts = Date.now();
  idbWrite(arr); // persist to IndexedDB async (non-blocking)
  return _mealsL1;
};


export const createMeal = async (meal) => {
  clearMealsCache();
  return request('/meals', { method: 'POST', body: meal });
};

export const updateMeal = async (id, meal) => {
  clearMealsCache();
  return request(`/meals/${encodeURIComponent(String(id))}`, { method: 'PATCH', body: meal });
};

export const deleteMeal = async (id) => {
  clearMealsCache();
  return request(`/meals/${encodeURIComponent(String(id))}`, { method: 'DELETE' });
};

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
/** Customers receive only their own orders; staff receive the book. Enforced server-side. */
export const getOrders = ({ limit, statuses, signal } = {}) =>
  request(`/orders${qs({ limit, status: Array.isArray(statuses) ? statuses.join(',') : statuses })}`, { signal });

export const getOrder = (id) => request(`/orders/${encodeURIComponent(id)}`);

export const createOrder = (order) => request('/orders', { method: 'POST', body: order });

export const updateOrderStatus = (id, status, extra = {}) =>
  request(`/orders/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { status, ...extra } });

export const updateOrderNotes = (id, notes) =>
  request(`/orders/${encodeURIComponent(id)}/notes`, { method: 'PATCH', body: { notes } });

export const cancelOrder = (id) => request(`/orders/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const deleteOrder = (id) =>
  request(`/orders/${encodeURIComponent(id)}?permanent=true`, { method: 'DELETE' });

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------
export const getRiders = () => request('/riders');

export const createRider = (rider) => request('/riders', { method: 'POST', body: rider });

export const updateRider = (id, patch) => request(`/riders/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch });

export const setRiderAvailability = (id, isAvailable) =>
  request(`/riders/${encodeURIComponent(id)}/availability`, { method: 'PATCH', body: { is_available: isAvailable } });

export const getRiderLocations = () => request('/riders/live-gps');

export const assignRider = (orderId, riderId) =>
  request(`/orders/${encodeURIComponent(orderId)}/assign-rider`, { method: 'POST', body: { riderId } });

export const reassignRider = (orderId, newRiderId) =>
  request(`/orders/${encodeURIComponent(orderId)}/reassign-rider`, { method: 'POST', body: { newRiderId } });

/** The rider types in the code the customer gave them. A blank code fails. */
export const verifyHandover = (orderId, verificationPin, riderId) =>
  request(`/orders/${encodeURIComponent(orderId)}/handover-pickup`, {
    method: 'POST',
    body: { verificationPin, riderId }
  });

export const completeDelivery = (orderId, riderId) =>
  request(`/orders/${encodeURIComponent(orderId)}/complete`, { method: 'POST', body: { riderId } });

export const reportRiderLocation = (orderId, telemetry) =>
  request(`/orders/${encodeURIComponent(orderId)}/location`, { method: 'POST', body: telemetry });

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------
export const getReviews = () => request('/reviews');

/** The server rejects this unless the order is delivered and owned by the caller. */
export const submitReview = (review) => request('/reviews', { method: 'POST', body: review });

// ---------------------------------------------------------------------------
// Vouchers
// ---------------------------------------------------------------------------
export const validateVoucher = (code) => request('/vouchers/validate', { method: 'POST', body: { code } });

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
export const getAdminAnalytics = () => request('/admin/analytics');

export const getAdminUsers = () => request('/admin/users');

export const setUserRole = (id, role) => request(`/admin/users/${encodeURIComponent(id)}/role`, { method: 'PATCH', body: { role } });

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export async function register({ name, email, phone, password }) {
  // `role` is not sent and is not accepted server-side: self-registration can
  // only ever create a customer.
  const data = await request('/auth/register', { method: 'POST', auth: false, body: { name, email, phone, password } });
  session.set(data);
  return data.user;
}

export async function login({ email, password }) {
  const data = await request('/auth/login', { method: 'POST', auth: false, body: { email, password } });
  session.set(data);
  return data.user;
}

export async function loginWithGoogle(idToken) {
  const data = await request('/auth/google', { method: 'POST', auth: false, body: { idToken } });
  session.set(data);
  return data.user;
}

/** Re-checks the stored token against the server and refreshes the user record. */
export async function refreshSession() {
  if (!session.isAuthenticated()) return null;
  const { user } = await request('/auth/me');
  session.updateUser(user);
  return user;
}

export async function updateProfile(patch) {
  const { user } = await request('/auth/me', { method: 'PATCH', body: patch });
  session.updateUser(user);
  return user;
}

export const logout = () => session.clear();

// ---------------------------------------------------------------------------
// Purely local UI state (no server involvement)
// ---------------------------------------------------------------------------
export const cart = {
  get: () => readJSON(CART_KEY, []),
  set: (value) => writeJSON(CART_KEY, Array.isArray(value) ? value : []),
  clear: () => writeJSON(CART_KEY, [])
};

export const wishlist = {
  get: () => readJSON(WISHLIST_KEY, []),
  set: (value) => writeJSON(WISHLIST_KEY, Array.isArray(value) ? value : [])
};

export const trackedOrder = {
  get: () => {
    try {
      return localStorage.getItem(TRACKED_ORDER_KEY);
    } catch {
      return null;
    }
  },
  set: (id) => {
    try {
      if (id) localStorage.setItem(TRACKED_ORDER_KEY, id);
      else localStorage.removeItem(TRACKED_ORDER_KEY);
    } catch (err) {
      console.error('[storage] could not save tracked order id', err);
    }
  }
};

export const assignManualRider = (orderId, riderData) =>
  request(`/orders/${encodeURIComponent(orderId)}/assign-manual-rider`, {
    method: 'POST',
    body: riderData
  });

export const apiService = {
  getUser: () => session.getUser(),
  getToken: () => session.getToken(),
  getCart: () => cart.get(),
  setCart: (v) => cart.set(v),
  getWishlist: () => wishlist.get(),
  saveWishlist: (v) => wishlist.set(v),
  getTrackedOrderId: () => trackedOrder.get(),
  setTrackedOrderId: (id) => trackedOrder.set(id),
  getMeals,
  createMeal,
  updateMeal,
  deleteMeal,
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  updateOrderNotes,
  cancelOrder,
  deleteOrder,
  getRiders,
  createRider,
  updateRider,
  setRiderAvailability,
  getRiderLocations,
  assignRider,
  assignRiderToOrder: assignRider,
  assignManualRiderToOrder: assignManualRider,
  reassignRider,
  verifyHandover,
  verifyHandoverPickup: verifyHandover,
  completeDelivery,
  reportRiderLocation,
  getReviews,
  submitReview,
  validateVoucher,
  getAdminAnalytics,
  getAdminUsers,
  setUserRole,
  register,
  login,
  loginWithGoogle,
  logout
};

export { STORAGE_KEYS, API_BASE_URL };

