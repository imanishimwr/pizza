import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bike, MapPin, Phone, CheckCircle2, Navigation, DollarSign, Clock, Shield,
  X, Check, Menu, Home, ChevronLeft, ChevronRight, AlertCircle, ExternalLink,
  Settings, Key, Radio, CheckSquare, RefreshCw, User, Package, Wallet
} from 'lucide-react';
import {
  completeDelivery,
  getRiders,
  setRiderAvailability,
  verifyHandover
} from '../../services/apiService';
import { eventBus } from '../../services/eventBus';
import { notificationService } from '../../services/notificationService';

// ---------------------------------------------------------------------------
// Constants and pure helpers
// ---------------------------------------------------------------------------

const SUCCESS_BANNER_MS = 4000;
/** The rider roster is our own data, so it is polled — unlike `orders`, which
 *  is a prop and is refreshed by App.jsx. */
const PROFILE_POLL_MS = 20000;

/** The server hands out six digits and only six. */
const HANDOVER_CODE_LENGTH = 6;

/** The only two transitions a courier is allowed to drive, and both of them
 *  have their own endpoint so the state machine can enforce the handover code
 *  and the commission. There is deliberately no plain status PATCH here. */
const PICKUP_STATUSES = ['preparing', 'ready'];
const DROPOFF_STATUSES = ['delivery'];

const RESTAURANT = Object.freeze({
  name: 'HotPot Delights Kitchen HQ',
  address: 'KG 7 Ave, Kimihurura, Kigali'
});

const STATUS_BADGE = {
  pending: 'bg-orange-500/20 text-orange-300 border-orange-500/50 font-semibold',
  preparing: 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-semibold',
  ready: 'bg-emerald-500/25 text-emerald-300 border-emerald-400/60 font-bold',
  delivery: 'bg-blue-500/20 text-blue-300 border-blue-500/50 font-semibold',
  delivered: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-semibold',
  cancelled: 'bg-red-500/20 text-red-300 border-red-500/50 font-semibold'
};

const statusBadge = (status) =>
  STATUS_BADGE[status] || 'bg-slate-700/40 text-slate-300 border-slate-600/50 font-semibold';
const statusLabel = (status) =>
  status ? String(status).charAt(0).toUpperCase() + String(status).slice(1) : 'unknown';

const formatRwf = (value) =>
  Number.isFinite(Number(value)) ? Number(value).toLocaleString('en-US') : '—';

const formatWhen = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

const formatClock = (value) => {
  if (!value) return 'never';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'never' : date.toLocaleTimeString();
};

const initialsOf = (name) => {
  const text = String(name || '').trim();
  return text ? text.charAt(0).toUpperCase() : '?';
};

/** `tel:` hrefs must not be able to smuggle a scheme in from order data. */
const telHref = (phone) => {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : null;
};

const isSameId = (a, b) => a !== null && a !== undefined && b !== null && b !== undefined && String(a) === String(b);

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------

