import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AddFoodItemModal from '../../components/admin/AddFoodItemModal';
import {
  Shield, TrendingUp, DollarSign, ShoppingBag, Users, Plus, UtensilsCrossed,
  Trash2, CheckCircle2, AlertCircle, Edit, RefreshCw, MapPin, Bike, Navigation,
  Download, Clock, Check, X, BarChart3, LineChart, Layers, ChevronRight,
  ChevronLeft, Activity, Search, Filter, Star, Flame, ChefHat, Phone, Home,
  Volume2, VolumeX, Printer
} from 'lucide-react';
import L from 'leaflet';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  assignRider,
  createRider,
  deleteMeal,
  getAdminAnalytics,
  getRiders,
  getReviews,
  reassignRider,
  setRiderAvailability,
  updateMeal
} from '../../services/apiService';
import { eventBus } from '../../services/eventBus';
import { notificationService } from '../../services/notificationService';

// ---------------------------------------------------------------------------
// Constants and small pure helpers
// ---------------------------------------------------------------------------

const RESTAURANT = Object.freeze([-1.97022762, 30.12498964]);
const SNACKBAR_MS = 3500;
const SNAPSHOT_POLL_MS = 15000;

const TABS = [
  { id: 'overview', label: 'Overview & Analytics', short: 'Overview', icon: TrendingUp },
  { id: 'catalog', label: 'Menu Catalog', short: 'Catalog', icon: UtensilsCrossed },
  { id: 'orders', label: 'Live Orders & Dispatch', short: 'Orders', icon: ShoppingBag },
  { id: 'fleet', label: 'Rider Fleet Governance', short: 'Fleet', icon: Bike },
  { id: 'sales', label: 'Sales Ledger & Financials', short: 'Financials', icon: DollarSign },
  { id: 'reviews', label: 'Reviews & Ratings', short: 'Reviews', icon: Star }
];

const MEAL_CATEGORIES = [
  { id: 'all', label: 'All Items' },
  { id: 'hotpot', label: 'Hotpot' },
  { id: 'pizzas', label: 'Pizzas' },
  { id: 'broths', label: 'Broths' },
  { id: 'noodles', label: 'Noodles' },
  { id: 'sides', label: 'Sides' },
  { id: 'drinks', label: 'Drinks' }
];

// The server only ever returns these six. Anything else is a bug, not a state.
const ORDER_STATUSES = ['pending', 'preparing', 'ready', 'delivery', 'delivered', 'cancelled'];

const STATUS_BADGE = {
  pending: 'bg-orange-500/20 text-orange-300 border-orange-500/50 font-semibold',
  preparing: 'bg-blue-500/20 text-blue-300 border-blue-500/50 font-semibold',
  ready: 'bg-emerald-500/25 text-emerald-300 border-emerald-500/70 font-bold shadow-sm shadow-emerald-500/20',
  delivery: 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-semibold',
  delivered: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-semibold',
  cancelled: 'bg-red-500/20 text-red-300 border-red-500/50 font-semibold'
};

const statusLabel = (status) => (status ? String(status).charAt(0).toUpperCase() + String(status).slice(1) : 'unknown');
const statusBadge = (status) => STATUS_BADGE[status] || 'bg-slate-700/40 text-slate-300 border-slate-600/50 font-semibold';
const isLiveStatus = (status) => ['pending', 'preparing', 'ready', 'delivery'].includes(status);

const rwf = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const formatRwf = (value) => rwf(value).toLocaleString('en-US');
const formatWhen = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
};
const formatClock = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/** RFC-4180 cell. The old exporter pasted raw values, so a comma in a customer
 *  name silently shifted every following column. */
