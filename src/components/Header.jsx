import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ShoppingBag,
  Search,
  User,
  Flame,
  Shield,
  ChefHat,
  Bike,
  LogOut,
  MapPin,
  HelpCircle,
  History,
  Heart,
  Menu,
  X,
  Globe,
  Sun,
  Moon
} from 'lucide-react';

import { normalizeRole } from '../services/apiService';

/** Views the app can be asked to show. */
const VIEWS = ['menu', 'product-detail', 'orders', 'tracking', 'dashboard', 'admin', 'kitchen', 'delivery'];

/** Lowercase roles the server issues. Never uppercased, never inferred. */
const ROLE_LABELS = {
  customer: 'Dashboard',
  admin: 'Admin',
  kitchen: 'Kitchen',
  delivery: 'Rider'
};

const ROLE_ICONS = {
  customer: User,
  admin: Shield,
  kitchen: ChefHat,
  delivery: Bike
};

const matches = (meal, needle) =>
  [meal?.name, meal?.category, meal?.description]
    .some((field) => typeof field === 'string' && field.toLowerCase().includes(needle));

const formatRWF = (value) => `${Number(value || 0).toLocaleString()} RWF`;

export default function Header({
  view = 'menu',
  onNavigate,
  cartCount = 0,
  wishlistCount = 0,
  onOpenCart,
  onOpenAuth,
  onOpenHelp,
  onOpenProfile,
  user,
  onLogout,
  searchQuery = '',
  setSearchQuery,
  lang = 'EN',
  setLang,
  theme = 'dark',
  toggleTheme,
  meals = [],
  onSelectMeal,
  hasOrders = false
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const blurTimer = useRef(null);

  // `cartCount` and `wishlistCount` are computed by the app. Coerce for display
  // only — never re-derive either from a different field on the cart items.
  const items = Math.max(0, Number(cartCount) || 0);
  const saved = Math.max(0, Number(wishlistCount) || 0);
  const activeView = VIEWS.includes(view) ? view : 'menu';

  const role = user?.role ? normalizeRole(user.role) : null;
  const RoleIcon = ROLE_ICONS[role] || User;
  const roleLabel = ROLE_LABELS[role] || 'Dashboard';

  const navigate = useCallback(
    (nextView) => {
      setIsMobileMenuOpen(false);
      if (typeof onNavigate === 'function') onNavigate(nextView);
    },
    [onNavigate]
  );

  const searchSuggestions = useMemo(() => {
    const needle = String(searchQuery || '').trim().toLowerCase();
    if (!needle) return [];
    return meals.filter((meal) => matches(meal, needle)).slice(0, 5);
  }, [meals, searchQuery]);

  useEffect(() => {
    if (searchSuggestions.length === 0) setShowSearchSuggestions(false);
  }, [searchSuggestions.length]);

  // A pending blur timer must not fire after unmount or after the dropdown is
  // already gone, or it will set state on an unmounted component.
  useEffect(
    () => () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    },
    []
  );

  // Escape closes the mobile drawer. Registered once; the drawer is the only
  // thing on screen that can be dismissed this way while it is open.
  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setIsMobileMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isMobileMenuOpen]);

  const updateSearch = (event) => {
    if (typeof setSearchQuery === 'function') setSearchQuery(event.target.value);
    setShowSearchSuggestions(true);
  };

  const scheduleHideSuggestions = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    blurTimer.current = setTimeout(() => {
      blurTimer.current = null;
      setShowSearchSuggestions(false);
    }, 180);
  };

  const pickMeal = (meal) => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    blurTimer.current = null;
    setShowSearchSuggestions(false);
    if (typeof onSelectMeal === 'function') onSelectMeal(meal);
  };

  const navButtonClass = (isActive) =>
    `px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
      isActive ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-white'
    }`;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface-dark/95 backdrop-blur-md border-b border-white/10 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        <button
          type="button"
          onClick={() => navigate('menu')}
          aria-label="HotPot Delights home"
          className="flex items-center gap-2.5 cursor-pointer group shrink-0 text-left"
        >
          <span className="w-10 h-10 rounded-xl bg-black border border-white/20 overflow-hidden flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform p-0.5">
            <img src="/assets/1152x1152_S7.png" alt="" className="w-full h-full object-contain" />
          </span>
          <span>
            <span className="block text-base sm:text-xl font-extrabold tracking-tight bg-linear-to-r from-white via-orange-100 to-primary bg-clip-text text-transparent">
              Hot Pot
            </span>
            <span className="text-[9px] sm:text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" aria-hidden="true" />
              24/7 Delivery in Kigali
            </span>
          </span>
        </button>

        {/* Desktop search */}
        {typeof setSearchQuery === 'function' && (
          <div className="hidden md:flex flex-1 max-w-md relative">
            <Search
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              aria-hidden="true"
              focusable="false"
            />
            <label htmlFor="header-search" className="sr-only">
              Search the menu
            </label>
            <input
              id="header-search"
              type="search"
              role="combobox"
              aria-expanded={showSearchSuggestions}
              aria-controls="header-search-suggestions"
              aria-autocomplete="list"
              autoComplete="off"
              value={searchQuery}
              onFocus={() => setShowSearchSuggestions(true)}
              onBlur={scheduleHideSuggestions}
              onChange={updateSearch}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setShowSearchSuggestions(false);
              }}
              placeholder={lang === 'RW' ? 'Shakisha hotpot, pizza...' : 'Search hotpot combos, pizza...'}
              className="w-full bg-surface-card border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-text-main placeholder-text-subdued focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />

            {showSearchSuggestions && searchSuggestions.length > 0 && (
              <ul
                id="header-search-suggestions"
                role="listbox"
                aria-label="Menu suggestions"
                className="absolute top-full left-0 right-0 mt-2 bg-surface-dark border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 transition-opacity duration-200"
              >
                <li className="p-2 text-[10px] uppercase font-bold text-text-subdued border-b border-white/10">
                  {lang === 'RW' ? 'Ibisubizo by vuba' : 'Quick Suggestions'}
                </li>
                {searchSuggestions.map((meal) => (
                  <li key={meal.id}>
                    <button
                      type="button"
                      // Keep the input focused so its blur timer cannot close the
                      // list out from under the click.
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => pickMeal(meal)}
                      className="w-full p-3 hover:bg-white/5 cursor-pointer flex items-center justify-between gap-2 border-b border-white/5 transition-colors text-left"
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <img src={meal.image || meal.fallbackImage} alt="" className="w-8 h-8 rounded-lg object-cover" />
                        <span className="min-w-0">
                          <span className="block text-xs font-bold text-white truncate">{meal.name}</span>
                          <span className="block text-[10px] text-text-muted capitalize truncate">{meal.category}</span>
                        </span>
                      </span>
                      <span className="text-xs font-mono font-bold text-primary whitespace-nowrap">
                        {formatRWF(meal.price)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <nav aria-label="Main" className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => navigate('menu')}
            aria-current={activeView === 'menu' ? 'page' : undefined}
            className={navButtonClass(activeView === 'menu')}
          >
            <Flame className="w-3.5 h-3.5" aria-hidden="true" focusable="false" />
            {lang === 'RW' ? 'Ibiyo' : 'Menu'}
          </button>

          {role === 'admin' && (
            <>
              <button
                type="button"
                onClick={() => navigate('admin')}
                aria-current={activeView === 'admin' ? 'page' : undefined}
                className={navButtonClass(activeView === 'admin')}
              >
                <Shield className="w-3.5 h-3.5 text-red-400" aria-hidden="true" focusable="false" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('kitchen')}
                aria-current={activeView === 'kitchen' ? 'page' : undefined}
                className={navButtonClass(activeView === 'kitchen')}
              >
                <ChefHat className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" focusable="false" />
                <span>Kitchen</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('delivery')}
                aria-current={activeView === 'delivery' ? 'page' : undefined}
                className={navButtonClass(activeView === 'delivery')}
              >
                <Bike className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" focusable="false" />
                <span>Dispatch</span>
              </button>
            </>
          )}

          {role === 'kitchen' && (
            <button
              type="button"
              onClick={() => navigate('kitchen')}
              aria-current={activeView === 'kitchen' ? 'page' : undefined}
              className={navButtonClass(activeView === 'kitchen')}
            >
              <ChefHat className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" focusable="false" />
              <span>Kitchen Board</span>
            </button>
          )}

          {role === 'delivery' && (
            <button
              type="button"
              onClick={() => navigate('delivery')}
              aria-current={activeView === 'delivery' ? 'page' : undefined}
              className={navButtonClass(activeView === 'delivery')}
            >
              <Bike className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" focusable="false" />
              <span>Deliveries</span>
            </button>
          )}

          {role === 'customer' && (
            <button
              type="button"
              onClick={() => navigate('dashboard')}
              aria-current={activeView === 'dashboard' ? 'page' : undefined}
              className={navButtonClass(activeView === 'dashboard')}
            >
              <User className="w-3.5 h-3.5" aria-hidden="true" focusable="false" />
              <span>{lang === 'RW' ? 'Konte' : 'My Dashboard'}</span>
            </button>
          )}

          {(user || hasOrders) && (
            <button
              type="button"
              onClick={() => navigate('orders')}
              aria-current={activeView === 'orders' ? 'page' : undefined}
              className={navButtonClass(activeView === 'orders')}
            >
              <History className="w-3.5 h-3.5" aria-hidden="true" focusable="false" />
              {lang === 'RW' ? 'Ibyasabwe' : 'Orders'}
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('tracking')}
            aria-current={activeView === 'tracking' ? 'page' : undefined}
            className={navButtonClass(activeView === 'tracking')}
          >
            <MapPin className="w-3.5 h-3.5" aria-hidden="true" focusable="false" />
            {lang === 'RW' ? 'Gukurikirana' : 'Tracking'}
          </button>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setLang && setLang(lang === 'EN' ? 'RW' : 'EN')}
            className="px-2.5 py-1 rounded-xl bg-surface-card border border-white/10 text-xs font-bold text-text-main hover:border-primary flex items-center gap-1.5 transition-all"
            aria-label={lang === 'EN' ? 'Switch language to Kinyarwanda' : 'Switch language to English'}
          >
            <Globe className="w-3.5 h-3.5 text-primary" aria-hidden="true" focusable="false" />
            <span aria-hidden="true">{lang}</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-surface-card border border-white/10 text-text-main hover:border-amber-400 transition-all"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-pressed={theme === 'light'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" focusable="false" />
            ) : (
              <Moon className="w-4 h-4 text-blue-400" aria-hidden="true" focusable="false" />
            )}
          </button>

          {onOpenHelp && (
            <button
              type="button"
              onClick={onOpenHelp}
              className="p-2 text-text-muted hover:text-white transition-colors rounded-lg hover:bg-white/5"
              aria-label="Help and support"
            >
              <HelpCircle className="w-5 h-5" aria-hidden="true" focusable="false" />
            </button>
          )}

          {saved > 0 && (
            <div
              className="relative p-2 text-red-400"
              title={`${saved} saved in wishlist`}
              aria-label={`${saved} item${saved === 1 ? '' : 's'} in your wishlist`}
            >
              <Heart className="w-5 h-5 fill-red-500/20 text-red-400" aria-hidden="true" focusable="false" />
              <span
                aria-hidden="true"
                className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md"
              >
                {saved > 99 ? '99+' : saved}
              </span>
            </div>
          )}

          {onOpenCart && (
            <button
              type="button"
              onClick={onOpenCart}
              className="relative p-2.5 rounded-xl bg-surface-card border border-white/10 text-text-main hover:border-primary transition-all group"
              aria-label={items > 0 ? `Open cart, ${items} item${items === 1 ? '' : 's'}` : 'Open cart, empty'}
            >
              <ShoppingBag className="w-5 h-5 group-hover:scale-110 transition-transform" aria-hidden="true" focusable="false" />
              {items > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center shadow-md"
                >
                  {items > 99 ? '99+' : items}
                </span>
              )}
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              <button
                type="button"
                onClick={onOpenProfile}
                className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-surface-card border border-white/10 hover:border-primary transition-all group"
                aria-label="View and edit account profile"
              >
                <span
                  aria-hidden="true"
                  className="w-6 h-6 rounded-full bg-linear-to-tr from-primary to-orange-500 text-white font-black text-[11px] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform"
                >
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </span>
                <span className="text-xs font-bold text-white max-w-25 truncate hidden sm:inline-block">
                  {user.name || 'Account'}
                </span>
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="p-2 rounded-xl bg-red-950/40 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 text-xs font-bold flex items-center justify-center transition-all shadow-sm"
                aria-label="Log out"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" focusable="false" />
              </button>
            </div>
          ) : (
            onOpenAuth && (
              <button
                type="button"
                onClick={onOpenAuth}
                className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-md hover:scale-105 transition-all"
              >
                <User className="w-3.5 h-3.5" aria-hidden="true" focusable="false" />
                <span>{lang === 'RW' ? 'Kwinjira' : 'Sign In'}</span>
              </button>
            )
          )}
        </div>

        <div className="flex sm:hidden items-center gap-2">
          {!user && onOpenAuth && (
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-2.5 py-1.5 rounded-xl bg-primary text-white text-[11px] font-bold shadow-sm"
            >
              {lang === 'RW' ? 'Kwinjira' : 'Sign In'}
            </button>
          )}

          {onOpenCart && (
            <button
              type="button"
              onClick={onOpenCart}
              className="relative p-2 rounded-xl bg-surface-card border border-white/10 text-text-main"
              aria-label={items > 0 ? `Open cart, ${items} item${items === 1 ? '' : 's'}` : 'Open cart, empty'}
            >
              <ShoppingBag className="w-5 h-5" aria-hidden="true" focusable="false" />
              {items > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center"
                >
                  {items > 99 ? '99+' : items}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="p-2 text-white bg-surface-card border border-white/10 rounded-xl"
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
            aria-controls="header-mobile-menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" aria-hidden="true" focusable="false" />
            ) : (
              <Menu className="w-5 h-5" aria-hidden="true" focusable="false" />
            )}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div
          id="header-mobile-menu"
          className="sm:hidden border-t border-white/10 bg-surface-dark px-4 py-4 space-y-4 transition-opacity duration-200"
        >
          {typeof setSearchQuery === 'function' && (
            <div className="relative">
              <Search
                className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                aria-hidden="true"
                focusable="false"
              />
              <label htmlFor="header-search-mobile" className="sr-only">
                Search the menu
              </label>
              <input
                id="header-search-mobile"
                type="search"
                autoComplete="off"
                value={searchQuery}
                onChange={updateSearch}
                placeholder="Search hotpot, pizza..."
                className="w-full bg-surface-card border border-white/10 rounded-full pl-10 pr-4 py-2 text-xs text-text-main"
              />
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => navigate('menu')}
              aria-current={activeView === 'menu' ? 'page' : undefined}
              className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 ${
                activeView === 'menu' ? 'bg-primary text-white' : 'bg-surface-card text-text-muted'
              }`}
            >
              <Flame className="w-4 h-4" aria-hidden="true" focusable="false" />
              Menu
            </button>

            {role === 'admin' && (
              <>
                <button
                  type="button"
                  onClick={() => navigate('admin')}
                  aria-current={activeView === 'admin' ? 'page' : undefined}
                  className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 ${
                    activeView === 'admin' ? 'bg-primary text-white' : 'bg-surface-card text-text-muted'
                  }`}
                >
                  <Shield className="w-4 h-4 text-red-400" aria-hidden="true" focusable="false" />
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => navigate('kitchen')}
                  aria-current={activeView === 'kitchen' ? 'page' : undefined}
                  className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 ${
                    activeView === 'kitchen' ? 'bg-primary text-white' : 'bg-surface-card text-text-muted'
                  }`}
                >
                  <ChefHat className="w-4 h-4 text-amber-400" aria-hidden="true" focusable="false" />
                  Kitchen
                </button>
                <button
                  type="button"
                  onClick={() => navigate('delivery')}
                  aria-current={activeView === 'delivery' ? 'page' : undefined}
                  className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 ${
                    activeView === 'delivery' ? 'bg-primary text-white' : 'bg-surface-card text-text-muted'
                  }`}
                >
                  <Bike className="w-4 h-4 text-blue-400" aria-hidden="true" focusable="false" />
                  Dispatch
                </button>
              </>
            )}

            {role === 'kitchen' && (
              <button
                type="button"
                onClick={() => navigate('kitchen')}
                aria-current={activeView === 'kitchen' ? 'page' : undefined}
                className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 ${
                  activeView === 'kitchen' ? 'bg-primary text-white' : 'bg-surface-card text-text-muted'
                }`}
              >
                <ChefHat className="w-4 h-4 text-amber-400" aria-hidden="true" focusable="false" />
                Kitchen
              </button>
            )}

            {role === 'delivery' && (
              <button
                type="button"
                onClick={() => navigate('delivery')}
                aria-current={activeView === 'delivery' ? 'page' : undefined}
                className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 ${
                  activeView === 'delivery' ? 'bg-primary text-white' : 'bg-surface-card text-text-muted'
                }`}
              >
                <Bike className="w-4 h-4 text-blue-400" aria-hidden="true" focusable="false" />
                Deliveries
              </button>
            )}

            {role === 'customer' && (
              <button
                type="button"
                onClick={() => navigate('dashboard')}
                aria-current={activeView === 'dashboard' ? 'page' : undefined}
                className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 ${
                  activeView === 'dashboard' ? 'bg-primary text-white' : 'bg-surface-card text-text-muted'
                }`}
              >
                <User className="w-4 h-4" aria-hidden="true" focusable="false" />
                Dashboard
              </button>
            )}

            {(user || hasOrders) && (
              <button
                type="button"
                onClick={() => navigate('orders')}
                aria-current={activeView === 'orders' ? 'page' : undefined}
                className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 ${
                  activeView === 'orders' ? 'bg-primary text-white' : 'bg-surface-card text-text-muted'
                }`}
              >
                <History className="w-4 h-4" aria-hidden="true" focusable="false" />
                Orders
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate('tracking')}
              aria-current={activeView === 'tracking' ? 'page' : undefined}
              className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 ${
                activeView === 'tracking' ? 'bg-primary text-white' : 'bg-surface-card text-text-muted'
              }`}
            >
              <MapPin className="w-4 h-4" aria-hidden="true" focusable="false" />
              Tracking
            </button>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (onOpenProfile) onOpenProfile();
                  }}
                  className="flex-1 p-2 rounded-xl bg-surface-card border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-2"
                >
                  <User className="w-4 h-4 text-primary" aria-hidden="true" focusable="false" />
                  <span>{user.name || 'My Profile'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    if (onLogout) onLogout();
                  }}
                  className="p-2 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 hover:text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" focusable="false" />
                  <span>Log out</span>
                </button>
              </>
            ) : (
              onOpenAuth && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAuth();
                  }}
                  className="w-full btn-primary text-xs py-2.5 font-bold flex items-center justify-center gap-2"
                >
                  <User className="w-4 h-4" aria-hidden="true" focusable="false" />
                  <span>Sign In / Create Account</span>
                </button>
              )
            )}
          </div>
        </div>
      )}
    </header>
  );
}
