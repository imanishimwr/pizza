import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Clock,
  MapPin,
  Radio,
  History,
  Settings,
  CreditCard,
  ChevronRight,
  ChevronLeft,
  FileText,
  Shield,
  DollarSign,
  Award,
  Flame,
  Navigation,
  ChefHat,
  Bike,
  CheckCircle2,
  Plus,
  Trash2,
  Search,
  Menu,
  X,
  Home,
  Smartphone,
  Phone,
  User
} from 'lucide-react';
import ReceiptModal from '../../components/customer/ReceiptModal';
import { updateProfile } from '../../services/apiService';

const ADDRESSES_KEY = 'hotpot_saved_addresses';
const PAYMENT_KEY = 'hotpot_preferred_payment';

/** Rwandan francs are plain numbers. A missing total shows a dash, never a fake 0. */
const formatRWF = (value) =>
  Number.isFinite(Number(value)) ? `${Number(value).toLocaleString()} RWF` : '—';

const readLocalJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) ?? fallback;
  } catch {
    return fallback;
  }
};

const readLocal = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw;
  } catch {
    return fallback;
  }
};

const writeLocalJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`[storage] could not write ${key}`, err);
  }
};

const writeLocal = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.error(`[storage] could not write ${key}`, err);
  }
};

/** The only statuses the server ever stores. Lowercase, always. */
const STATUS_LABELS = {
  pending: 'Pending',
  preparing: 'Preparing',
  ready: 'Ready',
  delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};

const isLive = (status) => status !== 'delivered' && status !== 'cancelled';

const statusLabel = (status) => STATUS_LABELS[status] || 'Unknown';

const getStatusBadge = (status) => {
  switch (status) {
    case 'delivered':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 font-bold';
    case 'ready':
      return 'bg-emerald-500/25 text-emerald-300 border-emerald-400/60 font-bold animate-pulse shadow-sm shadow-emerald-500/20';
    case 'delivery':
      return 'bg-blue-500/15 text-blue-400 border-blue-500/40 font-bold';
    case 'preparing':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/40 font-bold';
    case 'cancelled':
      return 'bg-red-500/15 text-red-400 border-red-500/40 font-bold';
    default:
      return 'bg-orange-500/15 text-orange-400 border-orange-500/40 font-bold';
  }
};

const getStepProgressIndex = (status) => {
  if (status === 'delivered') return 3;
  if (status === 'delivery') return 2;
  if (status === 'preparing' || status === 'ready') return 1;
  return 0; // pending
};

const barGlowFor = (status) => {
  if (status === 'delivered') return 'from-emerald-500 to-green-500 shadow-emerald-500/50';
  if (status === 'delivery') return 'from-blue-500 to-cyan-500 shadow-blue-500/50';
  return 'from-amber-500 to-orange-500 shadow-orange-500/50';
};

const itemQty = (item) => Number(item?.qty ?? item?.quantity) || 1;
const itemLineTotal = (item) => {
  const price = Number(item?.price);
  return Number.isFinite(price) ? price * itemQty(item) : null;
};

