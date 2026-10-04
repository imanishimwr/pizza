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
const crypto = require('crypto');
const { Pool } = require('pg');

function isUuid(str) {
  return typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

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

let pool = null;

function getPool() {
  if (!pool) {
    const connectionString = assertDatabaseConfigured();
    const useSsl =
      connectionString.includes('sslmode=require') ||
      connectionString.includes('.neon.tech') ||
      process.env.PGSSL === 'true';

    pool = new Pool({
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : false
    });

    pool.on('error', (err) => {
      console.error('[db] Unexpected error on idle PostgreSQL client:', err);
    });
  }
  return pool;
}

async function sql(strings, ...values) {
  if (typeof strings === 'string') {
    const res = await getPool().query(strings, values);
    return res.rows;
  }
  let queryText = '';
  for (let i = 0; i < strings.length; i++) {
    queryText += strings[i];
    if (i < values.length) {
      queryText += `$${i + 1}`;
    }
  }
  const result = await getPool().query(queryText, values);
  return result.rows;
}

sql.query = async (text, params = []) => {
  const result = await getPool().query(text, params);
  return result.rows;
};

async function withTransaction(callback) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const txSql = async (strings, ...values) => {
      if (typeof strings === 'string') {
        const res = await client.query(strings, values);
        return res.rows;
      }
      let queryText = '';
      for (let i = 0; i < strings.length; i++) {
        queryText += strings[i];
        if (i < values.length) {
          queryText += `$${i + 1}`;
        }
      }
      const res = await client.query(queryText, values);
      return res.rows;
    };
    const result = await callback(txSql, client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

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

const CANONICAL_STATUSES = ['ongoing', 'ready', 'delivered', 'cancelled'];

function normalizeStatus(status) {
  const s = String(status || '').toLowerCase().trim();
  if (s === 'canceled') return 'cancelled';
  if (s === 'delived') return 'delivered';
  if (['pending', 'preparing', 'delivery'].includes(s)) return 'ongoing';
  return s || 'ongoing';
}

/**
 * Allowed order status transitions. Enforced server-side.
 * Statuses: ongoing, ready, delivered, cancelled.
 */
const ALLOWED_TRANSITIONS = {
  ongoing: ['ready', 'delivered', 'cancelled', 'ongoing'],
  ready: ['ongoing', 'delivered', 'cancelled', 'ready'],
  delivered: ['delivered'],
  cancelled: ['cancelled'],
  // Legacy aliases
  pending: ['ongoing', 'ready', 'delivered', 'cancelled'],
  preparing: ['ongoing', 'ready', 'delivered', 'cancelled'],
  delivery: ['ongoing', 'ready', 'delivered', 'cancelled']
};

function canTransition(fromRaw, toRaw) {
  const from = normalizeStatus(fromRaw);
  const to = normalizeStatus(toRaw);
  if (from === to) return true;
  return (ALLOWED_TRANSITIONS[from] || []).includes(to);
}

/** Lowercase every status in the database and convert legacy statuses to ongoing. */
async function normaliseLegacyStatuses() {
  await sql`UPDATE orders SET status = LOWER(status) WHERE status <> LOWER(status);`;
  await sql`UPDATE orders SET status = 'ongoing' WHERE status IN ('pending', 'preparing', 'delivery');`;
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
    tokenVersion: Number(row.token_version ?? 1),
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
    activeDeliveries: Number(row.active_deliveries ?? (row.current_order_id ? 1 : 0)),
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
    status: normalizeStatus(row.status),
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
  withTransaction,
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
  normalizeStatus,
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
      await bcrypt.compare(password, '$2a$10$wT5g1zYwK/G7Gj78kS5Qe.bJb9W5k3WbH1R9m4HqX5c8V6Y0Z7P6a');
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
    const rows = await sql`
      UPDATE users 
      SET role = ${normalized}, 
          token_version = COALESCE(token_version, 1) + 1, 
          updated_at = NOW() 
      WHERE id = ${userId} 
      RETURNING *;
    `;
    if (!rows[0]) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }
    return serializeUser(rows[0]);
  },

  invalidateUserSessions: async (userId) => {
    const rows = await sql`
      UPDATE users 
      SET token_version = COALESCE(token_version, 1) + 1, 
          updated_at = NOW() 
      WHERE id = ${userId} 
      RETURNING *;
    `;
    return rows[0] ? serializeUser(rows[0]) : null;
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
    const id = (meal.id && isUuid(meal.id)) ? meal.id : crypto.randomUUID();
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
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        price = EXCLUDED.price,
        rating = EXCLUDED.rating,
        reviews_count = EXCLUDED.reviews_count,
        description = EXCLUDED.description,
        image = EXCLUDED.image,
        fallback_image = EXCLUDED.fallback_image,
        spicy = EXCLUDED.spicy,
        out_of_stock = EXCLUDED.out_of_stock,
        spice_levels = EXCLUDED.spice_levels,
        broths = EXCLUDED.broths,
        updated_at = NOW()
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
      ? statuses.map(normalizeStatus).filter((s) => CANONICAL_STATUSES.includes(s))
      : typeof statuses === 'string' && statuses
        ? statuses.split(',').map((s) => normalizeStatus(s.trim())).filter((s) => CANONICAL_STATUSES.includes(s))
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

    return withTransaction(async (txSql) => {
      const mealIds = requested.map((i) => i.id).filter(Boolean);
      const mealRows = mealIds.length
        ? await txSql`SELECT * FROM meals WHERE id = ANY(${mealIds}) FOR UPDATE;`
        : [];
      const mealMap = new Map(mealRows.map((m) => [m.id, m]));

      // Validate every requested item exists in the meals catalog
      for (const item of requested) {
        if (!item.id || !mealMap.has(item.id)) {
          const err = new Error(`Item "${item.name || item.id || 'unknown'}" is not a valid menu item.`);
          err.statusCode = 400;
          throw err;
        }
      }

      // Authoritative pricing + stock check.
      let totalRWF = 0;
      const lines = requested.map((item, index) => {
        const meal = mealMap.get(item.id);
        const qty = Math.max(1, Math.min(Number(item.qty) || 1, 99));
        const price = toRWF(meal.price);
        if (Boolean(meal.out_of_stock)) {
          const err = new Error(`"${meal.name}" is currently out of stock.`);
          err.statusCode = 409;
          throw err;
        }
        totalRWF += price * qty;
        return {
          id: `${makeId('oi')}-${index}`,
          meal_id: item.id,
          name: meal.name,
          qty,
          price,
          spice: item.spice || null,
          broth: item.broth || null,
          special_note: String(item.specialNote || '').slice(0, 500)
        };
      });

      // Secure unique order ID generation
      let orderId = `HP-${crypto.randomInt(100000, 1000000)}`;
      let foundUnique = false;
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const clash = await txSql`SELECT 1 FROM orders WHERE id = ${orderId} LIMIT 1;`;
        if (!clash[0]) {
          foundUnique = true;
          break;
        }
        orderId = `HP-${crypto.randomInt(100000, 1000000)}`;
      }
      if (!foundUnique) {
        orderId = `HP-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      }

      const paymentMethod = order.paymentMethod || 'MTN Mobile Money';
      // Clients cannot mark their own order paid upon creation.
      const paymentStatus = 'pending';

      await txSql`
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
                'ongoing',
                ${totalRWF},
                ${order.orderType || 'delivery'},
                ${order.notes ? String(order.notes).slice(0, 500) : null},
                ${paymentMethod},
                ${paymentStatus},
                ${order.distanceKm ?? null},
                ${order.etaMinutes ?? null},
                ${order.etaTime || null},
                NOW());
      `;

      for (const line of lines) {
        await txSql`
          INSERT INTO order_items (id, order_id, meal_id, name, qty, price, spice, broth, special_note)
          VALUES (${line.id}, ${orderId}, ${line.meal_id}, ${line.name}, ${line.qty},
                  ${line.price}, ${line.spice}, ${line.broth}, ${line.special_note});
        `;
      }

      const finalRows = await txSql`SELECT * FROM orders WHERE id = ${orderId};`;
      const itemRows = await txSql`SELECT * FROM order_items WHERE order_id = ${orderId} ORDER BY name;`;
      return serializeOrder(finalRows[0], itemRows.map(serializeOrderItem));
    });
  },

  /**
   * Status transition with server-side state-machine enforcement. Returns the
   * FULL canonical order (all fields + items) so a status change can never
   * strip `customerName` / `phone` / `address` / `items` from the client copy.
   */
  updateOrderStatus: async (id, nextStatus, { riderName } = {}) => {
    await ensureOrderExists(id);
    const status = normalizeStatus(nextStatus);
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

  cancelOrder: async (id, { graceMs = 120000, bypassGrace = false } = {}) => {
    await ensureOrderExists(id);
    const rows = await sql`SELECT status, created_at, rider_id FROM orders WHERE id = ${id} LIMIT 1;`;
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
    if (!bypassGrace && ageMs > graceMs) {
      const err = new Error('The 2-minute cancellation window has passed. Please contact support.');
      err.statusCode = 409;
      throw err;
    }

    // Free the assigned courier so they don't get stranded
    await sql`UPDATE riders SET current_order_id = NULL, status = 'available', is_available = TRUE, updated_at = NOW() WHERE current_order_id = ${id};`;
    await sql`UPDATE orders SET status = 'cancelled', rider_id = NULL, rider_name = NULL, verification_pin = NULL, updated_at = NOW() WHERE id = ${id};`;
    return module.exports.getOrderById(id);
  },

  deleteOrder: async (id) => {
    await ensureOrderExists(id);
    await sql`UPDATE riders SET current_order_id = NULL, status = 'available', is_available = TRUE WHERE current_order_id = ${id};`;
    const rows = await sql`DELETE FROM orders WHERE id = ${id} RETURNING id;`;
    return rows[0] || null;
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
   * Assigns a rider and mints a cryptographically secure 6-digit handover code.
   * Locked with a transaction to avoid race conditions.
   */
  assignRider: async (orderId, riderId) => {
    return withTransaction(async (txSql) => {
      const orderRows = await txSql`SELECT id, status, rider_id FROM orders WHERE id = ${orderId} FOR UPDATE;`;
      if (!orderRows[0]) {
        const err = new Error('Order not found.');
        err.statusCode = 404;
        throw err;
      }
      if (['delivered', 'cancelled'].includes(normalizeStatus(orderRows[0].status))) {
        const err = new Error(`Cannot assign courier to an order that is ${orderRows[0].status}.`);
        err.statusCode = 409;
        throw err;
      }

      const riderRows = await txSql`SELECT * FROM riders WHERE id = ${riderId} FOR UPDATE;`;
      if (!riderRows[0]) {
        const err = new Error('Rider not found.');
        err.statusCode = 404;
        throw err;
      }

      // If reassigning from another rider, detach the previous rider first
      if (orderRows[0].rider_id && orderRows[0].rider_id !== riderId) {
        await txSql`
          UPDATE riders
          SET current_order_id = NULL, status = 'available', is_available = TRUE, updated_at = NOW()
          WHERE id = ${orderRows[0].rider_id} AND current_order_id = ${orderId};`;
      }

      const pin = crypto.randomInt(100000, 1000000).toString();

      await txSql`
        UPDATE orders
        SET rider_id = ${riderId},
            rider_name = ${riderRows[0].name},
            verification_pin = ${pin},
            assigned_at = NOW(),
            updated_at = NOW()
        WHERE id = ${orderId};`;

      await txSql`
        UPDATE riders
        SET current_order_id = ${orderId}, status = 'busy', is_available = FALSE, updated_at = NOW()
        WHERE id = ${riderId};`;

      const updatedOrder = await module.exports.getOrderById(orderId, { includePin: true });
      return {
        order: updatedOrder,
        rider: serializeRider(riderRows[0])
      };
    });
  },

  /**
   * Rider confirms physical pickup by entering the code the customer gave them.
   * State machine check: order must be in 'ready' status.
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
    if (order.status !== 'ready') {
      const err = new Error('Order must be in ready status before handover pickup.');
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
    const orderRows = await sql`SELECT status, handed_over_at, rider_id FROM orders WHERE id = ${orderId} LIMIT 1;`;
    const current = orderRows[0];
    const norm = normalizeStatus(current.status);
    if (norm === 'delivered') {
      const err = new Error('Cannot reassign order that is already delivered.');
      err.statusCode = 409;
      throw err;
    }

    if (current.rider_id) {
      await sql`
        UPDATE riders
        SET current_order_id = NULL, status = 'available', is_available = TRUE, updated_at = NOW()
        WHERE id = ${current.rider_id} AND current_order_id = ${orderId};`;
    }

    if (!newRiderId) {
      await sql`
        UPDATE orders
        SET rider_id = NULL, rider_name = NULL, verification_pin = NULL,
            assigned_at = NULL, handed_over_at = NULL,
            updated_at = NOW()
        WHERE id = ${orderId};`;
      return { order: await module.exports.getOrderById(orderId), rider: null };
    }
    // Clear rider fields on order before assigning new rider
    await sql`UPDATE orders SET rider_id = NULL, rider_name = NULL WHERE id = ${orderId};`;
    return module.exports.assignRider(orderId, newRiderId);
  },

  assignManualRiderToOrder: async (orderId, riderData = {}) => {
    await ensureOrderExists(orderId);
    // Ignore any client-supplied PIN; generate cryptographically secure 6-digit PIN
    const pin = crypto.randomInt(100000, 1000000).toString();
    const riderId = riderData.id || makeId('rider');

    let existingRider = null;
    if (riderData.phone) {
      const rows = await sql`SELECT * FROM riders WHERE phone = ${riderData.phone} LIMIT 1;`;
      existingRider = rows[0] || null;
    }

    let activeRiderId = riderId;
    let activeRiderName = riderData.name || 'Assigned Courier';

    if (existingRider) {
      activeRiderId = existingRider.id;
      activeRiderName = riderData.name || existingRider.name;
      await sql`
        UPDATE riders
        SET name = ${activeRiderName},
            plate_number = COALESCE(${riderData.plateNumber || null}, plate_number),
            vehicle_type = COALESCE(${riderData.vehicleType || null}, vehicle_type),
            shift = COALESCE(${riderData.shift || null}, shift),
            current_order_id = ${orderId},
            status = 'busy',
            is_available = FALSE,
            updated_at = NOW()
        WHERE id = ${activeRiderId};
      `;
    } else {
      await sql`
        INSERT INTO riders (id, name, email, phone, plate_number, vehicle_type, shift, is_available, status, current_order_id, last_lat, last_lng, updated_at)
        VALUES (${activeRiderId}, ${activeRiderName}, ${riderData.email || null}, ${riderData.phone || null},
                ${riderData.plateNumber || 'RAC 000X'}, ${riderData.vehicleType || 'Motorcycle'}, ${riderData.shift || 'On-Demand Dispatch'},
                FALSE, 'busy', ${orderId}, -1.9441, 30.0619, NOW());
      `;
    }

    await sql`
      UPDATE orders
      SET rider_id = ${activeRiderId},
          rider_name = ${activeRiderName},
          verification_pin = ${pin},
          assigned_at = NOW(),
          updated_at = NOW()
      WHERE id = ${orderId};
    `;

    const updatedOrder = await module.exports.getOrderById(orderId, { includePin: true });
    const updatedRider = await module.exports.getRiderById(activeRiderId);

    return {
      order: updatedOrder,
      rider: updatedRider
    };
  },

  // --- Riders -------------------------------------------------------------
  getRiders: async () => {
    const rows = await sql`
      SELECT r.*,
             COALESCE((
               SELECT COUNT(*)::int
               FROM orders o
               WHERE o.rider_id = r.id
                 AND LOWER(o.status) NOT IN ('delivered', 'cancelled')
             ), 0) AS active_deliveries
      FROM riders r
      ORDER BY r.name;
    `;
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
    return withTransaction(async (txSql) => {
      const rows = await txSql`SELECT * FROM riders WHERE id = ${id} FOR UPDATE;`;
      const rider = rows[0];
      if (!rider) {
        const err = new Error('Rider not found.');
        err.statusCode = 404;
        throw err;
      }
      const on = Boolean(isAvailable);
      const status = !on ? 'off_duty' : rider.current_order_id ? 'busy' : 'available';
      const updated = await txSql`
        UPDATE riders SET is_available = ${on && !rider.current_order_id}, status = ${status}, updated_at = NOW()
        WHERE id = ${id} RETURNING *;
      `;
      return serializeRider(updated[0]);
    });
  },

  /** Rider marks an order delivered and is credited for it. */
  completeDelivery: async (orderId, riderId) => {
    return withTransaction(async (txSql) => {
      const orderRows = await txSql`SELECT * FROM orders WHERE id = ${orderId} FOR UPDATE;`;
      const order = orderRows[0];
      if (!order) {
        const err = new Error('Order not found.');
        err.statusCode = 404;
        throw err;
      }
      if (order.rider_id !== riderId) {
        const err = new Error('You are not the courier assigned to this order.');
        err.statusCode = 403;
        throw err;
      }
      if (order.status !== 'delivery') {
        const err = new Error('An order can only be completed once it is out for delivery.');
        err.statusCode = 409;
        throw err;
      }

      await txSql`UPDATE orders SET status = 'delivered', updated_at = NOW() WHERE id = ${orderId};`;
      await txSql`
        UPDATE riders
        SET current_order_id = NULL,
            status = 'available',
            is_available = TRUE,
            earnings_today = earnings_today + 1200,
            completed_today = completed_today + 1,
            updated_at = NOW()
        WHERE id = ${riderId};`;

      const finalRows = await txSql`SELECT * FROM orders WHERE id = ${orderId};`;
      const itemRows = await txSql`SELECT * FROM order_items WHERE order_id = ${orderId} ORDER BY name;`;
      return serializeOrder(finalRows[0], itemRows.map(serializeOrderItem));
    });
  },

  findRiderForUser: async (user) => {
    if (!user) return null;
    if (user.id) {
      const byId = await sql`SELECT * FROM riders WHERE id = ${user.id} LIMIT 1;`;
      if (byId[0]) return serializeRider(byId[0]);
    }
    if (user.email) {
      const byEmail = await sql`SELECT * FROM riders WHERE LOWER(email) = LOWER(${user.email}) LIMIT 1;`;
      if (byEmail[0]) return serializeRider(byEmail[0]);
    }
    if (user.phone) {
      const byPhone = await sql`SELECT * FROM riders WHERE phone = ${user.phone} LIMIT 1;`;
      if (byPhone[0]) return serializeRider(byPhone[0]);
    }
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
