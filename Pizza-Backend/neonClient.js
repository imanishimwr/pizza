// Neon Serverless PostgreSQL Database Client & Queries
const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
const orderFlow = require('./orderFlow');
require('dotenv').config();

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

// Map a raw `orders` row + parsed `items` array into the shape the frontend UI expects.
function serializeOrder(row, items) {
  if (!row) return null;
  const rawItems = Array.isArray(items) ? items : [];
  return {
    id: row.id,
    customerName: row.customerName,
    phone: row.phone,
    address: row.address,
    lat: row.lat ? Number(row.lat) : null,
    lng: row.lng ? Number(row.lng) : null,
    status: String(row.status || 'pending').toLowerCase(),
    totalRWF: Number(row.totalRWF) || 0,
    riderName: row.riderName || null,
    paymentMethod: row.paymentType || 'MTN Mobile Money',
    paymentStatus: row.paymentStatus || 'PAID',
    userId: row.userId || null,
    createdAt: row.created_at,
    preparedAt: row.prepared_at || null,
    readyAt: row.ready_at || null,
    deliveredAt: row.delivered_at || null,
    orderTime: formatOrderTime(row.created_at),
    items: rawItems.map((it) => ({
      id: it.id || null,
      name: it.name,
      qty: Number(it.qty) || 1,
      price: Number(it.price) || 0,
      mealId: it.mealId || null,
      spice: it.spice || undefined,
      broth: it.broth || undefined,
      specialNote: it.specialNote || undefined
    }))
  };
}