export default function CustomerDashboard({
  user,
  orders = [],
  cart = [],
  loading = false,
  onSelectOrder,
  onOpenProfile,
  onOpenAuth,
  onExploreMenu,
  onOpenCart,
  onUpdateUser,
  onNavigate
}) {
  // Navigation Tabs: 'overview' | 'tracking' | 'history' | 'profile'
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  // Ticking Clock (every second)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const triggerToast = useCallback((message, tone = 'success') => {
    setToast({ message, tone });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  // Escape closes the mobile drawer and the receipt modal.
  useEffect(() => {
    if (!isMobileDrawerOpen && !selectedReceipt) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setIsMobileDrawerOpen(false);
      setSelectedReceipt(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isMobileDrawerOpen, selectedReceipt]);

  const orderList = useMemo(() => (Array.isArray(orders) ? orders : []), [orders]);
  const totalOrders = orderList.length;
  const activeOrders = useMemo(() => orderList.filter((o) => isLive(o.status)), [orderList]);

  // Cancelled orders were never fulfilled, so they are excluded from spend.
  const totalSpent = useMemo(
    () => orderList.reduce((acc, o) => (o.status === 'cancelled' ? acc : acc + (Number(o.totalRWF) || 0)), 0),
    [orderList]
  );

  // History State & Filtering
  const [historyFilter, setHistoryFilter] = useState('all');
  const [historySearch, setHistorySearch] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  // Profile & Saved Addresses State
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [preferredPayment, setPreferredPayment] = useState(() => readLocal(PAYMENT_KEY, 'momo'));
  const [profileError, setProfileError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // The email is owned by the auth provider; the server ignores it on PATCH.
  const profileEmail = user?.email || '';

  const [savedAddresses, setSavedAddresses] = useState(() => readLocalJSON(ADDRESSES_KEY, []));

  const [newAddrLabel, setNewAddrLabel] = useState('Home');
  const [newAddrText, setNewAddrText] = useState('');
  const [isAddingAddr, setIsAddingAddr] = useState(false);
  const [smsAlerts, setSmsAlerts] = useState(true);

  useEffect(() => {
    if (!user) return;
    setProfileName(user.name || '');
    setProfilePhone(user.phone || '');
  }, [user]);

  const activeAddress = useMemo(() => {
    const defaultAddr = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
    return defaultAddr?.address || '';
  }, [savedAddresses]);

  const goToMenu = useCallback(() => {
    setIsMobileDrawerOpen(false);
    if (typeof onNavigate === 'function') onNavigate('menu');
    else if (onExploreMenu) onExploreMenu();
  }, [onNavigate, onExploreMenu]);

  const openOrderTracking = useCallback(
    (order) => {
      if (onSelectOrder) onSelectOrder(order);
      else {
        setActiveTab('tracking');
        setIsMobileDrawerOpen(false);
      }
    },
    [onSelectOrder]
  );

  const goToAllOrders = useCallback(() => {
    setIsMobileDrawerOpen(false);
    if (typeof onNavigate === 'function') onNavigate('orders');
    else setActiveTab('history');
  }, [onNavigate]);

  // Address Handlers
  const persistAddresses = (next) => {
    setSavedAddresses(next);
    writeLocalJSON(ADDRESSES_KEY, next);
  };

  const handleAddAddress = (e) => {
    e.preventDefault();
    if (!newAddrText.trim()) return;

    const newAddr = {
      id: `addr-${Date.now()}`,
      label: newAddrLabel,
      address: newAddrText.trim(),
      isDefault: savedAddresses.length === 0
    };

    persistAddresses([...savedAddresses, newAddr]);
    setNewAddrText('');
    setIsAddingAddr(false);
    triggerToast('New delivery address saved.');
  };

  const handleDeleteAddress = (id) => {
    const remaining = savedAddresses.filter((a) => a.id !== id);
    // Never leave the book without a default.
    const hadDefault = savedAddresses.some((a) => a.isDefault && a.id === id);
    const next = hadDefault && remaining.length ? remaining.map((a, i) => ({ ...a, isDefault: i === 0 })) : remaining;
    persistAddresses(next);
    triggerToast('Address removed.');
  };

  const handleSetDefaultAddress = (id) => {
    persistAddresses(savedAddresses.map((a) => ({ ...a, isDefault: a.id === id })));
    triggerToast('Default delivery address updated.');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user) return;

    setIsSavingProfile(true);
    setProfileError('');
    try {
      // `updateProfile` only accepts name / phone / location / lat / lng, so the
      // email is not sent — it is read-only here. The call is what actually
      // persists the change; before this the form claimed success and dropped
      // the data on the floor.
      const updated = await updateProfile({ name: profileName.trim(), phone: profilePhone.trim() });
      if (updated && onUpdateUser) onUpdateUser(updated);
      writeLocal(PAYMENT_KEY, preferredPayment);
      triggerToast('Profile and preferences saved.');
    } catch (err) {
      const message = err?.message || 'Could not save your profile.';
      setProfileError(message);
      triggerToast(message, 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    const q = String(historySearch).toLowerCase().trim();
    return orderList.filter((order) => {
      const statusMatch =
        historyFilter === 'all'
          ? true
          : historyFilter === 'in_progress'
            ? isLive(order.status)
            : order.status === historyFilter;

      const searchMatch =
        !q ||
        (order.id && String(order.id).toLowerCase().includes(q)) ||
        (order.address && String(order.address).toLowerCase().includes(q)) ||
        (Array.isArray(order.items) &&
          order.items.some((i) => i?.name && String(i.name).toLowerCase().includes(q)));

      return statusMatch && searchMatch;
    });
  }, [orderList, historyFilter, historySearch]);

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / ITEMS_PER_PAGE));
  // Clamp instead of setState-in-effect: narrowing the filter used to leave the
  // pager on a page that no longer existed.
  const safeHistoryPage = Math.min(Math.max(1, historyPage), totalPages);
  const paginatedOrders = filteredHistory.slice(
    (safeHistoryPage - 1) * ITEMS_PER_PAGE,
    safeHistoryPage * ITEMS_PER_PAGE
  );

  const cartTotalItems = useMemo(
    () => (Array.isArray(cart) ? cart : []).reduce((sum, it) => sum + (Number(it?.quantity) || 0), 0),
    [cart]
  );

  const initial = String(profileName || user?.name || '').trim().charAt(0).toUpperCase();

  // Auth Guard View if unauthenticated
  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0F1117] text-slate-100 p-4">
        <div className="w-full max-w-md p-8 rounded-3xl bg-[#14171F] border border-slate-800 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-400 flex items-center justify-center mx-auto shadow-lg shadow-orange-500/10">
            <Shield className="w-8 h-8" aria-hidden="true" />
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
              type="button"
              onClick={onOpenAuth || onOpenProfile}
              className="w-full min-h-11 py-3 px-6 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs shadow-lg shadow-orange-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <User className="w-4 h-4" aria-hidden="true" />
              <span>Sign In / Register</span>
            </button>
            <button
              type="button"
              onClick={onExploreMenu}
              className="w-full min-h-11 py-3 px-6 rounded-xl bg-[#1A1D24] hover:bg-white/10 border border-slate-700/60 text-slate-300 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4 text-orange-400" aria-hidden="true" />
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
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-5 right-5 z-50 p-3.5 px-4 rounded-xl bg-[#1A1D24]/95 border text-xs font-semibold shadow-2xl flex items-center gap-2.5 animate-toast-enter backdrop-blur-md ${
            toast.tone === 'error' ? 'border-red-500/50 text-red-300' : 'border-emerald-500/50 text-emerald-300'
          }`}
        >
          {toast.tone === 'error' ? (
            <X className="w-4 h-4 text-red-400 shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── MOBILE DRAWER BACKDROP (Screen < 768px) ── */}
      {isMobileDrawerOpen && (
        <div
          onClick={() => setIsMobileDrawerOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 md:hidden animate-fade-in"
          aria-hidden="true"
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
              <Flame className="w-5 h-5 fill-current" aria-hidden="true" />
            </div>

            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <span className="text-xs font-black tracking-wider text-white uppercase block truncate">
                  HotPot Kigali
                </span>
                <span className="text-[10px] text-orange-400 font-bold block truncate">Customer Portal</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={goToMenu}
              className="p-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 hover:text-white transition-all min-h-9 min-w-9 flex items-center justify-center shadow-xs"
              title="Return to Customer Store Menu"
              aria-label="Return to Store Menu"
            >
              <Home className="w-4 h-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(false)}
              className="md:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all min-h-9 min-w-9 flex items-center justify-center"
              aria-label="Close Menu"
            >
              <X className="w-4 h-4 text-orange-400" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden md:flex p-1.5 rounded-lg bg-[#1F242D] hover:bg-white/10 border border-slate-700/50 text-slate-400 hover:text-white transition-all shadow-xs"
              title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-label={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
              )}
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
                label: 'Order History',
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
                  type="button"
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
                  aria-current={isActive ? 'page' : undefined}
                >
                  <div className="relative shrink-0 flex items-center justify-center">
                    <Icon className="w-4 h-4" aria-hidden="true" />
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
              type="button"
              onClick={goToMenu}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-300 text-xs font-bold transition-all min-h-11 ${
                isSidebarCollapsed ? 'md:justify-center md:px-0' : ''
              }`}
              title="Browse Full Menu"
            >
              <Flame className="w-4 h-4 text-orange-400 shrink-0" aria-hidden="true" />
              <span className={`${isSidebarCollapsed ? 'md:hidden' : ''}`}>Explore Food Menu</span>
            </button>

            {onOpenCart && (
              <button
                type="button"
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
                  <ShoppingBag className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
                  <span className={`truncate ${isSidebarCollapsed ? 'md:hidden' : ''}`}>My Food Cart</span>
                </div>
                {cartTotalItems > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full bg-orange-500 text-white font-mono text-[10px] font-bold ${
                      isSidebarCollapsed ? 'md:hidden' : ''
                    }`}
                  >
                    {cartTotalItems}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={goToAllOrders}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#1A1D24] hover:bg-white/10 border border-slate-700/60 text-slate-300 hover:text-white text-xs font-bold transition-all min-h-11 ${
                isSidebarCollapsed ? 'md:justify-center md:px-0' : ''
              }`}
              title="Open the full order history page"
            >
              <History className="w-4 h-4 text-orange-400 shrink-0" aria-hidden="true" />
              <span className={`truncate ${isSidebarCollapsed ? 'md:hidden' : ''}`}>All Orders Page</span>
            </button>
          </div>
        </div>

        {/* Sidebar Footer: Customer Profile Badge */}
        <div className="p-3 border-t border-slate-800 bg-[#10131A] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-orange-500 to-amber-600 flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-sm border border-white/10">
              {initial || <User className="w-4 h-4" aria-hidden="true" />}
            </div>

            {!isSidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">
                  {profileName || 'HotPot Customer'}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 flex items-center gap-0.5 truncate">
                    Signed in
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
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="md:hidden p-2.5 rounded-xl bg-[#1A1D24] border border-slate-800 text-slate-300 hover:text-white min-h-11 min-w-11 flex items-center justify-center"
              aria-label="Open Navigation"
              aria-expanded={isMobileDrawerOpen}
            >
              <Menu className="w-5 h-5 text-orange-400" aria-hidden="true" />
            </button>

            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-white truncate">
                  {profileName ? `Welcome back, ${profileName}!` : 'Welcome back!'}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
                <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" aria-hidden="true" />
                <span className="truncate max-w-50 sm:max-w-xs">
                  {activeAddress || 'No delivery address saved yet'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Active Orders Status Counter Pill */}
            {activeOrders.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('tracking')}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 text-xs font-bold flex items-center gap-1.5 transition-all min-h-9"
              >
                <span className="w-2 h-2 rounded-full bg-orange-400" />
                <span className="hidden xs:inline">{activeOrders.length} in Prep/Transit</span>
                <span className="xs:hidden">{activeOrders.length} Live</span>
              </button>
            )}

            {/* Live Digital Clock */}
            <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs text-slate-300 bg-[#1A1D24] border border-slate-800 px-3 py-1.5 rounded-xl shadow-xs">
              <Clock className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />
              <span>
                {currentTime.toLocaleTimeString('en-US', { hour12: false })}{' '}
                <span className="text-[10px] text-slate-500">CAT</span>
              </span>
            </div>
          </div>
        </header>

        {/* Smooth Independent Section Scrolling Content Canvas */}
        <main className="flex-1 overflow-y-auto no-scrollbar scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-4 sm:p-6 lg:p-8 space-y-6 bg-[#0F1117]">
          {/* Ready-for-dispatch Alert Banner */}
          {orderList.some((o) => o.status === 'ready') && (
            <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-r from-emerald-950/90 via-emerald-900/60 to-[#14171F] border border-emerald-500/50 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-600/30">
                  <ChefHat className="w-6 h-6" aria-hidden="true" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-white">Kitchen confirmed: your meal is ready 🍲</h4>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold">
                      Ready for Dispatch
                    </span>
                  </div>
                  <p className="text-xs text-emerald-200/80 mt-0.5">
                    Freshly prepared and packed, waiting for a courier at HotPot Kigali.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const readyOrder = orderList.find((o) => o.status === 'ready');
                  if (readyOrder) openOrderTracking(readyOrder);
                  else setActiveTab('tracking');
                }}
                className="w-full sm:w-auto min-h-11 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
              >
                <Navigation className="w-4 h-4" aria-hidden="true" />
                <span>Track Live on Map</span>
              </button>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              TAB 1: DASHBOARD OVERVIEW
          ════════════════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* KPI SUMMARY CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                {/* 1. Orders Made */}
                <div className="bg-[#1A1D24] border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all shadow-lg flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Orders Made</span>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 border border-blue-500/20 text-blue-400">
                      <ShoppingBag className="w-5 h-5" aria-hidden="true" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold text-white font-mono">{totalOrders}</div>
                    <div className="text-xs text-slate-400 mt-1">Across your HotPot account</div>
                  </div>
                </div>

                {/* 2. Total Spent in RWF */}
                <div className="bg-[#1A1D24] border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all shadow-lg flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Total Spent in RWF
                    </span>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <DollarSign className="w-5 h-5" aria-hidden="true" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold text-white font-mono truncate">
                      {totalSpent.toLocaleString()}{' '}
                      <span className="text-sm text-slate-400 font-sans font-normal">RWF</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Cancelled orders excluded</div>
                  </div>
                </div>

                {/* 3. Live Tracking */}
                <button
                  type="button"
                  onClick={() => setActiveTab('tracking')}
                  className={`text-left bg-[#1A1D24] border rounded-2xl p-5 hover:border-orange-500/50 transition-all shadow-lg flex flex-col justify-between space-y-3 ${
                    activeOrders.length > 0 ? 'border-orange-500/40 bg-orange-500/5' : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Live Tracking</span>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-500/10 border border-orange-500/20 text-orange-400">
                      <Radio className={`w-5 h-5 ${activeOrders.length > 0 ? 'animate-pulse' : ''}`} aria-hidden="true" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold font-mono text-orange-400">
                      {activeOrders.length} <span className="text-sm font-sans font-normal text-slate-300">Active</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
                      <span>{activeOrders.length > 0 ? 'Orders in kitchen/transit' : 'No active orders'}</span>
                      <ChevronRight className="w-4 h-4 text-orange-400" aria-hidden="true" />
                    </div>
                  </div>
                </button>
              </div>

              {/* LIVE TRACKING CARDS (Active Orders) */}
              {activeOrders.length > 0 && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500" />
                      </span>
                      <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                        Active Orders in Kitchen &amp; Transit
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('tracking')}
                      className="text-xs text-orange-400 font-bold hover:underline flex items-center gap-1"
                    >
                      View Live Steppers <ChevronRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeOrders.map((order) => {
                      const stepIdx = getStepProgressIndex(order.status);

                      return (
                        <div
                          key={order.id}
                          className="bg-[#1A1D24] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 shadow-xl transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-mono font-bold text-base text-white">#{order.id}</span>
                              <span className="text-xs text-slate-400 ml-2">
                                • {order.orderTime || 'Recently'}
                              </span>
                            </div>
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] uppercase tracking-wider border ${getStatusBadge(
                                order.status
                              )}`}
                            >
                              {statusLabel(order.status)}
                            </span>
                          </div>

                          {/* 4-Step Horizontal Order Stepper with Vibrant Glowing Bar */}
                          <div className="space-y-2 py-1">
                            <div className="relative flex items-center justify-between">
                              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 bg-slate-800 rounded-full z-0" />

                              <div
                                className={`absolute left-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-linear-to-r shadow-md transition-all duration-500 z-0 ${barGlowFor(
                                  order.status
                                )}`}
                                style={{ width: `${(stepIdx / 3) * 100}%` }}
                              />

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
                                      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="flex justify-between text-[11px] font-bold text-slate-400">
                              <span className={stepIdx >= 0 ? 'text-white' : ''}>Placed</span>
                              <span className={stepIdx >= 1 ? 'text-amber-400' : ''}>Kitchen</span>
                              <span className={stepIdx >= 2 ? 'text-blue-400' : ''}>On Way</span>
                              <span className={stepIdx >= 3 ? 'text-emerald-400' : ''}>Delivered</span>
                            </div>
                          </div>

                          {/* Items Summary */}
                          <div className="text-xs text-slate-300 space-y-1 pt-2 border-t border-slate-800">
                            {(order.items || []).slice(0, 2).map((item, iIdx) => (
                              <div key={`${item?.id ?? item?.mealId ?? 'item'}-${iIdx}`} className="flex justify-between">
                                <span className="text-white truncate max-w-[70%]">
                                  {itemQty(item)}x {item?.name}
                                </span>
                                <span className="font-mono text-slate-400">{formatRWF(itemLineTotal(item))}</span>
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
                              <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" aria-hidden="true" />
                              <span className="truncate">{order.address || 'No address on file'}</span>
                            </span>

                            <button
                              type="button"
                              onClick={() => openOrderTracking(order)}
                              className="min-h-11 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition-all active:scale-95"
                            >
                              <Navigation className="w-4 h-4" aria-hidden="true" />
                              <span>Track Live Map</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* RECENT ACTIVITY & DELIVERY ADDRESS GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Orders Overview (2 Cols) */}
                <div className="lg:col-span-2 bg-[#1A1D24] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                      <History className="w-4 h-4 text-orange-400" aria-hidden="true" /> Recent Activity
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('history')}
                      className="text-xs text-orange-400 font-bold hover:underline"
                    >
                      View All History →
                    </button>
                  </div>

                  {loading && orderList.length === 0 ? (
                    <div className="py-10 text-center space-y-3" aria-busy="true" aria-live="polite">
                      <span className="inline-block w-8 h-8 rounded-full border-2 border-slate-600 border-t-orange-400 animate-spin" />
                      <p className="text-xs text-slate-400">Loading your orders…</p>
                    </div>
                  ) : orderList.length === 0 ? (
                    <div className="py-10 text-center space-y-3">
                      <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto" aria-hidden="true" />
                      <p className="text-xs text-slate-400">No orders placed yet.</p>
                      <button
                        type="button"
                        onClick={goToMenu}
                        className="min-h-11 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs"
                      >
                        Browse HotPot Menu
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orderList.slice(0, 4).map((order) => (
                        <div
                          key={order.id}
                          className="p-3.5 rounded-xl bg-[#14171F] border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-all"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-white">#{order.id}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(
                                  order.status
                                )}`}
                              >
                                {statusLabel(order.status)}
                              </span>
                              <span className="text-[11px] text-slate-500">• {order.orderTime || 'Recently'}</span>
                            </div>
                            <p className="text-xs text-slate-300 truncate max-w-sm">
                              {(order.items || [])
                                .map((i) => `${itemQty(i)}x ${i?.name}`)
                                .join(', ') || 'No items recorded'}
                            </p>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                            <span className="font-mono font-bold text-xs text-orange-400">
                              {formatRWF(order.totalRWF)}
                            </span>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openOrderTracking(order)}
                                className="min-h-11 px-3 py-2 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-orange-500/20 active:scale-95 transition-all"
                                title="Track this order"
                              >
                                <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Track</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setSelectedReceipt(order)}
                                className="min-h-11 px-3 py-2 rounded-xl bg-[#1F242D] hover:bg-white/10 border border-slate-700/60 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95"
                                title="View Receipt"
                              >
                                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
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
                        <MapPin className="w-4 h-4 text-orange-400" aria-hidden="true" /> Default Delivery Address
                      </h4>
                      <button
                        type="button"
                        onClick={() => setActiveTab('profile')}
                        className="text-xs text-orange-400 hover:underline font-bold"
                      >
                        Manage
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-[#14171F] border border-slate-800 space-y-2">
                      {activeAddress ? (
                        <>
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <span>{(savedAddresses.find((a) => a.isDefault) || savedAddresses[0])?.label}</span>
                            <span className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                              DEFAULT
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">{activeAddress}</p>
                        </>
                      ) : (
                        <p className="text-xs text-slate-400 leading-relaxed">
                          You have not saved a delivery address yet. Add one to speed up checkout.
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('profile')}
                      className="w-full min-h-11 py-2.5 px-4 rounded-xl bg-[#1F242D] hover:bg-white/10 border border-slate-700/60 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4 text-orange-400" aria-hidden="true" />
                      <span>Add or Switch Address</span>
                    </button>
                  </div>

                  {/* Session Badge Card */}
                  <div className="bg-[#1A1D24] border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Shield className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Signed in as {user.email || 'customer'}</div>
                      <div className="text-[11px] text-slate-400">Your session token is attached to every request</div>
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
                    <Radio className="w-5 h-5 text-orange-400 animate-pulse" aria-hidden="true" />
                    Live Orders &amp; GPS Tracking
                  </h2>
                  <p className="text-xs text-slate-400">
                    Real-time status updates from head cook simmering to moto courier arrival.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={goToMenu}
                  className="min-h-11 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-orange-500/20 self-start sm:self-auto"
                >
                  <Flame className="w-4 h-4" aria-hidden="true" />
                  <span>Order More Dishes</span>
                </button>
              </div>

              {loading && orderList.length === 0 ? (
                <div className="bg-[#1A1D24] border border-slate-800 rounded-2xl p-10 text-center space-y-3" aria-busy="true">
                  <span className="inline-block w-8 h-8 rounded-full border-2 border-slate-600 border-t-orange-400 animate-spin" />
                  <p className="text-xs text-slate-400">Loading live orders…</p>
                </div>
              ) : activeOrders.length === 0 ? (
                <div className="bg-[#1A1D24] border border-slate-800 rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-xl">
                  <div className="w-16 h-16 rounded-2xl bg-[#14171F] border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                    <Radio className="w-8 h-8" aria-hidden="true" />
                  </div>
                  <div className="space-y-1 max-w-md mx-auto">
                    <h3 className="text-base font-bold text-white">No active deliveries right now</h3>
                    <p className="text-xs text-slate-400">
                      {totalOrders === 0
                        ? 'You have not placed an order yet. Explore the kitchen menu to get started.'
                        : 'Every order so far has been completed or cancelled. Explore the kitchen menu to order fresh meals.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={goToMenu}
                      className="min-h-11 px-5 py-2.5 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold shadow-lg shadow-orange-500/20"
                    >
                      Browse HotPot Menu
                    </button>
                    <button
                      type="button"
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

                    return (
                      <div
                        key={order.id}
                        className="bg-[#1A1D24] border border-slate-800 rounded-2xl p-5 sm:p-7 space-y-6 shadow-2xl"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                          <div>
                            <div className="flex items-center gap-2.5">
                              <span className="text-base sm:text-lg font-black font-mono text-white">#{order.id}</span>
                              <span
                                className={`px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusBadge(
                                  order.status
                                )}`}
                              >
                                {statusLabel(order.status)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              Placed at <span className="text-white font-medium">{order.orderTime || 'unknown'}</span>
                              {Number.isFinite(Number(order.etaMinutes))
                                ? ` • Estimated delivery in ${Number(order.etaMinutes)} min`
                                : ''}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openOrderTracking(order)}
                              className="min-h-11 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-orange-500/20 transition-all"
                            >
                              <Navigation className="w-4 h-4" aria-hidden="true" />
                              <span>Open Live GPS Map</span>
                            </button>
                          </div>
                        </div>

                        {/* Enhanced 4-Step Stepper */}
                        <div className="space-y-3 py-2">
                          <div className="relative flex items-center justify-between">
                            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 bg-slate-800 rounded-full z-0" />
                            <div
                              className={`absolute left-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-linear-to-r shadow-md transition-all duration-500 z-0 ${barGlowFor(
                                order.status
                              )}`}
                              style={{ width: `${(stepIdx / 3) * 100}%` }}
                            />

                            {[
                              { label: 'Placed', icon: Clock },
                              { label: 'Kitchen Prep', icon: ChefHat },
                              { label: 'Out on Road', icon: Bike },
                              { label: 'Delivered', icon: Award }
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
                                    <Icon className="w-4 h-4" aria-hidden="true" />
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
                                <div
                                  key={`${item?.id ?? item?.mealId ?? 'item'}-${i}`}
                                  className="flex justify-between text-xs"
                                >
                                  <span className="text-white">
                                    {itemQty(item)}x {item?.name}
                                  </span>
                                  <span className="font-mono text-orange-400 font-bold">
                                    {formatRWF(itemLineTotal(item))}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className="pt-2 border-t border-slate-800 flex justify-between text-xs font-bold">
                              <span className="text-white">Total Amount</span>
                              <span className="text-orange-400 font-mono">{formatRWF(order.totalRWF)}</span>
                            </div>
                          </div>

                          <div className="space-y-2 p-3.5 rounded-xl bg-[#14171F] border border-slate-800 flex flex-col justify-between">
                            <div>
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                Delivery Address
                              </span>
                              <p className="text-xs text-white font-medium mt-1">
                                {order.address || activeAddress || 'No address on file'}
                              </p>
                            </div>
                            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                              <span className="text-[11px] text-slate-400">Courier:</span>
                              <span className="text-xs font-bold text-emerald-400">
                                {order.riderName || 'Not assigned yet'}
                              </span>
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
              TAB 3: ORDER HISTORY
          ════════════════════════════════════════════════════════════════ */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-orange-400" aria-hidden="true" />
                    Order History
                  </h2>
                  <p className="text-xs text-slate-400">
                    Review past orders, open a VAT receipt, or jump back into live tracking.
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
                      type="button"
                      onClick={() => {
                        setHistoryFilter(f.id);
                        setHistoryPage(1);
                      }}
                      aria-pressed={historyFilter === f.id}
                      className={`min-h-9.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
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
                <label htmlFor="dashboard-order-search" className="sr-only">
                  Search your orders
                </label>
                <Search
                  className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  id="dashboard-order-search"
                  type="search"
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                    setHistoryPage(1);
                  }}
                  placeholder="Search orders by ID, dish name, or address..."
                  className="w-full bg-[#1A1D24] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-all min-h-11"
                />
              </div>

              {paginatedOrders.length === 0 ? (
                <div className="bg-[#1A1D24] border border-slate-800 rounded-2xl p-10 text-center space-y-3">
                  <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto" aria-hidden="true" />
                  <p className="text-xs text-slate-400">
                    {orderList.length === 0 ? 'You have not placed any orders yet.' : 'No orders match this search.'}
                  </p>
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
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${getStatusBadge(
                              order.status
                            )}`}
                          >
                            {statusLabel(order.status)}
                          </span>
                          <span className="text-xs text-slate-500">• {order.orderTime || 'Recently'}</span>
                        </div>

                        <p className="text-xs text-slate-300">
                          {(order.items || []).map((i) => `${itemQty(i)}x ${i?.name}`).join(', ') ||
                            'No items recorded'}
                        </p>

                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" aria-hidden="true" />
                          <span className="truncate">{order.address || activeAddress || 'No address on file'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                        <span className="font-mono font-bold text-sm text-orange-400">
                          {formatRWF(order.totalRWF)}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openOrderTracking(order)}
                            className="min-h-11 px-4 py-2 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/20 active:scale-95 transition-all"
                          >
                            <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Track</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedReceipt(order)}
                            className="min-h-11 px-3.5 py-2 rounded-xl bg-[#1F242D] hover:bg-white/10 border border-slate-700/60 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95"
                          >
                            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
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
                    Page <span className="text-white font-bold">{safeHistoryPage}</span> of{' '}
                    <span className="text-white font-bold">{totalPages}</span>
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={safeHistoryPage === 1}
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      className="min-h-9.5 px-3 py-1.5 rounded-xl bg-[#1A1D24] border border-slate-800 text-xs font-bold disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={safeHistoryPage === totalPages}
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
                  <Settings className="w-5 h-5 text-orange-400" aria-hidden="true" />
                  Profile &amp; Address Book
                </h2>
                <p className="text-xs text-slate-400">
                  Manage your client profile, saved Kigali delivery addresses, and payment preferences.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Edit Form (2 Cols) */}
                <div className="lg:col-span-2 bg-[#1A1D24] border border-slate-800 rounded-2xl p-5 sm:p-7 space-y-6 shadow-xl">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2 pb-3 border-b border-slate-800">
                    <User className="w-4 h-4 text-orange-400" aria-hidden="true" /> Personal Account Details
                  </h3>

                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="profile-name" className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Full Name
                        </label>
                        <input
                          id="profile-name"
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="w-full bg-[#14171F] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 min-h-11"
                          placeholder="Your Name"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label
                          htmlFor="profile-phone"
                          className="text-[11px] font-bold uppercase tracking-wider text-slate-400"
                        >
                          Phone Number (MoMo Enabled)
                        </label>
                        <input
                          id="profile-phone"
                          type="tel"
                          value={profilePhone}
                          onChange={(e) => setProfilePhone(e.target.value)}
                          className="w-full bg-[#14171F] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 min-h-11"
                          placeholder="0788000001"
                        />
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <label
                          htmlFor="profile-email"
                          className="text-[11px] font-bold uppercase tracking-wider text-slate-400"
                        >
                          Email Address
                        </label>
                        <input
                          id="profile-email"
                          type="email"
                          value={profileEmail}
                          readOnly
                          disabled
                          className="w-full bg-[#0F1117] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-400 min-h-11 cursor-not-allowed"
                          placeholder="Not set"
                        />
                        <p className="text-[11px] text-slate-500">
                          The email is tied to your sign-in account and cannot be changed here.
                        </p>
                      </div>
                    </div>

                    {/* Preferred Payment Method */}
                    <div className="space-y-2.5 pt-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                        Preferred Default Payment Method
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5" role="group" aria-label="Preferred payment method">
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
                              aria-pressed={isSelected}
                              className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2 min-h-11 ${
                                isSelected
                                  ? 'bg-orange-500/20 border-orange-500 text-white font-bold shadow-xs'
                                  : 'bg-[#14171F] border-slate-800 text-slate-400 hover:border-slate-700'
                              }`}
                            >
                              <Icon className={`w-4 h-4 ${p.color} shrink-0`} aria-hidden="true" />
                              <span className="text-xs truncate">{p.label}</span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Saved on this device only — it pre-fills checkout, it is not a stored payment method.
                      </p>
                    </div>

                    {/* Notification Alerts */}
                    <div className="space-y-2 pt-2">
                      <label htmlFor="sms-alerts" className="flex items-center justify-between p-3.5 rounded-xl bg-[#14171F] border border-slate-800 cursor-pointer min-h-11">
                        <div className="space-y-0.5">
                          <span className="text-xs font-semibold text-white block">SMS Live Tracking Updates</span>
                          <span className="text-[11px] text-slate-400 block">
                            Receive instant status updates on your phone
                          </span>
                        </div>
                        <input
                          id="sms-alerts"
                          type="checkbox"
                          checked={smsAlerts}
                          onChange={(e) => setSmsAlerts(e.target.checked)}
                          className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                        />
                      </label>
                    </div>

                    {profileError && (
                      <p role="alert" className="text-xs font-semibold text-red-300 bg-red-500/10 border border-red-500/40 rounded-xl px-3.5 py-2.5">
                        {profileError}
                      </p>
                    )}

                    <div className="pt-4 border-t border-slate-800 flex justify-end">
                      <button
                        type="submit"
                        disabled={isSavingProfile}
                        className="min-h-11 px-6 py-2.5 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs shadow-lg shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-60 flex items-center gap-2"
                      >
                        {isSavingProfile && (
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        )}
                        {isSavingProfile ? 'Saving…' : 'Save Profile Changes'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Saved Kigali Delivery Addresses (1 Col) */}
                <div className="space-y-5">
                  <div className="bg-[#1A1D24] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <h3 className="font-bold text-white text-sm flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-orange-400" aria-hidden="true" /> Saved Kigali Addresses
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsAddingAddr((open) => !open)}
                        className="text-xs font-bold text-orange-400 flex items-center gap-1 hover:underline"
                        aria-expanded={isAddingAddr}
                      >
                        <Plus className="w-4 h-4" aria-hidden="true" /> Add
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
                            aria-label="Close the add-address form"
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
                              aria-pressed={newAddrLabel === lbl}
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

                        <label htmlFor="new-address" className="sr-only">
                          Delivery address
                        </label>
                        <input
                          id="new-address"
                          type="text"
                          value={newAddrText}
                          onChange={(e) => setNewAddrText(e.target.value)}
                          placeholder="e.g. KG 178 St, Nyarutarama (Gate 12)"
                          className="w-full bg-black/40 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                        />

                        <button
                          type="submit"
                          disabled={!newAddrText.trim()}
                          className="w-full min-h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs disabled:opacity-50"
                        >
                          Save Address
                        </button>
                      </form>
                    )}

                    {/* Address List */}
                    {savedAddresses.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">
                        No saved addresses yet. Add the address you want your couriers to use.
                      </p>
                    ) : (
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
                                    aria-label={`Delete the ${addr.label} address`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <p className="text-xs text-slate-300 leading-relaxed">{addr.address}</p>
                          </div>
                        ))}
                      </div>
                    )}
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