const csvCell = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const downloadCsv = (filename, rows) => {
  const body = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  // The BOM keeps Excel from mangling the accented place names.
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

const stamp = () => new Date().toISOString().slice(0, 10);

/** Resolve a destination without inventing a geocode for it. */
const destinationFor = (order) => {
  const lat = Number(order?.lat);
  const lng = Number(order?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
  return null;
};

const isRiderFree = (rider) => Boolean(rider?.is_available) && rider?.status === 'available' && !rider?.current_order_id;
const isRiderBusy = (rider) => rider?.status === 'busy' || Boolean(rider?.current_order_id);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminDashboard({
  meals = [],
  onMealsChange,
  orders = [],
  loading = false,
  error = null,
  onRetry,
  onUpdateStatus,
  onCancelOrder,
  user,
  onGoHome
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  const [chartMode, setChartMode] = useState('line');
  const [hoveredDay, setHoveredDay] = useState(null);

  // Banner instead of a toast: a failed request must stay readable, not blink away.
  const [banner, setBanner] = useState(null); // { tone: 'error' | 'success', text }
  const bannerTimerRef = useRef(null);

  const announce = useCallback((tone, text) => {
    setBanner({ tone, text });
    window.clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = window.setTimeout(() => setBanner(null), SNACKBAR_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(bannerTimerRef.current), []);

  // Catalog
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [mealSearch, setMealSearch] = useState('');
  const [mealCategoryFilter, setMealCategoryFilter] = useState('all');
  const [mealPage, setMealPage] = useState(1);
  const mealsPerPage = 6;

  const [editingMeal, setEditingMeal] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategory, setEditCategory] = useState('hotpot');
  const [editDesc, setEditDesc] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [busyMealId, setBusyMealId] = useState(null);

  // Orders
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderPage, setOrderPage] = useState(1);
  const ordersPerPage = 6;
  const [pendingStatusChange, setPendingStatusChange] = useState(null); // `${id}:${status}`
  const [trackingOrderId, setTrackingOrderId] = useState(null);

  // Sales ledger
  const [salesSearch, setSalesSearch] = useState('');
  const [salesPaymentFilter, setSalesPaymentFilter] = useState('all');
  const [salesStatusFilter, setSalesStatusFilter] = useState('all');
  const [salesPage, setSalesPage] = useState(1);
  const salesPerPage = 8;

  // Server snapshot (not prop-provided, so this component owns the polling)
  const [analytics, setAnalytics] = useState(null);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [riders, setRiders] = useState([]);
  const [ridersError, setRidersError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fleet
  const [showAddRiderModal, setShowAddRiderModal] = useState(false);
  const [isSavingRider, setIsSavingRider] = useState(false);
  const [newRiderForm, setNewRiderForm] = useState({
    name: '',
    phone: '',
    plateNumber: '',
    vehicleType: '',
    shift: 'Day Shift (08:00 - 16:00)'
  });
  const [riderDraft, setRiderDraft] = useState({}); // orderId -> riderId
  const [dispatchingOrderId, setDispatchingOrderId] = useState(null);
  const [togglingRiderId, setTogglingRiderId] = useState(null);
  const [riderSearch, setRiderSearch] = useState('');
  const [riderStatusFilter, setRiderStatusFilter] = useState('all');
  const [reassignTarget, setReassignTarget] = useState(null); // { orderId, fromRiderId }
  const [isReassigning, setIsReassigning] = useState(false);

  // Leaflet
  const [mapNode, setMapNode] = useState(null);
  const mapRef = useRef(null);

  // -------------------------------------------------------------------------
  // Clock
  // -------------------------------------------------------------------------
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // -------------------------------------------------------------------------
  // Server snapshot
  // -------------------------------------------------------------------------
  const loadSnapshot = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setIsRefreshing(true);
    const results = await Promise.allSettled([
      getAdminAnalytics(),
      getRiders(),
      getReviews()
    ]);

    const [analyticsResult, ridersResult, reviewsResult] = results;

    if (analyticsResult.status === 'fulfilled') {
      setAnalytics(analyticsResult.value || null);
      setAnalyticsError(null);
    } else {
      setAnalytics(null);
      setAnalyticsError(analyticsResult.reason?.message || 'Could not load analytics.');
    }

    if (ridersResult.status === 'fulfilled') {
      setRiders(Array.isArray(ridersResult.value) ? ridersResult.value : []);
      setRidersError(null);
    } else {
      setRiders([]);
      setRidersError(ridersResult.reason?.message || 'Could not load the rider fleet.');
    }

    if (reviewsResult.status === 'fulfilled') {
      setReviews(Array.isArray(reviewsResult.value) ? reviewsResult.value : []);
    } else {
      setReviews([]);
    }

    if (!quiet) setIsRefreshing(false);
  }, []);

  useEffect(() => {
    loadSnapshot();

    const timer = window.setInterval(() => {
      if (!document.hidden) loadSnapshot({ quiet: true });
    }, SNAPSHOT_POLL_MS);

    // App.jsx owns the socket; ride on its bus instead of opening our own.
    const offNewOrder = eventBus.on('NEW_ORDER', () => loadSnapshot({ quiet: true }));
    const offStatus = eventBus.on('ORDER_STATUS_UPDATE', () => loadSnapshot({ quiet: true }));

    return () => {
      window.clearInterval(timer);
      offNewOrder();
      offStatus();
    };
  }, [loadSnapshot]);

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------
  const displayOrders = useMemo(() => (Array.isArray(orders) ? orders : []), [orders]);

  const readyOrders = useMemo(() => displayOrders.filter((o) => o.status === 'ready'), [displayOrders]);
  const activeKitchenCount = useMemo(
    () => displayOrders.filter((o) => o.status === 'pending' || o.status === 'preparing').length,
    [displayOrders]
  );
  const soldOrders = useMemo(
    () => displayOrders.filter((o) => o.status === 'delivery' || o.status === 'delivered'),
    [displayOrders]
  );
  const soldRevenue = useMemo(
    () => soldOrders.reduce((acc, o) => acc + rwf(o.totalRWF), 0),
    [soldOrders]
  );
  const soldItemsCount = useMemo(
    () => soldOrders.reduce((acc, o) => acc + (o.items || []).reduce((sum, it) => sum + (Number(it.qty) || 1), 0), 0),
    [soldOrders]
  );

  const trackingOrder = useMemo(
    () => displayOrders.find((o) => String(o.id) === String(trackingOrderId)) || null,
    [displayOrders, trackingOrderId]
  );

  const assignedRider = useMemo(() => {
    if (!trackingOrder?.riderId) return null;
    return riders.find((r) => String(r.id) === String(trackingOrder.riderId)) || null;
  }, [riders, trackingOrder]);

  // Server aggregates are the source of truth; the local list is only a label.
  const topSellingDishes = useMemo(() => {
    const serverRows = Array.isArray(analytics?.topDishes) ? analytics.topDishes : null;
    if (serverRows && serverRows.length > 0) {
      return serverRows.slice(0, 5).map((row) => ({
        name: row.name,
        qty: rwf(row.qty),
        revenue: rwf(row.revenueRWF)
      }));
    }
    // No server aggregate (or the request failed): derive it from the orders we
    // were actually handed. Never invent a leaderboard from the menu catalog.
    const dishMap = new Map();
    for (const order of displayOrders) {
      for (const item of order.items || []) {
        const name = item.name || 'Dish';
        const entry = dishMap.get(name) || { name, qty: 0, revenue: 0 };
        const qty = Number(item.qty) || 1;
        entry.qty += qty;
        entry.revenue += (Number(item.price) || 0) * qty;
        dishMap.set(name, entry);
      }
    }
    return [...dishMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [analytics, displayOrders]);

  /** Seven local calendar days, bucketed from the real order timestamps. */
  const weeklyData = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const buckets = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
        day: dayNames[d.getDay()],
        label: d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }),
        rev: 0,
        orders: 0
      });
    }
    const byKey = new Map(buckets.map((b) => [b.key, b]));
    for (const order of displayOrders) {
      if (!order.createdAt) continue;
      const date = new Date(order.createdAt);
      if (Number.isNaN(date.getTime())) continue;
      const bucket = byKey.get(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
      if (!bucket) continue;
      bucket.rev += rwf(order.totalRWF);
      bucket.orders += 1;
    }
    return buckets;
  }, [displayOrders, now]);

  const weeklyTotals = useMemo(() => {
    const hasOrders = weeklyData.some((d) => d.orders > 0);
    return {
      hasOrders,
      orders: weeklyData.reduce((sum, d) => sum + d.orders, 0),
      rev: weeklyData.reduce((sum, d) => sum + d.rev, 0)
    };
  }, [weeklyData]);

  const filteredMeals = useMemo(() => {
    const q = mealSearch.trim().toLowerCase();
    return meals.filter((meal) => {
      const matchCategory = mealCategoryFilter === 'all' || String(meal.category || '').toLowerCase() === mealCategoryFilter;
      const matchSearch =
        !q ||
        String(meal.name || '').toLowerCase().includes(q) ||
        String(meal.description || '').toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }, [meals, mealCategoryFilter, mealSearch]);

  const totalMealPages = Math.max(1, Math.ceil(filteredMeals.length / mealsPerPage));
  const paginatedMeals = filteredMeals.slice((mealPage - 1) * mealsPerPage, mealPage * mealsPerPage);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return displayOrders.filter((order) => {
      const matchStatus = orderStatusFilter === 'all' || order.status === orderStatusFilter;
      const matchSearch =
        !q ||
        String(order.id).toLowerCase().includes(q) ||
        String(order.customerName || '').toLowerCase().includes(q) ||
        String(order.phone || '').includes(q) ||
        String(order.address || '').toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [displayOrders, orderStatusFilter, orderSearch]);

  const totalOrderPages = Math.max(1, Math.ceil(filteredOrders.length / ordersPerPage));
  const paginatedOrders = filteredOrders.slice((orderPage - 1) * ordersPerPage, orderPage * ordersPerPage);

  const filteredSoldOrders = useMemo(() => {
    const q = salesSearch.trim().toLowerCase();
    return soldOrders.filter((order) => {
      const matchSearch =
        !q ||
        String(order.id).toLowerCase().includes(q) ||
        String(order.customerName || '').toLowerCase().includes(q) ||
        String(order.phone || '').includes(q) ||
        (order.items || []).some((it) => String(it.name || '').toLowerCase().includes(q));
      const matchPay =
        salesPaymentFilter === 'all' ||
        String(order.paymentMethod || '').toLowerCase().includes(salesPaymentFilter);
      const matchStatus = salesStatusFilter === 'all' || order.status === salesStatusFilter;
      return matchSearch && matchPay && matchStatus;
    });
  }, [soldOrders, salesSearch, salesPaymentFilter, salesStatusFilter]);

  const totalSalesPages = Math.max(1, Math.ceil(filteredSoldOrders.length / salesPerPage));
  const paginatedSoldOrders = filteredSoldOrders.slice((salesPage - 1) * salesPerPage, salesPage * salesPerPage);

  const reviewAverages = useMemo(() => {
    if (reviews.length === 0) return { pizza: null, rider: null };
    const sum = (pick) => reviews.reduce((acc, rev) => acc + (Number(pick(rev)) || 0), 0);
    return {
      pizza: sum((rev) => rev.pizzaRating) / reviews.length,
      rider: sum((rev) => rev.riderRating) / reviews.length
    };
  }, [reviews]);

  const filteredRiders = useMemo(() => {
    const q = riderSearch.trim().toLowerCase();
    return riders.filter((rider) => {
      const matchQuery =
        !q ||
        String(rider.name || '').toLowerCase().includes(q) ||
        String(rider.phone || '').includes(q) ||
        String(rider.plateNumber || '').toLowerCase().includes(q) ||
        String(rider.vehicleType || '').toLowerCase().includes(q);
      let matchStatus = true;
      if (riderStatusFilter === 'available') matchStatus = isRiderFree(rider);
      else if (riderStatusFilter === 'busy') matchStatus = isRiderBusy(rider);
      else if (riderStatusFilter === 'off_duty') matchStatus = !rider.is_available;
      return matchQuery && matchStatus;
    });
  }, [riders, riderSearch, riderStatusFilter]);

  // -------------------------------------------------------------------------
  // Orders: status transitions
  // -------------------------------------------------------------------------

  /**
   * Only transitions the server actually accepts are rendered, and only for
   * `ready` do we hide the status button: `ready -> delivery` is the rider's
   * handover step and is gated by a code the admin must not be able to skip.
   */
  const transitionsFor = (order) => {
    if (!onUpdateStatus) return [];
    if (order.status === 'pending') return [{ to: 'preparing', label: 'Accept & Cook', tone: 'blue' }];
    if (order.status === 'preparing') return [{ to: 'ready', label: 'Mark Cooker Ready', tone: 'emerald' }];
    if (order.status === 'delivery') return [{ to: 'delivered', label: 'Mark Delivered', tone: 'emerald' }];
    return [];
  };

  const toneClass = {
    blue: 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-600 hover:text-white',
    emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600 hover:text-white'
  };

  const handleUpdateStatus = async (order, to) => {
    const key = `${order.id}:${to}`;
    if (pendingStatusChange) return;
    setPendingStatusChange(key);
    try {
      await onUpdateStatus(order.id, to);
      if (soundEnabled) notificationService.playChime('status_update');
      announce('success', `Order #${order.id} is now ${statusLabel(to).toLowerCase()}.`);
    } catch (err) {
      // Never report success for a request the server rejected.
      announce('error', err?.message || `Could not move order #${order.id} to ${to}.`);
    } finally {
      setPendingStatusChange(null);
    }
  };

  const handleCancelOrder = async (order) => {
    if (!onCancelOrder) return;
    if (pendingStatusChange) return;
    if (!window.confirm(`Cancel order #${order.id}? This cannot be undone.`)) return;
    setPendingStatusChange(`${order.id}:cancelled`);
    try {
      await onCancelOrder(order.id);
      announce('success', `Order #${order.id} cancelled.`);
    } catch (err) {
      announce('error', err?.message || `Could not cancel order #${order.id}.`);
    } finally {
      setPendingStatusChange(null);
    }
  };

  // -------------------------------------------------------------------------
  // Dispatch
  // -------------------------------------------------------------------------
  const freeRiders = useMemo(() => riders.filter(isRiderFree), [riders]);

  const handleAssignRider = async (order, riderId) => {
    if (!riderId) {
      announce('error', 'Choose a courier before dispatching.');
      return;
    }
    if (dispatchingOrderId) return;
    setDispatchingOrderId(order.id);
    try {
      await assignRider(order.id, riderId);
      if (soundEnabled) notificationService.playChime('order_ready');
      const rider = riders.find((r) => String(r.id) === String(riderId));
      announce('success', `Order #${order.id} dispatched to ${rider?.name || 'courier'}.`);
      setRiderDraft((prev) => {
        const next = { ...prev };
        delete next[order.id];
        return next;
      });
      await loadSnapshot({ quiet: true });
    } catch (err) {
      // 409 = the courier or the order was taken in the meantime.
      announce('error', err?.message || `Could not dispatch order #${order.id}.`);
    } finally {
      setDispatchingOrderId(null);
    }
  };

  const handleReassignRider = async ({ orderId, newRiderId }) => {
    if (isReassigning) return;
    setIsReassigning(true);
    try {
      await reassignRider(orderId, newRiderId || null);
      announce('success', newRiderId ? `Order #${orderId} reassigned.` : `Order #${orderId} released back to the ready queue.`);
      setReassignTarget(null);
      await loadSnapshot({ quiet: true });
    } catch (err) {
      announce('error', err?.message || `Could not reassign order #${orderId}.`);
    } finally {
      setIsReassigning(false);
    }
  };

  const handleToggleRiderAvailability = async (rider) => {
    if (togglingRiderId) return;
    setTogglingRiderId(rider.id);
    try {
      const updated = await setRiderAvailability(rider.id, !rider.is_available);
      setRiders((prev) => prev.map((r) => (String(r.id) === String(rider.id) ? updated : r)));
      announce('success', `${rider.name} is now ${updated.is_available ? 'on duty' : 'off duty'}.`);
    } catch (err) {
      announce('error', err?.message || `Could not change duty status for ${rider.name}.`);
    } finally {
      setTogglingRiderId(null);
    }
  };

  const handleCreateRider = async (e) => {
    e.preventDefault();
    if (!newRiderForm.name.trim() || !newRiderForm.phone.trim()) return;
    setIsSavingRider(true);
    try {
      const created = await createRider({
        name: newRiderForm.name.trim(),
        phone: newRiderForm.phone.trim(),
        plateNumber: newRiderForm.plateNumber.trim(),
        vehicleType: newRiderForm.vehicleType.trim(),
        shift: newRiderForm.shift
      });
      setRiders((prev) => [created, ...prev]);
      setShowAddRiderModal(false);
      setNewRiderForm({ name: '', phone: '', plateNumber: '', vehicleType: '', shift: 'Day Shift (08:00 - 16:00)' });
      announce('success', `${created.name} added to the fleet.`);
    } catch (err) {
      announce('error', err?.message || 'Could not register that courier.');
    } finally {
      setIsSavingRider(false);
    }
  };

  // -------------------------------------------------------------------------
  // Catalog mutations
  // -------------------------------------------------------------------------
  const openEditMeal = (meal) => {
    setEditingMeal(meal);
    setEditName(meal.name || '');
    setEditPrice(String(meal.price ?? ''));
    setEditCategory(meal.category || 'hotpot');
    setEditDesc(meal.description || '');
  };

  const handleSaveEditMeal = async (e) => {
    e.preventDefault();
    if (!editingMeal) return;
    const price = Number(editPrice);
    if (!editName.trim() || !Number.isFinite(price) || price < 0) {
      announce('error', 'Enter a dish name and a valid price.');
      return;
    }
    setIsSavingEdit(true);
    try {
      await updateMeal(editingMeal.id, {
        name: editName.trim(),
        price,
        category: editCategory,
        description: editDesc.trim()
      });
      setEditingMeal(null);
      await onMealsChange?.();
      announce('success', `${editName.trim()} updated.`);
    } catch (err) {
      announce('error', err?.message || 'Could not save that dish.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleToggleStock = async (meal) => {
    if (busyMealId) return;
    setBusyMealId(meal.id);
    try {
      await updateMeal(meal.id, { outOfStock: !meal.outOfStock });
      await onMealsChange?.();
    } catch (err) {
      announce('error', err?.message || `Could not update ${meal.name}.`);
    } finally {
      setBusyMealId(null);
    }
  };

  const handleDeleteMeal = async (meal) => {
    if (busyMealId) return;
    if (!window.confirm(`Remove "${meal.name}" from the menu catalog?`)) return;
    setBusyMealId(meal.id);
    try {
      await deleteMeal(meal.id);
      await onMealsChange?.();
      announce('success', `${meal.name} removed.`);
    } catch (err) {
      announce('error', err?.message || `Could not remove ${meal.name}.`);
    } finally {
      setBusyMealId(null);
    }
  };

  // -------------------------------------------------------------------------
  // Exports
  // -------------------------------------------------------------------------
  const handleExportOrdersCsv = () => {
    if (displayOrders.length === 0) {
      announce('error', 'There are no orders to export yet.');
      return;
    }
    downloadCsv(`HotPot_Orders_${stamp()}.csv`, [
      ['Order ID', 'Created', 'Customer', 'Phone', 'Address', 'Status', 'Order type', 'Payment', 'Total RWF', 'Rider', 'Items'],
      ...displayOrders.map((o) => [
        o.id,
        formatWhen(o.createdAt),
        o.customerName,
        o.phone,
        o.address,
        o.status,
        o.orderType,
        o.paymentMethod,
        o.totalRWF,
        o.riderName || '',
        (o.items || []).map((i) => `${i.qty}x ${i.name}`).join('; ')
      ])
    ]);
  };

  const handleExportSalesCsv = () => {
    if (soldOrders.length === 0) {
      announce('error', 'No dispatched or delivered orders to export yet.');
      return;
    }
    downloadCsv(`HotPot_Sales_${stamp()}.csv`, [
      ['Order ID', 'Created', 'Customer', 'Phone', 'Address', 'Items', 'Payment method', 'Total RWF', 'Status'],
      ...soldOrders.map((o) => [
        o.id,
        formatWhen(o.createdAt),
        o.customerName,
        o.phone,
        o.address,
        (o.items || []).map((i) => `${i.qty}x ${i.name}`).join('; '),
        o.paymentMethod,
        o.totalRWF,
        o.status
      ])
    ]);
  };

  const handleExportReportPdf = () => {
    if (!analytics && displayOrders.length === 0) {
      announce('error', 'There is no data to report on yet.');
      return;
    }
    try {
      const doc = new jsPDF();
      const centre = doc.internal.pageSize.getWidth() / 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('HotPot Delights - Business Report', centre, 18, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Generated ${new Date().toLocaleString()}`, centre, 25, { align: 'center' });

      let cursor = 34;
      autoTable(doc, {
        startY: cursor,
        theme: 'grid',
        headStyles: { fillColor: [174, 50, 0] },
        head: [['Metric', 'Value']],
        body: [
          ['Total revenue (RWF)', analytics ? formatRwf(analytics.totalRevenueRWF) : 'No data yet'],
          ['Delivered revenue (RWF)', analytics ? formatRwf(analytics.deliveredRevenueRWF) : 'No data yet'],
          ['Total orders', analytics ? String(analytics.totalOrdersCount) : 'No data yet'],
          ['Active orders', analytics ? String(analytics.activeOrdersCount) : 'No data yet'],
          ['Delivered orders', analytics ? String(analytics.deliveredOrdersCount) : 'No data yet'],
          ['Average ticket (RWF)', analytics ? formatRwf(analytics.avgTicketRWF) : 'No data yet'],
          ['Riders on the road', analytics ? String(analytics.ridersOnline ?? riders.length) : 'No data yet'],
          ['Riders registered', analytics ? String(analytics.ridersTotal ?? riders.length) : 'No data yet'],
          ['Orders in this browser session', String(displayOrders.length)]
        ]
      });
      cursor = doc.lastAutoTable.finalY + 10;

      autoTable(doc, {
        startY: cursor,
        head: [['Dish', 'Quantity sold', 'Revenue (RWF)']],
        body: topSellingDishes.length
          ? topSellingDishes.map((d) => [d.name, String(d.qty), formatRwf(d.revenue)])
          : [['No dish sales recorded yet', '', '']]
      });
      cursor = doc.lastAutoTable.finalY + 10;

      autoTable(doc, {
        startY: cursor,
        head: [['Date', 'Orders', 'Revenue (RWF)']],
        body: weeklyData.map((d) => [d.label, String(d.orders), formatRwf(d.rev)])
      });
      cursor = doc.lastAutoTable.finalY + 10;

      autoTable(doc, {
        startY: cursor,
        head: [['Order', 'Created', 'Customer', 'Status', 'Total RWF']],
        body: soldOrders.length
          ? soldOrders.map((o) => [String(o.id), formatWhen(o.createdAt), o.customerName || '', o.status, formatRwf(o.totalRWF)])
          : [['No dispatched or delivered orders yet', '', '', '', '']]
      });

      doc.save(`HotPot_Report_${stamp()}.pdf`);
    } catch (err) {
      announce('error', err?.message || 'Could not build the PDF report.');
    }
  };

  /**
   * 80mm thermal kitchen slip, generated with jsPDF. The previous version wrote
   * an HTML string into a new window, which executed whatever the customer typed
   * into the order name.
   */
  const handlePrintTicket = (order) => {
    try {
      const width = 80;
      const margin = 4;
      const doc = new jsPDF({ unit: 'mm', format: [width, 150] });
      const inner = width - margin * 2;
      let y = 8;

      doc.setFont('courier', 'bold');
      doc.setFontSize(11);
      doc.text('HOTPOT DELIGHTS', width / 2, y, { align: 'center' });
      y += 4.5;
      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      doc.text('Kigali Kitchen & Dispatch Station', width / 2, y, { align: 'center' });
      y += 3;
      doc.setDrawColor(0);
      doc.setLineDashPattern([0.6, 0.6], 0);
      doc.line(margin, y, width - margin, y);
      y += 5;

      doc.setFont('courier', 'bold');
      doc.setFontSize(10);
      doc.text(`ORDER #${order.id}`, margin, y);
      y += 4.5;
      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.text(`Date: ${formatWhen(order.createdAt) || 'unknown'}`, margin, y);
      y += 4;
      doc.text(`Status: ${(order.status || 'unknown').toUpperCase()}`, margin, y);
      y += 4;
      doc.text(`Type: ${order.orderType || 'delivery'}`, margin, y);
      y += 4;
      doc.text(`Customer: ${order.customerName || 'Customer'}`, margin, y);
      y += 4;
      doc.text(`Phone: ${order.phone || 'N/A'}`, margin, y);
      y += 4;
      doc.text(`Courier: ${order.riderName || 'Unassigned'}`, margin, y);
      y += 5;

      doc.setLineDashPattern([], 0);
      doc.line(margin, y, width - margin, y);
      y += 5;

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        theme: 'plain',
        styles: { font: 'courier', fontSize: 8, cellPadding: 1.2 },
        headStyles: { font: 'courier', fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: inner * 0.7 }, 1: { cellWidth: inner * 0.3, halign: 'right' } },
        head: [['Item', 'RWF']],
        body: (order.items || []).map((item) => [
          `${item.qty || 1}x ${item.name}${item.spice ? ` [${item.spice}]` : ''}`,
          formatRwf((Number(item.price) || 0) * (Number(item.qty) || 1))
        ])
      });
      y = doc.lastAutoTable.finalY + 2;

      doc.setLineDashPattern([0.6, 0.6], 0);
      doc.line(margin, y, width - margin, y);
      y += 5;
      doc.setFont('courier', 'bold');
      doc.setFontSize(10);
      doc.text('TOTAL', margin, y);
      doc.text(formatRwf(order.totalRWF), width - margin, y, { align: 'right' });
      y += 5;

      if (order.notes) {
        doc.setFont('courier', 'bold');
        doc.setFontSize(8);
        const noteLines = doc.splitTextToSize(`NOTE: ${order.notes}`, inner);
        doc.text(noteLines, margin, y);
        y += noteLines.length * 3.5 + 2;
      }

      if (order.address) {
        doc.setFont('courier', 'normal');
        doc.setFontSize(8);
        const addressLines = doc.splitTextToSize(`Deliver to: ${order.address}`, inner);
        doc.text(addressLines, margin, y);
        y += addressLines.length * 3.5 + 2;
      }

      // Trim the roll to the content instead of printing a page of whitespace.
      const finalHeight = Math.min(y + 6, 297);
      if (finalHeight < doc.internal.pageSize.getHeight()) {
        doc.internal.pageSize.setHeight(finalHeight);
      }

      doc.save(`HotPot_Kitchen_Ticket_${order.id}.pdf`);
    } catch (err) {
      announce('error', err?.message || `Could not build the ticket for order #${order.id}.`);
    }
  };

  // -------------------------------------------------------------------------
  // Leaflet: create once per container, then only update layers.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!mapNode) return undefined;
    const map = L.map(mapNode).setView(RESTAURANT, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);
    mapRef.current = map;

    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      map.remove();
      mapRef.current = null;
    };
  }, [mapNode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !trackingOrder) return undefined;

    const destination = destinationFor(trackingOrder);
    const bounds = destination ? [RESTAURANT, destination] : [RESTAURANT];
    const layers = [];

    // circleMarker renders SVG, so there is no HTML to inject and no default
    // marker image to 404 against a bundler.
    const restaurantMarker = L.circleMarker(RESTAURANT, {
      radius: 9,
      color: '#ffffff',
      weight: 2,
      fillColor: '#AE3200',
      fillOpacity: 1
    }).addTo(map);
    const restaurantPopup = document.createElement('div');
    restaurantPopup.textContent = 'HotPot Delights kitchen';
    restaurantMarker.bindPopup(restaurantPopup);
    layers.push(restaurantMarker);

    if (destination) {
      const destinationMarker = L.circleMarker(destination, {
        radius: 9,
        color: '#ffffff',
        weight: 2,
        fillColor: '#128731',
        fillOpacity: 1
      }).addTo(map);
      const destinationPopup = document.createElement('div');
      destinationPopup.textContent = trackingOrder.customerName || 'Drop-off point';
      destinationMarker.bindPopup(destinationPopup);
      layers.push(destinationMarker);

      L.polyline([RESTAURANT, destination], {
        color: '#AE3200',
        weight: 4,
        dashArray: '8 8',
        opacity: 0.85
      }).addTo(map);
      layers.push(map._layers);
    }

    if (assignedRider) {
      const live = [assignedRider.lastLat, assignedRider.lastLng].map(Number);
      const hasFix = Number.isFinite(live[0]) && Number.isFinite(live[1]);
      const position = hasFix ? live : RESTAURANT;
      layers.push(
        L.circleMarker(position, {
          radius: 8,
          color: '#60a5fa',
          weight: 3,
          fillColor: '#2563eb',
          fillOpacity: 1
        })
          .addTo(map)
          .bindPopup(assignedRider.name || 'Courier')
      );
    }

    map.fitBounds(bounds, { padding: [45, 45] });

    return () => {
      for (const layer of layers) {
        if (layer && typeof layer.remove === 'function') layer.remove();
      }
    };
  }, [mapNode, trackingOrder, assignedRider]);

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------
  const badgeFor = (tabId) => {
    if (tabId === 'catalog') return meals.length;
    if (tabId === 'orders') return displayOrders.length;
    if (tabId === 'fleet') return riders.length;
    if (tabId === 'sales') return soldOrders.length;
    if (tabId === 'reviews') return reviews.length;
    return undefined;
  };

  const kpi = (value, suffix) => (
    <>
      {value === null ? <span className="text-slate-500">&mdash;</span> : <span>{value.toLocaleString()}</span>}{' '}
      <span className="text-xs text-slate-400 font-sans font-normal">{suffix}</span>
    </>
  );

  const trackingDestination = trackingOrder ? destinationFor(trackingOrder) : null;
  const riderHasFix = Boolean(assignedRider) &&
    Number.isFinite(Number(assignedRider?.lastLat)) &&
    Number.isFinite(Number(assignedRider?.lastLng));

  return (
    <div className="fixed inset-0 z-30 flex bg-[#0F1117] text-white overflow-hidden font-sans select-auto">
      {/* Announcements. Errors are assertive and do not auto-dismiss. */}
      <div aria-live="polite" className="sr-only">
        {banner?.tone === 'success' ? banner.text : ''}
      </div>
      {banner && (
        <div
          role={banner.tone === 'error' ? 'alert' : 'status'}
          aria-live={banner.tone === 'error' ? 'assertive' : 'polite'}
          className={`fixed top-20 right-4 sm:right-8 z-50 max-w-sm px-4 py-2.5 rounded-xl shadow-2xl flex items-start gap-2 text-xs font-bold border ${
            banner.tone === 'error'
              ? 'bg-red-950/95 text-red-200 border-red-500/50'
              : 'bg-emerald-950/95 text-emerald-200 border-emerald-500/40'
          }`}
        >
          {banner.tone === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-px" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-px" aria-hidden="true" />
          )}
          <span>{banner.text}</span>
        </div>
      )}

      {isMobileDrawerOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setIsMobileDrawerOpen(false)}
          className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm"
        />
      )}

      {/* ══════════════════════════ SIDEBAR ══════════════════════════ */}
      <aside
        className={`flex flex-col bg-[#12141A] border-r border-slate-800 transition-all duration-300 fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] shadow-2xl ${
          isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 md:static md:z-30 md:shadow-none ${isSidebarCollapsed ? 'md:w-16' : 'md:w-64'}`}
      >
        <div className="h-14 border-b border-slate-800 flex items-center justify-between px-3 shrink-0">
          {!isSidebarCollapsed ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  onGoHome?.();
                }}
                className="w-8 h-8 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 hover:text-white border border-orange-500/40 flex items-center justify-center shrink-0 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                title="Return to the store menu"
                aria-label="Return to the store menu"
              >
                <Home className="w-4 h-4" aria-hidden="true" />
              </button>
              <div className="min-w-0">
                <span className="text-xs font-black tracking-wider text-white uppercase block truncate">HotPot Admin</span>
                <span className="text-[10px] text-orange-400 font-bold block truncate">Operations console</span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsMobileDrawerOpen(false);
                onGoHome?.();
              }}
              className="w-8 h-8 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 hover:text-white border border-orange-500/40 flex items-center justify-center mx-auto transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              title="Return to the store menu"
              aria-label="Return to the store menu"
            >
              <Home className="w-4 h-4" aria-hidden="true" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(false)}
            className="md:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all min-h-11 min-w-11 flex items-center justify-center shrink-0 ml-auto"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5 text-orange-400" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            className={`hidden md:flex p-1.5 rounded-lg bg-[#1F242D] hover:bg-white/10 border border-slate-700/50 text-slate-400 hover:text-white transition-all ${isSidebarCollapsed ? 'invisible' : ''}`}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 space-y-3.5">
          <div className="space-y-1">
            {!isSidebarCollapsed && (
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2.5 mb-1.5 block">
                Management views
              </span>
            )}
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const badge = badgeFor(tab.id);
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsMobileDrawerOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs transition-all min-h-11 focus:outline-none focus:ring-1 focus:ring-orange-400/40 ${
                    isActive
                      ? 'bg-linear-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  } ${isSidebarCollapsed ? 'md:justify-center md:px-0' : ''}`}
                  title={tab.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className={`flex-1 text-left truncate ${isSidebarCollapsed ? 'md:hidden' : ''}`}>{tab.label}</span>
                  {badge !== undefined && (
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] bg-black/40 font-mono font-bold shrink-0 ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            {!isSidebarCollapsed && (
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2.5 block">Quick actions</span>
            )}
            <button
              type="button"
              onClick={() => {
                setShowAddMeal(true);
                setIsMobileDrawerOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-300 text-xs font-bold transition-all min-h-11 ${
                isSidebarCollapsed ? 'md:justify-center md:px-0' : ''
              }`}
              title="Add a new dish"
            >
              <Plus className="w-4 h-4 text-orange-400 shrink-0" aria-hidden="true" />
              <span className={`${isSidebarCollapsed ? 'md:hidden' : ''}`}>Add new dish</span>
            </button>
            <button
              type="button"
              onClick={handleExportOrdersCsv}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#1F242D] hover:bg-white/10 border border-slate-700/50 text-slate-300 hover:text-white text-xs font-bold transition-all min-h-11 ${
                isSidebarCollapsed ? 'md:justify-center md:px-0' : ''
              }`}
              title="Export all orders as CSV"
            >
              <Download className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
              <span className={`${isSidebarCollapsed ? 'md:hidden' : ''}`}>Export orders CSV</span>
            </button>
            <button
              type="button"
              onClick={handleExportSalesCsv}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#1F242D] hover:bg-white/10 border border-slate-700/50 text-slate-300 hover:text-white text-xs font-bold transition-all min-h-11 ${
                isSidebarCollapsed ? 'md:justify-center md:px-0' : ''
              }`}
              title="Export the sales ledger as CSV"
            >
              <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
              <span className={`${isSidebarCollapsed ? 'md:hidden' : ''}`}>Export sales CSV</span>
            </button>
            <button
              type="button"
              onClick={handleExportReportPdf}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#1F242D] hover:bg-white/10 border border-slate-700/50 text-slate-300 hover:text-white text-xs font-bold transition-all min-h-11 ${
                isSidebarCollapsed ? 'md:justify-center md:px-0' : ''
              }`}
              title="Export the business report as PDF"
            >
              <Download className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
              <span className={`${isSidebarCollapsed ? 'md:hidden' : ''}`}>Export report (PDF)</span>
            </button>
          </div>
        </div>

        <div className="p-2.5 border-t border-slate-800 bg-black/40 space-y-2 shrink-0 mt-auto">
          <div
            className={`flex items-center gap-2 p-2 rounded-xl bg-[#12141A] border border-slate-800 ${
              isSidebarCollapsed ? 'md:justify-center md:p-1.5' : ''
            }`}
          >
            <div className="w-7 h-7 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center shrink-0">
              <Shield className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />
            </div>
            <div className={`min-w-0 flex-1 ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
              <div className="text-[11px] font-bold text-white truncate">{user?.name || 'Administrator'}</div>
              <div className="text-[10px] text-slate-400 font-mono truncate">{user?.email || 'No account email on file'}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              if (next) notificationService.playChime('new_order');
            }}
            className={`w-full flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold border transition-all min-h-11 focus:outline-none focus:ring-1 ${
              soundEnabled
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-950'
                : 'bg-[#1F242D] border-slate-700/50 text-slate-400 hover:text-white'
            } ${isSidebarCollapsed ? 'md:justify-center md:p-2' : ''}`}
            aria-pressed={soundEnabled}
            title="Audio notification chimes"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            )}
            <span className={`flex-1 text-left text-[11px] ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
              Audio alerts
            </span>
            <span className={`font-mono text-[10px] uppercase ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
              {soundEnabled ? 'On' : 'Off'}
            </span>
          </button>

          <div
            className={`flex items-center gap-2 px-2.5 py-2 rounded-xl bg-[#1A1D24] border border-slate-800 text-[11px] ${
              analyticsError ? 'text-red-300' : 'text-emerald-400'
            } font-mono ${isSidebarCollapsed ? 'md:justify-center md:px-1' : ''}`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${analyticsError ? 'bg-red-400' : 'bg-emerald-400'}`} aria-hidden="true" />
            <span className={`font-bold truncate text-[10px] ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
              {analyticsError ? 'Analytics unavailable' : 'Server connected'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsMobileDrawerOpen(false);
              onGoHome?.();
            }}
            className={`w-full py-2.5 px-3 rounded-xl bg-[#1F242D] hover:bg-orange-500/10 border border-slate-700/50 text-slate-300 hover:text-orange-300 text-xs font-bold flex items-center justify-center gap-2 transition-all min-h-11 ${
              isSidebarCollapsed ? 'md:p-2' : ''
            }`}
            title="Return to the store menu"
          >
            <Home className="w-4 h-4 text-orange-400 shrink-0" aria-hidden="true" />
            <span className={`${isSidebarCollapsed ? 'md:hidden' : ''}`}>Return to store menu</span>
          </button>
        </div>
      </aside>

      {/* ══════════════════════════ MAIN ══════════════════════════ */}
      <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden relative">
        <header className="h-14 border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between bg-[#12141A]/95 backdrop-blur-md shrink-0 gap-2 sm:gap-3 z-20">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="md:hidden p-2 rounded-xl bg-[#1F242D] hover:bg-white/10 border border-slate-700/50 text-orange-400 min-h-11 min-w-11 flex items-center justify-center shrink-0"
              title="Open navigation"
              aria-label="Open navigation"
              aria-expanded={isMobileDrawerOpen}
            >
              <Layers className="w-5 h-5" aria-hidden="true" />
            </button>

            <div className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-orange-500/20 border border-orange-500/40 hidden sm:flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-orange-400" aria-hidden="true" />
              </div>
              <h1 className="text-xs sm:text-sm font-black text-white tracking-wide shrink-0 whitespace-nowrap">
                Restaurant operations
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleExportOrdersCsv}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1F242D] hover:bg-white/10 border border-slate-700/50 text-slate-300 hover:text-white text-xs font-bold transition-all min-h-11"
              title="Export all orders as CSV"
            >
              <Download className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
              <span className="hidden md:inline">Export CSV</span>
            </button>

            <div className="px-2.5 py-1.5 rounded-xl bg-black/60 border border-slate-800 text-xs font-mono font-black text-amber-300 flex items-center gap-1.5 shrink-0 min-h-11">
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
              <span>{new Date(now).toLocaleTimeString()}</span>
            </div>

            <button
              type="button"
              onClick={() => loadSnapshot()}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#1A1D24] hover:bg-[#252932] border border-slate-800 text-[11px] text-emerald-400 font-mono transition-all min-h-11 shrink-0 disabled:opacity-60"
              title="Refresh analytics, riders and reviews"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span className="hidden sm:inline font-bold">Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddMeal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all min-h-11 shrink-0"
              title="Add a new dish to the catalog"
            >
              <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Add dish</span>
            </button>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 lg:p-6 space-y-6">
          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl bg-red-950/70 border border-red-500/50 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between"
            >
              <p className="text-xs font-bold text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                {error}
              </p>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="px-3 py-1.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs font-bold hover:bg-red-500/30 transition-all min-h-9"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {readyOrders.length > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-r from-emerald-950/90 via-[#1A1D24] to-[#1A1D24] border border-emerald-500/50 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <ChefHat className="w-6 h-6" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">
                    {readyOrders.length} order{readyOrders.length === 1 ? '' : 's'} ready for dispatch
                  </h4>
                  <p className="text-xs text-emerald-200/80 mt-0.5">Assign a courier and read the handover code to them.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('orders');
                  setOrderStatusFilter('ready');
                  setOrderPage(1);
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                <span>Open dispatch</span>
              </button>
            </div>
          )}

          {/* Mobile tab switcher */}
          <div className="md:hidden flex items-center gap-1.5 p-1.5 bg-[#12141A] border border-slate-800 rounded-2xl overflow-x-auto sticky top-0 z-10">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const badge = badgeFor(tab.id);
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs transition-all whitespace-nowrap min-h-10 ${
                    isActive ? 'bg-linear-to-r from-orange-500 to-amber-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{tab.short}</span>
                  {badge !== undefined && (
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-black/30 text-white">{badge}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ─────────────── OVERVIEW ─────────────── */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#1A1D24] p-3.5 sm:px-5 rounded-2xl border border-slate-800 shadow-xl">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-orange-400" aria-hidden="true" />
                    Performance overview
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Live figures from the server, plus this session&apos;s order book.</p>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-[#12141A] border border-slate-800 text-[11px] text-slate-400 font-mono">
                  {weeklyTotals.hasOrders
                    ? `${weeklyTotals.orders} orders in the last 7 days`
                    : 'No orders in the last 7 days'}
                </div>
              </div>

              {analyticsError && (
                <div role="alert" className="p-3.5 rounded-2xl bg-red-950/70 border border-red-500/50 text-xs font-bold text-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  {analyticsError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total revenue</span>
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                      <DollarSign className="w-5 h-5" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-white font-mono mt-3">
                    {analytics ? kpi(analytics.totalRevenueRWF, 'RWF') : <span className="text-slate-500">No data yet</span>}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">Every non-cancelled order on the server.</p>
                </div>

                <div className="p-5 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total orders</span>
                    <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
                      <ShoppingBag className="w-5 h-5" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-white font-mono mt-3">
                    {analytics ? analytics.totalOrdersCount.toLocaleString() : <span className="text-slate-500">No data yet</span>}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">All-time count, cancelled orders excluded.</p>
                </div>

                <div className="p-5 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kitchen load</span>
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                      <ChefHat className="w-5 h-5" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-white font-mono mt-3">
                    {activeKitchenCount} cooking
                    <span className="text-sm font-sans font-bold text-emerald-400 ml-2">{readyOrders.length} ready</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    {analytics ? `${analytics.activeOrdersCount} active on the server` : 'Server active count unavailable'}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average ticket</span>
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                      <BarChart3 className="w-5 h-5" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-white font-mono mt-3">
                    {analytics ? kpi(analytics.avgTicketRWF, 'RWF') : <span className="text-slate-500">No data yet</span>}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">Mean value of a delivered order.</p>
                </div>
              </div>

              <div className="p-5 sm:p-6 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-2xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-orange-400" aria-hidden="true" />
                      7-day revenue
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Bucketed from the order timestamps on this device.</p>
                  </div>
                  <div className="flex items-center gap-1 bg-[#12141A] p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setChartMode('line')}
                      aria-pressed={chartMode === 'line'}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                        chartMode === 'line' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <LineChart className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Line</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartMode('bar')}
                      aria-pressed={chartMode === 'bar'}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                        chartMode === 'bar' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Bar</span>
                    </button>
                  </div>
                </div>

                {!weeklyTotals.hasOrders ? (
                  <p className="py-16 text-center text-slate-400 text-sm">No orders in this window.</p>
                ) : (
                  <RevenueChart data={weeklyData} mode={chartMode} hoveredKey={hoveredDay} onHover={setHoveredDay} />
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="p-5 sm:p-6 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-xl flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm flex items-center justify-between">
                      <span>Order pipeline</span>
                      <span className="text-xs text-slate-400 font-normal">{displayOrders.length} in session</span>
                    </h4>
                    <div className="space-y-3.5 text-xs mt-4">
                      {[
                        { key: 'pending', label: 'Pending', color: 'bg-orange-500' },
                        { key: 'preparing', label: 'Cooking', color: 'bg-blue-500' },
                        { key: 'ready', label: 'Ready', color: 'bg-emerald-400' },
                        { key: 'delivery', label: 'Out for delivery', color: 'bg-amber-500' }
                      ].map((row) => {
                        const count = displayOrders.filter((o) => o.status === row.key).length;
                        const pct = displayOrders.length ? (count / displayOrders.length) * 100 : 0;
                        return (
                          <div key={row.key}>
                            <div className="flex justify-between mb-1">
                              <span className="text-slate-400">{row.label}</span>
                              <span className="font-bold text-white">{count}</span>
                            </div>
                            <div className="w-full bg-[#12141A] rounded-full h-2 overflow-hidden border border-slate-800/80">
                              <div className={`${row.color} h-full rounded-full transition-all`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('orders');
                      setOrderStatusFilter('all');
                      setOrderPage(1);
                    }}
                    className="w-full py-2.5 mt-4 rounded-xl bg-[#1F242D] hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700/50 transition-all min-h-11"
                  >
                    <ShoppingBag className="w-4 h-4 text-orange-400" aria-hidden="true" />
                    <span>Open dispatch board</span>
                  </button>
                </div>

                <div className="p-5 sm:p-6 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-xl flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <Flame className="w-4 h-4 text-orange-500" aria-hidden="true" />
                      Top-selling dishes
                    </h4>
                    <div className="space-y-2 mt-3.5">
                      {topSellingDishes.length === 0 ? (
                        <p className="py-8 text-center text-slate-400 text-xs">No dish sales recorded yet.</p>
                      ) : (
                        topSellingDishes.map((dish, idx) => (
                          <div
                            key={dish.name}
                            className="p-2.5 rounded-xl bg-[#12141A] border border-slate-800/80 flex items-center justify-between gap-2.5"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 bg-slate-800 text-slate-300">
                                {idx + 1}
                              </div>
                              <div className="text-xs font-bold text-white truncate">{dish.name}</div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs font-mono font-bold text-orange-400">{formatRwf(dish.revenue)} RWF</div>
                              <div className="text-[10px] text-slate-500 font-mono">{dish.qty} sold</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('catalog')}
                    className="w-full py-2.5 mt-4 rounded-xl bg-[#1F242D] hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700/50 transition-all min-h-11"
                  >
                    <UtensilsCrossed className="w-4 h-4 text-orange-400" aria-hidden="true" />
                    <span>Open menu catalog</span>
                  </button>
                </div>

                <div className="p-5 sm:p-6 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white text-sm flex items-center gap-2">
                        <Activity className="w-4 h-4 text-orange-400" aria-hidden="true" />
                        Recent orders
                      </h4>
                      <button
                        type="button"
                        onClick={() => setActiveTab('orders')}
                        className="text-xs text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1"
                      >
                        <span>View all</span>
                        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="space-y-2.5 mt-3.5">
                      {displayOrders.length === 0 ? (
                        <p className="py-8 text-center text-slate-400 text-xs">No orders in the database yet.</p>
                      ) : (
                        displayOrders.slice(0, 4).map((order) => (
                          <div
                            key={order.id}
                            className="p-2.5 rounded-xl bg-[#12141A] border border-slate-800 hover:border-orange-500/50 flex items-center justify-between gap-2 transition-all"
                          >
                            <div className="min-w-0 pr-2">
                              <div className="text-xs font-bold text-white truncate">
                                #{order.id} <span className="text-slate-400 font-normal">&middot; {order.customerName || 'Customer'}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                                {(order.items || []).length} items &middot; {order.address || 'Kigali'}
                              </div>
                            </div>
                            <div className="text-right shrink-0 flex items-center gap-2">
                              <div>
                                <div className="text-xs font-mono font-bold text-white">{formatRwf(order.totalRWF)} RWF</div>
                                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border mt-0.5 ${statusBadge(order.status)}`}>
                                  {statusLabel(order.status)}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setTrackingOrderId(order.id)}
                                className="p-2 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500 hover:text-white transition-all min-h-9 min-w-9 flex items-center justify-center"
                                title={`Track order #${order.id}`}
                                aria-label={`Track order #${order.id}`}
                              >
                                <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('sales')}
                    className="w-full py-2.5 mt-4 rounded-xl bg-[#1F242D] hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700/50 transition-all min-h-11"
                  >
                    <DollarSign className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                    <span>Open sales ledger</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────── CATALOG ─────────────── */}
          {activeTab === 'catalog' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <label htmlFor="meal-search" className="sr-only">
                    Search dishes
                  </label>
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    id="meal-search"
                    type="text"
                    value={mealSearch}
                    onChange={(e) => {
                      setMealSearch(e.target.value);
                      setMealPage(1);
                    }}
                    placeholder="Search dish name or description"
                    className="w-full bg-[#1F242D] border border-slate-700/50 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/70"
                  />
                  {mealSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setMealSearch('');
                        setMealPage(1);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-white"
                      aria-label="Clear dish search"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {MEAL_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setMealCategoryFilter(cat.id);
                        setMealPage(1);
                      }}
                      aria-pressed={mealCategoryFilter === cat.id}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        mealCategoryFilter === cat.id
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60'
                          : 'bg-[#1F242D] text-slate-300 hover:text-white border border-slate-700/50'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddMeal(true)}
                  className="px-4 py-2.5 rounded-xl bg-linear-to-r from-orange-500 to-amber-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md hover:brightness-110 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>Add dish</span>
                </button>
              </div>

              {filteredMeals.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm bg-[#1A1D24] rounded-2xl border border-slate-800">
                  No menu items matched your search.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {paginatedMeals.map((meal) => (
                    <div
                      key={meal.id}
                      className="bg-[#1A1D24] border border-slate-800 rounded-2xl overflow-hidden shadow-xl hover:border-orange-500/40 transition-all flex flex-col group"
                    >
                      <div className="relative h-44 w-full overflow-hidden bg-black">
                        <img
                          src={meal.image || meal.fallbackImage || ''}
                          alt={meal.name ? `${meal.name} dish photo` : 'Dish photo unavailable'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          <span className="px-2.5 py-1 rounded-lg bg-black/70 border border-slate-700/50 text-[10px] font-bold text-white uppercase tracking-wider">
                            {meal.category}
                          </span>
                          {meal.spicy && (
                            <span className="px-2 py-1 rounded-lg bg-red-950/80 border border-red-500/30 text-[10px] font-bold text-red-400 flex items-center gap-1">
                              <Flame className="w-3 h-3" aria-hidden="true" />
                              Spicy
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleStock(meal)}
                          disabled={busyMealId === meal.id}
                          className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all disabled:opacity-60 ${
                            meal.outOfStock
                              ? 'bg-red-500/20 text-red-300 border-red-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          }`}
                          aria-pressed={Boolean(meal.outOfStock)}
                        >
                          {busyMealId === meal.id ? 'Saving...' : meal.outOfStock ? 'Sold out' : 'In stock'}
                        </button>
                      </div>

                      <div className="p-4 space-y-2 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-white text-sm line-clamp-1">{meal.name}</h4>
                          <span className="font-mono font-bold text-orange-400 text-sm whitespace-nowrap">
                            {formatRwf(meal.price)} RWF
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2">{meal.description || 'No description on file.'}</p>
                      </div>

                      <div className="p-4 pt-0 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => openEditMeal(meal)}
                          className="flex-1 py-2 rounded-xl bg-[#1F242D] hover:bg-slate-700/50 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700/50 transition-all"
                        >
                          <Edit className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMeal(meal)}
                          disabled={busyMealId === meal.id}
                          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 transition-all disabled:opacity-60"
                          title={`Delete ${meal.name}`}
                          aria-label={`Delete ${meal.name}`}
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {totalMealPages > 1 && (
                <Pager page={mealPage} pageCount={totalMealPages} onChange={setMealPage} noun="dishes" />
              )}
            </div>
          )}

          {/* ─────────────── ORDERS / DISPATCH ─────────────── */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <label htmlFor="order-search" className="sr-only">
                    Search orders
                  </label>
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    id="order-search"
                    type="text"
                    value={orderSearch}
                    onChange={(e) => {
                      setOrderSearch(e.target.value);
                      setOrderPage(1);
                    }}
                    placeholder="Search by id, customer, phone or address"
                    className="w-full bg-[#1F242D] border border-slate-700/50 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/70"
                  />
                  {orderSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setOrderSearch('');
                        setOrderPage(1);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-white"
                      aria-label="Clear order search"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {[{ id: 'all', label: 'All' }, ...ORDER_STATUSES.map((s) => ({ id: s, label: statusLabel(s) }))].map(
                    (st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          setOrderStatusFilter(st.id);
                          setOrderPage(1);
                        }}
                        aria-pressed={orderStatusFilter === st.id}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                          orderStatusFilter === st.id
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60'
                            : 'bg-[#1F242D] text-slate-300 hover:text-white border border-slate-700/50'
                        }`}
                      >
                        {st.label}
                        {st.id === 'ready' ? ` (${readyOrders.length})` : ''}
                      </button>
                    )
                  )}
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm bg-[#1A1D24] rounded-2xl border border-slate-800">
                  {loading ? 'Loading orders...' : 'No orders matched your search or status filter.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {paginatedOrders.map((order) => {
                    const transitions = transitionsFor(order);
                    const isDispatching = dispatchingOrderId === order.id;
                    const draftRider = riderDraft[order.id] ?? (freeRiders[0]?.id ? String(freeRiders[0].id) : '');
                    const busy = Boolean(pendingStatusChange) || isDispatching;

                    return (
                      <article
                        key={order.id}
                        className="p-5 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-xl space-y-4 hover:border-orange-500/40 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-white text-sm">#{order.id}</span>
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${statusBadge(order.status)}`}>
                                  {statusLabel(order.status)}
                                </span>
                              </div>
                              <div className="text-xs font-bold text-white mt-1 truncate">{order.customerName || 'Customer'}</div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>{order.phone || 'No phone on file'}</span>
                                <span aria-hidden="true">&middot;</span>
                                <span className="truncate">{order.address || 'Kigali'}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-base font-black font-mono text-orange-400">{formatRwf(order.totalRWF)} RWF</div>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">{formatClock(order.createdAt) || 'time unknown'}</div>
                            </div>
                          </div>

                          <div className="py-2 space-y-1.5">
                            {(order.items || []).length === 0 ? (
                              <p className="text-xs text-slate-500">No line items on this order.</p>
                            ) : (
                              order.items.map((item, idx) => (
                                <div key={item.id ?? `${order.id}-item-${idx}`} className="text-xs text-slate-400 flex items-center justify-between gap-2">
                                  <span className="truncate">
                                    <strong className="text-white">{item.qty || 1}x</strong> {item.name}
                                    {item.spice && <span className="text-orange-400 text-[10px] ml-1">({item.spice})</span>}
                                  </span>
                                  <span className="font-mono text-white text-[11px] shrink-0">{formatRwf(item.price)} RWF</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {order.status === 'ready' && (
                          <div className="p-3 rounded-xl bg-[#12141A] border border-slate-800 space-y-2.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Courier dispatch</p>
                            {order.riderId ? (
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs text-slate-300">
                                  Assigned to <strong className="text-white">{order.riderName || 'a courier'}</strong>
                                </span>
                                <span className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setReassignTarget({ orderId: order.id, fromRiderId: order.riderId })}
                                    className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-200 text-[11px] font-bold hover:bg-amber-500/25"
                                  >
                                    Reassign
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleReassignRider({ orderId: order.id, newRiderId: null })}
                                    disabled={isDispatching}
                                    className="px-2.5 py-1.5 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 text-[11px] font-bold hover:bg-red-500/25 disabled:opacity-60"
                                  >
                                    Release
                                  </button>
                                </span>
                              </div>
                            ) : ridersError ? (
                              <p role="alert" className="text-[11px] text-red-300">
                                {ridersError} Sign in with a staff account to dispatch couriers.
                              </p>
                            ) : freeRiders.length === 0 ? (
                              <p className="text-[11px] text-slate-400">
                                No courier is on duty and free right now. Read the handover code to the customer instead, or wait for a
                                rider to come online.
                              </p>
                            ) : (
                              <div className="flex flex-col sm:flex-row gap-2">
                                <label htmlFor={`rider-${order.id}`} className="sr-only">
                                  Courier for order #{order.id}
                                </label>
                                <select
                                  id={`rider-${order.id}`}
                                  value={draftRider}
                                  onChange={(e) => setRiderDraft((prev) => ({ ...prev, [order.id]: e.target.value }))}
                                  className="flex-1 bg-[#12141A] border border-slate-700/50 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 min-h-11"
                                >
                                  {freeRiders.map((rider) => (
                                    <option key={rider.id} value={rider.id}>
                                      {rider.name} ({rider.plateNumber || 'no plate'}) &middot; {rider.phone || 'no phone'}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleAssignRider(order, draftRider)}
                                  disabled={busy}
                                  className="px-3 py-2 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 min-h-11 disabled:opacity-60"
                                >
                                  {isDispatching ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                                  ) : (
                                    <Bike className="w-3.5 h-3.5" aria-hidden="true" />
                                  )}
                                  <span>{isDispatching ? 'Dispatching...' : 'Dispatch'}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {transitions.map((t) => {
                              const isPending = pendingStatusChange === `${order.id}:${t.to}`;
                              return (
                                <button
                                  key={t.to}
                                  type="button"
                                  onClick={() => handleUpdateStatus(order, t.to)}
                                  disabled={Boolean(pendingStatusChange)}
                                  className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all min-h-11 flex items-center justify-center gap-1.5 disabled:opacity-60 ${
                                    toneClass[t.tone]
                                  }`}
                                >
                                  {isPending ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                                  )}
                                  <span>{isPending ? 'Saving...' : t.label}</span>
                                </button>
                              );
                            })}
                            {onCancelOrder && isLiveStatus(order.status) && (
                              <button
                                type="button"
                                onClick={() => handleCancelOrder(order)}
                                disabled={Boolean(pendingStatusChange)}
                                className="px-3 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30 text-xs font-bold hover:bg-red-600 hover:text-white transition-all min-h-11 disabled:opacity-60"
                              >
                                Cancel order
                              </button>
                            )}
                            {order.status === 'ready' && (
                              <p className="text-[10px] text-slate-500 max-w-48">
                                Pickup is confirmed by the courier with the handover code, not from here.
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handlePrintTicket(order)}
                              className="px-3 py-2 rounded-xl bg-[#1F242D] hover:bg-white/10 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-700/50 min-h-11"
                            >
                              <span className="sr-only">Print 80mm kitchen slip for order #{order.id}: </span>
                              <Printer className="w-3.5 h-3.5 text-orange-400 shrink-0" aria-hidden="true" />
                              <span aria-hidden="true">Print ticket</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setTrackingOrderId(order.id)}
                              className="px-3 py-2 rounded-xl bg-orange-500/20 hover:bg-orange-500 text-orange-400 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all border border-orange-500/30 min-h-11"
                            >
                              <span className="sr-only">Track order #{order.id} on the map: </span>
                              <Navigation className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                              <span aria-hidden="true">Track</span>
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {totalOrderPages > 1 && (
                <Pager page={orderPage} pageCount={totalOrderPages} onChange={setOrderPage} noun="orders" />
              )}
            </div>
          )}

          {/* ─────────────── SALES ─────────────── */}
          {activeTab === 'sales' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Sold value"
                  value={`${formatRwf(soldRevenue)} RWF`}
                  icon={<DollarSign className="w-5 h-5" aria-hidden="true" />}
                  tone="emerald"
                  caption="Dispatched or delivered orders in this session."
                />
                <StatCard
                  title="Sold orders"
                  value={String(soldOrders.length)}
                  icon={<ShoppingBag className="w-5 h-5" aria-hidden="true" />}
                  tone="blue"
                  caption="Out for delivery or already delivered."
                />
                <StatCard
                  title="Dishes fulfilled"
                  value={String(soldItemsCount)}
                  icon={<UtensilsCrossed className="w-5 h-5" aria-hidden="true" />}
                  tone="purple"
                  caption="Line items across those orders."
                />
                <StatCard
                  title="Average sale"
                  value={`${soldOrders.length ? formatRwf(Math.round(soldRevenue / soldOrders.length)) : '—'} RWF`}
                  icon={<BarChart3 className="w-5 h-5" aria-hidden="true" />}
                  tone="amber"
                  caption={soldOrders.length ? 'Per completed sale.' : 'No sales recorded yet.'}
                />
              </div>

              <div className="p-5 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  <div className="relative flex-1 min-w-55">
                    <label htmlFor="sales-search" className="sr-only">
                      Search the sales ledger
                    </label>
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                    <input
                      id="sales-search"
                      type="text"
                      value={salesSearch}
                      onChange={(e) => {
                        setSalesSearch(e.target.value);
                        setSalesPage(1);
                      }}
                      placeholder="Search by order, customer or dish"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#1F242D] border border-slate-700/50 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/70"
                    />
                  </div>

                  <label htmlFor="sales-pay" className="sr-only">
                    Payment method
                  </label>
                  <select
                    id="sales-pay"
                    value={salesPaymentFilter}
                    onChange={(e) => {
                      setSalesPaymentFilter(e.target.value);
                      setSalesPage(1);
                    }}
                    className="bg-[#1F242D] border border-slate-700/50 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/70"
                  >
                    <option value="all">All payment methods</option>
                    <option value="momo">Mobile money</option>
                    <option value="card">Card</option>
                    <option value="cash">Cash on delivery</option>
                  </select>

                  <label htmlFor="sales-status" className="sr-only">
                    Sales status
                  </label>
                  <select
                    id="sales-status"
                    value={salesStatusFilter}
                    onChange={(e) => {
                      setSalesStatusFilter(e.target.value);
                      setSalesPage(1);
                    }}
                    className="bg-[#1F242D] border border-slate-700/50 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/70"
                  >
                    <option value="all">All sold statuses</option>
                    <option value="delivery">Out for delivery</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleExportSalesCsv}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  <span>Export ledger CSV</span>
                </button>
              </div>

              {paginatedSoldOrders.length === 0 ? (
                <div className="p-12 text-center bg-[#1A1D24] rounded-2xl border border-dashed border-slate-800 text-xs text-slate-500 space-y-2">
                  <ShoppingBag className="w-10 h-10 mx-auto text-slate-600" aria-hidden="true" />
                  <div className="font-bold text-white text-sm">No sold transactions in this session</div>
                  <p className="text-slate-400">Orders appear here once a courier takes them out.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paginatedSoldOrders.map((order) => (
                    <article key={order.id} className="p-5 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-xl space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-mono font-black text-emerald-400 text-base">#{order.id}</span>
                          <span className="text-sm font-bold text-white">{order.customerName || 'Customer'}</span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            {order.status === 'delivered' ? 'Delivered' : 'Out for delivery'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 font-mono">{formatWhen(order.createdAt) || 'date unknown'}</span>
                          <span className="text-base font-black text-white font-mono">{formatRwf(order.totalRWF)} RWF</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="space-y-1 bg-[#12141A] p-3 rounded-xl border border-slate-800/80">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer and delivery</span>
                          <div className="text-white font-semibold truncate">{order.customerName || 'Customer'}</div>
                          <div className="text-slate-400 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-amber-400 shrink-0" aria-hidden="true" />
                            <span>{order.phone || 'No phone on file'}</span>
                          </div>
                          <div className="text-slate-400 truncate flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-400 shrink-0" aria-hidden="true" />
                            <span>{order.address || 'Kigali'}</span>
                          </div>
                        </div>

                        <div className="space-y-1 bg-[#12141A] p-3 rounded-xl border border-slate-800/80">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Items purchased</span>
                          {(order.items || []).map((item, idx) => (
                            <div key={item.id ?? idx} className="flex justify-between gap-2 text-slate-300 text-[11px]">
                              <span className="truncate">
                                {item.qty || 1}x {item.name}
                              </span>
                              <span className="font-mono text-amber-400 font-bold shrink-0">{formatRwf(item.price)} RWF</span>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-2 bg-[#12141A] p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment</span>
                            <div className="text-white font-mono font-bold uppercase mt-1">
                              {order.paymentMethod || 'not recorded'}
                            </div>
                            <div className="text-blue-300 font-semibold text-[11px] mt-0.5 capitalize">
                              Status: {order.status}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setTrackingOrderId(order.id)}
                            className="w-full py-2 rounded-lg bg-[#1F242D] hover:bg-slate-700/50 border border-slate-700/50 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                          >
                            <span className="sr-only">Inspect the courier route for order #{order.id}: </span>
                            <Navigation className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                            <span aria-hidden="true">Inspect route</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {totalSalesPages > 1 && (
                <Pager page={salesPage} pageCount={totalSalesPages} onChange={setSalesPage} noun="sales" />
              )}
            </div>
          )}

          {/* ─────────────── REVIEWS ─────────────── */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-xl space-y-2">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Food rating</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white font-mono">
                      {reviewAverages.pizza === null ? <span className="text-slate-500">&mdash;</span> : reviewAverages.pizza.toFixed(1)}
                    </span>
                    <span className="text-xs text-amber-400 font-bold">/ 5.0</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {reviews.length === 0 ? 'No feedback received yet.' : `Mean of ${reviews.length} reviews.`}
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-xl space-y-2">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Courier rating</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white font-mono">
                      {reviewAverages.rider === null ? <span className="text-slate-500">&mdash;</span> : reviewAverages.rider.toFixed(1)}
                    </span>
                    <span className="text-xs text-amber-400 font-bold">/ 5.0</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Mean courier score.</p>
                </div>
                <div className="p-5 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-xl space-y-2">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total feedback</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white font-mono">{reviews.length}</span>
                    <span className="text-xs text-slate-400">reviews</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Stored on the server.</p>
                </div>
              </div>

              <div className="p-5 sm:p-6 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-2xl space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-400" aria-hidden="true" />
                    Customer and courier reviews
                  </h3>
                  <button
                    type="button"
                    onClick={() => loadSnapshot()}
                    disabled={isRefreshing}
                    className="px-3 py-1.5 rounded-xl bg-[#1F242D] border border-slate-700/50 hover:bg-slate-700/50 text-white font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                    <span>Refresh</span>
                  </button>
                </div>

                {reviews.length === 0 ? (
                  <p className="py-12 text-center text-slate-400 text-xs bg-[#12141A] rounded-2xl border border-slate-800/80">
                    No customer reviews logged yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {reviews.map((rev, idx) => (
                      <article
                        key={rev.id ?? idx}
                        className="p-4 rounded-xl bg-[#12141A] border border-slate-800/80 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-amber-400">Order #{rev.orderId}</span>
                            {rev.createdAt && <span className="text-[10px] text-slate-400">&middot; {formatWhen(rev.createdAt)}</span>}
                          </div>
                          <div className="flex items-center gap-4 text-xs font-bold">
                            <span className="text-orange-400">Food: {rev.pizzaRating}&star;</span>
                            <span className="text-amber-300">Courier: {rev.riderRating}&star;</span>
                          </div>
                        </div>
                        {rev.comment ? (
                          <blockquote className="text-xs text-slate-300 italic bg-[#1F242D] p-2.5 rounded-lg border border-slate-700/50 m-0">
                            {rev.comment}
                          </blockquote>
                        ) : (
                          <p className="text-[11px] text-slate-500 italic">No written comment provided.</p>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─────────────── FLEET ─────────────── */}
          {activeTab === 'fleet' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#1A1D24] p-4 sm:px-6 rounded-2xl border border-slate-800 shadow-xl">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2.5">
                    <Bike className="w-5 h-5 text-orange-400" aria-hidden="true" />
                    Rider fleet
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Duty status, earnings and emergency reassignment.</p>
                </div>
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => loadSnapshot()}
                    disabled={isRefreshing}
                    className="p-2.5 rounded-xl bg-[#1F242D] border border-slate-700/50 hover:bg-slate-700/50 text-slate-300 hover:text-white transition-all min-h-11 min-w-11 flex items-center justify-center disabled:opacity-60"
                    title="Refresh the courier fleet"
                    aria-label="Refresh the courier fleet"
                  >
                    <RefreshCw className={`w-4 h-4 text-orange-400 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddRiderModal(true)}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all min-h-11"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    <span>Register courier</span>
                  </button>
                </div>
              </div>

              {ridersError ? (
                <div role="alert" className="p-5 rounded-2xl bg-[#1A1D24] border border-red-500/50 space-y-2">
                  <p className="text-sm font-bold text-red-200 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" aria-hidden="true" />
                    The courier fleet could not be loaded
                  </p>
                  <p className="text-xs text-slate-300">{ridersError}</p>
                  <p className="text-xs text-slate-400">Sign in with a staff account to manage couriers. No fleet data is shown until the server answers.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                      title="Registered couriers"
                      value={String(riders.length)}
                      icon={<Users className="w-4 h-4" aria-hidden="true" />}
                      tone="orange"
                      caption={analytics ? `Server total: ${analytics.ridersTotal ?? riders.length}` : 'Server total unavailable'}
                    />
                    <StatCard
                      title="On duty and free"
                      value={String(riders.filter(isRiderFree).length)}
                      icon={<CheckCircle2 className="w-4 h-4" aria-hidden="true" />}
                      tone="emerald"
                      caption="Available for a new handover."
                    />
                    <StatCard
                      title="On a delivery"
                      value={String(riders.filter(isRiderBusy).length)}
                      icon={<Bike className="w-4 h-4" aria-hidden="true" />}
                      tone="blue"
                      caption="Holding an order right now."
                    />
                    <StatCard
                      title="Off duty"
                      value={String(riders.filter((r) => !r.is_available).length)}
                      icon={<Clock className="w-4 h-4" aria-hidden="true" />}
                      tone="slate"
                      caption="Not taking assignments."
                    />
                  </div>

                  <div className="p-5 sm:p-6 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-2xl space-y-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div className="relative flex-1 max-w-md">
                        <label htmlFor="rider-search" className="sr-only">
                          Search couriers
                        </label>
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                        <input
                          id="rider-search"
                          type="text"
                          value={riderSearch}
                          onChange={(e) => setRiderSearch(e.target.value)}
                          placeholder="Search by name, phone, plate or vehicle"
                          className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#12141A] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400" aria-hidden="true" />
                        <label htmlFor="rider-filter" className="sr-only">
                          Filter couriers by duty status
                        </label>
                        <select
                          id="rider-filter"
                          value={riderStatusFilter}
                          onChange={(e) => setRiderStatusFilter(e.target.value)}
                          className="bg-[#12141A] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                        >
                          <option value="all">All statuses</option>
                          <option value="available">On duty and free</option>
                          <option value="busy">On a delivery</option>
                          <option value="off_duty">Off duty</option>
                        </select>
                      </div>
                    </div>

                    {filteredRiders.length === 0 ? (
                      <p className="py-12 text-center text-slate-400 text-xs">
                        {riders.length === 0 ? 'No couriers are registered yet.' : 'No couriers matched your search.'}
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredRiders.map((rider) => {
                          const busy = isRiderBusy(rider);
                          const free = isRiderFree(rider);
                          return (
                            <article
                              key={rider.id}
                              className={`p-4 sm:p-5 rounded-2xl bg-[#12141A] border transition-all shadow-lg flex flex-col justify-between space-y-4 ${
                                busy ? 'border-blue-500/40' : free ? 'border-emerald-500/40' : 'border-slate-800'
                              }`}
                            >
                              <div className="space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center font-bold text-base shrink-0">
                                      {rider.name ? rider.name.charAt(0).toUpperCase() : '?'}
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="text-sm font-black text-white truncate">{rider.name}</h4>
                                      <span className="font-mono text-xs font-bold text-amber-400">
                                        {rider.plateNumber || 'No plate on file'}
                                      </span>
                                    </div>
                                  </div>
                                  <span
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-black border shrink-0 ${
                                      busy
                                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                                        : free
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                                        : 'bg-slate-800 text-slate-400 border-slate-700'
                                    }`}
                                  >
                                    {busy ? 'On a delivery' : free ? 'On duty' : 'Off duty'}
                                  </span>
                                </div>

                                <div className="space-y-1.5 text-xs bg-[#1A1D24] p-3 rounded-xl border border-slate-800">
                                  <Row label="Vehicle" value={rider.vehicleType || 'not recorded'} />
                                  <Row label="Shift" value={rider.shift || 'not recorded'} />
                                  <div className="flex items-center justify-between text-slate-300">
                                    <span className="text-slate-400">Phone</span>
                                    {rider.phone ? (
                                      <a href={`tel:${rider.phone}`} className="font-mono text-emerald-400 hover:underline">
                                        {rider.phone}
                                      </a>
                                    ) : (
                                      <span className="font-mono text-slate-500">not recorded</span>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                                    <span className="text-slate-400">Today</span>
                                    <span className="font-mono text-white font-bold">
                                      {rwf(rider.completed_today)} trips &middot; {formatRwf(rider.earnings_today)} RWF
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Last GPS fix</span>
                                    <span className="font-mono text-slate-300">{formatWhen(rider.lastSeenAt) || 'never reported'}</span>
                                  </div>
                                </div>

                                {rider.current_order_id && (
                                  <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-between gap-2 text-xs">
                                    <span className="text-blue-300 font-medium">Holding order #{rider.current_order_id}</span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setReassignTarget({ orderId: rider.current_order_id, fromRiderId: rider.id })
                                      }
                                      className="px-2 py-1 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-bold hover:bg-red-500/30"
                                    >
                                      Reassign order
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                                <span className="text-[11px] text-slate-400 font-semibold">Duty override</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleRiderAvailability(rider)}
                                  disabled={togglingRiderId === rider.id || busy}
                                  title={busy ? 'This courier is mid-delivery and cannot change duty' : 'Toggle duty status'}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border min-h-9 disabled:opacity-50 ${
                                    rider.is_available
                                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                                      : 'bg-slate-800 border-slate-700 text-slate-400'
                                  }`}
                                >
                                  <span
                                    className={`w-2 h-2 rounded-full ${rider.is_available ? 'bg-emerald-400' : 'bg-slate-500'}`}
                                    aria-hidden="true"
                                  />
                                  <span>{togglingRiderId === rider.id ? 'Saving...' : rider.is_available ? 'Set off duty' : 'Set on duty'}</span>
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ─────────────── ADD DISH ─────────────── */}
      <AddFoodItemModal
        isOpen={showAddMeal}
        onClose={() => setShowAddMeal(false)}
        onSave={async () => {
          await onMealsChange?.();
        }}
      />

      {/* ─────────────── REGISTER COURIER ─────────────── */}
      {showAddRiderModal && (
        <ModalShell title="Register a new courier" icon={<Bike className="w-5 h-5 text-orange-400" aria-hidden="true" />} onClose={() => setShowAddRiderModal(false)} label="Close the register courier dialog">
          <form onSubmit={handleCreateRider} className="space-y-4">
            <Field label="Full name" id="rider-name">
              <input
                id="rider-name"
                type="text"
                required
                placeholder="Eric Mugisha"
                value={newRiderForm.name}
                onChange={(e) => setNewRiderForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full bg-[#1F242D] border border-slate-700/50 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone" id="rider-phone">
                <input
                  id="rider-phone"
                  type="tel"
                  required
                  placeholder="+250 788 000 000"
                  value={newRiderForm.phone}
                  onChange={(e) => setNewRiderForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full bg-[#1F242D] border border-slate-700/50 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </Field>
              <Field label="Plate number" id="rider-plate">
                <input
                  id="rider-plate"
                  type="text"
                  required
                  placeholder="RAC 402B"
                  value={newRiderForm.plateNumber}
                  onChange={(e) => setNewRiderForm((prev) => ({ ...prev, plateNumber: e.target.value }))}
                  className="w-full bg-[#1F242D] border border-slate-700/50 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Vehicle type" id="rider-vehicle">
                <input
                  id="rider-vehicle"
                  type="text"
                  placeholder="Yamaha XTZ 125"
                  value={newRiderForm.vehicleType}
                  onChange={(e) => setNewRiderForm((prev) => ({ ...prev, vehicleType: e.target.value }))}
                  className="w-full bg-[#1F242D] border border-slate-700/50 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </Field>
              <Field label="Default shift" id="rider-shift">
                <select
                  id="rider-shift"
                  value={newRiderForm.shift}
                  onChange={(e) => setNewRiderForm((prev) => ({ ...prev, shift: e.target.value }))}
                  className="w-full bg-[#1F242D] border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="Day Shift (08:00 - 16:00)">Day Shift (08:00 - 16:00)</option>
                  <option value="Evening Shift (16:00 - 00:00)">Evening Shift (16:00 - 00:00)</option>
                  <option value="Night Shift (18:00 - 02:00)">Night Shift (18:00 - 02:00)</option>
                </select>
              </Field>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddRiderModal(false)}
                className="px-4 py-2.5 rounded-xl bg-[#1F242D] hover:bg-slate-700/50 text-slate-300 font-bold text-xs transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingRider}
                className="px-5 py-2.5 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 text-white font-bold text-xs transition-all disabled:opacity-60"
              >
                {isSavingRider ? 'Registering...' : 'Register courier'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* ─────────────── REASSIGN ─────────────── */}
      {reassignTarget && (
        <ModalShell
          title={`Reassign order #${reassignTarget.orderId}`}
          icon={<AlertCircle className="w-5 h-5 text-amber-400" aria-hidden="true" />}
          onClose={() => setReassignTarget(null)}
          label="Close the reassign dialog"
        >
          <p className="text-xs text-slate-300">
            Move this delivery to another courier, or release it back to the ready queue.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleReassignRider({ orderId: reassignTarget.orderId, newRiderId: null });
            }}
            className="space-y-4"
          >
            <Field label="Available courier" id="reassign-rider">
              <select
                id="reassign-rider"
                value=""
                onChange={(e) => {
                  if (!e.target.value) return;
                  handleReassignRider({ orderId: reassignTarget.orderId, newRiderId: e.target.value });
                }}
                className="w-full bg-[#1F242D] border border-slate-700/50 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
              >
                <option value="">-- Choose a courier --</option>
                {freeRiders
                  .filter((r) => String(r.id) !== String(reassignTarget.fromRiderId))
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.plateNumber || 'no plate'}) &middot; {r.phone || 'no phone'}
                    </option>
                  ))}
              </select>
            </Field>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReassignTarget(null)}
                className="px-4 py-2.5 rounded-xl bg-[#1F242D] hover:bg-slate-700/50 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isReassigning}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all disabled:opacity-60"
              >
                {isReassigning ? 'Releasing...' : 'Release courier'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* ─────────────── TRACKING ─────────────── */}
      {trackingOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div
            className="bg-[#1A1D24] border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-7 w-full max-w-4xl shadow-2xl space-y-5 my-auto"
            role="dialog"
            aria-modal="true"
            aria-label={`Tracking order ${trackingOrder.id}`}
          >
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/40 flex items-center justify-center shrink-0">
                  <Navigation className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-black text-white">Order #{trackingOrder.id}</h3>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${statusBadge(trackingOrder.status)}`}>
                      {statusLabel(trackingOrder.status)}
                    </span>
                    <p className="text-xs text-slate-400 truncate">
                      {trackingOrder.customerName || 'Customer'} &middot; {trackingOrder.phone || 'no phone'} &middot;{' '}
                      {trackingOrder.address || 'Kigali'}
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTrackingOrderId(null)}
                className="p-2 rounded-xl bg-[#1F242D] hover:bg-slate-700/50 border border-slate-700/50 text-slate-400 hover:text-white transition-colors"
                aria-label="Close tracking"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 h-72 sm:h-80 rounded-2xl overflow-hidden border border-slate-800 relative shadow-inner">
                <div ref={setMapNode} className="w-full h-full" />
                <div className="absolute top-3 left-3 z-[400] bg-[#12141A]/95 backdrop-blur-md p-2.5 rounded-xl border border-slate-800 text-xs shadow-xl space-y-1 pointer-events-none">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <Bike className="w-4 h-4 text-orange-400 shrink-0" aria-hidden="true" />
                    <span>{assignedRider?.name || trackingOrder.riderName || 'No courier assigned'}</span>
                  </div>
                  <div className="text-[10px] font-mono text-amber-400">
                    {riderHasFix
                      ? `Live position &middot; fix ${formatWhen(assignedRider.lastSeenAt) || 'unknown'}`
                      : 'No live GPS fix reported yet'}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    {trackingDestination
                      ? `Route ${trackingOrder.distanceKm ?? '—'} km &middot; ETA ${trackingOrder.etaMinutes ?? '—'} min`
                      : 'No coordinates on this order, showing the kitchen only'}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#12141A] border border-slate-800 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-400 text-xs uppercase tracking-wider">Ordered dishes</h4>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {(trackingOrder.items || []).map((item, idx) => (
                      <div key={item.id ?? idx} className="text-xs text-slate-400 flex justify-between gap-2">
                        <span className="truncate">
                          <strong className="text-white">{item.qty || 1}x</strong> {item.name}
                        </span>
                        <span className="font-mono text-white shrink-0">{formatRwf(item.price)} RWF</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-xs">
                    <span className="text-slate-400">Total</span>
                    <span className="font-mono font-black text-orange-400 text-sm">{formatRwf(trackingOrder.totalRWF)} RWF</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  {trackingOrder.phone && (
                    <a
                      href={`tel:${trackingOrder.phone}`}
                      className="w-full py-2 rounded-xl bg-[#1F242D] hover:bg-slate-700/50 text-white text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700/50 transition-all min-h-11"
                    >
                      <Phone className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />
                      <span>Call customer</span>
                    </a>
                  )}
                  {trackingOrder.riderId && (
                    <p className="text-[10px] text-slate-500">
                      Pickup and delivery are confirmed by the courier on their device.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────── EDIT DISH ─────────────── */}
      {editingMeal && (
        <ModalShell
          title={`Edit ${editingMeal.name}`}
          icon={<Edit className="w-4 h-4 text-orange-400" aria-hidden="true" />}
          onClose={() => setEditingMeal(null)}
          label="Close the edit dish dialog"
        >
          <form onSubmit={handleSaveEditMeal} className="space-y-4">
            <Field label="Dish name" id="edit-name">
              <input
                id="edit-name"
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-[#1F242D] border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/70"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price (RWF)" id="edit-price">
                <input
                  id="edit-price"
                  type="number"
                  min="0"
                  required
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full bg-[#1F242D] border border-slate-700/50 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-amber-500/70"
                />
              </Field>
              <Field label="Category" id="edit-category">
                <select
                  id="edit-category"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full bg-[#1F242D] border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/70"
                >
                  {MEAL_CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Description" id="edit-desc">
              <textarea
                id="edit-desc"
                rows={3}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full bg-[#1F242D] border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/70 resize-none"
              />
            </Field>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingMeal(null)}
                className="px-4 py-2 rounded-xl bg-[#1F242D] hover:bg-slate-700/50 text-slate-300 font-bold text-xs border border-slate-700/50 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingEdit}
                className="px-5 py-2 rounded-xl bg-linear-to-r from-orange-500 to-amber-500 text-white font-bold text-xs transition-all disabled:opacity-60"
              >
                {isSavingEdit ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2 text-slate-300">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-white truncate">{value}</span>
    </div>
  );
}

function Field({ label, id, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-slate-400 uppercase mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

const TONE_CLASS = {
  emerald: 'text-emerald-400 bg-emerald-500/20',
  blue: 'text-blue-400 bg-blue-500/20',
  amber: 'text-amber-400 bg-amber-500/20',
  orange: 'text-orange-400 bg-orange-500/20',
  purple: 'text-purple-400 bg-purple-500/20',
  slate: 'text-slate-400 bg-slate-700/30'
};

function StatCard({ title, value, icon, tone = 'emerald', caption }) {
  return (
    <div className="p-5 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-xl">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded-xl ${TONE_CLASS[tone] || TONE_CLASS.emerald}`}>{icon}</div>
      </div>
      <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-3">{value}</div>
      <p className="text-[11px] text-slate-400 mt-2">{caption}</p>
    </div>
  );
}

function Pager({ page, pageCount, onChange, noun }) {
  return (
    <nav className="flex items-center justify-center gap-2 pt-4" aria-label={`${noun} pagination`}>
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="p-2 rounded-xl bg-[#1F242D] border border-slate-700/50 hover:bg-slate-700/50 disabled:opacity-30 text-white"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
      </button>
      <span className="text-xs text-slate-400 font-bold px-3">
        Page {page} of {pageCount}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(pageCount, page + 1))}
        disabled={page === pageCount}
        className="p-2 rounded-xl bg-[#1F242D] border border-slate-700/50 hover:bg-slate-700/50 disabled:opacity-30 text-white"
        aria-label="Next page"
      >
        <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </button>
    </nav>
  );
}

function ModalShell({ title, icon, onClose, label, children }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div
        className="bg-[#1A1D24] border border-slate-800 rounded-2xl sm:rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4"
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            {icon}
            <span className="truncate">{title}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white"
            aria-label={label}
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 7-day revenue chart. The previous version multiplied the server revenue by
// 0.28 / 3.6 to "fill in" a range, so every window showed invented numbers.
// ---------------------------------------------------------------------------

const CHART_W = 600;
const CHART_H = 220;
const PAD_X = 44;
const PAD_Y = 28;

function RevenueChart({ data, mode, hoveredKey, onHover }) {
  const maxRev = useMemo(() => {
    const highest = Math.max(...data.map((d) => d.rev), 1);
    const magnitude = 10 ** Math.max(0, String(Math.round(highest)).length - 1);
    return Math.ceil(highest / magnitude) * magnitude;
  }, [data]);

  const points = useMemo(
    () =>
      data.map((d, i) => ({
        ...d,
        x: PAD_X + (i * (CHART_W - 2 * PAD_X)) / Math.max(1, data.length - 1),
        y: CHART_H - PAD_Y - (d.rev / maxRev) * (CHART_H - 2 * PAD_Y)
      })),
    [data, maxRev]
  );

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = points.length
    ? `${pathD} L ${points[points.length - 1].x} ${CHART_H - PAD_Y} L ${points[0].x} ${CHART_H - PAD_Y} Z`
    : '';

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="min-w-[500px]">
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="w-full h-56 select-none"
          role="img"
          aria-label="Revenue per day over the last seven days"
        >
          <defs>
            <linearGradient id="adminChartAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="adminBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = PAD_Y + pct * (CHART_H - 2 * PAD_Y);
            const value = Math.round(maxRev * (1 - pct));
            return (
              <g key={pct}>
                <line x1={PAD_X} y1={y} x2={CHART_W - PAD_X} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                <text x={PAD_X - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#64748b" fontFamily="monospace">
                  {formatRwf(value)}
                </text>
              </g>
            );
          })}

          {mode === 'line' && points.length > 0 && (
            <>
              <path d={areaD} fill="url(#adminChartAreaGrad)" />
              <path d={pathD} fill="none" stroke="#f97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </>
          )}

          {mode === 'bar' &&
            points.map((p) => (
              <rect
                key={p.key}
                x={p.x - 16}
                y={p.y}
                width={32}
                height={Math.max(0, CHART_H - PAD_Y - p.y)}
                rx="6"
                fill="url(#adminBarGrad)"
                opacity={0.85}
              />
            ))}

          {points.map((p) => {
            const isHovered = hoveredKey === p.key;
            return (
              <g
                key={p.key}
                onMouseEnter={() => onHover(p.key)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(p.key)}
                onBlur={() => onHover(null)}
                tabIndex={0}
                role="button"
                aria-label={`${p.label}: ${formatRwf(p.rev)} RWF across ${p.orders} orders`}
                className="cursor-pointer outline-none"
              >
                {mode === 'line' && (
                  <circle cx={p.x} cy={p.y} r={isHovered ? 7 : 4} fill="#f97316" stroke="#ffffff" strokeWidth="2" />
                )}
                <rect x={p.x - 30} y={PAD_Y} width={60} height={CHART_H - 2 * PAD_Y} fill="transparent" />
                <text x={p.x} y={CHART_H - 8} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#94a3b8">
                  {p.day}
                </text>
                {isHovered && (
                  <g>
                    <rect
                      x={p.x - 62}
                      y={p.y - 44}
                      width="124"
                      height="36"
                      rx="8"
                      fill="#12141A"
                      stroke="rgba(249,115,22,0.6)"
                      strokeWidth="1"
                    />
                    <text x={p.x} y={p.y - 30} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#ffffff">
                      {formatRwf(p.rev)} RWF
                    </text>
                    <text x={p.x} y={p.y - 18} textAnchor="middle" fontSize="9" fill="#94a3b8">
                      {p.orders} orders
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
