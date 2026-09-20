import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Flame, 
  Star, 
  Clock, 
  Plus, 
  Minus, 
  ShoppingBag, 
  Heart, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  Share2, 
  Utensils, 
  AlertCircle,
  RotateCcw,
  Trash2
} from 'lucide-react';

export default function ProductDetailsPage({
  meal,
  allMeals = [],
  cart = [],
  onAddToCart,
  onUpdateCartQty,
  onRemoveCartItem,
  onOpenCart,
  onSelectMeal,
  onBackToMenu,
  wishlist = [],
  onToggleWishlist
}) {
  if (!meal) {
    return (
      <div className="py-24 text-center max-w-lg mx-auto space-y-4">
        <Utensils className="w-12 h-12 text-text-subdued mx-auto" />
        <h2 className="text-xl font-bold text-text-main">No product selected</h2>
        <p className="text-xs text-text-muted">Please browse our gourmet hotpot and pizza catalog to pick a dish.</p>
        <button onClick={onBackToMenu} className="btn-primary text-xs py-2.5 px-6 inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Return to Menu
        </button>
      </div>
    );
  }

  // Find if this meal is already in cart
  const cartItemIndex = cart.findIndex(item => item.meal.id === meal.id);
  const inCartItem = cartItemIndex !== -1 ? cart[cartItemIndex] : null;
  const inCartQty = inCartItem ? inCartItem.quantity : 0;

  // Customization local state
  const [selectedSpice, setSelectedSpice] = useState(
    inCartItem?.selectedSpice || (meal.spiceLevels ? meal.spiceLevels[0] : null)
  );
  const [selectedBroth, setSelectedBroth] = useState(
    inCartItem?.selectedBroth || (meal.broths ? meal.broths[0] : null)
  );
  const [specialNote, setSpecialNote] = useState(inCartItem?.specialNote || '');
  const [newQty, setNewQty] = useState(1);

  // Sync state when meal changes
  useEffect(() => {
    setSelectedSpice(inCartItem?.selectedSpice || (meal.spiceLevels ? meal.spiceLevels[0] : null));
    setSelectedBroth(inCartItem?.selectedBroth || (meal.broths ? meal.broths[0] : null));
    setSpecialNote(inCartItem?.specialNote || '');
    setNewQty(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [meal.id, inCartQty]);

  const isWishlisted = wishlist.some(w => (typeof w === 'string' ? w === meal.id : w.id === meal.id));

  // Add initial or additional product to cart
  const handleAddOrIncrement = (qtyToAdd = 1) => {
    if (inCartItem) {
      onUpdateCartQty(cartItemIndex, inCartQty + qtyToAdd);
    } else {
      onAddToCart({
        meal,
        quantity: qtyToAdd,
        selectedSpice,
        selectedBroth,
        specialNote,
        totalPrice: meal.price * qtyToAdd
      });
    }
  };

  // Reset quantity to 1 if already in cart
  const handleKeepOnlyOne = () => {
    if (inCartItem) {
      onUpdateCartQty(cartItemIndex, 1);
    }
  };

  // Related meals
  const relatedMeals = allMeals
    .filter(m => m.id !== meal.id && (m.category === meal.category || m.spicy === meal.spicy))
    .slice(0, 4);

  return (
    <div className="space-y-10 pb-16 animate-fade-in max-w-6xl mx-auto">
      {/* Back Button & Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
        <button
          onClick={onBackToMenu}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-card border border-white/10 text-xs font-bold text-text-main hover:border-primary transition-all group"
        >
          <ArrowLeft className="w-4 h-4 text-primary group-hover:-translate-x-1 transition-transform" />
          Back to Menu
        </button>

        <div className="text-xs text-text-muted flex items-center gap-2">
          <span>Home</span>
          <span>/</span>
          <span className="capitalize">{meal.category}</span>
          <span>/</span>
          <span className="text-text-main font-semibold">{meal.name}</span>
        </div>
      </div>

      {/* Main Product Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Product Image & Badges (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative rounded-3xl overflow-hidden aspect-[4/3] bg-black/60 border border-white/10 shadow-2xl group">
            <img
              src={meal.image}
              alt={meal.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              onError={(e) => { e.target.src = meal.fallbackImage; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

            {/* Badges Overlay */}
            <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
              {meal.outOfStock ? (
                <span className="badge-tag bg-gray-950 text-gray-400 border border-gray-700">
                  Out of Stock
                </span>
              ) : meal.spicy ? (
                <span className="badge-tag bg-red-950/90 text-red-400 border border-red-500/40 backdrop-blur-md">
                  🔥 Szechuan Spicy
                </span>
              ) : null}
              {meal.category === 'hotpot' && (
                <span className="badge-tag bg-amber-950/90 text-amber-300 border border-amber-500/40 backdrop-blur-md">
                  🍲 HotPot Combo
                </span>
              )}
            </div>

            {/* Prep Time Badge */}
            <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/15 text-xs font-bold text-white flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>Prep: {meal.prepTime || '15-20 min'}</span>
            </div>

            {/* Rating */}
            <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/15 text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>{meal.rating}</span>
              <span className="text-[11px] text-text-muted">({meal.reviews} reviews)</span>
            </div>
          </div>

          {/* Quick Perks */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-surface-card border border-white/5 space-y-1">
              <div className="font-bold text-text-main flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Fresh Ingredients
              </div>
              <div className="text-[11px] text-text-muted">Locally sourced daily in Kigali</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-card border border-white/5 space-y-1">
              <div className="font-bold text-text-main flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Express Delivery
              </div>
              <div className="text-[11px] text-text-muted">Delivered hot to your door</div>
            </div>
          </div>
        </div>

        {/* Right Column: Culinary Details & Dynamic Cart Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Header Title & Price */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl sm:text-3xl font-black text-text-main tracking-tight leading-tight">
                {meal.name}
              </h1>

              {/* Wishlist Button */}
              <button
                onClick={() => onToggleWishlist(meal)}
                className={`p-3 rounded-2xl border transition-all shrink-0 ${
                  isWishlisted
                    ? 'bg-red-500/20 border-red-500/50 text-red-400 shadow-lg shadow-red-500/20'
                    : 'bg-surface-card border-white/10 text-text-muted hover:text-white hover:border-white/20'
                }`}
                title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-red-400 text-red-400' : ''}`} />
              </button>
            </div>

            <div className="flex items-baseline gap-3 pt-1">
              <span className="text-2xl sm:text-3xl font-black font-mono text-primary">
                {meal.price.toLocaleString()} RWF
              </span>
              <span className="text-xs text-text-muted uppercase font-bold tracking-wider">
                Price incl. taxes
              </span>
            </div>

            <p className="text-sm text-text-muted leading-relaxed pt-2">
              {meal.description}
            </p>
          </div>

          {/* Customizations Section */}
          <div className="space-y-5 p-5 rounded-2xl bg-surface-card border border-white/10">
            {/* Spice Levels */}
            {Array.isArray(meal?.spiceLevels) && meal.spiceLevels.length > 0 && (
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-primary" />
                  Select Spice Level
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {meal.spiceLevels.map((lvl) => {
                    const isSelected = selectedSpice === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setSelectedSpice(lvl)}
                        className={`p-3 rounded-xl text-xs font-bold text-left transition-all border flex items-center justify-between ${
                          isSelected
                            ? 'bg-primary/20 border-primary text-primary shadow-sm ring-1 ring-primary'
                            : 'bg-surface-dark border-white/5 text-text-muted hover:border-white/20'
                        }`}
                      >
                        <span>{lvl}</span>
                        {isSelected && <Check className="w-4 h-4 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Broths */}
            {Array.isArray(meal?.broths) && meal.broths.length > 0 && (
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Choose Broth Base
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {meal.broths.map((broth) => {
                    const isSelected = selectedBroth === broth;
                    return (
                      <button
                        key={broth}
                        type="button"
                        onClick={() => setSelectedBroth(broth)}
                        className={`p-3 rounded-xl text-xs font-bold text-left transition-all border flex items-center justify-between ${
                          isSelected
                            ? 'bg-primary/20 border-primary text-primary shadow-sm ring-1 ring-primary'
                            : 'bg-surface-dark border-white/5 text-text-muted hover:border-white/20'
                        }`}
                      >
                        <span>{broth}</span>
                        {isSelected && <Check className="w-4 h-4 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Special Instructions */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-text-muted block">
                Special Kitchen Instructions (Optional)
              </label>
              <input
                type="text"
                value={specialNote}
                onChange={(e) => setSpecialNote(e.target.value)}
                placeholder="e.g. Extra sesame dipping sauce, no scallions..."
                className="w-full bg-surface-dark border border-white/10 rounded-xl px-4 py-2.5 text-xs text-text-main placeholder-text-subdued focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* DYNAMIC CART CONTROLLER: State-aware UX */}
          <div className="space-y-4 pt-2">
            
            {/* If product is ALREADY in cart */}
            {inCartQty > 0 ? (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-surface-card to-surface-card border border-emerald-500/40 space-y-4 shadow-xl animate-fade-in">
                
                {/* Status Notice Banner */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Check className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span>Already in your Cart!</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs">
                      {inCartQty} {inCartQty === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  <button
                    onClick={onOpenCart}
                    className="text-xs text-amber-400 hover:text-amber-300 font-bold underline flex items-center gap-1"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    View in Cart Drawer
                  </button>
                </div>

                <p className="text-xs text-text-muted">
                  You already have this dish in your cart. You can increase quantity, keep only one, or remove it:
                </p>

                {/* Inline Quantity Stepper */}
                <div className="flex items-center gap-4 bg-black/40 border border-white/10 p-2 rounded-2xl w-fit">
                  <span className="text-xs text-text-muted font-bold pl-2">Quantity:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (inCartQty <= 1) {
                          onRemoveCartItem(cartItemIndex);
                        } else {
                          onUpdateCartQty(cartItemIndex, inCartQty - 1);
                        }
                      }}
                      className="w-9 h-9 rounded-xl bg-surface-dark border border-white/10 text-white hover:bg-white/10 flex items-center justify-center font-bold transition-all"
                      title={inCartQty === 1 ? 'Remove from Cart' : 'Decrease Quantity'}
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <span className="w-8 text-center font-mono font-black text-base text-white">
                      {inCartQty}
                    </span>

                    <button
                      onClick={() => onUpdateCartQty(cartItemIndex, inCartQty + 1)}
                      className="w-9 h-9 rounded-xl bg-surface-dark border border-white/10 text-white hover:bg-white/10 flex items-center justify-center font-bold transition-all"
                      title="Increase Quantity"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <span className="font-mono font-extrabold text-primary text-sm pr-2">
                    {(meal.price * inCartQty).toLocaleString()} RWF
                  </span>
                </div>

                {/* Quick Add Multiple / Cancel Options */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
                    Quick Quantity Adjustments:
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleAddOrIncrement(1)}
                      className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-md"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      +1 More
                    </button>

                    <button
                      onClick={() => onUpdateCartQty(cartItemIndex, 2)}
                      className={`text-xs py-2 px-3.5 rounded-xl font-bold border transition-all flex items-center gap-1.5 ${
                        inCartQty === 2 
                          ? 'bg-primary/20 border-primary text-primary shadow-sm ring-1 ring-primary' 
                          : 'bg-surface-dark border-white/10 text-white hover:border-white/30'
                      }`}
                    >
                      Add Twice (2x)
                    </button>

                    <button
                      onClick={() => onUpdateCartQty(cartItemIndex, 3)}
                      className={`text-xs py-2 px-3.5 rounded-xl font-bold border transition-all flex items-center gap-1.5 ${
                        inCartQty === 3 
                          ? 'bg-primary/20 border-primary text-primary shadow-sm ring-1 ring-primary' 
                          : 'bg-surface-dark border-white/10 text-white hover:border-white/30'
                      }`}
                    >
                      Add 3 Times (3x)
                    </button>

                    {inCartQty > 1 && (
                      <button
                        onClick={handleKeepOnlyOne}
                        className="text-xs py-2 px-3.5 rounded-xl font-bold border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-all flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Keep Only 1 (Cancel Extra)
                      </button>
                    )}

                    <button
                      onClick={() => onRemoveCartItem(cartItemIndex)}
                      className="text-xs py-2 px-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all flex items-center gap-1 ml-auto"
                      title="Remove entirely from cart"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              /* If product is NOT YET in cart */
              <div className="p-5 rounded-2xl bg-surface-card border border-white/10 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  
                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-xl p-1">
                    <button
                      onClick={() => setNewQty(Math.max(1, newQty - 1))}
                      className="w-8 h-8 rounded-lg bg-surface-dark text-text-main hover:bg-white/10 flex items-center justify-center font-bold transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-bold font-mono text-sm text-white">
                      {newQty}
                    </span>
                    <button
                      onClick={() => setNewQty(newQty + 1)}
                      className="w-8 h-8 rounded-lg bg-surface-dark text-text-main hover:bg-white/10 flex items-center justify-center font-bold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Add to Cart Primary Button */}
                  <button
                    disabled={meal.outOfStock}
                    onClick={() => handleAddOrIncrement(newQty)}
                    className={`flex-1 btn-primary text-xs py-3.5 px-6 font-extrabold flex items-center justify-center gap-2 ${
                      meal.outOfStock ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    {meal.outOfStock ? 'Item Currently Sold Out' : `Add to Order • ${(meal.price * newQty).toLocaleString()} RWF`}
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Related Dishes Section */}
      {relatedMeals.length > 0 && (
        <section className="space-y-4 pt-8 border-t border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              You Might Also Like
            </h3>
            <span className="text-xs text-text-muted">Popular combinations in Kigali</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {relatedMeals.map(relMeal => (
              <div
                key={relMeal.id}
                onClick={() => onSelectMeal(relMeal)}
                className="card-item group p-3 space-y-3 cursor-pointer overflow-hidden border-white/5 hover:border-primary/50 transition-all"
              >
                <div className="aspect-video relative rounded-xl overflow-hidden bg-black/40">
                  <img
                    src={relMeal.image}
                    alt={relMeal.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { e.target.src = relMeal.fallbackImage; }}
                  />
                  <span className="absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/70 text-white">
                    {(Number(relMeal.price) || 0).toLocaleString()} RWF
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-text-main line-clamp-1 group-hover:text-primary transition-colors">
                    {relMeal.name}
                  </h4>
                  <p className="text-[11px] text-text-muted line-clamp-1 mt-0.5">
                    {relMeal.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
