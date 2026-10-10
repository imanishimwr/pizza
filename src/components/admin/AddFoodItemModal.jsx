import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Plus,
  Upload,
  ImageIcon,
  Flame,
  UtensilsCrossed,
  Tag,
  Loader2,
  AlertTriangle as TriangleAlert,
  Pencil,
  Trash2
} from 'lucide-react';
import { createMeal, updateMeal, deleteMeal } from '../../services/apiService';

const CATEGORIES = [
  { value: 'hotpot', label: '🍲 Hotpot Combos' },
  { value: 'broths', label: '🔥 Spicy Broths' },
  { value: 'pizzas', label: '🍕 Gourmet Pizzas' },
  { value: 'noodles', label: '🍜 Noodles & Rice' },
  { value: 'sides', label: '🥟 Sides & Dim Sum' },
  { value: 'drinks', label: '🥤 Refreshments' }
];

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80';
const DEFAULT_DESCRIPTION = 'Delicious dish prepared fresh by our kitchen.';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

/**
 * Create / edit a menu item.
 *
 * Writes go through the real API (`createMeal`, `updateMeal`, `deleteMeal`); a
 * failure surfaces the server message and leaves the modal open. `onSave` is
 * the callback the admin dashboard already passes and is still called with the
 * meal the server returned.
 */
