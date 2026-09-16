import React from 'react';
import { ChefHat, Clock, AlertCircle, CheckCircle2, ArrowRight, Bell, Sparkles } from 'lucide-react';

export default function KitchenBoard({ orders, onUpdateStatus }) {
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const preparingOrders = orders.filter(o => o.status === 'preparing');
  const readyOrders = orders.filter(o => o.status === 'ready' || o.status === 'delivery');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-lg">
            <ChefHat className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Kitchen Order Dispatch Board</h2>
            <p className="text-xs text-amber-200/80">HotPot Delights Preparation Queue</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-bold">
          <div className="px-3 py-1.5 rounded-lg bg-black/40 border border-amber-500/30 text-amber-300">
            Pending: {pendingOrders.length}
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-black/40 border border-amber-500/30 text-amber-300">
            In Prep: {preparingOrders.length}
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-black/40 border border-amber-500/30 text-amber-300">
            Ready: {readyOrders.length}
          </div>
        </div>
      </div>

      {/* Kanban 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1: New / Pending Orders */}
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-surface-card border border-white/10 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              New Orders ({pendingOrders.length})
            </span>
          </div>

          <div className="space-y-4">
            {pendingOrders.length === 0 ? (
              <div className="p-8 text-center bg-surface-card/40 rounded-xl border border-dashed border-white/10 text-xs text-text-subdued">
                No pending orders
              </div>
            ) : (
              pendingOrders.map(order => (
                <div key={order.id} className="card-item p-4 space-y-3 border-amber-500/30">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="font-mono font-bold text-amber-400 text-sm">#{order.id}</span>
                    <span className="text-[11px] text-text-muted flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      {order.orderTime}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="text-xs font-medium text-text-main flex justify-between">
                        <span>{item.qty}x {item.name}</span>
                        {item.spice && <span className="text-red-400 font-bold">{item.spice}</span>}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => onUpdateStatus(order.id, 'preparing')}
                    className="w-full btn-primary py-2 text-xs bg-amber-600 hover:bg-amber-700"
                  >
                    Start Cooking
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: In Preparation */}
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-surface-card border border-white/10 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
              Cooking & Packing ({preparingOrders.length})
            </span>
          </div>

          <div className="space-y-4">
            {preparingOrders.length === 0 ? (
              <div className="p-8 text-center bg-surface-card/40 rounded-xl border border-dashed border-white/10 text-xs text-text-subdued">
                No meals currently cooking
              </div>
            ) : (
              preparingOrders.map(order => (
                <div key={order.id} className="card-item p-4 space-y-3 border-blue-500/30">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="font-mono font-bold text-blue-400 text-sm">#{order.id}</span>
                    <span className="text-[11px] text-text-muted">{order.customerName}</span>
                  </div>

                  <div className="space-y-1">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="text-xs text-text-main flex justify-between">
                        <span>{item.qty}x {item.name}</span>
                        {item.broth && <span className="text-amber-300">{item.broth}</span>}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => onUpdateStatus(order.id, 'ready')}
                    className="w-full btn-primary py-2 text-xs bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Mark Ready for Pickup
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Ready / Delivery Pickup */}
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-surface-card border border-white/10 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Ready for Rider ({readyOrders.length})
            </span>
          </div>

          <div className="space-y-4">
            {readyOrders.length === 0 ? (
              <div className="p-8 text-center bg-surface-card/40 rounded-xl border border-dashed border-white/10 text-xs text-text-subdued">
                No orders ready at counter
              </div>
            ) : (
              readyOrders.map(order => (
                <div key={order.id} className="card-item p-4 space-y-2 border-emerald-500/30">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-emerald-400 text-sm">#{order.id}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-bold">
                      NOTIFICATION SENT TO RIDER
                    </span>
                  </div>
                  <p className="text-xs text-text-muted">
                    Order #{order.id} is ready at the kitchen. Head over to collect.
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
