// Kitchen Order Lifecycle State Machine
// Single source of truth for order status transitions across all data layers.
// Statuses are stored lowercase to match the frontend contract.

const VALID_STATUSES = ['pending', 'preparing', 'ready', 'delivery', 'delivered', 'cancelled'];

const ADMIN_ROLES = ['ADMIN'];
const KITCHEN_ROLES = ['KITCHEN'];
const DELIVERY_ROLES = ['DELIVERY'];

const STATUS_META = {
  pending: { label: 'Pending', color: 'bg-amber-500/20 text-amber-300' },
  preparing: { label: 'In Preparation', color: 'bg-blue-500/20 text-blue-300' },
  ready: { label: 'Ready for Pickup', color: 'bg-emerald-500/20 text-emerald-300' },
  delivery: { label: 'Out for Delivery', color: 'bg-violet-500/20 text-violet-300' },
  delivered: { label: 'Delivered', color: 'bg-green-500/20 text-green-300' },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/20 text-red-300' }
};

// Kitchen staff may run an order from intake through to dispatch hand-off.
const KITCHEN_TRANSITIONS = ['pending->preparing', 'preparing->ready'];
// Delivery riders own pickup and the final leg.
const DELIVERY_TRANSITIONS = ['ready->delivery', 'delivery->delivered'];

const normalizeStatus = (status) => String(status || '').toLowerCase();
const normalizeRole = (role) => (role == null ? '' : String(role).toUpperCase());

const isAdmin = (role) => ADMIN_ROLES.includes(normalizeRole(role));
const isKitchen = (role) => KITCHEN_ROLES.includes(normalizeRole(role));
const isDelivery = (role) => DELIVERY_ROLES.includes(normalizeRole(role));

// Decide whether a transition is permitted given the acting role.
// `role` may be undefined/null in tokenless demo mode -> treated as privileged demo user.
function canTransition(from, to, role) {
  const f = normalizeStatus(from);
  const t = normalizeStatus(to);
  if (!VALID_STATUSES.includes(f) || !VALID_STATUSES.includes(t)) return false;
  if (f === t) return false; // no-op

  const upper = normalizeRole(role);

  // Admins may force any valid transition (including cancel / recall).
  if (upper === 'ADMIN') return true;

  if (upper === 'KITCHEN') return KITCHEN_TRANSITIONS.includes(`${f}->${t}`);
  if (upper === 'DELIVERY') return DELIVERY_TRANSITIONS.includes(`${f}->${t}`);

  // Tokenless demo mode keeps the existing public PATCH /orders/:id/status flow working.
  if (!upper) return true;

  return false;
}

module.exports = {
  VALID_STATUSES,
  STATUS_META,
  KITCHEN_TRANSITIONS,
  DELIVERY_TRANSITIONS,
  normalizeStatus,
  normalizeRole,
  canTransition,
  isAdmin,
  isKitchen,
  isDelivery
};