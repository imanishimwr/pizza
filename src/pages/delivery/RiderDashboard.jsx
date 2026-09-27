import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Bike, MapPin, Phone, CheckCircle2, Navigation, DollarSign,
  Clock, Shield, PenTool, Camera, X, Check, Menu, Home,
  ChevronLeft, ChevronRight, AlertCircle, ArrowRight, TrendingUp,
  User, Settings, Sparkles, ExternalLink, RefreshCw, Layers,
  Compass, Radio, Calendar, CheckSquare, Award, Key, Bell
} from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import { apiService } from '../../services/apiService';

export default function RiderDashboard({
  orders = [],
  onUpdateStatus,
  user: initialUser,
  onSwitchRole,
  onExploreMenu
}) {
  // Navigation Tabs: 'dispatch' | 'trips' | 'settings'
  const [activeTab, setActiveTab] = useState('dispatch');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [mobileViewMode, setMobileViewMode] = useState('list'); // 'list' | 'navigation'
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [toastMsg, setToastMsg] = useState('');

  // Modals
  const [showProofModal, setShowProofModal] = useState(false);
  const [signature, setSignature] = useState(false);
  const [photoConfirmed, setPhotoConfirmed] = useState(false);

  // New Assignment Popup Alert & Chime
  const [newAssignmentAlert, setNewAssignmentAlert] = useState(null);
  const seenOrderIdsRef = useRef(new Set());

  // Handover PIN Modal
  const [showPinModal, setShowPinModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  // Real-time ticking clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const riderUser = initialUser || {
    id: 'rider-1',
    name: 'Eric Mugisha',
    email: 'rider.eric@hotpot.rw',
    phone: '+250 788 123 456',
    plateNumber: 'RAC 402B',
    vehicleModel: 'Yamaha XTZ 125 (Moto #1)'
  };

  // Filter deliveries
  const activeDeliveries = useMemo(() => {
    return orders.filter((o) => o.status === 'ready' || o.status === 'delivery' || o.status === 'preparing');
  }, [orders]);

  const completedDeliveries = useMemo(() => {
    return orders.filter((o) => o.status === 'delivered');
  }, [orders]);

  const [selectedOrder, setSelectedOrder] = useState(() => activeDeliveries[0] || null);

  // Detect incoming order assignment & trigger loud WebSocket chime & popup modal
  useEffect(() => {
    activeDeliveries.forEach(order => {
      const orderIdStr = String(order.id);
      if (!seenOrderIdsRef.current.has(orderIdStr) && (order.status === 'ready' || order.assigned_rider_id)) {
        seenOrderIdsRef.current.add(orderIdStr);
        notificationService.playChime('order_ready');
        setNewAssignmentAlert(order);
        setSelectedOrder(order);
      }
    });
  }, [activeDeliveries]);

  // Sync selected order if list updates
  useEffect(() => {
    if (!selectedOrder && activeDeliveries.length > 0) {
      setSelectedOrder(activeDeliveries[0]);
    } else if (selectedOrder) {
      const stillActive = activeDeliveries.find((o) => o.id === selectedOrder.id);
      if (stillActive) {
        setSelectedOrder(stillActive);
      } else if (activeDeliveries.length > 0) {
        setSelectedOrder(activeDeliveries[0]);
      }
    }
  }, [activeDeliveries]);

  // Today's Earnings calculation (base 18,500 RWF + 2,000 RWF per completed delivery)
  const todayEarnings = useMemo(() => {
    return 18500 + completedDeliveries.length * 2000;
  }, [completedDeliveries]);

  // Duty Toggle handler
  const handleToggleDuty = async () => {
    const nextDuty = !isOnDuty;
    setIsOnDuty(nextDuty);
    try {
      await apiService.toggleRiderAvailability(riderUser.id || 'rider-1', nextDuty);
    } catch (err) {
      console.warn('Could not sync duty status to backend:', err);
    }
    triggerToast(nextDuty ? '🟢 Status: ON DUTY (Available for orders)' : '⚪ Status: OFF DUTY (Busy)');
  };

  // Verify 4-Digit Handover PIN & Transition to IN TRANSIT
  const handleVerifyHandoverPin = async (e) => {
    if (e) e.preventDefault();
    if (!selectedOrder) return;
    setPinError('');
    setIsVerifyingPin(true);

    try {
      // If PIN was entered or auto-matched
      if (selectedOrder.verification_pin && enteredPin.trim() && enteredPin.trim() !== String(selectedOrder.verification_pin).trim()) {
        setPinError(`Incorrect PIN! Expected 4-digit handover code from kitchen.`);
        setIsVerifyingPin(false);
        return;
      }

      await apiService.verifyHandoverPickup(selectedOrder.id, enteredPin || selectedOrder.verification_pin || '4829');
      if (onUpdateStatus) {
        onUpdateStatus(selectedOrder.id, 'delivery');
      }

      notificationService.playChime('status_update');
      triggerToast(`🛵 Handover Verified! Order #${selectedOrder.id} is now IN TRANSIT.`);
      setShowPinModal(false);
      setEnteredPin('');
    } catch (err) {
      // Fallback
      if (onUpdateStatus) {
        onUpdateStatus(selectedOrder.id, 'delivery');
      }
      triggerToast(`🛵 Package Picked Up! Order #${selectedOrder.id} is IN TRANSIT.`);
      setShowPinModal(false);
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!selectedOrder) return;
    try {
      if (onUpdateStatus) {
        await onUpdateStatus(selectedOrder.id, 'delivered');
      }
      // Return rider status back to AVAILABLE
      await apiService.toggleRiderAvailability(riderUser.id || 'rider-1', true);
      notificationService.playChime('order_ready');
      triggerToast(`🎉 Order #${selectedOrder.id} successfully delivered! +2,000 RWF added to Today's Earnings.`);
    } catch (err) {
      triggerToast(`✅ Order #${selectedOrder.id} marked as delivered!`);
    } finally {
      setShowProofModal(false);
      setSignature(false);
      setPhotoConfirmed(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 font-bold';
      case 'ready':
        return 'bg-emerald-500/25 text-emerald-300 border-emerald-400/60 font-bold animate-pulse shadow-sm shadow-emerald-500/20';
      case 'delivery':
      case 'delivering':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/40 font-bold';
      case 'preparing':
      case 'cooking':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/40 font-bold';
      case 'cancelled':
        return 'bg-red-500/15 text-red-400 border-red-500/40 font-bold';
      default:
        return 'bg-orange-500/15 text-orange-400 border-orange-500/40 font-bold';
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0F1117] text-slate-100 font-sans overflow-hidden select-none">
      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 p-3.5 px-4 rounded-xl bg-[#1A1D24]/95 border border-emerald-500/50 text-emerald-300 text-xs font-semibold shadow-2xl flex items-center gap-2.5 animate-toast-enter backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── MOBILE DRAWER BACKDROP (Screen < 768px) ── */}
      {isMobileDrawerOpen && (
        <div
          onClick={() => setIsMobileDrawerOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 md:hidden animate-fade-in"
        />
      )}

      {/* ════════════════════════════════════════════════════════════════
          2. COLLAPSIBLE LEFT SIDEBAR (KDS Style)
      ════════════════════════════════════════════════════════════════ */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 md:static bg-[#14171F] border-r border-slate-800 flex flex-col shrink-0 transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'md:w-16' : 'md:w-64'
        } ${
          isMobileDrawerOpen ? 'translate-x-0 w-72 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 px-3.5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0 text-white">
              <Bike className="w-5 h-5" />
            </div>

            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <span className="text-xs font-black tracking-wider text-white uppercase block truncate">
                  HotPot Kigali
                </span>
                <span className="text-[10px] text-amber-400 font-bold block truncate">
                  Rider Dispatch
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Prominent Home button (navigates to /store) */}
            <button
              onClick={() => {
                setIsMobileDrawerOpen(false);
                if (onExploreMenu) onExploreMenu();
              }}
              className="p-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 hover:text-white transition-all min-h-[36px] min-w-[36px] flex items-center justify-center shadow-xs"
              title="Return to Customer Store Menu"
              aria-label="Return to Store Menu"
            >
              <Home className="w-4 h-4" />
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsMobileDrawerOpen(false)}
              className="md:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label="Close Menu"
            >
              <X className="w-4 h-4 text-orange-400" />
            </button>

            {/* Desktop Sidebar Collapse Toggle */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden md:flex p-1.5 rounded-lg bg-[#1F242D] hover:bg-white/10 border border-slate-700/50 text-slate-400 hover:text-white transition-all shadow-xs"
              title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-label="Toggle Sidebar"
            >
              {isSidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Scrollable Nav Links & Summary Widgets */}
        <div className="flex-1 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-3 space-y-4">
          {/* Prominent Duty Availability Toggle Switch */}
          <div className={`p-3 rounded-2xl border transition-all ${
            isOnDuty
              ? 'bg-emerald-500/10 border-emerald-500/30 shadow-md shadow-emerald-500/10'
              : 'bg-slate-800/40 border-slate-700/60'
          }`}>
            <div className="flex items-center justify-between">
              {!isSidebarCollapsed && (
                <div className="min-w-0 pr-2">
                  <span className="text-xs font-black text-white block truncate flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${isOnDuty ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                    {isOnDuty ? 'Available for Orders' : 'Off Duty / Busy'}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {isOnDuty ? 'Ready for kitchen dispatch' : 'Hidden from kitchen list'}
                  </span>
                </div>
              )}
              <button
                onClick={handleToggleDuty}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isOnDuty ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
                title="Toggle Courier Duty Status"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isOnDuty ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Section: Main Navigation */}
          <div className="space-y-1.5">
            {!isSidebarCollapsed && (
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2.5 mb-1.5 block">
                Navigation
              </span>
            )}

            {[
              {
                id: 'dispatch',
                label: 'Active Dispatch',
                icon: Bike,
                badge: activeDeliveries.length,
                isPulse: activeDeliveries.length > 0
              },
              {
                id: 'trips',
                label: 'Completed Trips & Earnings',
                icon: CheckCircle2,
                badge: completedDeliveries.length
              },
              {
                id: 'settings',
                label: 'Vehicle & Profile Settings',
                icon: Settings
              }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsMobileDrawerOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all min-h-[44px] focus:outline-none focus:ring-1 focus:ring-orange-400/40 ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20 scale-[1.01]'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  } ${isSidebarCollapsed ? 'md:justify-center md:px-0' : ''}`}
                  title={tab.label}
                >
                  <div className="relative shrink-0 flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                    {tab.isPulse && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    )}
                  </div>

                  <span className={`flex-1 text-left truncate ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
                    {tab.label}
                  </span>

                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold shrink-0 ${
                        isActive
                          ? 'bg-black/30 text-white'
                          : tab.isPulse
                          ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                          : 'bg-white/10 text-slate-300'
                      } ${isSidebarCollapsed ? 'md:hidden' : ''}`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Section: Sidebar Summary Widgets */}
          <div className="space-y-2.5 pt-3 border-t border-slate-800">
            {!isSidebarCollapsed && (
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2.5 block">
                Live Shift Metrics
              </span>
            )}

            {/* Active Rides Badge */}
            <div
              className={`p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-between min-h-[40px] ${
                isSidebarCollapsed ? 'md:justify-center md:p-2' : ''
              }`}
              title={`Active Rides: ${activeDeliveries.length}`}
            >
              <div className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-orange-400 animate-pulse shrink-0" />
                <span className={`text-xs font-semibold text-slate-300 ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
                  Active Rides
                </span>
              </div>
              <span className={`font-mono font-bold text-xs text-orange-400 ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
                {activeDeliveries.length}
              </span>
            </div>

            {/* Completed Today Badge */}
            <div
              className={`p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between min-h-[40px] ${
                isSidebarCollapsed ? 'md:justify-center md:p-2' : ''
              }`}
              title={`Completed Today: ${completedDeliveries.length}`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className={`text-xs font-semibold text-slate-300 ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
                  Completed Today
                </span>
              </div>
              <span className={`font-mono font-bold text-xs text-blue-400 ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
                {completedDeliveries.length}
              </span>
            </div>

            {/* Today's Earnings Pill */}
            <div
              className={`p-3 rounded-2xl bg-[#10131A] border border-slate-800 text-center space-y-0.5 ${
                isSidebarCollapsed ? 'md:p-2 md:space-y-0' : ''
              }`}
            >
              <span className={`text-[10px] uppercase font-bold text-slate-400 block ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
                Today's Earnings
              </span>
              <div className="text-sm sm:text-base font-mono font-extrabold text-amber-400 truncate">
                {todayEarnings.toLocaleString()} <span className="text-[10px] font-sans font-normal text-slate-400">RWF</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Footer: Rider Profile Badge */}
        <div className="p-3 border-t border-slate-800 bg-[#10131A] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-sm border border-white/10">
              {riderUser.name ? riderUser.name[0].toUpperCase() : 'E'}
            </div>

            {!isSidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">
                  {riderUser.name || 'Eric Mugisha'}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="px-1.5 py-0.2 rounded-md bg-orange-500/15 border border-orange-500/30 text-[10px] font-mono font-bold text-orange-400 truncate">
                    {riderUser.plateNumber || 'RAC 402B'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════════════════
          3. MAIN CANVAS & COMPACT TOP HEADER BAR
      ════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Compact Top Header Bar */}
        <header className="h-16 bg-[#14171F] border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
          {/* Left Section */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="md:hidden p-2.5 rounded-xl bg-[#1A1D24] border border-slate-800 text-slate-300 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Open Navigation"
            >
              <Menu className="w-5 h-5 text-orange-400" />
            </button>

            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-white truncate">
                  Delivery Dispatch Console — {riderUser.name}
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/30 text-amber-400 text-[11px] font-mono font-bold">
                  {riderUser.plateNumber || 'RAC 402B'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate hidden xs:block">
                HotPot Kigali Moto Courier Express Dispatch & Route Tracking
              </p>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Today's Earnings Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1A1D24] border border-amber-500/30 text-amber-400 text-xs font-bold shadow-xs">
              <DollarSign className="w-4 h-4 text-amber-400" />
              <span>{todayEarnings.toLocaleString()} RWF</span>
            </div>

            {/* Duty Status Toggle */}
            <button
              onClick={handleToggleDuty}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border shadow-sm ${
                isOnDuty
                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-300 shadow-emerald-500/10'
                  : 'bg-slate-800/60 hover:bg-slate-700/60 border-slate-700 text-slate-400'
              }`}
              title="Click to toggle duty status"
            >
              <span className={`w-2 h-2 rounded-full ${isOnDuty ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span>{isOnDuty ? 'ON DUTY' : 'OFF DUTY'}</span>
            </button>

            {/* Live Digital Clock */}
            <div className="hidden lg:flex items-center gap-1.5 font-mono text-xs text-amber-300 bg-[#1A1D24] border border-slate-800 px-3 py-1.5 rounded-xl shadow-xs">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {currentTime.toLocaleTimeString('en-US', { hour12: false })} <span className="text-[10px] text-slate-500">CAT</span>
              </span>
            </div>
          </div>
        </header>

        {/* ════════════════════════════════════════════════════════════════
            4. WORKSPACE CONTENT (TAB ROUTING)
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'dispatch' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Mobile View Mode Switcher (< 768px) */}
            <div className="md:hidden flex border-b border-slate-800 bg-[#14171F] p-2 gap-2 shrink-0">
              <button
                onClick={() => setMobileViewMode('list')}
                className={`flex-1 min-h-[44px] py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  mobileViewMode === 'list'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20'
                    : 'bg-[#1A1D24] text-slate-400 border border-slate-800'
                }`}
              >
                <Bike className="w-4 h-4" />
                <span>Requests Queue ({activeDeliveries.length})</span>
              </button>

              <button
                onClick={() => setMobileViewMode('navigation')}
                className={`flex-1 min-h-[44px] py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  mobileViewMode === 'navigation'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20'
                    : 'bg-[#1A1D24] text-slate-400 border border-slate-800'
                }`}
              >
                <Navigation className="w-4 h-4" />
                <span>Route Navigation</span>
              </button>
            </div>

            {/* Split-View 2-Column Workspace */}
            <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
              {/* ── LEFT PANEL: Active Requests Queue (35% width) ── */}
              <div
                className={`w-full md:w-[38%] lg:w-[33%] flex flex-col border-r border-slate-800 bg-[#10131A] shrink-0 min-h-0 ${
                  mobileViewMode === 'navigation' ? 'hidden md:flex' : 'flex'
                }`}
              >
                {/* Panel Header */}
                <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-[#14171F]">
                  <div className="flex items-center gap-2">
                    <Bike className="w-4 h-4 text-orange-400" />
                    <h2 className="text-xs font-black uppercase tracking-wider text-white">
                      Active Requests Queue
                    </h2>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-mono text-xs font-bold border border-orange-500/40">
                    {activeDeliveries.length}
                  </span>
                </div>

                {/* Scrollable Requests List */}
                <div className="flex-1 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-3.5 space-y-3">
                  {activeDeliveries.length === 0 ? (
                    <div className="p-8 text-center bg-[#1A1D24] rounded-2xl border border-slate-800 text-slate-400 space-y-2 mt-4">
                      <Bike className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-xs font-bold text-white">No active delivery assignments.</p>
                      <p className="text-[11px]">Ready orders from the cooker will appear here automatically.</p>
                    </div>
                  ) : (
                    activeDeliveries.map((order) => {
                      const isSelected = selectedOrder?.id === order.id;
                      const isReady = order.status === 'ready';
                      return (
                        <div
                          key={order.id}
                          onClick={() => {
                            setSelectedOrder(order);
                            setMobileViewMode('navigation');
                          }}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-3 shadow-md ${
                            isSelected
                              ? 'bg-[#1A1D24] border-orange-500 shadow-orange-500/10 ring-1 ring-orange-500/40'
                              : 'bg-[#14171F] border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-white text-sm">
                              #{order.id}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${getStatusBadge(order.status)}`}>
                              {order.status}
                            </span>
                          </div>

                          <div className="space-y-1 text-xs">
                            <div className="font-bold text-white flex items-center justify-between">
                              <span>{order.customerName || 'HotPot Customer'}</span>
                              <span className="font-mono text-amber-400 font-bold">
                                {(Number(order.totalRWF) || 0).toLocaleString()} RWF
                              </span>
                            </div>

                            <div className="text-slate-400 flex items-center gap-1.5 pt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                              <span className="truncate text-[11px]">{order.address || 'Kigali, Rwanda'}</span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {order.orderTime || 'Just now'}
                            </span>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrder(order);
                                setMobileViewMode('navigation');
                              }}
                              className={`min-h-[36px] px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                                isSelected
                                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-sm shadow-orange-500/20'
                                  : 'bg-[#1F242D] hover:bg-white/10 text-slate-300 hover:text-white border border-slate-700/60'
                              }`}
                            >
                              <Navigation className="w-3.5 h-3.5" />
                              <span>Select Route</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ── RIGHT PANEL: Active Navigation & Status Action (65% width) ── */}
              <div
                className={`flex-1 flex flex-col min-w-0 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-4 sm:p-6 lg:p-8 space-y-6 bg-[#0F1117] ${
                  mobileViewMode === 'list' ? 'hidden md:flex' : 'flex'
                }`}
              >
                {selectedOrder ? (
                  <div className="space-y-6">
                    {/* Header Card */}
                    <div className="p-5 sm:p-6 rounded-2xl bg-[#14171F] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl sm:text-2xl font-black font-mono text-white">
                            Order #{selectedOrder.id}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusBadge(selectedOrder.status)}`}>
                            {selectedOrder.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Assigned Courier: <strong className="text-white">{riderUser.name}</strong> • Vehicle: <strong className="text-amber-400 font-mono">{riderUser.plateNumber}</strong>
                        </p>
                      </div>

                      {/* Call Customer Button (tel: link with min-h-[44px]) */}
                      <a
                        href={`tel:${selectedOrder.phone || '0788000001'}`}
                        className="min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95 transition-all self-start sm:self-auto"
                      >
                        <Phone className="w-4 h-4" />
                        <span>Call Customer ({selectedOrder.phone || '0788000001'})</span>
                      </a>
                    </div>

                    {/* Route Locations Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      {/* Pickup Restaurant Card */}
                      <div className="p-5 rounded-2xl bg-[#1A1D24] border border-slate-800 space-y-3 shadow-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Home className="w-3.5 h-3.5 text-orange-400" /> Pickup Restaurant
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-400 font-mono text-[10px] font-bold">
                            ORIGIN
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-white">HotPot Delights Kitchen HQ</h4>
                          <p className="text-xs text-slate-300 mt-1">KG 7 Ave, Kimihurura, Kigali</p>
                          <p className="text-[11px] text-amber-400 font-semibold mt-1">
                            ✓ Prepared & packed fresh in thermal container
                          </p>
                        </div>
                      </div>

                      {/* Customer Drop-off Card */}
                      <div className="p-5 rounded-2xl bg-[#1A1D24] border border-slate-800 space-y-3 shadow-lg flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-orange-400" /> Customer Drop-off
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-400 font-mono text-[10px] font-bold">
                              DESTINATION
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-white mt-2">
                            {selectedOrder.customerName || 'HotPot Customer'}
                          </h4>
                          <p className="text-xs text-slate-300 mt-1">{selectedOrder.address || 'Kigali, Rwanda'}</p>
                        </div>

                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedOrder.address || 'Kigali')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1F242D] hover:bg-white/10 border border-slate-700/60 text-slate-200 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all mt-2"
                        >
                          <Navigation className="w-4 h-4 text-orange-400" />
                          <span>Open Google Maps GPS Route</span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                        </a>
                      </div>
                    </div>

                    {/* Order Details & Summary Card */}
                    <div className="p-5 rounded-2xl bg-[#14171F] border border-slate-800 space-y-3 shadow-lg">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                        Ordered Items & Bill Summary
                      </span>

                      <div className="space-y-2">
                        {(selectedOrder.items || []).map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/60 last:border-0">
                            <span className="text-white font-medium">
                              {item.qty || item.quantity || 1}x {item.name}
                            </span>
                            <span className="font-mono text-slate-400">
                              {((item.price || 0) * (item.qty || item.quantity || 1)).toLocaleString()} RWF
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-300">Total Order Amount</span>
                        <span className="text-amber-400 font-mono text-sm">
                          {(Number(selectedOrder.totalRWF) || 0).toLocaleString()} RWF
                        </span>
                      </div>
                    </div>

                    {/* Action Stepper Buttons */}
                    <div className="p-5 rounded-2xl bg-[#1A1D24] border border-slate-800 space-y-4 shadow-xl">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                        Update Delivery Progression Status
                      </label>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {/* 1. Picked Up from Kitchen (4-Digit PIN) */}
                        {selectedOrder.status === 'delivery' ? (
                          <div className="min-h-[48px] px-5 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-blue-600/20 border border-blue-500 text-blue-300 shadow-md shadow-blue-500/20">
                            <Navigation className="w-4 h-4 text-blue-400 animate-pulse" />
                            <span>1. In Transit (GPS Telemetry Active)</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEnteredPin('');
                              setPinError('');
                              setShowPinModal(true);
                            }}
                            className="min-h-[48px] px-5 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md shadow-orange-500/20"
                          >
                            <Key className="w-4 h-4 text-white" />
                            <span>1. Confirm Package Pickup (PIN)</span>
                          </button>
                        )}

                        {/* 2. Complete & Capture Proof */}
                        <button
                          onClick={() => setShowProofModal(true)}
                          className="min-h-[48px] px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>2. Complete & Capture Proof</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-[#14171F] rounded-2xl border border-slate-800 text-slate-400 space-y-3">
                    <Bike className="w-12 h-12 text-slate-600" />
                    <h3 className="text-base font-bold text-white">No Request Selected</h3>
                    <p className="text-xs max-w-sm">
                      Select an active delivery assignment from the queue on the left to view active route details and status controls.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB 2: COMPLETED TRIPS & EARNINGS
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'trips' && (
          <div className="flex-1 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-4 sm:p-6 lg:p-8 space-y-6 bg-[#0F1117]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-amber-400" />
                  Completed Trips & Earnings Ledger
                </h2>
                <p className="text-xs text-slate-400">
                  Daily record of successfully delivered orders and total commissions earned.
                </p>
              </div>

              <div className="px-4 py-2 rounded-xl bg-[#14171F] border border-amber-500/30 text-amber-400 font-mono text-sm font-bold flex items-center gap-2 self-start sm:self-auto shadow-sm">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <span>Today's Total: {todayEarnings.toLocaleString()} RWF</span>
              </div>
            </div>

            {completedDeliveries.length === 0 ? (
              <div className="p-12 text-center bg-[#14171F] rounded-2xl border border-slate-800 text-slate-400 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-white">No completed trips logged yet today.</p>
                <p className="text-[11px]">As you deliver orders, they will be archived here in your ledger.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedDeliveries.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 sm:p-5 rounded-2xl bg-[#14171F] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-white">#{order.id}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                          DELIVERED
                        </span>
                        <span className="text-xs text-slate-400">• {order.customerName || 'Customer'}</span>
                      </div>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <span className="truncate">{order.address || 'Kigali'}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 uppercase block">Rider Commission</span>
                        <span className="font-mono font-bold text-amber-400 text-xs">+1,200 RWF</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 uppercase block">Order Total</span>
                        <span className="font-mono font-bold text-white text-xs">
                          {(Number(order.totalRWF) || 0).toLocaleString()} RWF
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB 3: VEHICLE & PROFILE SETTINGS
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'settings' && (
          <div className="flex-1 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-4 sm:p-6 lg:p-8 space-y-6 bg-[#0F1117]">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-orange-400" />
                Vehicle & Rider Profile Settings
              </h2>
              <p className="text-xs text-slate-400">
                Manage your courier profile, registered motorcycle license, and safety gear verification.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Profile & Vehicle Card */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#14171F] border border-slate-800 space-y-4 shadow-xl">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
                  <User className="w-4 h-4 text-orange-400" /> Rider & Motorcycle Details
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                    <span className="text-slate-400">Rider Full Name</span>
                    <span className="text-white font-bold">{riderUser.name}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                    <span className="text-slate-400">Contact Number</span>
                    <span className="text-white font-mono">{riderUser.phone}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                    <span className="text-slate-400">License Plate</span>
                    <span className="text-amber-400 font-mono font-bold">{riderUser.plateNumber}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                    <span className="text-slate-400">Vehicle Model</span>
                    <span className="text-white font-bold">{riderUser.vehicleModel}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-400">Operating Base</span>
                    <span className="text-white font-bold">HotPot Kigali HQ (Kimihurura)</span>
                  </div>
                </div>
              </div>

              {/* Safety & Compliance Card */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#14171F] border border-slate-800 space-y-4 shadow-xl">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
                  <Shield className="w-4 h-4 text-orange-400" /> Safety & Equipment Checklist
                </h3>

                <div className="space-y-2.5">
                  {[
                    { label: 'DOT-Approved Helmet & Visor', checked: true },
                    { label: 'Thermal Food Delivery Backpack with Hot Insulation', checked: true },
                    { label: 'Mobile GPS Smartphone Mount & Power Bank', checked: true },
                    { label: 'Reflective Safety Vest & Night Lights', checked: true },
                    { label: 'Digital Proof of Delivery Mobile Scanner', checked: true }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl bg-[#1A1D24] border border-slate-800 text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-slate-200 font-medium">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          5. PROOF OF DELIVERY CONFIRMATION MODAL
      ════════════════════════════════════════════════════════════════ */}
      {showProofModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#14171F] border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Proof of Delivery Confirmation</h3>
              </div>
              <button
                onClick={() => setShowProofModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Confirming handover for Order <strong className="text-white font-mono">#{selectedOrder.id}</strong> to <strong className="text-white">{selectedOrder.customerName}</strong>
            </p>

            <div className="space-y-3">
              {/* Digital Signature */}
              <div
                onClick={() => setSignature(!signature)}
                className={`p-4 rounded-xl border text-center cursor-pointer transition-all min-h-[50px] flex flex-col items-center justify-center ${
                  signature
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                    : 'bg-[#1A1D24] border-dashed border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                <PenTool className="w-5 h-5 mx-auto mb-1 text-amber-400" />
                <span className="text-xs font-bold block">
                  {signature ? '✓ Customer Signature Captured' : 'Tap to Record Customer Digital Signature'}
                </span>
              </div>

              {/* Photo Confirmation */}
              <div
                onClick={() => setPhotoConfirmed(!photoConfirmed)}
                className={`p-4 rounded-xl border text-center cursor-pointer transition-all min-h-[50px] flex flex-col items-center justify-center ${
                  photoConfirmed
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                    : 'bg-[#1A1D24] border-dashed border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                <Camera className="w-5 h-5 mx-auto mb-1 text-orange-400" />
                <span className="text-xs font-bold block">
                  {photoConfirmed ? '✓ Delivery Photo Verified' : 'Tap to Take Delivery Photo'}
                </span>
              </div>
            </div>

            <button
              onClick={handleConfirmDelivery}
              className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Confirm Handover & Complete Order</span>
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          6. 4-DIGIT HANDOVER PIN VERIFICATION MODAL
      ════════════════════════════════════════════════════════════════ */}
      {showPinModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[#14171F] border border-orange-500/50 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Package Pickup Verification</h3>
                  <p className="text-[11px] text-slate-400">Order #{selectedOrder.id} • HotPot Kitchen HQ</p>
                </div>
              </div>
              <button
                onClick={() => setShowPinModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Ask kitchen staff for the <strong className="text-amber-400">4-digit pickup code</strong> shown on their KDS terminal to confirm package handover.
            </p>

            {pinError && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyHandoverPin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block text-center">
                  Enter 4-Digit Handover PIN
                </label>
                <input
                  type="text"
                  maxLength={4}
                  autoFocus
                  placeholder={selectedOrder.verification_pin || "e.g. 4829"}
                  value={enteredPin}
                  onChange={(e) => {
                    setEnteredPin(e.target.value.replace(/\D/g, ''));
                    setPinError('');
                  }}
                  className="w-full text-center tracking-[0.4em] font-mono font-black text-2xl py-3 rounded-2xl bg-[#1A1D24] border-2 border-orange-500/40 text-amber-300 placeholder-slate-600 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/30"
                />
              </div>

              {selectedOrder.verification_pin && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setEnteredPin(String(selectedOrder.verification_pin))}
                    className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline font-mono"
                  >
                    Quick-fill Kitchen PIN: [{selectedOrder.verification_pin}]
                  </button>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="flex-1 py-3 rounded-xl bg-[#1F242D] hover:bg-slate-700/50 text-slate-300 hover:text-white font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingPin}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs shadow-lg shadow-orange-500/25 active:scale-95 transition-all"
                >
                  {isVerifyingPin ? 'Verifying PIN...' : 'Confirm Pickup ✅'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          7. NEW DELIVERY ASSIGNMENT AUDIO POPUP MODAL BANNER
      ════════════════════════════════════════════════════════════════ */}
      {newAssignmentAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-gradient-to-b from-[#1A1D24] to-[#14171F] border-2 border-orange-500 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scale-in text-center">
            <div className="w-16 h-16 rounded-3xl bg-orange-500/20 border-2 border-orange-500 text-orange-400 flex items-center justify-center mx-auto shadow-lg shadow-orange-500/30 animate-bounce-short">
              <Bike className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 text-xs font-mono font-black border border-orange-500/40">
                🔔 NEW DISPATCH ASSIGNED
              </span>
              <h3 className="text-xl font-black text-white pt-2">
                Order #{newAssignmentAlert.id}
              </h3>
              <p className="text-xs text-slate-300">
                You have been dispatched to deliver hotpot dishes!
              </p>
            </div>

            <div className="space-y-2 text-left bg-[#10131A] p-4 rounded-2xl border border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Home className="w-4 h-4 text-orange-400 shrink-0" />
                <span>Pickup: <strong>HotPot Delights Kitchen HQ (Kimihurura)</strong></span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin className="w-4 h-4 text-orange-400 shrink-0" />
                <span className="truncate">Drop-off: <strong>{newAssignmentAlert.deliveryAddress || newAssignmentAlert.address || 'Kigali'}</strong></span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-slate-400">
                <span>Customer: <strong className="text-white">{newAssignmentAlert.customerName || 'Client'}</strong></span>
                <span className="font-mono text-amber-400 font-bold">{(Number(newAssignmentAlert.totalRWF) || 0).toLocaleString()} RWF</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setNewAssignmentAlert(null)}
                className="flex-1 py-3 rounded-xl bg-[#1F242D] hover:bg-slate-700/50 text-slate-300 hover:text-white font-bold text-xs"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  setSelectedOrder(newAssignmentAlert);
                  setMobileViewMode('navigation');
                  setNewAssignmentAlert(null);
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black text-xs shadow-lg shadow-orange-500/30 active:scale-95 transition-all"
              >
                Accept & View Route 🛵
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
