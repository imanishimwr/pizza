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
  const [saving,   setSaving]   = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef  = useRef(null);
  const firstInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setName(""); setPrice(""); setCategory("hotpot");
      setDesc(""); setIsSpicy(false); setImagePreview(null); setSaving(false);
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
    const newFoodItem = {
      name:        name.trim(),
      category,
      price:       parseInt(price),
      image:       imagePreview || "/assets/1122x850_AO.png",
      description: desc.trim() || "Delicious dish prepared fresh by our kitchen.",
      spicy:       isSpicy,
      outOfStock:  false,
    };
    try {
      const token   = localStorage.getItem("token");
      const created = await import("../../services/apiService")
        .then(m => m.apiService.createMeal(newFoodItem, token));
      onSave(created);
    } catch {
      onSave({ ...newFoodItem, id: `hp-${Date.now()}`, rating: 5.0, reviews: 1 });
    } finally {
      setSaving(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded-3xl flex flex-col overflow-hidden"
        style={{
          maxHeight: "92vh",
          background: "linear-gradient(145deg,#1a1625 0%,#16161f 60%,#1c1c24 100%)",
          border: "1px solid rgba(168,85,247,0.25)",
          boxShadow: "0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(168,85,247,0.1)",
          animation: "modalPop 0.25s cubic-bezier(0.34,1.56,0.64,1) both",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient purple glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle,rgba(168,85,247,0.1) 0%,transparent 70%)" }} />

        {/* ─── Header ─── */}
        <div className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow: "0 8px 20px rgba(124,58,237,0.4)" }}>
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight">Add New Food Item</h2>
              <p className="text-xs mt-0.5" style={{ color: "rgba(196,181,253,0.6)" }}>
                Publish to the live Kigali menu
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
            style={{ background: "rgba(255,255,255,0.06)", color: "#9ca3af" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
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
              <label className="block text-[11px] font-bold uppercase tracking-widest mb-2"
                style={{ color: "#9ca3af" }}>
                Dish Name <span style={{ color: "#f87171" }}>*</span>
              </label>
              <input
                ref={firstInputRef}
                type="text" value={name} required
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Spicy Beef Hotpot"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 transition-all outline-none"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.09)",
                }}
                onFocus={e => e.target.style.borderColor = "#7c3aed"}
                onBlur={e  => e.target.style.borderColor = "rgba(255,255,255,0.09)"}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest mb-2"
                style={{ color: "#9ca3af" }}>
                Price (RWF) <span style={{ color: "#f87171" }}>*</span>
              </label>
              <input
                type="number" value={price} required min="0"
                onChange={(e) => setPrice(e.target.value)}
                placeholder="16000"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 transition-all outline-none"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.09)",
                }}
                onFocus={e => e.target.style.borderColor = "#7c3aed"}
                onBlur={e  => e.target.style.borderColor = "rgba(255,255,255,0.09)"}
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest mb-2"
              style={{ color: "#9ca3af" }}>
              <Tag className="w-3 h-3" /> Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button key={cat.value} type="button" onClick={() => setCategory(cat.value)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left"
                  style={{
                    background:  category === cat.value ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.04)",
                    borderColor: category === cat.value ? "#7c3aed" : "rgba(255,255,255,0.08)",
                    color:       category === cat.value ? "#c4b5fd" : "#6b7280",
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest mb-2"
              style={{ color: "#9ca3af" }}>
              Description
            </label>
            <textarea
              value={desc} rows={2}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="e.g. Authentic simmering broth packed with fresh meat and aromatic herbs..."
              className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 resize-none transition-all outline-none"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.09)",
              }}
              onFocus={e => e.target.style.borderColor = "#7c3aed"}
              onBlur={e  => e.target.style.borderColor = "rgba(255,255,255,0.09)"}
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest mb-2"
              style={{ color: "#9ca3af" }}>
              <ImageIcon className="w-3 h-3" /> Food Photo
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className="cursor-pointer rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 py-6 transition-all"
                style={{
                  borderColor: dragOver ? "#7c3aed" : "rgba(255,255,255,0.1)",
                  background:  dragOver ? "rgba(124,58,237,0.08)" : "rgba(255,255,255,0.02)",
                }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(124,58,237,0.15)" }}>
                  <Upload className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-white">Click or drag & drop</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#6b7280" }}>PNG, JPG, WEBP</p>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*"
                  onChange={(e) => applyFile(e.target.files[0])} className="hidden" />
              </div>

              {/* Preview */}
              <div className="rounded-2xl overflow-hidden flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", minHeight: "120px" }}>
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
                    <div className="absolute bottom-0 inset-x-0 text-center text-[10px] text-white py-0.5"
                      style={{ background: "rgba(0,0,0,0.5)" }}>
                      ✓ Preview ready
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1" style={{ color: "#4b5563" }}>
                    <ImageIcon className="w-7 h-7 opacity-40" />
                    <span className="text-[10px]">No image</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Spicy Toggle */}
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl border cursor-pointer select-none transition-all"
            style={{
              background:  isSpicy ? "rgba(239,68,68,0.07)" : "rgba(255,255,255,0.03)",
              borderColor: isSpicy ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.07)",
            }}
            onClick={() => setIsSpicy(!isSpicy)}
          >
            <div className="relative w-10 h-5 rounded-full transition-all flex-shrink-0"
              style={{ background: isSpicy ? "#ef4444" : "rgba(255,255,255,0.12)" }}>
              <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                style={{ left: isSpicy ? "22px" : "2px" }} />
            </div>
            <Flame className={`w-4 h-4 transition-colors ${isSpicy ? "text-red-400" : "text-gray-600"}`} />
            <span className={`text-sm font-semibold transition-colors ${isSpicy ? "text-red-300" : "text-gray-500"}`}>
              Mark as Spicy Recipe 🌶️
            </span>
          </div>

        </form>

        {/* ─── Footer ─── */}
        <div className="flex items-center justify-between gap-3 px-6 py-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.25)" }}>
          <p className="text-xs" style={{ color: "#6b7280" }}>
            Fields marked <span style={{ color: "#f87171" }}>*</span> are required
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all"
              style={{ borderColor: "rgba(255,255,255,0.1)", color: "#9ca3af", background: "transparent" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              Cancel
            </button>
            <button
              type="submit" form="add-food-form"
              disabled={saving || !name.trim() || !price}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
                boxShadow: saving ? "none" : "0 6px 20px rgba(124,58,237,0.45)",
              }}
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
