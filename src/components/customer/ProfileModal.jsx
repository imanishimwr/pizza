import React, { useState, useEffect } from 'react';
import { X, User, Phone, MapPin, Mail, CreditCard, Plus, Trash2, Check, ShieldCheck } from 'lucide-react';

export default function ProfileModal({ isOpen, onClose, user, onSaveUser }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);

  // Saved Addresses Manager State
  const [addresses, setAddresses] = useState([
    { id: 1, label: 'Home', text: 'KG 9 Ave, Nyarutarama, Kigali' },
    { id: 2, label: 'Work', text: 'KG 7 Ave, Heights Building, Kimihurura' }
  ]);
  const [newAddrLabel, setNewAddrLabel] = useState('');
  const [newAddrText, setNewAddrText] = useState('');
  const [showAddAddr, setShowAddAddr] = useState(false);

  // Saved Payment Methods Manager State
  const [payments, setPayments] = useState([
    { id: 1, type: 'momo', name: 'MTN Mobile Money', number: '0788123456' },
    { id: 2, type: 'card', name: 'Visa Ending in 4242', number: '**** **** **** 4242' }
  ]);
  const [newPayName, setNewPayName] = useState('');
  const [newPayNumber, setNewPayNumber] = useState('');
  const [showAddPay, setShowAddPay] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setAddress(user.address || user.location || 'KG 9 Ave, Nyarutarama, Kigali');
      setEmail(user.email || '');
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleAddAddress = (e) => {
    e.preventDefault();
    if (!newAddrText) return;
    setAddresses([...addresses, { id: Date.now(), label: newAddrLabel || 'Other', text: newAddrText }]);
    setNewAddrLabel('');
    setNewAddrText('');
    setShowAddAddr(false);
  };

  const handleDeleteAddress = (id) => {
    setAddresses(addresses.filter((a) => a.id !== id));
  };

  const handleAddPayment = (e) => {
    e.preventDefault();
    if (!newPayNumber) return;
    setPayments([...payments, { id: Date.now(), type: 'momo', name: newPayName || 'Mobile Money', number: newPayNumber }]);
    setNewPayName('');
    setNewPayNumber('');
    setShowAddPay(false);
  };

  const handleDeletePayment = (id) => {
    setPayments(payments.filter((p) => p.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const updated = { ...user, name, phone, email, address, savedAddresses: addresses, savedPayments: payments };
    onSaveUser(updated);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-surface-dark border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto scrollbar-thin">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 text-primary flex items-center justify-center font-bold text-base">
              {name ? name[0] : 'U'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-main">Account & Delivery Settings</h2>
              <p className="text-xs text-text-muted">Manage personal details, addresses & payments</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-text-muted hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {saved && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4" />
            Profile and delivery details saved!
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-muted block">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-surface-card border border-white/10 rounded-xl pl-10 pr-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-text-muted block">Phone</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full bg-surface-card border border-white/10 rounded-xl pl-10 pr-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
                />
              </div>
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
                className="w-full bg-surface-card border border-white/10 rounded-xl pl-10 pr-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Saved Addresses Manager */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Saved Delivery Addresses
              </label>
              <button
                type="button"
                onClick={() => setShowAddAddr(!showAddAddr)}
                className="text-[11px] text-primary font-bold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Address
              </button>
            </div>

            <div className="space-y-2">
              {addresses.map((a) => (
                <div key={a.id} className="flex items-center justify-between bg-black/40 p-2.5 rounded-xl border border-white/5 text-xs">
                  <div>
                    <span className="font-bold text-white bg-primary/20 px-2 py-0.5 rounded text-[10px] mr-2">{a.label}</span>
                    <span className="text-text-muted">{a.text}</span>
                  </div>
                  <button type="button" onClick={() => handleDeleteAddress(a.id)} className="text-red-400 hover:text-red-300 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {showAddAddr && (
              <div className="bg-surface-card p-3 rounded-xl border border-white/10 space-y-2">
                <input
                  type="text"
                  placeholder="Address Tag (Home, Work, Gym)"
                  value={newAddrLabel}
                  onChange={(e) => setNewAddrLabel(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="Full Delivery Address & House #"
                  value={newAddrText}
                  onChange={(e) => setNewAddrText(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white"
                />
                <button type="button" onClick={handleAddAddress} className="btn-primary text-xs py-1.5 w-full">
                  Save Address
                </button>
              </div>
            )}
          </div>

          {/* Saved Payment Methods Manager */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                Saved Payment Methods
              </label>
              <button
                type="button"
                onClick={() => setShowAddPay(!showAddPay)}
                className="text-[11px] text-primary font-bold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Method
              </button>
            </div>

            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-black/40 p-2.5 rounded-xl border border-white/5 text-xs">
                  <div>
                    <span className="font-bold text-white">{p.name}</span>
                    <span className="text-text-muted ml-2 font-mono">({p.number})</span>
                  </div>
                  <button type="button" onClick={() => handleDeletePayment(p.id)} className="text-red-400 hover:text-red-300 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {showAddPay && (
              <div className="bg-surface-card p-3 rounded-xl border border-white/10 space-y-2">
                <input
                  type="text"
                  placeholder="Method Label (MTN MoMo, Visa)"
                  value={newPayName}
                  onChange={(e) => setNewPayName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="Phone Number / Card Last 4 Digits"
                  value={newPayNumber}
                  onChange={(e) => setNewPayNumber(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white"
                />
                <button type="button" onClick={handleAddPayment} className="btn-primary text-xs py-1.5 w-full">
                  Save Payment Method
                </button>
              </div>
            )}
          </div>

          <button type="submit" className="w-full btn-primary text-xs py-3 mt-4">
            Save All Profile Changes
          </button>
        </form>

      </div>
    </div>
  );
}
