import React, { useState, useEffect, useMemo } from 'react';
import {
  ChefHat, Clock, AlertCircle, CheckCircle2, ArrowRight, Bell, Sparkles,
  Volume2, VolumeX, CheckSquare, Square, Search, Filter, RefreshCw,
  Flame, UtensilsCrossed, ShoppingBag, Eye, Phone, MapPin, Check,
  Timer, Layers, BookOpen, AlertTriangle, ShieldCheck, ChevronRight,
  ChevronLeft, X, Bike, SlidersHorizontal, Radio, ArrowLeft, Home, Store,
  Menu, UserPlus, Plus, Edit3, UserCheck, Hash
} from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import { apiService } from '../../services/apiService';

export default function KitchenBoard({
  orders = [],
  onUpdateStatus,
  user: initialUser,
  _meals = [],
  onSwitchRole
}) {
  // Sidebar Collapse state (desktop expanded w-64 vs collapsed w-16)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Mobile Drawer state (slide-over for screens < 768px)
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Active navigation tab: 'kanban' | 'archive' | 'recipes' | 'station'
  const [activeTab, setActiveTab] = useState('kanban');

  // Station Switcher: 'all' | 'stoves' | 'assembly' | 'packaging'
  const [activeStation, setActiveStation] = useState('all');

  // Order Type filter: 'all' | 'delivery' | 'takeout' | 'dine-in'
  const [orderTypeFilter, setOrderTypeFilter] = useState('all');

  // Priority / Overdue filter toggle (> 10 mins elapsed)
  const [priorityOnly, setPriorityOnly] = useState(false);

  // Mobile column filter: 'pending' | 'preparing' | 'ready'
  const [mobileColumn, setMobileColumn] = useState('pending');

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Audio alerts setting
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Checked items state for packaging checklist
  const [checkedItems, setCheckedItems] = useState({});

  // Selected order for detail modal
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Riders Fleet & Handover Map
  const [riders, setRiders] = useState([]);
  const [selectedRiderMap, setSelectedRiderMap] = useState({});
  const [assigningMap, setAssigningMap] = useState({});

  // Real-time ticking clock
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const loadRiders = async () => {
    try {
      const data = await apiService.getRiders();
      if (Array.isArray(data)) setRiders(data);
    } catch (err) {
      console.warn('KitchenBoard: Failed to fetch riders fleet', err);
    }
  };

  // Background interval to refresh order age & couriers (every 5s)
  useEffect(() => {
    loadRiders();
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      loadRiders();
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const _user = initialUser || {
    name: 'Head Cooker & Chef',
    email: 'cooker@hotpot.rw',
    role: 'KITCHEN'
  };

  // Toggle audio
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

  // Manual DB Refresh
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    if (soundEnabled) notificationService.playChime('status_update');
    setTimeout(() => {
      setIsRefreshing(false);
      triggerToast('⚡ Kitchen board synced with Neon DB');
    }, 600);
  };

  // Processing orders lock map
  const [processingMap, setProcessingMap] = useState({});

  // Status progression action with immediate double-click guard and FIFO auto-advance
  const handleAdvanceStatus = async (orderId, nextStatus) => {
    if (processingMap[orderId]) return;

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
          ? `🛵 Order #${orderId} handed to rider!`
          : `Order #${orderId} updated to ${nextStatus}`
      );

      // FIFO Auto-Queue: When ready order is handed over, auto-advance earliest pending order
      if (nextStatus === 'delivery') {
        const remainingPending = pendingOrders.filter(o => o.id !== orderId);
        if (remainingPending.length > 0) {
          const nextOrderToCook = remainingPending[0];
          setTimeout(async () => {
            if (onUpdateStatus) {
              await onUpdateStatus(nextOrderToCook.id, 'preparing');
              triggerToast(`⚡ FIFO Auto-Queue: Order #${nextOrderToCook.id} moved to Cooking!`);
            }
          }, 450);
        }
      }
    } catch (err) {
      console.error("Status update error:", err);
      triggerToast("⚠️ Failed to update order status");
    } finally {
      setTimeout(() => {
        setProcessingMap(prev => {
          const copy = { ...prev };
          delete copy[orderId];
          return copy;
        });
      }, 500);
    }
  };

  // Smart Handover: Assign free courier to ready order & generate 4-digit PIN
  const handleAssignRiderToOrder = async (orderId, riderId) => {
    if (!riderId) {
      triggerToast("⚠️ Please select an available courier first");
      return;
    }
    setAssigningMap(prev => ({ ...prev, [orderId]: true }));
    try {
      const result = await apiService.assignRiderToOrder(orderId, riderId);
      if (soundEnabled) notificationService.playChime('order_ready');
      triggerToast(`✅ Courier Assigned! Verification PIN: ${result.verification_pin || 'Generated'}`);
      await loadRiders();
    } catch (err) {
      triggerToast(`⚠️ Handover Error: ${err.message || 'Failed to assign courier'}`);
    } finally {
      setAssigningMap(prev => {
        const copy = { ...prev };
        delete copy[orderId];
        return copy;
      });
    }
  };

  // Manual / Custom Courier Assignment Modal State & Handlers
  const [manualRiderOrder, setManualRiderOrder] = useState(null);
  const [manualRiderForm, setManualRiderForm] = useState({
    name: '',
    phone: '',
    plateNumber: '',
    vehicleType: 'Motorcycle Express',
    verificationPin: '',
    shift: 'Kitchen On-Demand'
  });
  const [isSubmittingManualRider, setIsSubmittingManualRider] = useState(false);

  const openManualRiderModal = (order) => {
    setManualRiderOrder(order);
    setManualRiderForm({
      name: order.riderName || '',
      phone: order.riderPhone || '',
      plateNumber: order.riderPlate || '',
      vehicleType: order.riderVehicle || 'Motorcycle Express',
      verificationPin: order.verification_pin || Math.floor(1000 + Math.random() * 9000).toString(),
      shift: 'Kitchen On-Demand'
    });
  };

  const handleAssignManualRider = async (e) => {
    if (e) e.preventDefault();
    if (!manualRiderOrder) return;
    if (!manualRiderForm.name.trim() || !manualRiderForm.phone.trim()) {
      triggerToast("⚠️ Courier Name and Phone Number are required.");
      return;
    }
    setIsSubmittingManualRider(true);
    try {
      const result = await apiService.assignManualRiderToOrder(manualRiderOrder.id, manualRiderForm);
      if (soundEnabled) notificationService.playChime('order_ready');
      triggerToast(`🛵 Courier ${manualRiderForm.name} assigned to Order #${manualRiderOrder.id}! Handover PIN: ${result.verificationPin || manualRiderForm.verificationPin}`);
      setManualRiderOrder(null);
      await loadRiders();
    } catch (err) {
      triggerToast(`⚠️ Failed to assign courier: ${err.message || 'Server error'}`);
    } finally {
      setIsSubmittingManualRider(false);
    }
  };

  // Item checklist toggle
  const toggleCheckItem = (orderId, idx) => {
    const key = `${orderId}-${idx}`;
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Urgency calculator: Green (<5 mins), Yellow (5-10 mins), Red (>10 mins)
  const getUrgency = (order) => {
    const created = order.created_at ? new Date(order.created_at) : null;
    if (!created || isNaN(created.getTime())) {
      return {
        tier: 'green',
        elapsedStr: '< 1m',
        label: 'Fresh (<5m)',
        borderClass: 'border-emerald-500/40 bg-surface-card',
        headerBadge: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
        pulse: false,
      };
    }
    const diffMs = currentTime.getTime() - created.getTime();
    const totalSecs = Math.max(0, Math.floor(diffMs / 1000));
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const elapsedStr = `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;

    if (mins < 5) {
      return {
        tier: 'green',
        elapsedStr,
        label: '🟢 Fresh',
        borderClass: 'border-emerald-500/50 hover:border-emerald-400',
        headerBadge: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
        pulse: false,
      };
    } else if (mins < 10) {
      return {
        tier: 'yellow',
        elapsedStr,
        label: '🟡 Active',
        borderClass: 'border-amber-500/60 hover:border-amber-400',
        headerBadge: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
        pulse: false,
      };
    } else {
      return {
        tier: 'red',
        elapsedStr,
        label: '🔴 Urgent (>10m)',
        borderClass: 'border-red-500 hover:border-red-400 shadow-lg shadow-red-500/20 ring-1 ring-red-500/60',
        headerBadge: 'bg-red-950 text-red-300 border-red-500/60 animate-pulse font-black',
        pulse: true,
      };
    }
  };

  // Master Filter Pipeline
  const filteredOrders = useMemo(() => {
    let list = Array.isArray(orders) ? orders : [];

    // 1. Station Filter
    if (activeStation === 'stoves') {
      list = list.filter(o => (o.items || []).some(it => {
        const n = (it.name || '').toLowerCase();
        return n.includes('hotpot') || n.includes('broth') || n.includes('soup') || n.includes('beef');
      }));
    } else if (activeStation === 'assembly') {
      list = list.filter(o => (o.items || []).some(it => {
        const n = (it.name || '').toLowerCase();
        return n.includes('pizza') || n.includes('bread') || n.includes('chicken') || n.includes('fries');
      }));
    } else if (activeStation === 'packaging') {
      list = list.filter(o => o.status === 'preparing' || o.status === 'ready');
    }

    // 2. Order Type Filter
    if (orderTypeFilter !== 'all') {
      list = list.filter(o => {
        const t = (o.type || o.orderType || 'delivery').toLowerCase();
        return t === orderTypeFilter;
      });
    }

    // 3. Priority / Overdue Filter (> 10 mins elapsed)
    if (priorityOnly) {
      list = list.filter(o => {
        const created = o.created_at ? new Date(o.created_at) : null;
        if (!created || isNaN(created.getTime())) return false;
        const elapsedMins = (currentTime.getTime() - created.getTime()) / 60000;
        return elapsedMins >= 10;
      });
    }

    // 4. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(o =>
        String(o.id || '').toLowerCase().includes(q) ||
        String(o.customerName || '').toLowerCase().includes(q) ||
        (o.items || []).some(it => String(it.name || '').toLowerCase().includes(q))
      );
    }

    return list;
  }, [orders, activeStation, orderTypeFilter, priorityOnly, searchQuery, currentTime]);

  // FIFO Groupings: Earliest arrived order first
  const pendingOrders = useMemo(() => {
    return filteredOrders
      .filter(o => o.status === 'pending')
      .sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : (Number(a.id) || 0);
        const timeB = b.created_at ? new Date(b.created_at).getTime() : (Number(b.id) || 0);
        return timeA - timeB;
      });
  }, [filteredOrders]);

  const preparingOrders = useMemo(() => {
    return filteredOrders
      .filter(o => o.status === 'preparing')
      .sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : (Number(a.id) || 0);
        const timeB = b.created_at ? new Date(b.created_at).getTime() : (Number(b.id) || 0);
        return timeA - timeB;
      });
  }, [filteredOrders]);

  const readyOrders = useMemo(() => {
    return filteredOrders
      .filter(o => o.status === 'ready')
      .sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : (Number(a.id) || 0);
        const timeB = b.created_at ? new Date(b.created_at).getTime() : (Number(b.id) || 0);
        return timeA - timeB;
      });
  }, [filteredOrders]);

  const completedOrders = useMemo(() => {
    return (Array.isArray(orders) ? orders : [])
      .filter(o => o.status === 'delivery' || o.status === 'delivered')
      .sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : (Number(a.id) || 0);
        const timeB = b.created_at ? new Date(b.created_at).getTime() : (Number(b.id) || 0);
        return timeB - timeA;
      });
  }, [orders]);

  // Consolidated Station Totals
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
    <div className="h-screen w-screen overflow-hidden flex bg-[#0c0d12] text-text-main">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-9999 p-3.5 px-4 rounded-xl bg-amber-950/95 border border-amber-500/50 text-white shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-xs font-bold animate-toast-enter">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Mobile Drawer Backdrop (< 768px) */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={() => setIsMobileDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 1. COLLAPSIBLE LEFT SIDEBAR (MOBILE DRAWER + DESKTOP ASIDE) */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <aside
        className={`h-full bg-surface-dark/95 border-r border-white/10 flex flex-col transition-all duration-300 shrink-0 select-none
          fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] shadow-2xl
          ${isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:z-30 md:shadow-none
          ${isSidebarCollapsed ? 'md:w-16' : 'md:w-64'}
        `}
      >
        {/* Sidebar Header & Collapse Toggle */}
        <div className="h-14 border-b border-white/10 flex items-center justify-between px-3 shrink-0">
          {!isSidebarCollapsed ? (
            <div className="flex items-center gap-2.5 min-w-0">
              {/* High-Contrast Home Icon Button to Store Menu */}
              <button
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  if (onSwitchRole) onSwitchRole('customer');
                }}
                className="w-8 h-8 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 hover:text-white border border-amber-500/40 flex items-center justify-center shrink-0 shadow-sm transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-500/50 min-h-9.5 min-w-9.5"
                title="Return to Customer Store Menu"
                aria-label="Home / Return to Store Menu"
              >
                <Home className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <span className="text-xs font-black tracking-wider text-white uppercase block truncate">
                  Kitchen KDS
                </span>
                <span className="text-[10px] text-amber-400 font-bold block truncate">
                  Console 24/7
                </span>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setIsMobileDrawerOpen(false);
                if (onSwitchRole) onSwitchRole('customer');
              }}
              className="w-8 h-8 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 hover:text-white border border-amber-500/40 flex items-center justify-center mx-auto shadow-sm transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-500/50 min-h-9.5 min-w-9.5"
              title="Return to Customer Store Menu"
              aria-label="Home / Return to Store Menu"
            >
              <Home className="w-4 h-4" />
            </button>
          )}

          {/* Close button for mobile slide-over drawer */}
          <button
            onClick={() => setIsMobileDrawerOpen(false)}
            className="md:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 text-text-muted hover:text-white transition-all min-h-11 min-w-11 flex items-center justify-center shrink-0 ml-auto"
            aria-label="Close Mobile Navigation"
          >
            <X className="w-5 h-5 text-amber-400" />
          </button>

          {/* Desktop Sidebar Collapse Toggle */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`hidden md:flex p-1.5 rounded-lg bg-surface-card hover:bg-white/10 border border-white/10 text-text-muted hover:text-white transition-all shadow-sm ${
              isSidebarCollapsed ? 'hidden' : ''
            }`}
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label="Toggle Sidebar"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {isSidebarCollapsed && (
          <div className="hidden md:flex p-2 border-b border-white/5 justify-center">
            <button
              onClick={() => setIsSidebarCollapsed(false)}
              className="p-2 rounded-lg bg-surface-card hover:bg-white/10 border border-white/10 text-amber-400 hover:text-white transition-all shadow-sm"
              title="Expand Sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Scrollable Sidebar Body without internal scrollbars */}
        <div className="flex-1 overflow-y-auto no-scrollbar scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-2.5 space-y-3.5">
          {/* SECTION A: TOP NAVIGATION LINKS */}
          <div className="space-y-1">
            {!isSidebarCollapsed && (
              <span className="text-[10px] font-black uppercase tracking-wider text-text-muted px-2.5 mb-1.5 block">
                Views
              </span>
            )}

            {/* Link 1: Live Kanban */}
            <button
              onClick={() => {
                setActiveTab('kanban');
                setIsMobileDrawerOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-bold text-xs transition-all min-h-11 focus:outline-none focus:ring-1 focus:ring-primary/40 ${
                activeTab === 'kanban'
                  ? 'bg-linear-to-r from-primary to-orange-600 text-white shadow-md shadow-orange-500/20'
                  : 'text-text-muted hover:text-white hover:bg-white/5'
              } ${isSidebarCollapsed ? 'md:justify-center md:px-0' : ''}`}
              title="Live Kanban Dispatch"
            >
              <Layers className="w-4 h-4 shrink-0" />
              <span className={`flex-1 text-left ${isSidebarCollapsed ? 'md:hidden' : ''}`}>Live Kanban</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] bg-black/40 font-mono font-bold ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
                {pendingOrders.length + preparingOrders.length + readyOrders.length}
              </span>
            </button>

            {/* Link 2: Order History / Recall */}
            <button
              onClick={() => {
                setActiveTab('archive');
                setIsMobileDrawerOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-bold text-xs transition-all min-h-11 focus:outline-none focus:ring-1 focus:ring-primary/40 ${
                activeTab === 'archive'
                  ? 'bg-linear-to-r from-primary to-orange-600 text-white shadow-md shadow-orange-500/20'
                  : 'text-text-muted hover:text-white hover:bg-white/5'
              } ${isSidebarCollapsed ? 'md:justify-center md:px-0' : ''}`}
              title="Order History / Recall"
            >
              <ShoppingBag className="w-4 h-4 shrink-0" />
              <span className={`flex-1 text-left ${isSidebarCollapsed ? 'md:hidden' : ''}`}>Order History / Recall</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] bg-black/40 font-mono font-bold ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
                {completedOrders.length}
              </span>
            </button>

            {/* Link 3: Recipe & Prep Guides */}
            <button
              onClick={() => {
                setActiveTab('recipes');
                setIsMobileDrawerOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-bold text-xs transition-all min-h-11 focus:outline-none focus:ring-1 focus:ring-primary/40 ${
                activeTab === 'recipes'
                  ? 'bg-linear-to-r from-primary to-orange-600 text-white shadow-md shadow-orange-500/20'
                  : 'text-text-muted hover:text-white hover:bg-white/5'
              } ${isSidebarCollapsed ? 'md:justify-center md:px-0' : ''}`}
              title="Recipe & Prep Guides"
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className={`flex-1 text-left ${isSidebarCollapsed ? 'md:hidden' : ''}`}>Recipe & Prep Guides</span>
            </button>

            {/* Link 4: Station Prep Checklist */}
            <button
              onClick={() => {
                setActiveTab('station');
                setIsMobileDrawerOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-bold text-xs transition-all min-h-11 focus:outline-none focus:ring-1 focus:ring-primary/40 ${
                activeTab === 'station'
                  ? 'bg-linear-to-r from-primary to-orange-600 text-white shadow-md shadow-orange-500/20'
                  : 'text-text-muted hover:text-white hover:bg-white/5'
              } ${isSidebarCollapsed ? 'md:justify-center md:px-0' : ''}`}
              title="Station Item Totals"
            >
              <UtensilsCrossed className="w-4 h-4 shrink-0" />
              <span className={`flex-1 text-left ${isSidebarCollapsed ? 'md:hidden' : ''}`}>Station Checklist</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] bg-black/40 font-mono font-bold ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
                {aggregatedPrepList.length}
              </span>
            </button>
          </div>

          {/* SECTION B: OPERATIONAL CONTROLS */}
          <div className="space-y-3 pt-2.5 border-t border-white/5">
            <span className={`text-[10px] font-black uppercase tracking-wider text-text-muted px-2.5 block ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
              Operational Controls
            </span>

            {/* Station Switcher */}
            <div className={`space-y-1.5 px-1 ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
              <label className="text-[11px] font-bold text-text-muted flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Station Filter
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'all', label: 'All Stations' },
                  { id: 'stoves', label: 'Stoves / Wok' },
                  { id: 'assembly', label: 'Pizza / Oven' },
                  { id: 'packaging', label: 'Packaging' },
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => setActiveStation(s.id)}
                    className={`py-2 px-2 rounded-lg text-[11px] font-bold transition-all text-center border truncate min-h-11 flex items-center justify-center focus:outline-none focus:ring-1 focus:ring-amber-400/50 ${
                      activeStation === s.id
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-sm ring-1 ring-amber-500/30'
                        : 'bg-surface-card border-white/10 text-text-muted hover:text-white hover:bg-white/5 hover:border-white/20'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Order Type Filter */}
            <div className={`space-y-1.5 px-1 ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
              <label className="text-[11px] font-bold text-text-muted flex items-center gap-1.5">
                <Bike className="w-3.5 h-3.5 text-blue-400" />
                Order Type
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'all', label: 'All Types' },
                  { id: 'delivery', label: 'Delivery' },
                  { id: 'takeout', label: 'Takeout' },
                  { id: 'dine-in', label: 'Dine-In' },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setOrderTypeFilter(t.id)}
                    className={`py-2 px-2 rounded-lg text-[11px] font-bold transition-all text-center border truncate min-h-11 flex items-center justify-center focus:outline-none focus:ring-1 focus:ring-blue-400/50 ${
                      orderTypeFilter === t.id
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/60 shadow-sm ring-1 ring-blue-500/30'
                        : 'bg-surface-card border-white/10 text-text-muted hover:text-white hover:bg-white/5 hover:border-white/20'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority / Overdue Switch */}
            <div className="px-1 pt-0.5">
              <button
                onClick={() => setPriorityOnly(!priorityOnly)}
                className={`w-full py-2.5 px-3 rounded-lg border text-xs font-bold flex items-center justify-between transition-all min-h-11 focus:outline-none focus:ring-1 ${
                  priorityOnly
                    ? 'bg-red-950/80 border-red-500 text-red-300 shadow-md shadow-red-500/20 ring-1 ring-red-500'
                    : 'bg-surface-card border-white/10 text-text-muted hover:text-white hover:bg-white/5 hover:border-white/20'
                }`}
                title={priorityOnly ? 'Urgent Filter Active (>10m)' : 'Toggle Urgent Orders Only'}
              >
                <span className="flex items-center gap-2">
                  <AlertTriangle className={`w-4 h-4 shrink-0 ${priorityOnly ? 'text-red-400 animate-pulse' : 'text-text-muted'}`} />
                  <span className={`${isSidebarCollapsed ? 'md:hidden' : ''}`}>Urgent (&gt;10m)</span>
                </span>
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${priorityOnly ? 'bg-red-400 animate-ping' : 'bg-white/20'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* SECTION C: SYSTEM UTILITIES (ANCHORED TO BOTTOM) */}
        <div className="p-2.5 border-t border-white/10 bg-black/40 space-y-2 shrink-0 mt-auto">
          {/* Audio Alerts Toggle */}
          <button
            onClick={handleToggleSound}
            className={`w-full flex items-center gap-2 p-2.5 rounded-lg text-xs font-bold border transition-all min-h-11 focus:outline-none focus:ring-1 ${
              soundEnabled
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-950'
                : 'bg-surface-card border-white/10 text-text-muted hover:text-white'
            } ${isSidebarCollapsed ? 'md:justify-center md:p-2' : ''}`}
            title="Audio Notification Chimes"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <VolumeX className="w-4 h-4 text-text-muted shrink-0" />}
            <div className={`flex-1 flex items-center justify-between text-[11px] ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
              <span>Audio Alerts</span>
              <span className="font-mono text-[10px] uppercase">{soundEnabled ? 'ON' : 'OFF'}</span>
            </div>
          </button>

          {/* Live DB Sync Status Badge */}
          <div
            className={`flex items-center gap-2 px-2.5 py-2 rounded-lg bg-surface-card/60 border border-white/5 text-[11px] text-emerald-400 font-mono ${
              isSidebarCollapsed ? 'md:justify-center md:px-1' : ''
            }`}
            title="Neon Serverless PostgreSQL Database Connected"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className={`font-bold truncate text-[10px] ${isSidebarCollapsed ? 'md:hidden' : ''}`}>Neon DB Connected</span>
          </div>

          {/* Styled Action Button: Return to Store Menu */}
          {onSwitchRole && (
            <button
              onClick={() => {
                setIsMobileDrawerOpen(false);
                onSwitchRole('customer');
              }}
              className={`w-full py-2.5 px-3 rounded-lg bg-surface-card hover:bg-amber-500/10 active:bg-amber-500/20 border border-white/10 hover:border-amber-500/40 text-text-muted hover:text-amber-300 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm group min-h-11 focus:outline-none focus:ring-1 focus:ring-amber-400/50 ${
                isSidebarCollapsed ? 'md:p-2' : ''
              }`}
              title="Return to Store Menu"
            >
              <Home className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
              <span className={`${isSidebarCollapsed ? 'md:hidden' : ''}`}>Return to Store Menu</span>
            </button>
          )}
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 2. MAIN CONTENT AREA WITH STREAMLINED TOP HEADER BAR       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden relative">
        {/* STREAMLINED TOP HEADER BAR */}
        <header className="h-14 border-b border-white/10 px-3 sm:px-4 flex items-center justify-between bg-surface-dark/95 backdrop-blur-md shrink-0 gap-2 sm:gap-3 z-20">
          {/* Left: Mobile Drawer Trigger, Home & Station Identifier */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Mobile Hamburger Drawer Toggle (screens < 768px) */}
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="md:hidden p-2 rounded-lg bg-surface-card hover:bg-white/10 border border-white/10 text-amber-400 hover:text-white transition-all min-h-11 min-w-11 flex items-center justify-center shrink-0 shadow-sm active:scale-95"
              title="Open Navigation Menu"
              aria-label="Toggle Navigation Drawer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Quick Home Button */}
            <button
              onClick={() => onSwitchRole && onSwitchRole('customer')}
              className="md:hidden p-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 hover:text-white border border-amber-500/40 min-h-11 min-w-11 flex items-center justify-center shrink-0 transition-all active:scale-95 shadow-sm"
              title="Return to Customer Store Menu"
              aria-label="Home"
            >
              <Home className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs sm:text-sm font-black text-white tracking-wide shrink-0 whitespace-nowrap">
                HotPot Delights KDS
              </span>
              <span className="hidden lg:inline-block text-white/30">•</span>
              <span className="hidden lg:inline-flex items-center gap-1.5 text-xs text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 shrink-0 whitespace-nowrap shadow-sm">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>HotPot Delights — Nyarutarama Station</span>
              </span>
              <span className="hidden xl:inline-block text-white/30">•</span>
              <span className="hidden xl:inline-block text-xs font-mono text-text-muted shrink-0 whitespace-nowrap capitalize">
                {activeStation === 'all' ? 'All Kitchen Stations' : `${activeStation} station`}
              </span>
            </div>
          </div>

          {/* Center: Active Order Counters (Desktop md+; Mobile uses sticky tab bar) */}
          <div className="hidden md:flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Counter 1: Incoming */}
            <div
              onClick={() => { setActiveTab('kanban'); setMobileColumn('pending'); }}
              className="px-2.5 sm:px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-amber-500/25 transition-all shadow-sm"
              title="New Incoming Orders"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Incoming:</span>
              <span className="font-mono font-black text-white">{pendingOrders.length}</span>
            </div>

            {/* Counter 2: In Prep */}
            <div
              onClick={() => { setActiveTab('kanban'); setMobileColumn('preparing'); }}
              className="px-2.5 sm:px-3 py-1 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-blue-500/25 transition-all shadow-sm"
              title="Orders Currently Cooking"
            >
              <Flame className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Cooking:</span>
              <span className="font-mono font-black text-white">{preparingOrders.length}</span>
            </div>

            {/* Counter 3: Ready for Pickup */}
            <div
              onClick={() => { setActiveTab('kanban'); setMobileColumn('ready'); }}
              className="px-2.5 sm:px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-emerald-500/25 transition-all shadow-sm"
              title="Cooker Ready for Pickup"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Ready:</span>
              <span className="font-mono font-black text-white">{readyOrders.length}</span>
            </div>
          </div>

          {/* Right: Search, Clock & Quick Refresh */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick Search (xl screens) */}
            <div className="relative hidden xl:block w-48">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Order # or dish..."
                className="w-full pl-8 pr-6 py-1.5 rounded-lg bg-surface-card border border-white/10 text-xs text-white placeholder-text-subdued focus:outline-none focus:border-amber-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-white text-[11px]"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sync Trigger Button */}
            <button
              onClick={handleManualRefresh}
              className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-surface-card hover:bg-white/10 border border-white/10 text-text-main text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 shrink-0"
              title="Quick Sync with Neon PostgreSQL"
              aria-label="Sync Database"
            >
              <RefreshCw className={`w-4 h-4 sm:w-3.5 sm:h-3.5 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Sync DB</span>
            </button>
          </div>
        </header>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* 3. KANBAN BOARD CONTAINER (100VH NO PAGE-LEVEL SCROLLING)   */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <main className="flex-1 min-h-0 overflow-hidden relative">
          {/* VIEW 1: LIVE KANBAN DISPATCH */}
          {activeTab === 'kanban' && (
            <div className="h-full flex flex-col overflow-hidden">
              {/* Mobile Segmented Column Sticky Tabs (< 768px / md:hidden) */}
              <div className="md:hidden flex items-center gap-1.5 p-2 bg-surface-card/95 backdrop-blur-md border-b border-white/10 shrink-0 sticky top-0 z-10">
                <button
                  onClick={() => setMobileColumn('pending')}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 min-h-11 border ${
                    mobileColumn === 'pending'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-md ring-1 ring-amber-500/40'
                      : 'bg-black/30 border-white/5 text-text-muted hover:text-white'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">Incoming</span>
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-black/60 text-white font-bold">
                    {pendingOrders.length}
                  </span>
                </button>
                <button
                  onClick={() => setMobileColumn('preparing')}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 min-h-11 border ${
                    mobileColumn === 'preparing'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/60 shadow-md ring-1 ring-blue-500/40'
                      : 'bg-black/30 border-white/5 text-text-muted hover:text-white'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="truncate">Cooking</span>
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-black/60 text-white font-bold">
                    {preparingOrders.length}
                  </span>
                </button>
                <button
                  onClick={() => setMobileColumn('ready')}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 min-h-11 border ${
                    mobileColumn === 'ready'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/40'
                      : 'bg-black/30 border-white/5 text-text-muted hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">Ready</span>
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-black/60 text-white font-bold">
                    {readyOrders.length}
                  </span>
                </button>
              </div>

              {/* 3-Column Kanban Board Layout filling 100% of height */}
              <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 p-2 sm:p-4 overflow-hidden">
                {/* ────────────────────────────────────────────────────────── */}
                {/* COLUMN 1: NEW INCOMING ORDERS (PENDING)                    */}
                {/* ────────────────────────────────────────────────────────── */}
                <div className={`flex-col h-full bg-surface-dark/70 rounded-2xl border border-white/10 border-t-4 border-t-amber-500 overflow-hidden shadow-xl ${
                  mobileColumn === 'pending' ? 'flex' : 'hidden md:flex'
                }`}>
                  {/* Sticky Column Header */}
                  <div className="p-3 sm:p-3.5 border-b border-amber-500/30 bg-surface-card/90 backdrop-blur-md flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                      <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wider">
                        1. Incoming Orders
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      {pendingOrders.length}
                    </span>
                  </div>

                  {/* Independent Scrollable Order Cards List */}
                  <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-2.5 sm:p-3 space-y-3">
                    {pendingOrders.length === 0 ? (
                      <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-xs text-text-subdued space-y-2">
                        <ChefHat className="w-8 h-8 text-text-subdued opacity-30" />
                        <span className="font-bold text-white">Queue is clear!</span>
                        <p className="text-[11px]">Incoming client orders will trigger audio chimes immediately.</p>
                      </div>
                    ) : (
                      pendingOrders.map(order => {
                        const urgency = getUrgency(order);
                        return (
                          <div
                            key={order.id}
                            className={`p-3.5 sm:p-4 rounded-2xl bg-surface-card border-2 ${urgency.borderClass} flex flex-col justify-between transition-all shadow-xl space-y-3`}
                          >
                            {/* Card Header with Color-Coded Urgency Header */}
                            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-amber-400 text-sm">#{order.id}</span>
                                <span className="text-xs sm:text-sm font-bold text-white truncate max-w-35">
                                  {order.customerName || 'Customer'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-black border ${urgency.headerBadge}`}>
                                  {urgency.label}
                                </span>
                                <button
                                  onClick={() => setSelectedOrder(order)}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-text-muted hover:text-white transition-colors min-h-9 min-w-9 flex items-center justify-center"
                                  title="View Details"
                                  aria-label="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Customer Note / Chef Instruction */}
                            {order.notes && (
                              <div className="p-2.5 rounded-xl bg-amber-950/70 border border-amber-500/40 text-[11px] text-amber-200 flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-black text-amber-300 block">Chef Instruction:</span>
                                  <span>{order.notes}</span>
                                </div>
                              </div>
                            )}

                            {/* Order Items with High-Contrast Bold Quantities */}
                            <div className="space-y-2 bg-black/40 p-2.5 sm:p-3 rounded-xl border border-white/5">
                              {(order.items || []).map((item, idx) => (
                                <div key={idx} className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="px-2 py-0.5 rounded-lg bg-black text-amber-300 font-mono font-black text-xs border border-amber-500/40 shrink-0 shadow-sm">
                                      {item.qty || 1}x
                                    </span>
                                    <span className="text-xs sm:text-sm md:text-base font-extrabold text-white leading-tight wrap-break-word">
                                      {item.name}
                                    </span>
                                  </div>
                                  {item.spice && (
                                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-500/30 shrink-0">
                                      🔥 {item.spice}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Full-Width High-Contrast Anchored Action Button (min-h-11) */}
                            <button
                              disabled={!!processingMap[order.id]}
                              onClick={() => handleAdvanceStatus(order.id, 'preparing')}
                              className={`w-full py-3 min-h-11 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] ${
                                processingMap[order.id]
                                  ? 'bg-amber-900/50 text-amber-300/60 cursor-not-allowed'
                                  : 'bg-linear-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white shadow-orange-600/30 hover:shadow-orange-600/50'
                              }`}
                            >
                              {processingMap[order.id] ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                                  <span>Starting Cooking...</span>
                                </>
                              ) : (
                                <>
                                  <Flame className="w-4 h-4 text-amber-300" />
                                  <span>Start Cooking 👨‍🍳</span>
                                  <ArrowRight className="w-4 h-4" />
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* ────────────────────────────────────────────────────────── */}
                {/* COLUMN 2: COOKING & IN PREP (PREPARING)                    */}
                {/* ────────────────────────────────────────────────────────── */}
                <div className={`flex-col h-full bg-surface-dark/70 rounded-2xl border border-white/10 border-t-4 border-t-blue-500 overflow-hidden shadow-xl ${
                  mobileColumn === 'preparing' ? 'flex' : 'hidden md:flex'
                }`}>
                  {/* Sticky Column Header */}
                  <div className="p-3 sm:p-3.5 border-b border-blue-500/30 bg-surface-card/90 backdrop-blur-md flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
                      <span className="px-2 py-0.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-black uppercase tracking-wider">
                        2. Cooking & In Prep
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-blue-500/20 text-blue-300 border border-blue-500/40">
                      {preparingOrders.length}
                    </span>
                  </div>

                  {/* Independent Scrollable Order Cards List */}
                  <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-2.5 sm:p-3 space-y-3">
                    {preparingOrders.length === 0 ? (
                      <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-xs text-text-subdued space-y-2">
                        <Flame className="w-8 h-8 text-text-subdued opacity-30" />
                        <span className="font-bold text-white">No meals cooking</span>
                        <p className="text-[11px]">Click &quot;Start Cooking&quot; on incoming orders to move them here.</p>
                      </div>
                    ) : (
                      preparingOrders.map(order => {
                        const urgency = getUrgency(order);
                        const totalItemsCount = (order.items || []).length;
                        const checkedCount = (order.items || []).filter((_, idx) => checkedItems[`${order.id}-${idx}`]).length;

                        return (
                          <div
                            key={order.id}
                            className={`p-3.5 sm:p-4 rounded-2xl bg-surface-card border-2 ${urgency.borderClass} flex flex-col justify-between transition-all shadow-xl space-y-3`}
                          >
                            {/* Card Header */}
                            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-blue-400 text-sm">#{order.id}</span>
                                <span className="text-xs sm:text-sm font-bold text-white truncate max-w-35">
                                  {order.customerName || 'Customer'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-black border ${urgency.headerBadge}`}>
                                  {urgency.label}
                                </span>
                                <button
                                  onClick={() => setSelectedOrder(order)}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-text-muted hover:text-white transition-colors min-h-9 min-w-9 flex items-center justify-center"
                                  title="View Details"
                                  aria-label="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Interactive Packaging Progress */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px] font-black text-text-muted">
                                <span>Packaging & QC:</span>
                                <span className={checkedCount === totalItemsCount && totalItemsCount > 0 ? 'text-emerald-400 font-mono' : 'text-blue-400 font-mono'}>
                                  {checkedCount}/{totalItemsCount} packed
                                </span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                                <div
                                  className="h-full bg-linear-to-r from-blue-500 to-emerald-500 transition-all duration-300"
                                  style={{ width: `${totalItemsCount > 0 ? (checkedCount / totalItemsCount) * 100 : 0}%` }}
                                />
                              </div>
                            </div>

                            {/* Interactive Item Checklist with min-h-11 touch targets */}
                            <div className="space-y-1.5 bg-black/40 p-2 sm:p-2.5 rounded-xl border border-white/5">
                              {(order.items || []).map((item, idx) => {
                                const isChecked = checkedItems[`${order.id}-${idx}`];
                                return (
                                  <div
                                    key={idx}
                                    onClick={() => toggleCheckItem(order.id, idx)}
                                    className={`text-xs sm:text-sm p-2.5 min-h-11 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                                      isChecked
                                        ? 'line-through text-emerald-400/70 bg-emerald-950/40 border border-emerald-500/20'
                                        : 'text-text-main hover:bg-white/5 border border-transparent'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      {isChecked ? (
                                        <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                                      ) : (
                                        <Square className="w-4 h-4 text-text-muted shrink-0" />
                                      )}
                                      <span className="px-2 py-0.5 rounded-md bg-black text-blue-300 font-mono font-black text-xs border border-blue-500/40 shrink-0">
                                        {item.qty || 1}x
                                      </span>
                                      <span className="font-extrabold text-white text-xs sm:text-sm md:text-base leading-tight wrap-break-word">
                                        {item.name}
                                      </span>
                                    </div>
                                    {item.spice && (
                                      <span className="text-[10px] font-black text-red-400 shrink-0">
                                        🔥 {item.spice}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Full-Width High-Contrast Anchored Action Button (min-h-11) */}
                            <button
                              disabled={!!processingMap[order.id]}
                              onClick={() => handleAdvanceStatus(order.id, 'ready')}
                              className={`w-full py-3 min-h-11 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] ${
                                processingMap[order.id]
                                  ? 'bg-emerald-900/50 text-emerald-300/60 cursor-not-allowed'
                                  : 'bg-linear-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-emerald-600/30 hover:shadow-emerald-600/50'
                              }`}
                            >
                              {processingMap[order.id] ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-300" />
                                  <span>Confirming Ready...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                                  <span>Mark Cooker Ready ✅</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* ────────────────────────────────────────────────────────── */}
                {/* COLUMN 3: READY FOR PICKUP (READY)                         */}
                {/* ────────────────────────────────────────────────────────── */}
                <div className={`flex-col h-full bg-surface-dark/70 rounded-2xl border border-white/10 border-t-4 border-t-emerald-500 overflow-hidden shadow-xl ${
                  mobileColumn === 'ready' ? 'flex' : 'hidden md:flex'
                }`}>
                  {/* Sticky Column Header */}
                  <div className="p-3 sm:p-3.5 border-b border-emerald-500/30 bg-surface-card/90 backdrop-blur-md flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider">
                        3. Ready for Pickup
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      {readyOrders.length}
                    </span>
                  </div>

                  {/* Independent Scrollable Order Cards List */}
                  <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-2.5 sm:p-3 space-y-3">
                    {readyOrders.length === 0 ? (
                      <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-xs text-text-subdued space-y-2">
                        <CheckCircle2 className="w-8 h-8 text-text-subdued opacity-30" />
                        <span className="font-bold text-white">No dishes awaiting pickup</span>
                        <p className="text-[11px]">Cooked and packed orders will appear here for courier dispatch.</p>
                      </div>
                    ) : (
                      readyOrders.map(order => {
                        const isAssigned = !!(order.assigned_rider_id || order.verification_pin);
                        const assignedRider = riders.find(r => r.id === order.assigned_rider_id) || {
                          name: order.riderName || 'Assigned Courier',
                          phone: order.riderPhone || '',
                          plateNumber: order.riderPlate || ''
                        };

                        const availableRiders = riders.filter(r => r.is_available && (r.status === 'AVAILABLE' || !r.current_order_id));
                        const selectedRiderId = selectedRiderMap[order.id] || (availableRiders[0] ? availableRiders[0].id : '');

                        // Pickup timeout calculation (10 min auto alert)
                        const assignedTime = order.assigned_at ? new Date(order.assigned_at).getTime() : 0;
                        const isDelayed = isAssigned && assignedTime > 0 && (Date.now() - assignedTime > 10 * 60 * 1000);

                        return (
                          <div
                            key={order.id}
                            className={`p-3.5 sm:p-4 rounded-2xl bg-surface-card border-2 flex flex-col justify-between transition-all shadow-xl space-y-3 ${
                              isDelayed
                                ? 'border-red-500/80 ring-2 ring-red-500/40 bg-red-950/20'
                                : isAssigned
                                ? 'border-amber-500/60'
                                : 'border-emerald-500/40'
                            }`}
                          >
                            {/* Card Header */}
                            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-emerald-400 text-sm">#{order.id}</span>
                                <span className="text-xs sm:text-sm font-bold text-white truncate max-w-35">
                                  {order.customerName || 'Customer'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {isAssigned ? (
                                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                                    <Bike className="w-3 h-3" />
                                    Courier Assigned
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-black bg-emerald-950 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3" />
                                    Ready for Courier
                                  </span>
                                )}
                                <button
                                  onClick={() => setSelectedOrder(order)}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-text-muted hover:text-white transition-colors min-h-9 min-w-9 flex items-center justify-center"
                                  title="View Details"
                                  aria-label="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Dropoff Address */}
                            <div className="text-xs text-text-muted flex items-center gap-2 bg-black/40 p-2.5 rounded-xl border border-white/5">
                              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span className="truncate">{order.deliveryAddress || order.address || 'Kigali Dropoff'}</span>
                            </div>

                            {/* Packed Items Summary */}
                            <div className="space-y-1.5 text-xs bg-black/30 p-2.5 rounded-xl border border-white/5">
                              {(order.items || []).map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-text-main gap-2">
                                  <span className="flex items-center gap-2 min-w-0">
                                    <span className="font-mono font-black text-emerald-400 text-xs shrink-0">
                                      {item.qty || 1}x
                                    </span>
                                    <span className="font-extrabold text-white text-xs sm:text-sm md:text-base leading-tight wrap-break-word">{item.name}</span>
                                  </span>
                                  <span className="text-[10px] text-emerald-400 font-bold shrink-0">✓ Packed</span>
                                </div>
                              ))}
                            </div>

                            {/* 10-Minute Delay Warning Banner */}
                            {isDelayed && (
                              <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/50 flex items-center justify-between text-xs animate-pulse">
                                <div className="flex items-center gap-2 text-red-300 font-bold">
                                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                                  <span>Pickup Delayed &gt; 10 mins!</span>
                                </div>
                                <span className="text-[10px] font-mono text-red-200">Reassign if needed</span>
                              </div>
                            )}

                            {/* Handover Flow: Courier Assignment vs Handover PIN */}
                            {!isAssigned ? (
                              <div className="space-y-2.5 bg-[#1A1D24] p-3 rounded-xl border border-slate-800">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                                  <span>Assign / Handover to Courier:</span>
                                  <span className="text-emerald-400 font-mono text-[10px]">
                                    {availableRiders.length} Available
                                  </span>
                                </label>

                                {availableRiders.length > 0 && (
                                  <div className="space-y-1.5">
                                    <select
                                      value={selectedRiderId}
                                      onChange={(e) => setSelectedRiderMap(prev => ({ ...prev, [order.id]: e.target.value }))}
                                      className="w-full bg-[#12141A] border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-amber-500"
                                    >
                                      {availableRiders.map(r => (
                                        <option key={r.id} value={r.id}>
                                          🛵 {r.name} ({r.plateNumber || 'Moto'}) • ON DUTY
                                        </option>
                                      ))}
                                    </select>

                                    <button
                                      disabled={!!assigningMap[order.id]}
                                      onClick={() => handleAssignRiderToOrder(order.id, selectedRiderId)}
                                      className="w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all min-h-11 bg-linear-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-md shadow-orange-500/20 active:scale-95"
                                    >
                                      {assigningMap[order.id] ? (
                                        <>
                                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                          <span>Dispatching Courier...</span>
                                        </>
                                      ) : (
                                        <>
                                          <Bike className="w-4 h-4" />
                                          <span>Assign Selected Courier</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                )}

                                {availableRiders.length === 0 && (
                                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-center font-medium">
                                    ⚠️ No active fleet couriers available.
                                  </div>
                                )}

                                {/* Manual Courier Entry Option */}
                                <button
                                  onClick={() => openManualRiderModal(order)}
                                  className="w-full py-2 px-3 rounded-xl bg-surface-card hover:bg-white/10 border border-white/15 text-amber-400 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                                  title="Add or assign a specific courier for this order"
                                >
                                  <UserPlus className="w-4 h-4" />
                                  <span>➕ Add / Assign Custom Courier</span>
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-2 bg-[#1A1D24] p-3 rounded-xl border border-amber-500/40">
                                {/* Assigned Courier Badge with Reassign trigger */}
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                                      🛵
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-bold text-white text-xs truncate">{assignedRider.name}</div>
                                      <div className="text-[10px] text-slate-400 font-mono truncate">{assignedRider.phone || assignedRider.plateNumber}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() => openManualRiderModal(order)}
                                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-amber-400 text-[10px] font-bold border border-white/10 flex items-center gap-1 transition-all"
                                      title="Edit or Reassign Courier Info"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                      <span>Edit</span>
                                    </button>
                                    <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-mono text-[10px] font-bold border border-blue-500/40">
                                      Assigned
                                    </span>
                                  </div>
                                </div>

                                {/* 4-Digit Verification PIN Strip */}
                                <div className="p-2.5 rounded-xl bg-linear-to-r from-amber-500/15 via-orange-500/15 to-emerald-500/15 border border-amber-500/40 flex items-center justify-between">
                                  <div className="space-y-0.5">
                                    <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider block">
                                      Pickup Verification PIN
                                    </span>
                                    <span className="text-[10px] text-slate-400">Rider must provide code</span>
                                  </div>
                                  <div className="px-3 py-1 rounded-lg bg-black/80 border border-amber-400/60 font-mono font-black text-amber-300 text-base tracking-widest shadow-inner">
                                    {order.verification_pin || '4829'}
                                  </div>
                                </div>

                                {/* Confirm Physical Handover Completed */}
                                <button
                                  disabled={!!processingMap[order.id]}
                                  onClick={() => handleAdvanceStatus(order.id, 'delivery')}
                                  className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all min-h-11 ${
                                    processingMap[order.id]
                                      ? 'bg-blue-900/50 text-blue-300/60 cursor-not-allowed'
                                      : 'bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-600/30 active:scale-95'
                                  }`}
                                >
                                  {processingMap[order.id] ? (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                      <span>Confirming Handover...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Check className="w-4 h-4" />
                                      <span>Confirm Courier Handover Complete ✅</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: ORDER HISTORY & RECALL */}
          {activeTab === 'archive' && (
            <div className="h-full overflow-y-auto no-scrollbar p-3 sm:p-5 space-y-4">
              <div className="p-3.5 sm:p-5 rounded-2xl bg-surface-card border border-white/10 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-purple-400" />
                      Order History & Kitchen Recall
                    </h3>
                    <p className="text-xs text-text-muted">Review completed orders or recall past dishes.</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs font-mono font-bold self-start">
                    {completedOrders.length} completed
                  </span>
                </div>

                <div className="space-y-2.5">
                  {completedOrders.length === 0 ? (
                    <div className="py-12 text-center text-xs text-text-subdued">No completed orders yet.</div>
                  ) : (
                    completedOrders.map(order => (
                      <div
                        key={order.id}
                        className="p-3 sm:p-3.5 rounded-xl bg-black/40 border border-white/5 hover:border-white/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono font-black text-amber-400 text-xs">#{order.id}</span>
                            <span className="text-xs font-bold text-white">{order.customerName || 'Customer'}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                              {order.status === 'delivered' ? '✅ DELIVERED' : '🛵 EN ROUTE'}
                            </span>
                          </div>
                          <div className="text-xs text-text-muted">
                            Items: {(order.items || []).map(i => `${i.qty || 1}x ${i.name}`).join(', ')} •{' '}
                            <span className="font-mono text-white font-bold">{Number(order.totalRWF || 0)?.toLocaleString() ?? ''} RWF</span>
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-3.5 py-2 rounded-xl bg-surface-card hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-1.5 self-start md:self-auto min-h-11 transition-all"
                        >
                          <Eye className="w-4 h-4 text-amber-400" />
                          <span>Inspect</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: RECIPE & PREP GUIDES */}
          {activeTab === 'recipes' && (
            <div className="h-full overflow-y-auto no-scrollbar p-3 sm:p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-surface-card border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-white">🌶️ Sichuan Spicy Hotpot</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-red-950 text-red-400 border border-red-500/30 font-bold">
                      12 min prep
                    </span>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Simmer rich bone broth with fermented chili paste, Sichuan peppercorns, and star anise. Box fresh sliced beef, enoki mushrooms, and lotus root separately in chilled container.
                  </p>
                  <div className="text-[11px] text-amber-300 font-bold bg-amber-950/40 p-2.5 rounded-xl border border-amber-500/20">
                    🔥 Target Broth Temp: 92°C before sealing container.
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-surface-card border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-white">🍄 Herbal Mushroom Hotpot</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-bold">
                      10 min prep
                    </span>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Vegetarian supreme broth steeped with wild shiitake, porcini essence, goji berries, and fresh ginger roots. Include tofu puffs and bok choy pack.
                  </p>
                  <div className="text-[11px] text-emerald-300 font-bold bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-500/20">
                    🌿 100% Plant-based station seal.
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-surface-card border border-orange-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-white">🍕 Gourmet BBQ Chicken Pizza</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-orange-950 text-orange-400 border border-orange-500/30 font-bold">
                      8 min bake
                    </span>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Hand-stretch artisan dough to 12 inches. Spread smokey BBQ sauce, whole-milk mozzarella, red onions, and marinated grilled chicken chunks. Bake at 320°C until blistered crust.
                  </p>
                  <div className="text-[11px] text-orange-300 font-bold bg-orange-950/40 p-2.5 rounded-xl border border-orange-500/20">
                    🍕 Oven temp: 320°C. Rotate pizza at 4 minutes.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 4: CONSOLIDATED STATION TOTALS */}
          {activeTab === 'station' && (
            <div className="h-full overflow-y-auto no-scrollbar p-3 sm:p-5 space-y-4">
              <div className="p-3.5 sm:p-5 rounded-2xl bg-surface-card border border-white/10 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <UtensilsCrossed className="w-4 h-4 text-amber-400" />
                      Station Batch Totals
                    </h3>
                    <p className="text-xs text-text-muted">Aggregated dishes across all pending and cooking orders.</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold self-start">
                    {aggregatedPrepList.length} unique items
                  </span>
                </div>

                {aggregatedPrepList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-text-subdued">Station is clear! No active dishes needed.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {aggregatedPrepList.map((dish, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 sm:p-4 rounded-xl bg-black/40 border border-white/10 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-sm text-white">{dish.name}</span>
                          <span className="w-8 h-8 rounded-lg bg-amber-600 text-white font-mono font-black text-sm flex items-center justify-center shadow-md">
                            {dish.totalQty}x
                          </span>
                        </div>
                        <div className="text-[11px] text-text-muted">
                          Orders: <span className="font-mono text-amber-400 font-bold">{dish.orders.map(id => `#${id}`).join(', ')}</span>
                        </div>
                        {dish.spiceNotes.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {dish.spiceNotes.map((sp, sIdx) => (
                              <span key={sIdx} className="text-[9px] px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-500/30 font-bold">
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
        </main>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 4. ORDER DETAILS INSPECTOR MODAL                           */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-surface-card border border-amber-500/40 shadow-2xl p-4 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black shrink-0">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">Order #{selectedOrder.id} Details</h3>
                  <p className="text-xs text-text-muted">Placed: {selectedOrder.orderTime || 'Today'}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-10 h-10 min-h-11 min-w-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition-colors"
                title="Close Modal"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-text-muted">Customer:</span>
                <span className="font-bold text-white">{selectedOrder.customerName || 'Customer'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Phone:</span>
                <a href={`tel:${selectedOrder.phone || '+250788123456'}`} className="font-mono text-amber-400 font-bold hover:underline flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {selectedOrder.phone || '+250 788 123 456'}
                </a>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Address:</span>
                <span className="font-medium text-white">{selectedOrder.deliveryAddress || selectedOrder.address || 'Kigali'}</span>
              </div>
              {selectedOrder.notes && (
                <div className="pt-2 border-t border-white/5 text-amber-300">
                  <span className="font-black block">Special Note:</span>
                  <span>{selectedOrder.notes}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-text-muted">Ordered Items</h4>
              <div className="space-y-1.5 bg-black/30 p-3 rounded-xl border border-white/5">
                {(selectedOrder.items || []).map((it, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="flex items-center gap-2">
                      <span className="font-mono font-black text-amber-400">{it.qty || 1}x</span>
                      <span className="font-bold text-white">{it.name}</span>
                    </span>
                    {it.spice && <span className="text-[10px] text-red-400 font-bold">🔥 {it.spice}</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full sm:w-auto min-h-11 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 5. MANUAL / CUSTOM COURIER REGISTRATION & ASSIGN MODAL     */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {manualRiderOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-surface-card border border-amber-500/50 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-black shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">Assign Courier Manually</h3>
                  <p className="text-xs text-amber-400 font-mono">Order #{manualRiderOrder.id} • {manualRiderOrder.customerName || 'Customer'}</p>
                </div>
              </div>
              <button
                onClick={() => setManualRiderOrder(null)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition-colors"
                title="Close Modal"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Explanatory Info Card */}
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                The courier details entered below will be sent in real-time to the client so they can see the exact person delivering their order with direct phone contact.
              </p>
            </div>

            {/* Courier Assignment Form */}
            <form onSubmit={handleAssignManualRider} className="space-y-3.5">
              {/* Rider Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted flex items-center gap-1.5">
                  <ChefHat className="w-3.5 h-3.5 text-amber-400" />
                  Courier Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={manualRiderForm.name}
                  onChange={(e) => setManualRiderForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Jean Paul Nkurunziza"
                  className="w-full bg-[#12141A] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-text-subdued focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {/* Rider Phone Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  Courier Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={manualRiderForm.phone}
                  onChange={(e) => setManualRiderForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="e.g. +250 788 123 456"
                  className="w-full bg-[#12141A] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-text-subdued focus:outline-none focus:border-amber-500 transition-colors font-mono"
                />
              </div>

              {/* Plate Number & Vehicle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted flex items-center gap-1.5">
                    <Bike className="w-3.5 h-3.5 text-amber-400" />
                    Plate / Moto Number
                  </label>
                  <input
                    type="text"
                    value={manualRiderForm.plateNumber}
                    onChange={(e) => setManualRiderForm(prev => ({ ...prev, plateNumber: e.target.value }))}
                    placeholder="e.g. RAE 492 K"
                    className="w-full bg-[#12141A] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-text-subdued focus:outline-none focus:border-amber-500 transition-colors uppercase font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted flex items-center gap-1.5">
                    <Bike className="w-3.5 h-3.5 text-amber-400" />
                    Vehicle Type
                  </label>
                  <select
                    value={manualRiderForm.vehicleType}
                    onChange={(e) => setManualRiderForm(prev => ({ ...prev, vehicleType: e.target.value }))}
                    className="w-full bg-[#12141A] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
                  >
                    <option value="Motorcycle Express">🛵 Motorcycle Express</option>
                    <option value="Bicycle Courier">🚲 Bicycle Courier</option>
                    <option value="Car / Van Delivery">🚗 Car / Van Delivery</option>
                    <option value="HotPot Foot Runner">🏃 Foot Runner</option>
                  </select>
                </div>
              </div>

              {/* 4-Digit Pickup Verification PIN */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-amber-400" />
                    Pickup Verification PIN (4 Digits)
                  </span>
                  <button
                    type="button"
                    onClick={() => setManualRiderForm(prev => ({ ...prev, verificationPin: Math.floor(1000 + Math.random() * 9000).toString() }))}
                    className="text-[10px] text-amber-400 hover:underline"
                  >
                    Generate New PIN
                  </button>
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={manualRiderForm.verificationPin}
                  onChange={(e) => setManualRiderForm(prev => ({ ...prev, verificationPin: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) }))}
                  placeholder="e.g. 4829"
                  className="w-full bg-[#12141A] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-amber-300 font-mono font-bold tracking-widest text-center focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setManualRiderOrder(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-text-muted hover:text-white transition-colors min-h-11"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingManualRider}
                  className="px-6 py-2.5 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-orange-500/25 active:scale-95 transition-all min-h-11 disabled:opacity-60"
                >
                  {isSubmittingManualRider ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Assigning Courier...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>Assign Courier & Notify Client 🛵</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