export default function AddFoodItemModal({
  isOpen,
  onClose,
  onSave,
  onSaved,
  onDeleted,
  meal = null,
  onError
}) {
  const isEditing = Boolean(meal?.id);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('hotpot');
  const [desc, setDesc] = useState('');
  const [isSpicy, setIsSpicy] = useState(false);
  const [imageData, setImageData] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef(null);
  const firstInputRef = useRef(null);
  const panelRef = useRef(null);
  const focusTimer = useRef(null);
  const objectUrlRef = useRef(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  });

  // Release the blob URL whenever the component goes away, so a preview never
  // keeps the picked file in memory.
  useEffect(
    () => () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    },
    []
  );

  // Reset the form for each open, seeding it from `meal` when editing.
  useEffect(() => {
    if (!isOpen) return undefined;
    setName(meal?.name || '');
    setPrice(meal?.price != null ? String(meal.price) : '');
    setCategory(meal?.category || 'hotpot');
    setDesc(meal?.description || '');
    setIsSpicy(Boolean(meal?.spicy));
    setImageData('');
    setImageUrl('');
    setPreviewUrl(meal?.image || meal?.fallbackImage || '');
    setSaving(false);
    setDragOver(false);
    setErrorMsg('');
    focusTimer.current = setTimeout(() => {
      focusTimer.current = null;
      if (firstInputRef.current) firstInputRef.current.focus();
    }, 80);
    return () => {
      if (focusTimer.current) {
        clearTimeout(focusTimer.current);
        focusTimer.current = null;
      }
    };
  }, [isOpen, meal]);

  // Escape closes, Tab is trapped, focus returns to the trigger, page behind
  // cannot scroll. One listener per open/close cycle, always removed.
  useEffect(() => {
    if (!isOpen) return undefined;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

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
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (trigger && document.contains(trigger)) trigger.focus();
    };
  }, [isOpen]);

  const releasePreview = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const applyFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please choose an image file (PNG, JPG or WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = typeof event.target?.result === 'string' ? event.target.result : '';
      if (dataUrl) setImageData(dataUrl);
      // Instant preview from the blob; the payload always carries the data URL.
      releasePreview();
      const objectUrl = URL.createObjectURL(file);
      objectUrlRef.current = objectUrl;
      setPreviewUrl(objectUrl);
    };
    reader.onerror = () => setErrorMsg('That image could not be read. Please try another file.');
    reader.readAsDataURL(file);
  };

  const clearPreview = () => {
    releasePreview();
    setPreviewUrl('');
    setImageData('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    applyFile(event.dataTransfer?.files?.[0]);
  };

  const notifyError = (message) => {
    setErrorMsg(message);
    if (typeof onError === 'function') onError(message);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    const trimmedName = name.trim();
    const amount = Number(price);
    if (!trimmedName) {
      setErrorMsg('Please enter a dish name.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMsg('Please enter a price greater than zero.');
      return;
    }

    const payload = {
      name: trimmedName,
      category,
      price: amount,
      rating: Number(meal?.rating) || 0,
      reviews: Number(meal?.reviews) || 0,
      description: desc.trim() || DEFAULT_DESCRIPTION,
      image: imageUrl.trim() || imageData || meal?.image || DEFAULT_IMAGE,
      fallbackImage: meal?.fallbackImage || DEFAULT_IMAGE,
      spicy: isSpicy,
      outOfStock: Boolean(meal?.outOfStock),
      spiceLevels: Array.isArray(meal?.spiceLevels) ? meal.spiceLevels : [],
      broths: Array.isArray(meal?.broths) ? meal.broths : []
    };

    setSaving(true);
    setErrorMsg('');
    try {
      const saved = isEditing ? await updateMeal(meal.id, payload) : await createMeal(payload);
      if (typeof onSaved === 'function') onSaved(saved);
      // The dashboard's existing contract.
      if (typeof onSave === 'function') onSave(saved);
      if (typeof onClose === 'function') onClose();
    } catch (err) {
      notifyError(err?.message || 'Could not save this menu item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (saving || !isEditing) return;
    setSaving(true);
    setErrorMsg('');
    try {
      await deleteMeal(meal.id);
      if (typeof onDeleted === 'function') onDeleted(meal.id);
      if (typeof onClose === 'function') onClose();
    } catch (err) {
      notifyError(err?.message || 'Could not delete this menu item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="food-item-modal-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl rounded-3xl flex flex-col overflow-hidden bg-[#1A1D24] border border-slate-800 shadow-2xl transition-transform duration-200"
        style={{ maxHeight: '92vh' }}
      >
        {/* Ambient gold glow */}
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(249,115,22,0.1) 0%,transparent 70%)' }}
        />

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-6 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-linear-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/25">
              <UtensilsCrossed className="w-5 h-5 text-white" aria-hidden="true" focusable="false" />
            </div>
            <div>
              <h2 id="food-item-modal-title" className="text-base font-extrabold text-white tracking-tight">
                {isEditing ? 'Edit Food Item' : 'Add New Food Item'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEditing ? 'Update this dish on the live Kigali menu' : 'Publish to the live Kigali menu'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close food item form"
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all bg-[#1F242D] border border-slate-700/50 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" aria-hidden="true" focusable="false" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form id="add-food-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="food-name" className="block text-[11px] font-bold uppercase tracking-widest mb-2 text-slate-400">
                Dish Name <span className="text-red-400">*</span>
              </label>
              <input
                id="food-name"
                ref={firstInputRef}
                type="text"
                name="name"
                autoComplete="off"
                value={name}
                required
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Spicy Beef Hotpot"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 bg-[#1F242D] border border-slate-700/50 focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/40 transition-all outline-none"
              />
            </div>
            <div>
              <label htmlFor="food-price" className="block text-[11px] font-bold uppercase tracking-widest mb-2 text-slate-400">
                Price (RWF) <span className="text-red-400">*</span>
              </label>
              <input
                id="food-price"
                type="number"
                name="price"
                inputMode="numeric"
                min="0"
                step="1"
                value={price}
                required
                onChange={(e) => setPrice(e.target.value)}
                placeholder="16000"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder-slate-500 bg-[#1F242D] border border-slate-700/50 focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/40 transition-all outline-none"
              />
            </div>
          </div>

          <fieldset>
            <legend className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest mb-2 text-slate-400">
              <Tag className="w-3 h-3 text-orange-400" aria-hidden="true" focusable="false" /> Category
            </legend>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  aria-pressed={category === cat.value}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left ${
                    category === cat.value
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-sm ring-1 ring-amber-500/30'
                      : 'bg-[#1F242D] text-slate-300 hover:text-white border-slate-700/50 hover:border-slate-500'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="food-description" className="block text-[11px] font-bold uppercase tracking-widest mb-2 text-slate-400">
              Description
            </label>
            <textarea
              id="food-description"
              name="description"
              value={desc}
              rows={2}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="e.g. Authentic simmering broth packed with fresh meat and aromatic herbs..."
              className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 resize-none bg-[#1F242D] border border-slate-700/50 focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/40 transition-all outline-none"
            />
          </div>

          <div>
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest mb-2 text-slate-400">
              <ImageIcon className="w-3 h-3 text-orange-400" aria-hidden="true" focusable="false" /> Food Photo
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Drop Zone */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    if (fileInputRef.current) fileInputRef.current.click();
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                aria-label="Upload a food photo, or drop a file here"
                className={`cursor-pointer rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 py-6 transition-all ${
                  dragOver
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-slate-700/60 hover:border-slate-500 bg-[#12141A]'
                }`}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-orange-500/20 text-orange-400">
                  <Upload className="w-4 h-4" aria-hidden="true" focusable="false" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-white">Click or drag &amp; drop</p>
                  <p className="text-[10px] mt-0.5 text-slate-500">PNG, JPG, WEBP</p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                aria-label="Food photo file"
                onChange={(e) => {
                  applyFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
                className="sr-only"
              />

              {/* Preview */}
              <div
                className="rounded-2xl overflow-hidden flex items-center justify-center bg-[#12141A] border border-slate-800"
                style={{ minHeight: '120px' }}
              >
                {previewUrl ? (
                  <div className="relative w-full h-full group">
                    <img
                      src={previewUrl}
                      alt={`Preview of ${name || 'this dish'}`}
                      className="w-full object-cover"
                      style={{ minHeight: '120px', maxHeight: '150px' }}
                    />
                    <button
                      type="button"
                      onClick={clearPreview}
                      aria-label="Remove the selected photo"
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center"
                    >
                      <X className="w-3 h-3" aria-hidden="true" focusable="false" />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 text-center text-[10px] text-white py-0.5 bg-black/70">
                      Preview ready
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-slate-600">
                    <ImageIcon className="w-7 h-7 opacity-40" aria-hidden="true" focusable="false" />
                    <span className="text-[10px]">No image</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-2">
              <label htmlFor="food-image-url" className="block text-[10px] font-bold uppercase tracking-widest mb-1.5 text-slate-400">
                Or paste image URL
              </label>
              <input
                id="food-image-url"
                type="url"
                name="imageUrl"
                autoComplete="off"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 bg-[#1F242D] border border-slate-700/50 focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/40 transition-all outline-none"
              />
            </div>
          </div>

          {/* Spicy Toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={isSpicy}
            onClick={() => setIsSpicy((prev) => !prev)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border select-none transition-all text-left ${
              isSpicy ? 'bg-red-500/10 border-red-500/40' : 'bg-[#1F242D] border-slate-700/50'
            }`}
          >
            <span
              aria-hidden="true"
              className={`relative w-10 h-5 rounded-full transition-all shrink-0 ${
                isSpicy ? 'bg-red-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                  isSpicy ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </span>
            <Flame
              className={`w-4 h-4 transition-colors ${isSpicy ? 'text-red-400' : 'text-slate-500'}`}
              aria-hidden="true"
              focusable="false"
            />
            <span className={`text-sm font-semibold transition-colors ${isSpicy ? 'text-red-300' : 'text-slate-400'}`}>
              Mark as Spicy Recipe
            </span>
          </button>
        </form>

        {/* Footer */}
        {errorMsg && (
          <div
            role="alert"
            className="mx-6 px-4 py-2.5 rounded-xl text-xs font-medium bg-red-500/15 border border-red-500/30 text-red-300 flex items-start gap-2"
          >
            <TriangleAlert className="w-4 h-4 shrink-0" aria-hidden="true" focusable="false" />
            <span>{errorMsg}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-800 bg-[#12141A]">
          <p className="text-xs text-slate-400">
            Fields marked <span className="text-red-400">*</span> are required
          </p>
          <div className="flex items-center gap-2">
            {isEditing && onDeleted && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-red-500/40 text-red-300 hover:bg-red-500/20 flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" focusable="false" />
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-700/50 text-slate-300 hover:text-white bg-[#1F242D] hover:bg-slate-700/50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="add-food-form"
              disabled={saving || !name.trim() || !price}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2 bg-linear-to-r from-orange-500 to-amber-500 shadow-md shadow-orange-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" focusable="false" />
                  {isEditing ? 'Saving…' : 'Adding…'}
                </>
              ) : (
                <>
                  {isEditing ? <Pencil className="w-4 h-4" aria-hidden="true" focusable="false" /> : <Plus className="w-4 h-4" aria-hidden="true" focusable="false" />}
                  {isEditing ? 'Save Changes' : 'Add to Menu'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
