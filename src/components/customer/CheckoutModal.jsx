import React, { useState } from 'react';
import { X, MapPin, Phone, CreditCard, Smartphone, DollarSign, CheckCircle2, ShieldCheck, AlertCircle, User } from 'lucide-react';

export default function CheckoutModal({ isOpen, onClose, checkoutData, onOrderPlaced }) {
  if (!isOpen || !checkoutData) return null;

  const [selectedKigaliArea, setSelectedKigaliArea] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [isScanningGps, setIsScanningGps] = useState(false);
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

  const kigaliAreas = [
    { name: 'Nyarutarama', distKm: 3.5, estMin: 18 },
    { name: 'Kimironko', distKm: 5.2, estMin: 22 },
    { name: 'Kacyiru', distKm: 4.1, estMin: 20 },
    { name: 'Remera', distKm: 4.8, estMin: 21 },
    { name: 'Kiyovu (CBD)', distKm: 6.5, estMin: 28 },
    { name: 'Gikondo', distKm: 7.1, estMin: 30 },
    { name: 'Kanombe', distKm: 9.4, estMin: 35 },
    { name: 'Nyamirambo', distKm: 8.3, estMin: 32 },
  ];

  const handleScanCurrentLocation = () => {
    setIsScanningGps(true);
    setErrorMsg('');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            setIsScanningGps(false);
            
            const road = data.address?.road || data.address?.suburb || data.address?.neighbourhood;
            const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county;
            const sector = data.address?.suburb || data.address?.city_district || data.address?.city || '';
            
            // Match sector name to available list
            const matchedArea = kigaliAreas.find(a => sector.toLowerCase().includes(a.name.toLowerCase()))?.name || '';
            if (matchedArea) {
              setSelectedKigaliArea(matchedArea);
            }
            
            const parts = [road, city].filter(Boolean);
            if (parts.length > 0) {
              setAddressDetail(`${parts.join(', ')} (GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)})`);
            } else {
              setAddressDetail(`GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            }
          } catch (err) {
            setIsScanningGps(false);
            setAddressDetail(`GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            setErrorMsg('Could not fetch address details for coordinates.');
          }
        },
        (error) => {
          setIsScanningGps(false);
          setErrorMsg(`Location access denied or unavailable (${error.message}). Please enter manually.`);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setIsScanningGps(false);
      setErrorMsg('Geolocation is not supported by your browser.');
    }
  };

  const currentAreaInfo = kigaliAreas.find((a) => a.name === selectedKigaliArea) || kigaliAreas[0];
  const dynamicEta = currentAreaInfo.estMin;
  const fullDeliveryAddress = selectedKigaliArea 
    ? `${addressDetail} (${selectedKigaliArea})` 
    : addressDetail;

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
      area: selectedKigaliArea,
      distanceKm: currentAreaInfo.distKm,
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

          {/* Delivery Address & Geocoding Sector Selector */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                Kigali Sector & Address
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {kigaliAreas.map((area) => (
                <button
                  type="button"
                  key={area.name}
                  onClick={() => setSelectedKigaliArea(area.name)}
                  className={`p-1.5 px-2 rounded-lg border text-left transition-all ${
                    selectedKigaliArea === area.name
                      ? 'bg-primary/20 border-primary text-white font-bold'
                      : 'bg-surface-card border-white/10 text-text-muted hover:border-white/20'
                  }`}
                >
                  <div className="text-xs truncate">{area.name}</div>
                  <div className="text-[9px] text-text-subdued font-mono">{area.estMin} min • {area.distKm}km</div>
                </button>
              ))}
            </div>

            <input
              type="text"
              value={addressDetail}
              onChange={(e) => setAddressDetail(e.target.value)}
              required
              placeholder="House Number, Street / Landmark (e.g. KG 9 Ave, House 42)"
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
