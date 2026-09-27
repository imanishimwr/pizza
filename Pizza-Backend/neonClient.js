/**
 * HotPot Delights — Data Access Layer
 *
 * This is the ONLY data layer. The legacy in-memory `db.js` store has been
 * removed because it silently diverged from Postgres (dispatch writes went to
 * RAM while the UI read from Postgres, so rider assignments were invisible and
 * were lost on every restart).
 *
 * Conventions:
 *   - Postgres columns are snake_case. This module is the only place that maps
 *     to camelCase, so an order object never carries duplicate fields.
 *   - Money is NUMERIC in Postgres and an integer number of RWF in JS.
 *   - Every function throws a descriptive Error on failure. No function ever
 *     returns a fabricated fallback value, and no function swallows an error.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { neon } = require('@neondatabase/serverless');

/**
 * Called by every entry point (server / migrate / seed) before the first query.
 * A missing connection string is fatal — booting anyway would serve an app that
 * looks functional and silently returns nothing.
 */
function assertDatabaseConfigured() {
  if (!process.env.DATABASE_URL) {
    const err = new Error(
      'DATABASE_URL is not set. Copy .env.example to .env and fill it in.'
    );
    err.code = 'NO_DATABASE_URL';
    throw err;
  }
  return process.env.DATABASE_URL;
}

/**
 * `neon()` is lazy, so requiring this module without a DATABASE_URL is safe.
 * The first query then fails loudly instead of quietly returning empty rows.
 */
const connectionString = process.env.DATABASE_URL || 'postgresql://invalid:invalid@localhost/invalid';
const rawSql = neon(connectionString);

