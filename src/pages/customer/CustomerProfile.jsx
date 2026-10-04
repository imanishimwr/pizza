import React, { useState, useEffect, useMemo } from 'react';
import { Settings, User, MapPin, Plus, Trash2, Smartphone, CreditCard, DollarSign } from 'lucide-react';

const ADDRESSES_KEY = 'hotpot_saved_addresses';
const PAYMENT_KEY = 'hotpot_preferred_payment';

const readLocalJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) ?? fallback : fallback;
  } catch {
    return fallback;
  }
};

const writeLocalJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

const readLocal = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw;
  } catch {
    return fallback;
  }
};

const writeLocal = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {}
};

export default function CustomerProfile({ user, onUpdateUser }) {
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [preferredPayment, setPreferredPayment] = useState(() => readLocal(PAYMENT_KEY, 'momo'));
  const profileEmail = user?.email || '';

  const [savedAddresses, setSavedAddresses] = useState(() => readLocalJSON(ADDRESSES_KEY, []));
  const [newAddrLabel, setNewAddrLabel] = useState('Home');
  const [newAddrText, setNewAddrText] = useState('');
  const [isAddingAddr, setIsAddingAddr] = useState(false);
  const [smsAlerts, setSmsAlerts] = useState(true);

  useEffect(() => {
    if (!user) return;
    setProfileName(user.name || '');
    setProfilePhone(user.phone || '');
  }, [user]);

  const persistAddresses = (next) => {
    setSavedAddresses(next);
    writeLocalJSON(ADDRESSES_KEY, next);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (onUpdateUser) {
      try {
        const { updateProfile } = await import('../../services/apiService');
        await updateProfile({ name: profileName, phone: profilePhone });
        onUpdateUser({ ...user, name: profileName, phone: profilePhone });
      } catch (err) {
        console.error(err);
      }
    }
  };

  useEffect(() => {
    writeLocal(PAYMENT_KEY, preferredPayment);
  }, [preferredPayment]);

  const handleAddAddress = (e) => {
    e.preventDefault();
    if (!newAddrText.trim()) return;
    const isFirst = savedAddresses.length === 0;
    const next = [
      ...savedAddresses,
      {
        id: Date.now().toString(),
        label: newAddrLabel || 'Address',
        address: newAddrText,
        isDefault: isFirst
      }
    ];
    persistAddresses(next);
    setNewAddrText('');
    setIsAddingAddr(false);
  };

  const removeAddress = (id) => {
    const next = savedAddresses.filter((a) => a.id !== id);
    if (next.length > 0 && !next.some((a) => a.isDefault)) {
      next[0].isDefault = true;
    }
    persistAddresses(next);
  };

  const setDefaultAddress = (id) => {
    const next = savedAddresses.map((a) => ({ ...a, isDefault: a.id === id }));
    persistAddresses(next);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-orange-400" />
          Profile &amp; Address Book
        </h2>
        <p className="text-xs text-slate-400">
          Manage your client profile, saved Kigali delivery addresses, and payment preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Edit Form */}
        <div className="lg:col-span-2 bg-[#1A1D24] border border-slate-800 rounded-2xl p-5 sm:p-7 space-y-6 shadow-xl">
          <h3 className="font-bold text-white text-sm flex items-center gap-2 pb-3 border-b border-slate-800">
            <User className="w-4 h-4 text-orange-400" /> Personal Account Details
          </h3>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Full Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full bg-[#14171F] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 min-h-11"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Phone Number</label>
                <input
                  type="tel"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="w-full bg-[#14171F] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 min-h-11"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Email Address</label>
                <input
                  type="email"
                  value={profileEmail}
                  disabled
                  className="w-full bg-[#0F1117] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-400 min-h-11 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Preferred Default Payment Method</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'momo', label: 'MTN MoMo', icon: Smartphone, color: 'text-amber-400' },
                  { id: 'airtel', label: 'Airtel Money', icon: Smartphone, color: 'text-red-400' },
                  { id: 'card', label: 'Visa / MC', icon: CreditCard, color: 'text-blue-400' },
                  { id: 'cash', label: 'Cash on Delivery', icon: DollarSign, color: 'text-emerald-400' }
                ].map((p) => {
                  const Icon = p.icon;
                  const isSelected = preferredPayment === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPreferredPayment(p.id)}
                      className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2 min-h-11 ${
                        isSelected ? 'bg-orange-500/20 border-orange-500 text-white font-bold' : 'bg-[#14171F] border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${p.color} shrink-0`} />
                      <span className="text-xs truncate">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${smsAlerts ? 'bg-orange-500' : 'bg-slate-700'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${smsAlerts ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
                <input type="checkbox" className="sr-only" checked={smsAlerts} onChange={(e) => setSmsAlerts(e.target.checked)} />
                <span className="text-xs font-bold text-slate-300">Receive SMS Delivery Alerts</span>
              </label>
              <button type="submit" className="min-h-11 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs">
                Save Changes
              </button>
            </div>
          </form>
        </div>

        {/* Address Book */}
        <div className="space-y-4">
          <div className="bg-[#1A1D24] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-2 pb-3 border-b border-slate-800">
              <MapPin className="w-4 h-4 text-orange-400" /> Saved Addresses
            </h3>

            {savedAddresses.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No saved addresses. Add one below.</p>
            ) : (
              <div className="space-y-3">
                {savedAddresses.map((addr) => (
                  <div key={addr.id} className="p-3.5 rounded-xl bg-[#14171F] border border-slate-800 group relative">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 pr-8">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{addr.label}</span>
                          {addr.isDefault && (
                            <span className="text-[9px] bg-orange-500/20 text-orange-400 px-1 rounded font-mono">DEFAULT</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{addr.address}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800/50">
                      {!addr.isDefault && (
                        <button type="button" onClick={() => setDefaultAddress(addr.id)} className="text-[10px] text-emerald-400 font-bold hover:underline">
                          Set Default
                        </button>
                      )}
                      <button type="button" onClick={() => removeAddress(addr.id)} className="text-[10px] text-red-400 font-bold hover:underline ml-auto flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isAddingAddr ? (
              <button type="button" onClick={() => setIsAddingAddr(true)} className="w-full min-h-11 flex items-center justify-center gap-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold text-xs transition-all">
                <Plus className="w-4 h-4" /> Add New Address
              </button>
            ) : (
              <form onSubmit={handleAddAddress} className="space-y-3 p-3.5 rounded-xl bg-[#14171F] border border-slate-700 mt-4">
                <input type="text" value={newAddrLabel} onChange={(e) => setNewAddrLabel(e.target.value)} placeholder="Label (e.g. Home, Office)" className="w-full bg-[#0F1117] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white" />
                <textarea value={newAddrText} onChange={(e) => setNewAddrText(e.target.value)} placeholder="Full delivery instructions & landmarks..." rows={3} className="w-full bg-[#0F1117] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white resize-none" />
                <div className="flex items-center gap-2">
                  <button type="submit" disabled={!newAddrText.trim()} className="flex-1 min-h-9 py-2 rounded-lg bg-orange-500 text-white font-bold text-xs disabled:opacity-50">Save</button>
                  <button type="button" onClick={() => setIsAddingAddr(false)} className="flex-1 min-h-9 py-2 rounded-lg bg-[#1A1D24] border border-slate-700 text-slate-300 font-bold text-xs">Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