function SectionCard({ icon, title, children, className = '' }) {
  return (
    <section className={`p-5 rounded-2xl bg-[#14171F] border border-slate-800 shadow-lg space-y-4 ${className}`}>
      <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function DetailRow({ label, value, valueClass = 'text-white font-bold' }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-slate-800/60 last:border-0">
      <span className="text-slate-400 shrink-0">{label}</span>
      <span className={`text-right min-w-0 wrap-break-word ${valueClass}`}>{value}</span>
    </div>
  );
}

/** Used for every figure the backend has not told us yet. */
function UnknownValue({ what }) {
  return <span className="text-slate-500">&mdash; not reported yet ({what})</span>;
}

function EmptyState({ icon, title, children }) {
  return (
    <div className="p-8 text-center bg-[#14171F] rounded-2xl border border-slate-800 text-slate-400 space-y-2">
      <span className="inline-flex text-slate-600">{icon}</span>
      <p className="text-xs font-bold text-white">{title}</p>
      {children ? <div className="text-[11px] space-y-1">{children}</div> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RiderDashboard({ orders = [], user, onGoHome }) {
  // Navigation / layout
  const [activeTab, setActiveTab] = useState('dispatch');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [mobileViewMode, setMobileViewMode] = useState('list'); // 'list' | 'route'

  // Announcements. Errors are assertive and stay until replaced.
  const [banner, setBanner] = useState(null);
  const bannerTimerRef = useRef(null);

  // This rider's own courier record. Everything about duty, plate and earnings
  // comes from here; nothing is invented when it is missing.
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [dutyPending, setDutyPending] = useState(false);

  // Orders
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // Handover code modal
  const [pinOpen, setPinOpen] = useState(false);
  const [pinOrderId, setPinOrderId] = useState(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinPending, setPinPending] = useState(false);

  // Drop-off confirmation modal
  const [dropOffOpen, setDropOffOpen] = useState(false);
  const [dropOffOrderId, setDropOffOrderId] = useState(null);
  const [dropOffPending, setDropOffPending] = useState(false);

  // New-assignment chime
  const [newAssignment, setNewAssignment] = useState(null);
  const seenAssignmentsRef = useRef(new Set());
  const hasSeededAssignmentsRef = useRef(false);

  // -------------------------------------------------------------------------
  // Announcements
  // -------------------------------------------------------------------------

  const announce = useCallback((tone, text) => {
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = null;
    setBanner({ tone, text });
    if (tone === 'success') {
      bannerTimerRef.current = setTimeout(() => {
        setBanner((prev) => (prev && prev.tone === 'success' ? null : prev));
        bannerTimerRef.current = null;
      }, SUCCESS_BANNER_MS);
    }
  }, []);

  useEffect(() => () => {
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
  }, []);

  // -------------------------------------------------------------------------
  // This rider's courier record
  // -------------------------------------------------------------------------

  /**
   * `getRiders()` is staff-only, so this is also our sign-in check. A rider
   * account that has no courier record is told so plainly instead of being
   * handed a fabricated shift summary.
   */
  const loadProfile = useCallback(async ({ quiet = false } = {}) => {
    if (!user?.id) {
      setProfile(null);
      setProfileError('You are not signed in, so your courier record cannot be loaded.');
      setProfileLoading(false);
      return;
    }
    if (!quiet) setProfileLoading(true);
    try {
      const roster = await getRiders();
      const list = Array.isArray(roster) ? roster : [];
      // The courier id is the id on the courier record. Auth users and courier
      // records are separate rows, so match on the id first and the email the
      // account signed up with second. Never guess from the URL or a hardcode.
      const mine =
        list.find((r) => isSameId(r.id, user.id)) ||
        (user.email ? list.find((r) => isSameId(r.email, user.email)) : null) ||
        null;
      setProfile(mine);
      setProfileError(mine ? '' : 'No courier profile is linked to this account yet. Ask an admin to add you to the fleet.');
    } catch (err) {
      setProfile(null);
      setProfileError(err?.message || 'Could not load your courier record.');
    } finally {
      setProfileLoading(false);
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    const off = eventBus.on('ORDER_STATUS_UPDATE', () => {
      loadProfile({ quiet: true });
    });
    const timer = setInterval(() => loadProfile({ quiet: true }), PROFILE_POLL_MS);
    return () => {
      off();
      clearInterval(timer);
    };
  }, [loadProfile]);

  // -------------------------------------------------------------------------
  // Order selection
  // -------------------------------------------------------------------------

  /** Only orders this courier is actually assigned to. The old screen listed
   *  every `preparing`/`ready` order in the shop, which is not a queue. */
  const myActiveOrders = useMemo(() => {
    if (!profile) return [];
    return orders.filter(
      (o) => isSameId(o.riderId, profile.id) && PICKUP_STATUSES.concat(DROPOFF_STATUSES).includes(o.status)
    );
  }, [orders, profile]);

  const myCompletedOrders = useMemo(() => {
    if (!profile) return [];
    return orders.filter((o) => isSameId(o.riderId, profile.id) && o.status === 'delivered');
  }, [orders, profile]);

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return myActiveOrders[0] || null;
    return myActiveOrders.find((o) => isSameId(o.id, selectedOrderId)) || myActiveOrders[0] || null;
  }, [myActiveOrders, selectedOrderId]);

  const isOnDuty = profile ? Boolean(profile.is_available) : false;
  const earningsToday = profile ? Number(profile.earnings_today) : null;
  const completedToday = profile ? Number(profile.completed_today) : null;
  const plateNumber = profile?.plateNumber || null;
  const vehicleType = profile?.vehicleType || null;
  const riderName = profile?.name || user?.name || 'Courier';

  // -------------------------------------------------------------------------
  // New assignment detection
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!profile) return;
    // The first pass only records what is already on screen; a chime for work
    // that predates the login is noise.
    if (!hasSeededAssignmentsRef.current) {
      myActiveOrders.forEach((o) => seenAssignmentsRef.current.add(String(o.id)));
      hasSeededAssignmentsRef.current = true;
      return;
    }
    const fresh = myActiveOrders.find((o) => !seenAssignmentsRef.current.has(String(o.id)));
    myActiveOrders.forEach((o) => seenAssignmentsRef.current.add(String(o.id)));
    if (!fresh) return;
    notificationService.playChime('order_ready');
    setNewAssignment(fresh);
  }, [myActiveOrders, profile]);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const handleToggleDuty = useCallback(async () => {
    if (!profile || dutyPending) return;
    const next = !profile.is_available;
    setDutyPending(true);
    setProfile((prev) => (prev ? { ...prev, is_available: next } : prev));
    try {
      const updated = await setRiderAvailability(profile.id, next);
      setProfile((prev) => (prev ? { ...prev, ...(updated || {}), is_available: next } : prev));
      announce('success', next ? 'You are on duty and visible to dispatch.' : 'You are off duty.');
    } catch (err) {
      // Roll the switch back so it never claims a state the server rejected.
      setProfile((prev) => (prev ? { ...prev, is_available: !next } : prev));
      announce('error', err?.message || 'Could not change your duty status.');
    } finally {
      setDutyPending(false);
    }
  }, [profile, dutyPending, announce]);

  const openPinModal = useCallback((orderId) => {
    setPinOrderId(orderId);
    setEnteredPin('');
    setPinError('');
    setPinOpen(true);
  }, []);

  /**
   * The customer reads the six digits off their own screen and says them out
   * loud. The rider types them here. The code is never fetched, displayed,
   * pre-filled or hinted at anywhere on this page.
   */
  const handleVerifyHandover = useCallback(async (event) => {
    event.preventDefault();
    const order = myActiveOrders.find((o) => isSameId(o.id, pinOrderId));
    if (!order || !profile) return;

    const code = enteredPin.trim();
    if (!/^\d{6}$/.test(code)) {
      setPinError(`The handover code is ${HANDOVER_CODE_LENGTH} digits. Type the ${HANDOVER_CODE_LENGTH} digits the customer gave you.`);
      return;
    }

    setPinError('');
    setPinPending(true);
    try {
      await verifyHandover(order.id, code, profile.id);
      setPinOpen(false);
      setEnteredPin('');
      setPinOrderId(null);
      notificationService.playChime('status_update');
      announce('success', `Pickup confirmed. Order #${order.id} is out for delivery.`);
      await loadProfile({ quiet: true });
    } catch (err) {
      // 409 means someone already moved this order on; the message the server
      // sends is the accurate one, so show it instead of a generic failure.
      setPinError(err?.message || 'Could not confirm that handover code.');
      announce('error', err?.message || 'Could not confirm that handover code.');
    } finally {
      setPinPending(false);
    }
  }, [myActiveOrders, pinOrderId, enteredPin, profile, announce, loadProfile]);

  const handleCompleteDelivery = useCallback(async () => {
    const order = myActiveOrders.find((o) => isSameId(o.id, dropOffOrderId));
    if (!order || !profile) return;

    setDropOffPending(true);
    try {
      await completeDelivery(order.id, profile.id);
      setDropOffOpen(false);
      setDropOffOrderId(null);
      notificationService.playChime('status_update');
      announce('success', `Order #${order.id} delivered. Your shift total has been credited.`);
      await loadProfile({ quiet: true });
    } catch (err) {
      setDropOffOpen(false);
      announce('error', err?.message || 'Could not complete that delivery.');
    } finally {
      setDropOffPending(false);
    }
  }, [myActiveOrders, dropOffOrderId, profile, announce, loadProfile]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const navItems = [
    { id: 'dispatch', label: 'Active Dispatch', icon: Bike, badge: myActiveOrders.length, pulse: myActiveOrders.length > 0 },
    { id: 'trips', label: 'Completed Trips', icon: CheckCircle2, badge: myCompletedOrders.length },
    { id: 'settings', label: 'Vehicle & Profile', icon: Settings }
  ];

  const selectedStatus = selectedOrder?.status;
  const canConfirmPickup = Boolean(selectedOrder) && PICKUP_STATUSES.includes(selectedStatus);
  const canCompleteDropOff = Boolean(selectedOrder) && DROPOFF_STATUSES.includes(selectedStatus);
  const pinOrder = myActiveOrders.find((o) => isSameId(o.id, pinOrderId)) || null;
  const dropOffOrder = myActiveOrders.find((o) => isSameId(o.id, dropOffOrderId)) || null;

  return (
    <div className="flex h-screen w-full bg-[#0F1117] text-slate-100 font-sans overflow-hidden">
      {/* Announcements */}
      <div aria-live="polite" className="sr-only">
        {banner?.tone === 'success' ? banner.text : ''}
      </div>
      {banner && (
        <div
          role={banner.tone === 'error' ? 'alert' : 'status'}
          aria-live={banner.tone === 'error' ? 'assertive' : 'polite'}
          className={`fixed top-5 right-5 z-50 max-w-sm p-3.5 px-4 rounded-xl shadow-2xl flex items-start gap-2.5 text-xs font-semibold border ${
            banner.tone === 'error'
              ? 'bg-red-950/95 text-red-200 border-red-500/50'
              : 'bg-[#1A1D24]/95 text-emerald-300 border-emerald-500/50'
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

      {/* Persistent error / missing-profile banners */}
      {profileError && (
        <div
          role="alert"
          className="fixed top-16 right-5 z-40 max-w-sm p-3.5 rounded-xl bg-[#1A1D24] border border-amber-500/50 text-amber-200 text-xs font-semibold flex items-start gap-2.5 shadow-xl"
        >
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-px" aria-hidden="true" />
          <span className="space-y-2 block">
            {profileError}
            <button
              type="button"
              onClick={() => loadProfile()}
              className="flex items-center gap-1.5 underline hover:no-underline"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Retry
            </button>
          </span>
        </div>
      )}

      {isMobileDrawerOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setIsMobileDrawerOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* ══════════════════════════ SIDEBAR ══════════════════════════ */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 md:static bg-[#14171F] border-r border-slate-800 flex flex-col shrink-0 transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'md:w-16' : 'md:w-64'
        } ${isMobileDrawerOpen ? 'translate-x-0 w-72 shadow-2xl' : '-translate-x-full md:translate-x-0'}`}
      >
        <div className="h-16 px-3.5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-linear-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0 text-white">
              <Bike className="w-5 h-5" aria-hidden="true" />
            </span>
            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <span className="text-xs font-black tracking-wider text-white uppercase block truncate">HotPot Kigali</span>
                <span className="text-[10px] text-amber-400 font-bold block truncate">Courier Dispatch</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsMobileDrawerOpen(false);
                onGoHome?.();
              }}
              className="p-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 hover:text-white transition-all min-h-9 min-w-9 flex items-center justify-center"
              title="Return to the store menu"
            >
              <Home className="w-4 h-4" aria-hidden="true" />
              <span className="sr-only">Return to the store menu</span>
            </button>
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(false)}
              className="md:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all min-h-9 min-w-9 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-orange-400" aria-hidden="true" />
              <span className="sr-only">Close navigation menu</span>
            </button>
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((v) => !v)}
              className="hidden md:flex p-1.5 rounded-lg bg-[#1F242D] hover:bg-white/10 border border-slate-700/50 text-slate-400 hover:text-white transition-all"
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span className="sr-only">{isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-3 space-y-4">
          {/* Duty toggle */}
          <div
            className={`p-3 rounded-2xl border transition-all ${
              isOnDuty ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-800/40 border-slate-700/60'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              {!isSidebarCollapsed && (
                <div className="min-w-0 pr-2">
                  <span className="text-xs font-black text-white truncate flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${isOnDuty ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}
                      aria-hidden="true"
                    />
                    {profile ? (isOnDuty ? 'Available for orders' : 'Off duty') : 'Duty status unknown'}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {profile
                      ? isOnDuty
                        ? 'Dispatch can assign you to a run'
                        : 'You will not receive new runs'
                      : 'Sign in with a courier account to go on duty'}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={handleToggleDuty}
                disabled={!profile || dutyPending}
                aria-pressed={isOnDuty}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-400/50 disabled:opacity-40 disabled:cursor-not-allowed ${
                  isOnDuty ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                    isOnDuty ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
                <span className="sr-only">
                  {dutyPending ? 'Saving duty status' : isOnDuty ? 'Go off duty' : 'Go on duty'}
                </span>
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="space-y-1.5">
            {!isSidebarCollapsed && (
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2.5 mb-1.5 block">Navigation</span>
            )}
            {navItems.map((tab) => {
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all min-h-11 focus:outline-none focus:ring-2 focus:ring-orange-400/50 ${
                    isActive
                      ? 'bg-linear-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  } ${isSidebarCollapsed ? 'md:justify-center md:px-0' : ''}`}
                  title={tab.label}
                >
                  <span className="relative shrink-0 flex items-center justify-center">
                    <Icon className="w-4 h-4" aria-hidden="true" />
                    {tab.pulse && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-ping" aria-hidden="true" />
                    )}
                  </span>
                  <span className={`flex-1 text-left truncate ${isSidebarCollapsed ? 'md:hidden' : ''}`}>{tab.label}</span>
                  {tab.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold shrink-0 ${
                        isActive ? 'bg-black/30 text-white' : 'bg-white/10 text-slate-300'
                      } ${isSidebarCollapsed ? 'md:hidden' : ''}`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Shift metrics */}
          <div className="space-y-2.5 pt-3 border-t border-slate-800">
            {!isSidebarCollapsed && (
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2.5 block">Shift Metrics</span>
            )}

            <div
              className={`p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-between min-h-10 ${
                isSidebarCollapsed ? 'md:justify-center md:p-2' : ''
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <Radio className="w-3.5 h-3.5 text-orange-400 shrink-0" aria-hidden="true" />
                <span className={`text-xs font-semibold text-slate-300 ${isSidebarCollapsed ? 'md:hidden' : ''}`}>Active runs</span>
              </span>
              <span className={`font-mono font-bold text-xs text-orange-400 ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
                {profile ? myActiveOrders.length : '—'}
              </span>
            </div>

            <div
              className={`p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between min-h-10 ${
                isSidebarCollapsed ? 'md:justify-center md:p-2' : ''
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" aria-hidden="true" />
                <span className={`text-xs font-semibold text-slate-300 ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
                  Completed today
                </span>
              </span>
              <span className={`font-mono font-bold text-xs text-blue-400 ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
                {completedToday === null || Number.isNaN(completedToday) ? '—' : completedToday}
              </span>
            </div>

            <div
              className={`p-3 rounded-2xl bg-[#10131A] border border-slate-800 text-center ${
                isSidebarCollapsed ? 'md:p-2' : ''
              }`}
            >
              <span className={`text-[10px] uppercase font-bold text-slate-400 block ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
                Today&rsquo;s earnings
              </span>
              <div className="text-sm sm:text-base font-mono font-extrabold text-amber-400 truncate">
                {earningsToday === null || Number.isNaN(earningsToday) ? (
                  <span className="text-slate-500">&mdash;</span>
                ) : (
                  earningsToday.toLocaleString()
                )}{' '}
                <span className="text-[10px] font-sans font-normal text-slate-400">RWF</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-slate-800 bg-[#10131A] shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-linear-to-br from-orange-500 to-amber-600 flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-sm border border-white/10">
              {initialsOf(riderName)}
            </span>
            {!isSidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">{riderName}</div>
                <div className="mt-0.5">
                  <span className="inline-block px-1.5 py-0.2 rounded-md bg-orange-500/15 border border-orange-500/30 text-[10px] font-mono font-bold text-orange-400">
                    {plateNumber || 'no plate on file'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ══════════════════════════ MAIN CANVAS ══════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-16 bg-[#14171F] border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="md:hidden p-2.5 rounded-xl bg-[#1A1D24] border border-slate-800 text-slate-300 hover:text-white min-h-11 min-w-11 flex items-center justify-center"
            >
              <Menu className="w-5 h-5 text-orange-400" aria-hidden="true" />
              <span className="sr-only">Open navigation menu</span>
            </button>

            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-sm sm:text-base font-black text-white truncate">Courier Dispatch Console</h1>
                {plateNumber && (
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/30 text-amber-400 text-[11px] font-mono font-bold shrink-0">
                    {plateNumber}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate hidden xs:block">
                {profile
                  ? `${riderName} · ${statusLabel(profile.status)} · last seen ${formatClock(profile.lastSeenAt)}`
                  : 'Courier record not loaded'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onGoHome?.()}
              className="min-h-9.5 px-3 py-1.5 rounded-xl bg-[#1A1D24] hover:bg-orange-500/15 border border-slate-700 hover:border-orange-500/40 text-slate-300 hover:text-orange-300 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Home className="w-4 h-4 text-orange-400" aria-hidden="true" />
              <span className="hidden sm:inline">Store Home</span>
              <span className="sm:hidden sr-only">Store Home</span>
            </button>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1A1D24] border border-amber-500/30 text-amber-400 text-xs font-bold">
              <DollarSign className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <span>{earningsToday === null || Number.isNaN(earningsToday) ? '— RWF' : `${formatRwf(earningsToday)} RWF`}</span>
            </div>

            <button
              type="button"
              onClick={handleToggleDuty}
              disabled={!profile || dutyPending}
              className={`min-h-9.5 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border disabled:opacity-40 disabled:cursor-not-allowed ${
                isOnDuty
                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800/60 hover:bg-slate-700/60 border-slate-700 text-slate-400'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${isOnDuty ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}
                aria-hidden="true"
              />
              <span>{!profile ? 'UNKNOWN' : dutyPending ? 'SAVING' : isOnDuty ? 'ON DUTY' : 'OFF DUTY'}</span>
              <span className="sr-only">{isOnDuty ? 'Go off duty' : 'Go on duty'}</span>
            </button>
          </div>
        </header>

        {/* ── TAB: DISPATCH ── */}
        {activeTab === 'dispatch' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="md:hidden flex border-b border-slate-800 bg-[#14171F] p-2 gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setMobileViewMode('list')}
                aria-pressed={mobileViewMode === 'list'}
                className={`flex-1 min-h-11 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  mobileViewMode === 'list'
                    ? 'bg-linear-to-r from-orange-500 to-amber-600 text-white'
                    : 'bg-[#1A1D24] text-slate-400 border border-slate-800'
                }`}
              >
                <Bike className="w-4 h-4" aria-hidden="true" />
                <span>Queue ({profile ? myActiveOrders.length : 0})</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileViewMode('route')}
                aria-pressed={mobileViewMode === 'route'}
                className={`flex-1 min-h-11 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  mobileViewMode === 'route'
                    ? 'bg-linear-to-r from-orange-500 to-amber-600 text-white'
                    : 'bg-[#1A1D24] text-slate-400 border border-slate-800'
                }`}
              >
                <Navigation className="w-4 h-4" aria-hidden="true" />
                <span>Route</span>
              </button>
            </div>

            <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
              {/* Queue */}
              <div
                className={`w-full md:w-[38%] lg:w-[33%] flex flex-col border-r border-slate-800 bg-[#10131A] shrink-0 min-h-0 ${
                  mobileViewMode === 'route' ? 'hidden md:flex' : 'flex'
                }`}
              >
                <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-[#14171F]">
                  <h2 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <Bike className="w-4 h-4 text-orange-400" aria-hidden="true" />
                    My active runs
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-mono text-xs font-bold border border-orange-500/40">
                    {profile ? myActiveOrders.length : 0}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-3.5 space-y-3">
                  {profileLoading ? (
                    <p className="p-6 text-center text-xs text-slate-400">Loading your courier record&hellip;</p>
                  ) : !profile ? (
                    <EmptyState
                      icon={<AlertCircle className="w-8 h-8" aria-hidden="true" />}
                      title="No courier record"
                    >
                      <p>{profileError || 'Your courier record could not be loaded.'}</p>
                    </EmptyState>
                  ) : myActiveOrders.length === 0 ? (
                    <EmptyState icon={<Bike className="w-8 h-8" aria-hidden="true" />} title="No active runs assigned to you">
                      <p>Dispatch assigns runs once the kitchen marks them ready.</p>
                      {!isOnDuty && <p>You are off duty, so you will not be given new runs.</p>}
                    </EmptyState>
                  ) : (
                    myActiveOrders.map((order) => {
                      const isSelected = isSameId(selectedOrder?.id, order.id);
                      return (
                        <button
                          key={order.id}
                          type="button"
                          onClick={() => {
                            setSelectedOrderId(order.id);
                            setMobileViewMode('route');
                          }}
                          aria-pressed={isSelected}
                          className={`w-full text-left p-4 rounded-2xl border transition-all space-y-3 shadow-md focus:outline-none focus:ring-2 focus:ring-orange-400/50 ${
                            isSelected
                              ? 'bg-[#1A1D24] border-orange-500 ring-1 ring-orange-500/40'
                              : 'bg-[#14171F] border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="font-mono font-bold text-white text-sm">#{order.id}</span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${statusBadge(order.status)}`}
                            >
                              {order.status}
                            </span>
                          </span>

                          <span className="block space-y-1 text-xs">
                            <span className="font-bold text-white flex items-center justify-between gap-2">
                              <span className="truncate">{order.customerName || 'Customer'}</span>
                              <span className="font-mono text-amber-400 font-bold shrink-0">{formatRwf(order.totalRWF)} RWF</span>
                            </span>
                            <span className="text-slate-400 flex items-center gap-1.5 pt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" aria-hidden="true" />
                              <span className="truncate text-[11px]">{order.address || 'No address on file'}</span>
                            </span>
                          </span>

                          <span className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" aria-hidden="true" /> {formatWhen(order.createdAt)}
                            </span>
                            <span
                              className={`min-h-9 px-3 py-1.5 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-linear-to-r from-orange-500 to-amber-600 text-white'
                                  : 'bg-[#1F242D] text-slate-300 border border-slate-700/60'
                              }`}
                            >
                              <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
                              Route
                            </span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Route + actions */}
              <div
                className={`flex-1 flex flex-col min-w-0 overflow-y-auto no-scrollbar scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-4 sm:p-6 lg:p-8 space-y-6 bg-[#0F1117] ${
                  mobileViewMode === 'list' ? 'hidden md:flex' : 'flex'
                }`}
              >
                {!profile ? (
                  <EmptyState icon={<AlertCircle className="w-10 h-10" aria-hidden="true" />} title="Courier record unavailable">
                    <p>{profileError || 'Sign in with a courier account to see your runs.'}</p>
                  </EmptyState>
                ) : !selectedOrder ? (
                  <EmptyState icon={<Bike className="w-12 h-12" aria-hidden="true" />} title="No run selected">
                    <p>Pick a run from the queue to see the route and the next action.</p>
                  </EmptyState>
                ) : (
                  <>
                    <div className="p-5 sm:p-6 rounded-2xl bg-[#14171F] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-xl sm:text-2xl font-black font-mono text-white">Order #{selectedOrder.id}</span>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${statusBadge(selectedOrder.status)}`}
                          >
                            {selectedOrder.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Courier: <strong className="text-white">{riderName}</strong>
                          {plateNumber ? (
                            <>
                              {' '}&bull;{' '}
                              <strong className="text-amber-400 font-mono">{plateNumber}</strong>
                            </>
                          ) : null}
                          {' '}&bull; assigned {formatWhen(selectedOrder.assignedAt)}
                        </p>
                      </div>

                      {telHref(selectedOrder.customerPhone) && (
                        <a
                          href={telHref(selectedOrder.customerPhone)}
                          className="min-h-11 px-5 py-2.5 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95 transition-all self-start sm:self-auto"
                        >
                          <Phone className="w-4 h-4" aria-hidden="true" />
                          <span>Call customer</span>
                        </a>
                      )}
                    </div>

                    {/* Pickup / drop-off */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      <div className="p-5 rounded-2xl bg-[#1A1D24] border border-slate-800 space-y-3 shadow-lg">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Home className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" /> Pickup
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-400 font-mono text-[10px] font-bold">
                            ORIGIN
                          </span>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{RESTAURANT.name}</h4>
                          <p className="text-xs text-slate-300 mt-1">{RESTAURANT.address}</p>
                          <p className="text-[11px] text-slate-400 font-semibold mt-2">
                            {selectedOrder.status === 'ready'
                              ? 'Packed and waiting at the pass.'
                              : 'Still being prepared by the kitchen.'}
                          </p>
                        </div>
                      </div>

                      <div className="p-5 rounded-2xl bg-[#1A1D24] border border-slate-800 space-y-3 shadow-lg flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" /> Drop-off
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-400 font-mono text-[10px] font-bold">
                              DESTINATION
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-white mt-2">{selectedOrder.customerName || 'Customer'}</h4>
                          <p className="text-xs text-slate-300 mt-1">{selectedOrder.address || 'No address on file'}</p>
                        </div>
                        {selectedOrder.address ? (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedOrder.address)}`}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="min-h-11 px-4 py-2 rounded-xl bg-[#1F242D] hover:bg-white/10 border border-slate-700/60 text-slate-200 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all mt-2"
                          >
                            <Navigation className="w-4 h-4 text-orange-400" aria-hidden="true" />
                            <span>Open route in Google Maps</span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400 ml-auto" aria-hidden="true" />
                          </a>
                        ) : null}
                      </div>
                    </div>

                    {/* Bill */}
                    <SectionCard icon={<Package className="w-4 h-4 text-orange-400" aria-hidden="true" />} title="Items & bill">
                      <div className="space-y-2">
                        {(selectedOrder.items || []).map((item, index) => {
                          const qty = Number(item.qty ?? item.quantity ?? 1) || 1;
                          const unit = Number(item.price ?? item.unitPrice ?? 0) || 0;
                          return (
                            <div
                              key={item.id || `${item.name}-${index}`}
                              className="flex items-center justify-between gap-3 text-xs py-1 border-b border-slate-800/60 last:border-0"
                            >
                              <span className="text-white font-medium">
                                {qty}x {item.name}
                                {item.specialNote ? (
                                  <span className="block text-[11px] text-amber-300 font-normal">{item.specialNote}</span>
                                ) : null}
                              </span>
                              <span className="font-mono text-slate-400 shrink-0">{(unit * qty).toLocaleString()} RWF</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-300">Order total</span>
                        <span className="text-amber-400 font-mono text-sm">{formatRwf(selectedOrder.totalRWF)} RWF</span>
                      </div>
                    </SectionCard>

                    {/* Legal next steps only */}
                    <SectionCard
                      icon={<CheckSquare className="w-4 h-4 text-orange-400" aria-hidden="true" />}
                      title="Next step"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {canCompleteDropOff ? (
                          <button
                            type="button"
                            onClick={() => {
                              setDropOffOrderId(selectedOrder.id);
                              setDropOffOpen(true);
                            }}
                            className="min-h-12 px-5 py-3 rounded-xl bg-linear-to-r from-emerald-500 to-green-600 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
                          >
                            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                            <span>Mark delivered</span>
                          </button>
                        ) : (
                          <div className="min-h-12 px-5 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-blue-600/20 border border-blue-500 text-blue-300">
                            <Navigation className="w-4 h-4 text-blue-400" aria-hidden="true" />
                            <span>In transit</span>
                          </div>
                        )}

                        {canConfirmPickup ? (
                          <button
                            type="button"
                            onClick={() => openPinModal(selectedOrder.id)}
                            className="min-h-12 px-5 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95 bg-linear-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/20"
                          >
                            <Key className="w-4 h-4" aria-hidden="true" />
                            <span>{selectedStatus === 'ready' ? 'Confirm pickup' : 'Confirm pickup (once ready)'}</span>
                          </button>
                        ) : (
                          <div className="min-h-12 px-5 py-3 rounded-xl bg-slate-800/40 border border-slate-700 text-slate-400 font-bold text-xs flex items-center justify-center gap-2">
                            <Key className="w-4 h-4" aria-hidden="true" />
                            <span>Pickup already confirmed</span>
                          </div>
                        )}
                      </div>

                      {canConfirmPickup && (
                        <p className="text-[11px] text-slate-400">
                          The handover code is the {HANDOVER_CODE_LENGTH} digits the customer reads out to you. This screen never shows
                          it to you &mdash; you have to be given it.
                        </p>
                      )}
                    </SectionCard>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: TRIPS ── */}
        {activeTab === 'trips' && (
          <div className="flex-1 overflow-y-auto no-scrollbar [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-4 sm:p-6 lg:p-8 space-y-6 bg-[#0F1117]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-amber-400" aria-hidden="true" />
                  Delivered runs
                </h2>
                <p className="text-xs text-slate-400">Every order this courier account has marked delivered.</p>
              </div>
              <div className="px-4 py-2 rounded-xl bg-[#14171F] border border-amber-500/30 text-amber-400 font-mono text-sm font-bold self-start sm:self-auto">
                Shift total: {earningsToday === null || Number.isNaN(earningsToday) ? '—' : `${formatRwf(earningsToday)} RWF`}
              </div>
            </div>

            {!profile ? (
              <EmptyState icon={<AlertCircle className="w-10 h-10" aria-hidden="true" />} title="Courier record unavailable">
                <p>{profileError || 'Sign in with a courier account to see your history.'}</p>
              </EmptyState>
            ) : myCompletedOrders.length === 0 ? (
              <EmptyState icon={<CheckCircle2 className="w-10 h-10" aria-hidden="true" />} title="No delivered runs yet">
                <p>Completed deliveries appear here once the server records them.</p>
              </EmptyState>
            ) : (
              <div className="space-y-3">
                {myCompletedOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 sm:p-5 rounded-2xl bg-[#14171F] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sm text-white">#{order.id}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                          DELIVERED
                        </span>
                        <span className="text-xs text-slate-400 truncate">&bull; {order.customerName || 'Customer'}</span>
                      </div>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" aria-hidden="true" />
                        <span className="truncate">{order.address || 'No address on file'}</span>
                      </p>
                      <p className="text-[11px] text-slate-500">Delivered {formatWhen(order.updatedAt || order.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 uppercase block">Order total</span>
                        <span className="font-mono font-bold text-white text-xs">{formatRwf(order.totalRWF)} RWF</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: SETTINGS ── */}
        {activeTab === 'settings' && (
          <div className="flex-1 overflow-y-auto no-scrollbar [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-4 sm:p-6 lg:p-8 space-y-6 bg-[#0F1117]">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-orange-400" aria-hidden="true" />
                Vehicle &amp; rider profile
              </h2>
              <p className="text-xs text-slate-400">Read from your courier record. Edit it from the admin dashboard.</p>
            </div>

            {!profile ? (
              <EmptyState icon={<AlertCircle className="w-10 h-10" aria-hidden="true" />} title="Courier record unavailable">
                <p>{profileError || 'Sign in with a courier account to see your profile.'}</p>
                <p>Fields the server has not stored are shown as &ldquo;not reported yet&rdquo; rather than guessed.</p>
              </EmptyState>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SectionCard icon={<User className="w-4 h-4 text-orange-400" aria-hidden="true" />} title="Courier details">
                  <div className="space-y-3 text-xs">
                    <DetailRow label="Full name" value={profile.name || <UnknownValue what="no name stored" />} />
                    <DetailRow label="Email" value={profile.email || <UnknownValue what="no email stored" />} />
                    <DetailRow label="Contact number" value={profile.phone || <UnknownValue what="no phone stored" />} />
                    <DetailRow
                      label="License plate"
                      valueClass="text-amber-400 font-mono font-bold"
                      value={plateNumber || <UnknownValue what="no plate stored" />}
                    />
                    <DetailRow
                      label="Vehicle"
                      value={vehicleType || <UnknownValue what="no vehicle type stored" />}
                    />
                    <DetailRow
                      label="Shift"
                      value={profile.shift || <UnknownValue what="no shift stored" />}
                    />
                  </div>
                </SectionCard>

                <SectionCard icon={<Wallet className="w-4 h-4 text-orange-400" aria-hidden="true" />} title="Shift totals">
                  <div className="space-y-3 text-xs">
                    <DetailRow
                      label="Earnings today"
                      valueClass="text-amber-400 font-mono font-bold"
                      value={
                        earningsToday === null || Number.isNaN(earningsToday)
                          ? <UnknownValue what="not in your record" />
                          : `${formatRwf(earningsToday)} RWF`
                      }
                    />
                    <DetailRow
                      label="Deliveries today"
                      value={
                        completedToday === null || Number.isNaN(completedToday)
                          ? <UnknownValue what="not in your record" />
                          : completedToday
                      }
                    />
                    <DetailRow label="Duty status" value={statusLabel(profile.status)} />
                    <DetailRow
                      label="Available for dispatch"
                      value={profile.is_available ? 'Yes' : 'No'}
                    />
                    <DetailRow label="Last GPS ping" value={formatWhen(profile.lastSeenAt)} />
                  </div>
                </SectionCard>

                <SectionCard
                  icon={<Shield className="w-4 h-4 text-orange-400" aria-hidden="true" />}
                  title="Safety equipment"
                  className="lg:col-span-2"
                >
                  <p className="text-xs text-slate-400">
                    The old build showed a checklist of safety gear that was hardcoded and always ticked. There is no server record of
                    what you are actually carrying, so nothing is ticked here.
                  </p>
                </SectionCard>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════ HANDOVER CODE MODAL ══════════════════════════ */}
      {pinOpen && pinOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pin-modal-title"
            className="bg-[#14171F] border border-orange-500/50 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center shrink-0">
                  <Key className="w-5 h-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 id="pin-modal-title" className="font-bold text-white text-base">
                    Confirm package pickup
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate">
                    Order #{pinOrder.id} &bull; {RESTAURANT.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPinOpen(false)}
                disabled={pinPending}
                className="p-2 rounded-lg text-slate-400 hover:text-white min-h-9 min-w-9 flex items-center justify-center"
              >
                <X className="w-5 h-5" aria-hidden="true" />
                <span className="sr-only">Cancel pickup confirmation</span>
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Ask the customer to read you the <strong className="text-amber-400">{HANDOVER_CODE_LENGTH}-digit handover code</strong>{' '}
              on their order screen. It confirms the right order reached the right courier.
            </p>

            {pinError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" aria-hidden="true" />
                <span>{pinError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyHandover} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="handover-code" className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block text-center">
                  Handover code
                </label>
                <input
                  id="handover-code"
                  name="handover-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  maxLength={HANDOVER_CODE_LENGTH}
                  autoFocus
                  required
                  value={enteredPin}
                  onChange={(e) => {
                    setEnteredPin(e.target.value.replace(/\D/g, '').slice(0, HANDOVER_CODE_LENGTH));
                    setPinError('');
                  }}
                  aria-describedby="handover-code-hint"
                  aria-invalid={Boolean(pinError)}
                  className="w-full text-center tracking-[0.4em] font-mono font-black text-2xl py-3 rounded-2xl bg-[#1A1D24] border-2 border-orange-500/40 text-amber-300 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/30"
                />
                <p id="handover-code-hint" className="text-[11px] text-slate-500 text-center">
                  {enteredPin.length} of {HANDOVER_CODE_LENGTH} digits
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPinOpen(false)}
                  disabled={pinPending}
                  className="flex-1 min-h-11 py-3 rounded-xl bg-[#1F242D] hover:bg-slate-700/50 text-slate-300 hover:text-white font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pinPending || enteredPin.length !== HANDOVER_CODE_LENGTH}
                  className="flex-1 min-h-11 py-3 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 text-white font-bold text-xs shadow-lg shadow-orange-500/25 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pinPending ? 'Checking…' : 'Confirm pickup'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════ DROP-OFF CONFIRMATION ══════════════════════════ */}
      {dropOffOpen && dropOffOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dropoff-modal-title"
            className="bg-[#14171F] border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <h3 id="dropoff-modal-title" className="font-bold text-white text-base flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" />
                <span className="truncate">Mark order #{dropOffOrder.id} delivered</span>
              </h3>
              <button
                type="button"
                onClick={() => setDropOffOpen(false)}
                disabled={dropOffPending}
                className="p-2 rounded-lg text-slate-400 hover:text-white min-h-9 min-w-9 flex items-center justify-center"
              >
                <X className="w-5 h-5" aria-hidden="true" />
                <span className="sr-only">Cancel delivery confirmation</span>
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Handing over to <strong className="text-white">{dropOffOrder.customerName || 'the customer'}</strong> at{' '}
              <strong className="text-white">{dropOffOrder.address || 'the address on the order'}</strong>.
            </p>
            <p className="text-xs text-slate-400">
              This tells the shop the order arrived and adds your delivery commission to today&rsquo;s total. Only press this once the
              food has physically changed hands.
            </p>

            <button
              type="button"
              onClick={handleCompleteDelivery}
              disabled={dropOffPending}
              className="w-full min-h-12 rounded-xl bg-linear-to-r from-emerald-500 to-green-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all disabled:opacity-60"
            >
              <Check className="w-4 h-4" aria-hidden="true" />
              <span>{dropOffPending ? 'Recording…' : 'Yes, hand over and complete'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════ NEW ASSIGNMENT ══════════════════════════ */}
      {newAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="assignment-modal-title"
            className="bg-linear-to-b from-[#1A1D24] to-[#14171F] border-2 border-orange-500 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-center"
          >
            <span className="w-16 h-16 rounded-3xl bg-orange-500/20 border-2 border-orange-500 text-orange-400 flex items-center justify-center mx-auto">
              <Bike className="w-8 h-8" aria-hidden="true" />
            </span>

            <div className="space-y-1">
              <span className="inline-block px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 text-xs font-mono font-black border border-orange-500/40">
                NEW RUN ASSIGNED
              </span>
              <h3 id="assignment-modal-title" className="text-xl font-black text-white pt-2">
                Order #{newAssignment.id}
              </h3>
              <p className="text-xs text-slate-300">You have been dispatched for this order.</p>
            </div>

            <div className="space-y-2 text-left bg-[#10131A] p-4 rounded-2xl border border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Home className="w-4 h-4 text-orange-400 shrink-0" aria-hidden="true" />
                <span className="truncate">Pickup: <strong className="text-white">{RESTAURANT.name}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin className="w-4 h-4 text-orange-400 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  Drop-off: <strong className="text-white">{newAssignment.address || 'No address on file'}</strong>
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800 text-slate-400">
                <span className="truncate">
                  Customer: <strong className="text-white">{newAssignment.customerName || 'Customer'}</strong>
                </span>
                <span className="font-mono text-amber-400 font-bold shrink-0">{formatRwf(newAssignment.totalRWF)} RWF</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setNewAssignment(null)}
                className="flex-1 min-h-11 py-3 rounded-xl bg-[#1F242D] hover:bg-slate-700/50 text-slate-300 hover:text-white font-bold text-xs"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedOrderId(newAssignment.id);
                  setActiveTab('dispatch');
                  setMobileViewMode('route');
                  setNewAssignment(null);
                }}
                className="flex-1 min-h-11 py-3 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 text-white font-black text-xs shadow-lg shadow-orange-500/30 active:scale-95 transition-all"
              >
                View route
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
