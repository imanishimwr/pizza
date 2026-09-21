import React from 'react';
import { Home, Sparkles, Clock, User, ShoppingBag } from 'lucide-react';

export default function MobileBottomNav({ activeTab, setActiveTab, cartCount, onOpenCart, onOpenCustomBuilder, onOpenProfile }) {
  return (
    <div className="mobile-bottom-nav" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, height: '64px',
      backgroundColor: 'rgba(18, 18, 20, 0.95)', backdropFilter: 'blur(12px)',
      borderTop: '1px solid rgba(255, 255, 255, 0.1)', zIndex: 40,
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      padding: '0 8px'
    }}>
      {/* Home / Menu Tab */}
      <button
        onClick={() => setActiveTab('menu')}
        style={{
          background: 'none', border: 'none', color: activeTab === 'menu' ? '#f97316' : '#a1a1aa',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer'
        }}
      >
        <Home size={20} />
        <span style={{ fontSize: '0.68rem', fontWeight: activeTab === 'menu' ? 700 : 500 }}>Menu</span>
      </button>

      {/* Custom Pizza Builder Tab */}
      <button
        onClick={onOpenCustomBuilder}
        style={{
          background: 'none', border: 'none', color: '#f59e0b',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer'
        }}
      >
        <Sparkles size={20} />
        <span style={{ fontSize: '0.68rem', fontWeight: 600 }}>Create</span>
      </button>

      {/* Active Orders / Live Tracking */}
      <button
        onClick={() => setActiveTab('tracking')}
        style={{
          background: 'none', border: 'none', color: activeTab === 'tracking' ? '#f97316' : '#a1a1aa',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer'
        }}
      >
        <Clock size={20} />
        <span style={{ fontSize: '0.68rem', fontWeight: activeTab === 'tracking' ? 700 : 500 }}>Track</span>
      </button>

      {/* Profile */}
      <button
        onClick={onOpenProfile}
        style={{
          background: 'none', border: 'none', color: activeTab === 'profile' ? '#f97316' : '#a1a1aa',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer'
        }}
      >
        <User size={20} />
        <span style={{ fontSize: '0.68rem', fontWeight: activeTab === 'profile' ? 700 : 500 }}>Profile</span>
      </button>

      {/* Cart with badge */}
      <button
        onClick={onOpenCart}
        style={{
          background: 'none', border: 'none', color: '#f97316',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer',
          position: 'relative'
        }}
      >
        <div style={{ position: 'relative' }}>
          <ShoppingBag size={20} />
          {cartCount > 0 && (
            <span style={{
              position: 'absolute', top: '-6px', right: '-8px',
              backgroundColor: '#ef4444', color: '#fff', fontSize: '0.65rem',
              fontWeight: 800, borderRadius: '10px', padding: '1px 5px',
              border: '2px solid #121214'
            }}>
              {cartCount}
            </span>
          )}
        </div>
        <span style={{ fontSize: '0.68rem', fontWeight: 700 }}>Cart</span>
      </button>
    </div>
  );
}
