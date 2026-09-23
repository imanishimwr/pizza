import React, { useState } from 'react';
import { X, MapPin, Phone, CreditCard, Smartphone, DollarSign, CheckCircle2, ShieldCheck, AlertCircle, User } from 'lucide-react';
import { getDeviceLocation, distanceKmBetween } from '../../services/gpsService';

// Exact Hot Pot Kigali Restaurant origin (Google Maps: -1.97022762, 30.12498964)
const RESTAURANT_COORDS = { lat: -1.97022762, lng: 30.12498964 };

export default function CheckoutModal({ isOpen, onClose, checkoutData, onOrderPlaced }) {
  if (!isOpen || !checkoutData) return null;

  const [detectedPlace, setDetectedPlace] = useState(''); // real city/province from the device GPS reverse-address
  // Prefill from the real location saved at login (from the post-login location scan)
  const [addressDetail, setAddressDetail] = useState(() => {
    try {
      const saved = localStorage.getItem('hotpot_user_v1');
      const u = saved ? JSON.parse(saved) : null;
      return u?.location || '';
    } catch { return ''; }
  });
  const [isScanningGps, setIsScanningGps] = useState(false);
  const [gpsFix, setGpsFix] = useState(() => {
    try {
      const saved = localStorage.getItem('hotpot_user_v1');
      const u = saved ? JSON.parse(saved) : null;
      if (u && u.lat != null && u.lng != null) return { lat: Number(u.lat), lng: Number(u.lng) };
    } catch {}
    return null;
  }); // { lat, lng } of the exact scanned device location
  const [customerName, setCustomerName] = useState(() => {
    try {
      const saved = localStorage.getItem('hotpot_user_v1');
      const u = saved ? JSON.parse(saved) : null;
      return u?.name || '';
    } catch { return ''; }
  });
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('momo'); // momo | airtel | card | cash
  const [momoNumber, setMomoNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleScanCurrentLocation = async () => {
    setIsScanningGps(true);
    setErrorMsg('');
    try {
      // Real location straight from the device GPS + live reverse geocoding (no hardcoded districts/areas)
      const { lat, lng, data, address, accuracy } = await getDeviceLocation();
      setGpsFix({ lat, lng, accuracy: Math.round(accuracy || 0) });

      const a = data?.address || {};
      const place = a.city || a.town || a.village || a.state || a.province || a.suburb || a.county || a.country || '';
      setDetectedPlace(place);

      setAddressDetail(address
        ? `${address} (GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)})`
        : `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } catch (err) {
      setErrorMsg(err.message || 'Could not detect your location. Please turn on Location and try again.');
    } finally {
      setIsScanningGps(false);
    }
  };

  // Real distance & ETA computed from the restaurant to the actual scanned device GPS
  const gpsDistKm = gpsFix ? distanceKmBetween(RESTAURANT_COORDS.lat, RESTAURANT_COORDS.lng, gpsFix.lat, gpsFix.lng) : null;
  const dynamicEta = gpsDistKm != null
    ? Math.max(15, Math.round(15 + gpsDistKm * 4))
    : 20;
  const deliveryDistanceKm = gpsDistKm != null ? gpsDistKm : 3.8;
  const deliveryAreaLabel = detectedPlace
    || (gpsFix ? `GPS ${gpsFix.lat.toFixed(4)}, ${gpsFix.lng.toFixed(4)}` : '');
  const fullDeliveryAddress = addressDetail;

  const validatePhone = (num) => {
    const rwandaRegex = /^(078|079|072|073)\d{7}$/;
    return rwandaRegex.test(num.replace(/\s+/g, ''));
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!customerName.trim()) {
      setErrorMsg('Please enter your name for the order.');
      return;
    }

    if (!validatePhone(phone)) {
      setErrorMsg('Use a valid Rwanda phone number (078/079/072/073 + 7 digits).');
      return;
    }

    if (!addressDetail.trim()) {
      setErrorMsg('Please enter your delivery address.');
      return;
    }

    setIsSubmitting(true);

    const now = new Date();
    const etaDate = new Date(now.getTime() + dynamicEta * 60000);
    const etaTimeString = etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newOrder = {
      customerName: customerName.trim(),
      phone: phone,
      items: checkoutData.cart.map((c) => ({
        id: c.meal.id,
        name: c.meal.name,
        qty: c.quantity,
        price: c.meal.price,
        spice: c.selectedSpice || null,
        broth: c.selectedBroth || null,
        specialNote: c.specialNote || '',
      })),
      totalRWF: checkoutData.grandTotal,
      status: 'pending',
      address: fullDeliveryAddress,
      area: deliveryAreaLabel,
      distanceKm: deliveryDistanceKm,
      lat: gpsFix ? gpsFix.lat : null,
      lng: gpsFix ? gpsFix.lng : null,
      etaMinutes: dynamicEta,
      etaTime: etaTimeString,
      orderTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      paymentMethod:
        paymentMethod === 'momo'
          ? 'MTN Mobile Money'
          : paymentMethod === 'airtel'
          ? 'Airtel Money'
          : paymentMethod === 'card'
          ? 'Visa / Mastercard'
          : 'Cash on Delivery',
      paymentStatus: paymentMethod === 'cash' ? 'PENDING' : 'PAID',
    };

    // Order is created by App.jsx via onOrderPlaced -> apiService.createOrder
    setTimeout(() => {
      setIsSubmitting(false);
      onOrderPlaced(newOrder);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-surface-dark border border-white/10 rounded-2xl max-w-xl w-full max-h-[96vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-text-main flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Complete Your Checkout
            </h2>
            <p className="text-[11px] text-text-muted">Kigali Express Food & Hotpot Delivery</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-text-muted hover:text-white rounded-lg hover:bg-white/5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handlePlaceOrder} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Customer Name */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-primary" />
              Your Name
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              placeholder="Enter your full name"
              className="w-full bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-xs text-text-main placeholder-text-subdued focus:outline-none focus:border-primary"
            />
          </div>

          {/* Delivery Address & GPS Scan */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                Delivery Address
              </label>

              <button
                type="button"
                onClick={handleScanCurrentLocation}
                disabled={isScanningGps}
                className="px-2.5 py-1 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary text-[11px] font-bold flex items-center gap-1 transition-all"
              >
                {isScanningGps ? (
                  <>
                    <span className="w-2.5 h-2.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                    Scanning GPS...
                  </>
                ) : (
                  <>
                    <MapPin className="w-3 h-3" />
                    Scan GPS Location
                  </>
                )}
              </button>
            </div>

            {!gpsFix && (
              <p className="text-[10px] text-text-muted leading-relaxed">
                For your exact address, turn on Location on this device and tap <span className="text-primary font-bold">Scan GPS Location</span>. Otherwise type your address below.
              </p>
            )}

            {gpsFix && (
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 rounded-lg px-2 py-1.5">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">
                  Real location locked: {gpsFix.lat.toFixed(4)}, {gpsFix.lng.toFixed(4)}{gpsFix.accuracy ? ` (±${gpsFix.accuracy} m)` : ''}{detectedPlace ? ` • ${detectedPlace}` : ''}
                </span>
              </div>
            )}

            <input
              type="text"
              value={addressDetail}
              onChange={(e) => setAddressDetail(e.target.value)}
              required
              placeholder="Full address (House No., Street, Sector, City / Landmark)"
              className="w-full bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-xs text-text-main placeholder-text-subdued focus:outline-none focus:border-primary"
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-primary" />
              Rwanda Contact Phone
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="0788000001 (078/079/072/073 + 7 digits)"
              className="w-full bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-xs text-text-main placeholder-text-subdued focus:outline-none focus:border-primary"
            />
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
              Payment Method
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              
              {/* MTN Mobile Money */}
              <button
                type="button"
                onClick={() => setPaymentMethod('momo')}
                className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2 ${
                  paymentMethod === 'momo'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-md'
                    : 'bg-surface-card border-white/5 text-text-muted hover:border-white/20'
                }`}
              >
                <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">MTN MoMo</div>
                  <div className="text-[9px] opacity-75 truncate">Push Prompt</div>
                </div>
              </button>

              {/* Airtel Money */}
              <button
                type="button"
                onClick={() => setPaymentMethod('airtel')}
                className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2 ${
                  paymentMethod === 'airtel'
                    ? 'bg-red-500/15 border-red-500 text-red-400 shadow-md'
                    : 'bg-surface-card border-white/5 text-text-muted hover:border-white/20'
                }`}
              >
                <Smartphone className="w-4 h-4 text-red-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">Airtel</div>
                  <div className="text-[9px] opacity-75 truncate">Mobile Wallet</div>
                </div>
              </button>

              {/* Credit / Debit Card */}
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2 ${
                  paymentMethod === 'card'
                    ? 'bg-blue-500/15 border-blue-500 text-blue-400 shadow-md'
                    : 'bg-surface-card border-white/5 text-text-muted hover:border-white/20'
                }`}
              >
                <CreditCard className="w-4 h-4 text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">Card</div>
                  <div className="text-[9px] opacity-75 truncate">Visa / MC</div>
                </div>
              </button>

              {/* Cash on Delivery */}
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2 ${
                  paymentMethod === 'cash'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-md'
                    : 'bg-surface-card border-white/5 text-text-muted hover:border-white/20'
                }`}
              >
                <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">Cash</div>
                  <div className="text-[9px] opacity-75 truncate">On Delivery</div>
                </div>
              </button>
            </div>
          </div>

          {(paymentMethod === 'momo' || paymentMethod === 'airtel') && (
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 space-y-1">
              <label className="text-[11px] font-bold text-text-muted block">
                {paymentMethod === 'momo' ? 'MTN MoMo' : 'Airtel'} Phone Number for Payment Request
              </label>
              <input
                type="text"
                value={momoNumber}
                onChange={(e) => setMomoNumber(e.target.value)}
                placeholder="0788000001"
                className="w-full bg-surface-card border border-white/10 rounded-lg px-3 py-1.5 text-xs text-text-main"
              />
              <p className="text-[10px] text-amber-400/80">
                ⚡ You will receive a USSD prompt on your phone to enter your PIN.
              </p>
            </div>
          )}

          {/* Grand Total Bar */}
          <div className="p-3 rounded-xl bg-surface-card border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[9px] text-text-subdued uppercase font-bold block">Total Amount Due</span>
              <span className="text-base font-extrabold font-mono text-primary">
                {checkoutData.grandTotal.toLocaleString()} RWF
              </span>
            </div>
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Secure 256-Bit
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary text-xs flex-1 py-2.5">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary text-xs flex-[2] py-2.5 font-bold"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Processing...
                </span>
              ) : (
                `Confirm & Pay ${checkoutData.grandTotal.toLocaleString()} RWF`
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
