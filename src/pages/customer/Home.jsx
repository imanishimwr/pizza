import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Flame,
  Star,
  Clock,
  Sparkles,
  Filter,
  ChevronRight,
  Check,
  Heart,
  Search,
  Plus,
  Utensils,
  User,
  AlertTriangle as TriangleAlert,
  RefreshCw
} from 'lucide-react';
import { CATEGORIES, PROMO_BANNERS } from '../../data/mockData';

const BANNER_COUNT = PROMO_BANNERS.length;
const BANNER_INTERVAL_MS = 5000;

/** Rwandan francs are plain numbers. Never concatenate them. */
const formatRWF = (value) =>
  Number.isFinite(Number(value)) ? `${Number(value).toLocaleString()} RWF` : 'Price unavailable';

/**
 * Image fallbacks: swap once to `fallbackImage`, and if that also fails hide the
 * broken <img> instead of letting onError loop forever on an undefined src.
 */
function applyImageFallback(event, fallbackImage) {
  const img = event.currentTarget;
  if (img.dataset.fallbackApplied === '1') {
    img.style.visibility = 'hidden';
    return;
  }
  img.dataset.fallbackApplied = '1';
  if (fallbackImage) img.src = fallbackImage;
  else img.style.visibility = 'hidden';
}

export default function Home({
  meals = [],
  loading = false,
  error = null,
  onRetry,
  onSelectMeal,
  searchQuery = '',
  selectedCategory = 'all',
  setSelectedCategory,
  cart = [],
  wishlist = [],
  onToggleWishlist,
  onAddToCart,
  onOpenCart,
  onOpenAuth,
  signedIn = false
}) {
  const [activeBanner, setActiveBanner] = useState(0);
  const [searchKey, setSearchKey] = useState('');
  const [spiceFilter, setSpiceFilter] = useState('all');
  const [localCategory, setLocalCategory] = useState(selectedCategory || 'all');

  // The category lives in App. Mirror it locally so this page can never end up
  // calling an undefined setter (which used to blank the whole category bar).
  const activeCategory = selectedCategory || localCategory;
  const chooseCategory = useCallback(
    (next) => {
      setLocalCategory(next);
      if (typeof setSelectedCategory === 'function') setSelectedCategory(next);
    },
    [setSelectedCategory]
  );

  // Banner rotation. Deps are empty on purpose: the interval is created once and
  // torn down on unmount, so it is StrictMode-safe and never re-arms on typing.
  useEffect(() => {
    if (BANNER_COUNT < 2) return undefined;
    const interval = setInterval(() => {
      setActiveBanner((prev) => (prev + 1) % BANNER_COUNT);
    }, BANNER_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const mealList = useMemo(() => (Array.isArray(meals) ? meals : []), [meals]);

  const filteredMeals = useMemo(() => {
    const query = String(searchQuery || searchKey).toLowerCase().trim();
    return mealList.filter((meal) => {
      const name = String(meal?.name ?? '').toLowerCase();
      const description = String(meal?.description ?? '').toLowerCase();
      const category = String(meal?.category ?? '').toLowerCase();

      const matchesCategory = activeCategory === 'all' || meal?.category === activeCategory;

      const matchesSearch =
        !query ||
        name.includes(query) ||
        description.includes(query) ||
        category.includes(query) ||
        (Array.isArray(meal?.broths) && meal.broths.some((b) => String(b).toLowerCase().includes(query))) ||
        (Array.isArray(meal?.spiceLevels) &&
          meal.spiceLevels.some((s) => String(s).toLowerCase().includes(query)));

      const matchesSpice =
        spiceFilter === 'all' ? true : spiceFilter === 'spicy' ? meal?.spicy === true : meal?.spicy !== true;

      return matchesCategory && matchesSearch && matchesSpice;
    });
  }, [mealList, activeCategory, searchQuery, searchKey, spiceFilter]);

  const cartQtyFor = useCallback(
    (mealId) => {
      const line = (Array.isArray(cart) ? cart : []).find((item) => item?.meal?.id === mealId);
      return line ? Number(line.quantity) || 0 : 0;
    },
    [cart]
  );

  const isWishlisted = useCallback(
    (mealId) =>
      (Array.isArray(wishlist) ? wishlist : []).some(
        (item) => (typeof item === 'string' ? item : item?.id) === mealId
      ),
    [wishlist]
  );

  const handleAddToCart = useCallback(
    (meal) => {
      if (!meal || meal.outOfStock) return;
      if (!signedIn) {
        if (onOpenAuth) onOpenAuth();
        return;
      }
      if (onAddToCart) onAddToCart({ meal, quantity: 1, selectedSpice: null, selectedBroth: null });
      if (onOpenCart) onOpenCart();
    },
    [signedIn, onAddToCart, onOpenCart, onOpenAuth]
  );

  // Duplicated on purpose: the marquee needs two full copies to loop seamlessly.
  const recentFoods = useMemo(() => [...mealList.slice(0, 6), ...mealList.slice(0, 6)], [mealList]);

  const banner = BANNER_COUNT ? PROMO_BANNERS[activeBanner % BANNER_COUNT] : null;
  const menuIsEmpty = !loading && !error && mealList.length === 0;

  return (
    <div className="space-y-8 pb-16">
      <section
        className="relative overflow-hidden rounded-3xl p-6 sm:p-10 shadow-2xl transition-all border border-amber-500/30"
        style={{ background: banner?.bgGradient || 'linear-gradient(135deg, #AE3200 0%, #D97706 100%)' }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
          <div className="lg:col-span-7 space-y-4">

            <div className="space-y-1">
              <h2 className="text-base sm:text-xl font-extrabold text-amber-400 tracking-wide uppercase">
                Welcome to the home of pizza 🍕
              </h2>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-lg leading-tight">
                {banner?.title}
              </h1>
            </div>

            <p className="text-sm sm:text-base text-white/90 font-medium leading-relaxed max-w-lg">
              {banner?.subtitle} — Order your favorite hotpot combos &amp; gourmet pizzas anytime, 24 hours a day,
              7 days a week!
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => chooseCategory('pizzas')}
                className="px-6 py-3 rounded-xl bg-white text-primary font-black text-xs hover:bg-orange-100 transition-all shadow-xl flex items-center gap-2 hover:scale-105"
              >
                Order Now
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center lg:justify-end relative min-h-55 sm:min-h-70 items-center">
            <div className="relative max-w-sm sm:max-w-md w-full flex items-center justify-center">
              <div
                className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 transform ${
                  activeBanner % 2 === 0
                    ? 'opacity-100 scale-100 rotate-0'
                    : 'opacity-0 scale-95 -rotate-6 pointer-events-none'
                }`}
              >
                <div className="relative group">
                  <div className="absolute -inset-4 bg-linear-to-r from-primary via-orange-500 to-amber-400 rounded-3xl blur-2xl opacity-60 animate-pulse" />

                  <div className="relative p-6 sm:p-8 rounded-3xl bg-surface-dark/95 border-2 border-amber-500/50 shadow-2xl flex flex-col items-center text-center space-y-3 backdrop-blur-md">
                    <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-black border border-white/20 p-1 flex items-center justify-center shadow-2xl shadow-primary/50 overflow-hidden group-hover:scale-105 transition-transform">
                      <img
                        src="/assets/1152x1152_S7.png"
                        alt="HotPot Delights logo"
                        className="w-full h-full object-contain rounded-xl"
                        onError={(event) => applyImageFallback(event)}
                      />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black bg-linear-to-r from-white via-orange-200 to-amber-400 bg-clip-text text-transparent">
                        Hot Pot
                      </h3>
                      <p className="text-xs font-bold text-amber-300 uppercase tracking-widest mt-1">
                        Welcome to the home of pizza • 24/7 Delivery
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={`transition-all duration-700 transform ${
                  activeBanner % 2 !== 0
                    ? 'opacity-100 scale-100 translate-x-0'
                    : 'opacity-0 scale-95 translate-x-8 pointer-events-none'
                }`}
              >
                <div className="relative max-w-xs sm:max-w-sm w-full animate-float-moto">
                  <img
                    src="/assets/delivery_rider_hotpot.png"
                    alt="HotPot motorbike delivery courier"
                    className="w-full h-auto object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.6)]"
                    onError={(event) => applyImageFallback(event)}
                  />
                  <div className="p-6 rounded-3xl bg-black/40 border border-white/10 text-center space-y-2 backdrop-blur-sm">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto text-2xl animate-bounce">
                      🛵
                    </div>
                    <div className="font-extrabold text-sm text-white">Kigali Moto Express</div>
                    <div className="text-[11px] text-text-muted">Live courier tracking on every order</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {BANNER_COUNT > 1 && (
          <div className="absolute bottom-4 left-6 sm:left-10 z-10 flex gap-2">
            {PROMO_BANNERS.map((item, index) => (
              <button
                key={item.id ?? index}
                type="button"
                onClick={() => setActiveBanner(index)}
                className={`h-2 rounded-full transition-all ${
                  activeBanner === index ? 'w-8 bg-white' : 'w-2 bg-white/40'
                }`}
                aria-label={`Show promo banner ${index + 1}`}
              />
            ))}
          </div>
        )}

        <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      </section>

      {recentFoods.length > 0 && (
        <section className="space-y-3 bg-surface-card/60 p-4 rounded-2xl border border-white/5 overflow-hidden">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" aria-hidden="true" />
              Recently Uploaded Dishes &amp; Specials
            </h3>
            <span className="text-[10px] text-text-subdued font-mono">HOVER TO PAUSE</span>
          </div>

          <div className="overflow-hidden relative w-full rounded-xl bg-black/30 py-3 border border-white/5">
            <div className="animate-marquee flex gap-4 items-center">
              {recentFoods.map((item, index) => (
                <div
                  key={`${item?.id ?? 'meal'}-${index}`}
                  onClick={() => onSelectMeal && onSelectMeal(item)}
                  className="flex items-center gap-3 bg-surface-card border border-white/10 p-2.5 rounded-xl shrink-0 cursor-pointer hover:border-primary transition-all shadow-md group"
                >
                  <img
                    src={item?.image}
                    alt={item?.name ? `${item.name}` : ''}
                    className="w-12 h-12 rounded-lg object-cover bg-black/40 group-hover:scale-105 transition-transform"
                    onError={(event) => applyImageFallback(event, item?.fallbackImage)}
                  />
                  <div>
                    <div className="font-bold text-xs text-text-main line-clamp-1 group-hover:text-primary transition-colors">
                      {item?.name}
                    </div>
                    <div className="text-xs font-mono font-bold text-primary">{formatRWF(item?.price)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="space-y-4">
        {/* Search Bar & Taste Filter Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-surface-card border border-white/10 p-3 sm:p-4 rounded-2xl shadow-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />
            <label htmlFor="home-meal-search" className="sr-only">
              Search dishes
            </label>
            <input
              id="home-meal-search"
              type="search"
              value={searchKey}
              onChange={(e) => setSearchKey(e.target.value)}
              placeholder="Search dishes by keyword, ingredient, broth..."
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-8 py-2.5 text-xs text-text-main placeholder-text-subdued focus:outline-none focus:border-primary transition-all"
            />
            {searchKey && (
              <button
                type="button"
                onClick={() => setSearchKey('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-white"
                aria-label="Clear dish search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Spice Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-text-muted font-bold mr-1">Filter:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'spicy', label: 'Spicy 🌶️' },
              { id: 'mild', label: 'Mild 🥗' }
            ].map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setSpiceFilter(chip.id)}
                aria-pressed={spiceFilter === chip.id}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  spiceFilter === chip.id
                    ? chip.id === 'spicy'
                      ? 'bg-red-600 text-white border-red-500 shadow-sm'
                      : chip.id === 'mild'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                        : 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-black/40 text-text-muted border-white/10 hover:text-white'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Tabs Header */}
        <div className="flex items-center justify-between pt-2">
          <h2 className="text-lg font-extrabold text-text-main flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" aria-hidden="true" />
            Browse Food Categories
          </h2>
          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2.5 py-2 rounded-full">
            {filteredMeals.length} Dishes
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((category) => {
            const isSelected = activeCategory === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => chooseCategory(category.id)}
                aria-pressed={isSelected}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30 scale-105'
                    : 'bg-surface-card text-text-muted border-white/10 hover:border-white/20 hover:text-white'
                }`}
              >
                <span>{category.name}</span>
                {isSelected && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        {loading ? (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
            aria-busy="true"
            aria-live="polite"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
              <div key={item} className="card-item overflow-hidden flex flex-col justify-between">
                <div className="aspect-4/3 skeleton-box" />
                <div className="p-3.5 sm:p-4 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center gap-2">
                      <div className="h-5 w-1/2 skeleton-box rounded" />
                      <div className="h-5 w-1/4 skeleton-box rounded" />
                    </div>
                    <div className="h-3 w-full skeleton-box rounded mt-2" />
                    <div className="h-3 w-4/5 skeleton-box rounded mt-1" />
                  </div>
                  <div className="pt-2.5 border-t border-white/5 flex justify-between items-center gap-2 mt-3">
                    <div className="h-4 w-1/3 skeleton-box rounded" />
                    <div className="flex gap-1.5">
                      <div className="h-7 w-12 skeleton-box rounded-lg" />
                      <div className="h-7 w-12 skeleton-box rounded-lg" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <span className="sr-only">Loading the menu…</span>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="py-16 px-4 text-center bg-surface-card/60 rounded-2xl border border-red-500/20 shadow-xl space-y-4 max-w-lg mx-auto my-6"
          >
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/30 flex items-center justify-center mx-auto shadow-inner">
              <TriangleAlert className="w-7 h-7" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-white">Failed to load dishes</h3>
              <p className="text-xs sm:text-sm text-text-muted max-w-sm mx-auto">
                {error || 'Unable to retrieve menu items right now. Please check your connection and try again.'}
              </p>
            </div>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90 inline-flex items-center gap-2 shadow-lg transition-transform hover:scale-105 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Try again</span>
              </button>
            )}
          </div>
        ) : menuIsEmpty ? (
          <div className="py-16 text-center bg-surface-card/50 rounded-2xl border border-white/5 space-y-3">
            <Utensils className="w-10 h-10 text-text-muted mx-auto" aria-hidden="true" />
            <p className="text-text-muted font-medium">The menu is empty right now — the kitchen has not published any dishes.</p>
            {!signedIn && onOpenAuth && (
              <button type="button" onClick={onOpenAuth} className="btn-secondary text-xs inline-flex items-center gap-2">
                <User className="w-3.5 h-3.5" aria-hidden="true" />
                Sign in and check again
              </button>
            )}
          </div>
        ) : filteredMeals.length === 0 ? (
          <div className="py-16 text-center bg-surface-card/50 rounded-2xl border border-white/5 space-y-3">
            <Sparkles className="w-10 h-10 text-text-muted mx-auto" aria-hidden="true" />
            <p className="text-text-muted font-medium">No dishes match your search or filters.</p>
            <button
              type="button"
              onClick={() => {
                setSearchKey('');
                setSpiceFilter('all');
                chooseCategory('all');
              }}
              className="btn-secondary text-xs"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredMeals.map((meal, index) => {
              const inCartQty = cartQtyFor(meal.id);
              const wishlisted = isWishlisted(meal.id);
              const rating = Number(meal.rating);
              const hasRating = Number.isFinite(rating);
              const reviews = Number(meal.reviews);

              return (
                <div
                  key={meal.id}
                  style={{ animationDelay: `${Math.min(index * 60, 450)}ms` }}
                  className={`card-item group flex flex-col justify-between overflow-hidden cursor-pointer animate-card-stagger ${
                    meal.outOfStock ? 'opacity-60' : ''
                  }`}
                  onClick={() => !meal.outOfStock && onSelectMeal && onSelectMeal(meal)}
                >
                  <div className="relative aspect-4/3 overflow-hidden bg-black/40 shrink-0">
                    <img
                      src={meal.image}
                      alt={meal.name ? `${meal.name}` : ''}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(event) => applyImageFallback(event, meal.fallbackImage)}
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-black/20" />

                    <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                      {meal.outOfStock ? (
                        <span className="badge-tag bg-gray-900 text-gray-300 border border-gray-600">Out of Stock</span>
                      ) : inCartQty > 0 ? (
                        <span className="badge-tag bg-emerald-950/90 text-emerald-400 border border-emerald-500/40 backdrop-blur-md font-extrabold flex items-center gap-1">
                          <Check className="w-3 h-3" aria-hidden="true" /> In Cart ({inCartQty})
                        </span>
                      ) : meal.spicy ? (
                        <span className="badge-tag bg-red-950/80 text-red-400 border border-red-500/40 backdrop-blur-md">
                          🔥 Spicy
                        </span>
                      ) : null}
                      {meal.category === 'hotpot' && (
                        <span className="badge-tag bg-amber-950/80 text-amber-400 border border-amber-500/40 backdrop-blur-md">
                          🍲 Hotpot
                        </span>
                      )}
                    </div>

                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      {onToggleWishlist && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onToggleWishlist(meal);
                          }}
                          className={`p-1.5 rounded-lg backdrop-blur-md border transition-all ${
                            wishlisted
                              ? 'bg-red-500/30 border-red-500/60 text-red-400'
                              : 'bg-black/60 border-white/20 text-white/70 hover:text-white'
                          }`}
                          title={wishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                          aria-label={wishlisted ? `Remove ${meal.name} from wishlist` : `Add ${meal.name} to wishlist`}
                          aria-pressed={wishlisted}
                        >
                          <Heart className={`w-3.5 h-3.5 ${wishlisted ? 'fill-red-400 text-red-400' : ''}`} />
                        </button>
                      )}

                      {hasRating && (
                        <div className="px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 text-xs font-bold text-amber-400 flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                          <span>{rating.toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    {meal.prepTime ? (
                      <div className="absolute bottom-3 left-3 text-[11px] font-semibold text-text-muted flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                        <span>{meal.prepTime}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2.5">
                        <h3 className="font-bold text-text-main text-sm sm:text-base leading-snug line-clamp-2 min-h-10 flex items-center">
                          {meal.name}
                        </h3>
                        <span className="font-mono font-extrabold text-primary text-xs sm:text-sm whitespace-nowrap shrink-0 pt-0.5">
                          {formatRWF(meal.price)}
                        </span>
                      </div>

                      <p className="text-xs text-text-muted leading-relaxed line-clamp-2 h-10 overflow-hidden mt-1.5">
                        {meal.description}
                      </p>
                    </div>

                    <div className="pt-2.5 border-t border-white/5 flex items-center justify-between gap-2 mt-3">
                      <div className="flex items-center gap-1 text-xs text-text-subdued whitespace-nowrap shrink-0">
                        {hasRating ? (
                          <>
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" aria-hidden="true" />
                            <span className="font-bold text-white text-xs">{rating.toLocaleString()}</span>
                            <span className="text-[11px] text-text-subdued font-mono">
                              ({Number.isFinite(reviews) ? reviews.toLocaleString() : 0})
                            </span>
                          </>
                        ) : (
                          <span className="text-[11px] text-text-subdued">Not yet rated</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {onAddToCart && (
                          <button
                            type="button"
                            className="btn-primary-sm"
                            title={signedIn ? 'Add 1 to cart' : 'Sign in to order'}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleAddToCart(meal);
                            }}
                          >
                            <Plus className="w-3 h-3 shrink-0" aria-hidden="true" />
                            <span>Add</span>
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn-secondary-sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (onSelectMeal) onSelectMeal(meal);
                          }}
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
