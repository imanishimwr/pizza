import React, { useEffect, useRef, useState } from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

const DELIVERY_FEE = 1500;

const rwf = (value) => Number(value || 0).toLocaleString();

/** Stable key: the same dish with different spice/broth is a different line. */
const lineKey = (item, index) =>
  `${item?.meal?.id ?? 'item'}-${item?.selectedSpice ?? 'none'}-${item?.selectedBroth ?? 'none'}-${index}`;

function useOverlayA11y(isOpen, onClose) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return undefined;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const first = panel ? panel.querySelector(FOCUSABLE_SELECTOR) : null;
    if (first instanceof HTMLElement) first.focus();
    else if (panel instanceof HTMLElement) panel.focus();
    return () => {
      if (trigger && document.contains(trigger)) trigger.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (typeof closeRef.current === 'function') closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const nodes = Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR));
      if (nodes.length === 0) {
        event.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === first || active === panel || !panel.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  return panelRef;
}

export default function CartDrawer({ isOpen, onClose, cart, onUpdateQty, onRemoveItem, onProceedCheckout }) {
  const open = Boolean(isOpen);
  const items = Array.isArray(cart) ? cart : [];
  const panelRef = useOverlayA11y(open, onClose);
  const [imageFallbacks, setImageFallbacks] = useState({});

  // Money is a plain number of Rwandan francs — never string-concatenated.
  const subtotal = items.reduce(
    (acc, item) => acc + (Number(item?.meal?.price) || 0) * (Number(item?.quantity) || 0),
    0
  );
  const deliveryFee = subtotal > 0 ? DELIVERY_FEE : 0;
  const grandTotal = subtotal + deliveryFee;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] overflow-hidden bg-black/75 backdrop-blur-sm transition-opacity duration-200 cursor-pointer"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        tabIndex={-1}
        className="absolute inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 cursor-default h-full"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="w-screen max-w-md bg-surface-dark border-l border-white/10 shadow-2xl flex flex-col h-full max-h-screen">
          {/* Header */}
          <div className="p-3.5 sm:p-4 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-primary" aria-hidden="true" focusable="false" />
              <h2 id="cart-drawer-title" className="text-base sm:text-lg font-bold text-text-main">
                Your HotPot Order
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-mono font-bold">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close cart"
              className="p-1.5 text-text-muted hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" focusable="false" />
            </button>
          </div>

          {/* Cart Items List - Scrollable */}
          <div className="p-3 sm:p-4 overflow-y-auto space-y-2 flex-1 min-h-0">
            {items.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center space-y-2">
                <ShoppingBag className="w-10 h-10 text-text-subdued" aria-hidden="true" focusable="false" />
                <p className="text-xs text-text-muted font-medium">Your cart is currently empty.</p>
                <button type="button" onClick={onClose} className="btn-secondary text-xs py-1.5 px-3">
                  Explore Menu
                </button>
              </div>
            ) : (
              items.map((item, index) => {
                const key = lineKey(item, index);
                const price = Number(item?.meal?.price) || 0;
                const quantity = Number(item?.quantity) || 0;
                const src = imageFallbacks[key] ? item.meal?.fallbackImage : item.meal?.image;
                return (
                  <div key={key} className="p-2.5 rounded-xl bg-surface-card border border-white/5 space-y-1.5 relative group">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex gap-2.5 min-w-0">
                        {src ? (
                          <img
                            src={src}
                            alt={item.meal?.name || 'Menu item'}
                            className="w-11 h-11 rounded-lg object-cover bg-black/40 shrink-0"
                            onError={() =>
                              setImageFallbacks((prev) => (prev[key] ? prev : { ...prev, [key]: true }))
                            }
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="w-11 h-11 rounded-lg bg-black/40 shrink-0 flex items-center justify-center"
                          >
                            <ShoppingBag className="w-4 h-4 text-text-subdued" />
                          </span>
                        )}
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-text-main leading-snug truncate">
                            {item.meal?.name || 'Menu item'}
                          </h3>
                          {item.selectedSpice && (
                            <span className="text-[10px] text-orange-400 font-semibold block">
                              {item.selectedSpice}
                            </span>
                          )}
                          {item.selectedBroth && (
                            <span className="text-[10px] text-amber-300 block truncate">
                              Broth: {item.selectedBroth}
                            </span>
                          )}
                          {item.specialNote && (
                            <span className="text-[10px] text-text-subdued italic block truncate">
                              &ldquo;{item.specialNote}&rdquo;
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(index)}
                        className="text-text-subdued hover:text-red-400 transition-colors p-1 shrink-0 rounded-lg hover:bg-white/5"
                        aria-label={`Remove ${item.meal?.name || 'item'} from your order`}
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" focusable="false" />
                      </button>
                    </div>

                    <div className="pt-1.5 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => onUpdateQty(index, quantity - 1)}
                          className="w-5 h-5 rounded bg-surface-dark text-text-main hover:bg-white/10 flex items-center justify-center font-bold text-xs"
                          aria-label={`Decrease quantity of ${item.meal?.name || 'item'}`}
                        >
                          <Minus className="w-2.5 h-2.5" aria-hidden="true" focusable="false" />
                        </button>
                        <span
                          className="w-5 text-center font-bold text-xs font-mono text-white"
                          aria-live="polite"
                        >
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQty(index, quantity + 1)}
                          className="w-5 h-5 rounded bg-surface-dark text-text-main hover:bg-white/10 flex items-center justify-center font-bold text-xs"
                          aria-label={`Increase quantity of ${item.meal?.name || 'item'}`}
                        >
                          <Plus className="w-2.5 h-2.5" aria-hidden="true" focusable="false" />
                        </button>
                      </div>

                      <span className="text-xs font-mono font-bold text-primary">
                        {rwf(price * quantity)} RWF
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pricing & Checkout Footer */}
          {items.length > 0 && (
            <div className="p-3 sm:p-4 bg-surface-card border-t border-white/10 space-y-2.5 shrink-0">
              <div className="space-y-1 text-xs text-text-muted">
                <div className="flex justify-between text-[11px]">
                  <span>Subtotal</span>
                  <span className="font-mono text-text-main">{rwf(subtotal)} RWF</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Kigali Delivery Fee</span>
                  <span className="font-mono text-text-main">
                    {deliveryFee === 0 ? 'FREE' : `${rwf(deliveryFee)} RWF`}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-bold text-text-main pt-1.5 border-t border-white/10">
                  <span>Total Amount</span>
                  <span className="font-mono text-primary text-sm">{rwf(grandTotal)} RWF</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onProceedCheckout({
                    cart: items,
                    subtotal,
                    deliveryFee,
                    discount: 0,
                    grandTotal
                  });
                }}
                className="w-full btn-primary py-2.5 text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" focusable="false" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
