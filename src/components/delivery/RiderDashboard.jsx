import React, { useState } from 'react';
import { Bike, MapPin, Phone, CheckCircle2, Navigation, DollarSign, Clock, Shield } from 'lucide-react';

export default function RiderDashboard({ orders, onUpdateStatus }) {
  const activeDeliveries = orders.filter(o => o.status === 'ready' || o.status === 'delivery');
  const completedDeliveries = orders.filter(o => o.status === 'delivered');

  const [selectedOrder, setSelectedOrder] = useState(activeDeliveries[0] || null);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg">
            <Bike className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Delivery Rider Dashboard</h2>
            <p className="text-xs text-emerald-200/80">Rider: Eric Mugisha • Vehicle RAC 482B</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-bold">
          <div className="px-4 py-2 rounded-xl bg-black/40 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Today's Earnings: 18,500 RWF
          </div>
        </div>
      </div>

      {/* Grid: Delivery Orders & Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active Deliveries List */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
            <Bike className="w-4 h-4 text-primary" />
            Active Delivery Requests ({activeDeliveries.length})
          </h3>

          <div className="space-y-3">
            {activeDeliveries.length === 0 ? (
              <div className="p-8 text-center bg-surface-card rounded-xl border border-white/5 text-xs text-text-subdued">
                No active delivery assignments.
              </div>
            ) : (
              activeDeliveries.map(order => (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all space-y-3 ${
                    selectedOrder?.id === order.id
                      ? 'bg-surface-card-hover border-primary shadow-lg shadow-primary/20'
                      : 'bg-surface-card border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-amber-400 text-sm">#{order.id}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-light text-primary font-bold uppercase">
                      {order.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="font-bold text-text-main">{order.customerName}</div>
                    <div className="text-text-muted flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="line-clamp-1">{order.address}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-primary">{order.totalRWF.toLocaleString()} RWF</span>
                    <a
                      href={`https://www.google.com/maps?q=${encodeURIComponent(order.address)}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-accent-gold font-bold flex items-center gap-1 hover:underline"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      GPS Route
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Delivery Order Control Panel */}
        <div className="lg:col-span-2 space-y-6">
          {selectedOrder ? (
            <div className="p-6 rounded-2xl bg-surface-card border border-white/10 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <span className="text-xs text-text-muted uppercase font-bold tracking-wider">Active Navigation</span>
                  <h3 className="text-2xl font-black text-text-main font-mono">Order #{selectedOrder.id}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${selectedOrder.phone}`}
                    className="btn-secondary text-xs"
                  >
                    <Phone className="w-3.5 h-3.5 text-primary" />
                    Call Customer ({selectedOrder.phone})
                  </a>
                </div>
              </div>

              {/* Order Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-text-subdued uppercase font-bold block">Pickup Restaurant</span>
                  <div className="font-bold text-text-main">HotPot Delights Kitchen HQ</div>
                  <div className="text-text-muted">KG 7 Ave, Kimihurura, Kigali</div>
                </div>

                <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-text-subdued uppercase font-bold block">Customer Drop-off</span>
                  <div className="font-bold text-text-main">{selectedOrder.customerName}</div>
                  <div className="text-text-muted">{selectedOrder.address}</div>
                </div>
              </div>

              {/* Status Flow Buttons */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <label className="text-xs font-bold uppercase tracking-wider text-text-muted block">
                  Update Delivery Status
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => onUpdateStatus(selectedOrder.id, 'delivery')}
                    className={`btn-secondary text-xs py-3 justify-center ${
                      selectedOrder.status === 'delivery' ? 'bg-amber-600/30 border-amber-500 text-amber-300' : ''
                    }`}
                  >
                    1. Picked Up from Kitchen
                  </button>

                  <button
                    onClick={() => {
                      onUpdateStatus(selectedOrder.id, 'delivered');
                      alert(`Finish Order #${selectedOrder.id} was delivered successfully. Nice work!`);
                    }}
                    className="btn-primary text-xs py-3 justify-center bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    2. Mark Delivered
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="p-12 text-center bg-surface-card rounded-2xl border border-white/5 text-text-muted">
              Select an active delivery request on the left to view route navigation details.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
