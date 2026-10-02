import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Flame,
  Star,
  Plus,
  Minus,
  ShoppingBag,
  Heart,
  Check,
  ShieldCheck,
  Sparkles,
  Utensils,
  RotateCcw,
  Trash2
} from 'lucide-react';

const formatRWF = (value) =>
  Number.isFinite(Number(value)) ? `${Number(value).toLocaleString()} RWF` : 'Price unavailable';

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
  onToggleWishlist,
  signedIn = false,
  onOpenAuth
}) {
  // Every hook lives above any early return. The previous version declared
  // useState/useEffect *after* `if (!meal) return ...`, which is a hard
  // Rules-of-Hooks violation the moment `meal` flips between null and an object.
  const [selectedSpice, setSelectedSpice] = useState(null);
  const [selectedBroth, setSelectedBroth] = useState(null);
  const [specialNote, setSpecialNote] = useState('');
  const [newQty, setNewQty] = useState(1);

  const mealId = meal?.id ?? null;
  const spiceLevels = useMemo(
    () => (Array.isArray(meal?.spiceLevels) ? meal.spiceLevels : []),
    [meal?.spiceLevels]
  );
  const broths = useMemo(() => (Array.isArray(meal?.broths) ? meal.broths : []), [meal?.broths]);

  const cartIndex = mealId
    ? (Array.isArray(cart) ? cart : []).findIndex((item) => item?.meal?.id === mealId)
    : -1;
  const inCartItem = cartIndex !== -1 ? cart[cartIndex] : null;
  const inCartQty = inCartItem ? Number(inCartItem.quantity) || 0 : 0;

  // Reset the customisation whenever the viewed dish (or its cart line) changes.
  useEffect(() => {
    setSelectedSpice(inCartItem?.selectedSpice || spiceLevels[0] || null);
    setSelectedBroth(inCartItem?.selectedBroth || broths[0] || null);
    setSpecialNote(inCartItem?.specialNote || '');
    setNewQty(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // `inCartItem` is derived from these two values only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealId, inCartQty, spiceLevels, broths]);

  const isWishlisted =
    !!mealId &&
    (Array.isArray(wishlist) ? wishlist : []).some(
      (entry) => (typeof entry === 'string' ? entry : entry?.id) === mealId
    );

  const relatedMeals = useMemo(() => {
    if (!meal) return [];
    return (Array.isArray(allMeals) ? allMeals : [])
      .filter((m) => m?.id !== meal.id && (m?.category === meal.category || m?.spicy === meal.spicy))
      .slice(0, 4);
  }, [allMeals, meal]);

  const priceOf = (candidate) => Number(candidate?.price);

  const handleAddOrIncrement = (qtyToAdd = 1) => {
    if (!meal || meal.outOfStock) return;
    const qty = Math.max(1, Number(qtyToAdd) || 1);

    if (inCartItem) {
      if (onUpdateCartQty) onUpdateCartQty(cartIndex, inCartQty + qty);
    } else if (onAddToCart) {
      onAddToCart({
        meal,
        quantity: qty,
        selectedSpice,
        selectedBroth,
        specialNote,
        totalPrice: unitPrice * qty
      });
    }
    if (onOpenCart) onOpenCart();
  };

  const handleRemove = () => {
    if (cartIndex !== -1 && onRemoveCartItem) onRemoveCartItem(cartIndex);
  };

  const handleSetQty = (qty) => {
    if (cartIndex === -1 || !onUpdateCartQty) return;
    if (qty <= 0) handleRemove();
    else onUpdateCartQty(cartIndex, qty);
  };

  const handleWishlist = () => {
    if (!onToggleWishlist || !meal) return;
    onToggleWishlist(meal);
  };

  // `meal` is null while App is still resolving ?id= against the menu. Once the
  // catalogue has arrived we know the dish genuinely does not exist any more.
  if (!meal) {
    const menuStillLoading = !Array.isArray(allMeals) || allMeals.length === 0;
    return (
      <div className="py-24 text-center max-w-lg mx-auto space-y-4">
        <Utensils className="w-12 h-12 text-text-subdued mx-auto" aria-hidden="true" />
        <h2 className="text-xl font-bold text-text-main">
          {menuStillLoading ? 'Loading dish…' : 'Dish not found'}
        </h2>
        <p className="text-xs text-text-muted">
          {menuStillLoading
            ? 'Fetching the menu. This page updates itself as soon as the catalogue arrives.'
            : 'This dish is no longer on the menu. Browse the current catalogue to pick another one.'}
        </p>
        {onBackToMenu && (
          <button
            type="button"
            onClick={onBackToMenu}
            className="btn-primary text-xs py-2.5 px-6 inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Return to Menu
          </button>
        )}
      </div>
    );
  }

  const rating = Number(meal.rating);
  const hasRating = Number.isFinite(rating);
  const reviews = Number(meal.reviews);
  const unitPrice = priceOf(meal);

  return (
    <div className="space-y-10 pb-16 animate-fade-in max-w-6xl mx-auto">
      {/* Back Button & Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
        <button
          type="button"
          onClick={onBackToMenu}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-card border border-white/10 text-xs font-bold text-text-main hover:border-primary transition-all group"
        >
          <ArrowLeft className="w-4 h-4 text-primary group-hover:-translate-x-1 transition-transform" aria-hidden="true" />
          Back to Menu
        </button>

        <div className="text-xs text-text-muted flex items-center gap-2">
          <span>Home</span>
          <span aria-hidden="true">/</span>
          <span className="capitalize">{meal.category}</span>
          <span aria-hidden="true">/</span>
          <span className="text-text-main font-semibold">{meal.name}</span>
        </div>
      </div>

      {/* Main Product Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Product Image & Badges (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative rounded-3xl overflow-hidden aspect-4/3 bg-black/60 border border-white/10 shadow-2xl group">
            <img
              src={meal.image}
              alt={meal.name ? `${meal.name}` : ''}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              onError={(e) => {
                e.currentTarget.dataset.fallbackApplied = e.currentTarget.dataset.fallbackApplied || '0';
                if (e.currentTarget.dataset.fallbackApplied === '0' && meal.fallbackImage) {
                  e.currentTarget.dataset.fallbackApplied = '1';
                  e.currentTarget.src = meal.fallbackImage;
                } else {
                  e.currentTarget.style.visibility = 'hidden';
                }
              }}
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-black/20" />

            {/* Badges Overlay */}
            <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
              {meal.outOfStock ? (
                <span className="badge-tag bg-gray-950 text-gray-400 border border-gray-700">Out of Stock</span>
              ) : meal.spicy ? (
                <span className="badge-tag bg-red-950/90 text-red-400 border border-red-500/40 backdrop-blur-md">
                  🔥 Spicy
                </span>
              ) : null}
              {meal.category === 'hotpot' && (
                <span className="badge-tag bg-amber-950/90 text-amber-300 border border-amber-500/40 backdrop-blur-md">
                  🍲 HotPot Combo
                </span>
              )}
            </div>

            {hasRating && (
              <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/15 text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                <span>{rating.toLocaleString()}</span>
                <span className="text-[11px] text-text-muted">
                  ({Number.isFinite(reviews) ? reviews.toLocaleString() : 0} reviews)
                </span>
              </div>
            )}
          </div>

          {/* Quick Perks */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-surface-card border border-white/5 space-y-1">
              <div className="font-bold text-text-main flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" aria-hidden="true" />
                Fresh Ingredients
              </div>
              <div className="text-[11px] text-text-muted">Locally sourced daily in Kigali</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-card border border-white/5 space-y-1">
              <div className="font-bold text-text-main flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
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
              {onToggleWishlist && (
                <button
                  type="button"
                  onClick={handleWishlist}
                  className={`p-3 rounded-2xl border transition-all shrink-0 ${
                    isWishlisted
                      ? 'bg-red-500/20 border-red-500/50 text-red-400 shadow-lg shadow-red-500/20'
                      : 'bg-surface-card border-white/10 text-text-muted hover:text-white hover:border-white/20'
                  }`}
                  title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                  aria-label={isWishlisted ? 'Remove this dish from wishlist' : 'Add this dish to wishlist'}
                  aria-pressed={isWishlisted}
                >
                  <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-red-400 text-red-400' : ''}`} />
                </button>
              )}
            </div>

            <div className="flex items-baseline gap-3 pt-1">
              <span className="text-2xl sm:text-3xl font-black font-mono text-primary">{formatRWF(meal.price)}</span>
              <span className="text-xs text-text-muted uppercase font-bold tracking-wider">Price incl. taxes</span>
            </div>

            <p className="text-sm text-text-muted leading-relaxed pt-2">{meal.description}</p>
          </div>

          {/* Customizations Section */}
          <div className="space-y-5 p-5 rounded-2xl bg-surface-card border border-white/10">
            {/* Spice Levels */}
            {spiceLevels.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-primary" aria-hidden="true" />
                  Select Spice Level
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5" role="group" aria-label="Spice level">
                  {spiceLevels.map((lvl) => {
                    const isSelected = selectedSpice === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setSelectedSpice(lvl)}
                        aria-pressed={isSelected}
                        className={`p-3 rounded-xl text-xs font-bold text-left transition-all border flex items-center justify-between ${
                          isSelected
                            ? 'bg-primary/20 border-primary text-primary shadow-sm ring-1 ring-primary'
                            : 'bg-surface-dark border-white/5 text-text-muted hover:border-white/20'
                        }`}
                      >
                        <span>{lvl}</span>
                        {isSelected && <Check className="w-4 h-4 text-primary" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Broths */}
            {broths.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Choose Broth Base</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5" role="group" aria-label="Broth base">
                  {broths.map((broth) => {
                    const isSelected = selectedBroth === broth;
                    return (
                      <button
                        key={broth}
                        type="button"
                        onClick={() => setSelectedBroth(broth)}
                        aria-pressed={isSelected}
                        className={`p-3 rounded-xl text-xs font-bold text-left transition-all border flex items-center justify-between ${
                          isSelected
                            ? 'bg-primary/20 border-primary text-primary shadow-sm ring-1 ring-primary'
                            : 'bg-surface-dark border-white/5 text-text-muted hover:border-white/20'
                        }`}
                      >
                        <span>{broth}</span>
                        {isSelected && <Check className="w-4 h-4 text-primary" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Special Instructions */}
            <div className="space-y-2">
              <label htmlFor="special-note" className="text-xs font-bold uppercase tracking-wider text-text-muted block">
                Special Kitchen Instructions (Optional)
              </label>
              <input
                id="special-note"
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
            {inCartQty > 0 ? (
              <div className="p-5 rounded-2xl bg-linear-to-r from-emerald-950/50 via-surface-card to-surface-card border border-emerald-500/40 space-y-4 shadow-xl animate-fade-in">
                {/* Status Notice Banner */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                    </div>
                    <span>Already in your Cart!</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs">
                      {inCartQty} {inCartQty === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  {onOpenCart && (
                    <button
                      type="button"
                      onClick={onOpenCart}
                      className="text-xs text-amber-400 hover:text-amber-300 font-bold underline flex items-center gap-1 cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" aria-hidden="true" />
                      View in Cart Drawer
                    </button>
                  )}
                </div>

                {!signedIn && onOpenAuth && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-amber-200">
                      Sign in or register to complete your order and track delivery.
                    </p>
                    <button
                      type="button"
                      onClick={onOpenAuth}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-500 text-black font-extrabold text-xs shrink-0 hover:bg-amber-400 transition-colors cursor-pointer"
                    >
                      Sign In to Order
                    </button>
                  </div>
                )}

                <p className="text-xs text-text-muted">
                  You already have this dish in your cart. You can increase the quantity, keep only one, or remove
                  it.
                </p>

                {/* Inline Quantity Stepper */}
                <div className="flex items-center gap-4 bg-black/40 border border-white/10 p-2 rounded-2xl w-fit">
                  <span className="text-xs text-text-muted font-bold pl-2">Quantity:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSetQty(inCartQty - 1)}
                      className="w-9 h-9 rounded-xl bg-surface-dark border border-white/10 text-white hover:bg-white/10 flex items-center justify-center font-bold transition-all"
                      title={inCartQty === 1 ? 'Remove from Cart' : 'Decrease Quantity'}
                      aria-label={inCartQty === 1 ? 'Remove from cart' : 'Decrease quantity'}
                    >
                      <Minus className="w-4 h-4" aria-hidden="true" />
                    </button>

                    <span className="w-8 text-center font-mono font-black text-base text-white">{inCartQty}</span>

                    <button
                      type="button"
                      onClick={() => handleSetQty(inCartQty + 1)}
                      className="w-9 h-9 rounded-xl bg-surface-dark border border-white/10 text-white hover:bg-white/10 flex items-center justify-center font-bold transition-all"
                      title="Increase Quantity"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>

                  <span className="font-mono font-extrabold text-primary text-sm pr-2">
                    {formatRWF(unitPrice * inCartQty)}
                  </span>
                </div>

                {/* Quick quantity additions. These ADD to the current quantity;
                    they no longer overwrite it with a fixed number. */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
                    Quick Quantity Adjustments:
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddOrIncrement(1)}
                      className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-md"
                    >
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                      +1 More
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddOrIncrement(2)}
                      className="text-xs py-2 px-3.5 rounded-xl font-bold border border-white/10 bg-surface-dark text-white hover:border-white/30 transition-all flex items-center gap-1.5"
                    >
                      Add 2 More
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddOrIncrement(3)}
                      className="text-xs py-2 px-3.5 rounded-xl font-bold border border-white/10 bg-surface-dark text-white hover:border-white/30 transition-all flex items-center gap-1.5"
                    >
                      Add 3 More
                    </button>

                    {inCartQty > 1 && (
                      <button
                        type="button"
                        onClick={() => handleSetQty(1)}
                        className="text-xs py-2 px-3.5 rounded-xl font-bold border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-all flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                        Keep Only 1 (Cancel Extra)
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleRemove}
                      className="text-xs py-2 px-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all flex items-center gap-1 ml-auto"
                      title="Remove entirely from cart"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
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
                      type="button"
                      onClick={() => setNewQty((q) => Math.max(1, q - 1))}
                      className="w-8 h-8 rounded-lg bg-surface-dark text-text-main hover:bg-white/10 flex items-center justify-center font-bold transition-colors"
                      aria-label="Decrease quantity to add"
                    >
                      <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <span className="w-8 text-center font-bold font-mono text-sm text-white" aria-live="polite">
                      {newQty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setNewQty((q) => q + 1)}
                      className="w-8 h-8 rounded-lg bg-surface-dark text-text-main hover:bg-white/10 flex items-center justify-center font-bold transition-colors"
                      aria-label="Increase quantity to add"
                    >
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>

                  {/* Add to Cart Primary Button */}
                  <button
                    type="button"
                    disabled={meal.outOfStock}
                    onClick={() => handleAddOrIncrement(newQty)}
                    className={`flex-1 btn-primary text-xs py-3.5 px-6 font-extrabold flex items-center justify-center gap-2 ${
                      meal.outOfStock ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                    {meal.outOfStock
                      ? 'Item Currently Sold Out'
                      : `Add to Order • ${formatRWF(unitPrice * newQty)}`}
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
              <Sparkles className="w-5 h-5 text-primary" aria-hidden="true" />
              You Might Also Like
            </h3>
            <span className="text-xs text-text-muted">Popular combinations in Kigali</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {relatedMeals.map((relMeal) => (
              <div
                key={relMeal.id}
                onClick={() => onSelectMeal && onSelectMeal(relMeal)}
                className="card-item group p-3 space-y-3 cursor-pointer overflow-hidden border-white/5 hover:border-primary/50 transition-all"
              >
                <div className="aspect-video relative rounded-xl overflow-hidden bg-black/40">
                  <img
                    src={relMeal.image}
                    alt={relMeal.name ? `${relMeal.name}` : ''}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      if (e.currentTarget.dataset.fallbackApplied === '1') {
                        e.currentTarget.style.visibility = 'hidden';
                        return;
                      }
                      e.currentTarget.dataset.fallbackApplied = '1';
                      if (relMeal.fallbackImage) e.currentTarget.src = relMeal.fallbackImage;
                      else e.currentTarget.style.visibility = 'hidden';
                    }}
                  />
                  <span className="absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/70 text-white">
                    {formatRWF(relMeal.price)}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-text-main line-clamp-1 group-hover:text-primary transition-colors">
                    {relMeal.name}
                  </h4>
                  <p className="text-[11px] text-text-muted line-clamp-1 mt-0.5">{relMeal.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
