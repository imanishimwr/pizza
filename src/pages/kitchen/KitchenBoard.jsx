import React, { useState, useEffect, useMemo } from 'react';
import {
  ChefHat, Clock, AlertCircle, CheckCircle2, ArrowRight, Bell, Sparkles,
  Volume2, VolumeX, CheckSquare, Square, Search, Filter, RefreshCw,
  Flame, UtensilsCrossed, ShoppingBag, Eye, Phone, MapPin, Check,
  Timer, Layers, BookOpen, AlertTriangle, ShieldCheck, ChevronRight, X
} from 'lucide-react';
import { notificationService } from '../../services/notificationService';

export default function KitchenBoard({
  orders = [],
  onUpdateStatus,
  user: initialUser,
  meals = []
}) {
  // Navigation Tabs: 'kanban' | 'station' | 'archive' | 'recipes'
  const [activeTab, setActiveTab] = useState('kanban');

  // Mobile column filter: 'all' | 'pending' | 'preparing' | 'ready'
  const [mobileColumn, setMobileColumn] = useState('all');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('all');

  // Audio Chimes setting
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Checked items state for packaging checklist: { [orderId-itemIndex]: boolean }
  const [checkedItems, setCheckedItems] = useState({});

  // Selected order for detail modal
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Real-time clock state
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Clock tick every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Show temporary toast
  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Safe user profile
  const user = initialUser || {
    name: 'Head Cooker & Chef',
    email: 'cooker@hotpot.rw',
    role: 'KITCHEN'
  };

  // Filter orders strictly from Neon DB props
  const displayOrders = useMemo(() => {
    return Array.isArray(orders) ? orders : [];
  }, [orders]);

  // Order groupings
  const pendingOrders = useMemo(() => {
    return displayOrders.filter(o => o.status === 'pending');
  }, [displayOrders]);

  const preparingOrders = useMemo(() => {
    return displayOrders.filter(o => o.status === 'preparing');
  }, [displayOrders]);

  const readyOrders = useMemo(() => {
    return displayOrders.filter(o => o.status === 'ready');
  }, [displayOrders]);

  const completedOrders = useMemo(() => {
    return displayOrders.filter(o => o.status === 'delivery' || o.status === 'delivered');
  }, [displayOrders]);

  // Processing orders set to disable double-clicks: { [orderId]: boolean }
  const [processingMap, setProcessingMap] = useState({});

  // Filtered orders based on search query
  const filterBySearch = (list) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(o =>
      String(o.id || '').toLowerCase().includes(q) ||
      String(o.customerName || '').toLowerCase().includes(q) ||
      (o.items || []).some(it => String(it.name || '').toLowerCase().includes(q))
    );
  };

  // Item checklist toggle
  const toggleCheckItem = (orderId, idx) => {
    const key = `${orderId}-${idx}`;
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Play test sound
  const handleToggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    if (nextState) {
      notificationService.playChime('new_order');
      triggerToast('🔊 Kitchen Audio Chimes Activated');
    } else {
      triggerToast('🔇 Kitchen Audio Chimes Muted');
    }
  };

  // Status progression action with immediate double-click guard
  const handleAdvanceStatus = async (orderId, nextStatus) => {
    if (processingMap[orderId]) return; // Guard: Cannot click twice

    setProcessingMap(prev => ({ ...prev, [orderId]: true }));
    try {
      if (soundEnabled) {
        if (nextStatus === 'ready') {
          notificationService.playChime('order_ready');
        } else {
          notificationService.playChime('status_update');
        }
      }
      if (onUpdateStatus) {
        await onUpdateStatus(orderId, nextStatus);
      }
      triggerToast(
        nextStatus === 'preparing'
          ? `🔥 Order #${orderId} moved to Cooking station!`
          : nextStatus === 'ready'
          ? `✅ Cooker confirmed Order #${orderId} is READY for delivery!`
          : nextStatus === 'delivery'
          ? `🛵 Order #${orderId} handed to rider & completed! Logged in Admin Sales Report.`
          : `Order #${orderId} updated to ${nextStatus}`
      );
    } catch (err) {
      console.error("Status update error:", err);
      triggerToast("⚠️ Failed to update order status");
    } finally {
      // Delay releasing processing lock slightly to prevent bounce
      setTimeout(() => {
        setProcessingMap(prev => {
          const copy = { ...prev };
          delete copy[orderId];
          return copy;
        });
      }, 500);
    }
  };

  // Manual refresh animation
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      triggerToast('⚡ Kitchen board synced with Neon DB');
    }, 600);
  };

  // Urgency badge calculator based on order creation time
  const getUrgencyBadge = (order) => {
    const created = order.created_at ? new Date(order.created_at) : null;
    if (!created || isNaN(created.getTime())) {
      return { label: '⏱️ Target 15m', badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    }
    const elapsedMins = Math.floor((currentTime - created) / 60000);
    if (elapsedMins < 8) {
      return { label: `🟢 ${elapsedMins}m ago (Fresh)`, badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    } else if (elapsedMins < 18) {
      return { label: `🟡 ${elapsedMins}m ago (Cooking)`, badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    } else {
      return { label: `🔴 ${elapsedMins}m ago (Rush Order)`, badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse' };
    }
  };

  // Aggregated items across all active (pending + preparing) orders for Station view
  const aggregatedPrepList = useMemo(() => {
    const map = {};
    const active = [...pendingOrders, ...preparingOrders];
    for (const ord of active) {
      for (const item of (ord.items || [])) {
        const key = item.name || 'Custom Item';
        if (!map[key]) {
          map[key] = { name: key, totalQty: 0, spiceNotes: [], orders: [] };
        }
        map[key].totalQty += (Number(item.qty) || 1);
        if (item.spice) map[key].spiceNotes.push(item.spice);
        if (!map[key].orders.includes(ord.id)) map[key].orders.push(ord.id);
      }
    }
    return Object.values(map).sort((a, b) => b.totalQty - a.totalQty);
  }, [pendingOrders, preparingOrders]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-4 z-50 p-4 rounded-2xl bg-amber-950/90 border border-amber-500/40 text-white shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fade-in text-sm font-semibold">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. VIP HERO HEADER CARD (Matches Admin Dashboard Aesthetic) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950/60 via-surface-card to-surface-card border border-amber-500/30 p-5 md:p-7 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-1/3 w-60 h-60 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Chef Profile & Title */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-xl shadow-amber-500/20 ring-4 ring-amber-500/20">
                <ChefHat className="w-8 h-8 md:w-9 md:h-9" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-surface-card flex items-center justify-center text-[10px] text-white">
                ✓
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  HotPot Delights Kitchen Console
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  👨‍🍳 Executive Cooker
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Neon DB Sync
                </span>
              </div>
              <p className="text-xs text-amber-200/70 font-medium">
                Kigali Kitchen HQ • Logged in as <span className="text-white font-bold">{user.name || user.email}</span>
              </p>
            </div>
          </div>

          {/* Quick Header Controls (Time, Audio, Refresh) */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Live Clock Pill */}
            <div className="px-3.5 py-2 rounded-2xl bg-black/40 border border-white/10 text-xs font-mono font-bold text-amber-300 flex items-center gap-2 shadow-inner">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>{currentTime.toLocaleTimeString()}</span>
            </div>

            {/* Audio Alert Toggle */}
            <button
              onClick={handleToggleSound}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 border transition-all active:scale-95 shadow-md ${
                soundEnabled
                  ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/80'
                  : 'bg-black/40 border-white/10 text-text-muted hover:bg-white/5'
              }`}
              title="Toggle Audio Notifications"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-text-muted" />}
              <span className="hidden sm:inline">Sound</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-black/40">
                {soundEnabled ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Live Sync Refresh */}
            <button
              onClick={handleManualRefresh}
              className="p-2.5 rounded-2xl bg-surface-card hover:bg-white/10 border border-white/10 text-text-main transition-all active:scale-95 shadow-md flex items-center gap-2 text-xs font-bold"
              title="Sync with Neon PostgreSQL Database"
            >
              <RefreshCw className={`w-4 h-4 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync DB</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. STATS METRICS GRID (4 VIP Cards Matching Admin Style) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
        {/* Metric 1: Pending Orders */}
        <div
          onClick={() => { setActiveTab('kanban'); setMobileColumn('pending'); }}
          className="card-item p-4 md:p-5 border-amber-500/30 hover:border-amber-500/60 transition-all cursor-pointer group bg-gradient-to-br from-amber-950/20 to-surface-card relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">New Pending</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-black text-white font-mono">{pendingOrders.length}</span>
            <span className="text-[10px] text-amber-400 font-semibold">awaiting start</span>
          </div>
          <div className="mt-2 text-[11px] text-text-muted flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Ready for cooker pickup</span>
          </div>
        </div>

        {/* Metric 2: In Preparation */}
        <div
          onClick={() => { setActiveTab('kanban'); setMobileColumn('preparing'); }}
          className="card-item p-4 md:p-5 border-blue-500/30 hover:border-blue-500/60 transition-all cursor-pointer group bg-gradient-to-br from-blue-950/20 to-surface-card relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">On Stoves</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-black text-white font-mono">{preparingOrders.length}</span>
            <span className="text-[10px] text-blue-400 font-semibold">in cooking</span>
          </div>
          <div className="mt-2 text-[11px] text-text-muted flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span>Simmering & packaging</span>
          </div>
        </div>

        {/* Metric 3: Ready for Courier */}
        <div
          onClick={() => { setActiveTab('kanban'); setMobileColumn('ready'); }}
          className="card-item p-4 md:p-5 border-emerald-500/30 hover:border-emerald-500/60 transition-all cursor-pointer group bg-gradient-to-br from-emerald-950/20 to-surface-card relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Cooker Ready</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-black text-white font-mono">{readyOrders.length}</span>
            <span className="text-[10px] text-emerald-400 font-semibold">packed & hot</span>
          </div>
          <div className="mt-2 text-[11px] text-text-muted flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Ready for rider pickup</span>
          </div>
        </div>

        {/* Metric 4: Completed / Dispatched */}
        <div
          onClick={() => setActiveTab('archive')}
          className="card-item p-4 md:p-5 border-purple-500/30 hover:border-purple-500/60 transition-all cursor-pointer group bg-gradient-to-br from-purple-950/20 to-surface-card relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Dispatched Today</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-black text-white font-mono">{completedOrders.length}</span>
            <span className="text-[10px] text-purple-400 font-semibold">on road / done</span>
          </div>
          <div className="mt-2 text-[11px] text-text-muted flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span>Fulfilled orders</span>
          </div>
        </div>
      </div>

      {/* 3. NAVIGATION TABS BAR (Desktop + Touch Horizontal Scroll) */}
      <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('kanban')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border ${
              activeTab === 'kanban'
                ? 'bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-600/20'
                : 'bg-surface-card text-text-muted border-white/5 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Live Kanban Dispatch</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 font-mono">
              {pendingOrders.length + preparingOrders.length + readyOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('station')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border ${
              activeTab === 'station'
                ? 'bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-600/20'
                : 'bg-surface-card text-text-muted border-white/5 hover:bg-white/5 hover:text-white'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Station Checklist</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 font-mono">
              {aggregatedPrepList.length} items
            </span>
          </button>

          <button
            onClick={() => setActiveTab('archive')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border ${
              activeTab === 'archive'
                ? 'bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-600/20'
                : 'bg-surface-card text-text-muted border-white/5 hover:bg-white/5 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Order History</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 font-mono">
              {displayOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('recipes')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border ${
              activeTab === 'recipes'
                ? 'bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-600/20'
                : 'bg-surface-card text-text-muted border-white/5 hover:bg-white/5 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Recipe & Guides</span>
          </button>
        </div>

        {/* Global Kitchen Search */}
        <div className="relative min-w-[200px] sm:min-w-[240px] shrink-0">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Order # or dish..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-surface-card border border-white/10 text-xs text-white placeholder-text-subdued focus:outline-none focus:border-amber-500/60"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 4. TAB CONTENT 1: LIVE KANBAN DISPATCH */}
      {activeTab === 'kanban' && (
        <div className="space-y-6">
          {/* Mobile Phone Segmented Column Switcher (< lg screens) */}
          <div className="lg:hidden flex items-center gap-1.5 p-1.5 rounded-2xl bg-surface-card border border-white/10 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setMobileColumn('all')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all shrink-0 ${
                mobileColumn === 'all'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              All ({pendingOrders.length + preparingOrders.length + readyOrders.length})
            </button>
            <button
              onClick={() => setMobileColumn('pending')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all shrink-0 ${
                mobileColumn === 'pending'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              🔥 New ({pendingOrders.length})
            </button>
            <button
              onClick={() => setMobileColumn('preparing')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all shrink-0 ${
                mobileColumn === 'preparing'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              🍳 Cooking ({preparingOrders.length})
            </button>
            <button
              onClick={() => setMobileColumn('ready')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all shrink-0 ${
                mobileColumn === 'ready'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              ✅ Ready ({readyOrders.length})
            </button>
          </div>

          {/* 3-Column Kanban Layout (Desktop grid, responsive on mobile via column switcher or grid) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* COLUMN 1: NEW PENDING ORDERS */}
            {(mobileColumn === 'all' || mobileColumn === 'pending') && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-surface-card border border-amber-500/30 flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                      1. New Incoming Orders
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {filterBySearch(pendingOrders).length}
                  </span>
                </div>

                <div className="space-y-4">
                  {filterBySearch(pendingOrders).length === 0 ? (
                    <div className="p-8 text-center bg-surface-card/40 rounded-2xl border border-dashed border-white/10 text-xs text-text-subdued space-y-2">
                      <ChefHat className="w-8 h-8 text-text-subdued mx-auto opacity-50" />
                      <div>No pending orders in queue</div>
                      <p className="text-[10px] text-text-muted">Incoming client orders will trigger audio chimes immediately.</p>
                    </div>
                  ) : (
                    filterBySearch(pendingOrders).map(order => {
                      const urgency = getUrgencyBadge(order);
                      return (
                        <div
                          key={order.id}
                          className="card-item p-4 md:p-5 space-y-3.5 border-amber-500/40 hover:border-amber-500/80 transition-all bg-gradient-to-b from-amber-950/20 via-surface-card to-surface-card shadow-xl relative"
                        >
                          {/* Card Header */}
                          <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-amber-400 text-sm">#{order.id}</span>
                              <span className="text-xs font-bold text-white truncate max-w-[120px]">
                                {order.customerName || 'Customer'}
                              </span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${urgency.badgeClass}`}>
                              {urgency.label}
                            </span>
                          </div>

                          {/* Customer Note / Kitchen Instruction */}
                          {order.notes && (
                            <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/30 text-[11px] text-amber-200 flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold text-amber-300 block">Chef Note:</span>
                                <span>{order.notes}</span>
                              </div>
                            </div>
                          )}

                          {/* Ordered Items List */}
                          <div className="space-y-2 bg-black/30 p-3 rounded-xl border border-white/5">
                            {(order.items || []).map((item, idx) => (
                              <div key={idx} className="text-xs font-semibold text-text-main flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-300 flex items-center justify-center font-mono text-[10px] font-bold">
                                    {item.qty}x
                                  </span>
                                  <span>{item.name}</span>
                                </span>
                                {item.spice && (
                                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-500/30">
                                    🔥 {item.spice}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Action Buttons */}
                          <div className="grid grid-cols-3 gap-2 pt-1">
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="p-2.5 rounded-xl bg-surface-card hover:bg-white/10 border border-white/10 text-text-muted hover:text-white text-xs font-bold flex items-center justify-center gap-1 transition-all"
                              title="Inspect Full Order Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                            <button
                              disabled={!!processingMap[order.id]}
                              onClick={() => handleAdvanceStatus(order.id, 'preparing')}
                              className={`col-span-2 min-h-[44px] rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${
                                processingMap[order.id]
                                  ? 'bg-amber-900/50 text-amber-300/60 cursor-not-allowed pointer-events-none'
                                  : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-amber-600/20'
                              }`}
                            >
                              {processingMap[order.id] ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                                  <span>Starting Cook...</span>
                                </>
                              ) : (
                                <>
                                  <Flame className="w-4 h-4" />
                                  <span>Start Cooking 👨‍🍳</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* COLUMN 2: IN PREPARATION & SIMMERING */}
            {(mobileColumn === 'all' || mobileColumn === 'preparing') && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-surface-card border border-blue-500/30 flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider text-blue-400">
                      2. Cooking & Packaging
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {filterBySearch(preparingOrders).length}
                  </span>
                </div>

                <div className="space-y-4">
                  {filterBySearch(preparingOrders).length === 0 ? (
                    <div className="p-8 text-center bg-surface-card/40 rounded-2xl border border-dashed border-white/10 text-xs text-text-subdued space-y-2">
                      <Flame className="w-8 h-8 text-text-subdued mx-auto opacity-50" />
                      <div>No meals currently cooking</div>
                      <p className="text-[10px] text-text-muted">Click "Start Cooking" on pending orders to begin prep.</p>
                    </div>
                  ) : (
                    filterBySearch(preparingOrders).map(order => {
                      const urgency = getUrgencyBadge(order);
                      const totalItemsCount = (order.items || []).length;
                      const checkedCount = (order.items || []).filter((_, idx) => checkedItems[`${order.id}-${idx}`]).length;

                      return (
                        <div
                          key={order.id}
                          className="card-item p-4 md:p-5 space-y-3.5 border-blue-500/40 hover:border-blue-500/80 transition-all bg-gradient-to-b from-blue-950/20 via-surface-card to-surface-card shadow-xl relative"
                        >
                          {/* Card Header */}
                          <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-blue-400 text-sm">#{order.id}</span>
                              <span className="text-xs font-bold text-white truncate max-w-[120px]">
                                {order.customerName || 'Customer'}
                              </span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${urgency.badgeClass}`}>
                              {urgency.label}
                            </span>
                          </div>

                          {/* Packaging Progress Bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-bold text-text-muted">
                              <span>Packaging Checklist</span>
                              <span className={checkedCount === totalItemsCount && totalItemsCount > 0 ? 'text-emerald-400 font-mono' : 'text-blue-400 font-mono'}>
                                {checkedCount}/{totalItemsCount} packed
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-300"
                                style={{ width: `${totalItemsCount > 0 ? (checkedCount / totalItemsCount) * 100 : 0}%` }}
                              />
                            </div>
                          </div>

                          {/* Interactive Packaging Checklist */}
                          <div className="space-y-1.5 bg-black/30 p-3 rounded-xl border border-white/5">
                            {(order.items || []).map((item, idx) => {
                              const isChecked = checkedItems[`${order.id}-${idx}`];
                              return (
                                <div
                                  key={idx}
                                  onClick={() => toggleCheckItem(order.id, idx)}
                                  className={`text-xs p-2 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                                    isChecked
                                      ? 'line-through text-emerald-400/70 bg-emerald-950/40 border border-emerald-500/20'
                                      : 'text-text-main hover:bg-white/5 border border-transparent'
                                  }`}
                                >
                                  <span className="flex items-center gap-2 font-medium">
                                    {isChecked ? (
                                      <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                                    ) : (
                                      <Square className="w-4 h-4 text-text-muted shrink-0" />
                                    )}
                                    <span>{item.qty}x {item.name}</span>
                                  </span>
                                  {item.spice && (
                                    <span className="text-[10px] font-extrabold text-red-400">
                                      {item.spice}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Action Buttons */}
                          <div className="grid grid-cols-3 gap-2 pt-1">
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="p-2.5 rounded-xl bg-surface-card hover:bg-white/10 border border-white/10 text-text-muted hover:text-white text-xs font-bold flex items-center justify-center gap-1 transition-all"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                            <button
                              disabled={!!processingMap[order.id]}
                              onClick={() => handleAdvanceStatus(order.id, 'ready')}
                              className={`col-span-2 min-h-[44px] rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${
                                processingMap[order.id]
                                  ? 'bg-emerald-900/50 text-emerald-300/60 cursor-not-allowed pointer-events-none'
                                  : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-emerald-600/20'
                              }`}
                            >
                              {processingMap[order.id] ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                                  <span>Confirming Ready...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>Mark Cooker Ready ✅</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* COLUMN 3: READY FOR COURIER PICKUP */}
            {(mobileColumn === 'all' || mobileColumn === 'ready') && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-surface-card border border-emerald-500/30 flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                      3. Ready for Rider Pickup
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {filterBySearch(readyOrders).length}
                  </span>
                </div>

                <div className="space-y-4">
                  {filterBySearch(readyOrders).length === 0 ? (
                    <div className="p-8 text-center bg-surface-card/40 rounded-2xl border border-dashed border-white/10 text-xs text-text-subdued space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-text-subdued mx-auto opacity-50" />
                      <div>No meals waiting for courier pickup</div>
                      <p className="text-[10px] text-text-muted">Meals marked as ready will appear here for handover.</p>
                    </div>
                  ) : (
                    filterBySearch(readyOrders).map(order => (
                      <div
                        key={order.id}
                        className="card-item p-4 md:p-5 space-y-3.5 border-emerald-500/40 hover:border-emerald-500/80 transition-all bg-gradient-to-b from-emerald-950/20 via-surface-card to-surface-card shadow-xl relative"
                      >
                        {/* Card Header */}
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-emerald-400 text-sm">#{order.id}</span>
                            <span className="text-xs font-bold text-white truncate max-w-[120px]">
                              {order.customerName || 'Customer'}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Cooker Verified
                          </span>
                        </div>

                        {/* Customer Address / Destination */}
                        <div className="text-xs text-text-muted flex items-center gap-2 bg-black/30 p-2.5 rounded-xl border border-white/5">
                          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="truncate">{order.deliveryAddress || 'Kigali Dropoff'}</span>
                        </div>

                        {/* Packed Items Summary */}
                        <div className="space-y-1 text-xs text-text-muted bg-black/20 p-2.5 rounded-xl border border-white/5">
                          {(order.items || []).map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-text-main">
                              <span>{item.qty}x {item.name}</span>
                              <span className="text-[10px] text-emerald-400 font-bold">✓ Packed</span>
                            </div>
                          ))}
                        </div>

                        {/* Handover & View actions */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-2.5 rounded-xl bg-surface-card hover:bg-white/10 border border-white/10 text-text-muted hover:text-white text-xs font-bold flex items-center justify-center gap-1 transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>
                          <button
                            disabled={!!processingMap[order.id]}
                            onClick={() => handleAdvanceStatus(order.id, 'delivery')}
                            className={`min-h-[44px] rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 ${
                              processingMap[order.id]
                                ? 'bg-blue-900/50 text-blue-300/60 cursor-not-allowed pointer-events-none'
                                : 'bg-blue-600/80 hover:bg-blue-600 text-white'
                            }`}
                          >
                            {processingMap[order.id] ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Handing over...</span>
                              </>
                            ) : (
                              <span>Hand to Rider 🛵</span>
                            )}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. TAB CONTENT 2: CONSOLIDATED STATION CHECKLIST */}
      {activeTab === 'station' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-surface-card border border-white/10 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5 text-amber-400" />
                  Active Cooking Station Totals
                </h3>
                <p className="text-xs text-text-muted">
                  Aggregated dish quantities across all pending & simmering orders. Helps cookers prep broths, meats, and sides in batch.
                </p>
              </div>
              <div className="px-3.5 py-1.5 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-2">
                <span>Active Batches:</span>
                <span className="font-mono text-white text-sm">{aggregatedPrepList.length} unique dishes</span>
              </div>
            </div>

            {aggregatedPrepList.length === 0 ? (
              <div className="p-12 text-center text-xs text-text-subdued space-y-2">
                <ChefHat className="w-10 h-10 mx-auto text-text-subdued opacity-40" />
                <div className="font-bold text-white">Station is Clear!</div>
                <div>No active food preparation needed right now.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {aggregatedPrepList.map((dish, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-amber-500/40 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white">{dish.name}</span>
                      <span className="w-9 h-9 rounded-xl bg-amber-600 text-white font-mono font-black text-sm flex items-center justify-center shadow-lg shadow-amber-600/30">
                        {dish.totalQty}x
                      </span>
                    </div>

                    <div className="text-[11px] text-text-muted flex items-center justify-between">
                      <span>Needed for {dish.orders.length} order(s):</span>
                      <span className="font-mono text-amber-400 font-semibold">
                        {dish.orders.slice(0, 3).map(id => `#${id}`).join(', ')}
                        {dish.orders.length > 3 ? ` +${dish.orders.length - 3}` : ''}
                      </span>
                    </div>

                    {dish.spiceNotes.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {dish.spiceNotes.map((sp, sIdx) => (
                          <span key={sIdx} className="text-[10px] px-2 py-0.5 rounded-full bg-red-950/80 text-red-400 border border-red-500/30 font-bold">
                            🔥 {sp}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. TAB CONTENT 3: ORDER HISTORY & ARCHIVE */}
      {activeTab === 'archive' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-surface-card border border-white/10 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-purple-400" />
                  All Kitchen Orders Log
                </h3>
                <p className="text-xs text-text-muted">Complete ledger of live and completed orders from Neon PostgreSQL.</p>
              </div>
            </div>

            <div className="space-y-3">
              {displayOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-subdued">No orders recorded in database yet.</div>
              ) : (
                displayOrders.map(order => (
                  <div
                    key={order.id}
                    className="p-4 rounded-2xl bg-black/30 border border-white/5 hover:border-white/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-amber-400 text-sm">#{order.id}</span>
                        <span className="text-sm font-bold text-white">{order.customerName || 'Customer'}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                          order.status === 'ready' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          order.status === 'preparing' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                          order.status === 'pending' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="text-xs text-text-muted flex flex-wrap items-center gap-3">
                        <span>Items: {(order.items || []).map(i => `${i.qty}x ${i.name}`).join(', ')}</span>
                        <span>•</span>
                        <span className="font-mono text-white font-semibold">{Number(order.totalRWF || 0).toLocaleString()} RWF</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="px-4 py-2 rounded-xl bg-surface-card hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-2 self-start md:self-auto"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Details</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. TAB CONTENT 4: RECIPES & KITCHEN COOKING GUIDELINES */}
      {activeTab === 'recipes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card-item p-5 border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white">🌶️ Sichuan Spicy Beef Hotpot</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-red-950 text-red-400 border border-red-500/30 font-bold">
                12 min prep
              </span>
            </div>
            <p className="text-xs text-text-muted">
              Simmer rich bone broth with fermented chili paste, Sichuan peppercorns, and star anise. Box fresh sliced beef, enoki mushrooms, and lotus root separately in chilled container.
            </p>
            <div className="text-[11px] text-amber-300 font-semibold bg-amber-950/40 p-2.5 rounded-xl border border-amber-500/20">
              🔥 Target Broth Temp: 92°C before sealing container.
            </div>
          </div>

          <div className="card-item p-5 border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white">🍄 Herbal Mushroom Hotpot</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-bold">
                10 min prep
              </span>
            </div>
            <p className="text-xs text-text-muted">
              Vegetarian supreme broth steeped with wild shiitake, porcini essence, goji berries, and fresh ginger roots. Include tofu puffs and bok choy pack.
            </p>
            <div className="text-[11px] text-emerald-300 font-semibold bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-500/20">
              🌿 100% Plant-based station seal.
            </div>
          </div>

          <div className="card-item p-5 border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white">🍗 Peri-Peri Crispy Chicken</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-950 text-amber-400 border border-amber-500/30 font-bold">
                15 min fry
              </span>
            </div>
            <p className="text-xs text-text-muted">
              Double-dredged chicken wings and tenders in Kigali spice blend. Deep fry at 175°C until golden crispy. Brush with house spicy peri-peri glaze.
            </p>
            <div className="text-[11px] text-amber-300 font-semibold bg-amber-950/40 p-2.5 rounded-xl border border-amber-500/20">
              📦 Use ventilated steam-box to maintain crispiness.
            </div>
          </div>
        </div>
      )}

      {/* 8. ORDER DETAILS MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-surface-card border border-amber-500/40 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto no-scrollbar">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">Order #{selectedOrder.id} Details</h3>
                  <p className="text-xs text-text-muted">Placed at {selectedOrder.orderTime || 'Today'}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            {/* Customer & Delivery Card */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-text-muted">Customer Name:</span>
                <span className="font-bold text-white">{selectedOrder.customerName || 'Customer'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Phone Contact:</span>
                <a href={`tel:${selectedOrder.phone || '+250788123456'}`} className="font-mono text-amber-400 font-bold hover:underline flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {selectedOrder.phone || '+250 788 123 456'}
                </a>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Delivery Address:</span>
                <span className="font-medium text-white text-right max-w-[200px]">{selectedOrder.deliveryAddress || 'Kigali Dropoff'}</span>
              </div>
            </div>

            {/* Items Checklist */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider block">Items in this order:</span>
              <div className="space-y-2 bg-black/30 p-3 rounded-2xl border border-white/5">
                {(selectedOrder.items || []).map((item, idx) => (
                  <div key={idx} className="text-xs flex items-center justify-between text-text-main p-1.5 border-b border-white/5 last:border-0">
                    <span className="font-semibold">{item.qty}x {item.name}</span>
                    <span className="font-mono text-amber-400 font-bold">{Number(item.price || 0).toLocaleString()} RWF</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-2">
              {selectedOrder.status === 'pending' && (
                <button
                  disabled={!!processingMap[selectedOrder.id]}
                  onClick={async () => {
                    await handleAdvanceStatus(selectedOrder.id, 'preparing');
                    setSelectedOrder(null);
                  }}
                  className={`w-full btn-primary py-3 text-xs flex items-center justify-center gap-2 ${
                    processingMap[selectedOrder.id]
                      ? 'bg-amber-900/50 text-amber-300/60 cursor-not-allowed pointer-events-none'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {processingMap[selectedOrder.id] ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                      <span>Starting...</span>
                    </>
                  ) : (
                    <>
                      <Flame className="w-4 h-4" />
                      <span>Start Cooking Now</span>
                    </>
                  )}
                </button>
              )}
              {selectedOrder.status === 'preparing' && (
                <button
                  disabled={!!processingMap[selectedOrder.id]}
                  onClick={async () => {
                    await handleAdvanceStatus(selectedOrder.id, 'ready');
                    setSelectedOrder(null);
                  }}
                  className={`w-full btn-primary py-3 text-xs flex items-center justify-center gap-2 ${
                    processingMap[selectedOrder.id]
                      ? 'bg-emerald-900/50 text-emerald-300/60 cursor-not-allowed pointer-events-none'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {processingMap[selectedOrder.id] ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>Confirming Ready...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Ready for Rider</span>
                    </>
                  )}
                </button>
              )}
              {selectedOrder.status === 'ready' && (
                <button
                  disabled={!!processingMap[selectedOrder.id]}
                  onClick={async () => {
                    await handleAdvanceStatus(selectedOrder.id, 'delivery');
                    setSelectedOrder(null);
                  }}
                  className={`w-full btn-primary py-3 text-xs flex items-center justify-center gap-2 ${
                    processingMap[selectedOrder.id]
                      ? 'bg-blue-900/50 text-blue-300/60 cursor-not-allowed pointer-events-none'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {processingMap[selectedOrder.id] ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Handing over...</span>
                    </>
                  ) : (
                    <span>Hand to Delivery Courier 🛵</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
