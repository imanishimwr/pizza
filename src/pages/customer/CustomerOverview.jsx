import React, { useMemo, useState } from 'react';
import { ShoppingBag, DollarSign, Radio, ChevronRight, History, ChefHat, Bike, Award, Clock, MapPin, Navigation, Phone, FileText, XCircle, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../App';

const formatRWF = (value) => Number.isFinite(Number(value)) ? `${Number(value).toLocaleString()} RWF` : '—';
const STATUS_LABELS = { pending: 'Pending', payment_review: 'Payment Review', preparing: 'Preparing', ready: 'Ready', delivery: 'Out for delivery', delivered: 'Delivered', cancelled: 'Declined' };
const statusLabel = (status) => STATUS_LABELS[status] || 'Unknown';

const formatKigaliTime = (order) => {
  const raw = order?.created_at || order?.createdAt;
  if (raw) {
    try {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Africa/Kigali'
        });
      }
    } catch {}
  }
  return order?.orderTime || 'Recently';
};

const isCookingOrTransit = (status) => status === 'preparing' || status === 'ready' || status === 'delivery';
const itemQty = (item) => Number(item?.quantity) || 1;
const itemLineTotal = (item) => (Number(item?.meal?.price) || 0) * itemQty(item);

const getStatusBadge = (status) => {
  switch (status) {
    case 'delivered': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 font-bold';
    case 'ready': return 'bg-emerald-500/25 text-emerald-300 border-emerald-400/60 font-bold animate-pulse shadow-sm shadow-emerald-500/20';
    case 'delivery': return 'bg-blue-500/15 text-blue-400 border-blue-500/40 font-bold';
    case 'preparing': return 'bg-amber-500/15 text-amber-400 border-amber-500/40 font-bold';
    case 'cancelled': return 'bg-red-500/15 text-red-400 border-red-500/40 font-bold';
    default: return 'bg-slate-500/15 text-slate-300 border-slate-500/40 font-bold';
  }
};

const getStepProgressIndex = (status) => {
  if (status === 'pending') return 0;
  if (status === 'preparing' || status === 'ready') return 1;
  if (status === 'delivery') return 2;
  if (status === 'delivered') return 3;
  return -1;
};

const barGlowFor = (status) => {
  if (status === 'delivered') return 'bg-emerald-500 shadow-emerald-500/50';
  if (status === 'delivery') return 'bg-blue-500 shadow-blue-500/50';
  if (status === 'preparing' || status === 'ready') return 'bg-amber-500 shadow-amber-500/50';
  return 'bg-orange-500 shadow-orange-500/50';
};

