import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ShoppingBag, MapPin, Phone, User, Upload, Image as ImageIcon,
  CheckCircle2, AlertCircle, Loader2, Smartphone, X, Flame, Shield,
  Info, FileText, ChevronRight, Clock, Copy, Check
} from 'lucide-react';
import { uploadPaymentProof, createOrder, session } from '../../services/apiService';

const DELIVERY_FEE = 1500;
const rwf = (v) => Number(v || 0).toLocaleString();
const validatePhone = (num) => /^(078|079|072|073)\d{7}$/.test(String(num || '').replace(/\s+/g, ''));



const MOMO_NUMBER = '0785000001';
const MOMO_NAME = 'HotPot Ltd';

const STEPS = [
  { id: 'details', label: 'Your Details' },
  { id: 'payment', label: 'Payment' },
  { id: 'proof', label: 'Upload Proof' },
];

export default function CheckoutPage({ cart, user, onOrderPlaced, onCartClear }) {
  const navigate = useNavigate();
  const [step, setStep] = useState('details');
  const [placedOrder, setPlacedOrder] = useState(null);

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [notes, setNotes] = useState('');
  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [isScanningGps, setIsScanningGps] = useState(false);
  const geoReqId = useRef(0);

  const [creating, setCreating] = useState(false);

  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [copied, setCopied] = useState(false);

  const [error, setError] = useState('');

  const items = Array.isArray(cart) ? cart : [];
  const [frozenItems, setFrozenItems] = useState(null);
  const displayItems = frozenItems || items;
  const subtotal = displayItems.reduce((s, i) => s + (Number(i?.meal?.price) || 0) * (Number(i?.quantity) || 0), 0);
  const grandTotal = placedOrder?.totalRWF ? Number(placedOrder.totalRWF) : (subtotal + DELIVERY_FEE);

  useEffect(() => {
    if (items.length === 0 && !placedOrder) navigate('/');
  }, [items.length, placedOrder, navigate]);

  const copyMoMo = useCallback(() => {
    navigator.clipboard?.writeText(MOMO_NUMBER).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  const handleScanGps = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported.'); return; }
    setIsScanningGps(true);
    setError('');
    geoReqId.current += 1;
    const id = geoReqId.current;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (id !== geoReqId.current) return;
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoords({ lat, lng });
        setIsScanningGps(false);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          if (id !== geoReqId.current) return;
          const road = data.address?.road || data.address?.suburb || '';
          const city = data.address?.city || data.address?.town || 'Kigali';
          setAddressDetail(`${road}, ${city} (GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        } catch {
          if (id !== geoReqId.current) return;
          setAddressDetail(`GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
      },
      (err) => {
        if (id !== geoReqId.current) return;
        setIsScanningGps(false);
        setError(`Location denied (${err?.message}). Enter address manually.`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleProceedToPayment = async (e) => {
    e.preventDefault();
    setError('');
    if (!customerName.trim()) { setError('Please enter your full name.'); return; }
    if (!validatePhone(phone)) { setError('Enter a valid Rwanda phone number (078/079/072/073 + 7 digits).'); return; }
    if (!addressDetail.trim()) { setError('Please enter your delivery address.'); return; }

    setCreating(true);
    try {
      const orderItems = [...items];
      setFrozenItems(orderItems);
      const fullAddress = addressDetail.trim();
      const payload = {
        items: orderItems.map((i) => ({
          id: i.meal?.id || i.id,
          name: i.meal?.name || i.name,
          qty: Number(i.quantity) || 1,
          price: Number(i.meal?.price ?? i.price) || 0,
          spice: i.selectedSpice || null,
          broth: i.selectedBroth || null,
          specialNote: i.specialNote || ''
        })),
        customerName: customerName.trim(),
        phone: phone.replace(/\s+/g, ''),
        address: fullAddress,
        lat: coords.lat || null,
        lng: coords.lng || null,
        orderType: 'delivery',
        notes: notes.trim() || null,
        paymentMethod: 'MTN Mobile Money',
        distanceKm: 5 // Default distance if needed
      };
      const order = await createOrder(payload);
      setPlacedOrder(order);
      if (onOrderPlaced) onOrderPlaced(order);
      if (onCartClear) onCartClear();
      setStep('payment');
    } catch (err) {
      setError(err?.message || 'Could not place your order. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleProceedToProof = () => { setError(''); setStep('proof'); };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      setError('Only JPEG, PNG, GIF or WebP images are accepted.'); return;
    }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be smaller than 5 MB.'); return; }
    setError('');
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setProofPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmitProof = async (e) => {
    e.preventDefault();
    if (!proofFile) { setError('Please select a payment screenshot before submitting.'); return; }
    if (!placedOrder) { setError('Order not found. Please go back.'); return; }
    setError('');
    setUploading(true);
    try {
      await uploadPaymentProof(placedOrder.id, proofFile);
      setUploadDone(true);
    } catch (err) {
      setError(err?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const stepIdx = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F1117] text-slate-800 dark:text-slate-200 transition-colors">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-[#121218]/95 backdrop-blur-md border-b border-slate-200 dark:border-white/10 px-4 py-3 flex items-center gap-3 shadow-xs">
        <button
          type="button"
          onClick={() => step === 'details' ? navigate('/') : setStep(step === 'proof' ? 'payment' : 'details')}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-text-muted dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer flex items-center"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <Flame size={20} className="text-primary" />
          <span className="font-extrabold text-slate-900 dark:text-white text-base">Secure Checkout</span>
        </div>
        {/* Step indicators */}
        <div className="ml-auto flex items-center gap-1">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-6.5 h-6.5 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all ${
                    i <= stepIdx ? 'border-primary' : 'border-slate-300 dark:border-white/15'
                  } ${
                    i < stepIdx
                      ? 'bg-primary text-white'
                      : i === stepIdx
                        ? 'bg-primary/10 dark:bg-primary/20 text-primary'
                        : 'bg-transparent text-slate-400 dark:text-white/30'
                  }`}
                >
                  {i < stepIdx ? <Check size={12} /> : i + 1}
                </div>
                <span className={`text-[11px] font-semibold hidden sm:inline ${i <= stepIdx ? 'text-primary' : 'text-slate-400 dark:text-white/30'}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-7 h-0.5 rounded mx-1 ${i < stepIdx ? 'bg-primary' : 'bg-slate-200 dark:bg-white/10'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 16px', display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}
        className="checkout-grid">
        <div>
          {/* Error */}
          {error && (
            <div className="p-3 sm:p-4 rounded-xl mb-5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-300 text-xs sm:text-sm font-semibold flex items-start gap-2" role="alert">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Details */}
          {step === 'details' && (
            <form onSubmit={handleProceedToPayment} className="flex flex-col gap-5">
              <div className="p-6 rounded-2xl bg-white dark:bg-[#14171F] border border-slate-200 dark:border-white/10 flex flex-col gap-4.5 shadow-sm dark:shadow-xl">
                <h2 className="text-base font-bold text-slate-900 dark:text-white m-0 flex items-center gap-2">
                  <User size={16} className="text-primary" /> Delivery Details
                </h2>

                <div>
                  <label htmlFor="co-name" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-text-muted mb-1.5">Full Name</label>
                  <input id="co-name" type="text" autoComplete="name" required value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)} placeholder="Your full name"
                    className="w-full bg-slate-50 dark:bg-surface-card border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                </div>

                <div>
                  <label htmlFor="co-phone" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-text-muted mb-1.5">Rwanda Phone Number</label>
                  <input id="co-phone" type="tel" autoComplete="tel" required inputMode="tel"
                    pattern="0(78|79|72|73)[0-9]{7}" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0788000001"
                    className="w-full bg-slate-50 dark:bg-surface-card border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-text-muted">Delivery Address</label>
                    <button type="button" onClick={handleScanGps} disabled={isScanningGps} className="px-2.5 py-1 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-primary border border-orange-500/30 text-[11px] font-bold cursor-pointer flex items-center gap-1 transition-all disabled:opacity-60">
                      {isScanningGps ? <><Loader2 size={12} className="spinning" /> Scanning…</> : <><MapPin size={12} /> Scan GPS</>}
                    </button>
                  </div>
                  <input type="text" autoComplete="street-address" required value={addressDetail}
                    onChange={(e) => setAddressDetail(e.target.value)} placeholder="Street / Landmark (e.g. KG 9 Ave, House 42)"
                    className="w-full bg-slate-50 dark:bg-surface-card border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                </div>

                <div>
                  <label htmlFor="co-notes" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-text-muted mb-1.5">Kitchen Notes (optional)</label>
                  <textarea id="co-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Extra spicy, no coriander…"
                    className="w-full bg-slate-50 dark:bg-surface-card border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none" />
                </div>
              </div>

              <button type="submit" disabled={creating} className="btn-primary w-full py-4 px-6 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-primary/25 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed">
                {creating
                  ? <><Loader2 size={20} className="spinning" /> Creating Order…</>
                  : <><ChevronRight size={20} /> Proceed to Payment — {rwf(grandTotal)} RWF</>}
              </button>
            </form>
          )}

          {/* STEP 2: Payment Instructions */}
          {step === 'payment' && placedOrder && (
            <div className="flex flex-col gap-5">
              <div className="p-6 rounded-2xl bg-white dark:bg-[#14171F] border border-slate-200 dark:border-white/10 flex flex-col gap-5 shadow-sm dark:shadow-xl">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                    <Smartphone size={22} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white m-0">MTN Mobile Money Payment</h2>
                    <p className="text-xs text-slate-500 dark:text-text-muted mt-1">Order #{placedOrder.id} is reserved and waiting for your payment.</p>
                  </div>
                </div>

                {/* Payment details */}
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 m-0">Payment Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] text-slate-500 dark:text-text-subdued block">Amount to Send</span>
                      <span className="text-xl font-black text-amber-600 dark:text-amber-300 font-mono">{rwf(grandTotal)} RWF</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 dark:text-text-subdued block">MoMo Number</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">{MOMO_NUMBER}</span>
                        <button type="button" onClick={copyMoMo} className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer">
                          {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[11px] text-slate-500 dark:text-text-subdued block">Account Name</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{MOMO_NAME}</span>
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div className="flex flex-col gap-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-text-muted m-0">How to Pay</p>
                  {[
                    'Dial *182# or open your MTN MoMo app',
                    'Select "Transfer" → "Send Money"',
                    `Enter MoMo number: ${MOMO_NUMBER} (${MOMO_NAME})`,
                    `Enter amount: ${rwf(grandTotal)} RWF`,
                    'Enter your PIN to confirm the transfer',
                    'Screenshot the confirmation message',
                  ].map((instruction, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="w-5.5 h-5.5 rounded-full bg-orange-500/15 text-primary text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <span className="text-xs sm:text-sm text-slate-600 dark:text-text-muted">{instruction}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-start gap-2.5">
                  <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 dark:text-blue-300 m-0 leading-relaxed">
                    Your order is reserved but <strong>will not be sent to the kitchen</strong> until your payment proof is uploaded and verified. This usually takes under 5 minutes.
                  </p>
                </div>
              </div>

              <button type="button" onClick={handleProceedToProof} className="btn-primary w-full py-4 px-6 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-primary/25 cursor-pointer">
                <Upload size={20} /> I've Paid — Upload Proof
              </button>
            </div>
          )}

          {/* STEP 3: Upload Proof */}
          {step === 'proof' && placedOrder && !uploadDone && (
            <form onSubmit={handleSubmitProof} className="flex flex-col gap-5">
              <div className="p-6 rounded-2xl bg-white dark:bg-[#14171F] border border-slate-200 dark:border-white/10 flex flex-col gap-5 shadow-sm dark:shadow-xl">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-orange-500/15 text-primary flex items-center justify-center shrink-0">
                    <Upload size={22} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white m-0">Upload Payment Proof</h2>
                    <p className="text-xs text-slate-500 dark:text-text-muted mt-1">Upload a screenshot of your MTN MoMo confirmation for Order #{placedOrder.id}.</p>
                  </div>
                </div>

                {/* Drop zone */}
                <label htmlFor="proof-upload" className={`flex flex-col items-center justify-center min-h-50 rounded-2xl border-2 border-dashed cursor-pointer transition-all overflow-hidden relative ${
                  proofPreview ? 'border-primary bg-orange-500/5' : 'border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-surface-card hover:border-primary'
                }`}>
                  {proofPreview ? (
                    <>
                      <img src={proofPreview} alt="Payment proof preview" className="w-full max-h-70 object-contain rounded-xl" />
                      <button type="button" onClick={(e) => { e.preventDefault(); setProofFile(null); setProofPreview(null); }} className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600 text-white cursor-pointer shadow-md">
                        <X size={14} />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-xs p-2 text-center">
                        <span className="text-xs text-emerald-400 font-semibold">✓ Image selected — click to change</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-3 p-8 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-primary">
                        <ImageIcon size={32} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-text-main m-0 mb-1">Click to upload proof</p>
                        <p className="text-xs text-slate-500 dark:text-text-muted m-0">JPEG, PNG, GIF or WebP · Max 5 MB</p>
                      </div>
                      <div className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-bold flex items-center gap-1.5">
                        <Upload size={14} /> Browse Files
                      </div>
                    </div>
                  )}
                  <input id="proof-upload" type="file" accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                </label>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-card border border-slate-200 dark:border-white/10 flex flex-col gap-1.5">
                  <p className="text-xs font-bold text-slate-900 dark:text-white m-0 flex items-center gap-1.5">
                    <Shield size={15} className="text-emerald-500" /> Your proof is secure
                  </p>
                  <p className="text-xs text-slate-500 dark:text-text-muted m-0">Only our kitchen staff can view your payment screenshot. It is never shared publicly.</p>
                </div>
              </div>

              <button type="submit" disabled={uploading || !proofFile} className="btn-primary w-full py-4 px-6 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-primary/25 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
                {uploading ? <><Loader2 size={20} className="spinning" /> Submitting…</> : <><CheckCircle2 size={20} /> Submit Payment Proof &amp; Place Order</>}
              </button>
              <p className="text-center text-xs text-slate-400 dark:text-text-subdued">
                Already submitted?{' '}
                <button type="button" onClick={() => navigate('/hotpotcustomer/tracking')} className="text-primary font-semibold underline cursor-pointer">
                  Track your order
                </button>
              </p>
            </form>
          )}

          {/* SUCCESS */}
          {step === 'proof' && uploadDone && (
            <div className="flex flex-col gap-5">
              <div className="p-8 rounded-2xl bg-white dark:bg-[#14171F] border border-emerald-500/30 flex flex-col items-center gap-4 text-center shadow-sm dark:shadow-xl">
                <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <CheckCircle2 size={40} className="text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white m-0">Order Confirmed!</h2>
                  <p className="text-xs text-slate-500 dark:text-text-muted mt-1 font-mono">Order #{placedOrder?.id}</p>
                </div>
                <p className="text-sm text-slate-600 dark:text-text-muted leading-relaxed m-0 max-w-sm">
                  Your payment proof has been received. Our kitchen team will verify it shortly and begin preparing your order. You can track the status in real time below.
                </p>
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25">
                  <Clock size={14} className="text-amber-500" />
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">Avg verification: ~5 min</span>
                </div>
              </div>
              <button type="button" onClick={() => navigate('/hotpotcustomer/tracking')} className="btn-primary w-full py-4 px-6 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-primary/25 cursor-pointer">
                <ChevronRight size={20} /> Track My Order Live
              </button>
              <button type="button" onClick={() => navigate('/')} className="btn-secondary w-full py-3 px-6 rounded-xl text-xs sm:text-sm font-bold cursor-pointer">
                Back to Menu
              </button>
            </div>
          )}
        </div>

        {/* ORDER SUMMARY SIDEBAR */}
        <div style={{ position: 'sticky', top: 80 }}>
          <div className="p-5 rounded-2xl bg-white dark:bg-[#14171F] border border-slate-200 dark:border-white/10 flex flex-col gap-4 shadow-sm dark:shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0 flex items-center gap-2">
              <ShoppingBag size={16} className="text-primary" /> Order Summary
            </h3>

            <div className="flex flex-col gap-2.5 max-h-70 overflow-y-auto">
              {displayItems.map((item, idx) => {
                const price = Number(item?.meal?.price) || 0;
                const qty = Number(item?.quantity) || 1;
                return (
                  <div key={idx} className="flex items-start gap-2.5">
                    {item.meal?.image
                      ? <img src={item.meal.image} alt={item.meal.name} className="w-10.5 h-10.5 rounded-xl object-cover shrink-0 bg-slate-100 dark:bg-black/30" />
                      : <div className="w-10.5 h-10.5 rounded-xl bg-slate-100 dark:bg-black/30 shrink-0 flex items-center justify-center text-slate-400"><ShoppingBag size={16} /></div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-text-main m-0 truncate">{item.meal?.name || 'Item'}</p>
                      {item.selectedSpice && <p className="text-[10px] text-orange-500 m-0 mt-0.5">🌶 {item.selectedSpice}</p>}
                      {item.selectedBroth && <p className="text-[10px] text-amber-500 m-0 mt-0.5">Broth: {item.selectedBroth}</p>}
                      <p className="text-[10px] text-slate-500 dark:text-text-subdued m-0 mt-0.5">x{qty} @ {rwf(price)} RWF</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-text-main shrink-0">{rwf(price * qty)}</span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-slate-200 dark:border-white/10 pt-3 flex flex-col gap-2">
              <div className="flex justify-between text-xs text-slate-500 dark:text-text-muted">
                <span>Subtotal</span><span className="font-mono text-slate-900 dark:text-text-main">{rwf(subtotal)} RWF</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 dark:text-text-muted">
                <span>Kigali Delivery</span><span className="font-mono text-slate-900 dark:text-text-main">{rwf(DELIVERY_FEE)} RWF</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 dark:text-text-main pt-2 border-t border-slate-200 dark:border-white/10">
                <span>Total</span>
                <span className="font-mono text-primary text-base">{rwf(grandTotal)} RWF</span>
              </div>
            </div>

            {placedOrder && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-600 dark:text-emerald-400 font-semibold text-center">
                ✓ Order #{placedOrder.id} created
              </div>
            )}

            <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-text-subdued">
              <Shield size={12} className="text-emerald-500" />
              <span>Secured with TLS · Payment proof encrypted at rest</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .checkout-grid { grid-template-columns: 3fr 2fr !important; }
        }
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
