import React, { useState } from 'react';
import { ShoppingBag, Search, User, Flame, Shield, ChefHat, Bike, LogOut, MapPin, Gift, HelpCircle, History, Heart, Menu, X, Globe, Sun, Moon } from 'lucide-react';

export default function Header({
  currentRole = 'customer',
  onSwitchRole,
  cartCount = 0,
  wishlistCount = 0,
  onOpenCart,
  onOpenAuth,
  onOpenReferral,
  onOpenHelp,
  onOpenProfile,
  user,
  onLogout,
  searchQuery = '',
  setSearchQuery,
  activeTab = 'menu',
  setActiveTab,
  onNavigate,
  lang = 'EN',
  setLang,
  theme = 'dark',
  toggleTheme,
  meals = [],
  onSelectMeal,
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);

  const searchSuggestions = searchQuery.trim()
    ? meals.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.category.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5)
    : [];

  const navigateTo = (url, tabName, roleName) => {
    if (onNavigate) {
      onNavigate(url, tabName, roleName);
      return;
    }

    if (onSwitchRole && roleName) onSwitchRole(roleName);
    if (setActiveTab && tabName) setActiveTab(tabName);

    if (typeof window !== 'undefined' && window.history) {
      window.history.pushState({}, '', url);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface-dark/95 backdrop-blur-md border-b border-white/10 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        <div
          onClick={() => navigateTo('/', 'menu', 'customer')}
          className="flex items-center gap-2.5 cursor-pointer group shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-black border border-white/20 overflow-hidden flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform p-0.5">
            <img src="/assets/1152x1152_S7.png" alt="HotPot Logo" className="w-full h-full object-contain" />
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

        {currentRole === 'customer' && (
          <>
            {setSearchQuery && (
              <div className="hidden md:flex flex-1 max-w-md relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setShowSearchSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setShowSearchSuggestions(true);
                  }}
                  placeholder={lang === 'RW' ? "Shakisha hotpot, pizza..." : "Search hotpot combos, pizza..."}
                  className="w-full bg-surface-card border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-text-main placeholder-text-subdued focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />

                {/* Instant Search Suggestions Dropdown */}
                {showSearchSuggestions && searchSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-surface-dark border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in">
                    <div className="p-2 text-[10px] uppercase font-bold text-text-subdued border-b border-white/10">
                      {lang === 'RW' ? 'Ibisubizo by vuba' : 'Quick Suggestions'}
                    </div>
                    {searchSuggestions.map((meal) => (
                      <div
                        key={meal.id}
                        onClick={() => {
                          if (onSelectMeal) onSelectMeal(meal);
                          setShowSearchSuggestions(false);
                        }}
                        className="p-3 hover:bg-white/5 cursor-pointer flex items-center justify-between border-b border-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <img src={meal.image} alt={meal.name} className="w-8 h-8 rounded-lg object-cover" />
                          <div>
                            <div className="text-xs font-bold text-white">{meal.name}</div>
                            <div className="text-[10px] text-text-muted capitalize">{meal.category}</div>
                          </div>
                        </div>
                        <span className="text-xs font-mono font-bold text-primary">{(meal.price || 0).toLocaleString()} RWF</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => navigateTo('/', 'menu', 'customer')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'menu' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-white'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                {lang === 'RW' ? 'Ibiyo' : 'Menu'}
              </button>

              {user && (
                <button
                  onClick={() => {
                    const r = (user.role || 'customer').toLowerCase();
                    if (r === 'admin') navigateTo('/admin', 'admin', 'admin');
                    else if (r === 'kitchen') navigateTo('/kitchen', 'kitchen', 'kitchen');
                    else if (r === 'delivery' || r === 'rider') navigateTo('/delivery', 'delivery', 'delivery');
                    else navigateTo('/dashboard', 'dashboard', 'customer');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeTab === 'dashboard' || currentRole === 'admin' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-white'
                  }`}
                >
                  {(user.role || '').toLowerCase() === 'admin' ? (
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                  ) : (user.role || '').toLowerCase() === 'kitchen' ? (
                    <ChefHat className="w-3.5 h-3.5 text-blue-400" />
                  ) : (user.role || '').toLowerCase() === 'delivery' || (user.role || '').toLowerCase() === 'rider' ? (
                    <Bike className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <User className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {lang === 'RW'
                      ? 'Konte'
                      : (user.role || '').toLowerCase() === 'admin'
                      ? 'Admin'
                      : (user.role || '').toLowerCase() === 'kitchen'
                      ? 'Kitchen'
                      : (user.role || '').toLowerCase() === 'delivery' || (user.role || '').toLowerCase() === 'rider'
                      ? 'Rider'
                      : 'Dashboard'}
                  </span>
                </button>
              )}

              <button
                onClick={() => navigateTo('/orders', 'orders', 'customer')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'orders' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                {lang === 'RW' ? 'Ibyasabwe' : 'Orders'}
              </button>

              <button
                onClick={() => navigateTo('/tracking', 'tracking', 'customer')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'tracking' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-white'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-accent-gold" />
                {lang === 'RW' ? 'Gukurikirana' : 'Tracking'}
              </button>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Language Switcher (EN / RW) */}
              <button
                onClick={() => setLang && setLang(lang === 'EN' ? 'RW' : 'EN')}
                className="px-2.5 py-1 rounded-xl bg-surface-card border border-white/10 text-xs font-bold text-text-main hover:border-primary flex items-center gap-1.5 transition-all"
                title="Switch Language (EN / RW)"
              >
                <Globe className="w-3.5 h-3.5 text-primary" />
                <span>{lang}</span>
              </button>

              {/* Dark/Light Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl bg-surface-card border border-white/10 text-text-main hover:border-amber-400 transition-all"
                title="Toggle Dark / Light Theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-400" />}
              </button>

              {onOpenReferral && (
                <button
                  onClick={onOpenReferral}
                  className="p-2 text-amber-400 hover:text-amber-300 transition-colors"
                  title="Refer & Earn Vouchers"
                >
                  <Gift className="w-5 h-5" />
                </button>
              )}

              {onOpenHelp && (
                <button
                  onClick={onOpenHelp}
                  className="p-2 text-text-muted hover:text-white transition-colors"
                  title="Help & Support Center"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
              )}

              {wishlistCount > 0 && (
                <div className="relative p-2 text-red-400 hover:text-red-300 transition-colors" title={`${wishlistCount} saved in wishlist`}>
                  <Heart className="w-5 h-5 fill-red-500/20 text-red-400" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md animate-pop-in">
                    {wishlistCount}
                  </span>
                </div>
              )}

              {onOpenCart && (
                <button
                  onClick={onOpenCart}
                  className="relative p-2.5 rounded-xl bg-surface-card border border-white/10 text-text-main hover:border-primary transition-all group"
                  aria-label="View Shopping Cart"
                >
                  <ShoppingBag className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center shadow-md animate-pop-in">
                      {cartCount}
                    </span>
                  )}
                </button>
              )}

              {user ? (
                <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                  <button
                    onClick={onOpenProfile}
                    className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-surface-card border border-white/10 hover:border-primary transition-all group"
                    title="View & Edit Account Profile"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-primary to-orange-500 text-white font-black text-[11px] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                      {user.name ? user.name[0].toUpperCase() : 'U'}
                    </div>
                    <span className="text-xs font-bold text-white max-w-[100px] truncate hidden sm:inline-block">
                      {user.name || 'Account'}
                    </span>
                  </button>

                  <button
                    onClick={onLogout}
                    className="p-2 rounded-xl bg-red-950/40 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 text-xs font-bold flex items-center justify-center transition-all shadow-sm"
                    title="Log Out of Account"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                onOpenAuth && (
                  <button onClick={onOpenAuth} className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-md hover:scale-105 transition-all">
                    <User className="w-3.5 h-3.5" />
                    <span>{lang === 'RW' ? 'Kwinjira' : 'Sign In'}</span>
                  </button>
                )
              )}
            </div>

            <div className="flex sm:hidden items-center gap-2">
              {!user && onOpenAuth && (
                <button
                  onClick={onOpenAuth}
                  className="px-2.5 py-1.5 rounded-xl bg-primary text-white text-[11px] font-bold shadow-sm"
                >
                  {lang === 'RW' ? 'Kwinjira' : 'Sign In'}
                </button>
              )}

              <button onClick={onOpenCart} className="relative p-2 rounded-xl bg-surface-card border border-white/10 text-text-main" aria-label="Shopping Cart">
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
                aria-label="Toggle Navigation Menu"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </>
        )}

        {currentRole !== 'customer' && (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* View Store Menu button */}
            <button
              onClick={() => navigateTo('/', 'menu', 'customer')}
              className="px-3 py-1.5 rounded-xl bg-surface-card border border-white/10 hover:border-primary text-white text-xs font-bold flex items-center gap-1.5 transition-all"
              title="Open Customer Store Menu"
            >
              <Flame className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Store Menu</span>
            </button>

            {/* Role Badge */}
            <span className="text-[11px] sm:text-xs px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span>{currentRole.toUpperCase()}</span>
            </span>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-surface-card border border-white/10 text-text-main hover:border-amber-400 transition-all"
              title="Toggle Dark / Light Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-400" />}
            </button>

            {/* Language Switcher */}
            <button
              onClick={() => setLang && setLang(lang === 'EN' ? 'RW' : 'EN')}
              className="px-2.5 py-1 rounded-xl bg-surface-card border border-white/10 text-xs font-bold text-text-main hover:border-primary flex items-center gap-1.5 transition-all"
              title="Switch Language"
            >
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span>{lang}</span>
            </button>

            {/* User Avatar + Name */}
            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-primary to-orange-500 text-white font-black text-xs flex items-center justify-center shadow-sm">
                  {user.name ? user.name[0].toUpperCase() : 'A'}
                </div>
                <span className="text-xs font-bold text-white max-w-[100px] truncate hidden md:inline-block">
                  {user.name || 'Admin'}
                </span>
              </div>
            )}

            {/* Logout / Exit */}
            <button
              onClick={() => {
                if (onLogout) onLogout();
                navigateTo('/', 'menu', 'customer');
              }}
              className="px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              title="Log Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        )}
      </div>

      {isMobileMenuOpen && currentRole === 'customer' && (
        <div className="sm:hidden border-t border-white/10 bg-surface-dark px-4 py-4 space-y-4 animate-fade-in">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search hotpot, pizza..."
              className="w-full bg-surface-card border border-white/10 rounded-full pl-10 pr-4 py-2 text-xs text-text-main"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                navigateTo('/', 'menu', 'customer');
                setIsMobileMenuOpen(false);
              }}
              className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 ${
                activeTab === 'menu' ? 'bg-primary text-white' : 'bg-surface-card text-text-muted'
              }`}
            >
              <Flame className="w-4 h-4" />
              Menu
            </button>

            {user && (
              <button
                onClick={() => {
                  navigateTo('/dashboard', 'dashboard', 'customer');
                  setIsMobileMenuOpen(false);
                }}
                className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 ${
                  activeTab === 'dashboard' || activeTab === 'orders' ? 'bg-primary text-white' : 'bg-surface-card text-text-muted'
                }`}
              >
                <User className="w-4 h-4" />
                Dashboard
              </button>
            )}

            <button
              onClick={() => {
                navigateTo('/tracking', 'tracking', 'customer');
                setIsMobileMenuOpen(false);
              }}
              className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 ${
                activeTab === 'tracking' ? 'bg-primary text-white' : 'bg-surface-card text-text-muted'
              }`}
            >
              <MapPin className="w-4 h-4" />
              Tracking
            </button>
          </div>

          {/* User Account / Auth Section in Mobile Menu */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
            {user ? (
              <>
                <button
                  onClick={() => {
                    if (onOpenProfile) onOpenProfile();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex-1 p-2 rounded-xl bg-surface-card border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-2"
                >
                  <User className="w-4 h-4 text-primary" />
                  <span>{user.name || 'My Profile'}</span>
                </button>
                <button
                  onClick={() => {
                    if (onLogout) onLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="p-2 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 hover:text-white text-xs font-bold flex items-center gap-1.5"
                  title="Log Out"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  if (onOpenAuth) onOpenAuth();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full btn-primary text-xs py-2.5 font-bold flex items-center justify-center gap-2"
              >
                <User className="w-4 h-4" />
                <span>Sign In / Create Account</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

