import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Tag, Check } from 'lucide-react';

export default function CartDrawer({ isOpen, onClose, cart, onUpdateQty, onRemoveItem, onProceedCheckout }) {
  if (!isOpen) return null;

  const subtotal = cart.reduce((acc, item) => acc + item.meal.price * item.quantity, 0);
  const deliveryFee = subtotal > 0 ? 1500 : 0;
  const grandTotal = subtotal + deliveryFee;

  return (
    <div
      className="fixed inset-0 z-1000 overflow-hidden bg-black/75 backdrop-blur-sm animate-fade-in cursor-pointer"
      onClick={onClose}
    >
      <div
        className="absolute inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 cursor-default h-full"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="w-screen max-w-md bg-surface-dark border-l border-white/10 shadow-2xl flex flex-col h-full max-h-screen">
          {/* Header */}
          <div className="p-3.5 sm:p-4 border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <h2 className="text-base sm:text-lg font-bold text-text-main">Your HotPot Order</h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-mono font-bold">
                {cart.length} items
              </span>
            </div>
            <button onClick={onClose} className="p-1.5 text-text-muted hover:text-white transition-colors rounded-lg hover:bg-white/5">
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Cart Items List - Scrollable */}
          <div className="p-3 sm:p-4 overflow-y-auto space-y-2 flex-1 min-h-0">
            {cart.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center space-y-2">
                <ShoppingBag className="w-10 h-10 text-text-subdued" />
                <p className="text-xs text-text-muted font-medium">Your cart is currently empty.</p>
                <button onClick={onClose} className="btn-secondary text-xs py-1.5 px-3">Explore Menu</button>
              </div>
            ) : (
              cart.map((item, index) => (
                <div key={index} className="p-2.5 rounded-xl bg-surface-card border border-white/5 space-y-1.5 relative group">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex gap-2.5 min-w-0">
                      <img
                        src={item.meal.image}
                        alt={item.meal.name}
                        className="w-11 h-11 rounded-lg object-cover bg-black/40 shrink-0"
                        onError={(event) => {
                          event.target.src = item.meal.fallbackImage;
                        }}
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-text-main leading-snug truncate">{item.meal.name}</h4>
                        {item.selectedSpice && <span className="text-[10px] text-orange-400 font-semibold block">{item.selectedSpice}</span>}
                        {item.selectedBroth && <span className="text-[10px] text-amber-300 block truncate">Broth: {item.selectedBroth}</span>}
                        {item.specialNote && <span className="text-[10px] text-text-subdued italic block truncate">"{item.specialNote}"</span>}
                      </div>
                    </div>

                    <button onClick={() => onRemoveItem(index)} className="text-text-subdued hover:text-red-400 transition-colors p-1 shrink-0" title="Remove item">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="pt-1.5 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-lg p-0.5">
                      <button onClick={() => onUpdateQty(index, item.quantity - 1)} className="w-5 h-5 rounded bg-surface-dark text-text-main hover:bg-white/10 flex items-center justify-center font-bold text-xs">
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <span className="w-4 text-center font-bold text-xs font-mono text-white">{item.quantity}</span>
                      <button onClick={() => onUpdateQty(index, item.quantity + 1)} className="w-5 h-5 rounded bg-surface-dark text-text-main hover:bg-white/10 flex items-center justify-center font-bold text-xs">
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    <span className="text-xs font-mono font-bold text-primary">
                      {(item.meal.price * item.quantity)?.toLocaleString() ?? ''} RWF
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pricing & Checkout Footer - Fixed at bottom of drawer */}
          {cart.length > 0 && (
            <div className="p-3 sm:p-4 bg-surface-card border-t border-white/10 space-y-2.5 shrink-0">
              <div className="space-y-1 text-xs text-text-muted">
                <div className="flex justify-between text-[11px]">
                  <span>Subtotal</span>
                  <span className="font-mono text-text-main">{subtotal?.toLocaleString() ?? ''} RWF</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Kigali Delivery Fee</span>
                  <span className="font-mono text-text-main">
                    {deliveryFee === 0 ? 'FREE' : `${deliveryFee?.toLocaleString() ?? ''} RWF`}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-bold text-text-main pt-1.5 border-t border-white/10">
                  <span>Total Amount</span>
                  <span className="font-mono text-primary text-sm">{grandTotal?.toLocaleString() ?? ''} RWF</span>
                </div>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onProceedCheckout({ cart, subtotal, deliveryFee, discount: 0, grandTotal });
                }}
                className="w-full btn-primary py-2.5 text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