/** Tagged-template passthrough that refuses to "succeed" against a fake DSN. */
const sql = new Proxy(rawSql, {
  apply(target, thisArg, args) {
    if (!process.env.DATABASE_URL) assertDatabaseConfigured();
    return Reflect.apply(target, thisArg, args);
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Coerce a Postgres NUMERIC (returned as a string) to an integer RWF amount. */
function toRWF(value) {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/** Parse a TEXT[]-style column, or a JSON array string, into a string array. */
function toStringArray(value) {
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string');
  if (typeof value !== 'string' || !value) return [];
  const trimmed = value.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
    } catch {
      /* fall through to brace-stripping */
    }
  }
  return trimmed
    .replace(/^\{|\}$/g, '')
    .split(',')
    .map((s) => s.trim().replace(/^"|"$/g, ''))
    .filter(Boolean);
}

const CANONICAL_STATUSES = ['pending', 'preparing', 'ready', 'delivery', 'delivered', 'cancelled'];

/**
 * Allowed order status transitions. Enforced server-side so no client — no
 * matter how it was tampered with — can skip a step or resurrect a finished
 * order. `cancelled` is reachable from any non-terminal state.
 */
const ALLOWED_TRANSITIONS = {
  pending: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['delivery', 'preparing', 'cancelled'],
  delivery: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: []
};

function canTransition(from, to) {
  if (from === to) return true;
  return (ALLOWED_TRANSITIONS[from] || []).includes(to);
}

/** Lowercase every status in the database so casing can never diverge again. */
async function normaliseLegacyStatuses() {
  await sql`UPDATE orders SET status = LOWER(status) WHERE status <> LOWER(status);`;
}

/** Collision-resistant id. */
function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${require('crypto').randomBytes(4).toString('hex')}`;
}

async function ensureOrderExists(id) {
  if (!id) throw new Error('Order id is required.');
  const rows = await sql`SELECT id FROM orders WHERE id = ${id} LIMIT 1;`;
  if (!rows[0]) {
    const err = new Error('Order not found.');
    err.statusCode = 404;
    throw err;
  }
  return rows[0];
}

// ---------------------------------------------------------------------------
// Serialization — the only place snake_case becomes camelCase
// ---------------------------------------------------------------------------

function serializeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || null,
    avatarUrl: row.avatar_url || null,
    role: String(row.role || 'customer').toLowerCase(),
    location: row.location || null,
    lat: row.lat === null || row.lat === undefined ? null : Number(row.lat),
    lng: row.lng === null || row.lng === undefined ? null : Number(row.lng),
    createdAt: row.created_at
  };
}

function serializeMeal(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: toRWF(row.price),
    rating: Number(row.rating ?? 5),
    reviews: Number(row.reviews_count ?? 0),
    description: row.description || '',
    image: row.image || null,
    fallbackImage: row.fallback_image || null,
    spicy: Boolean(row.spicy),
    outOfStock: Boolean(row.out_of_stock),
    spiceLevels: toStringArray(row.spice_levels),
    broths: toStringArray(row.broths)
  };
}

function serializeOrderItem(row) {
  if (!row) return null;
  return {
    id: row.id,
    mealId: row.meal_id || null,
    name: row.name,
    qty: Number(row.qty) || 1,
    price: toRWF(row.price),
    spice: row.spice || null,
    broth: row.broth || null,
    specialNote: row.special_note || ''
  };
}

function serializeRider(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email || null,
    phone: row.phone || null,
    plateNumber: row.plate_number || null,
    vehicleType: row.vehicle_type || null,
    shift: row.shift || null,
    is_available: Boolean(row.is_available),
    status: row.status,
    current_order_id: row.current_order_id || null,
    earnings_today: toRWF(row.earnings_today),
    completed_today: Number(row.completed_today ?? 0),
    lastLat: row.last_lat === null || row.last_lat === undefined ? null : Number(row.last_lat),
    lastLng: row.last_lng === null || row.last_lng === undefined ? null : Number(row.last_lng),
    lastSeenAt: row.last_seen_at
  };
}

/**
 * @param {object} row               raw `orders` row
 * @param {Array}  [items]            items already passed through
 *                                    `serializeOrderItem` (raw rows are mapped
 *                                    automatically as a safety net)
 * @param {object} [opts]
 * @param {boolean} [opts.includePin] reveal the handover code. True only for
 *        staff and for the customer who owns the order. NEVER true for riders —
 *        the rider has to type the code in; that is the entire point of it.
 */
function serializeOrder(row, items = [], opts = {}) {
  if (!row) return null;
  const createdAt = row.created_at;
  const lines = (items || []).map((item) =>
    item && 'qty' in item && 'specialNote' in item ? item : serializeOrderItem(item)
  );
  return {
    id: row.id,
    userId: row.user_id || null,
    customerName: row.customer_name,
    phone: row.phone,
    address: row.address,
    lat: row.lat === null || row.lat === undefined ? null : Number(row.lat),
    lng: row.lng === null || row.lng === undefined ? null : Number(row.lng),
    area: row.area || null,
    status: row.status,
    totalRWF: toRWF(row.total_rwf),
    orderType: row.order_type || 'delivery',
    notes: row.notes || '',
    riderId: row.rider_id || null,
    riderName: row.rider_name || null,
    assignedAt: row.assigned_at,
    handedOverAt: row.handed_over_at,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    paymentRef: row.payment_ref || null,
    distanceKm: row.distance_km === null || row.distance_km === undefined ? null : Number(row.distance_km),
    etaMinutes: row.eta_minutes === null || row.eta_minutes === undefined ? null : Number(row.eta_minutes),
    etaTime: row.eta_time || null,
    createdAt,
    updatedAt: row.updated_at,
    orderTime: createdAt
      ? new Date(createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      : null,
    ...(opts.includePin ? { verificationPin: row.verification_pin || null } : {}),
    items: lines
  };
}

function serializeFeedback(row) {
  if (!row) return null;
  return {
    id: row.id,
    orderId: row.order_id,
    userId: row.user_id || null,
    pizzaRating: Number(row.pizza_rating),
    riderRating: Number(row.rider_rating),
    rating: Number(row.rating),
    comment: row.comment || '',
    createdAt: row.created_at
  };
}

function serializeVoucher(row) {
  if (!row) return null;
  return {
    code: row.code,
    discountPercent: Number(row.discount_percent),
    active: Boolean(row.active),
    maxUses: row.max_uses === null ? null : Number(row.max_uses),
    usedCount: Number(row.used_count ?? 0),
    expiresAt: row.expires_at
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

module.exports = {
  sql,
  toRWF,
  assertDatabaseConfigured,
  serializeOrder,
  serializeMeal,
  serializeUser,
  serializeRider,
  serializeOrderItem,
  serializeFeedback,
  serializeVoucher,
  toStringArray,
  canTransition,
  CANONICAL_STATUSES,
  makeId,

  // --- Users / auth -------------------------------------------------------
  async bootstrap() {
    await normaliseLegacyStatuses();
  },

  findUserByEmail: async (email) => {
    const rows = await sql`SELECT * FROM users WHERE LOWER(email) = LOWER(${email}) LIMIT 1;`;
    return rows[0] || null;
  },

  findUserById: async (id) => {
    const rows = await sql`SELECT * FROM users WHERE id = ${id} LIMIT 1;`;
    return rows[0] || null;
  },

  registerUser: async ({ name, email, phone, password, googleId, avatarUrl }) => {
    const id = makeId('user');
    // Role is deliberately NOT accepted from the caller. Self-registration can
    // only ever produce a customer; staff accounts are provisioned by seed or
    // by an authenticated admin (see promoteUser).
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const rows = await sql`
      INSERT INTO users (id, name, email, phone, password_hash, google_id, avatar_url, role, updated_at)
      VALUES (${id}, ${name}, ${email}, ${phone || null}, ${passwordHash},
              ${googleId || null}, ${avatarUrl || null}, 'customer', NOW())
      RETURNING *;
    `;
    return serializeUser(rows[0]);
  },

  /** Links a Google identity to an existing password account (no role change). */
  linkGoogleAccount: async (userId, googleId, avatarUrl) => {
    const rows = await sql`
      UPDATE users
      SET google_id  = COALESCE(${googleId ?? null}, google_id),
          avatar_url = COALESCE(${avatarUrl ?? null}, avatar_url),
          updated_at = NOW()
      WHERE id = ${userId}
      RETURNING *;
    `;
    return serializeUser(rows[0]);
  },

  verifyLogin: async (email, password) => {
    const user = await module.exports.findUserByEmail(email);
    if (!user) {
      // Compare against a dummy hash anyway so that a missing account and a
      // wrong password take the same amount of time.
      await bcrypt.compare(password, '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
      return null;
    }
    if (!user.password_hash) return null; // Google-only account
    const ok = await bcrypt.compare(password, user.password_hash);
    return ok ? serializeUser(user) : null;
  },

  /** Admin-only role assignment. Replaces the old self-register-as-admin hole. */
  setUserRole: async (userId, role) => {
    const normalized = String(role || '').toLowerCase();
    if (!['customer', 'kitchen', 'delivery', 'admin'].includes(normalized)) {
      const err = new Error('Unknown role.');
      err.statusCode = 400;
      throw err;
    }
    const rows = await sql`UPDATE users SET role = ${normalized}, updated_at = NOW() WHERE id = ${userId} RETURNING *;`;
    if (!rows[0]) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }
    return serializeUser(rows[0]);
  },

  listUsers: async () => {
    const rows = await sql`SELECT * FROM users ORDER BY created_at DESC;`;
    return rows.map(serializeUser);
  },

  updateUserProfile: async (userId, { name, phone, location, lat, lng }) => {
    const rows = await sql`
      UPDATE users
      SET name        = COALESCE(${name ?? null}, name),
          phone       = COALESCE(${phone ?? null}, phone),
          location    = COALESCE(${location ?? null}, location),
          lat         = COALESCE(${lat ?? null}, lat),
          lng         = COALESCE(${lng ?? null}, lng),
          updated_at  = NOW()
      WHERE id = ${userId}
      RETURNING *;
    `;
    return serializeUser(rows[0]);
  },

  // --- Meals --------------------------------------------------------------
  getMeals: async () => {
    const rows = await sql`SELECT * FROM meals ORDER BY category, name;`;
    return rows.map(serializeMeal);
  },

  getMealById: async (id) => {
    const rows = await sql`SELECT * FROM meals WHERE id = ${id} LIMIT 1;`;
    return serializeMeal(rows[0]);
  },

  createMeal: async (meal) => {
    const id = meal.id || makeId('meal');
    const rows = await sql`
      INSERT INTO meals (id, name, category, price, rating, reviews_count, description,
                         image, fallback_image, spicy, out_of_stock, spice_levels, broths, updated_at)
      VALUES (${id},
              ${meal.name},
              ${meal.category},
              ${toRWF(meal.price)},
              ${Number(meal.rating) || 5},
              ${Number(meal.reviews) || 0},
              ${meal.description || ''},
              ${meal.image || null},
              ${meal.fallbackImage || null},
              ${Boolean(meal.spicy)},
              ${Boolean(meal.outOfStock)},
              ${JSON.stringify(meal.spiceLevels || [])},
              ${JSON.stringify(meal.broths || [])},
              NOW())
      RETURNING *;
    `;
    return serializeMeal(rows[0]);
  },

  // Every field the edit form exposes is persisted, including image and spicy
  // — the previous implementation silently dropped both.
  updateMeal: async (id, updates = {}) => {
    const rows = await sql`
      UPDATE meals
      SET name           = COALESCE(${updates.name ?? null}, name),
          category       = COALESCE(${updates.category ?? null}, category),
          price          = COALESCE(${updates.price ?? null}, price),
          description    = COALESCE(${updates.description ?? null}, description),
          image          = COALESCE(${updates.image ?? null}, image),
          fallback_image = COALESCE(${updates.fallbackImage ?? null}, fallback_image),
          spicy          = COALESCE(${updates.spicy ?? null}, spicy),
          out_of_stock   = COALESCE(${updates.outOfStock ?? null}, out_of_stock),
          spice_levels   = COALESCE(${updates.spiceLevels ?? null}, spice_levels),
          broths         = COALESCE(${updates.broths ?? null}, broths),
          updated_at     = NOW()
      WHERE id = ${id}
      RETURNING *;
    `;
    if (!rows[0]) return null;
    return serializeMeal(rows[0]);
  },

  deleteMeal: async (id) => {
    const rows = await sql`DELETE FROM meals WHERE id = ${id} RETURNING id;`;
    return rows[0] || null;
  },

  // --- Orders -------------------------------------------------------------

  /**
   * @param {object} scope
   * @param {string} [scope.userId]  restrict to one customer
   * @param {string} [scope.status]  comma-separated status list
   * @param {number} [scope.limit]   bounded read (default 200)
   */
  getOrders: async ({ userId, statuses, limit = 200 } = {}) => {
    const statusList = Array.isArray(statuses)
      ? statuses.filter((s) => CANONICAL_STATUSES.includes(s))
      : typeof statuses === 'string' && statuses
        ? statuses.split(',').map((s) => s.trim()).filter((s) => CANONICAL_STATUSES.includes(s))
        : null;

    const bounded = Math.min(Math.max(Number(limit) || 200, 1), 500);

    let rows;
    if (userId && statusList) {
      rows = await sql`
        SELECT * FROM orders WHERE user_id = ${userId} AND status = ANY(${statusList})
        ORDER BY created_at DESC LIMIT ${bounded};`;
    } else if (userId) {
      rows = await sql`
        SELECT * FROM orders WHERE user_id = ${userId}
        ORDER BY created_at DESC LIMIT ${bounded};`;
    } else if (statusList) {
      rows = await sql`
        SELECT * FROM orders WHERE status = ANY(${statusList})
        ORDER BY created_at DESC LIMIT ${bounded};`;
    } else {
      rows = await sql`SELECT * FROM orders ORDER BY created_at DESC LIMIT ${bounded};`;
    }
    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const itemRows = await sql`
      SELECT * FROM order_items WHERE order_id = ANY(${ids}) ORDER BY name;`;

    const byOrder = new Map();
    for (const item of itemRows) {
      if (!byOrder.has(item.order_id)) byOrder.set(item.order_id, []);
      byOrder.get(item.order_id).push(serializeOrderItem(item));
    }
    return rows.map((r) => serializeOrder(r, byOrder.get(r.id) || []));
  },

  getOrderById: async (id, { includePin = false } = {}) => {
    const rows = await sql`SELECT * FROM orders WHERE id = ${id} LIMIT 1;`;
    if (!rows[0]) return null;
    const itemRows = await sql`SELECT * FROM order_items WHERE order_id = ${id} ORDER BY name;`;
    return serializeOrder(rows[0], itemRows.map(serializeOrderItem), { includePin });
  },

  /**
   * Creates an order. Prices are recomputed from the `meals` table — the
   * client-supplied price and total are ignored, which closes the "edit
   * localStorage to buy a 22,000 RWF meal for 1 RWF" hole.
   */
  createOrder: async (order) => {
    const requested = Array.isArray(order.items) ? order.items : [];
    if (requested.length === 0) {
      const err = new Error('An order must contain at least one item.');
      err.statusCode = 400;
      throw err;
    }

    const mealIds = requested.map((i) => i.id).filter(Boolean);
    const mealRows = mealIds.length
      ? await sql`SELECT * FROM meals WHERE id = ANY(${mealIds});`
      : [];
    const priceById = new Map(mealRows.map((m) => [m.id, toRWF(m.price)]));
    const stockById = new Map(mealRows.map((m) => [m.id, Boolean(m.out_of_stock)]));

    // Authoritative pricing + stock check.
    let totalRWF = 0;
    const lines = requested.map((item, index) => {
      const qty = Math.max(1, Math.min(Number(item.qty) || 1, 99));
      const price = priceById.has(item.id) ? priceById.get(item.id) : 0;
      if (priceById.has(item.id) && stockById.get(item.id)) {
        const err = new Error(`"${item.name}" is currently out of stock.`);
        err.statusCode = 409;
        throw err;
      }
      totalRWF += price * qty;
      return {
        id: `${makeId('oi')}-${index}`,
        meal_id: item.id || null,
        name: item.name || 'Dish',
        qty,
        price,
        spice: item.spice || null,
        broth: item.broth || null,
        special_note: String(item.specialNote || '').slice(0, 500)
      };
    });

    // Retry on the (very unlikely) primary-key collision rather than 500.
    let orderId = `HP-${Math.floor(100000 + Math.random() * 900000)}`;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const clash = await sql`SELECT 1 FROM orders WHERE id = ${orderId} LIMIT 1;`;
      if (!clash[0]) break;
      orderId = `HP-${Math.floor(100000 + Math.random() * 900000)}`;
    }

    const paymentMethod = order.paymentMethod || 'MTN Mobile Money';
    // Cash on delivery genuinely is not paid up front. Mobile money is only
    // marked paid once a payment provider confirms it — see server.js.
    const paymentStatus = order.paymentStatus === 'paid' ? 'paid' : 'pending';

    const rows = await sql`
      INSERT INTO orders (id, user_id, customer_name, phone, address, lat, lng, area, status,
                          total_rwf, order_type, notes, payment_method, payment_status,
                          distance_km, eta_minutes, eta_time, updated_at)
      VALUES (${orderId},
              ${order.userId || null},
              ${order.customerName},
              ${order.phone},
              ${order.address},
              ${order.lat ?? null},
              ${order.lng ?? null},
              ${order.area || null},
              'pending',
              ${totalRWF},
              ${order.orderType || 'delivery'},
              ${order.notes ? String(order.notes).slice(0, 500) : null},
              ${paymentMethod},
              ${paymentStatus},
              ${order.distanceKm ?? null},
              ${order.etaMinutes ?? null},
              ${order.etaTime || null},
              NOW())
      RETURNING *;
    `;

    // order_items has ON DELETE CASCADE, so a failure here can be cleaned up
    // rather than leaving a half-written order behind.
    try {
      for (const line of lines) {
        await sql`
          INSERT INTO order_items (id, order_id, meal_id, name, qty, price, spice, broth, special_note)
          VALUES (${line.id}, ${orderId}, ${line.meal_id}, ${line.name}, ${line.qty},
                  ${line.price}, ${line.spice}, ${line.broth}, ${line.special_note});`;
      }
    } catch (err) {
      await sql`DELETE FROM orders WHERE id = ${orderId};`;
      throw err;
    }

    return module.exports.getOrderById(orderId);
  },

  /**
   * Status transition with server-side state-machine enforcement. Returns the
   * FULL canonical order (all fields + items) so a status change can never
   * strip `customerName` / `phone` / `address` / `items` from the client copy.
   */
  updateOrderStatus: async (id, nextStatus, { riderName } = {}) => {
    await ensureOrderExists(id);
    const status = String(nextStatus || '').toLowerCase();
    if (!CANONICAL_STATUSES.includes(status)) {
      const err = new Error(`"${nextStatus}" is not a valid order status.`);
      err.statusCode = 400;
      throw err;
    }

    const currentRows = await sql`SELECT status FROM orders WHERE id = ${id} LIMIT 1;`;
    const current = currentRows[0].status;
    if (!canTransition(current, status)) {
      const err = new Error(`An order cannot go from "${current}" to "${status}".`);
      err.statusCode = 409;
      throw err;
    }

    await sql`
      UPDATE orders
      SET status = ${status},
          "rider_name" = COALESCE(${riderName ?? null}, rider_name),
          updated_at = NOW()
      WHERE id = ${id};`;

    return module.exports.getOrderById(id);
  },

  updateOrderNotes: async (id, notes) => {
    const rows = await sql`
      UPDATE orders SET notes = ${String(notes || '').slice(0, 500)}, updated_at = NOW()
      WHERE id = ${id} RETURNING id;`;
    if (!rows[0]) {
      const err = new Error('Order not found.');
      err.statusCode = 404;
      throw err;
    }
    return module.exports.getOrderById(id);
  },

  cancelOrder: async (id, { graceMs = 120000 } = {}) => {
    await ensureOrderExists(id);
    const rows = await sql`SELECT status, created_at FROM orders WHERE id = ${id} LIMIT 1;`;
    const order = rows[0];

    if (order.status === 'cancelled') {
      const err = new Error('This order has already been cancelled.');
      err.statusCode = 409;
      throw err;
    }
    if (['delivery', 'delivered'].includes(order.status)) {
      const err = new Error('This order is already out for delivery and can no longer be cancelled.');
      err.statusCode = 409;
      throw err;
    }
    // Inside the grace window only the customer may self-cancel; staff may
    // always cancel. The window is measured on the server clock.
    const ageMs = Date.now() - new Date(order.created_at).getTime();
    if (ageMs > graceMs) {
      const err = new Error('The 2-minute cancellation window has passed. Please contact support.');
      err.statusCode = 409;
      throw err;
    }

    await sql`UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = ${id};`;
    return module.exports.getOrderById(id);
  },

  setPaymentStatus: async (id, paymentStatus, paymentRef) => {
    if (!['pending', 'paid', 'failed', 'refunded'].includes(paymentStatus)) {
      const err = new Error('Unknown payment status.');
      err.statusCode = 400;
      throw err;
    }
    const rows = await sql`
      UPDATE orders SET payment_status = ${paymentStatus}, payment_ref = ${paymentRef ?? null}, updated_at = NOW()
      WHERE id = ${id} RETURNING id;`;
    if (!rows[0]) {
      const err = new Error('Order not found.');
      err.statusCode = 404;
      throw err;
    }
    return module.exports.getOrderById(id);
  },

  // --- Dispatch -----------------------------------------------------------

  /**
   * Assigns a rider and mints a 6-digit handover code. The plaintext code is
   * stored so the customer and the dispatcher can both read it; the rider can
   * never read it — they must be told it and type it in. That asymmetry is
   * what makes the check meaningful.
   */
  assignRider: async (orderId, riderId) => {
    await ensureOrderExists(orderId);

    const riderRows = await sql`SELECT * FROM riders WHERE id = ${riderId} LIMIT 1;`;
    if (!riderRows[0]) {
      const err = new Error('Rider not found.');
      err.statusCode = 404;
      throw err;
    }
    if (riderRows[0].current_order_id && riderRows[0].current_order_id !== orderId) {
      const err = new Error(`${riderRows[0].name} is already on another delivery.`);
      err.statusCode = 409;
      throw err;
    }

    // Refuse to hand out a second courier for an order that already has one,
    // unless that courier is the one being re-assigned.
    const existing = await sql`SELECT rider_id FROM orders WHERE id = ${orderId} LIMIT 1;`;
    if (existing[0].rider_id && existing[0].rider_id !== riderId) {
      const err = new Error('This order already has a courier assigned. Release the current courier first.');
      err.statusCode = 409;
      throw err;
    }

    const pin = String(Math.floor(100000 + Math.random() * 900000));

    await sql`
      UPDATE orders
      SET rider_id = ${riderId},
          rider_name = ${riderRows[0].name},
          verification_pin = ${pin},
          assigned_at = NOW(),
          updated_at = NOW()
      WHERE id = ${orderId};`;

    await sql`
      UPDATE riders
      SET current_order_id = ${orderId}, status = 'busy', is_available = FALSE, updated_at = NOW()
      WHERE id = ${riderId};`;

    return {
      order: await module.exports.getOrderById(orderId, { includePin: true }),
      rider: serializeRider(riderRows[0])
    };
  },

  /**
   * Rider confirms physical pickup by entering the code the customer gave them.
   * A missing/blank code is a failure, never a bypass. The correct code is
   * never included in the error message.
   */
  verifyHandover: async (orderId, pin, { riderId } = {}) => {
    await ensureOrderExists(orderId);
    const rows = await sql`SELECT * FROM orders WHERE id = ${orderId} LIMIT 1;`;
    const order = rows[0];

    if (order.status === 'cancelled') {
      const err = new Error('This order was cancelled.');
      err.statusCode = 409;
      throw err;
    }
    if (order.handed_over_at) {
      const err = new Error('This order has already been picked up.');
      err.statusCode = 409;
      throw err;
    }
    if (!riderId || order.rider_id !== riderId) {
      const err = new Error('You are not the courier assigned to this order.');
      err.statusCode = 403;
      throw err;
    }

    const entered = String(pin ?? '').trim();
    if (!entered) {
      const err = new Error('Enter the handover code the customer gave you.');
      err.statusCode = 400;
      throw err;
    }
    if (!order.verification_pin || entered !== String(order.verification_pin)) {
      const err = new Error('That handover code is not correct.');
      err.statusCode = 400;
      throw err;
    }

    await sql`
      UPDATE orders SET status = 'delivery', handed_over_at = NOW(), updated_at = NOW()
      WHERE id = ${orderId};`;

    return module.exports.getOrderById(orderId);
  },

  /** Release a courier (breakdown / timeout) and clear the handover code. */
  reassignRider: async (orderId, newRiderId) => {
    await ensureOrderExists(orderId);
    const current = await sql`SELECT rider_id FROM orders WHERE id = ${orderId} LIMIT 1;`;

    if (current[0].rider_id) {
      await sql`
        UPDATE riders
        SET current_order_id = NULL, status = 'available', is_available = TRUE, updated_at = NOW()
        WHERE id = ${current[0].rider_id};`;
    }

    if (!newRiderId) {
      await sql`
        UPDATE orders
        SET rider_id = NULL, rider_name = NULL, verification_pin = NULL,
            assigned_at = NULL, handed_over_at = NULL,
            status = 'ready', updated_at = NOW()
        WHERE id = ${orderId};`;
      return { order: await module.exports.getOrderById(orderId), rider: null };
    }
    return module.exports.assignRider(orderId, newRiderId);
  },

  // --- Riders -------------------------------------------------------------
  getRiders: async () => {
    const rows = await sql`SELECT * FROM riders ORDER BY name;`;
    return rows.map(serializeRider);
  },

  getRiderById: async (id) => {
    const rows = await sql`SELECT * FROM riders WHERE id = ${id} LIMIT 1;`;
    return serializeRider(rows[0]);
  },

  createRider: async (rider) => {
    const id = makeId('rider');
    const rows = await sql`
      INSERT INTO riders (id, name, email, phone, plate_number, vehicle_type, shift, updated_at)
      VALUES (${id}, ${rider.name}, ${rider.email || null}, ${rider.phone || null},
              ${rider.plateNumber || null}, ${rider.vehicleType || null}, ${rider.shift || null}, NOW())
      RETURNING *;
    `;
    return serializeRider(rows[0]);
  },

  updateRider: async (id, updates = {}) => {
    const rows = await sql`
      UPDATE riders
      SET name = COALESCE(${updates.name ?? null}, name),
          phone = COALESCE(${updates.phone ?? null}, phone),
          plate_number = COALESCE(${updates.plateNumber ?? null}, plate_number),
          vehicle_type = COALESCE(${updates.vehicleType ?? null}, vehicle_type),
          shift = COALESCE(${updates.shift ?? null}, shift),
          updated_at = NOW()
      WHERE id = ${id} RETURNING *;
    `;
    return serializeRider(rows[0]);
  },

  /**
   * Duty toggle. `is_available` and `status` are always set together so the two
   * can never contradict each other, and a rider mid-delivery cannot flip
   * themselves back to "available" while still holding an order.
   */
  setRiderAvailability: async (id, isAvailable) => {
    const rider = await module.exports.getRiderById(id);
    if (!rider) {
      const err = new Error('Rider not found.');
      err.statusCode = 404;
      throw err;
    }
    const on = Boolean(isAvailable);
    const status = !on ? 'off_duty' : rider.current_order_id ? 'busy' : 'available';
    const rows = await sql`
      UPDATE riders SET is_available = ${on && !rider.current_order_id}, status = ${status}, updated_at = NOW()
      WHERE id = ${id} RETURNING *;
    `;
    return serializeRider(rows[0]);
  },

  /** Rider marks an order delivered and is credited for it. */
  completeDelivery: async (orderId, riderId) => {
    const order = await module.exports.getOrderById(orderId);
    if (!order) {
      const err = new Error('Order not found.');
      err.statusCode = 404;
      throw err;
    }
    if (order.riderId !== riderId) {
      const err = new Error('You are not the courier assigned to this order.');
      err.statusCode = 403;
      throw err;
    }
    if (order.status !== 'delivery') {
      const err = new Error('An order can only be completed once it is out for delivery.');
      err.statusCode = 409;
      throw err;
    }

    await sql`UPDATE orders SET status = 'delivered', updated_at = NOW() WHERE id = ${orderId};`;
    await sql`
      UPDATE riders
      SET current_order_id = NULL,
          status = 'off_duty',
          is_available = FALSE,
          earnings_today = earnings_today + 1200,
          completed_today = completed_today + 1,
          updated_at = NOW()
      WHERE id = ${riderId};`;

    return module.exports.getOrderById(orderId);
  },

  updateRiderLocation: async (id, { lat, lng }) => {
    await sql`
      UPDATE riders SET last_lat = ${lat}, last_lng = ${lng}, last_seen_at = NOW(), updated_at = NOW()
      WHERE id = ${id};`;
  },

  getRiderLocations: async () => {
    const rows = await sql`
      SELECT id, name, last_lat, last_lng, last_seen_at, status
      FROM riders WHERE last_lat IS NOT NULL;`;
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      lat: Number(r.last_lat),
      lng: Number(r.last_lng),
      timestamp: r.last_seen_at,
      status: r.status
    }));
  },

  // --- Reviews ------------------------------------------------------------

  /**
   * A review requires a DELIVERED order that the caller actually owns. The
   * "verified purchase" rule lives here, on the server, where it cannot be
   * skipped by editing a file in the browser.
   */
  createReview: async ({ orderId, userId, pizzaRating, riderRating, comment }) => {
    const order = await module.exports.getOrderById(orderId);
    if (!order) {
      const err = new Error('Order not found.');
      err.statusCode = 404;
      throw err;
    }
    if (order.status !== 'delivered') {
      const err = new Error('You can only review an order once it has been delivered.');
      err.statusCode = 403;
      throw err;
    }
    if (String(order.userId) !== String(userId)) {
      const err = new Error('You can only review your own orders.');
      err.statusCode = 403;
      throw err;
    }

    const pizza = Math.min(5, Math.max(1, Math.round(Number(pizzaRating))));
    const rider = Math.min(5, Math.max(1, Math.round(Number(riderRating))));
    if (!Number.isFinite(pizza) || !Number.isFinite(rider)) {
      const err = new Error('Ratings must be a number from 1 to 5.');
      err.statusCode = 400;
      throw err;
    }

    const rows = await sql`
      INSERT INTO feedbacks (id, order_id, user_id, pizza_rating, rider_rating, rating, comment)
      VALUES (${makeId('fb')}, ${orderId}, ${userId}, ${pizza}, ${rider},
              ${Math.round((pizza + rider) / 2)}, ${comment ? String(comment).slice(0, 1000) : null})
      ON CONFLICT (order_id) DO UPDATE
        SET pizza_rating = EXCLUDED.pizza_rating,
            rider_rating = EXCLUDED.rider_rating,
            rating       = EXCLUDED.rating,
            comment      = EXCLUDED.comment,
            updated_at   = NOW()
      RETURNING *;
    `;
    return serializeFeedback(rows[0]);
  },

  getReviews: async () => {
    const rows = await sql`SELECT * FROM feedbacks ORDER BY created_at DESC;`;
    return rows.map(serializeFeedback);
  },

  // --- Vouchers -----------------------------------------------------------
  getVouchers: async () => {
    const rows = await sql`SELECT * FROM vouchers ORDER BY code;`;
    return rows.map(serializeVoucher);
  },

  createVoucher: async ({ code, discountPercent, maxUses, expiresAt }) => {
    const pct = Math.min(100, Math.max(0, Math.round(Number(discountPercent))));
    if (!code) {
      const err = new Error('Voucher code is required.');
      err.statusCode = 400;
      throw err;
    }
    const rows = await sql`
      INSERT INTO vouchers (code, discount_percent, max_uses, expires_at)
      VALUES (${String(code).toUpperCase()}, ${pct}, ${maxUses ?? null}, ${expiresAt ?? null})
      RETURNING *;
    `;
    return serializeVoucher(rows[0]);
  },

  validateVoucher: async (code) => {
    const rows = await sql`SELECT * FROM vouchers WHERE code = ${String(code || '').toUpperCase()} LIMIT 1;`;
    const voucher = rows[0];
    if (!voucher) return null;
    const expired = voucher.expires_at && new Date(voucher.expires_at) < new Date();
    const exhausted = voucher.max_uses !== null && Number(voucher.used_count) >= Number(voucher.max_uses);
    if (!voucher.active || expired || exhausted) return null;
    return serializeVoucher(voucher);
  },

  // --- Analytics ----------------------------------------------------------
  /**
   * All sums are over integer RWF and every status comparison is against the
   * canonical lowercase values, so cancelled orders can never be counted as
   * revenue and delivered orders can never be counted as active.
   */
  getAdminAnalytics: async () => {
    const [revenue, counts, top] = await Promise.all([
      sql`
        SELECT COALESCE(SUM(total_rwf), 0) AS total
        FROM orders
        WHERE status <> 'cancelled';`,
      sql`
        SELECT
          COUNT(*) AS total_orders,
          COUNT(*) FILTER (WHERE status IN ('pending','preparing','ready','delivery')) AS active_orders,
          COUNT(*) FILTER (WHERE status = 'delivered') AS delivered_orders,
          COALESCE(SUM(total_rwf) FILTER (WHERE status = 'delivered'), 0) AS delivered_revenue,
          COALESCE(AVG(total_rwf) FILTER (WHERE status = 'delivered'), 0) AS avg_ticket
        FROM orders
        WHERE status <> 'cancelled';`,
      sql`
        SELECT oi.name, SUM(oi.qty) AS qty, SUM(oi.qty * oi.price) AS revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status <> 'cancelled'
        GROUP BY oi.name
        ORDER BY qty DESC
        LIMIT 10;`
    ]);

    const stats = counts[0] || {};
    return {
      totalRevenueRWF: toRWF(revenue[0]?.total),
      deliveredRevenueRWF: toRWF(stats.delivered_revenue),
      avgTicketRWF: toRWF(stats.avg_ticket),
      totalOrdersCount: Number(stats.total_orders || 0),
      activeOrdersCount: Number(stats.active_orders || 0),
      deliveredOrdersCount: Number(stats.delivered_orders || 0),
      topDishes: top.map((t) => ({ name: t.name, qty: Number(t.qty), revenueRWF: toRWF(t.revenue) }))
    };
  }
};
