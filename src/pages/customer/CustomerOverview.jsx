import React, { useMemo } from 'react';
import { ShoppingBag, DollarSign, Radio, ChevronRight, History, ChefHat, Bike, Award, Clock, MapPin, Navigation, Phone, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../App';

const formatRWF = (value) => Number.isFinite(Number(value)) ? `${Number(value).toLocaleString()} RWF` : '—';
const STATUS_LABELS = { pending: 'Pending', preparing: 'Preparing', ready: 'Ready', delivery: 'Out for delivery', delivered: 'Delivered', cancelled: 'Cancelled' };
const statusLabel = (status) => STATUS_LABELS[status] || 'Unknown';
const isLive = (status) => status !== 'delivered' && status !== 'cancelled';
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
  onOpenReceipt
}) {
  const navigate = useNavigate();
  const orderList = useMemo(() => Array.isArray(orders) ? orders : [], [orders]);
  const totalOrders = orderList.length;
  const activeOrders = useMemo(() => orderList.filter(o => isLive(o.status)), [orderList]);
  const totalSpent = useMemo(() => orderList.reduce((acc, o) => (o.status === 'cancelled' ? acc : acc + (Number(o.totalRWF) || 0)), 0), [orderList]);

  return (
    <div className="space-y-6">
      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-[#1A1D24] border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all shadow-lg flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Orders Made</span>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-white font-mono">{totalOrders}</div>
            <div className="text-xs text-slate-400 mt-1">Across your HotPot account</div>
          </div>
        </div>

        <div className="bg-[#1A1D24] border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all shadow-lg flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Spent in RWF</span>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-white font-mono truncate">
              {totalSpent.toLocaleString()} <span className="text-sm text-slate-400 font-sans font-normal">RWF</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">Cancelled orders excluded</div>
          </div>
        </div>

        <button
          onClick={() => navigate(ROUTES.tracking)}
          className={`text-left bg-[#1A1D24] border rounded-2xl p-5 hover:border-orange-500/50 transition-all shadow-lg flex flex-col justify-between space-y-3 ${
            activeOrders.length > 0 ? 'border-orange-500/40 bg-orange-500/5' : 'border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Live Tracking</span>
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
        </button>
      </div>

      {/* ACTIVE ORDERS */}
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
              onClick={() => navigate(ROUTES.tracking)}
              className="text-xs text-orange-400 font-bold hover:underline flex items-center gap-1"
            >
              View Live Steppers <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeOrders.map((order) => {
              const stepIdx = getStepProgressIndex(order.status);
              return (
                <div key={order.id} className="bg-[#1A1D24] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 shadow-xl transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-base text-white">#{order.id}</span>
                      <span className="text-xs text-slate-400 ml-2">• {order.orderTime || 'Recently'}</span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] uppercase tracking-wider border ${getStatusBadge(order.status)}`}>
                      {statusLabel(order.status)}
                    </span>
                  </div>

                  <div className="space-y-2 py-1">
                    <div className="relative flex items-center justify-between">
                      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 bg-slate-800 rounded-full z-0" />
                      <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-linear-to-r shadow-md transition-all duration-500 z-0 ${barGlowFor(order.status)}`} style={{ width: `${(stepIdx / 3) * 100}%` }} />
                      {[ { label: 'Placed', icon: Clock }, { label: 'Kitchen', icon: ChefHat }, { label: 'On Way', icon: Bike }, { label: 'Delivered', icon: Award } ].map((step, idx) => {
                        const Icon = step.icon;
                        return (
                          <div key={step.label} className="relative z-10 flex flex-col items-center">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${idx === stepIdx ? 'bg-orange-500 text-white ring-4 ring-orange-500/20 shadow-lg shadow-orange-500/40' : idx <= stepIdx ? 'bg-slate-700 text-white' : 'bg-[#14171F] text-slate-600 border border-slate-800'}`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 space-y-1 pt-2 border-t border-slate-800">
                    {(order.items || []).slice(0, 2).map((item, iIdx) => (
                      <div key={iIdx} className="flex justify-between">
                        <span className="text-white truncate max-w-[70%]">{itemQty(item)}x {item?.name}</span>
                        <span className="font-mono text-slate-400">{formatRWF(itemLineTotal(item))}</span>
                      </div>
                    ))}
                    {(order.items || []).length > 2 && (
                      <span className="text-[11px] text-orange-400 block font-semibold">+ {(order.items || []).length - 2} more items</span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-400 flex items-center gap-1.5 truncate max-w-[50%]">
                      <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
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
        <div className="lg:col-span-2 bg-[#1A1D24] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-orange-400" /> Recent Activity
            </h3>
            <button onClick={() => navigate(ROUTES.orders)} className="text-xs text-orange-400 font-bold hover:underline">
              View All History →
            </button>
          </div>

          {loading && orderList.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <span className="inline-block w-8 h-8 rounded-full border-2 border-slate-600 border-t-orange-400 animate-spin" />
              <p className="text-xs text-slate-400">Loading your orders…</p>
            </div>
          ) : orderList.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">No orders placed yet.</p>
              <button onClick={onExploreMenu} className="min-h-11 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs">
                Browse HotPot Menu
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {orderList.slice(0, 4).map((order) => (
                <div key={order.id} className="p-3.5 rounded-xl bg-[#14171F] border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-all">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-white">#{order.id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(order.status)}`}>
                        {statusLabel(order.status)}
                      </span>
                      <span className="text-[11px] text-slate-500">• {order.orderTime || 'Recently'}</span>
                    </div>
                    <p className="text-xs text-slate-300 truncate max-w-sm">
                      {(order.items || []).map((i) => `${itemQty(i)}x ${i?.name}`).join(', ') || 'No items recorded'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                    <span className="font-mono font-bold text-xs text-orange-400">{formatRWF(order.totalRWF)}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => onSelectOrder(order)} className="min-h-11 px-3 py-2 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-orange-500/20 active:scale-95 transition-all">
                        <Navigation className="w-3.5 h-3.5" /> Track
                      </button>
                      <button onClick={() => onOpenReceipt(order)} className="min-h-11 px-3 py-2 rounded-xl bg-[#1F242D] hover:bg-white/10 border border-slate-700/60 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95">
                        <FileText className="w-3.5 h-3.5" /> Receipt
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-[#1A1D24] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-orange-400" /> Default Delivery Address
              </h4>
              <button onClick={() => navigate(ROUTES.dashboard + '/profile')} className="text-xs text-orange-400 hover:underline font-bold">
                Manage
              </button>
            </div>
            <div className="p-4 rounded-xl bg-[#14171F] border border-slate-800 space-y-2">
              {activeAddress ? (
                <>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Default Address</span>
                    <span className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.2 rounded font-mono font-bold">DEFAULT</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{activeAddress}</p>
                </>
              ) : (
                <p className="text-xs text-slate-400 leading-relaxed">No delivery address saved yet. Add one in Profile to speed up checkout.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
