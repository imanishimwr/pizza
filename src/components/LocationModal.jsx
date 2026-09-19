import React, { useState } from 'react';
import { MapPin, Navigation, X, Check, ShieldCheck } from 'lucide-react';

export default function LocationModal({ isOpen, onClose, onSetLocation }) {
  if (!isOpen) return null;

  const [loading, setLoading] = useState(false);
  const [manualAddr, setManualAddr] = useState('');
  const [showManual, setShowManual] = useState(false);

  const handleDetectLocation = () => {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            setLoading(false);
            
            const road = data.address?.road || data.address?.suburb || data.address?.neighbourhood;
            const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county;
            const country = data.address?.country;
            
            const parts = [road, city, country].filter(Boolean);
            const locString = parts.length > 0 
              ? `${parts.join(', ')} (GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)})`
              : `GPS Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
              
            onSetLocation(locString);
            onClose();
          } catch (err) {
            setLoading(false);
            onSetLocation(`GPS Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            onClose();
          }
        },
        () => {
          setLoading(false);
          setShowManual(true);
          // Don't auto-set fallback, ask user to enter manually
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLoading(false);
      setShowManual(true);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualAddr) return;
    onSetLocation(manualAddr);
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
              <p className="text-xs text-text-muted">Live Kigali Order Tracking</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-text-muted hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto text-primary animate-pulse">
            <Navigation className="w-8 h-8" />
          </div>

          <p className="text-xs text-text-muted leading-relaxed">
            HotPot Delights requires your location to assign the nearest delivery rider in Kigali and provide live order tracking.
          </p>

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
                    Detecting Kigali GPS Location...
                  </span>
                ) : (
                  <>
                    <Navigation className="w-4 h-4" />
                    Allow Current Location Access
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowManual(true)}
                className="w-full btn-secondary text-xs py-2.5"
              >
                Enter Delivery Address Manually
              </button>
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-3 pt-2 text-left">
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-muted block">Specify Kigali Address</label>
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
        </div>

      </div>
    </div>
  );
}
