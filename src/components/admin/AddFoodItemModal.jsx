import React, { useState, useEffect, useRef } from "react";
import { X, Plus, Upload, ImageIcon, Flame, UtensilsCrossed, Tag, CheckCircle2 } from "lucide-react";

const CATEGORIES = [
  { value: "hotpot",  label: "🍲 Hotpot Combos" },
  { value: "broths",  label: "🔥 Spicy Broths" },
  { value: "pizzas",  label: "🍕 Gourmet Pizzas" },
  { value: "noodles", label: "🍜 Noodles & Rice" },
  { value: "sides",   label: "🥟 Sides & Dim Sum" },
  { value: "drinks",  label: "🥤 Refreshments" },
];

export default function AddFoodItemModal({ isOpen, onClose, onSave }) {
  const [name,     setName]     = useState("");
  const [price,    setPrice]    = useState("");
  const [category, setCategory] = useState("hotpot");
  const [desc,     setDesc]     = useState("");
  const [isSpicy,  setIsSpicy]  = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [saving,   setSaving]   = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fileInputRef  = useRef(null);
  const firstInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setName(""); setPrice(""); setCategory("hotpot");
      setDesc(""); setIsSpicy(false); setImagePreview(null);
      setImageUrl(""); setSaving(false); setErrorMsg("");
      setTimeout(() => firstInputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    if (isOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else        document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const applyFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    applyFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !price) return;
    setSaving(true);
    setErrorMsg("");

    // Determine final image: URL input takes priority, then uploaded image preview (data URL), then default
    const finalImage = imageUrl.trim() ||
      imagePreview ||
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80";

    const newFoodItem = {
      name:        name.trim(),
      category,
      price:       parseInt(price),
      image:       finalImage,
      description: desc.trim() || "Delicious dish prepared fresh by our kitchen.",
      spicy:       isSpicy,
      outOfStock:  false,
    };
    try {
      const token   = localStorage.getItem("token");
      if (!token) {
        setErrorMsg("You must be logged in as Admin to add menu items. Please log in first.");
        setSaving(false);
        return;
      }
      const created = await import("../../services/apiService")
        .then(m => m.apiService.createMeal(newFoodItem, token));
      onSave(created);
      onClose();
    } catch (err) {
      const msg = err?.message || 'Unknown error';
      if (msg.includes('401') || msg.includes('403') || msg.includes('Unauthorized') || msg.includes('denied') || msg.includes('token')) {
        setErrorMsg("Access denied. Please log in as Admin (admin@hotpot.rw) and try again.");
      } else {
        setErrorMsg(`Failed to save: ${msg}`);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded-3xl flex flex-col overflow-hidden bg-[#1A1D24] border border-slate-800 shadow-2xl"
        style={{
          maxHeight: "92vh",
          animation: "modalPop 0.25s cubic-bezier(0.34,1.56,0.64,1) both",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient gold glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle,rgba(249,115,22,0.1) 0%,transparent 70%)" }} />

        {/* ─── Header ─── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/25">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight">Add New Food Item</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Publish to the live Kigali menu
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all bg-[#1F242D] border border-slate-700/50 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ─── Scrollable Body ─── */}
        <form id="add-food-form" onSubmit={handleSubmit}
          className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Name + Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest mb-2 text-slate-400">
                Dish Name <span className="text-red-400">*</span>
              </label>
              <input
                ref={firstInputRef}
                type="text" value={name} required
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Spicy Beef Hotpot"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 bg-[#1F242D] border border-slate-700/50 focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/40 transition-all outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest mb-2 text-slate-400">
                Price (RWF) <span className="text-red-400">*</span>
              </label>
              <input
                type="number" value={price} required min="0"
                onChange={(e) => setPrice(e.target.value)}
                placeholder="16000"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder-slate-500 bg-[#1F242D] border border-slate-700/50 focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/40 transition-all outline-none"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest mb-2 text-slate-400">
              <Tag className="w-3 h-3 text-orange-400" /> Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button key={cat.value} type="button" onClick={() => setCategory(cat.value)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left ${
                    category === cat.value
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-sm ring-1 ring-amber-500/30"
                      : "bg-[#1F242D] text-slate-300 hover:text-white border-slate-700/50 hover:border-slate-500"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest mb-2 text-slate-400">
              Description
            </label>
            <textarea
              value={desc} rows={2}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="e.g. Authentic simmering broth packed with fresh meat and aromatic herbs..."
              className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 resize-none bg-[#1F242D] border border-slate-700/50 focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/40 transition-all outline-none"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest mb-2 text-slate-400">
              <ImageIcon className="w-3 h-3 text-orange-400" /> Food Photo
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`cursor-pointer rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 py-6 transition-all ${
                  dragOver
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-slate-700/60 hover:border-slate-500 bg-[#12141A]"
                }`}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-orange-500/20 text-orange-400">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-white">Click or drag & drop</p>
                  <p className="text-[10px] mt-0.5 text-slate-500">PNG, JPG, WEBP</p>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*"
                  onChange={(e) => applyFile(e.target.files[0])} className="hidden" />
              </div>

              {/* Preview */}
              <div className="rounded-2xl overflow-hidden flex items-center justify-center bg-[#12141A] border border-slate-800"
                style={{ minHeight: "120px" }}>
                {imagePreview ? (
                  <div className="relative w-full h-full group">
                    <img src={imagePreview} alt="Preview"
                      className="w-full object-cover"
                      style={{ minHeight: "120px", maxHeight: "150px" }} />
                    <button type="button"
                      onClick={() => setImagePreview(null)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 text-center text-[10px] text-white py-0.5 bg-black/70">
                      ✓ Preview ready
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-slate-600">
                    <ImageIcon className="w-7 h-7 opacity-40" />
                    <span className="text-[10px]">No image</span>
                  </div>
                )}
              </div>
            </div>

            {/* Image URL input (alternative to upload) */}
            <div className="mt-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5 text-slate-400">
                Or paste image URL
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 bg-[#1F242D] border border-slate-700/50 focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/40 transition-all outline-none"
              />
            </div>
          </div>

          {/* Spicy Toggle */}
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl border cursor-pointer select-none transition-all ${
              isSpicy
                ? "bg-red-500/10 border-red-500/40"
                : "bg-[#1F242D] border-slate-700/50"
            }`}
            onClick={() => setIsSpicy(!isSpicy)}
          >
            <div className={`relative w-10 h-5 rounded-full transition-all flex-shrink-0 ${
              isSpicy ? "bg-red-500" : "bg-slate-700"
            }`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                isSpicy ? "left-[22px]" : "left-[2px]"
              }`} />
            </div>
            <Flame className={`w-4 h-4 transition-colors ${isSpicy ? "text-red-400" : "text-slate-500"}`} />
            <span className={`text-sm font-semibold transition-colors ${isSpicy ? "text-red-300" : "text-slate-400"}`}>
              Mark as Spicy Recipe 🌶️
            </span>
          </div>

        </form>

        {/* ─── Footer ─── */}
        {errorMsg && (
          <div className="mx-6 mb-0 px-4 py-2.5 rounded-xl text-xs font-medium bg-red-500/15 border border-red-500/30 text-red-300">
            ⚠️ {errorMsg}
          </div>
        )}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-800 bg-[#12141A]">
          <p className="text-xs text-slate-400">
            Fields marked <span className="text-red-400">*</span> are required
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-700/50 text-slate-300 hover:text-white bg-[#1F242D] hover:bg-slate-700/50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit" form="add-food-form"
              disabled={saving || !name.trim() || !price}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 shadow-md shadow-orange-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
              ) : (
                <><Plus className="w-4 h-4" />Add to Menu</>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalPop {
          from { opacity:0; transform:scale(0.9) translateY(16px); }
          to   { opacity:1; transform:scale(1)   translateY(0);    }
        }
      `}</style>
    </div>
  );
}
