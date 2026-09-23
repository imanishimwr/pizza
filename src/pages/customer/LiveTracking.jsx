import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Phone, Clock, ChefHat, Bike, CheckCircle2, ShieldCheck, FileText, AlertTriangle, Edit3, XCircle, Star, Heart } from 'lucide-react';
import L from 'leaflet';
import ReceiptModal from '../../components/customer/ReceiptModal';
import PostDeliveryFeedbackModal from '../../components/customer/PostDeliveryFeedbackModal';

export default function LiveTracking({ order, onCancelOrder, onModifyOrder }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const riderMarkerRef = useRef(null);
  const animationFrameRef = useRef(null);

  const [showReceipt, setShowReceipt] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [customNote, setCustomNote] = useState(order?.items?.[0]?.specialNote || '');
  const [riderSpeed, setRiderSpeed] = useState('38 km/h');
  const [riderDistanceRemaining, setRiderDistanceRemaining] = useState('1.8 km');

  // Time-lock for cancellation (2 minutes = 120s grace window from order creation)
  const orderTimeMs = order?.createdAtTimestamp || Date.now();
  const [secondsRemaining, setSecondsRemaining] = useState(() => {
    const elapsedSec = Math.floor((Date.now() - orderTimeMs) / 1000);
    return Math.max(0, 120 - elapsedSec);
  });

  // Exact Hot Pot Kigali Coordinates from Google Maps (-1.97022762, 30.12498964)
  const restaurantCoords = useMemo(() => [-1.97022762, 30.12498964], []);

  // Dynamic Client Delivery Coordinates: real GPS from the scanned order,
// otherwise the exact GPS embedded in the delivery address
const deliveryCoords = useMemo(() => {
    if (order?.lat && order?.lng) return [Number(order.lat), Number(order.lng)];
    const gpsMatch = String(order?.deliveryAddress || order?.address || '').match(/GPS:\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)/i);
    if (gpsMatch) return [Number(gpsMatch[1]), Number(gpsMatch[2])];
    return restaurantCoords; // no real location on record; keep map centered on origin
  }, [order, restaurantCoords]);

  // Reactive step calculation based on order status (5 full steps)
  const currentStep = 
    order?.status === 'cancelled' ? 0 :
    order?.status === 'pending' ? 1 :
    order?.status === 'preparing' ? 2 :
    order?.status === 'ready' ? 3 :
    order?.status === 'delivery' || order?.status === 'delivering' ? 4 : 5;

  const canCancelOrModify = currentStep === 1 && secondsRemaining > 0;

  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsRemaining]);

  // Leaflet Map & Live Rider GPS Tracking Simulation
  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current).setView(restaurantCoords, 14);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Restaurant Marker (Hot Pot Kigali HQ)
    const restIcon = L.divIcon({
      className: 'custom-leaflet-icon',
      html: '<div style="background:#AE3200;color:white;padding:5px 12px;border-radius:20px;font-weight:bold;font-size:12px;border:2px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.6);white-space:nowrap">🍲 Hot Pot Kigali HQ</div>'
    });
    L.marker(restaurantCoords, { icon: restIcon }).addTo(map).bindPopup('<b>Hot Pot Kigali Restaurant HQ</b><br/>Origin Kitchen: -1.970228, 30.124990').openPopup();

    // Client Destination Marker
    const destIcon = L.divIcon({
      className: 'custom-leaflet-icon',
      html: '<div style="background:#128731;color:white;padding:5px 12px;border-radius:20px;font-weight:bold;font-size:12px;border:2px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.6);white-space:nowrap">🏠 ' + (order?.customerName || 'Your Location') + '</div>'
    });
    L.marker(deliveryCoords, { icon: destIcon }).addTo(map).bindPopup('<b>' + (order?.deliveryAddress || 'Client Delivery Address') + '</b>');

    // Route Polyline connecting Hot Pot Kigali to the Client
    L.polyline([restaurantCoords, deliveryCoords], {
      color: '#AE3200',
      weight: 4,
      dashArray: '8, 8',
      opacity: 0.85
    }).addTo(map);

    // Automatically fit map view to show entire route
    map.fitBounds([restaurantCoords, deliveryCoords], { padding: [40, 40] });

    // Rider Marker
    const riderIcon = L.divIcon({
      className: 'custom-leaflet-icon',
      html: '<div class="pin-rider" style="background:#2563eb;color:white;padding:4px 10px;border-radius:15px;font-size:11px;font-weight:bold;box-shadow:0 4px 12px rgba(0,0,0,0.6);border:2px solid #60a5fa;white-space:nowrap">🛵 Moto Express Courier (GPS Live)</div>'
    });

    const startLat = restaurantCoords[0];
    const startLng = restaurantCoords[1];
    const endLat = deliveryCoords[0];
    const endLng = deliveryCoords[1];

    riderMarkerRef.current = L.marker([startLat, startLng], { icon: riderIcon }).addTo(map);

    // Dynamic Live GPS Animation loop from Hot Pot Kigali to Client
    let progress = currentStep >= 4 ? 0.45 : 0.05;
    let direction = 1;

    const animateRider = () => {
      if (currentStep >= 4) {
        progress += 0.0008 * direction;
        if (progress >= 0.95) direction = -1;
        if (progress <= 0.05) direction = 1;
      }

      const currentLat = startLat + (endLat - startLat) * progress;
      const currentLng = startLng + (endLng - startLng) * progress;

      if (riderMarkerRef.current) {
        riderMarkerRef.current.setLatLng([currentLat, currentLng]);
      }

      const distLeft = ((1 - progress) * (order?.distanceKm || 3.8)).toFixed(1);
      setRiderDistanceRemaining(`${distLeft} km`);
      setRiderSpeed(currentStep >= 4 ? `${Math.floor(34 + Math.random() * 10)} km/h` : '0 km/h (At Store)');

      animationFrameRef.current = requestAnimationFrame(animateRider);
    };

    animationFrameRef.current = requestAnimationFrame(animateRider);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [order?.distanceKm]);

  const steps = [
    { num: 1, label: 'Order Received', desc: 'Payment confirmed & sent to kitchen' },
    { num: 2, label: 'In Kitchen Cooking', desc: 'Cooker simmering broths & assembling items' },
    { num: 3, label: 'Cooker Confirmed Ready', desc: 'Freshly prepared & packaged for pickup' },
    { num: 4, label: 'Out for Delivery', desc: 'Kigali moto rider en route to your address' },
    { num: 5, label: 'Delivered', desc: 'Enjoy your hot meal!' }
  ];

  const handleSaveNote = () => {
    if (onModifyOrder && order) {
      onModifyOrder(order.id, { specialInstruction: customNote });
    }
    setIsEditingNote(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Cancelled Banner */}
      {order?.status === 'cancelled' && (
        <div className="p-6 rounded-2xl bg-red-950/80 border border-red-500/50 text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <XCircle className="w-8 h-8 text-red-400 shrink-0" />
            <div>
              <h3 className="font-bold text-lg text-red-200">Order #{order.id} Cancelled</h3>
              <p className="text-xs text-red-300">This order has been cancelled and refunded if payment was processed.</p>
            </div>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-surface-card border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge-tag badge-primary">LIVE ORDER TRACKING</span>
            <span className="text-xs font-mono font-bold text-amber-400">Order #{order?.id || 'HP-100231'}</span>
          </div>
          <h2 className="text-2xl font-black text-text-main mt-1">
            {order?.status === 'cancelled' ? 'Order Cancelled' : order?.status === 'delivered' ? 'Order Delivered!' : 'Order in Progress'}
          </h2>
          <p className="text-xs text-text-muted">
            {order?.etaTime ? `Estimated Arrival by ${order.etaTime} (${order.etaMinutes || 20} mins total)` : 'Estimated arrival in Kigali: 15-20 minutes'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {currentStep === 4 && (
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-500 border-emerald-400"
            >
              <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
              Rate Rider & Tip
            </button>
          )}

          <button
            onClick={() => setShowReceipt(true)}
            className="btn-secondary text-xs"
          >
            <FileText className="w-3.5 h-3.5 text-primary" />
            View Receipt
          </button>
          
          <a
            href="tel:0781122334"
            className="btn-primary text-xs"
          >
            <Phone className="w-3.5 h-3.5" />
            Call Rider (0781122334)
          </a>
        </div>
      </div>

      {/* Order Grace Window Controls (Cancellation & Modification) */}
      {order?.status !== 'cancelled' && (
        <div className="p-4 rounded-2xl bg-surface-card border border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                Order Grace Window
                {canCancelOrModify ? (
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                    {Math.floor(secondsRemaining / 60)}:{(secondsRemaining % 60).toString().padStart(2, '0')} remaining
                  </span>
                ) : (
                  <span className="text-[10px] text-text-subdued font-normal">(Kitchen in progress - Lock active)</span>
                )}
              </div>
              <p className="text-[11px] text-text-muted">
                {canCancelOrModify
                  ? 'You can modify instructions or cancel your order within 2 minutes of placing it.'
                  : 'Kitchen has accepted your order. Modifications are now locked.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditingNote(!isEditingNote)}
              disabled={!canCancelOrModify}
              className={`btn-secondary text-xs ${!canCancelOrModify ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              Modify Note
            </button>

            <button
              onClick={() => onCancelOrder && onCancelOrder(order.id)}
              disabled={!canCancelOrModify}
              className={`btn-secondary text-xs text-red-400 hover:bg-red-950/50 border-red-500/30 ${!canCancelOrModify ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <XCircle className="w-3.5 h-3.5 text-red-400" />
              Cancel Order
            </button>
          </div>
        </div>
      )}

      {/* Editable Note Overlay */}
      {isEditingNote && (
        <div className="p-4 rounded-xl bg-black/60 border border-amber-500/40 space-y-3 animate-fade-in">
          <label className="text-xs font-bold text-amber-300 block">Modify Kitchen Special Instructions:</label>
          <input
            type="text"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="e.g. Extra hot chili sauce, deliver to back gate"
            className="w-full bg-surface-card border border-white/10 rounded-lg p-2.5 text-xs text-white"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setIsEditingNote(false)} className="btn-secondary text-xs px-3 py-1.5">Cancel</button>
            <button onClick={handleSaveNote} className="btn-primary text-xs px-4 py-1.5">Save Changes</button>
          </div>
        </div>
      )}

      {/* Grid: Map + Stepper */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Leaflet Map with Live Rider GPS */}
        <div className="lg:col-span-2 h-96 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">
          <div ref={mapRef} className="w-full h-full" />
          
          <div className="absolute top-4 left-4 z-[400] bg-surface-dark/95 backdrop-blur-md p-3 rounded-xl border border-white/10 text-xs space-y-1.5 shadow-xl max-w-xs">
            <div className="font-bold text-text-main flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5">
                <Bike className="w-4 h-4 text-primary animate-bounce" />
                {order?.riderName || 'Your Rider'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono font-bold">
                GPS LIVE
              </span>
            </div>
            <div className="text-[11px] text-text-muted">Vehicle: Hero TVS • RAC 482B</div>
            
            <div className="pt-1.5 border-t border-white/10 space-y-1 text-[11px]">
              <div className="flex items-center gap-1.5 text-orange-400 font-bold">
                <span>📍 Origin Kitchen:</span>
                <span className="text-white font-normal">HotPot Delights HQ (Nyarutarama)</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span>🏠 Client Destination:</span>
                <span className="text-white font-normal truncate">{order?.address || 'Address pending'}</span>
              </div>
            </div>

            <div className="pt-1 border-t border-white/10 flex items-center gap-3 text-[10px] font-mono text-amber-400">
              <span>Speed: {riderSpeed}</span>
              <span>Distance left: {riderDistanceRemaining}</span>
            </div>
          </div>
        </div>

        {/* Stepper Status Sidebar */}
        <div className="p-6 rounded-2xl bg-surface-card border border-white/10 space-y-6 flex flex-col justify-between">
          <h3 className="text-base font-bold text-text-main flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Order Timeline
          </h3>

          <div className="space-y-5 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-white/10">
            {steps.map((step) => {
              const isDone = currentStep >= step.num;
              const isCurrent = currentStep === step.num;
              return (
                <div key={step.num} className="relative flex items-start gap-4">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs relative z-10 transition-all ${
                    isDone
                      ? 'bg-primary text-white shadow-md shadow-primary/40'
                      : 'bg-surface-dark text-text-subdued border border-white/10'
                  }`}>
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : step.num}
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold ${isCurrent ? 'text-primary' : isDone ? 'text-text-main' : 'text-text-subdued'}`}>
                      {step.label}
                    </h4>
                    <p className="text-[11px] text-text-muted mt-0.5">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-[11px] text-text-muted space-y-1">
            <div className="font-bold text-text-main">Delivery Address:</div>
            <div>{order?.address || 'Address pending'}</div>
            {order?.specialInstruction && (
              <div className="text-amber-300 font-semibold pt-1">Note: "{order.specialInstruction}"</div>
            )}
          </div>
        </div>
      </div>

      <ReceiptModal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        order={order}
      />

      <PostDeliveryFeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        order={order}
      />
    </div>
  );
}
