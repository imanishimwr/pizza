import React from 'react';
import { ShoppingBag, Search, User, Flame, Shield, ChefHat, Bike, LogOut, MapPin, Gift, HelpCircle } from 'lucide-react';
import { DEMO_USERS } from '../data/mockData';

export default function Header({ 
  currentRole, 
  onSwitchRole, 
  cartCount, 
  onOpenCart, 
  onOpenAuth, 
  onOpenReferral,
  onOpenHelp,
  onOpenProfile,
  user,
  onLogout,
  searchQuery,
  setSearchQuery,
  activeTab,
  setActiveTab
}) {
  return (
    <header className="sticky top-0 z-40 bg-surface-dark/95 backdrop-blur-md border-b border-white/10 shadow-lg">
      {/* Quick Role Switcher Banner */}
      <div className="bg-surface-card border-b border-white/5 py-1.5 px-4 text-xs font-medium flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-text-muted">
          <span className="inline-block w-2 h-2 rounded-full bg-accent-green animate-pulse"></span>
          <span>APK App Multi-Role Demo Mode:</span>
        </div>
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
          <button
            onClick={() => onSwitchRole('customer')}
            className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
              currentRole === 'customer' 
                ? 'bg-primary text-white font-semibold shadow-sm' 
                : 'text-text-muted hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Customer App
          </button>
          
          <button
            onClick={() => onSwitchRole('kitchen')}
            className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
              currentRole === 'kitchen' 
                ? 'bg-amber-600 text-white font-semibold shadow-sm' 
                : 'text-text-muted hover:text-white'
            }`}
          >
            <ChefHat className="w-3.5 h-3.5" />
            Kitchen Board
          </button>
          
          <button
            onClick={() => onSwitchRole('delivery')}
            className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
              currentRole === 'delivery' 
                ? 'bg-emerald-600 text-white font-semibold shadow-sm' 
                : 'text-text-muted hover:text-white'
            }`}
          >
            <Bike className="w-3.5 h-3.5" />
            Delivery Rider
          </button>
          
          <button
            onClick={() => onSwitchRole('admin')}
            className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
              currentRole === 'admin' 
                ? 'bg-purple-600 text-white font-semibold shadow-sm' 
                : 'text-text-muted hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Admin Portal
          </button>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div 
          onClick={() => setActiveTab('menu')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-orange-500 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
            <Flame className="w-6 h-6 text-white animate-bounce" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-orange-100 to-primary bg-clip-text text-transparent">
              HotPot Delights
            </span>
            <span className="block text-[10px] text-accent-gold font-semibold uppercase tracking-wider">
              Kigali Gourmet Delivery
            </span>
          </div>
        </div>

        {/* Customer Navigation Features */}
        {currentRole === 'customer' && (
          <>
            {/* Search Input */}
            <div className="hidden md:flex flex-1 max-w-md relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search hotpot combos, spicy broths, pizza..."
                className="w-full bg-surface-card border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-text-main placeholder-text-subdued focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setActiveTab('menu')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'menu' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-white'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                Menu
              </button>

              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'dashboard' || activeTab === 'orders' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                My Dashboard
              </button>

              <button
                onClick={() => setActiveTab('tracking')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'tracking' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-white'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-accent-gold" />
                Live Tracking
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={onOpenReferral}
                className="p-2 text-amber-400 hover:text-amber-300 transition-colors"
                title="Refer & Earn Vouchers"
              >
                <Gift className="w-5 h-5" />
              </button>

              <button
                onClick={onOpenHelp}
                className="p-2 text-text-muted hover:text-white transition-colors"
                title="Help & Support Center"
              >
                <HelpCircle className="w-5 h-5" />
              </button>

              <button
                onClick={onOpenCart}
                className="relative p-2.5 rounded-xl bg-surface-card border border-white/10 text-text-main hover:border-primary transition-all group"
                aria-label="View Shopping Cart"
              >
                <ShoppingBag className="w-5 h-5 group-hover:scale-110 transition-transform" />
                {cartCount > 0 && (
                  <span key={cartCount} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center shadow-md animate-pop-in">
                    {cartCount}
                  </span>
                )}
              </button>

              {user ? (
                <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                  <button
                    onClick={onOpenProfile}
                    className="w-8 h-8 rounded-full bg-primary-light border border-primary/40 flex items-center justify-center font-bold text-xs text-primary hover:scale-105 transition-transform"
                    title="Account Profile"
                  >
                    {user.name ? user.name[0] : 'U'}
                  </button>
                  <button
                    onClick={onLogout}
                    className="p-2 text-text-muted hover:text-red-400 transition-colors"
                    title="Log Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="btn-primary text-xs py-2 px-4"
                >
                  <User className="w-3.5 h-3.5" />
                  Sign In
                </button>
              )}
            </div>
          </>
        )}

        {currentRole !== 'customer' && (
          <div className="flex items-center gap-3">
            <span className="text-xs px-3 py-1 rounded-full bg-white/10 text-text-muted font-mono">
              Active User: {DEMO_USERS[currentRole]?.name}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
