import React, { useState, useEffect, useMemo } from 'react';
import {
  User, ShoppingBag, Clock, MapPin, Gift, Heart, TrendingUp,
  CheckCircle2, ChevronRight, FileText, Sparkles, CreditCard,
  Award, Flame, ArrowUpRight, RefreshCw, Navigation, Radio,
  History, Zap, Search, Plus, Trash2, Edit3, Shield, Smartphone,
  DollarSign, Check, AlertCircle, X, ChevronLeft, Bell, Settings,
  Compass, ChefHat, Bike, CheckCircle
} from 'lucide-react';
import ReceiptModal from '../../components/customer/ReceiptModal';

export default function CustomerDashboard({
  user,
  orders = [],
  onSelectOrder,
  onOpenReferral,
  onOpenProfile,
  onOpenAuth,
  onExploreMenu,
  onAddToCart,
  onOpenCart,
  onUpdateUser
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'tracking' | 'history' | 'profile'
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Metrics
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((acc, o) => acc + (o.totalRWF || 0), 0);
  const activeOrders = orders.filter(
    (o) => o.status !== 'delivered' && o.status !== 'cancelled'
  );
  const loyaltyPoints = user?.points || totalOrders * 120 + 450;

  // History State
  const [historyFilter, setHistoryFilter] = useState('all');
  const [historySearch, setHistorySearch] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // Profile & Preferences State
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
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
        { id: 'addr-1', label: 'Home', address: 'KG 9 Ave, Nyarutarama, Kigali', isDefault: true }
      ];
    }
  });

  const [newAddrLabel, setNewAddrLabel] = useState('Home');
  const [newAddrText, setNewAddrText] = useState('');
  const [isAddingAddr, setIsAddingAddr] = useState(false);
  const [profileSuccessToast, setProfileSuccessToast] = useState('');

  // Notifications preferences
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [promoOffers, setPromoOffers] = useState(true);

  useEffect(() => {
    if (user) {
      if (!profileName) setProfileName(user.name || '');
      if (!profileEmail) setProfileEmail(user.email || '');
      if (!profilePhone) setProfilePhone(user.phone || '');
    }
  }, [user]);

  // Status Helpers
  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40';
      case 'ready':
        return 'bg-emerald-950/90 text-emerald-300 border-emerald-400/60 font-bold animate-pulse';
      case 'delivery':
      case 'delivering':
        return 'bg-amber-950/80 text-amber-400 border-amber-500/40';
      case 'preparing':
      case 'cooking':
        return 'bg-blue-950/80 text-blue-400 border-blue-500/40';
      case 'cancelled':
        return 'bg-red-950/80 text-red-400 border-red-500/40';
      default:
        return 'bg-purple-950/80 text-purple-400 border-purple-500/40';
    }
  };

  const getProgressStep = (status) => {
    const map = { pending: 0, confirmed: 1, preparing: 2, cooking: 2, ready: 3, delivery: 4, delivering: 4, delivered: 5 };
    return map[status?.toLowerCase()] ?? 0;
  };

  const TRACKING_STEPS = [
    { title: 'Order Placed', desc: 'Received & sent to kitchen', icon: Clock },
    { title: 'Confirmed', desc: 'Accepted by head chef', icon: CheckCircle },
    { title: 'In Kitchen', desc: 'Cooker simmering broths & prep', icon: ChefHat },
    { title: 'Cooker Confirmed Ready', desc: 'Dish freshly packed for rider pickup', icon: CheckCircle2 },
    { title: 'On the Way', desc: 'Kigali moto rider dispatched', icon: Bike },
    { title: 'Delivered', desc: 'Enjoy your hot gourmet meal', icon: Award }
  ];

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

    if (onOpenCart) {
      onOpenCart();
    }
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
    showToast('New address saved!');
  };

  const handleDeleteAddress = (id) => {
    const updated = savedAddresses.filter((a) => a.id !== id);
    setSavedAddresses(updated);
    localStorage.setItem('hotpot_saved_addresses', JSON.stringify(updated));
    showToast('Address removed.');
  };

  const handleSetDefaultAddress = (id) => {
    const updated = savedAddresses.map((a) => ({
      ...a,
      isDefault: a.id === id
    }));
    setSavedAddresses(updated);
    localStorage.setItem('hotpot_saved_addresses', JSON.stringify(updated));

    // Also update main user address
    const defaultOne = updated.find((a) => a.id === id);
    if (defaultOne && onUpdateUser && user) {
      const u = { ...user, address: defaultOne.address };
      onUpdateUser(u);
    }
    showToast('Default address updated!');
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (onUpdateUser && user) {
      const updated = {
        ...user,
        name: profileName,
        email: profileEmail,
        phone: profilePhone
      };
      onUpdateUser(updated);
    }
    localStorage.setItem('hotpot_preferred_payment', preferredPayment);
    showToast('Profile & preferences saved successfully!');
  };

  const showToast = (msg) => {
    setProfileSuccessToast(msg);
    setTimeout(() => setProfileSuccessToast(''), 3500);
  };

  // ── Access Guard: Only Logged-In Users Can View Dashboard ──
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 animate-page-enter">
        <div className="card-item p-8 sm:p-12 text-center space-y-6 border-primary/30 shadow-2xl bg-gradient-to-b from-primary/10 via-surface-card to-surface-card">
          <div className="w-20 h-20 rounded-3xl bg-primary/20 border border-primary/40 text-primary flex items-center justify-center mx-auto shadow-xl shadow-primary/20">
            <Shield className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/15 border border-amber-500/30 text-amber-400">
              Registered Clients Only
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Client Dashboard Access
            </h1>
            <p className="text-xs sm:text-sm text-text-muted max-w-md mx-auto leading-relaxed">
              The Client Dashboard is reserved for registered members to monitor live kitchen preparation, track express moto couriers, reorder favorite dishes, and manage delivery addresses.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onOpenAuth || onOpenProfile}
              className="w-full sm:w-auto btn-primary text-xs py-3 px-6 font-bold shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
            >
              <User className="w-4 h-4" />
              <span>Sign In or Register</span>
            </button>
            <button
              onClick={onExploreMenu}
              className="w-full sm:w-auto btn-secondary text-xs py-3 px-6 flex items-center justify-center gap-2"
            >
              <Flame className="w-4 h-4 text-amber-300" />
              <span>Continue Browsing Menu</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24 lg:pb-12 animate-page-enter">
      
      {/* Toast Notification */}
      {profileSuccessToast && (
        <div className="fixed top-20 right-5 z-50 p-3.5 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-2xl flex items-center gap-2 animate-toast-enter">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{profileSuccessToast}</span>
        </div>
      )}

      {/* ── Client Hero Banner ── */}
      <section
        className="relative overflow-hidden rounded-3xl p-5 sm:p-8 border border-white/10 shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(174, 50, 0, 0.28) 0%, rgba(28, 28, 36, 0.98) 60%)'
        }}
      >
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-80 h-80 rounded-full pointer-events-none bg-primary/10 blur-3xl" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-xl shrink-0 bg-gradient-to-br from-primary to-orange-600 border border-white/20">
              {user?.name ? user.name[0].toUpperCase() : 'C'}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-3xl font-black text-white leading-tight">
                  Welcome, {user?.name || 'Gourmet Lover'}!
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  <Award className="w-3.5 h-3.5" /> Gold VIP Client
                </span>
              </div>
              <p className="text-xs sm:text-sm text-text-muted flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{user?.address || savedAddresses.find(a => a.isDefault)?.address || 'Kigali, Rwanda'}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={onExploreMenu}
              className="btn-primary text-xs px-4 py-2.5 shadow-lg shadow-primary/30 flex items-center gap-2 font-bold"
            >
              <Flame className="w-4 h-4 text-amber-300" />
              <span>Order Food</span>
            </button>
            <button
              onClick={onOpenReferral}
              className="btn-secondary text-xs px-3.5 py-2.5 flex items-center gap-1.5"
            >
              <Gift className="w-4 h-4 text-amber-400" />
              <span>Earn Points</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Cooker Confirmed Ready Live Notification Banner ── */}
      {orders.some(o => o.status === 'ready') && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-emerald-900/60 to-surface-card border border-emerald-500/50 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-bounce-short">
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
                Your order is freshly simmered, packed, and waiting for the moto rider at HotPot Kigali.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const readyOrder = orders.find(o => o.status === 'ready');
              if (readyOrder && onSelectOrder) onSelectOrder(readyOrder);
              else setActiveTab('tracking');
            }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Navigation className="w-4 h-4" />
            <span>Track Live on Map</span>
          </button>
        </div>
      )}

      {/* ── Dashboard Navigation Tabs ── */}
      <nav className="bg-surface-card border border-white/10 rounded-2xl p-1.5 sm:p-2 flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none shadow-lg">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-3.5 sm:px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'overview'
              ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]'
              : 'text-text-muted hover:text-white hover:bg-white/5'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Dashboard Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('tracking')}
          className={`flex items-center gap-2 px-3.5 sm:px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'tracking'
              ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]'
              : 'text-text-muted hover:text-white hover:bg-white/5'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Live Orders & Tracking</span>
          {activeOrders.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-0.5" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-3.5 sm:px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'history'
              ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]'
              : 'text-text-muted hover:text-white hover:bg-white/5'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Order History & Reorder</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 font-mono">
            {orders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-3.5 sm:px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'profile'
              ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]'
              : 'text-text-muted hover:text-white hover:bg-white/5'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Profile & Preferences</span>
        </button>
      </nav>

      {/* ════════════════════════════════════════════════════════════════
          TAB 1: DASHBOARD OVERVIEW
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Orders */}
            <div className="card-item p-4 sm:p-5 flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-subdued">Orders Made</span>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-blue-500/15 text-blue-400">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">{totalOrders}</div>
                <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" /> Active HotPot Account
                </div>
              </div>
            </div>

            {/* Total Spent */}
            <div className="card-item p-4 sm:p-5 flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-subdued">Total Spent</span>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-500/15 text-emerald-400">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-white font-mono truncate">
                  {totalSpent.toLocaleString()} <span className="text-xs text-text-muted">RWF</span>
                </div>
                <div className="text-[11px] text-text-muted mt-1">Kigali Express Dining</div>
              </div>
            </div>

            {/* VIP Loyalty Points */}
            <div
              onClick={onOpenReferral}
              className="card-item p-4 sm:p-5 flex flex-col justify-between space-y-2 cursor-pointer hover:border-amber-500/40 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-subdued">VIP Points</span>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-500/15 text-amber-400 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                  {loyaltyPoints.toLocaleString()}
                </div>
                <div className="text-[11px] text-amber-500 font-semibold flex items-center gap-1 mt-1">
                  Redeem Rewards <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </div>

            {/* Active Deliveries */}
            <div
              onClick={() => setActiveTab('tracking')}
              className={`card-item p-4 sm:p-5 flex flex-col justify-between space-y-2 cursor-pointer transition-all ${
                activeOrders.length > 0 ? 'border-primary/40 bg-primary/5' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-subdued">Live Tracking</span>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-orange-500/15 text-primary">
                  <Radio className={`w-4 h-4 ${activeOrders.length > 0 ? 'animate-pulse' : ''}`} />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-primary">
                  {activeOrders.length}
                </div>
                <div className="text-[11px] text-text-muted mt-1">
                  {activeOrders.length > 0 ? 'Orders in delivery' : 'No active orders right now'}
                </div>
              </div>
            </div>
          </div>

          {/* Active Orders Section */}
          {activeOrders.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                  </span>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">Active Orders in Kitchen & On the Road</h2>
                </div>
                <button
                  onClick={() => setActiveTab('tracking')}
                  className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                >
                  View Full Tracking Stepper <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeOrders.map((order) => {
                  const step = getProgressStep(order.status);
                  return (
                    <div
                      key={order.id}
                      onClick={() => {
                        if (onSelectOrder) onSelectOrder(order);
                        else setActiveTab('tracking');
                      }}
                      className="card-item p-4 sm:p-5 space-y-3 border-primary/30 hover:border-primary cursor-pointer transition-all bg-gradient-to-br from-primary/10 via-surface-card to-surface-card"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono font-bold text-sm text-primary">#{order.id}</span>
                          <span className="text-xs text-text-muted ml-2">• {order.orderTime || 'Today'}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider border ${getStatusBadge(order.status)}`}>
                          {order.status}
                        </span>
                      </div>

                      {/* Mini Stepper */}
                      <div className="space-y-1.5 py-1">
                        <div className="flex items-center gap-1">
                          {[0, 1, 2, 3, 4].map((s) => (
                            <React.Fragment key={s}>
                              <div
                                className={`w-2.5 h-2.5 rounded-full transition-all ${
                                  s <= step ? 'bg-primary shadow-sm shadow-primary/50' : 'bg-white/10'
                                }`}
                              />
                              {s < 4 && (
                                <div
                                  className={`flex-1 h-0.5 rounded-full ${
                                    s < step ? 'bg-primary' : 'bg-white/10'
                                  }`}
                                />
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                        <div className="flex justify-between text-[10px] text-text-muted font-medium">
                          <span>Placed</span>
                          <span>Kitchen</span>
                          <span>On Way</span>
                          <span>Delivered</span>
                        </div>
                      </div>

                      <div className="text-xs text-text-muted space-y-1 pt-1 border-t border-white/5">
                        {(order.items || []).slice(0, 2).map((item, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span className="text-white truncate max-w-[70%]">{item.qty || 1}x {item.name}</span>
                            <span className="font-mono">{((item.price || 0) * (item.qty || 1)).toLocaleString()} RWF</span>
                          </div>
                        ))}
                        {(order.items || []).length > 2 && (
                          <span className="text-[10px] text-text-subdued block">+ {(order.items || []).length - 2} more items</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                        <span className="text-text-muted flex items-center gap-1 truncate max-w-[60%]">
                          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="truncate">{order.address || 'Kigali'}</span>
                        </span>
                        <span className="font-bold text-primary flex items-center gap-1">
                          Track Live Map <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Actions & Favorites Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Recent Orders Overview */}
            <div className="lg:col-span-2 card-item p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <History className="w-4 h-4 text-text-muted" /> Recent Order Activity
                </h3>
                <button
                  onClick={() => setActiveTab('history')}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  View All Orders →
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <ShoppingBag className="w-8 h-8 text-text-subdued mx-auto" />
                  <p className="text-xs text-text-muted">No orders found yet.</p>
                  <button onClick={onExploreMenu} className="btn-primary text-xs py-2 px-4 mt-2">
                    Browse HotPot Menu
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {orders.slice(0, 3).map((order) => (
                    <div
                      key={order.id}
                      className="p-3 sm:p-3.5 rounded-xl bg-surface-dark border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-white/10 transition-all"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-amber-400">#{order.id}</span>
                          <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(order.status)}`}>
                            {order.status}
                          </span>
                          <span className="text-[11px] text-text-subdued">• {order.orderTime || 'Recent'}</span>
                        </div>
                        <p className="text-xs text-white truncate max-w-sm">
                          {(order.items || []).map(i => `${i.qty || 1}x ${i.name}`).join(', ')}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                        <span className="font-mono font-bold text-xs text-primary">
                          {(order.totalRWF || 0).toLocaleString()} RWF
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleReorder(order, e)}
                            className="btn-primary-sm"
                            title="Reorder this order"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Reorder</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedReceipt(order)}
                            className="btn-secondary-sm"
                            title="View Receipt"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Receipt</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Side Widgets: Rewards & Support */}
            <div className="space-y-4">
              {/* Rewards Card */}
              <div
                className="p-5 rounded-2xl space-y-3.5 border border-amber-500/30"
                style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(28, 28, 36, 0.95) 100%)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Refer Friends in Kigali</h4>
                    <p className="text-[11px] text-text-muted">Earn 5,000 RWF voucher on their first meal</p>
                  </div>
                </div>

                <button
                  onClick={onOpenReferral}
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-black flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <span>Share Referral Link</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>

              {/* Saved Address Quick Glance */}
              <div className="card-item p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" /> Default Delivery Address
                  </h4>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className="text-[11px] text-primary hover:underline font-bold"
                  >
                    Edit
                  </button>
                </div>
                <div className="p-3 rounded-xl bg-surface-dark border border-white/5">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{savedAddresses.find(a => a.isDefault)?.label || 'Home'}</span>
                    <span className="text-[10px] bg-primary/20 text-primary px-1.5 rounded font-mono">DEFAULT</span>
                  </div>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    {savedAddresses.find(a => a.isDefault)?.address || user?.address || 'Kigali, Rwanda'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB 2: REAL-TIME TRACKING & KITCHEN PROGRESS
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'tracking' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <Radio className="w-5 h-5 text-primary animate-pulse" />
                Live Kitchen & Rider Progress
              </h2>
              <p className="text-xs text-text-muted">
                Real-time tracking from chef prep to your doorstep in Kigali.
              </p>
            </div>
            <button
              onClick={onExploreMenu}
              className="btn-primary-sm py-2 px-3 self-start sm:self-auto"
            >
              <Flame className="w-3.5 h-3.5 text-amber-300" />
              <span>Order More Dishes</span>
            </button>
          </div>

          {activeOrders.length === 0 ? (
            <div className="card-item p-8 sm:p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-surface-dark border border-white/10 flex items-center justify-center mx-auto text-text-muted">
                <Radio className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-base font-bold text-white">No active deliveries right now</h3>
                <p className="text-xs text-text-muted">
                  All previous orders have been completed and delivered! Explore our menu to order hot fresh meals.
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <button onClick={onExploreMenu} className="btn-primary text-xs py-2.5 px-5">
                  Browse Authentic HotPot
                </button>
                <button onClick={() => setActiveTab('history')} className="btn-secondary text-xs py-2.5 px-4">
                  View Past Orders
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {activeOrders.map((order) => {
                const currentStepIndex = getProgressStep(order.status);
                const isDelivered = currentStepIndex >= 4;

                return (
                  <div
                    key={order.id}
                    className="card-item p-5 sm:p-7 space-y-6 border-primary/40 bg-gradient-to-b from-primary/5 via-surface-card to-surface-card shadow-2xl"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <span className="text-base sm:text-lg font-black font-mono text-primary">
                            Order #{order.id}
                          </span>
                          <span className={`px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusBadge(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted mt-1">
                          Placed at: <span className="text-white font-medium">{order.orderTime || 'Just now'}</span> • Estimated Delivery: <span className="text-amber-400 font-bold">20-30 min</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSelectOrder && onSelectOrder(order)}
                          className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-sm"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Interactive GPS Map</span>
                        </button>
                        <button
                          onClick={() => setSelectedReceipt(order)}
                          className="btn-secondary text-xs py-2 px-3 flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>
                      </div>
                    </div>

                    {/* Step-by-Step Progress Stepper */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 sm:gap-2">
                        {TRACKING_STEPS.map((step, idx) => {
                          const Icon = step.icon;
                          const isDone = idx < currentStepIndex;
                          const isCurrent = idx === currentStepIndex;

                          return (
                            <div
                              key={step.title}
                              className={`p-3.5 rounded-xl border transition-all flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2.5 ${
                                isCurrent
                                  ? 'bg-primary/20 border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                                  : isDone
                                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'
                                  : 'bg-surface-dark border-white/5 text-text-subdued opacity-60'
                              }`}
                            >
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                  isCurrent
                                    ? 'bg-primary text-white animate-pulse'
                                    : isDone
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-white/5 text-text-subdued'
                                }`}
                              >
                                {isDone ? <Check className="w-4 h-4 font-bold" /> : <Icon className="w-4 h-4" />}
                              </div>

                              <div className="min-w-0">
                                <div className="text-xs font-bold leading-tight truncate">
                                  {step.title}
                                </div>
                                <div className="text-[10px] text-text-muted mt-0.5 hidden sm:block leading-snug">
                                  {step.desc}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Details Grid: Rider Info, Items, and Delivery Sector */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      {/* Rider Card */}
                      <div className="p-4 rounded-xl bg-surface-dark border border-white/5 space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-text-subdued flex items-center gap-1.5">
                          <Bike className="w-3.5 h-3.5 text-primary" /> Assigned Moto Courier
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-sm">
                            🛵
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">Jean Paul N. (Express Moto)</div>
                            <div className="text-[11px] text-text-muted">Plate: <span className="text-amber-300 font-mono">RAD 842 B</span></div>
                          </div>
                        </div>
                        <div className="text-[11px] text-emerald-400 font-semibold pt-1">
                          ⚡ Contact: +250 788 123 456
                        </div>
                      </div>

                      {/* Destination Address */}
                      <div className="p-4 rounded-xl bg-surface-dark border border-white/5 space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-text-subdued flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-primary" /> Delivery Destination
                        </div>
                        <div className="text-xs font-semibold text-white leading-relaxed">
                          {order.address || 'Kigali, Rwanda'}
                        </div>
                        <div className="text-[11px] text-text-muted pt-1">
                          Payment: <span className="uppercase text-amber-400 font-bold">{order.paymentMethod || 'Mobile Money'}</span>
                        </div>
                      </div>

                      {/* Order Items Snapshot */}
                      <div className="p-4 rounded-xl bg-surface-dark border border-white/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-text-subdued flex items-center gap-1.5">
                            <ShoppingBag className="w-3.5 h-3.5 text-primary" /> Order Items ({order.items?.length || 0})
                          </div>
                          <span className="font-mono font-bold text-xs text-primary">
                            {(order.totalRWF || 0).toLocaleString()} RWF
                          </span>
                        </div>
                        <div className="space-y-1 text-xs text-text-muted max-h-24 overflow-y-auto">
                          {(order.items || []).map((item, i) => (
                            <div key={i} className="flex justify-between">
                              <span className="truncate max-w-[70%]">{item.qty || 1}x {item.name}</span>
                              <span className="font-mono text-white">{((item.price || 0) * (item.qty || 1)).toLocaleString()}</span>
                            </div>
                          ))}
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
          TAB 3: ORDER HISTORY & 1-CLICK REORDER
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div className="space-y-5">
          {/* Header and Filters Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-surface-card border border-white/10 p-3.5 sm:p-4 rounded-2xl shadow-md">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => {
                  setHistorySearch(e.target.value);
                  setHistoryPage(1);
                }}
                placeholder="Search orders by ID, dish name, or address..."
                className="w-full bg-surface-dark border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-text-main placeholder-text-subdued focus:outline-none focus:border-primary"
              />
              {historySearch && (
                <button
                  onClick={() => setHistorySearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {[
                { id: 'all', label: 'All Orders' },
                { id: 'in_progress', label: 'Active' },
                { id: 'delivered', label: 'Delivered' },
                { id: 'cancelled', label: 'Cancelled' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setHistoryFilter(f.id);
                    setHistoryPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                    historyFilter === f.id
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-surface-dark text-text-muted border-white/10 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Orders List / Table */}
          {filteredHistory.length === 0 ? (
            <div className="card-item p-12 text-center space-y-3">
              <History className="w-10 h-10 text-text-subdued mx-auto" />
              <h3 className="text-sm font-bold text-white">No matching orders found</h3>
              <p className="text-xs text-text-muted">Try changing your search query or status filter.</p>
              <button
                onClick={() => {
                  setHistoryFilter('all');
                  setHistorySearch('');
                }}
                className="btn-secondary text-xs py-2 px-4 mt-2"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedOrders.map((order) => (
                <div
                  key={order.id}
                  className="card-item p-4 sm:p-5 space-y-3 hover:border-white/15 transition-all"
                >
                  {/* Order Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-amber-400">#{order.id}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(order.status)}`}>
                        {order.status}
                      </span>
                      <span className="text-xs text-text-muted">• {order.orderTime || 'Date Recorded'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleReorder(order, e)}
                        className="btn-primary text-xs px-3 py-1.5 font-bold shadow-md shadow-primary/20 flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>1-Click Reorder</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedReceipt(order)}
                        className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Receipt</span>
                      </button>

                      {order.status !== 'delivered' && order.status !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectOrder) onSelectOrder(order);
                            else setActiveTab('tracking');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-orange-500/20 text-orange-300 border border-orange-500/40 text-xs font-bold flex items-center gap-1"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Track</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Order Items Table-style summary */}
                  <div className="p-3 rounded-xl bg-surface-dark border border-white/5 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                      {(order.items || []).map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white/5 p-2 rounded-lg">
                          <span className="w-5 h-5 rounded-md bg-primary/20 text-primary font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                            {item.qty || 1}x
                          </span>
                          <span className="text-white font-medium truncate flex-1">{item.name}</span>
                          <span className="font-mono text-text-muted text-[11px] shrink-0">
                            {((item.price || 0) * (item.qty || 1)).toLocaleString()} RWF
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Footer */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs">
                    <div className="text-text-muted flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{order.address || 'Kigali, Rwanda'}</span>
                    </div>

                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-text-muted">Total:</span>
                      <span className="text-sm font-extrabold text-primary">
                        {(order.totalRWF || 0).toLocaleString()} RWF
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination Bar */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 text-xs">
                  <span className="text-text-muted">
                    Showing {(historyPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                    {Math.min(historyPage * ITEMS_PER_PAGE, filteredHistory.length)} of{' '}
                    {filteredHistory.length} orders
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={historyPage === 1}
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      className="btn-secondary text-xs px-2.5 py-1.5 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-3 py-1 bg-surface-dark border border-white/10 rounded-lg font-mono font-bold text-white">
                      {historyPage} / {totalPages}
                    </span>
                    <button
                      disabled={historyPage === totalPages}
                      onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
                      className="btn-secondary text-xs px-2.5 py-1.5 disabled:opacity-40"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB 4: PROFILE & PREFERENCES
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Col: Personal Details & Contact */}
            <div className="lg:col-span-2 space-y-6">
              <form onSubmit={handleSaveProfile} className="card-item p-5 sm:p-6 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" /> Personal Information
                  </h3>
                  <span className="text-xs text-text-subdued">Account Hub</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      required
                      placeholder="e.g. Christian Mugisha"
                      className="w-full bg-surface-dark border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-text-main focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                      Phone Number (Rwanda)
                    </label>
                    <input
                      type="text"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="0788000001"
                      className="w-full bg-surface-dark border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-text-main focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      placeholder="client@hotpot.rw"
                      className="w-full bg-surface-dark border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-text-main focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Preferred Payment Method */}
                <div className="space-y-2.5 pt-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
                    Preferred Default Payment Method
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                          className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 ${
                            isSelected
                              ? 'bg-primary/20 border-primary text-white font-bold'
                              : 'bg-surface-dark border-white/10 text-text-muted hover:border-white/20'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${p.color} shrink-0`} />
                          <span className="text-xs truncate">{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notification preferences */}
                <div className="space-y-2.5 pt-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
                    Order Notification Alerts
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center justify-between p-3 rounded-xl bg-surface-dark border border-white/5 cursor-pointer">
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-white block">SMS Live Tracking Updates</span>
                        <span className="text-[10px] text-text-muted block">Receive moto courier updates on your phone</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={smsAlerts}
                        onChange={(e) => setSmsAlerts(e.target.checked)}
                        className="w-4 h-4 accent-primary rounded cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-xl bg-surface-dark border border-white/5 cursor-pointer">
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-white block">VIP Vouchers & Special Offers</span>
                        <span className="text-[10px] text-text-muted block">Exclusive discounts for registered HotPot clients</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={promoOffers}
                        onChange={(e) => setPromoOffers(e.target.checked)}
                        className="w-4 h-4 accent-primary rounded cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex justify-end">
                  <button type="submit" className="btn-primary text-xs px-6 py-2.5 font-bold shadow-lg shadow-primary/20">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>

            {/* Right Col: Saved Kigali Delivery Addresses */}
            <div className="space-y-5">
              <div className="card-item p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" /> Saved Delivery Addresses
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsAddingAddr(!isAddingAddr)}
                    className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>

                {/* Add Address Form */}
                {isAddingAddr && (
                  <form onSubmit={handleAddAddress} className="p-3.5 rounded-xl bg-surface-dark border border-primary/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-white">Add New Kigali Address</span>
                      <button
                        type="button"
                        onClick={() => setIsAddingAddr(false)}
                        className="text-text-muted hover:text-white"
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
                          className={`flex-1 py-1 rounded-lg text-xs font-semibold border ${
                            newAddrLabel === lbl
                              ? 'bg-primary/20 border-primary text-primary'
                              : 'bg-white/5 border-white/10 text-text-muted'
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
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-text-subdued focus:outline-none focus:border-primary"
                    />

                    <button type="submit" className="w-full btn-primary text-xs py-2 font-bold">
                      Save Address
                    </button>
                  </form>
                )}

                {/* Address Cards List */}
                <div className="space-y-2.5">
                  {savedAddresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`p-3 rounded-xl border transition-all space-y-1.5 ${
                        addr.isDefault
                          ? 'bg-primary/10 border-primary/40 shadow-sm'
                          : 'bg-surface-dark border-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{addr.label}</span>
                          {addr.isDefault && (
                            <span className="text-[9px] bg-primary text-white font-mono font-bold px-1.5 py-0.2 rounded">
                              DEFAULT
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {!addr.isDefault && (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultAddress(addr.id)}
                              className="text-[10px] text-text-muted hover:text-white underline"
                            >
                              Set default
                            </button>
                          )}
                          {savedAddresses.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAddress(addr.id)}
                              className="text-text-subdued hover:text-red-400 p-1"
                              title="Delete address"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-text-muted leading-relaxed">
                        {addr.address}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security & Account Tier */}
              <div className="card-item p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Verified HotPot Customer</div>
                    <div className="text-[10px] text-text-muted">256-Bit SSL Encrypted Account</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Digital Receipt Modal */}
      <ReceiptModal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        order={selectedReceipt}
      />
    </div>
  );
}
