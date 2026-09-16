import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Tag, Check } from 'lucide-react';

export default function CartDrawer({ isOpen, onClose, cart, onUpdateQty, onRemoveItem, onProceedCheckout }) {
  const [voucher, setVoucher] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);

  if (!isOpen) return null;

  const subtotal = cart.reduce((acc, item) => acc + item.meal.price * item.quantity, 0);
  const deliveryFee = appliedVoucher?.code === 'KIGALIFREE' ? 0 : subtotal > 0 ? 1500 : 0;
  const discount = appliedVoucher?.code === 'BOGOPIZZA' ? 3000 : 0;
  const grandTotal = Math.max(0, subtotal + deliveryFee - discount);

  const handleApplyVoucher = (event) => {
    event.preventDefault();

    if (voucher.toUpperCase() === 'KIGALIFREE') {
      setAppliedVoucher({ code: 'KIGALIFREE', desc: 'Free Delivery Granted!' });
      return;
    }

    if (voucher.toUpperCase() === 'BOGOPIZZA') {
      setAppliedVoucher({ code: 'BOGOPIZZA', desc: '3,000 RWF Discount Applied!' });
      return;
    }

    alert('Invalid voucher code. Try KIGALIFREE or BOGOPIZZA');
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-sm animate-fade-in cursor-pointer"
      onClick={onClose}
    >
      <div
        className="absolute inset-y-0 right-0 max-w-full flex pl-10 cursor-default"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="w-screen max-w-md bg-surface-dark border-l border-white/10 shadow-2xl flex flex-col justify-between">
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-text-main">Your HotPot Order</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-mono font-bold">
                {cart.length} items
              </span>
            </div>
            <button onClick={onClose} className="p-2 text-text-muted hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            {cart.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center space-y-3">
                <ShoppingBag className="w-12 h-12 text-text-subdued" />
                <p className="text-sm text-text-muted font-medium">Your cart is currently empty.</p>
                <button onClick={onClose} className="btn-secondary text-xs">Explore Menu</button>
              </div>
            ) : (
              cart.map((item, index) => (
                <div key={index} className="p-3.5 rounded-xl bg-surface-card border border-white/5 space-y-2 relative group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3">
                      <img
                        src={item.meal.image}
                        alt={item.meal.name}
                        className="w-14 h-14 rounded-lg object-cover bg-black/40"
                        onError={(event) => {
                          event.target.src = item.meal.fallbackImage;
                        }}
                      />
                      <div>
                        <h4 className="text-sm font-bold text-text-main leading-snug">{item.meal.name}</h4>
                        {item.selectedSpice && <span className="text-[11px] text-orange-400 font-semibold block">{item.selectedSpice}</span>}
                        {item.selectedBroth && <span className="text-[11px] text-amber-300 block">Broth: {item.selectedBroth}</span>}
                        {item.specialNote && <span className="text-[10px] text-text-subdued italic block">"{item.specialNote}"</span>}
                      </div>
                    </div>

                    <button onClick={() => onRemoveItem(index)} className="text-text-subdued hover:text-red-400 transition-colors p-1" title="Remove item">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg p-0.5">
                      <button onClick={() => onUpdateQty(index, item.quantity - 1)} className="w-6 h-6 rounded bg-surface-dark text-text-main hover:bg-white/10 flex items-center justify-center font-bold text-xs">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center font-bold text-xs font-mono text-white">{item.quantity}</span>
                      <button onClick={() => onUpdateQty(index, item.quantity + 1)} className="w-6 h-6 rounded bg-surface-dark text-text-main hover:bg-white/10 flex items-center justify-center font-bold text-xs">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="text-sm font-mono font-bold text-primary">
                      {(item.meal.price * item.quantity).toLocaleString()} RWF
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {cart.length > 0 && (
            <div className="p-5 bg-surface-card border-t border-white/10 space-y-4">
              <form onSubmit={handleApplyVoucher} className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={voucher}
                    onChange={(event) => setVoucher(event.target.value)}
                    placeholder="Voucher code (e.g. KIGALIFREE)"
                    className="w-full bg-surface-dark border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-text-main placeholder-text-subdued uppercase focus:outline-none focus:border-primary"
                  />
                </div>
                <button type="submit" className="btn-secondary text-xs px-3">Apply</button>
              </form>

              {appliedVoucher && (
                <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    {appliedVoucher.desc}
                  </span>
                  <button onClick={() => setAppliedVoucher(null)} className="text-[10px] underline hover:text-white">Remove</button>
                </div>
              )}

              <div className="space-y-1.5 text-xs text-text-muted pt-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono text-text-main">{subtotal.toLocaleString()} RWF</span>
                </div>
                <div className="flex justify-between">
                  <span>Kigali Delivery Fee</span>
                  <span className="font-mono text-text-main">
                    {deliveryFee === 0 ? 'FREE' : `${deliveryFee.toLocaleString()} RWF`}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount</span>
                    <span className="font-mono">-{discount.toLocaleString()} RWF</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-text-main pt-2 border-t border-white/10">
                  <span>Total Amount</span>
                  <span className="font-mono text-primary text-base">{grandTotal.toLocaleString()} RWF</span>
                </div>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onProceedCheckout({ cart, subtotal, deliveryFee, discount, grandTotal });
                }}
                className="w-full btn-primary py-3 text-xs"
              >
                Proceed to Checkout
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

