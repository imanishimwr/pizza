import React, { useEffect, useRef, useState } from 'react';
import { X, Star, Flame, Plus, Minus, ShoppingBag, Check } from 'lucide-react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

const rwf = (value) => Number(value || 0).toLocaleString();

function useOverlayA11y(isOpen, onClose) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return undefined;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const first = panel ? panel.querySelector(FOCUSABLE_SELECTOR) : null;
    if (first instanceof HTMLElement) first.focus();
    else if (panel instanceof HTMLElement) panel.focus();
    return () => {
      if (trigger && document.contains(trigger)) trigger.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (typeof closeRef.current === 'function') closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const nodes = Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR));
      if (nodes.length === 0) {
        event.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === first || active === panel || !panel.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  return panelRef;
}

/**
 * Customisation dialog for one dish. `meal` doubles as the "is open" flag, so
 * every hook still runs unconditionally and the conditional render happens last.
 */
export default function FoodDetailModal({ meal, onClose, onAddToCart }) {
  const [selectedSpice, setSelectedSpice] = useState(null);
  const [selectedBroth, setSelectedBroth] = useState(null);
  const [specialNote, setSpecialNote] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [imageFailed, setImageFailed] = useState(false);

  const open = Boolean(meal);
  const panelRef = useOverlayA11y(open, onClose);

  // Reset the customisation whenever a different dish is shown.
  useEffect(() => {
    if (!meal) return;
    setSelectedSpice(Array.isArray(meal.spiceLevels) ? meal.spiceLevels[0] ?? null : null);
    setSelectedBroth(Array.isArray(meal.broths) ? meal.broths[0] ?? null : null);
    setSpecialNote('');
    setQuantity(1);
    setImageFailed(false);
  }, [meal]);

  if (!meal) return null;

  const price = Number(meal.price) || 0;
  const imageSrc = imageFailed ? meal.fallbackImage : meal.image || meal.fallbackImage;

  const handleAdd = () => {
    onAddToCart({
      meal,
      quantity,
      selectedSpice,
      selectedBroth,
      specialNote,
      totalPrice: price * quantity
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="food-detail-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="bg-surface-dark border border-white/10 rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col justify-between"
      >
        {/* Header Image */}
        <div className="relative aspect-video bg-black/60">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={meal.name || 'Menu item'}
              className="w-full h-full object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-subdued text-xs">
              No image available
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dish details"
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" focusable="false" />
          </button>

          <div className="absolute bottom-4 left-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-xs font-bold text-amber-400 flex items-center gap-1.5">
            <Star className="w-4 h-4 fill-amber-400" aria-hidden="true" focusable="false" />
            <span>
              {Number(meal.rating || 0).toFixed(1)} ({Number(meal.reviews || 0)} ratings)
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1">
          <div>
            <div className="flex items-start justify-between gap-4">
              <h2 id="food-detail-title" className="text-xl font-extrabold text-text-main">
                {meal.name || 'Menu item'}
              </h2>
              <span className="text-xl font-mono font-extrabold text-primary whitespace-nowrap">
                {rwf(price)} RWF
              </span>
            </div>
            <p className="text-xs text-text-muted mt-2 leading-relaxed">{meal.description}</p>
          </div>

          {/* Spice Level Option */}
          {Array.isArray(meal.spiceLevels) && meal.spiceLevels.length > 0 && (
            <fieldset className="space-y-2.5">
              <legend className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-primary" aria-hidden="true" focusable="false" />
                Select Spice Level
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {meal.spiceLevels.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSelectedSpice(lvl)}
                    aria-pressed={selectedSpice === lvl}
                    className={`px-3 py-2 rounded-xl text-xs font-bold text-left transition-all border flex items-center justify-between gap-2 ${
                      selectedSpice === lvl
                        ? 'bg-primary/20 border-primary text-primary shadow-sm'
                        : 'bg-surface-card border-white/5 text-text-muted hover:border-white/20'
                    }`}
                  >
                    <span>{lvl}</span>
                    {selectedSpice === lvl && (
                      <Check className="w-4 h-4 text-primary" aria-hidden="true" focusable="false" />
                    )}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {/* Broth Option */}
          {Array.isArray(meal.broths) && meal.broths.length > 0 && (
            <fieldset className="space-y-2.5">
              <legend className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Select Broth Base
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {meal.broths.map((broth) => (
                  <button
                    key={broth}
                    type="button"
                    onClick={() => setSelectedBroth(broth)}
                    aria-pressed={selectedBroth === broth}
                    className={`px-3 py-2 rounded-xl text-xs font-bold text-left transition-all border flex items-center justify-between gap-2 ${
                      selectedBroth === broth
                        ? 'bg-primary/20 border-primary text-primary shadow-sm'
                        : 'bg-surface-card border-white/5 text-text-muted hover:border-white/20'
                    }`}
                  >
                    <span>{broth}</span>
                    {selectedBroth === broth && (
                      <Check className="w-4 h-4 text-primary" aria-hidden="true" focusable="false" />
                    )}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {/* Special Instructions */}
          <div className="space-y-2">
            <label
              htmlFor="food-detail-note"
              className="text-xs font-bold uppercase tracking-wider text-text-muted block"
            >
              Special Preparation Notes
            </label>
            <input
              id="food-detail-note"
              type="text"
              value={specialNote}
              onChange={(e) => setSpecialNote(e.target.value)}
              placeholder="e.g. Extra garlic dipping sauce, no cilantro..."
              className="w-full bg-surface-card border border-white/10 rounded-xl px-4 py-2.5 text-xs text-text-main placeholder-text-subdued focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-surface-card border-t border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
              className="w-8 h-8 rounded-lg bg-surface-dark text-text-main hover:bg-white/10 flex items-center justify-center font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Minus className="w-4 h-4" aria-hidden="true" focusable="false" />
            </button>
            <span className="w-6 text-center font-bold text-sm font-mono text-white" aria-live="polite">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              aria-label="Increase quantity"
              className="w-8 h-8 rounded-lg bg-surface-dark text-text-main hover:bg-white/10 flex items-center justify-center font-bold"
            >
              <Plus className="w-4 h-4" aria-hidden="true" focusable="false" />
            </button>
          </div>

          <button type="button" onClick={handleAdd} className="flex-1 btn-primary text-xs py-3">
            <ShoppingBag className="w-4 h-4" aria-hidden="true" focusable="false" />
            Add to Order • {rwf(price * quantity)} RWF
          </button>
        </div>
      </div>
    </div>
  );
}