export default function CustomerOverview({
  orders = [],
  loading = false,
  activeAddress = '',
  onSelectOrder,
  onExploreMenu,
  onOpenReceipt,
  onDeleteOrder
}) {
  const navigate = useNavigate();
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const orderList = useMemo(() => Array.isArray(orders) ? orders : [], [orders]);
  const activeOrders = useMemo(() => orderList.filter(o => isCookingOrTransit(o.status)), [orderList]);
  const pendingOrders = useMemo(() => orderList.filter(o => o.status === 'pending'), [orderList]);
  const declinedOrders = useMemo(() => orderList.filter(o => o.status === 'cancelled'), [orderList]);
  const visibleRecentOrders = useMemo(() => orderList.filter(o => o.status !== 'cancelled'), [orderList]);
  const totalOrders = visibleRecentOrders.length;
  const totalSpent = useMemo(() => orderList.reduce((acc, o) => (o.status === 'cancelled' ? acc : acc + (Number(o.totalRWF) || 0)), 0), [orderList]);

  return (
    <div className="space-y-6">
      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs dark:shadow-lg flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Orders Made</span>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 border border-blue-500/20 text-blue-500 dark:text-blue-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-mono">{totalOrders}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Across your HotPot account</div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs dark:shadow-lg flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Spent in RWF</span>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-mono truncate">
              {totalSpent.toLocaleString()} <span className="text-sm text-slate-500 dark:text-slate-400 font-sans font-normal">RWF</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Cancelled orders excluded</div>
          </div>
        </div>

        <button
          onClick={() => navigate(ROUTES.tracking)}
          className={`text-left bg-white dark:bg-[#1A1D24] border rounded-2xl p-5 hover:border-orange-500/50 transition-all shadow-xs dark:shadow-lg flex flex-col justify-between space-y-3 ${
            activeOrders.length > 0 ? 'border-orange-500/40 bg-orange-500/5' : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Live Tracking</span>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-500/10 border border-orange-500/20 text-orange-500 dark:text-orange-400">
              <Radio className={`w-5 h-5 ${activeOrders.length > 0 ? 'animate-pulse' : ''}`} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-orange-500 dark:text-orange-400">
              {activeOrders.length} <span className="text-sm font-sans font-normal text-slate-600 dark:text-slate-300">Active</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
              <span>{activeOrders.length > 0 ? 'Orders in kitchen/transit' : 'No active orders'}</span>
              <ChevronRight className="w-4 h-4 text-orange-500 dark:text-orange-400" />
            </div>
          </div>
        </button>
      </div>

      {/* DECLINED ORDERS BANNER */}
      {declinedOrders.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-white text-sm font-bold flex items-center gap-2">
                <span>{declinedOrders.length === 1 ? `Order #${declinedOrders[0].id} Declined` : `${declinedOrders.length} Orders Declined`}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30">
                  Declined
                </span>
              </div>
              <p className="text-xs text-red-300/80 mt-1">
                Your order has been declined by the restaurant. If you already made a payment, please contact our support team for an immediate refund.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              onClick={() => onSelectOrder(declinedOrders[0])}
              className="min-h-10 px-3.5 py-1.5 rounded-xl bg-[#1F242D] hover:bg-slate-700/80 border border-slate-700/70 text-slate-200 text-xs font-bold transition-all"
            >
              View Details
            </button>
            {onDeleteOrder && (
              <button
                type="button"
                onClick={() => onDeleteOrder(declinedOrders[0].id)}
                className="min-h-10 px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 text-xs font-bold transition-all"
                title="Dismiss and remove from dashboard"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}

      {/* AWAITING KITCHEN COOKING BANNER */}
      {pendingOrders.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-white text-sm font-bold flex items-center gap-2">
                <span>{pendingOrders.length === 1 ? `Order #${pendingOrders[0].id} Received` : `${pendingOrders.length} Orders Received`}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Awaiting Cooking
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Your payment was received. This order will activate on your live cooking dashboard as soon as the kitchen starts cooking!
              </p>
            </div>
          </div>
          <button
            onClick={() => onSelectOrder(pendingOrders[0])}
            className="min-h-10 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 dark:bg-[#1F242D] dark:hover:bg-slate-700/80 dark:border-slate-700/70 dark:text-slate-200 text-xs font-bold transition-all shrink-0 self-end sm:self-center"
          >
            View Details
          </button>
        </div>
      )}

      {/* ACTIVE ORDERS */}
      {activeOrders.length > 0 && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500" />
              </span>
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Active Orders in Kitchen &amp; Transit
              </h2>
            </div>
            <button
              onClick={() => navigate(ROUTES.tracking)}
              className="text-xs text-orange-500 dark:text-orange-400 font-bold hover:underline flex items-center gap-1"
            >
              View Live Steppers <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeOrders.map((order) => {
              const stepIdx = getStepProgressIndex(order.status);
              return (
                <div key={order.id} className="bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl p-5 space-y-4 shadow-xs dark:shadow-xl transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-base text-slate-900 dark:text-white">#{order.id}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">• {formatKigaliTime(order)}</span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] uppercase tracking-wider border ${getStatusBadge(order.status)}`}>
                      {statusLabel(order.status)}
                    </span>
                  </div>

                  <div className="space-y-2 py-1">
                    <div className="relative flex items-center justify-between">
                      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full z-0" />
                      <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-linear-to-r shadow-md transition-all duration-500 z-0 ${barGlowFor(order.status)}`} style={{ width: `${(stepIdx / 3) * 100}%` }} />
                      {[ { label: 'Placed', icon: Clock }, { label: 'Kitchen', icon: ChefHat }, { label: 'On Way', icon: Bike }, { label: 'Delivered', icon: Award } ].map((step, idx) => {
                        const Icon = step.icon;
                        return (
                          <div key={step.label} className="relative z-10 flex flex-col items-center">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${idx === stepIdx ? 'bg-orange-500 text-white ring-4 ring-orange-500/20 shadow-lg shadow-orange-500/40' : idx <= stepIdx ? 'bg-slate-700 text-white' : 'bg-slate-100 dark:bg-[#14171F] text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-800'}`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                    {(order.items || []).slice(0, 2).map((item, iIdx) => (
                      <div key={iIdx} className="flex justify-between">
                        <span className="text-slate-900 dark:text-white truncate max-w-[70%]">{itemQty(item)}x {item?.name}</span>
                        <span className="font-mono text-slate-500 dark:text-slate-400">{formatRWF(itemLineTotal(item))}</span>
                      </div>
                    ))}
                    {(order.items || []).length > 2 && (
                      <span className="text-[11px] text-orange-500 dark:text-orange-400 block font-semibold">+ {(order.items || []).length - 2} more items</span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate max-w-[50%]">
                      <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span className="truncate">{order.address || 'No address on file'}</span>
                    </span>
                    <button
                      onClick={() => onSelectOrder(order)}
                      className="min-h-11 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition-all"
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

      {/* RECENT ACTIVITY & ADDRESS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs dark:shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-orange-500" /> Recent Activity
            </h3>
            <button onClick={() => navigate(ROUTES.orders)} className="text-xs text-orange-500 dark:text-orange-400 font-bold hover:underline">
              View All History →
            </button>
          </div>

          {loading && visibleRecentOrders.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <span className="inline-block w-8 h-8 rounded-full border-2 border-slate-300 dark:border-slate-600 border-t-orange-500 animate-spin" />
              <p className="text-xs text-slate-500 dark:text-slate-400">Loading your orders…</p>
            </div>
          ) : visibleRecentOrders.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <ShoppingBag className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-xs text-slate-500 dark:text-slate-400">No active orders.</p>
              <button onClick={onExploreMenu} className="min-h-11 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs">
                Browse HotPot Menu
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleRecentOrders.slice(0, 4).map((order) => (
                <div key={order.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#14171F] border border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">#{order.id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(order.status)}`}>
                        {statusLabel(order.status)}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">• {formatKigaliTime(order)}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-sm">
                      {(order.items || []).map((i) => `${itemQty(i)}x ${i?.name}`).join(', ') || 'No items recorded'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-800">
                    <span className="font-mono font-bold text-xs text-orange-500 dark:text-orange-400">{formatRWF(order.totalRWF)}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => onSelectOrder(order)} className="min-h-11 px-3 py-2 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-orange-500/20 active:scale-95 transition-all">
                        <Navigation className="w-3.5 h-3.5" /> Track
                      </button>
                      <button onClick={() => onOpenReceipt(order)} className="min-h-11 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 dark:bg-[#1F242D] dark:hover:bg-white/10 dark:border-slate-700/60 dark:text-slate-300 dark:hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95">
                        <FileText className="w-3.5 h-3.5" /> Receipt
                      </button>
                      {onDeleteOrder && (
                        confirmDeleteId === order.id ? (
                          <div className="flex items-center gap-1 bg-red-500/15 border border-red-500/30 px-2 py-1 rounded-xl">
                            <span className="text-[10px] text-red-600 dark:text-red-300 font-bold">Delete?</span>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteOrder(order.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 text-[10px]"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(order.id)}
                            className="min-h-11 px-2.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
                            title="Delete this order from your dashboard"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs dark:shadow-lg">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-orange-500" /> Default Delivery Address
              </h4>
              <button onClick={() => navigate(ROUTES.dashboard + '/profile')} className="text-xs text-orange-500 dark:text-orange-400 hover:underline font-bold">
                Manage
              </button>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#14171F] border border-slate-200 dark:border-slate-800 space-y-2">
              {activeAddress ? (
                <>
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Default Address</span>
                    <span className="text-[10px] bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 px-1.5 py-0.2 rounded font-mono font-bold">DEFAULT</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{activeAddress}</p>
                </>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">No delivery address saved yet. Add one in Profile to speed up checkout.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
