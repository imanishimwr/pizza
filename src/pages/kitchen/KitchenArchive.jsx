import React, { useMemo, useState } from 'react';
import { ShoppingBag, Eye, Search, Filter, Calendar, MapPin, CheckCircle2 } from 'lucide-react';
import { useKitchen } from '../../context/KitchenContext';

export default function KitchenArchive() {
  const { completedOrders, setSelectedOrder } = useKitchen();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredArchive = useMemo(() => {
    let list = completedOrders;
    if (statusFilter !== 'all') {
      list = list.filter(o => o.status === statusFilter);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(o =>
        String(o.id || '').toLowerCase().includes(q) ||
        String(o.customerName || '').toLowerCase().includes(q) ||
        String(o.phone || '').toLowerCase().includes(q) ||
        (o.items || []).some(it => String(it.name || '').toLowerCase().includes(q))
      );
    }
    return list;
  }, [completedOrders, statusFilter, searchTerm]);

  return (
    <div className="h-full overflow-y-auto no-scrollbar p-3 sm:p-5 space-y-4 font-sans">
      <div className="p-3.5 sm:p-5 rounded-2xl bg-surface-card border border-white/10 shadow-xl space-y-4">
        {/* Header & Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-purple-400" />
              Past Orders
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Look at orders that are done.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs font-mono font-bold">
              {completedOrders.length} done
            </span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search order, name, phone or food..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-text-subdued focus:outline-none focus:border-amber-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                statusFilter === 'all'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                  : 'bg-black/30 border-white/10 text-text-muted hover:text-white'
              }`}
            >
              All ({completedOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('delivered')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                statusFilter === 'delivered'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-black/30 border-white/10 text-text-muted hover:text-white'
              }`}
            >
              Delivered
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('delivery')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                statusFilter === 'delivery'
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                  : 'bg-black/30 border-white/10 text-text-muted hover:text-white'
              }`}
            >
              On the way
            </button>
          </div>
        </div>

        {/* Order Cards List */}
        <div className="space-y-3 pt-1">
          {filteredArchive.length === 0 ? (
            <div className="py-16 text-center text-xs text-text-subdued space-y-2">
              <ShoppingBag className="w-8 h-8 text-text-subdued mx-auto opacity-30" />
              <p className="font-bold text-white">No orders found.</p>
              <p className="text-[11px]">Done orders will show here.</p>
            </div>
          ) : (
            filteredArchive.map(order => (
              <div
                key={order.id}
                className="p-3.5 sm:p-4 rounded-xl bg-black/40 border border-white/5 hover:border-white/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3.5 shadow-sm"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono font-black text-amber-400 text-xs">#{order.id}</span>
                    <span className="text-xs sm:text-sm font-bold text-white truncate">{order.customerName || 'Customer'}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                      order.status === 'delivered'
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40'
                        : order.status === 'delivery'
                        ? 'bg-blue-950 text-blue-400 border-blue-500/40'
                        : 'bg-slate-900 text-slate-300 border-slate-700'
                    }`}>
                      {order.status === 'delivered' ? '✅ DELIVERED' : '🛵 ON THE WAY'}
                    </span>
                    <span className="text-[11px] text-text-subdued font-mono">
                      {order.orderTime || (order.created_at ? new Date(order.created_at).toLocaleTimeString() : '')}
                    </span>
                  </div>

                  <div className="text-xs text-text-muted flex flex-wrap items-center gap-2">
                    <span>
                      Items: <strong className="text-slate-200">{(order.items || []).map(i => `${i.qty || 1}x ${i.name}`).join(', ') || 'Custom'}</strong>
                    </span>
                    <span>•</span>
                    <span className="font-mono text-amber-300 font-bold">
                      {Number(order.totalRWF || 0)?.toLocaleString()} RWF
                    </span>
                  </div>

                  {(order.deliveryAddress || order.address) && (
                    <div className="text-[11px] text-text-subdued flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-amber-400/80 shrink-0" />
                      <span className="truncate">{order.deliveryAddress || order.address}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(order)}
                    className="px-4 py-2 rounded-xl bg-surface-card hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-1.5 min-h-11 transition-all shadow-sm"
                  >
                    <Eye className="w-4 h-4 text-amber-400" />
                    <span>View</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
