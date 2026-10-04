// ---------------------------------------------------------------------------
// Shared constants and pure helpers for admin pages
// ---------------------------------------------------------------------------

export const RESTAURANT = Object.freeze([-1.97022762, 30.12498964]);
export const SNACKBAR_MS = 3500;
export const SNAPSHOT_POLL_MS = 15000;

export const MEAL_CATEGORIES = [
  { id: 'all', label: 'All Items' },
  { id: 'hotpot', label: 'Hotpot' },
  { id: 'pizzas', label: 'Pizzas' },
  { id: 'broths', label: 'Broths' },
  { id: 'noodles', label: 'Noodles' },
  { id: 'sides', label: 'Sides' },
  { id: 'drinks', label: 'Drinks' }
];

export const ORDER_STATUSES = ['ongoing', 'ready', 'delivered', 'cancelled'];

export const normalizeOrderStatus = (status) => {
  const s = String(status || '').toLowerCase().trim();
  if (s === 'canceled') return 'cancelled';
  if (s === 'delived') return 'delivered';
  if (['pending', 'preparing', 'delivery'].includes(s)) return 'ongoing';
  if (['ongoing', 'ready', 'delivered', 'cancelled'].includes(s)) return s;
  return s || 'ongoing';
};

export const STATUS_BADGE = {
  ongoing:   'bg-blue-500/20 text-blue-300 border-blue-500/50 font-semibold',
  ready:     'bg-emerald-500/25 text-emerald-300 border-emerald-500/70 font-bold shadow-sm shadow-emerald-500/20',
  delivered: 'bg-teal-500/20 text-teal-300 border-teal-500/50 font-semibold',
  cancelled: 'bg-red-500/20 text-red-300 border-red-500/50 font-semibold',
  pending:   'bg-blue-500/20 text-blue-300 border-blue-500/50 font-semibold',
  preparing: 'bg-blue-500/20 text-blue-300 border-blue-500/50 font-semibold',
  delivery:  'bg-blue-500/20 text-blue-300 border-blue-500/50 font-semibold'
};

export const statusLabel = (status) => {
  const norm = normalizeOrderStatus(status);
  return norm ? norm.charAt(0).toUpperCase() + norm.slice(1) : 'Unknown';
};

export const statusBadge = (status) => {
  const norm = normalizeOrderStatus(status);
  return STATUS_BADGE[norm] || STATUS_BADGE[status] || 'bg-slate-700/40 text-slate-300 border-slate-600/50 font-semibold';
};

export const isLiveStatus = (status) => {
  const norm = normalizeOrderStatus(status);
  return ['ongoing', 'ready'].includes(norm);
};

export const isRiderFree = (rider, activeDeliveryCount = 0) => {
  const deliveries = Number(rider?.activeDeliveries ?? activeDeliveryCount);
  return Boolean(rider?.is_available) && deliveries === 0 && !rider?.current_order_id;
};

export const isRiderBusy = (rider, activeDeliveryCount = 0) => {
  const deliveries = Number(rider?.activeDeliveries ?? activeDeliveryCount);
  return deliveries > 0 || Boolean(rider?.current_order_id) || rider?.status === 'busy';
};

export const rwf = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
export const formatRwf = (value) => rwf(value).toLocaleString('en-US');

export const formatWhen = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
};

export const formatClock = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/** RFC-4180 cell escape */
export const csvCell = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

export const downloadCsv = (filename, rows) => {
  const body = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${body}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const stamp = () => new Date().toISOString().slice(0, 10);

/** Resolve lat/lng from an order without inventing coordinates. */
export const destinationFor = (order) => {
  const lat = Number(order?.lat);
  const lng = Number(order?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
  return null;
};

export const ADMIN_NAV = [
  { id: 'overview', label: 'Overview & Analytics', short: 'Overview', path: '/hotpotadmin/overview' },
  { id: 'catalog',  label: 'Menu Catalog',          short: 'Catalog',  path: '/hotpotadmin/catalog'  },
  { id: 'orders',   label: 'Live Orders & Dispatch', short: 'Orders',   path: '/hotpotadmin/orders'   },
  { id: 'fleet',    label: 'Rider Fleet Governance', short: 'Fleet',    path: '/hotpotadmin/fleet'    },
  { id: 'sales',    label: 'Sales Ledger',           short: 'Sales',    path: '/hotpotadmin/sales'    },
  { id: 'reviews',  label: 'Reviews & Ratings',      short: 'Reviews',  path: '/hotpotadmin/reviews'  },
];
