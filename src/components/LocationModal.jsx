import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, X, Check, ShieldCheck, AlertTriangle, Globe } from 'lucide-react';
import { getDeviceLocation, getGeolocationStatus } from '../services/gpsService';

export default function LocationModal({ isOpen, onClose, onSetLocation }) {
  const [loading, setLoading] = useState(false);
  const [manualAddr, setManualAddr] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resolved, setResolved] = useState(null); // { location, lat, lng } after a successful scan
  const [perm, setPerm] = useState(null); // { supported, secure, permission } from the browser

  useEffect(() => {
    let active = true;
    if (isOpen) {
      setPerm(null);
      getGeolocationStatus().then((s) => { if (active) setPerm(s); });
    }
    return () => { active = false; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDetectLocation = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { lat, lng, address, accuracy } = await getDeviceLocation();
      const locString = address
        ? `${address} (GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)})`
        : `GPS Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;

      const result = { location: locString, lat, lng, accuracy: Math.round(accuracy || 0) };
      setResolved(result);
      onSetLocation(result);
    } catch (err) {
      // Require device location: show clear instructions to enable it, do not silently skip
      setErrorMsg(err.message || 'Could not detect your location. Please turn on device Location and try again.');
      setShowManual(false);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualAddr) return;
    onSetLocation({ location: manualAddr, lat: null, lng: null });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-surface-dark border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 text-primary flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-main">Enable Location Access</h2>
              <p className="text-xs text-text-muted">Live Order Tracking</p>
            </div>
          </div>
          {!resolved && (
            <button onClick={onClose} className="p-2 text-text-muted hover:text-white">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="space-y-4 text-center">
          {!resolved ? (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto text-primary animate-pulse">
                <Navigation className="w-8 h-8" />
              </div>

              <p className="text-xs text-text-muted leading-relaxed">
                HotPot Delights needs your device location to detect your exact delivery address. Tap the button below, allow location access for this site, and make sure device Location is ON.
              </p>

              {perm && !perm.supported && (
                <div className="flex items-start gap-2 text-left p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-[11px] font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Your browser does not support location services. Try Chrome, Edge, or Firefox.</span>
                </div>
              )}

              {perm && !perm.secure && (
                <div className="flex items-start gap-2 text-left p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 text-[11px] font-semibold">
                  <Globe className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Location only works over a secure connection (https://). Please open this site using https:// — the browser will then show an Allow-location popup.</span>
                </div>
              )}

              {perm && perm.permission === 'denied' && (
                <div className="flex items-start gap-2 text-left p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-[11px] font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Location is blocked for this site. Allow it: click the 🔒 icon in the browser address bar → Site settings / Permissions → Location → <b>Allow</b>, then click Try Again.</span>
                </div>
              )}

              {perm && perm.permission === 'granted' && !resolved && !errorMsg && (
                <div className="flex items-start gap-2 text-left p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Location permission is already granted — tap “Enable My Location” to lock your exact GPS position.</span>
                </div>
              )}

              {perm && perm.permission === 'prompt' && !errorMsg && (
                <div className="flex items-start gap-2 text-left p-3 rounded-xl bg-primary/10 border border-primary/40 text-primary text-[11px] font-semibold">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>A browser popup will ask to use your location — tap <b>Allow</b> when it appears.</span>
                </div>
              )}

              {errorMsg && (
                <div className="flex items-start gap-2 text-left p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-[11px] font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {!showManual ? (
                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleDetectLocation}
                    disabled={loading}
                    className="w-full btn-primary text-xs py-3"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Detecting Your Exact Location...
                      </span>
                    ) : (
                      <>
                        <Navigation className="w-4 h-4" />
                        {errorMsg ? 'Try Again — Enable My Location' : 'Enable My Location'}
                      </>
                    )}
                  </button>

                  {!errorMsg && (
                    <button
                      type="button"
                      onClick={() => setShowManual(true)}
                      className="w-full btn-secondary text-xs py-2.5"
                    >
                      Enter Delivery Address Manually
                    </button>
                  )}

                  {errorMsg && (
                    <button
                      type="button"
                      onClick={() => setShowManual(true)}
                      className="w-full text-[11px] text-text-subdued hover:text-text-muted py-1"
                    >
                      Enter Delivery Address Manually instead
                    </button>
                  )}
                </div>
              ) : (
                <form onSubmit={handleManualSubmit} className="space-y-3 pt-2 text-left">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-muted block">Specify Delivery Address</label>
                    <input
                      type="text"
                      value={manualAddr}
                      onChange={(e) => setManualAddr(e.target.value)}
                      placeholder="e.g. KG 9 Ave, Nyarutarama, Kigali"
                      required
                      className="w-full bg-surface-card border border-white/10 rounded-xl px-4 py-2.5 text-xs text-text-main focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary text-xs flex-1 py-2.5">
                      Save Address
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowManual(false)}
                      className="btn-secondary text-xs py-2.5"
                    >
                      Back
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <div className="space-y-4 pt-2 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                <Check className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-400">Location Enabled</h3>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Your exact device location has been detected:
                </p>
              </div>

              <div className="text-left p-3 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                <div className="text-xs text-text-main font-bold flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{resolved.location}</span>
                </div>
                <div className="text-[11px] font-mono text-text-muted">
                  GPS: {resolved.lat.toFixed(4)}, {resolved.lng.toFixed(4)}
                  {resolved.accuracy ? ` (±${resolved.accuracy} m accuracy)` : ''}
                </div>
              </div>

              <button onClick={onClose} className="w-full btn-primary text-xs py-3">
                <ShieldCheck className="w-4 h-4" />
                Continue
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}