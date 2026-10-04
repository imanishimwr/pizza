import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  ChefHat, Clock, AlertCircle, CheckCircle2, ArrowRight, Bell, Sparkles,
  Volume2, VolumeX, Search, Filter, RefreshCw, Flame, UtensilsCrossed,
  ShoppingBag, Eye, Phone, MapPin, Check, Timer, Layers, BookOpen,
  AlertTriangle, ShieldCheck, ChevronRight, ChevronLeft, X, Bike,
  Home, Menu, UserPlus, Plus, Edit3, UserCheck, Hash, CreditCard, Navigation
} from 'lucide-react';
import { KitchenProvider, useKitchen } from '../../context/KitchenContext';
import { session } from '../../services/apiService';
import AddWalkInModal from './AddWalkInModal';

function KitchenShell() {
  const navigate = useNavigate();

  const {
    orders = [],
    meals,
    onGoHome,
    soundEnabled,
    handleToggleSound,
    activeStation,
    setActiveStation,
    orderTypeFilter,
    setOrderTypeFilter,
    priorityOnly,
    setPriorityOnly,
    searchQuery,
    setSearchQuery,
    pendingOrders,
    preparingOrders,
    readyOrders,
    aggregatedPrepList,
    selectedOrder,
    setSelectedOrder,
    proofModalUrl,
    setProofModalUrl,
    manualRiderOrder,
    setManualRiderOrder,
    manualRiderForm,
    setManualRiderForm,
    isSubmittingManualRider,
    handleAssignManualRider,
    isWalkInOpen,
    setIsWalkInOpen,
    isSubmittingWalkIn,
    handleWalkInCreated,
    toastMsg,
    isRefreshing,
    handleManualRefresh,
    setMobileColumn,
    onUpdateStatus
  } = useKitchen();

  // Sidebar Collapse state (desktop expanded w-64 vs collapsed w-16)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Mobile Drawer state (slide-over for screens < 768px)
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const activeDeliveriesCount = orders.filter(
    (o) => o.status === 'delivery' || (o.status === 'ready' && (o.assigned_rider_id || o.riderName))
  ).length;

  const handleReturnHome = () => {
    setIsMobileDrawerOpen(false);
    if (onGoHome) {
      onGoHome();
    } else {
      navigate('/');
    }
  };

  const navLinks = [
    {
      to: '/hotpotkitchen/live',
      label: 'Live Board',
      icon: Layers,
      count: pendingOrders.length + preparingOrders.length + readyOrders.length,
      title: 'See kitchen board'
    },
    {
      to: '/hotpotkitchen/tracking',
      label: 'Tracking',
      icon: Navigation,
      count: activeDeliveriesCount,
      title: 'Track deliveries live'
    },
    {
      to: '/hotpotkitchen/recipes',
      label: 'Recipes',
      icon: BookOpen,
      count: null,
      title: 'See recipes'
    },
    {
      to: '/hotpotkitchen/stations',
      label: 'To Cook',
      icon: UtensilsCrossed,
      count: aggregatedPrepList.length,
      title: 'See what to cook'
    }
  ];

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-[#0c0d12] text-text-main font-sans">
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
              <button
                type="button"
                onClick={handleReturnHome}
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
              type="button"
              onClick={handleReturnHome}
              className="w-8 h-8 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 hover:text-white border border-amber-500/40 flex items-center justify-center mx-auto shadow-sm transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-500/50 min-h-9.5 min-w-9.5"
              title="Return to Customer Store Menu"
              aria-label="Home / Return to Store Menu"
            >
              <Home className="w-4 h-4" />
            </button>
          )}

          {/* Close button for mobile slide-over drawer */}
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(false)}
            className="md:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 text-text-muted hover:text-white transition-all min-h-11 min-w-11 flex items-center justify-center shrink-0 ml-auto"
            aria-label="Close Mobile Navigation"
          >
            <X className="w-5 h-5 text-amber-400" />
          </button>

          {/* Desktop Sidebar Collapse Toggle */}
          <button
            type="button"
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
              type="button"
              onClick={() => setIsSidebarCollapsed(false)}
              className="p-2 rounded-lg bg-surface-card hover:bg-white/10 border border-white/10 text-amber-400 hover:text-white transition-all shadow-sm"
              title="Expand Sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Scrollable Sidebar Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-2.5 space-y-3.5">
          {/* SECTION A: TOP NAVIGATION LINKS (ROUTER-BASED) */}
          <div className="space-y-1">
            {!isSidebarCollapsed && (
              <span className="text-[10px] font-black uppercase tracking-wider text-text-muted px-2.5 mb-1.5 block">
                Views
              </span>
            )}

            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className={({ isActive }) => `
                    w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-bold text-xs transition-all min-h-11 focus:outline-none focus:ring-1 focus:ring-amber-500/40
                    ${
                      isActive
                        ? 'bg-linear-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-orange-500/20'
                        : 'text-text-muted hover:text-white hover:bg-white/5'
                    }
                    ${isSidebarCollapsed ? 'md:justify-center md:px-0' : ''}
                  `}
                  title={item.title}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className={`flex-1 text-left ${isSidebarCollapsed ? 'md:hidden' : ''}`}>{item.label}</span>
                  {item.count !== null && (
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] bg-black/40 font-mono font-bold ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
                      {item.count}
                    </span>
                  )}
                </NavLink>
              );
            })}
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
                Station
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'stoves', label: 'Stove' },
                  { id: 'assembly', label: 'Pizza' },
                  { id: 'packaging', label: 'Packing' },
                ].map(s => (
                  <button
                    key={s.id}
                    type="button"
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
                  { id: 'all', label: 'All' },
                  { id: 'delivery', label: 'Delivery' },
                  { id: 'takeout', label: 'Pickup' },
                  { id: 'dine-in', label: 'Dine in' },
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
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
                type="button"
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
                  <span className={`${isSidebarCollapsed ? 'md:hidden' : ''}`}>Late (over 10 min)</span>
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
            type="button"
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
              <span>Sound</span>
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
            <span className={`font-bold truncate text-[10px] ${isSidebarCollapsed ? 'md:hidden' : ''}`}>Online</span>
          </div>

          {/* Styled Action Button: Return to Store Menu */}
          <button
            type="button"
            onClick={handleReturnHome}
            className={`w-full py-2.5 px-3 rounded-lg bg-surface-card hover:bg-amber-500/10 active:bg-amber-500/20 border border-white/10 hover:border-amber-500/40 text-text-muted hover:text-amber-300 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm group min-h-11 focus:outline-none focus:ring-1 focus:ring-amber-400/50 ${
              isSidebarCollapsed ? 'md:p-2' : ''
            }`}
            title="Return to Store Menu"
          >
            <Home className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
            <span className={`${isSidebarCollapsed ? 'md:hidden' : ''}`}>Back to Store</span>
          </button>
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
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="md:hidden p-2 rounded-lg bg-surface-card hover:bg-white/10 border border-white/10 text-amber-400 hover:text-white transition-all min-h-11 min-w-11 flex items-center justify-center shrink-0 shadow-sm active:scale-95"
              title="Open Navigation Menu"
              aria-label="Toggle Navigation Drawer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Quick Home Button */}
            <button
              type="button"
              onClick={handleReturnHome}
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
              onClick={() => {
                navigate('/hotpotkitchen/live');
                setMobileColumn('pending');
              }}
              className="px-2.5 sm:px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-amber-500/25 transition-all shadow-sm"
              title="New Incoming Orders"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">New:</span>
              <span className="font-mono font-black text-white">{pendingOrders.length}</span>
            </div>

            {/* Counter 2: In Prep */}
            <div
              onClick={() => {
                navigate('/hotpotkitchen/live');
                setMobileColumn('preparing');
              }}
              className="px-2.5 sm:px-3 py-1 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-blue-500/25 transition-all shadow-sm"
              title="Orders Currently Cooking"
            >
              <Flame className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Cooking:</span>
              <span className="font-mono font-black text-white">{preparingOrders.length}</span>
            </div>

            {/* Counter 3: Ready for Pickup */}
            <div
              onClick={() => {
                navigate('/hotpotkitchen/live');
                setMobileColumn('ready');
              }}
              className="px-2.5 sm:px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-emerald-500/25 transition-all shadow-sm"
              title="Cooker Ready for Pickup"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Ready:</span>
              <span className="font-mono font-black text-white">{readyOrders.length}</span>
            </div>
          </div>

          {/* Right: Search, Walk-In Order & Quick Refresh */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick Search */}
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
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-white text-[11px]"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Walk-in Order Button */}
            <button
              type="button"
              onClick={() => setIsWalkInOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm min-h-11 sm:min-h-0"
              title="Create Walk-In / Counter Order"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">New Order</span>
            </button>

            {/* Sync Trigger Button */}
            <button
              type="button"
              onClick={handleManualRefresh}
              className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-surface-card hover:bg-white/10 border border-white/10 text-text-main text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 shrink-0"
              title="Quick Sync with Neon PostgreSQL"
              aria-label="Sync Database"
            >
              <RefreshCw className={`w-4 h-4 sm:w-3.5 sm:h-3.5 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Refresh</span>
            </button>
          </div>
        </header>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* 3. NESTED ROUTE VIEW CONTAINER                              */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <main className="flex-1 min-h-0 overflow-hidden relative">
          <Outlet />
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
                  <p className="text-xs text-text-muted">Placed: {selectedOrder.orderTime || selectedOrder.created_at || 'Today'}</p>
                </div>
              </div>
              <button
                type="button"
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

            {selectedOrder.paymentProofUrl && selectedOrder.paymentStatus === 'payment_review' && (
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-400" /> Payment Verification
                </h4>
                <p className="text-xs text-blue-200 mb-3">
                  The customer has uploaded a payment screenshot. Please verify the amount ({selectedOrder.totalRWF ? Number(selectedOrder.totalRWF).toLocaleString() : ''} RWF) was received via {selectedOrder.paymentMethod}.
                </p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setProofModalUrl(selectedOrder.id)}
                    className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-300 text-xs font-bold hover:bg-blue-500/30 border border-blue-500/40"
                  >
                    See Proof
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const { setPaymentStatus } = await import('../../services/apiService');
                        const updated = await setPaymentStatus(selectedOrder.id, 'paid');
                        if (onUpdateStatus) onUpdateStatus(selectedOrder.id, selectedOrder.status);
                        setSelectedOrder(updated);
                      } catch (e) {
                        alert(e.message || 'Error updating payment');
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/30 border border-emerald-500/40"
                  >
                    Accept Payment
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const { setPaymentStatus } = await import('../../services/apiService');
                        const updated = await setPaymentStatus(selectedOrder.id, 'failed');
                        if (onUpdateStatus) onUpdateStatus(selectedOrder.id, selectedOrder.status);
                        setSelectedOrder(updated);
                      } catch (e) {
                        alert(e.message || 'Error updating payment');
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/30 border border-red-500/40"
                  >
                    Decline Payment
                  </button>
                </div>
              </div>
            )}

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
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="w-full sm:w-auto min-h-11 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center"
              >
                Close
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
                type="button"
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
                    New PIN
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
                      <span>Assigning...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>Assign Rider</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proof Image Viewer Modal */}
      {proofModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setProofModalUrl(null)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setProofModalUrl(null)}
              className="absolute -top-12 right-0 p-2 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <img 
              src={`/api/orders/${proofModalUrl}/payment-proof/file?token=${session.getToken()}`} 
              alt="Payment Proof" 
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      {/* Walk-in Order Modal */}
      <AddWalkInModal
        isOpen={isWalkInOpen}
        onClose={() => setIsWalkInOpen(false)}
        meals={meals}
        onOrderCreated={handleWalkInCreated}
        isSubmitting={isSubmittingWalkIn}
      />
    </div>
  );
}

export default function KitchenLayout(props) {
  return (
    <KitchenProvider {...props}>
      <KitchenShell />
    </KitchenProvider>
  );
}
