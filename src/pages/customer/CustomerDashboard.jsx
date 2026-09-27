import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard, ShoppingBag, Clock, MapPin, Radio, History,
  Settings, CreditCard, ChevronRight, ChevronLeft, RefreshCw,
  FileText, Shield, DollarSign, Award, Flame, Navigation,
  ChefHat, Bike, CheckCircle2, AlertCircle, Plus, Trash2,
  Search, Menu, X, Home, Smartphone, Check, ArrowRight,
  ExternalLink, Phone, Mail, User, Sparkles, Filter, Bell
} from 'lucide-react';
import ReceiptModal from '../../components/customer/ReceiptModal';

export default function CustomerDashboard({
  user,
  orders = [],
  cart = [],
  onSelectOrder,
  onOpenProfile,
  onOpenAuth,
  onExploreMenu,
  onAddToCart,
  onOpenCart,
  onUpdateUser,
  onSwitchRole,
  onNavigate
}) {
  // Navigation Tabs: 'overview' | 'tracking' | 'history' | 'profile'
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [toastMsg, setToastMsg] = useState('');

  // Ticking Clock (every second)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  // Metrics calculation
  const totalOrders = orders.length;
  const totalSpent = useMemo(() => {
    return orders.reduce((acc, o) => acc + (Number(o.totalRWF) || 0), 0);
  }, [orders]);

  const activeOrders = useMemo(() => {
    return orders.filter(
      (o) => o.status !== 'delivered' && o.status !== 'cancelled'
    );
  }, [orders]);

  // History State & Filtering
  const [historyFilter, setHistoryFilter] = useState('all');
  const [historySearch, setHistorySearch] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  // Profile & Saved Addresses State
  const [profileName, setProfileName] = useState(user?.name || 'Lewis');
  const [profileEmail, setProfileEmail] = useState(user?.email || 'lewis@hotpot.rw');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '+250 788 000 001');
  const [preferredPayment, setPreferredPayment] = useState(() => {
    return localStorage.getItem('hotpot_preferred_payment') || 'momo';
  });

  const [savedAddresses, setSavedAddresses] = useState(() => {
    try {
      const saved = localStorage.getItem('hotpot_saved_addresses');
      return saved ? JSON.parse(saved) : [
        { id: 'addr-1', label: 'Home', address: user?.address || 'KG 9 Ave, Nyarutarama, Kigali', isDefault: true },
        { id: 'addr-2', label: 'Office', address: 'KG 563 St, Kacyiru (Near Ministry)', isDefault: false }
      ];
    } catch {
      return [
        { id: 'addr-1', label: 'Home', address: user?.address || 'KG 9 Ave, Nyarutarama, Kigali', isDefault: true }
      ];
    }
  });

  const [newAddrLabel, setNewAddrLabel] = useState('Home');
  const [newAddrText, setNewAddrText] = useState('');
  const [isAddingAddr, setIsAddingAddr] = useState(false);
  const [smsAlerts, setSmsAlerts] = useState(true);

  useEffect(() => {
    if (user) {
      if (user.name) setProfileName(user.name);
      if (user.email) setProfileEmail(user.email);
      if (user.phone) setProfilePhone(user.phone);
    }
  }, [user]);

  const activeAddress = useMemo(() => {
    const defaultAddr = savedAddresses.find(a => a.isDefault);
    return defaultAddr ? defaultAddr.address : (user?.address || 'KG 9 Ave, Nyarutarama, Kigali');
  }, [savedAddresses, user]);

  // Status Helpers
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

  const getStepProgressIndex = (status) => {
    const s = status?.toLowerCase();
    if (s === 'delivered') return 3;
    if (s === 'delivery' || s === 'delivering') return 2;
    if (s === 'preparing' || s === 'cooking' || s === 'ready') return 1;
    return 0; // Placed
  };

  // 1-Click Reorder Action
  const handleReorder = (order, event) => {
    if (event) event.stopPropagation();
    if (!order || !order.items || order.items.length === 0) return;

    order.items.forEach((item) => {
      if (onAddToCart) {
        onAddToCart({
          meal: {
            id: item.id || item.mealId || Math.random().toString(),
            name: item.name,
            price: item.price || 0,
            image: item.image || '/assets/1152x1152_S7.png',
            fallbackImage: '/assets/1152x1152_S7.png'
          },
          quantity: item.qty || item.quantity || 1,
          selectedSpice: item.selectedSpice || null,
          selectedBroth: item.selectedBroth || null
        });
      }
    });

    triggerToast(`🛒 Added items from Order #${order.id} to cart!`);
    if (onOpenCart) {
      setTimeout(() => onOpenCart(), 200);
    }
  };

  // Address Handlers
  const handleAddAddress = (e) => {
    e.preventDefault();
    if (!newAddrText.trim()) return;

    const newAddr = {
      id: `addr-${Date.now()}`,
      label: newAddrLabel,
      address: newAddrText.trim(),
      isDefault: savedAddresses.length === 0
    };

    const updated = [...savedAddresses, newAddr];
    setSavedAddresses(updated);
    localStorage.setItem('hotpot_saved_addresses', JSON.stringify(updated));
    setNewAddrText('');
    setIsAddingAddr(false);
    triggerToast('✅ New delivery address saved!');
  };

  const handleDeleteAddress = (id) => {
    const updated = savedAddresses.filter((a) => a.id !== id);
    setSavedAddresses(updated);
    localStorage.setItem('hotpot_saved_addresses', JSON.stringify(updated));
    triggerToast('🗑️ Address removed.');
  };

  const handleSetDefaultAddress = (id) => {
    const updated = savedAddresses.map((a) => ({
      ...a,
      isDefault: a.id === id
    }));
    setSavedAddresses(updated);
    localStorage.setItem('hotpot_saved_addresses', JSON.stringify(updated));

    const defaultOne = updated.find((a) => a.id === id);
    if (defaultOne && onUpdateUser && user) {
      onUpdateUser({ ...user, address: defaultOne.address });
    }
    triggerToast('📍 Default delivery address updated!');
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (onUpdateUser && user) {
      onUpdateUser({
        ...user,
        name: profileName,
        email: profileEmail,
        phone: profilePhone
      });
    }
    localStorage.setItem('hotpot_preferred_payment', preferredPayment);
    triggerToast('💾 Profile & preferences saved successfully!');
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    return orders.filter((order) => {
      const statusMatch =
        historyFilter === 'all'
          ? true
          : historyFilter === 'in_progress'
          ? order.status !== 'delivered' && order.status !== 'cancelled'
          : order.status === historyFilter;

      const q = historySearch.toLowerCase().trim();
      const searchMatch =
        !q ||
        (order.id && String(order.id).toLowerCase().includes(q)) ||
        (order.address && order.address.toLowerCase().includes(q)) ||
        (order.items && order.items.some((i) => i.name && i.name.toLowerCase().includes(q)));

      return statusMatch && searchMatch;
    });
  }, [orders, historyFilter, historySearch]);

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / ITEMS_PER_PAGE));
  const paginatedOrders = filteredHistory.slice(
    (historyPage - 1) * ITEMS_PER_PAGE,
    historyPage * ITEMS_PER_PAGE
  );

  const cartTotalItems = useMemo(() => {
    return (cart || []).reduce((sum, it) => sum + (Number(it.quantity || it.qty) || 1), 0);
  }, [cart]);

  // Auth Guard View if unauthenticated
  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0F1117] text-slate-100 p-4">
        <div className="w-full max-w-md p-8 rounded-3xl bg-[#14171F] border border-slate-800 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-400 flex items-center justify-center mx-auto shadow-lg shadow-orange-500/10">
            <Shield className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-400">
              HotPot Kigali Client Portal
            </span>
            <h1 className="text-2xl font-black text-white">Customer Dashboard</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Please sign in to access live kitchen order tracking, order history, and saved delivery addresses.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-3">
            <button
              onClick={onOpenAuth || onOpenProfile}
              className="w-full min-h-11 py-3 px-6 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs shadow-lg shadow-orange-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <User className="w-4 h-4" />
              <span>Sign In / Register</span>
            </button>
            <button
              onClick={onExploreMenu}
              className="w-full min-h-11 py-3 px-6 rounded-xl bg-[#1A1D24] hover:bg-white/10 border border-slate-700/60 text-slate-300 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4 text-orange-400" />
              <span>Return to Store Menu</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          2. COLLAPSIBLE LEFT SIDEBAR (KDS & Admin Style)
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
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0 text-white">
              <Flame className="w-5 h-5 fill-current" />
            </div>

            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <span className="text-xs font-black tracking-wider text-white uppercase block truncate">
                  HotPot Kigali
                </span>
                <span className="text-[10px] text-orange-400 font-bold block truncate">
                  Customer Portal
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Prominent Home button (navigates to /store or main menu) */}
            <button
              onClick={() => {
                setIsMobileDrawerOpen(false);
                if (onExploreMenu) onExploreMenu();
              }}
              className="p-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 hover:text-white transition-all min-h-9 min-w-9 flex items-center justify-center shadow-xs"
              title="Return to Customer Store Menu"
              aria-label="Return to Store Menu"
            >
              <Home className="w-4 h-4" />
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsMobileDrawerOpen(false)}
              className="md:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all min-h-9 min-w-9 flex items-center justify-center"
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

        {/* Scrollable Nav Links Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-3 space-y-4">
          {/* Section: Main Navigation */}
          <div className="space-y-1.5">
            {!isSidebarCollapsed && (
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2.5 mb-1.5 block">
                Customer Views
              </span>
            )}

            {[
              {
                id: 'overview',
                label: 'Dashboard Overview',
                icon: LayoutDashboard,
                desc: 'KPIs & recent orders'
              },
              {
                id: 'tracking',
                label: 'Live Orders & GPS Tracking',
                icon: Radio,
                badge: activeOrders.length,
                isPulse: activeOrders.length > 0
              },
              {
                id: 'history',
                label: 'Order History & Reorder',
                icon: History,
                badge: totalOrders
              },
              {
                id: 'profile',
                label: 'Profile & Address Book',
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all min-h-11 focus:outline-none focus:ring-1 focus:ring-orange-400/40 ${
                    isActive
                      ? 'bg-linear-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20 scale-[1.01]'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  } ${isSidebarCollapsed ? 'md:justify-center md:px-0' : ''}`}
                  title={tab.label}
                >
                  <div className="relative shrink-0 flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                    {tab.isPulse && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
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
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
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

          {/* Section: Quick Menu & Cart Tools */}
          <div className="space-y-2 pt-3 border-t border-slate-800">
            {!isSidebarCollapsed && (
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2.5 block">
                Quick Actions
              </span>
            )}

            <button
              onClick={() => {
                setIsMobileDrawerOpen(false);
                if (onExploreMenu) onExploreMenu();
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-300 text-xs font-bold transition-all min-h-11 ${
                isSidebarCollapsed ? 'md:justify-center md:px-0' : ''
              }`}
              title="Browse Full Menu"
            >
              <Flame className="w-4 h-4 text-orange-400 shrink-0" />
              <span className={`${isSidebarCollapsed ? 'md:hidden' : ''}`}>Explore Food Menu</span>
            </button>

            {onOpenCart && (
              <button
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  onOpenCart();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#1A1D24] hover:bg-white/10 border border-slate-700/60 text-slate-300 hover:text-white text-xs font-bold transition-all min-h-11 ${
                  isSidebarCollapsed ? 'md:justify-center md:px-0' : ''
                }`}
                title="View My Cart"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ShoppingBag className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className={`truncate ${isSidebarCollapsed ? 'md:hidden' : ''}`}>My Food Cart</span>
                </div>
                {cartTotalItems > 0 && (
                  <span className={`px-2 py-0.5 rounded-full bg-orange-500 text-white font-mono text-[10px] font-bold ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
                    {cartTotalItems}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Sidebar Footer: Customer Profile Badge */}
        <div className="p-3 border-t border-slate-800 bg-[#10131A] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-orange-500 to-amber-600 flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-sm border border-white/10">
              {profileName ? profileName[0].toUpperCase() : 'L'}
            </div>

            {!isSidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">
                  {profileName || 'HotPot Customer'}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="px-1.5 py-0.2 rounded-md bg-amber-500/15 border border-amber-500/30 text-[10px] font-bold text-amber-400 flex items-center gap-0.5 truncate">
                    <Award className="w-3 h-3 shrink-0" /> Gold VIP Client
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
              className="md:hidden p-2.5 rounded-xl bg-[#1A1D24] border border-slate-800 text-slate-300 hover:text-white min-h-11 min-w-11 flex items-center justify-center"
              aria-label="Open Navigation"
            >
              <Menu className="w-5 h-5 text-orange-400" />
            </button>

            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-white truncate">
                  Welcome back, {profileName || 'Lewis'}!
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
                <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span className="truncate max-w-50 sm:max-w-xs">{activeAddress}</span>
              </div>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Active Orders Status Counter Pill */}
            {activeOrders.length > 0 && (
              <button
                onClick={() => setActiveTab('tracking')}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 text-xs font-bold flex items-center gap-1.5 transition-all min-h-9"
              >
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
                <span className="hidden xs:inline">{activeOrders.length} in Prep/Transit</span>
                <span className="xs:hidden">{activeOrders.length} Live</span>
              </button>
            )}

            {/* Gold VIP Client Pill Badge */}
            <div className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
              <Award className="w-3.5 h-3.5" />
              <span>Gold VIP Client</span>
            </div>

            {/* Live Digital Clock */}
            <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs text-slate-300 bg-[#1A1D24] border border-slate-800 px-3 py-1.5 rounded-xl shadow-xs">
              <Clock className="w-3.5 h-3.5 text-orange-400" />
              <span>
                {currentTime.toLocaleTimeString('en-US', { hour12: false })} <span className="text-[10px] text-slate-500">CAT</span>
              </span>
            </div>
          </div>
        </header>

        {/* Smooth Independent Section Scrolling Content Canvas */}
        <main className="flex-1 overflow-y-auto no-scrollbar scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-4 sm:p-6 lg:p-8 space-y-6 bg-[#0F1117]">
          
          {/* Cooker Confirmed Ready Special Alert Banner */}
          {orders.some((o) => o.status === 'ready') && (
            <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-r from-emerald-950/90 via-emerald-900/60 to-[#14171F] border border-emerald-500/50 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-bounce-short">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-600/30">
                  <ChefHat className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-white">Cooker Confirmed: Meal is Ready! 🍲</h4>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold animate-pulse">
                      Ready for Dispatch
                    </span>
                  </div>
                  <p className="text-xs text-emerald-200/80 mt-0.5">
                    Your dish has been freshly simmered, packed, and is ready for rider courier pickup at HotPot Kigali.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  const readyOrder = orders.find((o) => o.status === 'ready');
                  if (readyOrder && onSelectOrder) onSelectOrder(readyOrder);
                  else setActiveTab('tracking');
                }}
                className="w-full sm:w-auto min-h-11 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
              >
                <Navigation className="w-4 h-4" />
                <span>Track Live on Map</span>
              </button>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              TAB 1: DASHBOARD OVERVIEW
          ════════════════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 4. KPI SUMMARY CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                {/* 1. Orders Made */}
                <div className="bg-[#1A1D24] border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all shadow-lg flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Orders Made
                    </span>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 border border-blue-500/20 text-blue-400">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
                      {totalOrders}
                    </div>
                    <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active HotPot Account
                    </div>
                  </div>
                </div>

                {/* 2. Total Spent in RWF */}
                <div className="bg-[#1A1D24] border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all shadow-lg flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Total Spent in RWF
                    </span>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold text-white font-mono truncate">
                      {totalSpent.toLocaleString()} <span className="text-sm text-slate-400 font-sans font-normal">RWF</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Kigali Express Dining
                    </div>
                  </div>
                </div>

                {/* 3. Live Tracking */}
                <div
                  onClick={() => setActiveTab('tracking')}
                  className={`bg-[#1A1D24] border rounded-2xl p-5 hover:border-orange-500/50 transition-all shadow-lg flex flex-col justify-between space-y-3 cursor-pointer ${
                    activeOrders.length > 0 ? 'border-orange-500/40 bg-orange-500/5' : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Live Tracking
                    </span>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-500/10 border border-orange-500/20 text-orange-400">
                      <Radio className={`w-5 h-5 ${activeOrders.length > 0 ? 'animate-pulse' : ''}`} />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold font-mono text-orange-400">
                      {activeOrders.length} <span className="text-sm font-sans font-normal text-slate-300">Active</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
                      <span>{activeOrders.length > 0 ? 'Orders in kitchen/transit' : 'No active orders'}</span>
                      <ChevronRight className="w-4 h-4 text-orange-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. LIVE TRACKING CARDS (Active Orders) */}
              {activeOrders.length > 0 && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500" />
                      </span>
                      <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                        Active Orders in Kitchen & Transit
                      </h2>
                    </div>
                    <button
                      onClick={() => setActiveTab('tracking')}
                      className="text-xs text-orange-400 font-bold hover:underline flex items-center gap-1"
                    >
                      View Live Steppers <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeOrders.map((order) => {
                      const stepIdx = getStepProgressIndex(order.status);
                      const isReadyOrPrep = order.status === 'preparing' || order.status === 'cooking' || order.status === 'ready';
                      const isOnWay = order.status === 'delivery' || order.status === 'delivering';
                      const isDelivered = order.status === 'delivered';

                      // Glowing progress bar style
                      const barGlowClass = isDelivered
                        ? 'from-emerald-500 to-green-500 shadow-emerald-500/50'
                        : isOnWay
                        ? 'from-blue-500 to-cyan-500 shadow-blue-500/50'
                        : 'from-amber-500 to-orange-500 shadow-orange-500/50';

                      return (
                        <div
                          key={order.id}
                          className="bg-[#1A1D24] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 shadow-xl transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-mono font-bold text-base text-white">
                                #{order.id}
                              </span>
                              <span className="text-xs text-slate-400 ml-2">
                                • {order.orderTime || 'Today'}
                              </span>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[11px] uppercase tracking-wider border ${getStatusBadge(order.status)}`}>
                              {order.status}
                            </span>
                          </div>

                          {/* 4-Step Horizontal Order Stepper with Vibrant Glowing Bar */}
                          <div className="space-y-2 py-1">
                            <div className="relative flex items-center justify-between">
                              {/* Background Bar */}
                              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 bg-slate-800 rounded-full z-0" />
                              
                              {/* Glowing Active Bar */}
                              <div
                                className={`absolute left-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-linear-to-r shadow-md transition-all duration-500 z-0 ${barGlowClass}`}
                                style={{ width: `${(stepIdx / 3) * 100}%` }}
                              />

                              {/* 4 Nodes: Placed -> Kitchen -> On Way -> Delivered */}
                              {[
                                { label: 'Placed', icon: Clock },
                                { label: 'Kitchen', icon: ChefHat },
                                { label: 'On Way', icon: Bike },
                                { label: 'Delivered', icon: Award }
                              ].map((step, idx) => {
                                const Icon = step.icon;
                                const isPassed = idx <= stepIdx;
                                const isCurrent = idx === stepIdx;
                                return (
                                  <div key={step.label} className="relative z-10 flex flex-col items-center">
                                    <div
                                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                                        isCurrent
                                          ? 'bg-orange-500 text-white ring-4 ring-orange-500/20 shadow-lg shadow-orange-500/40'
                                          : isPassed
                                          ? 'bg-slate-700 text-white'
                                          : 'bg-[#14171F] text-slate-600 border border-slate-800'
                                      }`}
                                    >
                                      <Icon className="w-3.5 h-3.5" />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="flex justify-between text-[11px] font-bold text-slate-400">
                              <span className={stepIdx >= 0 ? 'text-white' : ''}>Placed</span>
                              <span className={stepIdx >= 1 ? 'text-amber-400 font-bold' : ''}>Kitchen</span>
                              <span className={stepIdx >= 2 ? 'text-blue-400 font-bold' : ''}>On Way</span>
                              <span className={stepIdx >= 3 ? 'text-emerald-400 font-bold' : ''}>Delivered</span>
                            </div>
                          </div>

                          {/* Items Summary */}
                          <div className="text-xs text-slate-300 space-y-1 pt-2 border-t border-slate-800">
                            {(order.items || []).slice(0, 2).map((item, iIdx) => (
                              <div key={iIdx} className="flex justify-between">
                                <span className="text-white truncate max-w-[70%]">
                                  {item.qty || item.quantity || 1}x {item.name}
                                </span>
                                <span className="font-mono text-slate-400">
                                  {((item.price || 0) * (item.qty || item.quantity || 1)).toLocaleString()} RWF
                                </span>
                              </div>
                            ))}
                            {(order.items || []).length > 2 && (
                              <span className="text-[11px] text-orange-400 block font-semibold">
                                + {(order.items || []).length - 2} more items
                              </span>
                            )}
                          </div>

                          {/* Courier Assignment Strip for Client */}
                          {(order.riderName || order.assigned_rider_id) && (
                            <div className="p-2.5 rounded-xl bg-black/40 border border-amber-500/30 flex items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                                  🛵
                                </div>
                                <div className="min-w-0">
                                  <span className="font-bold text-white block truncate">{order.riderName || 'Assigned Courier'}</span>
                                  <span className="text-[10px] text-slate-400 font-mono block truncate">
                                    {order.riderPhone || ''} {order.riderPlate ? `• ${order.riderPlate}` : ''}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {order.verification_pin && (
                                  <span className="px-2 py-0.5 rounded-md bg-black/60 border border-amber-500/40 text-[10px] font-mono font-bold text-amber-300">
                                    PIN: {order.verification_pin}
                                  </span>
                                )}
                                <a
                                  href={`tel:${order.riderPhone || '+250788123456'}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-xs flex items-center justify-center transition-all"
                                  title="Call Courier"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>
                          )}

                          {/* Action Button: Track Live Map */}
                          <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
                            <span className="text-xs text-slate-400 flex items-center gap-1.5 truncate max-w-[50%]">
                              <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                              <span className="truncate">{order.address || 'Kigali'}</span>
                            </span>

                            <button
                              onClick={() => {
                                if (onSelectOrder) onSelectOrder(order);
                                else setActiveTab('tracking');
                              }}
                              className="min-h-11 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition-all active:scale-95"
                            >
                              <Navigation className="w-4 h-4" />
                              <span>Track Live Map</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. RECENT ACTIVITY & DELIVERY ADDRESS GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Orders Overview (2 Cols) */}
                <div className="lg:col-span-2 bg-[#1A1D24] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                      <History className="w-4 h-4 text-orange-400" /> Recent Activity
                    </h3>
                    <button
                      onClick={() => setActiveTab('history')}
                      className="text-xs text-orange-400 font-bold hover:underline"
                    >
                      View All History →
                    </button>
                  </div>

                  {orders.length === 0 ? (
                    <div className="py-10 text-center space-y-3">
                      <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto" />
                      <p className="text-xs text-slate-400">No orders placed yet.</p>
                      <button
                        onClick={onExploreMenu}
                        className="min-h-11 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs"
                      >
                        Browse HotPot Menu
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.slice(0, 4).map((order) => (
                        <div
                          key={order.id}
                          className="p-3.5 rounded-xl bg-[#14171F] border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-all"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-white">#{order.id}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(order.status)}`}>
                                {order.status}
                              </span>
                              <span className="text-[11px] text-slate-500">• {order.orderTime || 'Recent'}</span>
                            </div>
                            <p className="text-xs text-slate-300 truncate max-w-sm">
                              {(order.items || []).map((i) => `${i.qty || i.quantity || 1}x ${i.name}`).join(', ')}
                            </p>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                            <span className="font-mono font-bold text-xs text-orange-400">
                              {(Number(order.totalRWF) || 0).toLocaleString()} RWF
                            </span>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => handleReorder(order, e)}
                                className="min-h-11 px-3 py-2 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-orange-500/20 active:scale-95 transition-all"
                                title="Reorder dishes"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Reorder</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setSelectedReceipt(order)}
                                className="min-h-11 px-3 py-2 rounded-xl bg-[#1F242D] hover:bg-white/10 border border-slate-700/60 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95"
                                title="View Receipt"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Receipt</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Default Delivery Address Card (1 Col) */}
                <div className="space-y-4">
                  <div className="bg-[#1A1D24] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-orange-400" /> Default Delivery Address
                      </h4>
                      <button
                        onClick={() => setActiveTab('profile')}
                        className="text-xs text-orange-400 hover:underline font-bold"
                      >
                        Manage
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-[#14171F] border border-slate-800 space-y-2">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>{savedAddresses.find((a) => a.isDefault)?.label || 'Home'}</span>
                        <span className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                          DEFAULT
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {activeAddress}
                      </p>
                    </div>

                    <button
                      onClick={() => setActiveTab('profile')}
                      className="w-full min-h-11 py-2.5 px-4 rounded-xl bg-[#1F242D] hover:bg-white/10 border border-slate-700/60 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4 text-orange-400" />
                      <span>Add or Switch Address</span>
                    </button>
                  </div>

                  {/* Security Badge Card */}
                  <div className="bg-[#1A1D24] border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Verified HotPot Customer</div>
                      <div className="text-[11px] text-slate-400">256-Bit SSL Encrypted Account</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              TAB 2: LIVE ORDERS & GPS TRACKING
          ════════════════════════════════════════════════════════════════ */}
          {activeTab === 'tracking' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                    <Radio className="w-5 h-5 text-orange-400 animate-pulse" />
                    Live Orders & GPS Tracking
                  </h2>
                  <p className="text-xs text-slate-400">
                    Real-time status updates from head cook simmering to moto courier arrival.
                  </p>
                </div>
                <button
                  onClick={onExploreMenu}
                  className="min-h-11 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-orange-500/20 self-start sm:self-auto"
                >
                  <Flame className="w-4 h-4" />
                  <span>Order More Dishes</span>
                </button>
              </div>

              {activeOrders.length === 0 ? (
                <div className="bg-[#1A1D24] border border-slate-800 rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-xl">
                  <div className="w-16 h-16 rounded-2xl bg-[#14171F] border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                    <Radio className="w-8 h-8" />
                  </div>
                  <div className="space-y-1 max-w-md mx-auto">
                    <h3 className="text-base font-bold text-white">No active deliveries right now</h3>
                    <p className="text-xs text-slate-400">
                      All previous orders have been completed and delivered! Explore our kitchen menu to order fresh meals.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 pt-2">
                    <button
                      onClick={onExploreMenu}
                      className="min-h-11 px-5 py-2.5 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold shadow-lg shadow-orange-500/20"
                    >
                      Browse HotPot Menu
                    </button>
                    <button
                      onClick={() => setActiveTab('history')}
                      className="min-h-11 px-5 py-2.5 rounded-xl bg-[#1F242D] hover:bg-white/10 border border-slate-700/60 text-slate-300 hover:text-white text-xs font-bold"
                    >
                      View Past Orders
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {activeOrders.map((order) => {
                    const stepIdx = getStepProgressIndex(order.status);
                    const isDelivered = order.status === 'delivered';
                    const isOnWay = order.status === 'delivery' || order.status === 'delivering';

                    const barGlowClass = isDelivered
                      ? 'from-emerald-500 to-green-500 shadow-emerald-500/50'
                      : isOnWay
                      ? 'from-blue-500 to-cyan-500 shadow-blue-500/50'
                      : 'from-amber-500 to-orange-500 shadow-orange-500/50';

                    return (
                      <div
                        key={order.id}
                        className="bg-[#1A1D24] border border-slate-800 rounded-2xl p-5 sm:p-7 space-y-6 shadow-2xl"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                          <div>
                            <div className="flex items-center gap-2.5">
                              <span className="text-base sm:text-lg font-black font-mono text-white">
                                Order #{order.id}
                              </span>
                              <span className={`px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusBadge(order.status)}`}>
                                {order.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              Placed at: <span className="text-white font-medium">{order.orderTime || 'Just now'}</span> • Estimated Delivery: <span className="text-amber-400 font-bold">20-30 min</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onSelectOrder && onSelectOrder(order)}
                              className="min-h-11 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-orange-500/20 transition-all"
                            >
                              <Navigation className="w-4 h-4" />
                              <span>Open Live GPS Map</span>
                            </button>
                          </div>
                        </div>

                        {/* Enhanced 4-Step Stepper */}
                        <div className="space-y-3 py-2">
                          <div className="relative flex items-center justify-between">
                            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 bg-slate-800 rounded-full z-0" />
                            <div
                              className={`absolute left-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-linear-to-r shadow-md transition-all duration-500 z-0 ${barGlowClass}`}
                              style={{ width: `${(stepIdx / 3) * 100}%` }}
                            />

                            {[
                              { label: 'Placed', desc: 'Order received', icon: Clock },
                              { label: 'Kitchen Prep', desc: 'Cooker simmering dish', icon: ChefHat },
                              { label: 'Out on Road', desc: 'Moto courier transit', icon: Bike },
                              { label: 'Delivered', desc: 'Handed to you', icon: Award }
                            ].map((s, idx) => {
                              const Icon = s.icon;
                              const isPassed = idx <= stepIdx;
                              const isCurrent = idx === stepIdx;
                              return (
                                <div key={s.label} className="relative z-10 flex flex-col items-center">
                                  <div
                                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                                      isCurrent
                                        ? 'bg-orange-500 text-white ring-4 ring-orange-500/20 shadow-lg shadow-orange-500/40'
                                        : isPassed
                                        ? 'bg-slate-700 text-white'
                                        : 'bg-[#14171F] text-slate-600 border border-slate-800'
                                    }`}
                                  >
                                    <Icon className="w-4 h-4" />
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex justify-between text-[11px] font-bold text-slate-400">
                            <span className={stepIdx >= 0 ? 'text-white' : ''}>1. Order Placed</span>
                            <span className={stepIdx >= 1 ? 'text-amber-400' : ''}>2. Kitchen Simmering</span>
                            <span className={stepIdx >= 2 ? 'text-blue-400' : ''}>3. On the Road</span>
                            <span className={stepIdx >= 3 ? 'text-emerald-400' : ''}>4. Delivered</span>
                          </div>
                        </div>

                        {/* Order Items & Destination Breakdown */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                          <div className="space-y-2 p-3.5 rounded-xl bg-[#14171F] border border-slate-800">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                              Items in this Order
                            </span>
                            <div className="space-y-1.5">
                              {(order.items || []).map((item, i) => (
                                <div key={i} className="flex justify-between text-xs">
                                  <span className="text-white">
                                    {item.qty || item.quantity || 1}x {item.name}
                                  </span>
                                  <span className="font-mono text-orange-400 font-bold">
                                    {((item.price || 0) * (item.qty || item.quantity || 1)).toLocaleString()} RWF
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className="pt-2 border-t border-slate-800 flex justify-between text-xs font-bold">
                              <span className="text-white">Total Amount</span>
                              <span className="text-orange-400 font-mono">
                                {(Number(order.totalRWF) || 0).toLocaleString()} RWF
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2 p-3.5 rounded-xl bg-[#14171F] border border-slate-800 flex flex-col justify-between">
                            <div>
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                Delivery Address
                              </span>
                              <p className="text-xs text-white font-medium mt-1">
                                {order.address || activeAddress}
                              </p>
                            </div>
                            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                              <span className="text-[11px] text-slate-400">Rider Contact:</span>
                              <span className="text-xs font-bold text-emerald-400">+250 788 000 001</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              TAB 3: ORDER HISTORY & REORDER
          ════════════════════════════════════════════════════════════════ */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-orange-400" />
                    Order History & Reorder
                  </h2>
                  <p className="text-xs text-slate-400">
                    Review past culinary orders, generate VAT receipts, and reorder with 1-click.
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: 'all', label: 'All Orders' },
                    { id: 'in_progress', label: 'In Progress' },
                    { id: 'delivered', label: 'Delivered' },
                    { id: 'cancelled', label: 'Cancelled' }
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setHistoryFilter(f.id);
                        setHistoryPage(1);
                      }}
                      className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        historyFilter === f.id
                          ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                          : 'bg-[#1A1D24] border border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                    setHistoryPage(1);
                  }}
                  placeholder="Search orders by ID, dish name, or address..."
                  className="w-full bg-[#1A1D24] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-all min-h-[44px]"
                />
              </div>

              {paginatedOrders.length === 0 ? (
                <div className="bg-[#1A1D24] border border-slate-800 rounded-2xl p-10 text-center space-y-3">
                  <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">No matching orders found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paginatedOrders.map((order) => (
                    <div
                      key={order.id}
                      className="p-4 sm:p-5 rounded-2xl bg-[#1A1D24] border border-slate-800 hover:border-slate-700 transition-all shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-sm text-white">#{order.id}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${getStatusBadge(order.status)}`}>
                            {order.status}
                          </span>
                          <span className="text-xs text-slate-500">• {order.orderTime || 'Recent'}</span>
                        </div>

                        <p className="text-xs text-slate-300">
                          {(order.items || []).map((i) => `${i.qty || i.quantity || 1}x ${i.name}`).join(', ')}
                        </p>

                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                          <span className="truncate">{order.address || activeAddress}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                        <span className="font-mono font-bold text-sm text-orange-400">
                          {(Number(order.totalRWF) || 0).toLocaleString()} RWF
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => handleReorder(order, e)}
                            className="min-h-11 px-4 py-2 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/20 active:scale-95 transition-all"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Reorder</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedReceipt(order)}
                            className="min-h-11 px-3.5 py-2 rounded-xl bg-[#1F242D] hover:bg-white/10 border border-slate-700/60 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Receipt</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <span className="text-xs text-slate-400">
                    Page <span className="text-white font-bold">{historyPage}</span> of <span className="text-white font-bold">{totalPages}</span>
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={historyPage === 1}
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      className="min-h-9.5 px-3 py-1.5 rounded-xl bg-[#1A1D24] border border-slate-800 text-xs font-bold disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      disabled={historyPage === totalPages}
                      onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
                      className="min-h-9.5 px-3 py-1.5 rounded-xl bg-[#1A1D24] border border-slate-800 text-xs font-bold disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              TAB 4: PROFILE & ADDRESS BOOK
          ════════════════════════════════════════════════════════════════ */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-orange-400" />
                  Profile & Address Book
                </h2>
                <p className="text-xs text-slate-400">
                  Manage your client profile, default Kigali delivery addresses, and payment preferences.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Edit Form (2 Cols) */}
                <div className="lg:col-span-2 bg-[#1A1D24] border border-slate-800 rounded-2xl p-5 sm:p-7 space-y-6 shadow-xl">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2 pb-3 border-b border-slate-800">
                    <User className="w-4 h-4 text-orange-400" /> Personal Account Details
                  </h3>

                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="w-full bg-[#14171F] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 min-h-11"
                          placeholder="Your Name"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Phone Number (MoMo Enabled)
                        </label>
                        <input
                          type="text"
                          value={profilePhone}
                          onChange={(e) => setProfilePhone(e.target.value)}
                          className="w-full bg-[#14171F] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 min-h-11"
                          placeholder="0788000001"
                        />
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                          className="w-full bg-[#14171F] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 min-h-11"
                          placeholder="client@hotpot.rw"
                        />
                      </div>
                    </div>

                    {/* Preferred Payment Method */}
                    <div className="space-y-2.5 pt-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                        Preferred Default Payment Method
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {[
                          { id: 'momo', label: 'MTN MoMo', icon: Smartphone, color: 'text-amber-400' },
                          { id: 'airtel', label: 'Airtel Money', icon: Smartphone, color: 'text-red-400' },
                          { id: 'card', label: 'Visa / MC', icon: CreditCard, color: 'text-blue-400' },
                          { id: 'cash', label: 'Cash on Delivery', icon: DollarSign, color: 'text-emerald-400' }
                        ].map((p) => {
                          const Icon = p.icon;
                          const isSelected = preferredPayment === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setPreferredPayment(p.id)}
                              className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2 min-h-11 ${
                                isSelected
                                  ? 'bg-orange-500/20 border-orange-500 text-white font-bold shadow-xs'
                                  : 'bg-[#14171F] border-slate-800 text-slate-400 hover:border-slate-700'
                              }`}
                            >
                              <Icon className={`w-4 h-4 ${p.color} shrink-0`} />
                              <span className="text-xs truncate">{p.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Notification Alerts */}
                    <div className="space-y-2 pt-2">
                      <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#14171F] border border-slate-800 cursor-pointer min-h-11">
                        <div className="space-y-0.5">
                          <span className="text-xs font-semibold text-white block">SMS Live Tracking Updates</span>
                          <span className="text-[11px] text-slate-400 block">Receive instant status updates on your phone</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={smsAlerts}
                          onChange={(e) => setSmsAlerts(e.target.checked)}
                          className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                        />
                      </label>
                    </div>

                    <div className="pt-4 border-t border-slate-800 flex justify-end">
                      <button
                        type="submit"
                        className="min-h-11 px-6 py-2.5 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs shadow-lg shadow-orange-500/20 transition-all active:scale-95"
                      >
                        Save Profile Changes
                      </button>
                    </div>
                  </form>
                </div>

                {/* Saved Kigali Delivery Addresses (1 Col) */}
                <div className="space-y-5">
                  <div className="bg-[#1A1D24] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <h3 className="font-bold text-white text-sm flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-orange-400" /> Saved Kigali Addresses
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsAddingAddr(!isAddingAddr)}
                        className="text-xs font-bold text-orange-400 flex items-center gap-1 hover:underline"
                      >
                        <Plus className="w-4 h-4" /> Add
                      </button>
                    </div>

                    {/* Add Address Form */}
                    {isAddingAddr && (
                      <form onSubmit={handleAddAddress} className="p-3.5 rounded-xl bg-[#14171F] border border-orange-500/40 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-white">Add Delivery Address</span>
                          <button
                            type="button"
                            onClick={() => setIsAddingAddr(false)}
                            className="text-slate-400 hover:text-white"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="flex gap-2">
                          {['Home', 'Office', 'Other'].map((lbl) => (
                            <button
                              key={lbl}
                              type="button"
                              onClick={() => setNewAddrLabel(lbl)}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border ${
                                newAddrLabel === lbl
                                  ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                                  : 'bg-white/5 border-slate-800 text-slate-400'
                              }`}
                            >
                              {lbl}
                            </button>
                          ))}
                        </div>

                        <input
                          type="text"
                          value={newAddrText}
                          onChange={(e) => setNewAddrText(e.target.value)}
                          placeholder="e.g. KG 178 St, Nyarutarama (Gate 12)"
                          className="w-full bg-black/40 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                        />

                        <button
                          type="submit"
                          className="w-full min-h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs"
                        >
                          Save Address
                        </button>
                      </form>
                    )}

                    {/* Address List */}
                    <div className="space-y-2.5">
                      {savedAddresses.map((addr) => (
                        <div
                          key={addr.id}
                          className={`p-3.5 rounded-xl border transition-all space-y-1.5 ${
                            addr.isDefault
                              ? 'bg-orange-500/10 border-orange-500/40 shadow-xs'
                              : 'bg-[#14171F] border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{addr.label}</span>
                              {addr.isDefault && (
                                <span className="text-[9px] bg-orange-500 text-white font-mono font-bold px-1.5 py-0.2 rounded">
                                  DEFAULT
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {!addr.isDefault && (
                                <button
                                  type="button"
                                  onClick={() => handleSetDefaultAddress(addr.id)}
                                  className="text-[11px] text-slate-400 hover:text-white underline"
                                >
                                  Set default
                                </button>
                              )}
                              {savedAddresses.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAddress(addr.id)}
                                  className="text-slate-500 hover:text-red-400 p-1 min-h-8 min-w-8 flex items-center justify-center"
                                  title="Delete address"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="text-xs text-slate-300 leading-relaxed">
                            {addr.address}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Digital Receipt Modal */}
      <ReceiptModal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        order={selectedReceipt}
      />
    </div>
  );
}
