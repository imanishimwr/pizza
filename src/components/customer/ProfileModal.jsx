import React, { useEffect, useRef, useState } from 'react';
import { X, User, Phone, MapPin, Mail, Check, ShieldCheck, LogOut, Loader2, AlertTriangle as TriangleAlert } from 'lucide-react';
import { updateProfile } from '../../services/apiService';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

const formatCoords = (lat, lng) => `GPS: ${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;

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
 * Account settings. Every change goes through `updateProfile(...)`, which is
 * persisted server-side and returns the authoritative user; only then is
 * `onSaved(updatedUser)` called. The previous version wrote a fabricated user
 * object to localStorage and pretended the card/address book was stored.
 */
export default function ProfileModal({ isOpen, onClose, user, onSaved, onLogout }) {
  // Hooks first, always. The "closed" early return comes after them.
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [isScanningGps, setIsScanningGps] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const open = Boolean(isOpen) && Boolean(user);
  const panelRef = useOverlayA11y(open, onClose);
  const geoRequestId = useRef(0);

  // Re-seed from the signed-in user each time the modal opens.
  useEffect(() => {
    if (!open) return;
    geoRequestId.current += 1;
    setName(user.name || '');
    setPhone(user.phone || '');
    setEmail(user.email || '');
    setAddress(user.location || '');
    setCoords({ lat: Number(user.lat) || null, lng: Number(user.lng) || null });
    setIsScanningGps(false);
    setGpsError('');
    setErrorMsg('');
    setSaving(false);
  }, [open, user]);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser. Enter the address manually.');
      return;
    }
    setIsScanningGps(true);
    setGpsError('');
    geoRequestId.current += 1;
    const requestId = geoRequestId.current;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (requestId !== geoRequestId.current) return;
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        setIsScanningGps(false);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          if (!res.ok) throw new Error(`Reverse geocoding failed (${res.status}).`);
          const data = await res.json();
          if (requestId !== geoRequestId.current) return;
          const road = data.address?.road || data.address?.suburb || data.address?.neighbourhood;
          const city =
            data.address?.city || data.address?.town || data.address?.village || data.address?.county;
          const country = data.address?.country;
          const parts = [road, city, country].filter(Boolean);
          setAddress(
            parts.length > 0
              ? `${parts.join(', ')} (${formatCoords(lat, lng)})`
              : formatCoords(lat, lng)
          );
        } catch {
          if (requestId !== geoRequestId.current) return;
          setAddress(formatCoords(lat, lng));
          setGpsError('Could not read a street address for those coordinates. Check it before saving.');
        }
      },
      () => {
        if (requestId !== geoRequestId.current) return;
        setIsScanningGps(false);
        setGpsError('Location access was denied. Enter the address manually.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrorMsg('');
    try {
      const updated = await updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        location: address.trim(),
        lat: coords.lat,
        lng: coords.lng
      });
      if (typeof onSaved === 'function') onSaved(updated);
      if (typeof onClose === 'function') onClose();
    } catch (err) {
      // The server message is user-safe; show exactly what it said.
      setErrorMsg(err?.message || 'Could not save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="bg-surface-dark border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div
              aria-hidden="true"
              className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 text-primary flex items-center justify-center font-bold text-base shrink-0"
            >
              {name ? name[0].toUpperCase() : 'U'}
            </div>
            <div>
              <h2 id="profile-modal-title" className="text-lg font-bold text-text-main">
                Account &amp; Delivery Settings
              </h2>
              <p className="text-xs text-text-muted">Manage your personal details and delivery area</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account settings"
            className="p-2 text-text-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" focusable="false" />
          </button>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-red-300 text-xs font-semibold flex items-start gap-2"
          >
            <TriangleAlert className="w-4 h-4 shrink-0" aria-hidden="true" focusable="false" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="profile-name" className="text-xs font-bold text-text-muted block">
                Full Name
              </label>
              <div className="relative">
                <User
                  className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                  aria-hidden="true"
                  focusable="false"
                />
                <input
                  id="profile-name"
                  type="text"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-surface-card border border-white/10 rounded-xl pl-10 pr-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="profile-phone" className="text-xs font-bold text-text-muted block">
                Phone
              </label>
              <div className="relative">
                <Phone
                  className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                  aria-hidden="true"
                  focusable="false"
                />
                <input
                  id="profile-phone"
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full bg-surface-card border border-white/10 rounded-xl pl-10 pr-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="profile-email" className="text-xs font-bold text-text-muted block">
              Email Address
            </label>
            <div className="relative">
              <Mail
                className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                aria-hidden="true"
                focusable="false"
              />
              <input
                id="profile-email"
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                readOnly
                aria-describedby="profile-email-hint"
                className="w-full bg-surface-card/60 border border-white/10 rounded-xl pl-10 pr-3 py-2 text-xs text-text-muted cursor-not-allowed focus:outline-none"
              />
            </div>
            <p id="profile-email-hint" className="text-[10px] text-text-subdued">
              Your email identifies your account and cannot be changed here.
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="profile-address" className="text-xs font-bold text-text-muted block">
                Primary Delivery Address
              </label>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={isScanningGps || saving}
                className="text-[10px] text-primary font-bold hover:underline flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isScanningGps ? (
                  <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" focusable="false" />
                ) : (
                  <MapPin className="w-3 h-3" aria-hidden="true" focusable="false" />
                )}
                {isScanningGps ? 'Scanning...' : 'Detect Location'}
              </button>
            </div>
            <div className="relative">
              <MapPin
                className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                aria-hidden="true"
                focusable="false"
              />
              <input
                id="profile-address"
                type="text"
                name="address"
                autoComplete="street-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. KG 9 Ave, Nyarutarama, Kigali"
                className="w-full bg-surface-card border border-white/10 rounded-xl pl-10 pr-3 py-2 text-xs text-text-main placeholder-text-subdued focus:outline-none focus:border-primary"
              />
            </div>
            {gpsError && (
              <p role="alert" className="text-[10px] text-red-400 mt-1">
                {gpsError}
              </p>
            )}
            <p className="text-[10px] text-text-subdued">
              This is the address our riders use to deliver your orders.
            </p>
          </div>

          <p className="flex items-start gap-1.5 text-[10px] text-text-subdued">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" focusable="false" />
            Payment is taken at checkout from the phone number on your order. We never ask for or
            store card numbers.
          </p>

          <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
            <button
              type="submit"
              disabled={saving}
              className="w-full btn-primary text-xs py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" focusable="false" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" aria-hidden="true" focusable="false" />
                  Save Profile Changes
                </>
              )}
            </button>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="btn-secondary text-xs py-2.5 w-full flex items-center justify-center gap-2 text-red-300 hover:text-red-200"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" focusable="false" />
                Log out
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
