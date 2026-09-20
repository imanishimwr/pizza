import React, { useState } from 'react';
import { Bike, MapPin, Phone, CheckCircle2, Navigation, DollarSign, Clock, Shield, PenTool, Camera, X, Check } from 'lucide-react';

export default function RiderDashboard({ orders = [], onUpdateStatus, user }) {
  const activeDeliveries = orders.filter(o => o.status === 'ready' || o.status === 'delivery');
  const completedDeliveries = orders.filter(o => o.status === 'delivered');

  const [selectedOrder, setSelectedOrder] = useState(activeDeliveries[0] || null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [signature, setSignature] = useState(false);
  const [photoConfirmed, setPhotoConfirmed] = useState(false);

  const handleConfirmDelivery = () => {
    if (!selectedOrder) return;
    onUpdateStatus(selectedOrder.id, 'delivered');
    setShowProofModal(false);
    setSignature(false);
    setPhotoConfirmed(false);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
      {/* Rider Left Sidebar */}
      <aside className="w-full lg:w-64 shrink-0 bg-surface-card border border-emerald-500/30 rounded-3xl p-5 space-y-6 h-fit sticky top-28 shadow-xl">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
            <Bike className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-white">Rider Portal</div>
            <div className="text-[10px] text-emerald-300 font-semibold">{user?.name || 'Rider'}</div>
          </div>
        </div>

        <nav className="space-y-1 text-xs">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-between">
            <span>Active Rides:</span>
            <span className="font-mono text-white">{activeDeliveries.length}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-300 font-bold flex items-center justify-between">
            <span>Completed Today:</span>
            <span className="font-mono text-white">{completedDeliveries.length}</span>
          </div>
        </nav>

        <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-1 text-center">
          <div className="text-[10px] uppercase font-bold text-text-subdued">Today's Earnings</div>
          <div className="text-base font-mono font-extrabold text-emerald-400">18,500 RWF</div>
        </div>
      </aside>

      {/* Main Rider Content */}
      <div className="flex-1 space-y-6 min-w-0">
        {/* Header */}
        <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg">
              <Bike className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">Delivery Rider Dashboard</h2>
              <p className="text-xs text-emerald-200/80">Rider: {user?.name || 'Rider'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            <div className="px-4 py-2 rounded-xl bg-black/40 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Today's Earnings: 18,500 RWF
            </div>
          </div>
        </div>

        {/* Grid: Delivery Orders & Control */}
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
                      <span className="font-mono font-bold text-primary">{(order.totalRWF || 0).toLocaleString()} RWF</span>
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
                    {selectedOrder.phone ? (
                      <a
                        href={`tel:${selectedOrder.phone}`}
                        className="btn-secondary text-xs"
                      >
                        <Phone className="w-3.5 h-3.5 text-primary" />
                        Call Customer ({selectedOrder.phone})
                      </a>
                    ) : (
                      <span className="text-xs text-text-subdued italic">No phone on file</span>
                    )}
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
                    <div className="font-bold text-text-main">{selectedOrder.customerName || 'Customer'}</div>
                    <div className="text-text-muted">{selectedOrder.address}</div>
                  </div>
                </div>

                {/* Status Flow Buttons */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <label className="text-xs font-bold uppercase tracking-wider text-text-muted block">
                    Update Delivery Status
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => onUpdateStatus(selectedOrder.id, 'delivery')}
                      className={`btn-secondary text-xs py-3 justify-center ${
                        selectedOrder.status === 'delivery' ? 'bg-amber-600/30 border-amber-500 text-amber-300 font-bold' : ''
                      }`}
                    >
                      1. Picked Up from Kitchen
                    </button>

                    <button
                      onClick={() => setShowProofModal(true)}
                      className="btn-primary text-xs py-3 justify-center bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      2. Complete & Capture Proof
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

      {/* Proof of Delivery Modal */}
      {showProofModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-surface-dark border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Proof of Delivery Confirmation</h3>
              </div>
              <button onClick={() => setShowProofModal(false)} className="text-text-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-text-muted">
              Order <strong className="text-white font-mono">#{selectedOrder.id}</strong> for <strong className="text-white">{selectedOrder.customerName}</strong>
            </p>

            <div className="space-y-3">
              {/* Digital Signature */}
              <div 
                onClick={() => setSignature(true)}
                className={`p-4 rounded-xl border text-center cursor-pointer transition-all ${
                  signature ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' : 'bg-black/40 border-dashed border-white/20 text-text-muted'
                }`}
              >
                <PenTool className="w-6 h-6 mx-auto mb-1 text-amber-400" />
                <span className="text-xs font-bold block">{signature ? '✓ Customer Signature Captured' : 'Tap to Record Customer Digital Signature'}</span>
              </div>

              {/* Photo Confirmation */}
              <div 
                onClick={() => setPhotoConfirmed(true)}
                className={`p-4 rounded-xl border text-center cursor-pointer transition-all ${
                  photoConfirmed ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' : 'bg-black/40 border-dashed border-white/20 text-text-muted'
                }`}
              >
                <Camera className="w-6 h-6 mx-auto mb-1 text-blue-400" />
                <span className="text-xs font-bold block">{photoConfirmed ? '✓ Delivery Photo Verified' : 'Tap to Take Delivery Photo'}</span>
              </div>
            </div>

            <button
              onClick={handleConfirmDelivery}
              className="w-full btn-primary text-xs py-3 bg-emerald-600 hover:bg-emerald-700 justify-center"
            >
              Confirm Handover & Complete Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
