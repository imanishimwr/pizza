import React from 'react';
import { Home, Clock, User, ShoppingBag } from 'lucide-react';

const ITEM_BASE =
  'flex flex-1 flex-col items-center justify-center gap-0.5 h-full px-1 py-2 text-[0.68rem] transition-colors select-none';
const ITEM_IDLE = 'text-text-muted hover:text-text-main';
const ITEM_ACTIVE = 'text-primary font-bold';

/**
 * Customer-only bottom tab bar. `activeTab` mirrors the view name the app is
 * rendering; navigation goes through `onNavigate(viewName)` so this component
 * never mutates a URL or a tab state of its own.
 */
export default function MobileBottomNav({
  activeTab = 'menu',
  onNavigate,
  cartCount = 0,
  onOpenCart,
  onOpenProfile,
  hasOrders = false
}) {
  const items = Math.max(0, Number(cartCount) || 0);

  const go = (view) => {
    if (typeof onNavigate === 'function') onNavigate(view);
  };

  return (
    <nav
      aria-label="Primary"
      className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-40 h-16 sm:hidden flex items-stretch justify-around px-2 bg-surface-dark/95 backdrop-blur-md border-t border-white/10"
    >
      {/* Menu */}
      <button
        type="button"
        onClick={() => go('menu')}
        aria-current={activeTab === 'menu' ? 'page' : undefined}
        aria-label="Menu"
        className={`${ITEM_BASE} ${activeTab === 'menu' ? ITEM_ACTIVE : ITEM_IDLE}`}
      >
        <Home size={20} aria-hidden="true" focusable="false" />
        <span className={activeTab === 'menu' ? 'font-bold' : 'font-medium'}>Menu</span>
      </button>

      {/* Orders history — only meaningful once the customer has ordered. */}
      {hasOrders && (
        <button
          type="button"
          onClick={() => go('orders')}
          aria-current={activeTab === 'orders' ? 'page' : undefined}
          aria-label="My orders"
          className={`${ITEM_BASE} ${activeTab === 'orders' ? ITEM_ACTIVE : ITEM_IDLE}`}
        >
          <Clock size={20} aria-hidden="true" focusable="false" />
          <span className={activeTab === 'orders' ? 'font-bold' : 'font-medium'}>Orders</span>
        </button>
      )}

      {/* Live tracking */}
      {hasOrders && (
        <button
          type="button"
          onClick={() => go('tracking')}
          aria-current={activeTab === 'tracking' ? 'page' : undefined}
          aria-label="Track my order"
          className={`${ITEM_BASE} ${activeTab === 'tracking' ? ITEM_ACTIVE : ITEM_IDLE}`}
        >
          <MapPinIcon />
          <span className={activeTab === 'tracking' ? 'font-bold' : 'font-medium'}>Track</span>
        </button>
      )}

      {/* Profile */}
      <button
        type="button"
        onClick={onOpenProfile}
        aria-label="Account and profile"
        className={`${ITEM_BASE} ${activeTab === 'profile' ? ITEM_ACTIVE : ITEM_IDLE}`}
      >
        <User size={20} aria-hidden="true" focusable="false" />
        <span className="font-medium">Profile</span>
      </button>

      {/* Cart */}
      <button
        type="button"
        onClick={onOpenCart}
        aria-label={items > 0 ? `Cart, ${items} item${items === 1 ? '' : 's'}` : 'Cart, empty'}
        className={`${ITEM_BASE} text-primary`}
      >
        <span className="relative inline-flex">
          <ShoppingBag size={20} aria-hidden="true" focusable="false" />
          {items > 0 && (
            <span
              aria-hidden="true"
              className="absolute -top-2 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[0.6rem] font-extrabold flex items-center justify-center border-2 border-surface-dark"
            >
              {items > 99 ? '99+' : items}
            </span>
          )}
        </span>
        <span className="font-bold">Cart</span>
      </button>
    </nav>
  );
}

function MapPinIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
