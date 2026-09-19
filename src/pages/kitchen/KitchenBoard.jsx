import React, { useState, useEffect } from 'react';
import { ChefHat, Clock, AlertCircle, CheckCircle2, ArrowRight, Bell, Sparkles, Volume2, VolumeX, CheckSquare, Square } from 'lucide-react';

export default function KitchenBoard({ orders = [], onUpdateStatus }) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [checkedItems, setCheckedItems] = useState({});

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const preparingOrders = orders.filter(o => o.status === 'preparing');
  const readyOrders = orders.filter(o => o.status === 'ready' || o.status === 'delivery');

  const toggleCheckItem = (orderId, idx) => {
    const key = `${orderId}-${idx}`;
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Helper to determine prep urgency color badge
  const getTimerBadge = (orderTime = '10:00') => {
    return { label: '15 min target', color: 'bg-emerald-950/90 text-emerald-400 border-emerald-500/40' };
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
      {/* Kitchen Left Sidebar */}
      <aside className="w-full lg:w-64 shrink-0 bg-surface-card border border-amber-500/30 rounded-3xl p-5 space-y-6 h-fit sticky top-28 shadow-xl">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-white">Kitchen Board</div>
            <div className="text-[10px] text-amber-300 font-semibold">Head Chef Console</div>
          </div>
        </div>

        <nav className="space-y-2 text-xs">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 font-bold flex items-center justify-between">
            <span>Pending Orders:</span>
            <span className="font-mono text-white">{pendingOrders.length}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-300 font-bold flex items-center justify-between">
            <span>In Cooking:</span>
            <span className="font-mono text-white">{preparingOrders.length}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-between">
            <span>Ready for Rider:</span>
            <span className="font-mono text-white">{readyOrders.length}</span>
          </div>
        </nav>

        {/* Audio Alert Toggle */}
        <div className="pt-4 border-t border-white/10">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`w-full p-2.5 rounded-xl text-xs font-bold flex items-center justify-between border transition-all ${
              soundEnabled ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' : 'bg-black/40 border-white/10 text-text-muted'
            }`}
          >
            <span className="flex items-center gap-2">
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-text-muted" />}
              New Order Sound
            </span>
            <span className="text-[10px] uppercase font-mono">{soundEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </aside>

      {/* Main Kitchen Content */}
      <div className="flex-1 space-y-6 min-w-0">
        {/* Header Banner */}
        <div className="p-6 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-lg">
              <ChefHat className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">Kitchen Order Dispatch Board</h2>
              <p className="text-xs text-amber-200/80">Live preparation timers & item packaging checklist</p>
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
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${getTimerBadge(order.orderTime).color}`}>
                        ⏱️ 15 min
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="text-xs font-medium text-text-main flex justify-between items-center">
                          <span>{item.qty}x {item.name}</span>
                          {item.spice && <span className="text-red-400 font-bold text-[10px]">{item.spice}</span>}
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
                      <span className="text-[11px] text-text-muted">{order.customerName || 'Customer'}</span>
                    </div>

                    {/* Item Checklist for Packaging */}
                    <div className="space-y-1.5 bg-black/30 p-2.5 rounded-xl border border-white/5">
                      <span className="text-[10px] font-bold text-text-muted uppercase block">Item Checklist:</span>
                      {order.items.map((item, idx) => {
                        const isChecked = checkedItems[`${order.id}-${idx}`];
                        return (
                          <div 
                            key={idx} 
                            onClick={() => toggleCheckItem(order.id, idx)}
                            className={`text-xs flex items-center justify-between cursor-pointer p-1 rounded transition-colors ${
                              isChecked ? 'line-through text-emerald-400/70 bg-emerald-950/30' : 'text-text-main hover:bg-white/5'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              {isChecked ? <CheckSquare className="w-3.5 h-3.5 text-emerald-400" /> : <Square className="w-3.5 h-3.5 text-text-muted" />}
                              {item.qty}x {item.name}
                            </span>
                          </div>
                        );
                      })}
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
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Ready for Dispatch ({readyOrders.length})
              </span>
            </div>

            <div className="space-y-4">
              {readyOrders.length === 0 ? (
                <div className="p-8 text-center bg-surface-card/40 rounded-xl border border-dashed border-white/10 text-xs text-text-subdued">
                  No orders waiting for rider
                </div>
              ) : (
                readyOrders.map(order => (
                  <div key={order.id} className="card-item p-4 space-y-3 border-emerald-500/30">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="font-mono font-bold text-emerald-400 text-sm">#{order.id}</span>
                      <span className="text-[11px] text-emerald-400 font-bold">Waiting for Delivery</span>
                    </div>

                    <div className="space-y-1">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="text-xs text-text-muted">
                          {item.qty}x {item.name}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
