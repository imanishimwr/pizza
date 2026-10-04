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
const MOMO_NAME = 'HotPot Delights Ltd';

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
  const subtotal = items.reduce((s, i) => s + (Number(i?.meal?.price) || 0) * (Number(i?.quantity) || 0), 0);
  const grandTotal = subtotal + DELIVERY_FEE;

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
      const fullAddress = addressDetail.trim();
      const payload = {
        items: items.map((i) => ({
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
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', color: 'var(--text-main)' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(18,18,24,0.96)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12
      }}>
        <button
          type="button"
          onClick={() => step === 'details' ? navigate('/') : setStep(step === 'proof' ? 'payment' : 'details')}
          style={{
            padding: '8px', borderRadius: 10, background: 'transparent', border: 'none',
            color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center'
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Flame size={20} color="var(--primary)" />
          <span style={{ fontWeight: 800, color: 'white', fontSize: 17 }}>Secure Checkout</span>
        </div>
        {/* Step indicators */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
                  border: `2px solid ${i <= stepIdx ? 'var(--primary)' : 'rgba(255,255,255,0.15)'}`,
                  background: i < stepIdx ? 'var(--primary)' : i === stepIdx ? 'rgba(var(--primary-rgb),0.15)' : 'transparent',
                  color: i < stepIdx ? 'white' : i === stepIdx ? 'var(--primary)' : 'rgba(255,255,255,0.3)'
                }}>
                  {i < stepIdx ? <Check size={12} /> : i + 1}
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: i <= stepIdx ? 'var(--primary)' : 'rgba(255,255,255,0.3)', display: 'none' }}
                  className="sm-show">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ width: 28, height: 2, borderRadius: 2, background: i < stepIdx ? 'var(--primary)' : 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
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
            <div style={{
              padding: '12px 16px', borderRadius: 12, marginBottom: 20,
              background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
              color: '#fca5a5', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'flex-start', gap: 8
            }} role="alert">
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Details */}
          {step === 'details' && (
            <form onSubmit={handleProceedToPayment} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ padding: 24, borderRadius: 20, background: 'var(--surface-dark)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 18 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <User size={16} color="var(--primary)" /> Delivery Details
                </h2>

                <div>
                  <label htmlFor="co-name" style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 6 }}>Full Name</label>
                  <input id="co-name" type="text" autoComplete="name" required value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)} placeholder="Your full name"
                    style={{ width: '100%', background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box' }} />
                </div>

                <div>
                  <label htmlFor="co-phone" style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 6 }}>Rwanda Phone Number</label>
                  <input id="co-phone" type="tel" autoComplete="tel" required inputMode="tel"
                    pattern="0(78|79|72|73)[0-9]{7}" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0788000001"
                    style={{ width: '100%', background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box' }} />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Delivery Address</label>
                    <button type="button" onClick={handleScanGps} disabled={isScanningGps} style={{
                      padding: '4px 10px', borderRadius: 8, background: 'rgba(var(--primary-rgb,255,140,0),0.15)',
                      border: '1px solid rgba(var(--primary-rgb,255,140,0),0.4)', color: 'var(--primary)',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                      opacity: isScanningGps ? 0.6 : 1
                    }}>
                      {isScanningGps ? <><Loader2 size={12} className="spinning" /> Scanning…</> : <><MapPin size={12} /> Scan GPS</>}
                    </button>
                  </div>
                  <input type="text" autoComplete="street-address" required value={addressDetail}
                    onChange={(e) => setAddressDetail(e.target.value)} placeholder="Street / Landmark (e.g. KG 9 Ave, House 42)"
                    style={{ width: '100%', background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box' }} />
                </div>

                <div>
                  <label htmlFor="co-notes" style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 6 }}>Kitchen Notes (optional)</label>
                  <textarea id="co-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Extra spicy, no coriander…"
                    style={{ width: '100%', background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box', resize: 'none' }} />
                </div>
              </div>

              <button type="submit" disabled={creating} className="btn-primary" style={{
                width: '100%', padding: '16px 24px', borderRadius: 14, fontSize: 15, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 8px 32px rgba(var(--primary-rgb,255,140,0),0.3)',
                opacity: creating ? 0.7 : 1, cursor: creating ? 'not-allowed' : 'pointer'
              }}>
                {creating
                  ? <><Loader2 size={20} className="spinning" /> Creating Order…</>
                  : <><ChevronRight size={20} /> Proceed to Payment — {rwf(grandTotal)} RWF</>}
              </button>
            </form>
          )}

          {/* STEP 2: Payment Instructions */}
          {step === 'payment' && placedOrder && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ padding: 24, borderRadius: 20, background: 'var(--surface-dark)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Smartphone size={22} color="#f59e0b" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: 0 }}>MTN Mobile Money Payment</h2>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>Order #{placedOrder.id} is reserved and waiting for your payment.</p>
                  </div>
                </div>

                {/* Payment details */}
                <div style={{ padding: 16, borderRadius: 14, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#f59e0b', margin: 0 }}>Payment Details</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--text-subdued)', display: 'block' }}>Amount to Send</span>
                      <span style={{ fontSize: 22, fontWeight: 900, color: '#fcd34d', fontFamily: 'monospace' }}>{rwf(grandTotal)} RWF</span>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--text-subdued)', display: 'block' }}>MoMo Number</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: 'white', fontFamily: 'monospace' }}>{MOMO_NUMBER}</span>
                        <button type="button" onClick={copyMoMo} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#34d399' : 'var(--text-muted)', padding: 4, borderRadius: 6 }}>
                          {copied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-subdued)', display: 'block' }}>Account Name</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{MOMO_NAME}</span>
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', margin: 0 }}>How to Pay</p>
                  {[
                    'Dial *182# or open your MTN MoMo app',
                    'Select "Transfer" → "Send Money"',
                    `Enter MoMo number: ${MOMO_NUMBER} (${MOMO_NAME})`,
                    `Enter amount: ${rwf(grandTotal)} RWF`,
                    'Enter your PIN to confirm the transfer',
                    'Screenshot the confirmation message',
                  ].map((instruction, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(var(--primary-rgb,255,140,0),0.18)', color: 'var(--primary)', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{instruction}</span>
                    </div>
                  ))}
                </div>

                <div style={{ padding: 12, borderRadius: 12, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <Info size={16} color="#60a5fa" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 12, color: '#93c5fd', margin: 0 }}>
                    Your order is reserved but <strong>will not be sent to the kitchen</strong> until your payment proof is uploaded and verified. This usually takes under 5 minutes.
                  </p>
                </div>
              </div>

              <button type="button" onClick={handleProceedToProof} className="btn-primary" style={{
                width: '100%', padding: '16px 24px', borderRadius: 14, fontSize: 15, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 8px 32px rgba(var(--primary-rgb,255,140,0),0.3)', cursor: 'pointer'
              }}>
                <Upload size={20} /> I've Paid — Upload Proof
              </button>
            </div>
          )}

          {/* STEP 3: Upload Proof */}
          {step === 'proof' && placedOrder && !uploadDone && (
            <form onSubmit={handleSubmitProof} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ padding: 24, borderRadius: 20, background: 'var(--surface-dark)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(var(--primary-rgb,255,140,0),0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Upload size={22} color="var(--primary)" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: 0 }}>Upload Payment Proof</h2>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>Upload a screenshot of your MTN MoMo confirmation for Order #{placedOrder.id}.</p>
                  </div>
                </div>

                {/* Drop zone */}
                <label htmlFor="proof-upload" style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  minHeight: 200, borderRadius: 16, border: `2px dashed ${proofPreview ? 'var(--primary)' : 'rgba(255,255,255,0.18)'}`,
                  background: proofPreview ? 'rgba(var(--primary-rgb,255,140,0),0.04)' : 'var(--surface-card)',
                  cursor: 'pointer', transition: 'all 0.2s', overflow: 'hidden', position: 'relative'
                }}>
                  {proofPreview ? (
                    <>
                      <img src={proofPreview} alt="Payment proof preview" style={{ width: '100%', maxHeight: 280, objectFit: 'contain', borderRadius: 12 }} />
                      <button type="button" onClick={(e) => { e.preventDefault(); setProofFile(null); setProofPreview(null); }} style={{
                        position: 'absolute', top: 8, right: 8, padding: 6, borderRadius: '50%',
                        background: 'rgba(220,38,38,0.85)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex'
                      }}><X size={14} /></button>
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '8px', textAlign: 'center' }}>
                        <span style={{ fontSize: 12, color: '#34d399', fontWeight: 600 }}>✓ Image selected — click to change</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 32, textAlign: 'center' }}>
                      <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(var(--primary-rgb,255,140,0),0.1)', border: '1px solid rgba(var(--primary-rgb,255,140,0),0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ImageIcon size={32} color="rgba(var(--primary-rgb,255,140,0),0.6)" />
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)', margin: '0 0 4px' }}>Click to upload proof</p>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>JPEG, PNG, GIF or WebP · Max 5 MB</p>
                      </div>
                      <div style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(var(--primary-rgb,255,140,0),0.18)', border: '1px solid rgba(var(--primary-rgb,255,140,0),0.35)', color: 'var(--primary)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Upload size={14} /> Browse Files
                      </div>
                    </div>
                  )}
                  <input id="proof-upload" type="file" accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleFileChange} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                </label>

                <div style={{ padding: 12, borderRadius: 12, background: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Shield size={15} color="#34d399" /> Your proof is secure
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Only our kitchen staff can view your payment screenshot. It is never shared publicly.</p>
                </div>
              </div>

              <button type="submit" disabled={uploading || !proofFile} className="btn-primary" style={{
                width: '100%', padding: '16px 24px', borderRadius: 14, fontSize: 15, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 8px 32px rgba(var(--primary-rgb,255,140,0),0.3)',
                opacity: uploading || !proofFile ? 0.6 : 1, cursor: uploading || !proofFile ? 'not-allowed' : 'pointer'
              }}>
                {uploading ? <><Loader2 size={20} className="spinning" /> Submitting…</> : <><CheckCircle2 size={20} /> Submit Payment Proof &amp; Place Order</>}
              </button>
              <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-subdued)' }}>
                Already submitted?{' '}
                <button type="button" onClick={() => navigate('/hotpotcustomer/tracking')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }}>
                  Track your order
                </button>
              </p>
            </form>
          )}

          {/* SUCCESS */}
          {step === 'proof' && uploadDone && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ padding: 32, borderRadius: 20, background: 'var(--surface-dark)', border: '1px solid rgba(52,211,153,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={40} color="#34d399" />
                </div>
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 900, color: 'white', margin: 0 }}>Order Confirmed!</h2>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>Order #{placedOrder?.id}</p>
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0, maxWidth: 380 }}>
                  Your payment proof has been received. Our kitchen team will verify it shortly and begin preparing your order. You can track the status in real time below.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
                  <Clock size={14} color="#f59e0b" />
                  <span style={{ fontSize: 12, color: '#fbbf24', fontWeight: 600 }}>Avg verification: ~5 min</span>
                </div>
              </div>
              <button type="button" onClick={() => navigate('/hotpotcustomer/tracking')} className="btn-primary" style={{
                width: '100%', padding: '16px 24px', borderRadius: 14, fontSize: 15, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 8px 32px rgba(var(--primary-rgb,255,140,0),0.3)', cursor: 'pointer'
              }}>
                <ChevronRight size={20} /> Track My Order Live
              </button>
              <button type="button" onClick={() => navigate('/')} className="btn-secondary" style={{
                width: '100%', padding: '12px 24px', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer'
              }}>
                Back to Menu
              </button>
            </div>
          )}
        </div>

        {/* ORDER SUMMARY SIDEBAR */}
        <div style={{ position: 'sticky', top: 80 }}>
          <div style={{ padding: 20, borderRadius: 20, background: 'var(--surface-dark)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingBag size={16} color="var(--primary)" /> Order Summary
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 280, overflowY: 'auto' }}>
              {items.map((item, idx) => {
                const price = Number(item?.meal?.price) || 0;
                const qty = Number(item?.quantity) || 1;
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    {item.meal?.image
                      ? <img src={item.meal.image} alt={item.meal.name} style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                      : <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(0,0,0,0.3)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShoppingBag size={16} color="rgba(255,255,255,0.3)" /></div>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.meal?.name || 'Item'}</p>
                      {item.selectedSpice && <p style={{ fontSize: 10, color: '#fb923c', margin: '2px 0 0' }}>🌶 {item.selectedSpice}</p>}
                      {item.selectedBroth && <p style={{ fontSize: 10, color: '#fbbf24', margin: '2px 0 0' }}>Broth: {item.selectedBroth}</p>}
                      <p style={{ fontSize: 10, color: 'var(--text-subdued)', margin: '2px 0 0' }}>x{qty} @ {rwf(price)} RWF</p>
                    </div>
                    <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-main)', flexShrink: 0 }}>{rwf(price * qty)}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[['Subtotal', `${rwf(subtotal)} RWF`], ['Kigali Delivery', `${rwf(DELIVERY_FEE)} RWF`]].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                  <span>{label}</span><span style={{ fontFamily: 'monospace' }}>{val}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 900, color: 'var(--text-main)', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <span>Total</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{rwf(grandTotal)} RWF</span>
              </div>
            </div>

            {placedOrder && (
              <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', fontSize: 12, color: '#34d399', fontWeight: 600, textAlign: 'center' }}>
                ✓ Order #{placedOrder.id} created
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: 'var(--text-subdued)' }}>
              <Shield size={12} color="#34d399" />
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
