import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Phone, Clock, ChefHat, Bike, CheckCircle2, ShieldCheck, FileText } from 'lucide-react';
import L from 'leaflet';
import ReceiptModal from '../../components/customer/ReceiptModal';

export default function LiveTracking({ order }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const riderMarkerRef = useRef(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Kigali Coordinates
  const restaurantCoords = [-1.9441, 30.0619]; // HotPot Delights HQ
  const deliveryCoords = [-1.9360, 30.0820];   // Nyarutarama Delivery Spot

  // Reactive step calculation based on order status
  const currentStep = 
    order?.status === 'pending' ? 1 :
    order?.status === 'preparing' ? 2 :
    order?.status === 'delivery' ? 3 : 4;

  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstanceRef.current) return; // already initialized

    const map = L.map(mapRef.current).setView(restaurantCoords, 14);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Restaurant Marker
    const restIcon = L.divIcon({
      className: 'custom-leaflet-icon',
      html: '<div style="background:#AE3200;color:white;padding:5px 10px;border-radius:20px;font-weight:bold;font-size:12px;border:2px solid white;box-shadow:0 4px 10px rgba(0,0,0,0.5)">🍲 HotPot HQ</div>'
    });
    L.marker(restaurantCoords, { icon: restIcon }).addTo(map).bindPopup('<b>HotPot Delights Kitchen</b>').openPopup();

    // Destination Marker
    const destIcon = L.divIcon({
      className: 'custom-leaflet-icon',
      html: '<div style="background:#128731;color:white;padding:5px 10px;border-radius:20px;font-weight:bold;font-size:12px;border:2px solid white;box-shadow:0 4px 10px rgba(0,0,0,0.5)">🏠 Delivery Spot</div>'
    });
    L.marker(deliveryCoords, { icon: destIcon }).addTo(map).bindPopup('<b>Your Delivery Address</b>');

    // Route Polyline
    L.polyline([restaurantCoords, deliveryCoords], {
      color: '#AE3200',
      weight: 4,
      dashArray: '8, 8',
      opacity: 0.8
    }).addTo(map);

    // Rider Marker
    const riderIcon = L.divIcon({
      className: 'custom-leaflet-icon',
      html: '<div class="pin-rider">🛵 Eric (Delivery Rider)</div>'
    });
    
    // Position rider halfway along route
    const midLat = (restaurantCoords[0] + deliveryCoords[0]) / 2;
    const midLng = (restaurantCoords[1] + deliveryCoords[1]) / 2;
    riderMarkerRef.current = L.marker([midLat, midLng], { icon: riderIcon }).addTo(map);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const steps = [
    { num: 1, label: 'Order Received', desc: 'Payment confirmed & sent to kitchen' },
    { num: 2, label: 'Kitchen Preparation', desc: 'Broth simmered & fresh hotpot packed' },
    { num: 3, label: 'Out for Delivery', desc: 'Rider Eric is en route to your address' },
    { num: 4, label: 'Delivered', desc: 'Enjoy your hot meal!' }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-surface-card border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge-tag badge-primary">LIVE ORDER TRACKING</span>
            <span className="text-xs font-mono font-bold text-amber-400">Order #{order?.id || 'HP-100231'}</span>
          </div>
          <h2 className="text-2xl font-black text-text-main mt-1">Order in Progress</h2>
          <p className="text-xs text-text-muted">Estimated arrival in Kigali: 15-20 minutes</p>
        </div>

        <div className="flex items-center gap-3">
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

      {/* Grid: Map + Stepper */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Leaflet Map */}
        <div className="lg:col-span-2 h-96 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">
          <div ref={mapRef} className="w-full h-full" />
          
          <div className="absolute top-4 left-4 z-[400] bg-surface-dark/90 backdrop-blur-md p-3 rounded-xl border border-white/10 text-xs space-y-1">
            <div className="font-bold text-text-main flex items-center gap-1.5">
              <Bike className="w-4 h-4 text-primary" />
              Delivery Rider: Eric Mugisha
            </div>
            <div className="text-[11px] text-text-muted">Vehicle: Hero TVS Motorcycle • RAC 482B</div>
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
            <div>{order?.address || 'KG 9 Ave, Nyarutarama, Kigali'}</div>
          </div>
        </div>
      </div>

      <ReceiptModal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        order={order}
      />
    </div>
  );
}
