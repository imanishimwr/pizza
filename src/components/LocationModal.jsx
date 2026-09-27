import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, X, ShieldCheck, AlertTriangle as TriangleAlert, Loader2 } from 'lucide-react';
import { session } from '../services/apiService';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

const formatCoords = (lat, lng) => `GPS: ${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;

/**
 * Overlay plumbing: focus enters the dialog and returns to the trigger, Escape
 * closes, Tab stays inside, the page behind cannot scroll. The keydown listener
 * is bound once per open/close cycle and always removed on cleanup.
 */
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
 * Captures the delivery area. `onSave({ address, lat, lng })` is async and
 * REJECTS on failure: this modal only closes when the server actually stored
 * the location, and shows the real error message otherwise.
 */
export default function LocationModal({ isOpen, onClose, user, onSave }) {
  const open = Boolean(isOpen);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [manualAddr, setManualAddr] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const panelRef = useOverlayA11y(open, onClose);
  const geoRequestId = useRef(0);

  const savedLocation = user?.location || '';
  const signedIn = Boolean(user) || session.isAuthenticated();

  // Re-seed the form from the signed-in user every time the modal opens, and
  // never let a stale request from a previous open write into the new one.
  useEffect(() => {
    if (!open) return;
    geoRequestId.current += 1;
    setLoading(false);
    setSaving(false);
    setShowManual(false);
    setErrorMsg('');
    setManualAddr(savedLocation);
  }, [open, savedLocation]);

  const persist = useCallback(
    async (address, lat = null, lng = null) => {
      const value = String(address || '').trim();
      if (!value) {
        setErrorMsg('Please enter a delivery address.');
        return;
      }
      if (typeof onSave !== 'function') {
        setErrorMsg('Saving a location is not available right now.');
        return;
      }
      setSaving(true);
      setErrorMsg('');
      try {
        await onSave({ address: value, lat, lng });
        // Only now is it true: the location really was persisted.
        if (typeof onClose === 'function') onClose();
      } catch (err) {
        setErrorMsg(err?.message || 'Could not save your delivery location.');
      } finally {
        setSaving(false);
      }
    },
    [onSave, onClose]
  );

  const handleDetectLocation = () => {
    if (!signedIn) {
      setErrorMsg('Please sign in before saving a delivery location.');
      return;
    }
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser. Enter your address manually.');
      setShowManual(true);
      return;
    }
    setLoading(true);
    setErrorMsg('');
    geoRequestId.current += 1;
    const requestId = geoRequestId.current;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (requestId !== geoRequestId.current) return;
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLoading(false);
        let label = formatCoords(lat, lng);
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
          if (parts.length > 0) label = `${parts.join(', ')} (${formatCoords(lat, lng)})`;
        } catch {
          // The coordinates are still usable even when the lookup fails.
          setShowManual(true);
          setManualAddr(label);
          setErrorMsg('Could not read a street address for those coordinates. Check it, then save.');
        }
        if (requestId !== geoRequestId.current) return;
        await persist(label, lat, lng);
      },
      () => {
        if (requestId !== geoRequestId.current) return;
        setLoading(false);
        setShowManual(true);
        setErrorMsg('Location access was denied. Enter your delivery address manually.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleManualSubmit = (event) => {
    event.preventDefault();
    if (!signedIn) {
      setErrorMsg('Please sign in before saving a delivery location.');
      return;
    }
    persist(manualAddr);
  };

  if (!open) return null;

  const busy = loading || saving;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-modal-title"
        aria-describedby="location-modal-description"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="bg-surface-dark border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 text-primary flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" aria-hidden="true" focusable="false" />
            </div>
            <div>
              <h2 id="location-modal-title" className="text-lg font-bold text-text-main">
                Enable Location Access
              </h2>
              <p className="text-xs text-text-muted">Live Kigali Order Tracking</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close location settings"
            className="p-2 text-text-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" focusable="false" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto text-primary">
            <Navigation className="w-8 h-8" aria-hidden="true" focusable="false" />
          </div>

          <p id="location-modal-description" className="text-xs text-text-muted leading-relaxed">
            HotPot Delights requires your location to assign the nearest delivery rider in Kigali and
            provide live order tracking.
          </p>

          {savedLocation && (
            <p className="text-[11px] text-text-muted">
              Currently saved: <span className="text-text-main font-semibold">{savedLocation}</span>
            </p>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-2 text-left p-2.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-semibold"
            >
              <TriangleAlert className="w-4 h-4 shrink-0" aria-hidden="true" focusable="false" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!showManual ? (
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={busy || !signedIn}
                className="w-full btn-primary text-xs py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" focusable="false" />
                    Detecting Kigali GPS Location...
                  </span>
                ) : (
                  <>
                    <Navigation className="w-4 h-4" aria-hidden="true" focusable="false" />
                    Allow Current Location Access
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowManual(true)}
                disabled={busy}
                className="w-full btn-secondary text-xs py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enter Delivery Address Manually
              </button>
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-3 pt-2 text-left">
              <div className="space-y-1">
                <label htmlFor="location-address" className="text-xs font-bold text-text-muted block">
                  Specify Kigali Address
                </label>
                <input
                  id="location-address"
                  type="text"
                  autoComplete="street-address"
                  value={manualAddr}
                  onChange={(event) => setManualAddr(event.target.value)}
                  placeholder="e.g. KG 9 Ave, Nyarutarama, Kigali"
                  required
                  className="w-full bg-surface-card border border-white/10 rounded-xl px-4 py-2.5 text-xs text-text-main focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary text-xs flex-1 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Address'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowManual(false);
                    setErrorMsg('');
                  }}
                  disabled={saving}
                  className="btn-secondary text-xs py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Back
                </button>
              </div>
            </form>
          )}

          <p className="flex items-start gap-1.5 text-[10px] text-text-subdued text-left">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" focusable="false" />
            Your address is only used to route your order. It is stored on your account, never in this
            browser.
          </p>
        </div>
      </div>
    </div>
  );
}
