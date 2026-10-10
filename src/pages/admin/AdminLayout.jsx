import React, { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import {
  Shield, TrendingUp, ShoppingBag, Bike, DollarSign, Star,
  UtensilsCrossed, ChevronLeft, ChevronRight, Home, X,
  Layers, Volume2, VolumeX, RefreshCw, Plus, Download, Clock,
  CheckCircle2, AlertCircle
} from 'lucide-react';
import AddFoodItemModal from '../../components/admin/AddFoodItemModal';
import { AdminProvider, useAdmin } from '../../context/AdminContext';
import { ADMIN_NAV, downloadCsv, stamp, formatWhen } from '../../utils/adminHelpers';

const TAB_ICONS = {
  overview: TrendingUp,
  catalog:  UtensilsCrossed,
  orders:   ShoppingBag,
  fleet:    Bike,
  sales:    DollarSign,
  reviews:  Star,
};

// ─── Inner shell (needs useAdmin context) ────────────────────────────────────
function AdminShell() {
  const {
    analyticsError,
    orders, meals, onMealsChange,
    riders, reviews,
    isRefreshing, loadSnapshot,
    soundEnabled, setSoundEnabled,
    banner, announce,
    user, onGoHome, error, onRetry,
  } = useAdmin();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const displayOrders = Array.isArray(orders) ? orders : [];
  const soldOrders = displayOrders.filter((o) => o.status === 'delivery' || o.status === 'delivered');

  const handleExportOrdersCsv = () => {
    if (!displayOrders.length) { announce('error', 'No orders to export yet.'); return; }
    downloadCsv(`HotPot_Orders_${stamp()}.csv`, [
      ['Order ID','Created','Customer','Phone','Address','Status','Type','Payment','Total RWF','Rider','Items'],
      ...displayOrders.map((o) => [
        o.id, formatWhen(o.createdAt), o.customerName, o.phone, o.address,
        o.status, o.orderType, o.paymentMethod, o.totalRWF,
        o.riderName || '',
        (o.items || []).map((i) => `${i.qty}x ${i.name}`).join('; ')
      ])
    ]);
  };

  const badgeFor = (id) => {
    if (id === 'catalog') return meals.length;
    if (id === 'orders')  return displayOrders.length;
    if (id === 'fleet')   return riders.length;
    if (id === 'sales')   return soldOrders.length;
    if (id === 'reviews') return reviews.length;
    return undefined;
  };

  return (
    <div className="fixed inset-0 z-30 flex bg-[#0F1117] text-white overflow-hidden font-sans select-auto">
      {/* Announcements */}
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
          {banner.tone === 'error'
            ? <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-px" aria-hidden="true" />
            : <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-px" aria-hidden="true" />}
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

      {/* ════════════════ SIDEBAR ════════════════ */}
      <aside
        className={`flex flex-col bg-[#12141A] border-r border-slate-800 transition-all duration-300 fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] shadow-2xl ${
          isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 md:static md:z-30 md:shadow-none ${isSidebarCollapsed ? 'md:w-16' : 'md:w-64'}`}
      >
        {/* Sidebar header */}
        <div className="h-14 border-b border-slate-800 flex items-center justify-between px-3 shrink-0">
          {!isSidebarCollapsed ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => { setIsMobileDrawerOpen(false); onGoHome?.(); }}
                className="w-8 h-8 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 hover:text-white border border-orange-500/40 flex items-center justify-center shrink-0 transition-all"
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
              onClick={() => { setIsMobileDrawerOpen(false); onGoHome?.(); }}
              className="w-8 h-8 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 hover:text-white border border-orange-500/40 flex items-center justify-center mx-auto transition-all"
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
            className={`hidden md:flex p-1.5 rounded-lg bg-[#1F242D] hover:bg-white/10 border border-slate-700/50 text-slate-400 hover:text-white transition-all ${isSidebarCollapsed ? 'mx-auto' : ''}`}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed
              ? <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              : <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />}
          </button>
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-3.5">
          <div className="space-y-1">
            {!isSidebarCollapsed && (
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2.5 mb-1.5 block">
                Management views
              </span>
            )}
            {ADMIN_NAV.map((nav) => {
              const Icon = TAB_ICONS[nav.id];
              const badge = badgeFor(nav.id);
              return (
                <NavLink
                  key={nav.id}
                  to={nav.path}
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className={({ isActive }) =>
                    `w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs transition-all min-h-11 focus:outline-none focus:ring-1 focus:ring-orange-400/40 ${
                      isActive
                        ? 'bg-linear-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    } ${isSidebarCollapsed ? 'md:justify-center md:px-0' : ''}`
                  }
                  title={nav.label}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className={`flex-1 text-left truncate ${isSidebarCollapsed ? 'md:hidden' : ''}`}>{nav.label}</span>
                  {badge !== undefined && (
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] bg-black/40 font-mono font-bold shrink-0 ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
                      {badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>

          {/* Quick actions */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            {!isSidebarCollapsed && (
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2.5 block">Quick actions</span>
            )}
            <button
              type="button"
              onClick={() => { setShowAddMeal(true); setIsMobileDrawerOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-300 text-xs font-bold transition-all min-h-11 ${isSidebarCollapsed ? 'md:justify-center md:px-0' : ''}`}
              title="Add a new dish"
            >
              <Plus className="w-4 h-4 text-orange-400 shrink-0" aria-hidden="true" />
              <span className={`${isSidebarCollapsed ? 'md:hidden' : ''}`}>Add new dish</span>
            </button>
            <button
              type="button"
              onClick={handleExportOrdersCsv}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#1F242D] hover:bg-white/10 border border-slate-700/50 text-slate-300 hover:text-white text-xs font-bold transition-all min-h-11 ${isSidebarCollapsed ? 'md:justify-center md:px-0' : ''}`}
              title="Export all orders as CSV"
            >
              <Download className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
              <span className={`${isSidebarCollapsed ? 'md:hidden' : ''}`}>Export orders CSV</span>
            </button>
          </div>
        </div>

        {/* Sidebar footer */}
        <div className="p-2.5 border-t border-slate-800 bg-black/40 space-y-2 shrink-0 mt-auto">
          <div className={`flex items-center gap-2 p-2 rounded-xl bg-[#12141A] border border-slate-800 ${isSidebarCollapsed ? 'md:justify-center md:p-1.5' : ''}`}>
            <div className="w-7 h-7 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center shrink-0">
              <Shield className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />
            </div>
            <div className={`min-w-0 flex-1 ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
              <div className="text-[11px] font-bold text-white truncate">{user?.name || 'Administrator'}</div>
              <div className="text-[10px] text-slate-400 font-mono truncate">{user?.email || ''}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { const next = !soundEnabled; setSoundEnabled(next); }}
            className={`w-full flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold border transition-all min-h-11 ${
              soundEnabled
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-950'
                : 'bg-[#1F242D] border-slate-700/50 text-slate-400 hover:text-white'
            } ${isSidebarCollapsed ? 'md:justify-center md:p-2' : ''}`}
            aria-pressed={soundEnabled}
          >
            {soundEnabled
              ? <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
              : <VolumeX className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />}
            <span className={`flex-1 text-left text-[11px] ${isSidebarCollapsed ? 'md:hidden' : ''}`}>Audio alerts</span>
            <span className={`font-mono text-[10px] uppercase ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
              {soundEnabled ? 'On' : 'Off'}
            </span>
          </button>

          <div className={`flex items-center gap-2 px-2.5 py-2 rounded-xl bg-[#1A1D24] border border-slate-800 text-[11px] ${error || analyticsError ? 'text-red-300' : 'text-emerald-400'} font-mono ${isSidebarCollapsed ? 'md:justify-center md:px-1' : ''}`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${error || analyticsError ? 'bg-red-400' : 'bg-emerald-400'}`} aria-hidden="true" />
            <span className={`font-bold truncate text-[10px] ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
              {error ? 'Server offline' : analyticsError ? 'Analytics unavailable' : 'Server connected'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => { setIsMobileDrawerOpen(false); onGoHome?.(); }}
            className={`w-full py-2.5 px-3 rounded-xl bg-[#1F242D] hover:bg-orange-500/10 border border-slate-700/50 text-slate-300 hover:text-orange-300 text-xs font-bold flex items-center justify-center gap-2 transition-all min-h-11 ${isSidebarCollapsed ? 'md:p-2' : ''}`}
          >
            <Home className="w-4 h-4 text-orange-400 shrink-0" aria-hidden="true" />
            <span className={`${isSidebarCollapsed ? 'md:hidden' : ''}`}>Return to store menu</span>
          </button>
        </div>
      </aside>

      {/* ════════════════ MAIN ════════════════ */}
      <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden relative">
        <header className="h-14 border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between bg-[#12141A]/95 backdrop-blur-md shrink-0 gap-2 sm:gap-3 z-20">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="md:hidden p-2 rounded-xl bg-[#1F242D] hover:bg-white/10 border border-slate-700/50 text-orange-400 min-h-11 min-w-11 flex items-center justify-center shrink-0"
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
            >
              <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Add dish</span>
            </button>
          </div>
        </header>

        {/* Page content via React Router Outlet */}
        <main className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 lg:p-6 space-y-6">
          {error && (
            <div role="alert" className="p-3.5 rounded-2xl bg-red-950/70 border border-red-500/50 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
              <p className="text-xs font-bold text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                {error}
              </p>
              {onRetry && (
                <button type="button" onClick={onRetry} className="px-3 py-1.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs font-bold hover:bg-red-500/30 transition-all min-h-9">
                  Retry
                </button>
              )}
            </div>
          )}
          <Outlet />
        </main>
      </div>

      {/* Add Dish modal — global so it's accessible from sidebar quick-action */}
      {showAddMeal && (
        <AddFoodItemModal
          isOpen
          onClose={() => setShowAddMeal(false)}
          onSaved={async () => { setShowAddMeal(false); await onMealsChange?.(); }}
        />
      )}
    </div>
  );
}

// ─── Exported layout — wraps everything in the provider ───────────────────
export default function AdminLayout(props) {
  return (
    <AdminProvider {...props}>
      <AdminShell />
    </AdminProvider>
  );
}
