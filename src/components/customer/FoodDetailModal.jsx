import React, { useState } from 'react';
import { X, Star, Flame, Plus, Minus, ShoppingBag, Check } from 'lucide-react';

export default function FoodDetailModal({ meal, onClose, onAddToCart }) {
  if (!meal) return null;

  const [selectedSpice, setSelectedSpice] = useState(meal.spiceLevels ? meal.spiceLevels[0] : null);
  const [selectedBroth, setSelectedBroth] = useState(meal.broths ? meal.broths[0] : null);
  const [specialNote, setSpecialNote] = useState('');
  const [quantity, setQuantity] = useState(1);

  const handleAdd = () => {
    onAddToCart({
      meal,
      quantity,
      selectedSpice,
      selectedBroth,
      specialNote,
      totalPrice: meal.price * quantity
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="bg-surface-dark border border-white/10 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Image */}
        <div className="relative aspect-video bg-black/60">
          <img
            src={meal.image}
            alt={meal.name}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.src = meal.fallbackImage; }}
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="absolute bottom-4 left-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-xs font-bold text-amber-400 flex items-center gap-1.5">
            <Star className="w-4 h-4 fill-amber-400" />
            <span>{meal.rating} ({meal.reviews} ratings)</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1">
          <div>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-xl font-extrabold text-text-main">{meal.name}</h2>
              <span className="text-xl font-mono font-extrabold text-primary whitespace-nowrap">
                {meal.price.toLocaleString()} RWF
              </span>
            </div>
            <p className="text-xs text-text-muted mt-2 leading-relaxed">
              {meal.description}
            </p>
          </div>

          {/* Spice Level Option */}
          {meal.spiceLevels && (
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-primary" />
                Select Spice Level
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {meal.spiceLevels.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSelectedSpice(lvl)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold text-left transition-all border flex items-center justify-between ${
                      selectedSpice === lvl
                        ? 'bg-primary/20 border-primary text-primary shadow-sm'
                        : 'bg-surface-card border-white/5 text-text-muted hover:border-white/20'
                    }`}
                  >
                    <span>{lvl}</span>
                    {selectedSpice === lvl && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Broth Option */}
          {meal.broths && (
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Select Broth Base
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {meal.broths.map((broth) => (
                  <button
                    key={broth}
                    type="button"
                    onClick={() => setSelectedBroth(broth)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold text-left transition-all border flex items-center justify-between ${
                      selectedBroth === broth
                        ? 'bg-primary/20 border-primary text-primary shadow-sm'
                        : 'bg-surface-card border-white/5 text-text-muted hover:border-white/20'
                    }`}
                  >
                    <span>{broth}</span>
                    {selectedBroth === broth && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Special Instructions */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-text-muted block">
              Special Preparation Notes
            </label>
            <input
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
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 rounded-lg bg-surface-dark text-text-main hover:bg-white/10 flex items-center justify-center font-bold"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-6 text-center font-bold text-sm font-mono text-white">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-8 h-8 rounded-lg bg-surface-dark text-text-main hover:bg-white/10 flex items-center justify-center font-bold"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleAdd}
            className="flex-1 btn-primary text-xs py-3"
          >
            <ShoppingBag className="w-4 h-4" />
            Add to Order • {(meal.price * quantity).toLocaleString()} RWF
          </button>
        </div>
      </div>
    </div>
  );
}
