import React, { useState } from 'react';
import { ShoppingBag, Search, User, Flame, Shield, ChefHat, Bike, LogOut, MapPin, Gift, HelpCircle, Menu, X } from 'lucide-react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-surface-dark/95 backdrop-blur-md border-b border-white/10 shadow-lg">
      {/* Quick Role Switcher Banner */}
      <div className="bg-surface-card border-b border-white/5 py-1.5 px-3 sm:px-4 text-xs font-medium flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-text-muted text-[11px] sm:text-xs">
          <span className="inline-block w-2 h-2 rounded-full bg-accent-green animate-pulse"></span>
          <span>Role Switcher:</span>
        </div>
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10 overflow-x-auto max-w-full">
          <button
            onClick={() => onSwitchRole('customer')}
            className={`px-2.5 py-1 rounded-md text-[11px] sm:text-xs transition-all flex items-center gap-1 shrink-0 ${
              currentRole === 'customer' 
                ? 'bg-primary text-white font-semibold shadow-sm' 
                : 'text-text-muted hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Customer</span>
          </button>
          
          <button
            onClick={() => onSwitchRole('kitchen')}
            className={`px-2.5 py-1 rounded-md text-[11px] sm:text-xs transition-all flex items-center gap-1 shrink-0 ${
              currentRole === 'kitchen' 
                ? 'bg-amber-600 text-white font-semibold shadow-sm' 
                : 'text-text-muted hover:text-white'
            }`}
          >
            <ChefHat className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Kitchen</span>
          </button>
          
          <button
            onClick={() => onSwitchRole('delivery')}
            className={`px-2.5 py-1 rounded-md text-[11px] sm:text-xs transition-all flex items-center gap-1 shrink-0 ${
              currentRole === 'delivery' 
                ? 'bg-emerald-600 text-white font-semibold shadow-sm' 
                : 'text-text-muted hover:text-white'
            }`}
          >
            <Bike className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Delivery</span>
          </button>
          
          <button
            onClick={() => onSwitchRole('admin')}
            className={`px-2.5 py-1 rounded-md text-[11px] sm:text-xs transition-all flex items-center gap-1 shrink-0 ${
              currentRole === 'admin' 
                ? 'bg-purple-600 text-white font-semibold shadow-sm' 
                : 'text-text-muted hover:text-white'
            }`}
          >
            <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Admin</span>
          </button>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo */}
        <div 
          onClick={() => { setActiveTab('menu'); setIsMobileMenuOpen(false); }}
          className="flex items-center gap-2.5 cursor-pointer group shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-black border border-white/20 overflow-hidden flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform p-0.5">
            <img
              src="/assets/1152x1152_S7.png"
              alt="HotPot Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <span className="text-base sm:text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-orange-100 to-primary bg-clip-text text-transparent">
              Hot Pot
            </span>
            <span className="block text-[9px] sm:text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block"></span>
              24/7 Delivery in Kigali
            </span>
          </div>
        </div>

        {/* Customer Navigation Features (Desktop) */}
        {currentRole === 'customer' && (
          <>
            {/* Search Input */}
            <div className="hidden lg:flex flex-1 max-w-sm xl:max-w-md relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search hotpot combos, pizza..."
                className="w-full bg-surface-card border border-white/10 rounded-full pl-10 pr-4 py-1.5 text-xs sm:text-sm text-text-main placeholder-text-subdued focus:outline-none focus:border-primary transition-all"
              />
            </div>

            {/* Navigation Tabs */}
            <div className="hidden md:flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-white/10">
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
                Dashboard
              </button>

              <button
                onClick={() => setActiveTab('tracking')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'tracking' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-white'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-accent-gold" />
                Tracking
              </button>
            </div>

            {/* Desktop Actions */}
            <div className="hidden sm:flex items-center gap-2">
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
                  className="btn-primary text-xs py-2 px-3.5"
                >
                  <User className="w-3.5 h-3.5" />
                  Sign In
                </button>
              )}
            </div>

            {/* Mobile Bar Controls */}
            <div className="flex sm:hidden items-center gap-2">
              <button
                onClick={onOpenCart}
                className="relative p-2 rounded-xl bg-surface-card border border-white/10 text-text-main"
              >
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-white bg-surface-card border border-white/10 rounded-xl"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </>
        )}

        {currentRole !== 'customer' && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] sm:text-xs px-2.5 py-1 rounded-full bg-white/10 text-text-muted font-mono truncate max-w-[150px] sm:max-w-none">
              User: {DEMO_USERS[currentRole]?.name}
            </span>
          </div>
        )}
      </div>

      {/* Mobile Drawer Navigation */}
      {isMobileMenuOpen && currentRole === 'customer' && (
        <div className="sm:hidden border-t border-white/10 bg-surface-dark px-4 py-4 space-y-4 animate-fade-in">
          {/* Mobile Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hotpot, pizza..."
              className="w-full bg-surface-card border border-white/10 rounded-full pl-10 pr-4 py-2 text-xs text-text-main"
            />
          </div>

          {/* Navigation Links */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => { setActiveTab('menu'); setIsMobileMenuOpen(false); }}
              className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 ${
                activeTab === 'menu' ? 'bg-primary text-white' : 'bg-surface-card text-text-muted'
              }`}
            >
              <Flame className="w-4 h-4" />
              Menu
            </button>

            <button
              onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
              className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 ${
                activeTab === 'dashboard' || activeTab === 'orders' ? 'bg-primary text-white' : 'bg-surface-card text-text-muted'
              }`}
            >
              <User className="w-4 h-4" />
              Dashboard
            </button>

            <button
              onClick={() => { setActiveTab('tracking'); setIsMobileMenuOpen(false); }}
              className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 ${
                activeTab === 'tracking' ? 'bg-primary text-white' : 'bg-surface-card text-text-muted'
              }`}
            >
              <MapPin className="w-4 h-4" />
              Tracking
            </button>
          </div>

          <div className="flex items-center justify-around pt-2 border-t border-white/5">
            <button onClick={() => { onOpenReferral(); setIsMobileMenuOpen(false); }} className="flex items-center gap-1 text-xs text-amber-400">
              <Gift className="w-4 h-4" />
              Referral
            </button>
            <button onClick={() => { onOpenHelp(); setIsMobileMenuOpen(false); }} className="flex items-center gap-1 text-xs text-text-muted">
              <HelpCircle className="w-4 h-4" />
              Help
            </button>
            {user ? (
              <button onClick={() => { onOpenProfile(); setIsMobileMenuOpen(false); }} className="flex items-center gap-1 text-xs text-primary font-bold">
                Profile ({user.name[0]})
              </button>
            ) : (
              <button onClick={() => { onOpenAuth(); setIsMobileMenuOpen(false); }} className="flex items-center gap-1 text-xs text-primary font-bold">
                Sign In
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

