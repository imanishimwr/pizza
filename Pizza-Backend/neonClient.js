// Neon Serverless PostgreSQL Database Client & Queries
const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

module.exports = {
  sql,

  // User Queries (Neon PostgreSQL)
  findUserByEmail: async (email) => {
    if (!sql) return null;
    const rows = await sql`SELECT * FROM users WHERE LOWER(email) = LOWER(${email}) LIMIT 1;`;
    return rows[0] || null;
  },

  findUserById: async (id) => {
    if (!sql || !id) return null;
    const rows = await sql`SELECT id, name, email, phone, avatar_url, role FROM users WHERE id = ${id} LIMIT 1;`;
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

  // --- Meals Queries ---
  getMeals: async () => {
    if (!sql) return [];
    try {
      const rows = await sql`SELECT * FROM meals ORDER BY created_at DESC;`;
      return rows.map(m => ({
        ...m,
        price: Number(m.price) || 0,
        rating: Number(m.rating) || 5.0,
        reviews: Number(m.reviewsCount || m.reviews || 0),
        spiceLevels: m.spiceLevels || ['Mild 🌶️', 'Medium 🌶️🌶️', 'Hot 🌶️🌶️🌶️'],
        broths: m.broths || (m.category === 'hotpot' ? ['Szechuan Spicy', 'Mushroom Herb', 'Tomato', 'Bone Broth'] : []),
        fallbackImage: m.fallbackImage || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80'
      }));
    } catch (err) {
      console.error('Error in getMeals:', err.message);
      return [];
    }
  },
  
  createMeal: async (meal) => {
    const id = meal.id || `meal-${Date.now()}`;
    const rows = await sql`
      INSERT INTO meals (id, name, category, price, description, image, spicy, "outOfStock")
      VALUES (${id}, ${meal.name}, ${meal.category}, ${meal.price}, ${meal.description || ''}, ${meal.image || ''}, ${meal.spicy || false}, ${meal.outOfStock || false})
      RETURNING *;
    `;
    const m = rows[0];
    return {
      ...m,
      price: Number(m.price) || 0,
      rating: Number(m.rating) || 5.0,
      reviews: Number(m.reviewsCount || m.reviews || 0),
      spiceLevels: m.spiceLevels || ['Mild 🌶️', 'Medium 🌶️🌶️', 'Hot 🌶️🌶️🌶️'],
      broths: m.broths || (m.category === 'hotpot' ? ['Szechuan Spicy', 'Mushroom Herb', 'Tomato', 'Bone Broth'] : []),
      fallbackImage: m.fallbackImage || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80'
    };
  },

  updateMeal: async (id, updates) => {
    // Basic fields updatable from Admin
    const rows = await sql`
      UPDATE meals 
      SET name = COALESCE(${updates.name}, name),
          price = COALESCE(${updates.price}, price),
          category = COALESCE(${updates.category}, category),
          description = COALESCE(${updates.description}, description),
          "outOfStock" = COALESCE(${updates.outOfStock}, "outOfStock"),
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *;
    `;
    if (!rows[0]) return null;
    const m = rows[0];
    return {
      ...m,
      price: Number(m.price) || 0,
      rating: Number(m.rating) || 5.0,
      reviews: Number(m.reviewsCount || m.reviews || 0),
      spiceLevels: m.spiceLevels || ['Mild 🌶️', 'Medium 🌶️🌶️', 'Hot 🌶️🌶️🌶️'],
      broths: m.broths || (m.category === 'hotpot' ? ['Szechuan Spicy', 'Mushroom Herb', 'Tomato', 'Bone Broth'] : []),
      fallbackImage: m.fallbackImage || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80'
    };
  },

  deleteMeal: async (id) => {
    const rows = await sql`DELETE FROM meals WHERE id = ${id} RETURNING id;`;
    return rows[0];
  },

  // --- Orders Queries ---
  // Security: always filter by the requesting user. A customer only ever sees
  // their own orders (by userId, or legacy orders linked through their phone).
  // Staff (ADMIN/KITCHEN/DELIVERY) may pass no filter to read all orders.
  getOrders: async ({ userId, phone, orderId } = {}) => {
    if (!sql) return [];
    try {
      let orders;
      if (orderId) {
        orders = await sql`SELECT * FROM orders WHERE id = ${orderId} ORDER BY created_at DESC;`;
      } else if (userId) {
        if (phone) {
          orders = await sql`SELECT * FROM orders WHERE "userId" = ${userId} OR ("userId" IS NULL AND phone = ${phone}) ORDER BY created_at DESC;`;
        } else {
          orders = await sql`SELECT * FROM orders WHERE "userId" = ${userId} ORDER BY created_at DESC;`;
        }
      } else {
        orders = await sql`SELECT * FROM orders ORDER BY created_at DESC;`;
      }
      let allItems = [];
      try {
        allItems = await sql`SELECT * FROM order_items;`;
      } catch (e) {
        console.warn('Could not query order_items:', e.message);
      }

      const itemsByOrder = {};
      for (const item of allItems) {
        const oId = item.orderId || item['order_id'];
        if (!itemsByOrder[oId]) itemsByOrder[oId] = [];
        itemsByOrder[oId].push({
          id: item.id,
          name: item.name,
          qty: Number(item.qty) || 1,
          price: Number(item.price) || 0,
          spice: item.spice || null,
          broth: item.broth || null,
          specialNote: item.specialNote || ''
        });
      }

      return orders.map(o => {
        const dateObj = o.created_at ? new Date(o.created_at) : new Date();
        return {
          ...o,
          id: o.id,
          userId: o.userId || o.user_id || null,
          customerName: o.customerName || o.customer_name || 'Customer',
          phone: o.phone || '',
          address: o.address || '',
          status: o.status || 'pending',
          totalRWF: Number(o.totalRWF || o.total_rwf || 0),
          riderName: o.riderName || o.rider_name || null,
          paymentMethod: o.paymentType || o.payment_method || 'MTN Mobile Money',
          paymentStatus: o.paymentStatus || 'PAID',
          orderTime: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          items: itemsByOrder[o.id] || []
        };
      });
    } catch (err) {
      console.error('Error in getOrders:', err.message);
      return [];
    }
  },

  createOrder: async (order) => {
    const id = order.id || `HP-${Math.floor(100000 + Math.random() * 900000)}`;
    const rows = await sql`
      INSERT INTO orders (id, "customerName", phone, address, lat, lng, "totalRWF", status, "userId", "paymentType")
      VALUES (${id}, ${order.customerName || 'Customer'}, ${order.phone || ''}, ${order.address || ''}, ${order.lat ?? null}, ${order.lng ?? null}, ${order.totalRWF || 0}, 'pending', ${order.userId || null}, ${order.paymentMethod || order.paymentType || 'MTN Mobile Money'})
      RETURNING *;
    `;
    const createdOrder = rows[0];

    const orderItems = Array.isArray(order.items) ? order.items : [];
    const insertedItems = [];
    for (const item of orderItems) {
      try {
        const itemId = `${id}-${item.id || Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const inserted = await sql`
          INSERT INTO order_items (id, "orderId", "mealId", name, qty, price, spice, broth, "specialNote")
          VALUES (
            ${itemId},
            ${id},
            ${item.id || item.mealId || ''},
            ${item.name || 'Dish'},
            ${Number(item.qty) || 1},
            ${Number(item.price) || 0},
            ${item.spice || null},
            ${item.broth || null},
            ${item.specialNote || null}
          )
          RETURNING *;
        `;
        if (inserted[0]) {
          insertedItems.push({
            ...inserted[0],
            qty: Number(inserted[0].qty) || 1,
            price: Number(inserted[0].price) || 0
          });
        }
      } catch (err) {
        console.warn('Could not insert order_item:', err.message);
      }
    }

    const dateObj = createdOrder.created_at ? new Date(createdOrder.created_at) : new Date();
    return {
      ...createdOrder,
      totalRWF: Number(createdOrder.totalRWF || order.totalRWF || 0),
      orderTime: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      items: insertedItems.length > 0 ? insertedItems : orderItems
    };
  },

  updateOrderStatus: async (id, status, riderName) => {
    const rows = await sql`
      UPDATE orders
      SET status = ${status},
          "riderName" = COALESCE(${riderName}, "riderName"),
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *;
    `;
    if (!rows[0]) return null;
    const o = rows[0];

    let items = [];
    try {
      items = await sql`SELECT * FROM order_items WHERE "orderId" = ${id};`;
    } catch (e) {}

    return {
      ...o,
      totalRWF: Number(o.totalRWF || o.total_rwf || 0),
      items: items.map(it => ({
        ...it,
        qty: Number(it.qty) || 1,
        price: Number(it.price) || 0
      }))
    };
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
