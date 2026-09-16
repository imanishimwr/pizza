import React, { useState } from 'react';
import { X, User, Phone, MapPin, Mail, Lock, ShieldCheck, Check } from 'lucide-react';

export default function ProfileModal({ isOpen, onClose, user, onSaveUser }) {
  if (!isOpen || !user) return null;

  const [name, setName] = useState(user.name || 'Aline Uwase');
  const [phone, setPhone] = useState(user.phone || '0788000001');
  const [address, setAddress] = useState('KG 9 Ave, Nyarutarama, Kigali');
  const [email, setEmail] = useState(user.email || 'aline@example.com');
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const updated = { ...user, name, phone, email, address };
    onSaveUser(updated);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-surface-dark border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 text-primary flex items-center justify-center font-bold text-base">
              {name ? name[0] : 'U'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-main">Account Profile Settings</h2>
              <p className="text-xs text-text-muted">Manage your personal details</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-text-muted hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {saved && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4" />
            Profile updated successfully!
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-muted block">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-surface-card border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-xs text-text-main focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-text-muted block">Rwanda Contact Phone</label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full bg-surface-card border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-xs text-text-main focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-text-muted block">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-surface-card border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-xs text-text-main focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-text-muted block">Default Kigali Delivery Address</label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                className="w-full bg-surface-card border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-xs text-text-main focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <button type="submit" className="w-full btn-primary text-xs py-3">
            Save Profile Changes
          </button>
        </form>

      </div>
    </div>
  );
}
