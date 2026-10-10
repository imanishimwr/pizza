import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, DollarSign, ShoppingBag, ChefHat, BarChart3,
  Flame, Activity, ChevronRight, Navigation, LineChart, AlertCircle
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { formatRwf, statusLabel, statusBadge, normalizeOrderStatus } from '../../utils/adminHelpers';
import { RevenueChart, KpiCardSkeleton, ChartSkeleton } from '../../components/admin/AdminComponents';

export default function AdminOverview() {
  const { analytics, analyticsError, orders, loading, isRefreshing } = useAdmin();
  const navigate = useNavigate();
  const [chartMode, setChartMode] = useState('line');
  const [hoveredDay, setHoveredDay] = useState(null);

  const isStatsLoading = !analytics && (loading || isRefreshing);
  const displayOrders = useMemo(() => (Array.isArray(orders) ? orders : []), [orders]);
  const isOrdersLoading = displayOrders.length === 0 && (loading || isRefreshing);
  const readyOrders = useMemo(() => displayOrders.filter((o) => normalizeOrderStatus(o.status) === 'ready'), [displayOrders]);
  const activeKitchenCount = useMemo(
    () => displayOrders.filter((o) => normalizeOrderStatus(o.status) === 'ongoing').length,
    [displayOrders]
  );

  const topSellingDishes = useMemo(() => {
    const serverRows = Array.isArray(analytics?.topDishes) ? analytics.topDishes : null;
    if (serverRows && serverRows.length > 0) {
      return serverRows.slice(0, 5).map((row) => ({
        name: row.name,
        qty: Number(row.qty) || 0,
        revenue: Number(row.revenueRWF) || 0
      }));
    }
    const dishMap = new Map();
    for (const order of displayOrders) {
      for (const item of order.items || []) {
        const name = item.name || 'Dish';
        const entry = dishMap.get(name) || { name, qty: 0, revenue: 0 };
        const qty = Number(item.qty) || 1;
        entry.qty += qty;
        entry.revenue += (Number(item.price) || 0) * qty;
        dishMap.set(name, entry);
      }
    }
    return [...dishMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [analytics, displayOrders]);

  const weeklyData = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = Date.now();
    const buckets = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
        day: dayNames[d.getDay()],
        label: d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }),
        rev: 0,
        orders: 0
      });
    }
    const byKey = new Map(buckets.map((b) => [b.key, b]));
    for (const order of displayOrders) {
      if (!order.createdAt) continue;
      const date = new Date(order.createdAt);
      if (Number.isNaN(date.getTime())) continue;
      const bucket = byKey.get(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
      if (!bucket) continue;
      bucket.rev += Number(order.totalRWF) || 0;
      bucket.orders += 1;
    }
    return buckets;
  }, [displayOrders]);

  const weeklyTotals = useMemo(() => ({
    hasOrders: weeklyData.some((d) => d.orders > 0),
    orders: weeklyData.reduce((s, d) => s + d.orders, 0),
    rev: weeklyData.reduce((s, d) => s + d.rev, 0)
  }), [weeklyData]);

  const kpi = (value, suffix) => (
    <>
      {value === null ? <span className="text-slate-500">&mdash;</span> : <span>{value.toLocaleString()}</span>}{' '}
      <span className="text-xs text-slate-400 font-sans font-normal">{suffix}</span>
    </>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#1A1D24] p-3.5 sm:px-5 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-orange-400" aria-hidden="true" />
            Performance overview
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Live figures from the server, plus this session&apos;s order book.</p>
        </div>
        <div className="px-3 py-1.5 rounded-xl bg-[#12141A] border border-slate-800 text-[11px] text-slate-400 font-mono">
          {weeklyTotals.hasOrders
            ? `${weeklyTotals.orders} orders in the last 7 days`
            : 'No orders in the last 7 days'}
        </div>
      </div>

      {analyticsError && (
        <div role="alert" className="p-3.5 rounded-2xl bg-red-950/70 border border-red-500/50 text-xs font-bold text-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          {analyticsError}
        </div>
      )}

      {/* KPI cards */}
      {isStatsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCardSkeleton />
          <KpiCardSkeleton />
          <KpiCardSkeleton />
          <KpiCardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total revenue</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400"><DollarSign className="w-5 h-5" aria-hidden="true" /></div>
            </div>
            <div className="text-3xl font-black text-white font-mono mt-3">
              {analytics?.totalRevenueRWF != null ? (
                kpi(analytics.totalRevenueRWF, 'RWF')
              ) : (
                <span className="inline-block h-8 w-28 bg-slate-700/50 rounded animate-pulse" />
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Every non-cancelled order on the server.</p>
          </div>
          <div className="p-5 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total orders</span>
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400"><ShoppingBag className="w-5 h-5" aria-hidden="true" /></div>
            </div>
            <div className="text-3xl font-black text-white font-mono mt-3">
              {analytics?.totalOrdersCount != null ? (
                Number(analytics.totalOrdersCount).toLocaleString()
              ) : (
                <span className="inline-block h-8 w-20 bg-slate-700/50 rounded animate-pulse" />
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">All-time count, cancelled orders excluded.</p>
          </div>
          <div className="p-5 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kitchen load</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400"><ChefHat className="w-5 h-5" aria-hidden="true" /></div>
            </div>
            <div className="text-3xl font-black text-white font-mono mt-3">
              {activeKitchenCount} cooking
              <span className="text-sm font-sans font-bold text-emerald-400 ml-2">{readyOrders.length} ready</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              {analytics?.activeOrdersCount != null ? (
                `${analytics.activeOrdersCount} active on the server`
              ) : (
                <span className="inline-block h-3.5 w-32 bg-slate-700/40 rounded animate-pulse" />
              )}
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average ticket</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400"><BarChart3 className="w-5 h-5" aria-hidden="true" /></div>
            </div>
            <div className="text-3xl font-black text-white font-mono mt-3">
              {analytics?.avgTicketRWF != null ? (
                kpi(analytics.avgTicketRWF, 'RWF')
              ) : (
                <span className="inline-block h-8 w-28 bg-slate-700/50 rounded animate-pulse" />
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Mean value of a delivered order.</p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-orange-400" aria-hidden="true" />
              7-day revenue
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Bucketed from the order timestamps on this device.</p>
          </div>
          <div className="flex items-center gap-1 bg-[#12141A] p-1 rounded-xl border border-slate-800">
            <button type="button" onClick={() => setChartMode('line')} aria-pressed={chartMode === 'line'}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${chartMode === 'line' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'}`}>
              <LineChart className="w-3.5 h-3.5" aria-hidden="true" /><span>Line</span>
            </button>
            <button type="button" onClick={() => setChartMode('bar')} aria-pressed={chartMode === 'bar'}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${chartMode === 'bar' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'}`}>
              <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" /><span>Bar</span>
            </button>
          </div>
        </div>
        {isStatsLoading && displayOrders.length === 0 ? (
          <ChartSkeleton />
        ) : !weeklyTotals.hasOrders ? (
          <p className="py-16 text-center text-slate-400 text-sm">No orders in this window.</p>
        ) : (
          <RevenueChart data={weeklyData} mode={chartMode} hoveredKey={hoveredDay} onHover={setHoveredDay} />
        )}
      </div>

      {/* Bottom 3-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Order pipeline */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-white text-sm flex items-center justify-between">
              <span>Order pipeline</span>
              <span className="text-xs text-slate-400 font-normal">{displayOrders.length} in session</span>
            </h4>
            <div className="space-y-3.5 text-xs mt-4">
              {[
                { key: 'ongoing', label: 'Ongoing', color: 'bg-blue-500' },
                { key: 'ready', label: 'Ready', color: 'bg-emerald-400' },
                { key: 'delivered', label: 'Delivered', color: 'bg-teal-500' },
                { key: 'cancelled', label: 'Cancelled', color: 'bg-red-500' }
              ].map((row) => {
                const count = displayOrders.filter((o) => normalizeOrderStatus(o.status) === row.key).length;
                const pct = displayOrders.length ? (count / displayOrders.length) * 100 : 0;
                return (
                  <div key={row.key}>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400">{row.label}</span>
                      <span className="font-bold text-white">{count}</span>
                    </div>
                    <div className="w-full bg-[#12141A] rounded-full h-2 overflow-hidden border border-slate-800/80">
                      <div className={`${row.color} h-full rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <button type="button" onClick={() => navigate('/hotpotadmin/orders')}
            className="w-full py-2.5 mt-4 rounded-xl bg-[#1F242D] hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700/50 transition-all min-h-11">
            <ShoppingBag className="w-4 h-4 text-orange-400" aria-hidden="true" />
            <span>Open dispatch board</span>
          </button>
        </div>

        {/* Top dishes */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" aria-hidden="true" />
              Top-selling dishes
            </h4>
            <div className="space-y-2 mt-3.5">
              {isStatsLoading && topSellingDishes.length === 0 ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-[#12141A] border border-slate-800/80 flex items-center justify-between gap-2.5 animate-pulse">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-slate-800" />
                      <div className="h-3 w-28 bg-slate-800 rounded" />
                    </div>
                    <div className="space-y-1">
                      <div className="h-3 w-16 bg-slate-800 rounded ml-auto" />
                      <div className="h-2 w-10 bg-slate-800/60 rounded ml-auto" />
                    </div>
                  </div>
                ))
              ) : topSellingDishes.length === 0 ? (
                <p className="py-8 text-center text-slate-400 text-xs">No dish sales recorded yet.</p>
              ) : (
                topSellingDishes.map((dish, idx) => (
                  <div key={dish.name} className="p-2.5 rounded-xl bg-[#12141A] border border-slate-800/80 flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 bg-slate-800 text-slate-300">{idx + 1}</div>
                      <div className="text-xs font-bold text-white truncate">{dish.name}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-bold text-orange-400">{formatRwf(dish.revenue)} RWF</div>
                      <div className="text-[10px] text-slate-500 font-mono">{dish.qty} sold</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <button type="button" onClick={() => navigate('/hotpotadmin/catalog')}
            className="w-full py-2.5 mt-4 rounded-xl bg-[#1F242D] hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700/50 transition-all min-h-11">
            <span>Open menu catalog</span>
          </button>
        </div>

        {/* Recent orders */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-400" aria-hidden="true" />
                Recent orders
              </h4>
              <button type="button" onClick={() => navigate('/hotpotadmin/orders')}
                className="text-xs text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1">
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
            <div className="space-y-2.5 mt-3.5">
              {isOrdersLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-[#12141A] border border-slate-800 flex items-center justify-between gap-2 animate-pulse">
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3.5 w-32 bg-slate-800 rounded" />
                      <div className="h-2.5 w-44 bg-slate-800/60 rounded" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-16 bg-slate-800 rounded" />
                      <div className="w-8 h-8 rounded-lg bg-slate-800" />
                    </div>
                  </div>
                ))
              ) : displayOrders.length === 0 ? (
                <p className="py-8 text-center text-slate-400 text-xs">No orders in the database yet.</p>
              ) : (
                displayOrders.slice(0, 4).map((order) => (
                  <div key={order.id} className="p-2.5 rounded-xl bg-[#12141A] border border-slate-800 hover:border-orange-500/50 flex items-center justify-between gap-2 transition-all">
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold text-white truncate">
                        #{order.id} <span className="text-slate-400 font-normal">&middot; {order.customerName || 'Customer'}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {(order.items || []).length} items &middot; {order.address || 'Kigali'}
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        <div className="text-xs font-mono font-bold text-white">{formatRwf(order.totalRWF)} RWF</div>
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border mt-0.5 ${statusBadge(order.status)}`}>
                          {statusLabel(order.status)}
                        </span>
                      </div>
                      <button type="button"
                        onClick={() => navigate(`/hotpotadmin/orders?track=${order.id}`)}
                        className="p-2 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500 hover:text-white transition-all min-h-9 min-w-9 flex items-center justify-center"
                        aria-label={`Track order #${order.id}`}>
                        <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <button type="button" onClick={() => navigate('/hotpotadmin/sales')}
            className="w-full py-2.5 mt-4 rounded-xl bg-[#1F242D] hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700/50 transition-all min-h-11">
            <DollarSign className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <span>Open sales ledger</span>
          </button>
        </div>
      </div>
    </div>
  );
}
