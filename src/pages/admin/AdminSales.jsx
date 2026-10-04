import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, ShoppingBag, UtensilsCrossed, BarChart3,
  Search, Download, Phone, MapPin, Navigation
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { formatRwf, formatWhen, downloadCsv, stamp } from '../../utils/adminHelpers';
import { StatCard, Pager, KpiCardSkeleton, TableRowsSkeleton } from '../../components/admin/AdminComponents';

export default function AdminSales() {
  const { orders, announce, loading } = useAdmin();
  const navigate = useNavigate();

  // Search & Filter state
  const [salesSearch, setSalesSearch] = useState('');
  const [salesPaymentFilter, setSalesPaymentFilter] = useState('all');
  const [salesStatusFilter, setSalesStatusFilter] = useState('all');
  const [salesPage, setSalesPage] = useState(1);
  const salesPerPage = 8;

  const displayOrders = useMemo(() => (Array.isArray(orders) ? orders : []), [orders]);

  // Orders that qualify as "sold" (out for delivery or delivered)
  const soldOrders = useMemo(
    () => displayOrders.filter((o) => o.status === 'delivery' || o.status === 'delivered'),
    [displayOrders]
  );

  const soldRevenue = useMemo(
    () => soldOrders.reduce((sum, o) => sum + (Number(o.totalRWF) || 0), 0),
    [soldOrders]
  );

  const soldItemsCount = useMemo(
    () =>
      soldOrders.reduce(
        (sum, o) => sum + (o.items || []).reduce((itemSum, i) => itemSum + (Number(i.qty) || 1), 0),
        0
      ),
    [soldOrders]
  );

  const filteredSoldOrders = useMemo(() => {
    return soldOrders.filter((order) => {
      if (salesPaymentFilter !== 'all') {
        const pm = (order.paymentMethod || '').toLowerCase();
        if (salesPaymentFilter === 'momo' && !pm.includes('momo') && !pm.includes('mobile money')) {
          return false;
        }
        if (salesPaymentFilter === 'card' && !pm.includes('card') && !pm.includes('visa') && !pm.includes('mastercard')) {
          return false;
        }
        if (salesPaymentFilter === 'cash' && !pm.includes('cash')) {
          return false;
        }
      }
      if (salesStatusFilter !== 'all' && order.status !== salesStatusFilter) {
        return false;
      }
      if (salesSearch.trim()) {
        const query = salesSearch.toLowerCase();
        const matchesId = String(order.id).toLowerCase().includes(query);
        const matchesCust = (order.customerName || '').toLowerCase().includes(query);
        const matchesDish = (order.items || []).some((item) => (item.name || '').toLowerCase().includes(query));
        if (!matchesId && !matchesCust && !matchesDish) return false;
      }
      return true;
    });
  }, [soldOrders, salesPaymentFilter, salesStatusFilter, salesSearch]);

  const totalSalesPages = Math.ceil(filteredSoldOrders.length / salesPerPage) || 1;
  const paginatedSoldOrders = useMemo(() => {
    const start = (salesPage - 1) * salesPerPage;
    return filteredSoldOrders.slice(start, start + salesPerPage);
  }, [filteredSoldOrders, salesPage]);

  const handleExportSalesCsv = () => {
    if (filteredSoldOrders.length === 0) {
      announce('error', 'No orders matching the active filters to export.');
      return;
    }
    downloadCsv(`HotPot_Sales_${stamp()}.csv`, [
      ['Order ID', 'Created', 'Customer', 'Phone', 'Address', 'Items', 'Payment method', 'Total RWF', 'Status'],
      ...filteredSoldOrders.map((o) => [
        o.id,
        formatWhen(o.createdAt),
        o.customerName,
        o.phone,
        o.address,
        (o.items || []).map((i) => `${i.qty}x ${i.name}`).join('; '),
        o.paymentMethod,
        o.totalRWF,
        o.status
      ])
    ]);
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      {loading && displayOrders.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCardSkeleton />
          <KpiCardSkeleton />
          <KpiCardSkeleton />
          <KpiCardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Sold value"
            value={`${formatRwf(soldRevenue)} RWF`}
            icon={<DollarSign className="w-5 h-5" aria-hidden="true" />}
            tone="emerald"
            caption="Dispatched or delivered orders in this session."
          />
          <StatCard
            title="Sold orders"
            value={String(soldOrders.length)}
            icon={<ShoppingBag className="w-5 h-5" aria-hidden="true" />}
            tone="blue"
            caption="Out for delivery or already delivered."
          />
          <StatCard
            title="Dishes fulfilled"
            value={String(soldItemsCount)}
            icon={<UtensilsCrossed className="w-5 h-5" aria-hidden="true" />}
            tone="purple"
            caption="Line items across those orders."
          />
          <StatCard
            title="Average sale"
            value={`${soldOrders.length ? formatRwf(Math.round(soldRevenue / soldOrders.length)) : '—'} RWF`}
            icon={<BarChart3 className="w-5 h-5" aria-hidden="true" />}
            tone="amber"
            caption={soldOrders.length ? 'Per completed sale.' : 'No sales recorded yet.'}
          />
        </div>
      )}

      {/* Filter and Export Bar */}
      <div className="p-5 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-55">
            <label htmlFor="sales-search" className="sr-only">
              Search the sales ledger
            </label>
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              id="sales-search"
              type="text"
              value={salesSearch}
              onChange={(e) => {
                setSalesSearch(e.target.value);
                setSalesPage(1);
              }}
              placeholder="Search by order, customer or dish"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#1F242D] border border-slate-700/50 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/70"
            />
          </div>

          <label htmlFor="sales-pay" className="sr-only">
            Payment method
          </label>
          <select
            id="sales-pay"
            value={salesPaymentFilter}
            onChange={(e) => {
              setSalesPaymentFilter(e.target.value);
              setSalesPage(1);
            }}
            className="bg-[#1F242D] border border-slate-700/50 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/70"
          >
            <option value="all">All payment methods</option>
            <option value="momo">Mobile money</option>
            <option value="card">Card</option>
            <option value="cash">Cash on delivery</option>
          </select>

          <label htmlFor="sales-status" className="sr-only">
            Sales status
          </label>
          <select
            id="sales-status"
            value={salesStatusFilter}
            onChange={(e) => {
              setSalesStatusFilter(e.target.value);
              setSalesPage(1);
            }}
            className="bg-[#1F242D] border border-slate-700/50 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/70"
          >
            <option value="all">All sold statuses</option>
            <option value="delivery">Out for delivery</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleExportSalesCsv}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          <span>Export ledger CSV</span>
        </button>
      </div>

      {/* Ledger Table / List */}
      {loading && displayOrders.length === 0 ? (
        <TableRowsSkeleton cols={4} rows={6} />
      ) : paginatedSoldOrders.length === 0 ? (
        <div className="p-12 text-center bg-[#1A1D24] rounded-2xl border border-dashed border-slate-800 text-xs text-slate-500 space-y-2">
          <ShoppingBag className="w-10 h-10 mx-auto text-slate-600" aria-hidden="true" />
          <div className="font-bold text-white text-sm">No sold transactions in this session</div>
          <p className="text-slate-400">Orders appear here once a courier takes them out.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedSoldOrders.map((order) => (
            <article key={order.id} className="p-5 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono font-black text-emerald-400 text-base">#{order.id}</span>
                  <span className="text-sm font-bold text-white">{order.customerName || 'Customer'}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {order.status === 'delivered' ? 'Delivered' : 'Out for delivery'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 font-mono">{formatWhen(order.createdAt) || 'date unknown'}</span>
                  <span className="text-base font-black text-white font-mono">{formatRwf(order.totalRWF)} RWF</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="space-y-1 bg-[#12141A] p-3 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer and delivery</span>
                  <div className="text-white font-semibold truncate">{order.customerName || 'Customer'}</div>
                  <div className="text-slate-400 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-amber-400 shrink-0" aria-hidden="true" />
                    <span>{order.phone || 'No phone on file'}</span>
                  </div>
                  <div className="text-slate-400 truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-400 shrink-0" aria-hidden="true" />
                    <span>{order.address || 'Kigali'}</span>
                  </div>
                </div>

                <div className="space-y-1 bg-[#12141A] p-3 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Items purchased</span>
                  {(order.items || []).map((item, idx) => (
                    <div key={item.id ?? idx} className="flex justify-between gap-2 text-slate-300 text-[11px]">
                      <span className="truncate">
                        {item.qty || 1}x {item.name}
                      </span>
                      <span className="font-mono text-amber-400 font-bold shrink-0">{formatRwf(item.price)} RWF</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 bg-[#12141A] p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment</span>
                    <div className="text-white font-mono font-bold uppercase mt-1">
                      {order.paymentMethod || 'not recorded'}
                    </div>
                    <div className="text-blue-300 font-semibold text-[11px] mt-0.5 capitalize">
                      Status: {order.status}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/hotpotadmin/orders?track=${order.id}`)}
                    className="w-full py-2 rounded-lg bg-[#1F242D] hover:bg-slate-700/50 border border-slate-700/50 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span className="sr-only">Inspect the courier route for order #{order.id}: </span>
                    <Navigation className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                    <span aria-hidden="true">Inspect route</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {totalSalesPages > 1 && (
        <Pager page={salesPage} pageCount={totalSalesPages} onChange={setSalesPage} noun="sales" />
      )}
    </div>
  );
}
