import React, { useState } from 'react';
import { X, Plus, Minus, ShoppingBag, User, Phone, ChefHat, Trash2, Zap } from 'lucide-react';

export default function AddWalkInModal({ isOpen, onClose, meals = [], onOrderCreated, isSubmitting }) {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedItems, setSelectedItems] = useState([]); // [{ mealId, name, price, qty }]
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const activeMeals = meals.filter(m => !m.outOfStock);
  const filteredMeals = activeMeals.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );
  const quickPicks = activeMeals.slice(0, 6);

  const addItem = (meal) => {
    setSelectedItems(prev => {
      const idx = prev.findIndex(i => i.mealId === meal.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, { mealId: meal.id, name: meal.name, price: meal.price, qty: 1 }];
    });
  };

  const updateQty = (mealId, delta) => {
    setSelectedItems(prev =>
      prev.map(i => i.mealId === mealId ? { ...i, qty: i.qty + delta } : i)
        .filter(i => i.qty > 0)
    );
  };

  const removeItem = (mealId) => {
    setSelectedItems(prev => prev.filter(i => i.mealId !== mealId));
  };

  const clearAll = () => setSelectedItems([]);

  const totalRWF = selectedItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const itemCount = selectedItems.reduce((sum, i) => sum + i.qty, 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedItems.length === 0) return;
    onOrderCreated({ customerName: customerName || 'Walk-in', phone, items: selectedItems });
  };

  const handleClose = () => {
    setCustomerName(''); setPhone(''); setSelectedItems([]); setSearch('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-2xl bg-[#1a1208] border border-amber-500/30 rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-600 flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">New Walk-in Order</div>
              <div className="text-[10px] text-amber-300">Counter / Dine-in</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {itemCount > 0 && (
              <span className="px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold flex items-center gap-1">
                <ShoppingBag className="w-3 h-3" /> {itemCount}
              </span>
            )}
            <button onClick={handleClose} className="p-2 rounded-xl hover:bg-white/10 text-text-muted transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-0">
            {/* Left: Menu Selector */}
            <div className="flex-1 min-h-0 p-4 overflow-y-auto border-b lg:border-b-0 lg:border-r border-white/10 space-y-3">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search menu…"
                className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-text-muted focus:outline-none focus:border-amber-500/60"
              />

              {/* Quick Pick */}
              {!search && quickPicks.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-amber-300 uppercase flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Quick Pick
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {quickPicks.map(meal => {
                      const qty = selectedItems.find(i => i.mealId === meal.id)?.qty;
                      return (
                        <button
                          key={meal.id}
                          type="button"
                          onClick={() => addItem(meal)}
                          title={`Quick add ${meal.name}`}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-all ${
                            qty
                              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                              : 'bg-black/30 border-white/10 text-text-main hover:bg-amber-500/15 hover:border-amber-500/40'
                          }`}
                        >
                          <Plus className="w-3 h-3" />
                          <span className="truncate max-w-[110px]">{meal.name}</span>
                          {qty > 1 && <span className="text-amber-400 font-mono">×{qty}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Menu List */}
              <div className="space-y-1.5">
                {filteredMeals.length === 0 && (
                  <p className="text-xs text-text-muted text-center py-4">No items found</p>
                )}
                {filteredMeals.map(meal => {
                  const inCart = selectedItems.find(i => i.mealId === meal.id);
                  return (
                    <div
                      key={meal.id}
                      className={`w-full flex items-center gap-2 p-2 rounded-xl border transition-all ${
                        inCart
                          ? 'bg-amber-500/15 border-amber-500/40'
                          : 'bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-white truncate">{meal.name}</div>
                        <div className="text-amber-400 font-mono text-[10px]">{Number(meal.price).toLocaleString()} RWF</div>
                      </div>
                      {inCart ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <button type="button" onClick={() => updateQty(meal.id, -1)} className="w-6 h-6 rounded-md bg-white/10 text-white flex items-center justify-center hover:bg-red-500/30 transition-colors" title="Remove one">
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs text-white font-mono w-5 text-center">{inCart.qty}</span>
                          <button type="button" onClick={() => updateQty(meal.id, 1)} className="w-6 h-6 rounded-md bg-white/10 text-white flex items-center justify-center hover:bg-emerald-500/30 transition-colors" title="Add one">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => addItem(meal)} className="shrink-0 w-6 h-6 rounded-md bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center transition-colors" title="Quick add">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Order Summary */}
            <div className="lg:w-60 shrink-0 flex flex-col gap-3 p-4 overflow-y-auto min-h-0">
              {/* Optional Customer Info */}
              <div className="space-y-2">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                  <input
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Customer name (opt.)"
                    className="w-full bg-black/30 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-text-muted focus:outline-none focus:border-amber-500/60"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="Phone (optional)"
                    className="w-full bg-black/30 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-text-muted focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>

              {/* Selected Items */}
              <div className="flex-1 space-y-1.5 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-text-muted uppercase">Order Items</span>
                  {selectedItems.length > 0 && (
                    <button type="button" onClick={clearAll} className="text-[10px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors">
                      <Trash2 className="w-3 h-3" /> Clear
                    </button>
                  )}
                </div>
                {selectedItems.length === 0 && (
                  <p className="text-xs text-text-subdued text-center py-3">← Pick from menu</p>
                )}
                {selectedItems.map(item => (
                  <div key={item.mealId} className="bg-black/30 rounded-xl p-2 border border-white/5 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white flex-1 truncate">{item.name}</span>
                      <button type="button" onClick={() => removeItem(item.mealId)} className="shrink-0 text-text-muted hover:text-red-400 transition-colors" title="Remove item">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-amber-400 font-mono text-[10px]">{(item.price * item.qty).toLocaleString()} RWF</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => updateQty(item.mealId, -1)} className="w-5 h-5 rounded-md bg-white/10 text-white flex items-center justify-center hover:bg-red-500/30 transition-colors">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs text-white font-mono w-4 text-center">{item.qty}</span>
                        <button type="button" onClick={() => updateQty(item.mealId, 1)} className="w-5 h-5 rounded-md bg-white/10 text-white flex items-center justify-center hover:bg-emerald-500/30 transition-colors">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer: Running Total & Submit (always visible) */}
          <div className="shrink-0 px-4 py-3 border-t border-white/10 bg-black/20 rounded-b-3xl">
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-xs text-text-muted">
                {itemCount} item{itemCount !== 1 ? 's' : ''}
                <span className="mx-1.5">·</span>
                Counter · Cash (PAID)
              </div>
              <div className="text-sm font-bold text-amber-400 font-mono">{totalRWF.toLocaleString()} RWF</div>
            </div>
            <button
              type="submit"
              disabled={selectedItems.length === 0 || isSubmitting}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ShoppingBag className="w-4 h-4" />
              {isSubmitting ? 'Placing…' : 'Place Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
