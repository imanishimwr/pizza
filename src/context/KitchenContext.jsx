import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiService, createOrder } from '../services/apiService';
import { notificationService } from '../services/notificationService';

const KitchenCtx = createContext(null);

export function useKitchen() {
  const ctx = useContext(KitchenCtx);
  if (!ctx) throw new Error('useKitchen must be used inside a KitchenProvider');
  return ctx;
}

export function KitchenProvider({
  children,
  orders = [],
  loading = false,
  meals = [],
  user: initialUser,
  onUpdateStatus,
  onCancelOrder,
  onDeleteOrder,
  onSetNotes,
  onGoHome
}) {
  // Sound effects enabled
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Active station filter: 'all' | 'stoves' | 'assembly' | 'packaging'
  const [activeStation, setActiveStation] = useState('all');

  // Order type filter: 'all' | 'delivery' | 'takeout' | 'dine-in'
  const [orderTypeFilter, setOrderTypeFilter] = useState('all');

  // Priority/Overdue filter (> 10 mins elapsed)
  const [priorityOnly, setPriorityOnly] = useState(false);

  // Mobile active column: 'pending' | 'preparing' | 'ready'
  const [mobileColumn, setMobileColumn] = useState('pending');

  // Search input
  const [searchQuery, setSearchQuery] = useState('');

  // Item checklist state
  const [checkedItems, setCheckedItems] = useState({});

  // Modals state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [proofModalUrl, setProofModalUrl] = useState(null);
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [isSubmittingWalkIn, setIsSubmittingWalkIn] = useState(false);

  // Couriers / Riders fleet state
  const [riders, setRiders] = useState([]);
  const [selectedRiderMap, setSelectedRiderMap] = useState({});
  const [assigningMap, setAssigningMap] = useState({});

  // Manual courier assignment modal state
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

  // Processing orders lock map
  const [processingMap, setProcessingMap] = useState({});

  // Ticking clock for real-time order age
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const user = initialUser || {
    name: 'Head Cooker & Chef',
    email: 'cooker@hotpot.rw',
    role: 'KITCHEN'
  };

  const triggerToast = useCallback((msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  }, []);

  const loadRiders = useCallback(async () => {
    try {
      const data = await apiService.getRiders();
      if (Array.isArray(data)) setRiders(data);
    } catch (err) {
      console.warn('KitchenContext: Failed to fetch riders fleet', err);
    }
  }, []);

  // Background polling for couriers and ticking clock
  useEffect(() => {
    loadRiders();
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      loadRiders();
    }, 5000);
    return () => clearInterval(timer);
  }, [loadRiders]);

  // Audio alerts toggle
  const handleToggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const next = !prev;
      if (next) {
        notificationService.playChime('new_order');
        triggerToast('🔊 Sound is on');
      } else {
        triggerToast('🔇 Sound is off');
      }
      return next;
    });
  }, [triggerToast]);

  // Manual DB Refresh
  const handleManualRefresh = useCallback(() => {
    setIsRefreshing(true);
    if (soundEnabled) notificationService.playChime('status_update');
    setTimeout(() => {
      setIsRefreshing(false);
      triggerToast('⚡ Orders updated');
    }, 600);
  }, [soundEnabled, triggerToast]);

  // Item checklist toggle
  const toggleCheckItem = useCallback((orderId, idx) => {
    const key = `${orderId}-${idx}`;
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Urgency calculator: Green (<5 mins), Yellow (5-10 mins), Red (>10 mins)
  const getUrgency = useCallback((order) => {
    const created = order.created_at || order.createdAt ? new Date(order.created_at || order.createdAt) : null;
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
  }, [currentTime]);

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
        const created = o.created_at || o.createdAt ? new Date(o.created_at || o.createdAt) : null;
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
      .filter(o => o.status === 'pending' || o.status === 'payment_review')
      .sort((a, b) => {
        const timeA = (a.created_at || a.createdAt) ? new Date(a.created_at || a.createdAt).getTime() : (Number(a.id) || 0);
        const timeB = (b.created_at || b.createdAt) ? new Date(b.created_at || b.createdAt).getTime() : (Number(b.id) || 0);
        return timeA - timeB;
      });
  }, [filteredOrders]);

  const preparingOrders = useMemo(() => {
    return filteredOrders
      .filter(o => o.status === 'preparing')
      .sort((a, b) => {
        const timeA = (a.created_at || a.createdAt) ? new Date(a.created_at || a.createdAt).getTime() : (Number(a.id) || 0);
        const timeB = (b.created_at || b.createdAt) ? new Date(b.created_at || b.createdAt).getTime() : (Number(b.id) || 0);
        return timeA - timeB;
      });
  }, [filteredOrders]);

  const readyOrders = useMemo(() => {
    return filteredOrders
      .filter(o => o.status === 'ready')
      .sort((a, b) => {
        const timeA = (a.created_at || a.createdAt) ? new Date(a.created_at || a.createdAt).getTime() : (Number(a.id) || 0);
        const timeB = (b.created_at || b.createdAt) ? new Date(b.created_at || b.createdAt).getTime() : (Number(b.id) || 0);
        return timeA - timeB;
      });
  }, [filteredOrders]);

  const completedOrders = useMemo(() => {
    return (Array.isArray(orders) ? orders : [])
      .filter(o => o.status === 'delivery' || o.status === 'delivered')
      .sort((a, b) => {
        const timeA = (a.created_at || a.createdAt) ? new Date(a.created_at || a.createdAt).getTime() : (Number(a.id) || 0);
        const timeB = (b.created_at || b.createdAt) ? new Date(b.created_at || b.createdAt).getTime() : (Number(b.id) || 0);
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

  // Status progression action with immediate double-click guard and FIFO auto-advance
  const handleAdvanceStatus = useCallback(async (orderId, nextStatus) => {
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
          ? `🔥 Order #${orderId} is now cooking`
          : nextStatus === 'ready'
          ? `✅ Order #${orderId} is ready`
          : nextStatus === 'delivery'
          ? `🛵 Order #${orderId} went with the rider`
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
      console.error('Status update error:', err);
      triggerToast('⚠️ Could not update the order');
    } finally {
      setTimeout(() => {
        setProcessingMap(prev => {
          const copy = { ...prev };
          delete copy[orderId];
          return copy;
        });
      }, 500);
    }
  }, [processingMap, soundEnabled, onUpdateStatus, triggerToast, pendingOrders]);

  // Smart Handover: Assign free courier to ready order & generate 4-digit PIN
  const handleAssignRiderToOrder = useCallback(async (orderId, riderId) => {
    if (!riderId) {
      triggerToast('⚠️ Pick a rider first');
      return;
    }
    setAssigningMap(prev => ({ ...prev, [orderId]: true }));
    try {
      const result = await apiService.assignRiderToOrder(orderId, riderId);
      if (soundEnabled) notificationService.playChime('order_ready');
      triggerToast(`✅ Rider set. PIN: ${result.verification_pin || 'ready'}`);
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
  }, [soundEnabled, triggerToast, loadRiders]);

  // Open manual courier assignment modal
  const openManualRiderModal = useCallback((order) => {
    setManualRiderOrder(order);
    setManualRiderForm({
      name: order.riderName || '',
      phone: order.riderPhone || '',
      plateNumber: order.riderPlate || '',
      vehicleType: order.riderVehicle || 'Motorcycle Express',
      verificationPin: order.verification_pin || Math.floor(1000 + Math.random() * 9000).toString(),
      shift: 'Kitchen On-Demand'
    });
  }, []);

  // Submit manual courier assignment
  const handleAssignManualRider = useCallback(async (e) => {
    if (e) e.preventDefault();
    if (!manualRiderOrder) return;
    if (!manualRiderForm.name.trim() || !manualRiderForm.phone.trim()) {
      triggerToast('⚠️ Rider name and phone are needed.');
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
  }, [manualRiderOrder, manualRiderForm, soundEnabled, triggerToast, loadRiders]);

  // Create Walk-In Order
  const handleWalkInCreated = useCallback(async (orderData) => {
    setIsSubmittingWalkIn(true);
    try {
      const totalRWF = (orderData.items || []).reduce((acc, it) => acc + (it.price * it.qty), 0);
      const newOrderPayload = {
        customerName: orderData.customerName || 'Walk-In Customer',
        phone: orderData.phone || '0788000000',
        address: 'Walk-In / Dine-In Counter',
        orderType: 'takeout',
        paymentMethod: 'cash',
        paymentStatus: 'paid',
        items: (orderData.items || []).map(i => ({
          mealId: i.mealId,
          name: i.name,
          price: i.price,
          qty: i.qty
        })),
        totalRWF,
        notes: 'Walk-in order created from Kitchen KDS'
      };

      await createOrder(newOrderPayload);
      if (soundEnabled) notificationService.playChime('new_order');
      triggerToast('✅ Order added!');
      setIsWalkInOpen(false);
    } catch (err) {
      triggerToast(`⚠️ Failed to create walk-in order: ${err.message || 'Server error'}`);
    } finally {
      setIsSubmittingWalkIn(false);
    }
  }, [soundEnabled, triggerToast]);

  const value = {
    orders,
    loading,
    meals,
    user,
    onUpdateStatus,
    onCancelOrder,
    onDeleteOrder,
    onSetNotes,
    onGoHome,
    riders,
    loadRiders,
    soundEnabled,
    handleToggleSound,
    currentTime,
    activeStation,
    setActiveStation,
    orderTypeFilter,
    setOrderTypeFilter,
    priorityOnly,
    setPriorityOnly,
    searchQuery,
    setSearchQuery,
    checkedItems,
    toggleCheckItem,
    filteredOrders,
    pendingOrders,
    preparingOrders,
    readyOrders,
    completedOrders,
    aggregatedPrepList,
    processingMap,
    handleAdvanceStatus,
    selectedRiderMap,
    setSelectedRiderMap,
    assigningMap,
    handleAssignRiderToOrder,
    manualRiderOrder,
    setManualRiderOrder,
    manualRiderForm,
    setManualRiderForm,
    isSubmittingManualRider,
    openManualRiderModal,
    handleAssignManualRider,
    selectedOrder,
    setSelectedOrder,
    proofModalUrl,
    setProofModalUrl,
    isWalkInOpen,
    setIsWalkInOpen,
    isSubmittingWalkIn,
    handleWalkInCreated,
    toastMsg,
    triggerToast,
    isRefreshing,
    handleManualRefresh,
    mobileColumn,
    setMobileColumn,
    getUrgency
  };

  return (
    <KitchenCtx.Provider value={value}>
      {children}
    </KitchenCtx.Provider>
  );
}
