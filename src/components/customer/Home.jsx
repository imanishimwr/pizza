import React, { useState, useEffect } from 'react';
import { Flame, Star, Clock, Plus, Tag, Sparkles, Filter, ChevronRight, Check, AlertTriangle, ShoppingBag, Bike } from 'lucide-react';
import { CATEGORIES, PROMO_BANNERS } from '../../data/mockData';

export default function Home({ meals, onSelectMeal, searchQuery, selectedCategory, setSelectedCategory }) {
  const [activeBanner, setActiveBanner] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate network request for premium feel & auto-rotate hero banner graphic
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1200);
    const bannerInterval = setInterval(() => {
      setActiveBanner((prev) => (prev + 1) % PROMO_BANNERS.length);
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearInterval(bannerInterval);
    };
  }, [selectedCategory, searchQuery]);

  const filteredMeals = meals.filter(meal => {
    const matchesCategory = selectedCategory === 'all' || meal.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      meal.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      meal.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Food marquee items (duplicate for smooth infinite loop)
  const recentFoods = [...meals.slice(0, 6), ...meals.slice(0, 6)];

  return (
    <div className="space-y-8 pb-16">
      {/* Hero Section with Delivery Moto Graphic & HotPot Branding */}
      <section className="relative overflow-hidden rounded-3xl p-6 sm:p-10 shadow-2xl transition-all border border-amber-500/30"
               style={{ background: PROMO_BANNERS[activeBanner].bgGradient }}>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
          
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-4">
            {/* Logo Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-xs font-bold text-white shadow-md">
              <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center text-white">
                <Flame className="w-4 h-4" />
              </div>
              <span className="tracking-wider uppercase text-amber-300">HotPot Kigali • Fresh. Hot. Delivered.</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-lg leading-tight">
              {PROMO_BANNERS[activeBanner].title}
            </h1>

            <p className="text-sm sm:text-base text-white/90 font-medium leading-relaxed max-w-lg">
              {PROMO_BANNERS[activeBanner].subtitle}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <div className="bg-black/50 px-4 py-2.5 rounded-xl border border-dashed border-white/40 text-xs font-mono font-bold text-white tracking-widest">
                CODE: {PROMO_BANNERS[activeBanner].code}
              </div>
              <button 
                onClick={() => setSelectedCategory('pizzas')}
                className="px-6 py-3 rounded-xl bg-white text-primary font-black text-xs hover:bg-orange-100 transition-all shadow-xl flex items-center gap-2 hover:scale-105"
              >
                Claim Offer Now
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Column: Animated Switcher between HotPot Logo & Delivery Moto Graphic */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end relative min-h-[220px] sm:min-h-[280px] items-center">
            <div className="relative max-w-sm sm:max-w-md w-full flex items-center justify-center">
              
              {/* HotPot Logo Animated Graphic Frame */}
              <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 transform ${
                activeBanner % 2 === 0 ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-95 -rotate-6 pointer-events-none'
              }`}>
                <div className="relative group">
                  {/* Glowing backdrop aura */}
                  <div className="absolute -inset-4 bg-gradient-to-r from-primary via-orange-500 to-amber-400 rounded-3xl blur-2xl opacity-60 animate-pulse"></div>
                  
                  <div className="relative p-6 sm:p-8 rounded-3xl bg-surface-dark/95 border-2 border-amber-500/50 shadow-2xl flex flex-col items-center text-center space-y-3 backdrop-blur-md">
                    <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-black border border-white/20 p-1 flex items-center justify-center shadow-2xl shadow-primary/50 overflow-hidden group-hover:scale-105 transition-transform">
                      <img
                        src="/assets/1152x1152_S7.png"
                        alt="Official HotPot Logo"
                        className="w-full h-full object-contain rounded-xl"
                      />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black bg-gradient-to-r from-white via-orange-200 to-amber-400 bg-clip-text text-transparent">
                        HotPot Delights
                      </h3>
                      <p className="text-xs font-bold text-amber-300 uppercase tracking-widest mt-1">
                        Authentic Gourmet Kigali
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Moto Rider Graphic Frame */}
              <div className={`transition-all duration-700 transform ${
                activeBanner % 2 !== 0 ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-95 translate-x-8 pointer-events-none'
              }`}>
                <div className="relative max-w-xs sm:max-w-sm w-full animate-float-moto">
                  <img
                    src="/assets/delivery_rider_hotpot.png"
                    alt="HotPot Delivery Rider Moto"
                    className="w-full h-auto object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.6)]"
                    onError={(e) => {
                      // Fallback SVG rider if image file not loaded
                      e.target.style.display = 'none';
                    }}
                  />
                  {/* Backup fallback graphic if image missing */}
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

        {/* Carousel Indicators */}
        <div className="absolute bottom-4 left-6 sm:left-10 z-10 flex gap-2">
          {PROMO_BANNERS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveBanner(idx)}
              className={`h-2 rounded-full transition-all ${
                activeBanner === idx ? 'w-8 bg-white' : 'w-2 bg-white/40'
              }`}
              aria-label={`Go to promo banner ${idx + 1}`}
            />
          ))}
        </div>

        {/* Decorative Ambient Lighting */}
        <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      </section>

      {/* Moving Right-To-Left Food Marquee Section */}
      <section className="space-y-3 bg-surface-card/60 p-4 rounded-2xl border border-white/5 overflow-hidden">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Recently Uploaded Dishes & Specials (Right-to-Left Live Marquee)
          </h3>
          <span className="text-[10px] text-text-subdued font-mono">HOVER TO PAUSE</span>
        </div>

        {/* Marquee Wrapper */}
        <div className="overflow-hidden relative w-full rounded-xl bg-black/30 py-3 border border-white/5">
          <div className="animate-marquee flex gap-4 items-center">
            {recentFoods.map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                onClick={() => onSelectMeal(item)}
                className="flex items-center gap-3 bg-surface-card border border-white/10 p-2.5 rounded-xl shrink-0 cursor-pointer hover:border-primary transition-all shadow-md group"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-12 h-12 rounded-lg object-cover bg-black/40 group-hover:scale-105 transition-transform"
                  onError={(e) => { e.target.src = item.fallbackImage; }}
                />
                <div>
                  <div className="font-bold text-xs text-text-main line-clamp-1 group-hover:text-primary transition-colors">
                    {item.name}
                  </div>
                  <div className="text-xs font-mono font-bold text-primary">
                    {item.price.toLocaleString()} RWF
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Category Pills Bar */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            Browse Food Catalog
          </h2>
          <span className="text-xs text-text-muted">{filteredMeals.length} food items available</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30 scale-105'
                    : 'bg-surface-card text-text-muted border-white/5 hover:border-white/20 hover:text-white'
                }`}
              >
                <span>{cat.name}</span>
                {isSelected && <Check className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>
      </section>

      {/* Food Items Grid */}
      <section className="space-y-4">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="card-item overflow-hidden">
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
            <button
              onClick={() => { setSelectedCategory('all'); }}
              className="btn-secondary text-xs"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredMeals.map((meal, index) => (
              <div 
                key={meal.id}
                style={{ animationDelay: `${Math.min(index * 60, 450)}ms` }}
                className={`card-item group flex flex-col justify-between overflow-hidden cursor-pointer animate-card-stagger ${
                  meal.outOfStock ? 'opacity-60' : ''
                }`}
                onClick={() => !meal.outOfStock && onSelectMeal(meal)}
              >
                {/* Image Container */}
                <div className="relative aspect-[4/3] overflow-hidden bg-black/40">
                  <img
                    src={meal.image}
                    alt={meal.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { e.target.src = meal.fallbackImage; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                  
                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                    {meal.outOfStock ? (
                      <span className="badge-tag bg-gray-900 text-gray-300 border border-gray-600">
                        Out of Stock
                      </span>
                    ) : meal.spicy ? (
                      <span className="badge-tag bg-red-950/80 text-red-400 border border-red-500/40 backdrop-blur-md badge-shimmer">
                        🔥 Spicy
                      </span>
                    ) : null}
                    {meal.category === 'hotpot' && (
                      <span className="badge-tag bg-amber-950/80 text-amber-400 border border-amber-500/40 backdrop-blur-md badge-shimmer">
                        🍲 Hotpot
                      </span>
                    )}
                  </div>

                  {/* Rating Badge */}
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 text-xs font-bold text-amber-400 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{meal.rating}</span>
                    <span className="text-[10px] text-text-muted">({meal.reviews})</span>
                  </div>

                  {/* Prep Time */}
                  <div className="absolute bottom-3 left-3 text-[11px] font-semibold text-text-muted flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>{meal.prepTime || '15 min'}</span>
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-text-main group-hover:text-primary transition-colors line-clamp-1">
                      {meal.name}
                    </h3>
                    <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">
                      {meal.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase text-text-subdued block font-bold">Price</span>
                      <span className="text-base font-extrabold text-primary font-mono">
                        {meal.price.toLocaleString()} RWF
                      </span>
                    </div>

                    <button 
                      disabled={meal.outOfStock}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!meal.outOfStock) onSelectMeal(meal);
                      }}
                      className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                        meal.outOfStock
                          ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                          : 'bg-primary-light text-primary border border-primary/30 hover:bg-primary hover:text-white'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      {meal.outOfStock ? 'Unavailable' : 'Add to Cart'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