// "10:14 AM" style display time matching the mock data contract.
function formatOrderTime(timestamp) {
  if (!timestamp) return '—';
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return '—';
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${meridiem}`;
}

function parseJsonItems(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value) {
    try { return JSON.parse(value); } catch (e) { return []; }
  }
  return [];
}

// JSONB columns come back as parsed arrays or stringified JSON depending on the
// driver/connection pooler, so be defensive in both directions.
function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return [];
}

// Map a raw `meals` row into the shape the customer UI expects (same contract
// the old mockData.js defined: spiceLevels / broths arrays + prepTime).
function serializeMeal(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price) || 0,
    rating: row.rating != null ? Number(row.rating) : 5.0,
    reviews: row.reviewsCount != null ? Number(row.reviewsCount) : (row.reviews || 0),
    image: row.image || '',
    fallbackImage: row.image || '',
    description: row.description || '',
    spicy: !!row.spicy,
    outOfStock: !!row.outOfStock,
    spiceLevels: parseJsonArray(row.spiceLevels),
    broths: parseJsonArray(row.broths),
    prepTime: row.prepTime || '15-20 min',
    createdAt: row.created_at || null
  };
}

module.exports = {
  sql,
  serializeOrder,
  serializeMeal,

  // User Queries (Neon PostgreSQL)
  findUserByEmail: async (email) => {
    if (!sql) return null;
    const rows = await sql`SELECT * FROM users WHERE LOWER(email) = LOWER(${email}) LIMIT 1;`;
    return rows[0] || null;
  },

  registerUserInNeon: async ({ name, email, phone, password, googleId, avatarUrl, role = 'CUSTOMER' }) => {
    const salt = password ? await bcrypt.genSalt(10) : null;
    const passwordHash = password ? await bcrypt.hash(password, salt) : null;
    const id = `user-${Date.now()}`;

    const rows = await sql`
      INSERT INTO users (id, name, email, phone, password_hash, google_id, avatar_url, role, updated_at)
      VALUES (${id}, ${name}, ${email}, ${phone || null}, ${passwordHash}, ${googleId || null}, ${avatarUrl || null}, ${role}, NOW())
      RETURNING id, name, email, phone, avatar_url, role, created_at;
    `;

    return rows[0];
  },

  verifyLoginInNeon: async (email, password) => {
    console.log("verifyLoginInNeon called for:", email);
    if (!sql) return null;
    const user = await module.exports.findUserByEmail(email);
    console.log("Found user:", user ? user.email : 'No user');
    if (!user) return null;

    console.log("User password_hash exists?", !!user.password_hash);
    if (!user.password_hash) return null; // Google accounts sign in via Google

    const isMatch = await bcrypt.compare(password, user.password_hash);
    console.log("Password match:", isMatch);
    return isMatch ? user : null;
  },

  getAllUsers: async () => {
    if (!sql) return [];
    return await sql`SELECT id, name, email, phone, avatar_url, role, created_at FROM users ORDER BY created_at DESC;`;
  },

  // --- Categories & Promos Queries ---
  getCategories: async () => {
    if (!sql) return [];
    return await sql`SELECT * FROM categories WHERE active = true ORDER BY "sortOrder" ASC;`;
  },

  getPromos: async () => {
    if (!sql) return [];
    return await sql`SELECT * FROM promos WHERE active = true ORDER BY "sortOrder" ASC;`;
  },

  // --- Meals Queries ---
  getMeals: async () => {
    if (!sql) {
      const db = require('./db');
      return db.getMeals({}).map((m) => ({
        spiceLevels: [],
        broths: [],
        prepTime: '15-20 min',
        ...m,
        fallbackImage: m.image || ''
      }));
    }
    const rows = await sql`SELECT * FROM meals ORDER BY created_at DESC, id ASC;`;
    return rows.map((row) => serializeMeal(row));
  },

  createMeal: async (meal) => {
    const id = meal.id || `meal-${Date.now()}`;
    const rows = await sql`
      INSERT INTO meals (id, name, category, price, description, image, spicy, "outOfStock", "spiceLevels", broths, "prepTime")
      VALUES (${id}, ${meal.name}, ${meal.category}, ${meal.price}, ${meal.description || ''}, ${meal.image || ''}, ${meal.spicy || false}, ${meal.outOfStock || false}, ${JSON.stringify(meal.spiceLevels || [])}, ${JSON.stringify(meal.broths || [])}, ${meal.prepTime || '15-20 min'})
      RETURNING *;
    `;
    return serializeMeal(rows[0]);
  },

  updateMeal: async (id, updates) => {
    const spiceJSON = updates.spiceLevels !== undefined ? JSON.stringify(updates.spiceLevels) : null;
    const brothsJSON = updates.broths !== undefined ? JSON.stringify(updates.broths) : null;
    const rows = await sql`
      UPDATE meals 
      SET name = COALESCE(${updates.name}, name),
          price = COALESCE(${updates.price}, price),
          category = COALESCE(${updates.category}, category),
          description = COALESCE(${updates.description}, description),
          "outOfStock" = COALESCE(${updates.outOfStock}, "outOfStock"),
          "spiceLevels" = COALESCE(${spiceJSON}, "spiceLevels"),
          broths = COALESCE(${brothsJSON}, broths),
          "prepTime" = COALESCE(${updates.prepTime}, "prepTime"),
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *;
    `;
    return rows[0] ? serializeMeal(rows[0]) : null;
  },

  deleteMeal: async (id) => {
    const rows = await sql`DELETE FROM meals WHERE id = ${id} RETURNING id;`;
    return rows[0];
  },

  // --- Categories & Promos Queries ---
  getCategories: async () => {
    if (!sql) return [];
    const rows = await sql`
      SELECT * FROM categories
      WHERE active = true
      ORDER BY "sortOrder" ASC, name ASC;
    `;
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      icon: row.icon || null,
      sortOrder: Number(row.sortOrder) || 0
    }));
  },

  getPromos: async () => {
    if (!sql) return [];
    const rows = await sql`
      SELECT * FROM promos
      WHERE active = true
      ORDER BY "sortOrder" ASC, id ASC;
    `;
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      subtitle: row.subtitle || '',
      code: row.code,
      tag: row.tag || '',
      color: row.color || '',
      bgGradient: row.bgGradient || ''
    }));
  },

  // --- Orders Queries ---

  // Load a single order with its line items (serialized for the UI).
  getOrderById: async (id) => {
    if (!sql) {
      const db = require('./db');
      return db.getOrderById(id);
    }
    const orderRows = await sql`SELECT * FROM orders WHERE id = ${id} LIMIT 1;`;
    if (!orderRows[0]) return null;
    const itemRows = await sql`SELECT * FROM order_items WHERE "orderId" = ${id} ORDER BY created_at ASC;`;
    return serializeOrder(orderRows[0], parseJsonItems(itemRows));
  },

  getOrders: async () => {
    if (!sql) {
      const db = require('./db');
      return db.getOrders();
    }
    const rows = await sql`
      SELECT o.*,
        COALESCE(
          json_agg(oi ORDER BY oi.created_at ASC) FILTER (WHERE oi.id IS NOT NULL),
          '[]'
        ) AS items
      FROM orders o
      LEFT JOIN order_items oi ON oi."orderId" = o.id
      GROUP BY o.id
      ORDER BY o.created_at DESC;
    `;
    return rows.map((row) => serializeOrder(row, parseJsonItems(row.items)));
  },

  // Kitchen board feed: pending/preparing/ready orders with items + queue metrics.
  getKitchenOrders: async () => {
    if (!sql) {
      const db = require('./db');
      return db.getKitchenBoard();
    }
    const orders = await module.exports.getOrders();
    const queue = orders.filter((o) => ['pending', 'preparing', 'ready'].includes(o.status));
    return queue;
  },

  getKitchenStats: async () => {
    if (!sql) {
      const db = require('./db');
      return db.getKitchenStats();
    }
    const rows = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending')    AS pending,
        COUNT(*) FILTER (WHERE status = 'preparing')  AS preparing,
        COUNT(*) FILTER (WHERE status = 'ready')      AS ready,
        COUNT(*) FILTER (WHERE status = 'delivery')   AS delivery,
        COUNT(*) FILTER (WHERE status = 'delivered')  AS delivered,
        AVG(EXTRACT(EPOCH FROM (ready_at - prepared_at))) AS avg_prep_seconds
      FROM orders;
    `;
    const r = rows[0] || {};
    return {
      pending: Number(r.pending) || 0,
      preparing: Number(r.preparing) || 0,
      ready: Number(r.ready) || 0,
      delivery: Number(r.delivery) || 0,
      delivered: Number(r.delivered) || 0,
      avgPrepSeconds: r.avg_prep_seconds ? Math.round(Number(r.avg_prep_seconds)) : null,
      avgPrepMinutes: r.avg_prep_seconds ? Math.round((Number(r.avg_prep_seconds) / 60) * 10) / 10 : null
    };
  },

  createOrder: async (order) => {
    if (!sql) {
      const db = require('./db');
      return db.createOrder(order);
    }

    const id = order.id || `order-${Date.now()}`;
    const items = Array.isArray(order.items) ? order.items : [];
    const totalRWF =
      Number(order.totalRWF) ||
      items.reduce((sum, it) => sum + (Number(it.qty) || 1) * (Number(it.price) || 0), 0);

    const orderRows = await sql`
      INSERT INTO orders (id, "customerName", phone, address, "totalRWF", status, "userId", "paymentType", "paymentStatus", lat, lng)
      VALUES (
        ${id}, ${order.customerName}, ${order.phone}, ${order.address}, ${totalRWF},
        ${order.status ? String(order.status).toLowerCase() : 'pending'},
        ${order.userId || null},
        ${order.paymentMethod || 'MTN Mobile Money'},
        ${order.paymentStatus || 'PAID'},
        ${order.lat || null}, ${order.lng || null}
      )
      RETURNING *;
    `;

    try {
      for (const item of items) {
        await sql`
          INSERT INTO order_items (id, "orderId", "mealId", name, qty, price, spice, broth, "specialNote")
          VALUES (
            ${`item-${Date.now()}-${Math.floor(Math.random() * 1000)}`},
            ${id}, ${item.mealId || null}, ${item.name}, ${Number(item.qty) || 1},
            ${Number(item.price) || 0}, ${item.spice || null}, ${item.broth || null},
            ${item.specialNote || null}
          );
        `;
      }
    } catch (err) {
      // Compensate for partial writes so we never persist an item-less order.
      await sql`DELETE FROM orders WHERE id = ${id};`.catch(() => {});
      throw err;
    }

    return module.exports.getOrderById(id);
  },

  updateOrderStatus: async (id, status, riderName, role) => {
    if (!sql) {
      const db = require('./db');
      return db.updateOrderStatus(id, status, riderName, role);
    }

    const orderRows = await sql`SELECT * FROM orders WHERE id = ${id} LIMIT 1;`;
    const current = orderRows[0];
    if (!current) return null;

    if (!orderFlow.canTransition(current.status, status, role)) {
      const err = new Error(`Invalid status transition: "${current.status}" -> "${status}"`);
      err.statusCode = 400;
      throw err;
    }

    const rows = await sql`
      UPDATE orders
      SET status = ${String(status).toLowerCase()},
          "riderName" = COALESCE(${riderName}, "riderName"),
          prepared_at = CASE WHEN ${status} = 'preparing' THEN COALESCE(prepared_at, NOW()) ELSE prepared_at END,
          ready_at = CASE WHEN ${status} = 'ready' THEN NOW() ELSE ready_at END,
          delivered_at = CASE WHEN ${status} = 'delivered' THEN NOW() ELSE delivered_at END,
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *;
    `;

    return module.exports.getOrderById(rows[0].id);
  },

  // Walk-in / counter order (no delivery address required)
  createWalkInOrder: async (order) => {
    if (!sql) {
      const db = require('./db');
      return db.createOrder({
        customerName: order.customerName || 'Walk-in',
        phone: order.phone || null,
        address: 'Counter',
        paymentMethod: 'Cash',
        paymentStatus: 'PAID',
        items: order.items
      });
    }

    const id = `order-${Date.now()}`;
    const items = Array.isArray(order.items) ? order.items : [];
    const totalRWF = items.reduce((sum, it) => sum + (Number(it.qty) || 1) * (Number(it.price) || 0), 0);

    await sql`
      INSERT INTO orders (id, "customerName", phone, address, "totalRWF", status, "paymentType", "paymentStatus")
      VALUES (
        ${id}, ${order.customerName || 'Walk-in'}, ${order.phone || null}, 'Counter',
        ${totalRWF}, 'pending', 'Cash', 'PAID'
      );
    `;

    for (const item of items) {
      await sql`
        INSERT INTO order_items (id, "orderId", "mealId", name, qty, price)
        VALUES (${`item-${Date.now()}-${Math.floor(Math.random() * 1000)}`}, ${id}, ${item.mealId || null}, ${item.name}, ${Number(item.qty) || 1}, ${Number(item.price) || 0});
      `;
    }

    return module.exports.getOrderById(id);
  },

  // --- Vouchers Queries ---
  getVouchers: async () => {
    if (!sql) return [];
    return await sql`SELECT * FROM vouchers ORDER BY created_at DESC;`;
  },

  createVoucher: async (voucher) => {
    const id = `voucher-${Date.now()}`;
    const rows = await sql`
      INSERT INTO vouchers (id, code, "discountAmount", description)
      VALUES (${id}, ${voucher.code}, ${voucher.discountAmount}, ${voucher.description || ''})
      RETURNING *;
    `;
    return rows[0];
  },

  // --- Admin Analytics ---
  getAdminAnalytics: async () => {
    if (!sql) return { totalRevenueRWF: 0, totalOrdersCount: 0, activeOrdersCount: 0 };
    const revRow = await sql`SELECT SUM("totalRWF") as total FROM orders WHERE status != 'cancelled';`;
    const counts = await sql`SELECT COUNT(id) as total, COUNT(CASE WHEN status NOT IN ('delivered', 'cancelled') THEN 1 END) as active FROM orders;`;
    
    return {
      totalRevenueRWF: revRow[0]?.total || 0,
      totalOrdersCount: counts[0]?.total || 0,
      activeOrdersCount: counts[0]?.active || 0,
    };
  }
};