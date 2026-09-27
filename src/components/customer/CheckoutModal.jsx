import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  X,
  MapPin,
  Phone,
  CreditCard,
  Smartphone,
  DollarSign,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  User,
  Loader2
} from 'lucide-react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

const KIGALI_AREAS = [
  { name: 'Nyarutarama', distKm: 3.5, estMin: 18 },
  { name: 'Kimironko', distKm: 5.2, estMin: 22 },
  { name: 'Kacyiru', distKm: 4.1, estMin: 20 },
  { name: 'Remera', distKm: 4.8, estMin: 21 },
  { name: 'Kiyovu (CBD)', distKm: 6.5, estMin: 28 },
  { name: 'Gikondo', distKm: 7.1, estMin: 30 },
  { name: 'Kanombe', distKm: 9.4, estMin: 35 },
  { name: 'Nyamirambo', distKm: 8.3, estMin: 32 }
];

const PAYMENT_LABELS = {
  momo: 'MTN Mobile Money',
  airtel: 'Airtel Money',
  card: 'Visa / Mastercard',
  cash: 'Cash on Delivery'
};

const rwf = (value) => Number(value || 0).toLocaleString();

const validatePhone = (num) => /^(078|079|072|073)\d{7}$/.test(String(num || '').replace(/\s+/g, ''));

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
 * `onOrderPlaced(draft)` is async and REJECTS when the server refuses the
 * order. This modal awaits it, keeps itself open on failure and shows the real
 * message, and only closes once the order genuinely exists.
 */
