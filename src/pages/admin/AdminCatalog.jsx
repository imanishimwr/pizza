import React, { useMemo, useState } from 'react';
import {
  UtensilsCrossed, Plus, Search, X, Flame, Edit, Trash2
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { MEAL_CATEGORIES, formatRwf } from '../../utils/adminHelpers';
import { updateMeal, deleteMeal } from '../../services/apiService';
import { Field, ModalShell, Pager, MealCardSkeleton, ConfirmModal } from '../../components/admin/AdminComponents';
import AddFoodItemModal from '../../components/admin/AddFoodItemModal';

const FALLBACK_DISH_IMAGE = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80';

export default function AdminCatalog() {
  const { meals, onMealsChange, onDeleteMeal, announce, loading } = useAdmin();

  // Search & Filter
  const [mealSearch, setMealSearch] = useState('');
  const [mealCategoryFilter, setMealCategoryFilter] = useState('all');
  const [mealPage, setMealPage] = useState(1);
  const mealsPerPage = 6;

  // Add Meal modal
  const [showAddMeal, setShowAddMeal] = useState(false);

  // Edit Meal modal
  const [editingMeal, setEditingMeal] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategory, setEditCategory] = useState('hotpot');
  const [editDesc, setEditDesc] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [busyMealId, setBusyMealId] = useState(null);
  const [confirmDeleteMeal, setConfirmDeleteMeal] = useState(null);

  const [locallyDeletedMealIds, setLocallyDeletedMealIds] = useState(() => new Set());

  // Filtered & Paginated meals
  const filteredMeals = useMemo(() => {
    const raw = Array.isArray(meals) ? meals : [];
    const list = locallyDeletedMealIds.size === 0 ? raw : raw.filter((m) => !locallyDeletedMealIds.has(String(m.id)));
    return list.filter((m) => {
      if (mealCategoryFilter !== 'all' && m.category !== mealCategoryFilter) {
        return false;
      }
      if (mealSearch.trim()) {
        const query = mealSearch.toLowerCase();
        const matchesName = m.name?.toLowerCase().includes(query);
        const matchesDesc = m.description?.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc) return false;
      }
      return true;
    });
  }, [meals, locallyDeletedMealIds, mealCategoryFilter, mealSearch]);

  const totalMealPages = Math.ceil(filteredMeals.length / mealsPerPage) || 1;
  const paginatedMeals = useMemo(() => {
    const start = (mealPage - 1) * mealsPerPage;
    return filteredMeals.slice(start, start + mealsPerPage);
  }, [filteredMeals, mealPage]);

  // Handlers
  const openEditMeal = (meal) => {
    setEditingMeal(meal);
    setEditName(meal.name || '');
    setEditPrice(String(meal.price ?? ''));
    setEditCategory(meal.category || 'hotpot');
    setEditDesc(meal.description || '');
  };

  const handleSaveEditMeal = async (e) => {
    e.preventDefault();
    if (!editingMeal) return;
    const price = Number(editPrice);
    if (!editName.trim() || !Number.isFinite(price) || price < 0) {
      announce('error', 'Enter a dish name and a valid price.');
      return;
    }
    setIsSavingEdit(true);
    try {
      await updateMeal(editingMeal.id, {
        name: editName.trim(),
        price,
        category: editCategory,
        description: editDesc.trim()
      });
      setEditingMeal(null);
      await onMealsChange?.();
      announce('success', `${editName.trim()} updated.`);
    } catch (err) {
      announce('error', err?.message || 'Could not save that dish.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleToggleStock = async (meal) => {
    if (busyMealId) return;
    setBusyMealId(meal.id);
    try {
      await updateMeal(meal.id, { outOfStock: !meal.outOfStock });
      await onMealsChange?.();
    } catch (err) {
      announce('error', err?.message || `Could not update ${meal.name}.`);
    } finally {
      setBusyMealId(null);
    }
  };

  const handleDeleteMeal = (meal) => {
    if (busyMealId) return;
    setConfirmDeleteMeal(meal);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteMeal || busyMealId) return;
    const targetMeal = confirmDeleteMeal;
    const targetId = targetMeal.id;

    // 1. Immediately dismiss modal so user doesn't wait
    setConfirmDeleteMeal(null);
    // 2. Immediately remove meal from UI catalog view (0ms)
    setLocallyDeletedMealIds((prev) => new Set(prev).add(String(targetId)));
    // 3. Immediately remove from global state & IndexedDB cache (0ms)
    onDeleteMeal?.(targetId);
    setBusyMealId(targetId);

    try {
      await deleteMeal(targetId);
      announce('success', `${targetMeal.name} removed from catalog.`);
      await onMealsChange?.();
    } catch (err) {
      // Rollback on network/backend failure
      setLocallyDeletedMealIds((prev) => {
        const next = new Set(prev);
        next.delete(String(targetId));
        return next;
      });
      await onMealsChange?.();
      announce('error', err?.message || `Could not delete ${targetMeal.name}.`);
    } finally {
      setBusyMealId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <label htmlFor="meal-search" className="sr-only">
            Search dishes
          </label>
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            id="meal-search"
            type="text"
            value={mealSearch}
            onChange={(e) => {
              setMealSearch(e.target.value);
              setMealPage(1);
            }}
            placeholder="Search dish name or description"
            className="w-full bg-[#1F242D] border border-slate-700/50 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/70"
          />
          {mealSearch && (
            <button
              type="button"
              onClick={() => {
                setMealSearch('');
                setMealPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-white"
              aria-label="Clear dish search"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {MEAL_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setMealCategoryFilter(cat.id);
                setMealPage(1);
              }}
              aria-pressed={mealCategoryFilter === cat.id}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                mealCategoryFilter === cat.id
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60'
                  : 'bg-[#1F242D] text-slate-300 hover:text-white border border-slate-700/50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowAddMeal(true)}
          className="px-4 py-2.5 rounded-xl bg-linear-to-r from-orange-500 to-amber-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md hover:brightness-110 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Add dish</span>
        </button>
      </div>

      {loading && filteredMeals.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <MealCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredMeals.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-sm bg-[#1A1D24] rounded-2xl border border-slate-800">
          No menu items matched your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedMeals.map((meal) => (
            <div
              key={meal.id}
              className="bg-[#1A1D24] border border-slate-800 rounded-2xl overflow-hidden shadow-xl hover:border-orange-500/40 transition-all flex flex-col group"
            >
              <div className="relative h-44 w-full overflow-hidden bg-black">
                <img
                  src={meal.image || meal.fallbackImage || FALLBACK_DISH_IMAGE}
                  alt={meal.name ? `${meal.name} dish photo` : 'Dish photo unavailable'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => {
                    if (e.currentTarget.src !== FALLBACK_DISH_IMAGE) {
                      e.currentTarget.src = FALLBACK_DISH_IMAGE;
                    }
                  }}
                />
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-lg bg-black/70 border border-slate-700/50 text-[10px] font-bold text-white uppercase tracking-wider">
                    {meal.category}
                  </span>
                  {meal.spicy && (
                    <span className="px-2 py-1 rounded-lg bg-red-950/80 border border-red-500/30 text-[10px] font-bold text-red-400 flex items-center gap-1">
                      <Flame className="w-3 h-3" aria-hidden="true" />
                      Spicy
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleStock(meal)}
                  disabled={busyMealId === meal.id}
                  className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all disabled:opacity-60 ${
                    meal.outOfStock
                      ? 'bg-red-500/20 text-red-300 border-red-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                  aria-pressed={Boolean(meal.outOfStock)}
                >
                  {busyMealId === meal.id ? 'Saving...' : meal.outOfStock ? 'Sold out' : 'In stock'}
                </button>
              </div>

              <div className="p-4 space-y-2 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-white text-sm line-clamp-1">{meal.name}</h4>
                  <span className="font-mono font-bold text-orange-400 text-sm whitespace-nowrap">
                    {formatRwf(meal.price)} RWF
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">{meal.description || 'No description on file.'}</p>
              </div>

              <div className="p-4 pt-0 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => openEditMeal(meal)}
                  className="flex-1 py-2 rounded-xl bg-[#1F242D] hover:bg-slate-700/50 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700/50 transition-all"
                >
                  <Edit className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteMeal(meal)}
                  disabled={busyMealId === meal.id}
                  className="p-2 rounded-xl bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 transition-all disabled:opacity-60"
                  title={`Delete ${meal.name}`}
                  aria-label={`Delete ${meal.name}`}
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalMealPages > 1 && (
        <Pager page={mealPage} pageCount={totalMealPages} onChange={setMealPage} noun="dishes" />
      )}

      {/* Edit Dish Modal */}
      {editingMeal && (
        <ModalShell
          title={`Edit ${editingMeal.name}`}
          icon={<Edit className="w-4 h-4 text-orange-400" aria-hidden="true" />}
          onClose={() => setEditingMeal(null)}
          label="Close the edit dish dialog"
        >
          <form onSubmit={handleSaveEditMeal} className="space-y-4">
            <Field label="Dish name" id="edit-name">
              <input
                id="edit-name"
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-[#1F242D] border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/70"
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Price (RWF)" id="edit-price">
                <input
                  id="edit-price"
                  type="number"
                  min="0"
                  required
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full bg-[#1F242D] border border-slate-700/50 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-amber-500/70"
                />
              </Field>
              <Field label="Category" id="edit-category">
                <select
                  id="edit-category"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full bg-[#1F242D] border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/70"
                >
                  {MEAL_CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Description" id="edit-desc">
              <textarea
                id="edit-desc"
                rows={3}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full bg-[#1F242D] border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/70 resize-none"
              />
            </Field>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingMeal(null)}
                className="px-4 py-2 rounded-xl bg-[#1F242D] hover:bg-slate-700/50 text-slate-300 font-bold text-xs border border-slate-700/50 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingEdit}
                className="px-5 py-2 rounded-xl bg-linear-to-r from-orange-500 to-amber-500 text-white font-bold text-xs transition-all disabled:opacity-60"
              >
                {isSavingEdit ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Add Dish Modal */}
      {showAddMeal && (
        <AddFoodItemModal
          isOpen
          onClose={() => setShowAddMeal(false)}
          onSaved={async () => {
            setShowAddMeal(false);
            await onMealsChange?.();
          }}
        />
      )}

      {/* Confirm Delete Dish Modal */}
      {confirmDeleteMeal && (
        <ConfirmModal
          isOpen={Boolean(confirmDeleteMeal)}
          onClose={() => setConfirmDeleteMeal(null)}
          onConfirm={handleConfirmDelete}
          title={`Remove "${confirmDeleteMeal.name}"?`}
          message={`Are you sure you want to remove "${confirmDeleteMeal.name}" from the menu catalog? Customers will no longer be able to view or order this dish.`}
          confirmText="Remove Dish"
          cancelText="Cancel"
          tone="danger"
          isBusy={busyMealId === confirmDeleteMeal.id}
        />
      )}
    </div>
  );
}
