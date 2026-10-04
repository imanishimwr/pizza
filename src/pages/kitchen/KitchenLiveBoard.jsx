import React from 'react';
import {
  ChefHat, Clock, Flame, CheckCircle2, ArrowRight, Eye, Phone, MapPin,
  Check, AlertTriangle, ShieldCheck, Bike, Edit3, User, UserPlus,
  RefreshCw, CheckSquare, Square
} from 'lucide-react';
import { useKitchen } from '../../context/KitchenContext';

export default function KitchenLiveBoard() {
  const {
    pendingOrders,
    preparingOrders,
    readyOrders,
    getUrgency,
    setSelectedOrder,
    setProofModalUrl,
    handleAdvanceStatus,
    processingMap,
    checkedItems,
    toggleCheckItem,
    riders,
    selectedRiderMap,
    setSelectedRiderMap,
    assigningMap,
    handleAssignRiderToOrder,
    openManualRiderModal,
    mobileColumn,
    setMobileColumn
  } = useKitchen();

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Mobile Segmented Column Sticky Tabs (< 768px / md:hidden) */}
      <div className="md:hidden flex items-center gap-1.5 p-2 bg-surface-card/95 backdrop-blur-md border-b border-white/10 shrink-0 sticky top-0 z-10">
        <button
          type="button"
          onClick={() => setMobileColumn('pending')}
          className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 min-h-11 border ${
            mobileColumn === 'pending'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-md ring-1 ring-amber-500/40'
              : 'bg-black/30 border-white/5 text-text-muted hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">New</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-black/60 text-white font-bold">
            {pendingOrders.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMobileColumn('preparing')}
          className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 min-h-11 border ${
            mobileColumn === 'preparing'
              ? 'bg-blue-500/20 text-blue-300 border-blue-500/60 shadow-md ring-1 ring-blue-500/40'
              : 'bg-black/30 border-white/5 text-text-muted hover:text-white'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="truncate">Cooking</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-black/60 text-white font-bold">
            {preparingOrders.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMobileColumn('ready')}
          className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 min-h-11 border ${
            mobileColumn === 'ready'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/40'
              : 'bg-black/30 border-white/5 text-text-muted hover:text-white'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate">Ready</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-black/60 text-white font-bold">
            {readyOrders.length}
          </span>
        </button>
      </div>

      {/* 3-Column Kanban Board Layout filling 100% of height */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 p-2 sm:p-4 overflow-hidden">
        {/* ────────────────────────────────────────────────────────── */}
        {/* COLUMN 1: NEW INCOMING ORDERS (PENDING)                    */}
        {/* ────────────────────────────────────────────────────────── */}
        <div className={`flex-col h-full bg-surface-dark/70 rounded-2xl border border-white/10 border-t-4 border-t-amber-500 overflow-hidden shadow-xl ${
          mobileColumn === 'pending' ? 'flex' : 'hidden md:flex'
        }`}>
          {/* Sticky Column Header */}
          <div className="p-3 sm:p-3.5 border-b border-amber-500/30 bg-surface-card/90 backdrop-blur-md flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wider">
                1. New
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
              {pendingOrders.length}
            </span>
          </div>

          {/* Independent Scrollable Order Cards List */}
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-2.5 sm:p-3 space-y-3">
            {pendingOrders.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-xs text-text-subdued space-y-2">
                <ChefHat className="w-8 h-8 text-text-subdued opacity-30" />
                <span className="font-bold text-white">No new orders</span>
                <p className="text-[11px]">New orders will show here with a sound.</p>
              </div>
            ) : (
              pendingOrders.map(order => {
                const urgency = getUrgency(order);
                return (
                  <div
                    key={order.id}
                    className={`p-3.5 sm:p-4 rounded-2xl bg-surface-card border-2 ${urgency.borderClass} flex flex-col justify-between transition-all shadow-xl space-y-3`}
                  >
                    {/* Card Header with Color-Coded Urgency Header */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-amber-400 text-sm">#{order.id}</span>
                        <span className="text-xs sm:text-sm font-bold text-white truncate max-w-35">
                          {order.customerName || 'Customer'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-black border ${urgency.headerBadge}`}>
                          {urgency.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-text-muted hover:text-white transition-colors min-h-9 min-w-9 flex items-center justify-center"
                          title="View Details"
                          aria-label="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Dropoff Address */}
                    <div className="text-xs text-text-muted flex items-center gap-2 bg-black/40 p-2 sm:p-2.5 rounded-xl border border-white/5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate" title={order.deliveryAddress || order.address}>{order.deliveryAddress || order.address || 'Kigali Dropoff'}</span>
                    </div>

                    {/* Customer Note / Chef Instruction */}
                    {order.notes && (
                      <div className="p-2.5 rounded-xl bg-amber-950/70 border border-amber-500/40 text-[11px] text-amber-200 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-black text-amber-300 block">Note:</span>
                          <span>{order.notes}</span>
                        </div>
                      </div>
                    )}

                    {/* Order Items with High-Contrast Bold Quantities */}
                    <div className="space-y-2 bg-black/40 p-2.5 sm:p-3 rounded-xl border border-white/5">
                      {(order.items || []).map((item, idx) => (
                        <div key={idx} className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="px-2 py-0.5 rounded-lg bg-black text-amber-300 font-mono font-black text-xs border border-amber-500/40 shrink-0 shadow-sm">
                              {item.qty || 1}x
                            </span>
                            <span className="text-xs sm:text-sm md:text-base font-extrabold text-white leading-tight wrap-break-word">
                              {item.name}
                            </span>
                          </div>
                          {item.spice && (
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-500/30 shrink-0">
                              🔥 {item.spice}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Payment Proof Button if available */}
                    {order.payment_proof_url && (
                      <div className="p-2.5 rounded-xl bg-blue-950/70 border border-blue-500/40 text-[11px] text-blue-200 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-black text-blue-300 block">Payment proof sent</span>
                            <span>Check the payment before you cook.</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setProofModalUrl(order.id)}
                          className="py-1.5 px-3 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 font-bold border border-blue-500/40 text-center flex items-center justify-center gap-2 transition-colors w-full cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                          See Payment Photo
                        </button>
                      </div>
                    )}

                    {/* Full-Width High-Contrast Anchored Action Button (min-h-11) */}
                    <button
                      type="button"
                      disabled={!!processingMap[order.id]}
                      onClick={() => handleAdvanceStatus(order.id, 'preparing')}
                      className={`w-full py-3 min-h-11 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] ${
                        processingMap[order.id]
                          ? 'bg-amber-900/50 text-amber-300/60 cursor-not-allowed'
                          : 'bg-linear-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white shadow-orange-600/30 hover:shadow-orange-600/50'
                      }`}
                    >
                      {processingMap[order.id] ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                          <span>Starting...</span>
                        </>
                      ) : (
                        <>
                          <Flame className="w-4 h-4 text-amber-300" />
                          <span>{order.status === 'payment_review' ? 'Check Payment & Start' : 'Start Cooking'}</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────── */}
        {/* COLUMN 2: COOKING & IN PREP (PREPARING)                    */}
        {/* ────────────────────────────────────────────────────────── */}
        <div className={`flex-col h-full bg-surface-dark/70 rounded-2xl border border-white/10 border-t-4 border-t-blue-500 overflow-hidden shadow-xl ${
          mobileColumn === 'preparing' ? 'flex' : 'hidden md:flex'
        }`}>
          {/* Sticky Column Header */}
          <div className="p-3 sm:p-3.5 border-b border-blue-500/30 bg-surface-card/90 backdrop-blur-md flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="px-2 py-0.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-black uppercase tracking-wider">
                2. Cooking
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-blue-500/20 text-blue-300 border border-blue-500/40">
              {preparingOrders.length}
            </span>
          </div>

          {/* Independent Scrollable Order Cards List */}
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-2.5 sm:p-3 space-y-3">
            {preparingOrders.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-xs text-text-subdued space-y-2">
                <Flame className="w-8 h-8 text-text-subdued opacity-30" />
                <span className="font-bold text-white">Nothing cooking</span>
                <p className="text-[11px]">Tap &quot;Start Cooking&quot; on a new order.</p>
              </div>
            ) : (
              preparingOrders.map(order => {
                const urgency = getUrgency(order);
                const totalItemsCount = (order.items || []).length;
                const checkedCount = (order.items || []).filter((_, idx) => checkedItems[`${order.id}-${idx}`]).length;

                return (
                  <div
                    key={order.id}
                    className={`p-3.5 sm:p-4 rounded-2xl bg-surface-card border-2 ${urgency.borderClass} flex flex-col justify-between transition-all shadow-xl space-y-3`}
                  >
                    {/* Card Header */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-blue-400 text-sm">#{order.id}</span>
                        <span className="text-xs sm:text-sm font-bold text-white truncate max-w-35">
                          {order.customerName || 'Customer'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-black border ${urgency.headerBadge}`}>
                          {urgency.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-text-muted hover:text-white transition-colors min-h-9 min-w-9 flex items-center justify-center"
                          title="View Details"
                          aria-label="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Dropoff Address */}
                    <div className="text-xs text-text-muted flex items-center gap-2 bg-black/40 p-2 sm:p-2.5 rounded-xl border border-white/5">
                      <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="truncate" title={order.deliveryAddress || order.address}>{order.deliveryAddress || order.address || 'Kigali Dropoff'}</span>
                    </div>

                    {/* Interactive Packaging Progress */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-black text-text-muted">
                        <span>Packed:</span>
                        <span className={checkedCount === totalItemsCount && totalItemsCount > 0 ? 'text-emerald-400 font-mono' : 'text-blue-400 font-mono'}>
                          {checkedCount}/{totalItemsCount}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-linear-to-r from-blue-500 to-emerald-500 transition-all duration-300"
                          style={{ width: `${totalItemsCount > 0 ? (checkedCount / totalItemsCount) * 100 : 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Interactive Item Checklist with min-h-11 touch targets */}
                    <div className="space-y-1.5 bg-black/40 p-2 sm:p-2.5 rounded-xl border border-white/5">
                      {(order.items || []).map((item, idx) => {
                        const isChecked = checkedItems[`${order.id}-${idx}`];
                        return (
                          <div
                            key={idx}
                            onClick={() => toggleCheckItem(order.id, idx)}
                            className={`text-xs sm:text-sm p-2.5 min-h-11 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                              isChecked
                                ? 'line-through text-emerald-400/70 bg-emerald-950/40 border border-emerald-500/20'
                                : 'text-text-main hover:bg-white/5 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-text-muted shrink-0" />
                              )}
                              <span className="px-2 py-0.5 rounded-md bg-black text-blue-300 font-mono font-black text-xs border border-blue-500/40 shrink-0">
                                {item.qty || 1}x
                              </span>
                              <span className="font-extrabold text-white text-xs sm:text-sm md:text-base leading-tight wrap-break-word">
                                {item.name}
                              </span>
                            </div>
                            {item.spice && (
                              <span className="text-[10px] font-black text-red-400 shrink-0">
                                🔥 {item.spice}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Full-Width High-Contrast Anchored Action Button (min-h-11) */}
                    <button
                      type="button"
                      disabled={!!processingMap[order.id]}
                      onClick={() => handleAdvanceStatus(order.id, 'ready')}
                      className={`w-full py-3 min-h-11 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] ${
                        processingMap[order.id]
                          ? 'bg-emerald-900/50 text-emerald-300/60 cursor-not-allowed'
                          : 'bg-linear-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-emerald-600/30 hover:shadow-emerald-600/50'
                      }`}
                    >
                      {processingMap[order.id] ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-emerald-300" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                          <span>Food is Ready</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────── */}
        {/* COLUMN 3: READY FOR PICKUP (READY)                         */}
        {/* ────────────────────────────────────────────────────────── */}
        <div className={`flex-col h-full bg-surface-dark/70 rounded-2xl border border-white/10 border-t-4 border-t-emerald-500 overflow-hidden shadow-xl ${
          mobileColumn === 'ready' ? 'flex' : 'hidden md:flex'
        }`}>
          {/* Sticky Column Header */}
          <div className="p-3 sm:p-3.5 border-b border-emerald-500/30 bg-surface-card/90 backdrop-blur-md flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider">
                3. Ready
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              {readyOrders.length}
            </span>
          </div>

          {/* Independent Scrollable Order Cards List */}
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-2.5 sm:p-3 space-y-3">
            {readyOrders.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-xs text-text-subdued space-y-2">
                <CheckCircle2 className="w-8 h-8 text-text-subdued opacity-30" />
                <span className="font-bold text-white">No orders ready</span>
                <p className="text-[11px]">Finished orders will show here for the rider.</p>
              </div>
            ) : (
              readyOrders.map(order => {
                const isAssigned = !!(order.assigned_rider_id || order.verification_pin);
                const assignedRider = riders.find(r => r.id === order.assigned_rider_id) || {
                  name: order.riderName || 'Assigned Courier',
                  phone: order.riderPhone || '',
                  plateNumber: order.riderPlate || ''
                };

                const availableRiders = riders.filter(r => r.is_available && (r.status === 'AVAILABLE' || !r.current_order_id));
                const selectedRiderId = selectedRiderMap[order.id] || (availableRiders[0] ? availableRiders[0].id : '');

                // Pickup timeout calculation (10 min auto alert)
                const assignedTime = order.assigned_at ? new Date(order.assigned_at).getTime() : 0;
                const isDelayed = isAssigned && assignedTime > 0 && (Date.now() - assignedTime > 10 * 60 * 1000);

                return (
                  <div
                    key={order.id}
                    className={`p-3.5 sm:p-4 rounded-2xl bg-surface-card border-2 flex flex-col justify-between transition-all shadow-xl space-y-3 ${
                      isDelayed
                        ? 'border-red-500/80 ring-2 ring-red-500/40 bg-red-950/20'
                        : isAssigned
                        ? 'border-amber-500/60'
                        : 'border-emerald-500/40'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-emerald-400 text-sm">#{order.id}</span>
                        <span className="text-xs sm:text-sm font-bold text-white truncate max-w-35">
                          {order.customerName || 'Customer'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isAssigned ? (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                            <Bike className="w-3 h-3" />
                            Rider Set
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-black bg-emerald-950 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Waiting for Rider
                          </span>
                        )}
                        {order.paymentStatus === 'payment_review' && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-black bg-blue-500/20 text-blue-300 border border-blue-500/40 animate-pulse">
                            Check Payment
                          </span>
                        )}
                        {order.paymentStatus === 'pending' && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-black bg-amber-500/20 text-amber-400 border border-amber-500/40">
                            Unpaid
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-text-muted hover:text-white transition-colors min-h-9 min-w-9 flex items-center justify-center"
                          title="View Details"
                          aria-label="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Dropoff Address */}
                    <div className="text-xs text-text-muted flex items-center gap-2 bg-black/40 p-2.5 rounded-xl border border-white/5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{order.deliveryAddress || order.address || 'Kigali Dropoff'}</span>
                    </div>

                    {/* Packed Items Summary */}
                    <div className="space-y-1.5 text-xs bg-black/30 p-2.5 rounded-xl border border-white/5">
                      {(order.items || []).map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-text-main gap-2">
                          <span className="flex items-center gap-2 min-w-0">
                            <span className="font-mono font-black text-emerald-400 text-xs shrink-0">
                              {item.qty || 1}x
                            </span>
                            <span className="font-extrabold text-white text-xs sm:text-sm md:text-base leading-tight wrap-break-word">{item.name}</span>
                          </span>
                          <span className="text-[10px] text-emerald-400 font-bold shrink-0">✓ Packed</span>
                        </div>
                      ))}
                    </div>

                    {/* 10-Minute Delay Warning Banner */}
                    {isDelayed && (
                      <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/50 flex items-center justify-between text-xs animate-pulse">
                        <div className="flex items-center gap-2 text-red-300 font-bold">
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                          <span>Rider is late (10+ min)</span>
                        </div>
                        <span className="text-[10px] font-mono text-red-200">Change rider?</span>
                      </div>
                    )}

                    {/* Handover Flow: Courier Assignment vs Handover PIN */}
                    {!isAssigned ? (
                      <div className="space-y-2.5 bg-[#1A1D24] p-3 rounded-xl border border-slate-800">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                          <span>Choose a rider:</span>
                          <span className="text-emerald-400 font-mono text-[10px]">
                            {availableRiders.length} free
                          </span>
                        </label>

                        {availableRiders.length > 0 && (
                          <div className="space-y-1.5">
                            <select
                              value={selectedRiderId}
                              onChange={(e) => setSelectedRiderMap(prev => ({ ...prev, [order.id]: e.target.value }))}
                              className="w-full bg-[#12141A] border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-amber-500"
                            >
                              {availableRiders.map(r => (
                                <option key={r.id} value={r.id}>
                                  🛵 {r.name} ({r.plateNumber || 'Moto'}) • ON DUTY
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              disabled={!!assigningMap[order.id]}
                              onClick={() => handleAssignRiderToOrder(order.id, selectedRiderId)}
                              className="w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all min-h-11 bg-linear-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-md shadow-orange-500/20 active:scale-95"
                            >
                              {assigningMap[order.id] ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>Sending...</span>
                                </>
                              ) : (
                                <>
                                  <Bike className="w-4 h-4" />
                                  <span>Send to Rider</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {availableRiders.length === 0 && (
                          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-center font-medium">
                            ⚠️ No riders free right now.
                          </div>
                        )}

                        {/* Manual Courier Entry Option */}
                        <button
                          type="button"
                          onClick={() => openManualRiderModal(order)}
                          className="w-full py-2 px-3 rounded-xl bg-surface-card hover:bg-white/10 border border-white/15 text-amber-400 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                          title="Add or assign a specific courier for this order"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>Add Other Rider</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 bg-[#1A1D24] p-3 rounded-xl border border-amber-500/40">
                        {/* Assigned Courier Badge with Reassign trigger */}
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                              🛵
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-white text-xs truncate">{assignedRider.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono truncate">{assignedRider.phone || assignedRider.plateNumber}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => openManualRiderModal(order)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-amber-400 text-[10px] font-bold border border-white/10 flex items-center gap-1 transition-all"
                              title="Edit or Reassign Courier Info"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => alert(`COURIER DETAILS\n\nName: ${assignedRider.name}\nPhone: ${assignedRider.phone || 'N/A'}\nVehicle: ${assignedRider.plateNumber || 'N/A'}`)}
                              className="p-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-[10px] font-bold border border-blue-500/40 flex items-center gap-1 transition-all"
                              title="View Courier Details"
                            >
                              <User className="w-3 h-3" />
                              <span>View</span>
                            </button>
                            <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-mono text-[10px] font-bold border border-blue-500/40">
                              Assigned
                            </span>
                          </div>
                        </div>

                        {/* 4-Digit Verification PIN Strip */}
                        <div className="p-2.5 rounded-xl bg-linear-to-r from-amber-500/15 via-orange-500/15 to-emerald-500/15 border border-amber-500/40 flex items-center justify-between">
                          <div className="space-y-0.5">
                            <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider block">
                              Pickup PIN
                            </span>
                            <span className="text-[10px] text-slate-400">Rider must say this code</span>
                          </div>
                          <div className="px-3 py-1 rounded-lg bg-black/80 border border-amber-400/60 font-mono font-black text-amber-300 text-base tracking-widest shadow-inner">
                            {order.verification_pin || '4829'}
                          </div>
                        </div>

                        {/* Confirm Physical Handover Completed */}
                        <button
                          type="button"
                          disabled={!!processingMap[order.id]}
                          onClick={() => handleAdvanceStatus(order.id, 'delivery')}
                          className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all min-h-11 ${
                            processingMap[order.id]
                              ? 'bg-blue-900/50 text-blue-300/60 cursor-not-allowed'
                              : 'bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-600/30 active:scale-95'
                          }`}
                        >
                          {processingMap[order.id] ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              <span>Rider Took Order</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
