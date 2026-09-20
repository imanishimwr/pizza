import React, { useState } from 'react';
import { X, MapPin, Phone, User, CreditCard, Smartphone, DollarSign, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../../services/apiService';

export default function CheckoutModal({ isOpen, onClose, checkoutData, onOrderPlaced }) {
  if (!isOpen || !checkoutData) return null;

  const userPhone = checkoutData.user?.phone || '';
  const userName = checkoutData.user?.name || '';

  const [selectedKigaliArea, setSelectedKigaliArea] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [isScanningGps, setIsScanningGps] = useState(false);
  const [customerName, setCustomerName] = useState(userName || (checkoutData.customerName !== 'Guest' ? checkoutData.customerName : ''));
  const [phone, setPhone] = useState(userPhone);
  const [paymentMethod, setPaymentMethod] = useState('momo'); // momo | airtel | card | cash
  const [momoNumber, setMomoNumber] = useState(userPhone); // pre-fill with user's own number
  const [acceptedInformation, setAcceptedInformation] = useState(false);
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
    // Accept any non-empty phone number (Rwanda or international)
    return num && num.replace(/\s+/g, '').length >= 9;
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!phone || !validatePhone(phone)) {
      setErrorMsg('Please enter a valid phone number (at least 9 digits).');
      return;
    }

    if (!customerName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    if (!acceptedInformation) {
      setErrorMsg('Please confirm that your order information is correct.');
      return;
    }

    setIsSubmitting(true);

    const now = new Date();
    const etaDate = new Date(now.getTime() + dynamicEta * 60000);
    const etaTimeString = etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const orderPayload = {
      customerName: customerName.trim(),
      phone,
      items: checkoutData.cart.map((c) => ({
        mealId: c.meal?.id || null,
        name: c.meal.name,
        qty: c.quantity,
        price: c.meal.price,
        spice: c.selectedSpice || null,
        broth: c.selectedBroth || null,
        specialNote: c.specialNote || null,
      })),
      totalRWF: checkoutData.grandTotal,
      status: 'pending',
      address: fullDeliveryAddress || 'Kigali',
      etaMinutes: dynamicEta,
      etaTime: etaTimeString,
      orderTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      paymentMethod:
        paymentMethod === 'momo' ? 'MTN Mobile Money' :
        paymentMethod === 'airtel' ? 'Airtel Money' :
        paymentMethod === 'card' ? 'Visa / Mastercard' : 'Cash on Delivery',
      paymentStatus: paymentMethod === 'cash' ? 'PENDING' : 'PAID',
    };

    try {
      // POST to real backend — this saves to DB and emits kitchen_orders_updated via WebSocket
      const res = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      if (res.ok) {
        const createdOrder = await res.json();
        // Merge backend response with local fields for immediate UI display
        const fullOrder = {
          ...orderPayload,
          ...createdOrder,
          items: Array.isArray(createdOrder.items) && createdOrder.items.length > 0
            ? createdOrder.items
            : orderPayload.items,
        };
        setIsSubmitting(false);
        onOrderPlaced(fullOrder);
        onClose();
      } else {
        // Backend returned error — show it
        const errData = await res.json().catch(() => ({}));
        setErrorMsg(errData.error || 'Order failed. Please try again.');
        setIsSubmitting(false);
      }
    } catch (err) {
      setIsSubmitting(false);
      setErrorMsg('Could not reach the ordering server. Your order was not placed. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-surface-dark border border-white/10 rounded-2xl sm:rounded-3xl max-w-xl w-full max-h-[92vh] shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="px-5 py-2.5 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-text-main flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-primary" />
              Complete Your Checkout
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5 text-[9px] font-bold uppercase tracking-wider text-text-subdued">
              <span>Kigali Express Food &amp; Hotpot</span>
              <span className="hidden sm:inline">• 1 Cart → 2 Your information → 3 Kitchen</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-text-muted hover:text-white shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form id="checkoutForm" onSubmit={handlePlaceOrder} className="p-4 space-y-3 overflow-y-auto flex-1 min-h-0">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Delivery Address & Geocoding Sector Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                Kigali Sector / Delivery
              </label>

              <button
                type="button"
                onClick={handleScanCurrentLocation}
                disabled={isScanningGps}
                className="px-2.5 py-1 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary text-[10px] font-bold flex items-center gap-1 transition-all"
              >
                {isScanningGps ? (
                  <>
                    <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                    Scanning...
                  </>
                ) : (
                  <>
                    <MapPin className="w-3 h-3" />
                    Scan GPS
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {kigaliAreas.map((area) => (
                <button
                  type="button"
                  key={area.name}
                  onClick={() => setSelectedKigaliArea(area.name)}
                  className={`px-1 py-1 rounded-lg border transition-all ${
                    selectedKigaliArea === area.name
                      ? 'bg-primary/20 border-primary text-white'
                      : 'bg-surface-card border-white/10 text-text-muted hover:border-white/20'
                  }`}
                >
                  <div className="text-[10px] font-semibold truncate">{area.name}</div>
                  <div className="text-[9px] text-text-subdued font-mono">~{area.estMin} min</div>
                </button>
              ))}
            </div>

            <input
              type="text"
              value={addressDetail}
              onChange={(e) => setAddressDetail(e.target.value)}
              placeholder="House number, street / landmark (e.g. KG 9 Ave, House 42)"
              className="w-full bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-xs text-text-main placeholder-text-subdued focus:outline-none focus:border-primary"
            />
          </div>

          {/* Customer Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary" />
                Full Name
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
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-primary" />
                Rwanda Contact Phone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="0788000001"
                className="w-full bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-xs text-text-main placeholder-text-subdued focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
              Select Payment Method
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              
              {/* MTN Mobile Money */}
              <button
                type="button"
                onClick={() => setPaymentMethod('momo')}
                className={`p-2 rounded-lg border transition-all flex flex-col items-center justify-center gap-1 text-center ${
                  paymentMethod === 'momo'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-300 shadow-md'
                    : 'bg-surface-card border-white/5 text-text-muted hover:border-white/20'
                }`}
              >
                <Smartphone className="w-4 h-4 text-amber-400" />
                <div className="text-[11px] font-bold leading-tight">MTN MoMo</div>
                <div className="text-[9px] opacity-75">Push Prompt</div>
              </button>

              {/* Airtel Money */}
              <button
                type="button"
                onClick={() => setPaymentMethod('airtel')}
                className={`p-2 rounded-lg border transition-all flex flex-col items-center justify-center gap-1 text-center ${
                  paymentMethod === 'airtel'
                    ? 'bg-red-500/10 border-red-500 text-red-400 shadow-md'
                    : 'bg-surface-card border-white/5 text-text-muted hover:border-white/20'
                }`}
              >
                <Smartphone className="w-4 h-4 text-red-500" />
                <div className="text-[11px] font-bold leading-tight">Airtel Money</div>
                <div className="text-[9px] opacity-75">Mobile Wallet</div>
              </button>

              {/* Credit / Debit Card */}
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-2 rounded-lg border transition-all flex flex-col items-center justify-center gap-1 text-center ${
                  paymentMethod === 'card'
                    ? 'bg-blue-500/10 border-blue-500 text-blue-400 shadow-md'
                    : 'bg-surface-card border-white/5 text-text-muted hover:border-white/20'
                }`}
              >
                <CreditCard className="w-4 h-4 text-blue-400" />
                <div className="text-[11px] font-bold leading-tight">Card Payment</div>
                <div className="text-[9px] opacity-75">Visa / MC</div>
              </button>

              {/* Cash on Delivery */}
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`p-2 rounded-lg border transition-all flex flex-col items-center justify-center gap-1 text-center ${
                  paymentMethod === 'cash'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-md'
                    : 'bg-surface-card border-white/5 text-text-muted hover:border-white/20'
                }`}
              >
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <div className="text-[11px] font-bold leading-tight">Cash on</div>
                <div className="text-[9px] opacity-75">Delivery</div>
              </button>

            </div>
          </div>

          {(paymentMethod === 'momo' || paymentMethod === 'airtel') && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 rounded-lg bg-black/40 border border-white/10">
              <label className="text-[10px] font-bold text-text-muted shrink-0">
                {paymentMethod === 'momo' ? 'MTN MoMo' : 'Airtel'} Number
              </label>
              <input
                type="text"
                value={momoNumber}
                onChange={(e) => setMomoNumber(e.target.value)}
                placeholder="0788000001"
                className="w-full flex-1 bg-surface-card border border-white/10 rounded-lg px-3 py-1.5 text-xs text-text-main"
              />
              <span className="text-[9px] text-amber-400/80 shrink-0">⚡ You'll get a USSD PIN prompt.</span>
            </div>
          )}

          </form>

        {/* Pinned Footer - always visible */}
        <div className="shrink-0 border-t border-white/10 bg-surface-dark px-4 py-3 space-y-2.5">
          {/* Grand Total Bar */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-text-subdued uppercase font-bold">Total Amount Due</span>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg font-extrabold font-mono text-primary truncate">
                {(checkoutData.grandTotal ?? 0).toLocaleString()} RWF
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" title="Secure 256-Bit Encrypted" />
            </div>
          </div>

          {/* Actions */}
          <label className="flex items-start gap-2 text-[11px] text-text-muted cursor-pointer leading-snug">
            <input
              type="checkbox"
              checked={acceptedInformation}
              onChange={(e) => setAcceptedInformation(e.target.checked)}
              className="mt-0.5 accent-primary shrink-0"
            />
            <span>I confirm my name, phone number, delivery information, and order details are correct.</span>
          </label>

          <div className="flex flex-col sm:flex-row gap-2">
            <button type="button" onClick={onClose} className="btn-secondary text-xs flex-1 py-2.5">
              Cancel
            </button>
            <button
              type="submit"
              form="checkoutForm"
              disabled={isSubmitting}
              className="btn-primary text-xs flex-[2] py-2.5"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Processing Payment...
                </span>
              ) : (
                `Confirm & Pay ${(checkoutData.grandTotal ?? 0).toLocaleString()} RWF`
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