export default function CheckoutModal({ isOpen, onClose, checkoutData, onOrderPlaced, busy = false, user }) {
  const open = Boolean(isOpen) && Boolean(checkoutData);

  const [selectedKigaliArea, setSelectedKigaliArea] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [notes, setNotes] = useState('');
  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [isScanningGps, setIsScanningGps] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('momo');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const panelRef = useOverlayA11y(open, onClose);
  const geoRequestId = useRef(0);
  const isBusy = submitting || Boolean(busy);
  const busyRef = useRef(isBusy);

  useEffect(() => {
    busyRef.current = isBusy;
  }, [isBusy]);

  // Seed the form from the signed-in user (never from localStorage directly) and
  // from the address already on the account.
  useEffect(() => {
    if (!open) return;
    geoRequestId.current += 1;
    setIsScanningGps(false);
    setSubmitting(false);
    setErrorMsg('');
    setCoords({ lat: Number(user?.lat) || null, lng: Number(user?.lng) || null });
    setCustomerName((prev) => prev || user?.name || '');
    setPhone((prev) => prev || user?.phone || '');
    setAddressDetail((prev) => prev || user?.location || '');
  }, [open, user]);

  // While a request is in flight, closing would hide the outcome from the user.
  const requestClose = useCallback(() => {
    if (busyRef.current) return;
    if (typeof onClose === 'function') onClose();
  }, [onClose]);

  const handleScanCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser. Please enter your address manually.');
      return;
    }
    setIsScanningGps(true);
    setErrorMsg('');
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
          const sector = data.address?.suburb || data.address?.city_district || '';
          const matched = KIGALI_AREAS.find((area) =>
            String(sector).toLowerCase().includes(area.name.toLowerCase())
          );
          if (matched) setSelectedKigaliArea(matched.name);
          const parts = [road, city].filter(Boolean);
          setAddressDetail(
            parts.length > 0
              ? `${parts.join(', ')} (GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)})`
              : `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`
          );
        } catch {
          if (requestId !== geoRequestId.current) return;
          setAddressDetail(`GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          setErrorMsg('Could not fetch address details for those coordinates. Check the address below.');
        }
      },
      (error) => {
        if (requestId !== geoRequestId.current) return;
        setIsScanningGps(false);
        setErrorMsg(`Location access denied or unavailable (${error?.message || 'permission denied'}). Please enter it manually.`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const currentAreaInfo = KIGALI_AREAS.find((a) => a.name === selectedKigaliArea) || KIGALI_AREAS[0];

  const handlePlaceOrder = async (event) => {
    event.preventDefault();
    if (isBusy) return;
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

    const now = new Date();
    const cartLines = Array.isArray(checkoutData?.cart) ? checkoutData.cart : [];
    const fullDeliveryAddress = [addressDetail.trim(), selectedKigaliArea].filter(Boolean).join(', ');

    const draft = {
      customerName: customerName.trim(),
      phone: phone.replace(/\s+/g, ''),
      address: fullDeliveryAddress,
      area: selectedKigaliArea,
      lat: coords.lat,
      lng: coords.lng,
      status: 'pending',
      orderType: 'delivery',
      notes: notes.trim(),
      totalRWF: Number(checkoutData.grandTotal) || 0,
      distanceKm: currentAreaInfo.distKm,
      paymentMethod: PAYMENT_LABELS[paymentMethod] || PAYMENT_LABELS.cash,
      paymentStatus: paymentMethod === 'cash' ? 'PENDING' : 'PAID',
      orderTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      items: cartLines.map((line) => ({
        id: line?.meal?.id,
        mealId: line?.meal?.id,
        name: line?.meal?.name,
        qty: Number(line?.quantity) || 1,
        price: Number(line?.meal?.price) || 0,
        spice: line?.selectedSpice || null,
        broth: line?.selectedBroth || null,
        specialNote: line?.specialNote || ''
      }))
    };

    setSubmitting(true);
    try {
      // Throws when the server rejects the order — we do not close on failure.
      await onOrderPlaced(draft);
      if (typeof onClose === 'function') onClose();
    } catch (err) {
      setErrorMsg(err?.message || 'We could not place your order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const grandTotal = Number(checkoutData.grandTotal) || 0;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md transition-opacity duration-200"
      onClick={requestClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-modal-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="bg-surface-dark border border-white/10 rounded-2xl max-w-xl w-full max-h-[96vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
          <div>
            <h2 id="checkout-modal-title" className="text-sm sm:text-base font-bold text-text-main flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" aria-hidden="true" focusable="false" />
              Complete Your Checkout
            </h2>
            <p className="text-[11px] text-text-muted">Kigali Express Food &amp; Hotpot Delivery</p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close checkout"
            className="p-1.5 text-text-muted hover:text-white rounded-lg hover:bg-white/5"
          >
            <X className="w-4 h-4" aria-hidden="true" focusable="false" />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handlePlaceOrder} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
          <div role="alert" aria-live="assertive">
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" focusable="false" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Customer Name */}
          <div className="space-y-1">
            <label
              htmlFor="checkout-name"
              className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1"
            >
              <User className="w-3.5 h-3.5 text-primary" aria-hidden="true" focusable="false" />
              Your Name
            </label>
            <input
              id="checkout-name"
              type="text"
              name="name"
              autoComplete="name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              placeholder="Enter your full name"
              className="w-full bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-xs text-text-main placeholder-text-subdued focus:outline-none focus:border-primary"
            />
          </div>

          {/* Delivery Address & Geocoding Sector Selector */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <label
                htmlFor="checkout-address"
                className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1"
              >
                <MapPin className="w-3.5 h-3.5 text-primary" aria-hidden="true" focusable="false" />
                Kigali Sector &amp; Address
              </label>

              <button
                type="button"
                onClick={handleScanCurrentLocation}
                disabled={isScanningGps || isBusy}
                className="px-2.5 py-1 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary text-[11px] font-bold flex items-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isScanningGps ? (
                  <>
                    <Loader2 className="w-2.5 h-2.5 animate-spin" aria-hidden="true" focusable="false" />
                    Scanning GPS...
                  </>
                ) : (
                  <>
                    <MapPin className="w-3 h-3" aria-hidden="true" focusable="false" />
                    Scan GPS Location
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" role="group" aria-label="Delivery sector">
              {KIGALI_AREAS.map((area) => (
                <button
                  type="button"
                  key={area.name}
                  onClick={() => setSelectedKigaliArea(area.name)}
                  aria-pressed={selectedKigaliArea === area.name}
                  className={`p-1.5 px-2 rounded-lg border text-left transition-all ${
                    selectedKigaliArea === area.name
                      ? 'bg-primary/20 border-primary text-white font-bold'
                      : 'bg-surface-card border-white/10 text-text-muted hover:border-white/20'
                  }`}
                >
                  <span className="block text-xs truncate">{area.name}</span>
                  <span className="block text-[9px] text-text-subdued font-mono">
                    {area.estMin} min &bull; {area.distKm}km
                  </span>
                </button>
              ))}
            </div>

            <input
              id="checkout-address"
              type="text"
              name="address"
              autoComplete="street-address"
              value={addressDetail}
              onChange={(e) => setAddressDetail(e.target.value)}
              required
              placeholder="House Number, Street / Landmark (e.g. KG 9 Ave, House 42)"
              className="w-full bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-xs text-text-main placeholder-text-subdued focus:outline-none focus:border-primary"
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-1">
            <label
              htmlFor="checkout-phone"
              className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1"
            >
              <Phone className="w-3.5 h-3.5 text-primary" aria-hidden="true" focusable="false" />
              Rwanda Contact Phone
            </label>
            <input
              id="checkout-phone"
              type="tel"
              name="phone"
              autoComplete="tel"
              inputMode="tel"
              pattern="0(78|79|72|73)[0-9]{7}"
              title="Enter a Rwanda phone number: 078, 079, 072 or 073 followed by 7 digits."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="0788000001 (078/079/072/073 + 7 digits)"
              className="w-full bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-xs text-text-main placeholder-text-subdued focus:outline-none focus:border-primary"
            />
          </div>

          {/* Order Notes */}
          <div className="space-y-1">
            <label
              htmlFor="checkout-notes"
              className="text-[11px] font-bold uppercase tracking-wider text-text-muted block"
            >
              Note for the kitchen (optional)
            </label>
            <textarea
              id="checkout-notes"
              name="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. No coriander, extra dipping sauce"
              className="w-full bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-xs text-text-main placeholder-text-subdued focus:outline-none focus:border-primary resize-none"
            />
          </div>

          {/* Payment Method Selector */}
          <fieldset className="space-y-1.5">
            <legend className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
              Payment Method
            </legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { key: 'momo', title: 'MTN MoMo', sub: 'Push Prompt', Icon: Smartphone, active: 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-md' },
                { key: 'airtel', title: 'Airtel', sub: 'Mobile Wallet', Icon: Smartphone, active: 'bg-red-500/15 border-red-500 text-red-400 shadow-md' },
                { key: 'card', title: 'Card', sub: 'Visa / MC', Icon: CreditCard, active: 'bg-blue-500/15 border-blue-500 text-blue-400 shadow-md' },
                { key: 'cash', title: 'Cash', sub: 'On Delivery', Icon: DollarSign, active: 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-md' }
              ].map(({ key, title, sub, Icon, active }) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setPaymentMethod(key)}
                  aria-pressed={paymentMethod === key}
                  className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2 ${
                    paymentMethod === key
                      ? active
                      : 'bg-surface-card border-white/5 text-text-muted hover:border-white/20'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" focusable="false" />
                  <span className="min-w-0">
                    <span className="block text-xs font-bold truncate">{title}</span>
                    <span className="block text-[9px] opacity-75 truncate">{sub}</span>
                  </span>
                </button>
              ))}
            </div>

            {(paymentMethod === 'momo' || paymentMethod === 'airtel') && (
              <p className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-[10px] text-amber-400/90">
                You will receive a USSD prompt on {phone || 'your phone number'} to approve the
                payment and enter your PIN.
              </p>
            )}
          </fieldset>

          {/* Grand Total Bar */}
          <div className="p-3 rounded-xl bg-surface-card border border-white/10 flex items-center justify-between gap-2">
            <div>
              <span className="text-[9px] text-text-subdued uppercase font-bold block">Total Amount Due</span>
              <span className="text-base font-extrabold font-mono text-primary">
                {rwf(grandTotal)} RWF
              </span>
            </div>
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" focusable="false" />
              Secure Payment
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={requestClose}
              disabled={isBusy}
              className="btn-secondary text-xs flex-1 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isBusy}
              className="btn-primary text-xs flex-2 py-2.5 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBusy ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" focusable="false" />
                  Placing your order...
                </span>
              ) : (
                `Confirm & Pay ${rwf(grandTotal)} RWF`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
