import React, { useState, useEffect } from 'react';
import { Flame, Star, Clock, Sparkles, Filter, ChevronRight, Check, Heart } from 'lucide-react';
import { CATEGORIES, PROMO_BANNERS } from '../../data/mockData';

export default function Home({
  meals = [],
  onSelectMeal,
  searchQuery = '',
  selectedCategory = 'all',
  setSelectedCategory,
  cart = [],
  wishlist = [],
  onToggleWishlist,
  onOpenCustomBuilder,
  onAddToCart,
  onOpenCart
}) {
  const [activeBanner, setActiveBanner] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 400);
    const bannerInterval = setInterval(() => {
      setActiveBanner((prev) => (prev + 1) % PROMO_BANNERS.length);
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearInterval(bannerInterval);
    };
  }, [selectedCategory, searchQuery]);

  const [searchKey, setSearchKey] = useState('');
  const [spiceFilter, setSpiceFilter] = useState('all');
  const [dietaryFilter, setDietaryFilter] = useState('all');

  const filteredMeals = (meals || []).filter((meal) => {
    const activeSearch = searchQuery || searchKey;
    const matchesCategory = selectedCategory === 'all' || meal.category === selectedCategory;
    
    const queryLower = activeSearch.toLowerCase().trim();
    const matchesSearch =
      !queryLower ||
      meal.name.toLowerCase().includes(queryLower) ||
      meal.description.toLowerCase().includes(queryLower) ||
      meal.category.toLowerCase().includes(queryLower) ||
      (meal.broths && meal.broths.some(b => b.toLowerCase().includes(queryLower))) ||
      (meal.spiceLevels && meal.spiceLevels.some(s => s.toLowerCase().includes(queryLower)));

    const matchesSpice = spiceFilter === 'all' 
      ? true 
      : spiceFilter === 'spicy' ? meal.spicy === true 
      : meal.spicy !== true;

    const matchesDietary = dietaryFilter === 'all'
      ? true
      : dietaryFilter === 'veg' ? (meal.vegetarian || meal.category === 'vegetarian' || meal.name.toLowerCase().includes('veg'))
      : dietaryFilter === 'vegan' ? (meal.vegan || meal.name.toLowerCase().includes('vegan'))
      : dietaryFilter === 'halal' ? (meal.halal || true)
      : true;

    return matchesCategory && matchesSearch && matchesSpice && matchesDietary;
  });

  const recentFoods = [...(meals || []).slice(0, 6), ...(meals || []).slice(0, 6)];

  return (
    <div className="space-y-8 pb-16">
      <section
        className="relative overflow-hidden rounded-3xl p-6 sm:p-10 shadow-2xl transition-all border border-amber-500/30"
        style={{ background: PROMO_BANNERS[activeBanner]?.bgGradient || 'linear-gradient(135deg, #AE3200 0%, #D97706 100%)' }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-xs font-bold text-white shadow-md">
              <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center text-white">
                <Flame className="w-4 h-4" />
              </div>
              <span className="tracking-wider uppercase text-amber-300">Hot Pot Kigali • We Deliver 24/7 🚀</span>
            </div>

            <div className="space-y-1">
              <h2 className="text-base sm:text-xl font-extrabold text-amber-400 tracking-wide uppercase">
                Welcome to the home of pizza 🍕
              </h2>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-lg leading-tight">
                {PROMO_BANNERS[activeBanner]?.title}
              </h1>
            </div>

            <p className="text-sm sm:text-base text-white/90 font-medium leading-relaxed max-w-lg">
              {PROMO_BANNERS[activeBanner]?.subtitle} — Order your favorite hotpot combos & gourmet pizzas anytime, 24 hours a day, 7 days a week!
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <div className="bg-black/50 px-4 py-2.5 rounded-xl border border-dashed border-white/40 text-xs font-mono font-bold text-white tracking-widest">
                CODE: {PROMO_BANNERS[activeBanner]?.code}
              </div>
              <button
                onClick={() => setSelectedCategory('pizzas')}
                className="px-5 py-3 rounded-xl bg-white text-primary font-black text-xs hover:bg-orange-100 transition-all shadow-xl flex items-center gap-2 hover:scale-105"
              >
                Claim Offer Now
                <ChevronRight className="w-4 h-4" />
              </button>

              {onOpenCustomBuilder && (
                <button
                  onClick={onOpenCustomBuilder}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 text-white font-black text-xs hover:opacity-90 transition-all shadow-xl flex items-center gap-2 hover:scale-105 border border-amber-400/40"
                >
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                  Custom Pizza Studio
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center lg:justify-end relative min-h-[220px] sm:min-h-[280px] items-center">
            <div className="relative max-w-sm sm:max-w-md w-full flex items-center justify-center">
              <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 transform ${
                activeBanner % 2 === 0 ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-95 -rotate-6 pointer-events-none'
              }`}>
                <div className="relative group">
                  <div className="absolute -inset-4 bg-gradient-to-r from-primary via-orange-500 to-amber-400 rounded-3xl blur-2xl opacity-60 animate-pulse"></div>

                  <div className="relative p-6 sm:p-8 rounded-3xl bg-surface-dark/95 border-2 border-amber-500/50 shadow-2xl flex flex-col items-center text-center space-y-3 backdrop-blur-md">
                    <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-black border border-white/20 p-1 flex items-center justify-center shadow-2xl shadow-primary/50 overflow-hidden group-hover:scale-105 transition-transform">
                      <img src="/assets/1152x1152_S7.png" alt="Official HotPot Logo" className="w-full h-full object-contain rounded-xl" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black bg-gradient-to-r from-white via-orange-200 to-amber-400 bg-clip-text text-transparent">
                        Hot Pot
                      </h3>
                      <p className="text-xs font-bold text-amber-300 uppercase tracking-widest mt-1">
                        Welcome to the home of pizza • 24/7 Delivery
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`transition-all duration-700 transform ${
                activeBanner % 2 !== 0 ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-95 translate-x-8 pointer-events-none'
              }`}>
                <div className="relative max-w-xs sm:max-w-sm w-full animate-float-moto">
                  <img
                    src="/assets/delivery_rider_hotpot.png"
                    alt="HotPot Delivery Rider Moto"
                    className="w-full h-auto object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.6)]"
                    onError={(event) => {
                      event.target.style.display = 'none';
                    }}
                  />
                  <div className="p-6 rounded-3xl bg-black/40 border border-white/10 text-center space-y-2 backdrop-blur-sm">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto text-2xl animate-bounce">
                      🛵
                    </div>
                    <div className="font-extrabold text-sm text-white">Fast Kigali Moto Express</div>
                    <div className="text-[11px] text-text-muted">15-30 Min Average Arrival Time</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 left-6 sm:left-10 z-10 flex gap-2">
          {PROMO_BANNERS.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveBanner(index)}
              className={`h-2 rounded-full transition-all ${activeBanner === index ? 'w-8 bg-white' : 'w-2 bg-white/40'}`}
              aria-label={`Go to promo banner ${index + 1}`}
            />
          ))}
        </div>

        <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      </section>

      <section className="space-y-3 bg-surface-card/60 p-4 rounded-2xl border border-white/5 overflow-hidden">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Recently Uploaded Dishes & Specials (Right-to-Left Live Marquee)
          </h3>
          <span className="text-[10px] text-text-subdued font-mono">HOVER TO PAUSE</span>
        </div>

        <div className="overflow-hidden relative w-full rounded-xl bg-black/30 py-3 border border-white/5">
          <div className="animate-marquee flex gap-4 items-center">
            {recentFoods.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                onClick={() => onSelectMeal(item)}
                className="flex items-center gap-3 bg-surface-card border border-white/10 p-2.5 rounded-xl shrink-0 cursor-pointer hover:border-primary transition-all shadow-md group"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-12 h-12 rounded-lg object-cover bg-black/40 group-hover:scale-105 transition-transform"
                  onError={(event) => {
                    event.target.src = item.fallbackImage;
                  }}
                />
                <div>
                  <div className="font-bold text-xs text-text-main line-clamp-1 group-hover:text-primary transition-colors">
                    {item.name}
                  </div>
                  <div className="text-xs font-mono font-bold text-primary">{item.price.toLocaleString()} RWF</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {/* Search Bar & Taste Filter Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-surface-card border border-white/10 p-3 sm:p-4 rounded-2xl shadow-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchKey}
              onChange={(e) => setSearchKey(e.target.value)}
              placeholder="Search dishes by keyword, ingredient, broth..."
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-8 py-2.5 text-xs text-text-main placeholder-text-subdued focus:outline-none focus:border-primary transition-all"
            />
            {searchKey && (
              <button
                onClick={() => setSearchKey('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Spice & Dietary Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-text-muted font-bold mr-1">Filter:</span>
            <button
              onClick={() => setSpiceFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                spiceFilter === 'all' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-black/40 text-text-muted border-white/10 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSpiceFilter('spicy')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                spiceFilter === 'spicy' ? 'bg-red-600 text-white border-red-500 shadow-sm' : 'bg-black/40 text-text-muted border-white/10 hover:text-white'
              }`}
            >
              Spicy 🌶️
            </button>
            <button
              onClick={() => setSpiceFilter('mild')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                spiceFilter === 'mild' ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm' : 'bg-black/40 text-text-muted border-white/10 hover:text-white'
              }`}
            >
              Mild 🥗
            </button>
          </div>
        </div>

        {/* Category Tabs Header */}
        <div className="flex items-center justify-between pt-2">
          <h2 className="text-lg font-extrabold text-text-main flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            Browse Food Categories
          </h2>
          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2.5 py-1 rounded-full">
            {filteredMeals.length} Dishes
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((category) => {
            const isSelected = selectedCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30 scale-105'
                    : 'bg-surface-card text-text-muted border-white/10 hover:border-white/20 hover:text-white'
                }`}
              >
                <span>{category.name}</span>
                {isSelected && <Check className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
              <div key={item} className="card-item overflow-hidden">
                <div className="aspect-[4/3] skeleton-box"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 w-3/4 skeleton-box rounded"></div>
                  <div className="h-3 w-full skeleton-box rounded mt-2"></div>
                  <div className="h-3 w-5/6 skeleton-box rounded"></div>
                  <div className="pt-3 border-t border-white/5 flex justify-between items-center mt-2">
                    <div className="h-4 w-1/3 skeleton-box rounded"></div>
                    <div className="h-8 w-1/3 skeleton-box rounded-xl"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredMeals.length === 0 ? (
          <div className="py-16 text-center bg-surface-card/50 rounded-2xl border border-white/5 space-y-3">
            <Sparkles className="w-10 h-10 text-text-muted mx-auto" />
            <p className="text-text-muted font-medium">No dishes found matching your search query.</p>
            <button onClick={() => setSelectedCategory('all')} className="btn-secondary text-xs">Reset Filters</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredMeals.map((meal, index) => {
              const inCartItem = cart.find((item) => item.meal.id === meal.id);
              const inCartQty = inCartItem ? inCartItem.quantity : 0;
              const isWishlisted = wishlist.some((item) => (typeof item === 'string' ? item === meal.id : item.id === meal.id));

              return (
                <div
                  key={meal.id}
                  style={{ animationDelay: `${Math.min(index * 60, 450)}ms` }}
                  className={`card-item group flex flex-col justify-between overflow-hidden cursor-pointer animate-card-stagger ${
                    meal.outOfStock ? 'opacity-60' : ''
                  }`}
                  onClick={() => !meal.outOfStock && onSelectMeal(meal)}
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-black/40">
                    <img
                      src={meal.image}
                      alt={meal.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(event) => {
                        event.target.src = meal.fallbackImage;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                    <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                      {meal.outOfStock ? (
                        <span className="badge-tag bg-gray-900 text-gray-300 border border-gray-600">Out of Stock</span>
                      ) : inCartQty > 0 ? (
                        <span className="badge-tag bg-emerald-950/90 text-emerald-400 border border-emerald-500/40 backdrop-blur-md font-extrabold flex items-center gap-1">
                          <Check className="w-3 h-3" /> In Cart ({inCartQty})
                        </span>
                      ) : meal.spicy ? (
                        <span className="badge-tag bg-red-950/80 text-red-400 border border-red-500/40 backdrop-blur-md">🔥 Spicy</span>
                      ) : null}
                      {meal.category === 'hotpot' && (
                        <span className="badge-tag bg-amber-950/80 text-amber-400 border border-amber-500/40 backdrop-blur-md">🍲 Hotpot</span>
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
                            isWishlisted ? 'bg-red-500/30 border-red-500/60 text-red-400' : 'bg-black/60 border-white/20 text-white/70 hover:text-white'
                          }`}
                          title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-red-400 text-red-400' : ''}`} />
                        </button>
                      )}

                      <div className="px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 text-xs font-bold text-amber-400 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{meal.rating}</span>
                      </div>
                    </div>

                    <div className="absolute bottom-3 left-3 text-[11px] font-semibold text-text-muted flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <span>{meal.prepTime || '15 min'}</span>
                    </div>
                  </div>

                  <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-bold text-text-main text-base leading-snug">{meal.name}</h3>
                        <span className="font-mono font-extrabold text-primary text-sm">{meal.price.toLocaleString()} RWF</span>
                      </div>

                      <p className="text-xs text-text-muted leading-relaxed line-clamp-3">{meal.description}</p>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-text-subdued">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-bold text-white">{meal.rating}</span>
                        <span>•</span>
                        <span>{meal.reviews || 0} reviews</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {onAddToCart && (
                          <button
                            type="button"
                            className="btn-primary text-[10px] px-2.5 py-1.5 bg-orange-600 hover:bg-orange-500 shadow-md flex items-center gap-1"
                            onClick={(event) => {
                              event.stopPropagation();
                              onAddToCart(meal);
                              if (onOpenCart) onOpenCart();
                            }}
                          >
                            + Quick Add
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn-secondary text-[10px] px-2.5 py-1.5"
                          onClick={(event) => {
                            event.stopPropagation();
                            onSelectMeal(meal);
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

