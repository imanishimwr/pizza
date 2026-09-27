import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  MapPin, Phone, Clock, ChefHat, Bike, CheckCircle2,
  ShieldCheck, FileText, AlertTriangle, Edit3, XCircle,
  Star, Heart, Download, ThumbsUp, Navigation, Compass,
  Gauge, Radio, ExternalLink, Sparkles, MessageCircle, User, Hash
} from 'lucide-react';
import L from 'leaflet';
import ReceiptModal from '../../components/customer/ReceiptModal';
import PostDeliveryFeedbackModal from '../../components/customer/PostDeliveryFeedbackModal';
import { downloadOrderReceiptPdf } from '../../utils/receiptGenerator';
import {
  RESTAURANT_COORDINATES,
  resolveKigaliCoordinates,
  calculateBearing,
  calculateHaversineDistance,
  darkGoogleMapStyle,
  loadGoogleMapsPlatform
} from '../../utils/googleMapsLoader';
import { io } from 'socket.io-client';

export default function LiveTracking({ order, onCancelOrder, onModifyOrder, onUpdateStatus }) {
  const mapContainerRef = useRef(null);
  const googleMapInstanceRef = useRef(null);
  const leafletMapInstanceRef = useRef(null);
  const animationFrameRef = useRef(null);
  const riderMarkerRef = useRef(null);
  const riderOverlayRef = useRef(null);
  const polylineRef = useRef(null);

  const [mapEngine, setMapEngine] = useState('loading'); // 'google' | 'leaflet_fallback'
  const [showReceipt, setShowReceipt] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [customNote, setCustomNote] = useState(order?.items?.[0]?.specialNote || '');
  const [riderSpeed, setRiderSpeed] = useState('0 km/h (At Store)');
  const [riderDistanceRemaining, setRiderDistanceRemaining] = useState('3.8 km');
  const [riderEtaDuration, setRiderEtaDuration] = useState('18 mins');
  const [riderHeading, setRiderHeading] = useState(45);
  const [isConfirmingDelivery, setIsConfirmingDelivery] = useState(false);
  const [routeWaypoints, setRouteWaypoints] = useState([]);

  // Time-lock for cancellation (2 minutes = 120s grace window from order creation)
  const orderTimeMs = order?.createdAtTimestamp || Date.now();
  const [secondsRemaining, setSecondsRemaining] = useState(() => {
    const elapsedSec = Math.floor((Date.now() - orderTimeMs) / 1000);
    return Math.max(0, 120 - elapsedSec);
  });

  // Coordinates
  const restaurantCoords = useMemo(() => RESTAURANT_COORDINATES, []);
  const deliveryCoords = useMemo(() => resolveKigaliCoordinates(order), [order]);

  // Reactive step calculation based on order status (5 full stages)
  const currentStep = useMemo(() => {
    if (!order) return 1;
    if (order.status === 'cancelled') return 0;
    if (order.status === 'pending') return 1;
    if (order.status === 'preparing' || order.status === 'cooking') return 2;
    if (order.status === 'ready') return 3;
    if (order.status === 'delivery' || order.status === 'delivering') return 4;
    if (order.status === 'delivered') return 5;
    return 1;
  }, [order?.status]);

  const canCancelOrModify = currentStep === 1 && secondsRemaining > 0;

  // Countdown timer for cancellation grace window
  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsRemaining]);

  // Real-time WebSocket synchronization for live rider broadcasts
  useEffect(() => {
    const backendUrl = import.meta.env.VITE_SOCKET_URL || (import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, '') : 'http://localhost:5002');
    let socket;
    try {
      socket = io(backendUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true
      });

      socket.on('rider_location_broadcast', (data) => {
        if (data && data.orderId === order?.id && data.lat && data.lng) {
          if (riderMarkerRef.current && typeof riderMarkerRef.current.setPosition === 'function') {
            riderMarkerRef.current.setPosition({ lat: data.lat, lng: data.lng });
          }
          if (data.speed) setRiderSpeed(`${Math.round(data.speed)} km/h`);
          if (data.heading !== undefined) setRiderHeading(data.heading);
        }
      });
    } catch (e) {
      console.warn('Live tracking socket connection fallback', e);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [order?.id]);

  // Main Google Maps Platform / Fallback Map Initialization & Directions Service
  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      if (!mapContainerRef.current) return;

      try {
        const google = await loadGoogleMapsPlatform();
        if (!isMounted || !mapContainerRef.current) return;

        setMapEngine('google');

        // Cleanup any existing Leaflet instances
        if (leafletMapInstanceRef.current) {
          leafletMapInstanceRef.current.remove();
          leafletMapInstanceRef.current = null;
        }

        // Initialize Google Map
        const map = new google.maps.Map(mapContainerRef.current, {
          center: { lat: restaurantCoords.lat, lng: restaurantCoords.lng },
          zoom: 14,
          styles: darkGoogleMapStyle,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true
        });
        googleMapInstanceRef.current = map;

        // Origin Marker (HotPot Delights Kitchen HQ)
        const originMarker = new google.maps.Marker({
          position: { lat: restaurantCoords.lat, lng: restaurantCoords.lng },
          map,
          title: 'HotPot Delights Kitchen HQ (24G3+VHX, 11 KK 15 Rd, Kigali)',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#EA580C',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2.5
          }
        });

        const originInfoWindow = new google.maps.InfoWindow({
          content: `<div style="background:#14171F;color:#FFFFFF;padding:8px;border-radius:12px;font-family:sans-serif;font-size:12px;">
            <strong style="color:#F97316;">🍲 HotPot Delights HQ</strong><br/>
            <span style="color:#94A3B8;font-size:11px;">24G3+VHX, 11 KK 15 Rd, Kigali</span>
          </div>`
        });
        originMarker.addListener('click', () => originInfoWindow.open(map, originMarker));

        // Destination Marker (Customer Address)
        const destMarker = new google.maps.Marker({
          position: { lat: deliveryCoords.lat, lng: deliveryCoords.lng },
          map,
          title: `Delivery Destination: ${order?.deliveryAddress || order?.address || 'Customer Location'}`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#10B981',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2.5
          }
        });

        const destInfoWindow = new google.maps.InfoWindow({
          content: `<div style="background:#14171F;color:#FFFFFF;padding:8px;border-radius:12px;font-family:sans-serif;font-size:12px;">
            <strong style="color:#10B981;">🏠 ${order?.customerName || 'Your Location'}</strong><br/>
            <span style="color:#94A3B8;font-size:11px;">${order?.deliveryAddress || order?.address || 'Kigali'}</span>
          </div>`
        });
        destMarker.addListener('click', () => destInfoWindow.open(map, destMarker));

        // Rider Marker (Dynamic Scooter Icon with Bearing Rotation)
        const riderMarker = new google.maps.Marker({
          position: { lat: restaurantCoords.lat, lng: restaurantCoords.lng },
          map,
          title: 'HotPot Moto Express Courier (GPS Live)',
          icon: {
            path: 'M 0,-15 L 12,12 L 0,6 L -12,12 Z', // Dynamic Navigation Arrow / Moto Courier
            scale: 1.2,
            fillColor: '#3B82F6',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
            rotation: 0
          }
        });
        riderMarkerRef.current = riderMarker;

        // Auto-frame map bounds with dynamic padding
        const bounds = new google.maps.LatLngBounds();
        bounds.extend({ lat: restaurantCoords.lat, lng: restaurantCoords.lng });
        bounds.extend({ lat: deliveryCoords.lat, lng: deliveryCoords.lng });
        map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });

        // Request Driving Route via Google Maps DirectionsService
        const directionsService = new google.maps.DirectionsService();
        directionsService.route(
          {
            origin: { lat: restaurantCoords.lat, lng: restaurantCoords.lng },
            destination: { lat: deliveryCoords.lat, lng: deliveryCoords.lng },
            travelMode: google.maps.TravelMode.DRIVING
          },
          (result, status) => {
            if (status === google.maps.DirectionsStatus.OK && result.routes && result.routes[0]) {
              const route = result.routes[0];
              const overviewPath = route.overview_path.map((p) => ({
                lat: p.lat(),
                lng: p.lng()
              }));
              setRouteWaypoints(overviewPath);

              if (route.legs && route.legs[0]) {
                setRiderDistanceRemaining(route.legs[0].distance.text || '3.8 km');
                setRiderEtaDuration(route.legs[0].duration.text || '18 mins');
              }

              // Draw high-visibility polyline along road network
              if (polylineRef.current) polylineRef.current.setMap(null);
              polylineRef.current = new google.maps.Polyline({
                path: route.overview_path,
                geodesic: true,
                strokeColor: '#F97316',
                strokeOpacity: 0.85,
                strokeWeight: 5,
                map
              });

              startRiderAnimation(overviewPath, google, map);
            } else {
              // Generate fallback route waypoints between origin & destination
              const fallbackPath = generateInterpolatedPath(restaurantCoords, deliveryCoords, 30);
              setRouteWaypoints(fallbackPath);
              if (polylineRef.current) polylineRef.current.setMap(null);
              polylineRef.current = new google.maps.Polyline({
                path: fallbackPath,
                geodesic: true,
                strokeColor: '#F97316',
                strokeOpacity: 0.85,
                strokeWeight: 5,
                map
              });
              startRiderAnimation(fallbackPath, google, map);
            }
          }
        );
      } catch (err) {
        console.warn('Google Maps Platform initialization fallback to Leaflet:', err.message);
        if (!isMounted) return;
        setMapEngine('leaflet_fallback');
        initLeafletFallback();
      }
    };

    const generateInterpolatedPath = (start, end, steps = 30) => {
      const pts = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        pts.push({
          lat: start.lat + (end.lat - start.lat) * t,
          lng: start.lng + (end.lng - start.lng) * t
        });
      }
      return pts;
    };

    const startRiderAnimation = (waypoints, google, map) => {
      if (!waypoints || waypoints.length < 2) return;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

      let stepIndex = 0;
      let progress = 0;
      const totalSteps = waypoints.length - 1;

      const animate = () => {
        if (currentStep < 4) {
          // Stationary at Restaurant Kitchen HQ
          const p = waypoints[0];
          if (riderMarkerRef.current) {
            riderMarkerRef.current.setPosition(p);
          }
          setRiderSpeed('0 km/h (At Kitchen HQ)');
          setRiderHeading(45);
          return;
        }

        if (currentStep >= 5) {
          // Delivered at Customer Destination
          const p = waypoints[waypoints.length - 1];
          if (riderMarkerRef.current) {
            riderMarkerRef.current.setPosition(p);
          }
          setRiderSpeed('0 km/h (Delivered)');
          setRiderDistanceRemaining('0.0 km');
          setRiderEtaDuration('Delivered');
          return;
        }

        // Active Delivery GPS in Transit (Stage 4)
        progress += 0.003;
        if (progress >= 1) {
          progress = 0;
          stepIndex = (stepIndex + 1) % totalSteps;
        }

        const currPt = waypoints[stepIndex];
        const nextPt = waypoints[stepIndex + 1] || waypoints[stepIndex];

        const interpLat = currPt.lat + (nextPt.lat - currPt.lat) * progress;
        const interpLng = currPt.lng + (nextPt.lng - currPt.lng) * progress;

        const headingAngle = calculateBearing(currPt.lat, currPt.lng, nextPt.lat, nextPt.lng);
        setRiderHeading(headingAngle);

        if (riderMarkerRef.current) {
          riderMarkerRef.current.setPosition({ lat: interpLat, lng: interpLng });
          const icon = riderMarkerRef.current.getIcon();
          if (icon && typeof icon === 'object') {
            icon.rotation = headingAngle;
            riderMarkerRef.current.setIcon(icon);
          }
        }

        // Real-time speedometer & distance remaining
        const remainingRatio = Math.max(0, 1 - (stepIndex + progress) / totalSteps);
        const totalDistKm = Number(order?.distanceKm) || 3.8;
        const distLeft = (remainingRatio * totalDistKm).toFixed(1);
        setRiderDistanceRemaining(`${distLeft} km`);
        setRiderEtaDuration(`${Math.ceil(remainingRatio * 18)} mins`);
        setRiderSpeed(`${Math.floor(34 + Math.random() * 8)} km/h`);

        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animate();
    };

    // Resilient Leaflet Vector Fallback
    const initLeafletFallback = () => {
      if (!mapContainerRef.current) return;
      if (leafletMapInstanceRef.current) {
        leafletMapInstanceRef.current.remove();
        leafletMapInstanceRef.current = null;
      }

      const map = L.map(mapContainerRef.current).setView([restaurantCoords.lat, restaurantCoords.lng], 14);
      leafletMapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // Restaurant HQ Marker
      const restIcon = L.divIcon({
        className: 'custom-leaflet-icon',
        html: '<div style="background:#EA580C;color:white;padding:4px 10px;border-radius:16px;font-weight:bold;font-size:11px;border:2px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.6);white-space:nowrap">🍲 HotPot Kigali HQ</div>'
      });
      L.marker([restaurantCoords.lat, restaurantCoords.lng], { icon: restIcon }).addTo(map);

      // Client Destination Marker
      const destIcon = L.divIcon({
        className: 'custom-leaflet-icon',
        html: `<div style="background:#10B981;color:white;padding:4px 10px;border-radius:16px;font-weight:bold;font-size:11px;border:2px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.6);white-space:nowrap">🏠 ${order?.customerName || 'Your Address'}</div>`
      });
      L.marker([deliveryCoords.lat, deliveryCoords.lng], { icon: destIcon }).addTo(map);

      // Polyline
      L.polyline([[restaurantCoords.lat, restaurantCoords.lng], [deliveryCoords.lat, deliveryCoords.lng]], {
        color: '#F97316',
        weight: 4,
        dashArray: '8, 8',
        opacity: 0.85
      }).addTo(map);

      map.fitBounds([[restaurantCoords.lat, restaurantCoords.lng], [deliveryCoords.lat, deliveryCoords.lng]], { padding: [50, 50] });

      // Rider Marker
      const riderLeafletIcon = L.divIcon({
        className: 'custom-leaflet-rider',
        html: '<div style="background:#2563EB;color:white;padding:3px 8px;border-radius:12px;font-size:10px;font-weight:bold;border:2px solid #93C5FD;box-shadow:0 4px 12px rgba(0,0,0,0.6);white-space:nowrap">🛵 Moto Courier (Live)</div>'
      });
      const rMarker = L.marker([restaurantCoords.lat, restaurantCoords.lng], { icon: riderLeafletIcon }).addTo(map);

      let prog = currentStep >= 4 ? 0.4 : 0.05;
      let dir = 1;
      const animateLeaflet = () => {
        if (currentStep >= 4 && currentStep < 5) {
          prog += 0.0008 * dir;
          if (prog >= 0.95) dir = -1;
          if (prog <= 0.05) dir = 1;
        } else if (currentStep >= 5) {
          prog = 1.0;
        } else {
          prog = 0.0;
        }

        const lat = restaurantCoords.lat + (deliveryCoords.lat - restaurantCoords.lat) * prog;
        const lng = restaurantCoords.lng + (deliveryCoords.lng - restaurantCoords.lng) * prog;
        rMarker.setLatLng([lat, lng]);

        const distLeft = ((1 - prog) * (Number(order?.distanceKm) || 3.8)).toFixed(1);
        setRiderDistanceRemaining(`${distLeft} km`);
        setRiderSpeed(currentStep >= 4 ? `${Math.floor(34 + Math.random() * 8)} km/h` : '0 km/h');

        animationFrameRef.current = requestAnimationFrame(animateLeaflet);
      };
      animationFrameRef.current = requestAnimationFrame(animateLeaflet);
    };

    initMap();

    return () => {
      isMounted = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (googleMapInstanceRef.current) {
        googleMapInstanceRef.current = null;
      }
      if (leafletMapInstanceRef.current) {
        leafletMapInstanceRef.current.remove();
        leafletMapInstanceRef.current = null;
      }
    };
  }, [restaurantCoords, deliveryCoords, currentStep, order?.distanceKm]);

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

  const handleConfirmDelivery = async () => {
    if (!order || isConfirmingDelivery) return;
    setIsConfirmingDelivery(true);
    try {
      if (onUpdateStatus) {
        await onUpdateStatus(order.id, 'delivered');
      }
      setShowFeedbackModal(true);
    } catch (e) {
      console.error('Delivery confirmation error:', e);
    } finally {
      setIsConfirmingDelivery(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Cancelled Banner */}
      {order?.status === 'cancelled' && (
        <div className="p-6 rounded-2xl bg-red-950/80 border border-red-500/50 text-white flex items-center justify-between gap-4 animate-fade-in">
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
      <div className="p-5 sm:p-6 rounded-2xl bg-[#14171F] border border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-orange-500/15 border border-orange-500/30 text-[11px] font-mono font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping" />
              Google Maps Live Telemetry
            </span>
            <span className="text-xs font-mono font-bold text-amber-400">Order #{order?.id || 'HP-100231'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
            {order?.status === 'cancelled' ? 'Order Cancelled' : order?.status === 'delivered' ? 'Order Delivered!' : 'Live GPS Delivery Route'}
          </h2>
          <p className="text-xs text-slate-400">
            {order?.status === 'delivered'
              ? 'Delivered to your address in Kigali. Thank you for choosing HotPot Delights!'
              : `Estimated Arrival: ${riderEtaDuration} • Distance remaining: ${riderDistanceRemaining}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => downloadOrderReceiptPdf(order)}
            className="px-3.5 py-2 rounded-xl bg-[#1F242D] hover:bg-slate-700/50 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-all shadow-sm"
            title="Download PDF Receipt"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Receipt PDF</span>
          </button>

          <button
            onClick={() => setShowReceipt(true)}
            className="px-3.5 py-2 rounded-xl bg-[#1F242D] hover:bg-slate-700/50 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-all shadow-sm"
          >
            <FileText className="w-3.5 h-3.5 text-orange-400" />
            <span>View Receipt</span>
          </button>

          {currentStep === 5 && (
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-bold text-emerald-300 flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>Rate Rider</span>
            </button>
          )}

          <a
            href={`tel:${order?.riderPhone || '+250788123456'}`}
            className="px-3.5 py-2 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition-all"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Call Rider</span>
          </a>
        </div>
      </div>

      {/* Dedicated Courier Information Banner for Client */}
      {(order?.riderName || order?.assigned_rider_id) && (
        <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-r from-[#14171F] via-[#1C2029] to-[#14171F] border border-amber-500/30 shadow-xl flex flex-wrap items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-lg shadow-orange-500/20">
              🛵
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm sm:text-base font-black text-white truncate">
                  {order?.riderName || 'Assigned Courier'}
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                  order?.rider_handover_status === 'in_transit' || order?.status === 'delivery'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  {order?.rider_handover_status === 'in_transit' || order?.status === 'delivery'
                    ? '🛵 Out for Delivery'
                    : '⏳ Picking Up from Kitchen'}
                </span>
              </div>
              <div className="text-xs text-slate-300 flex items-center gap-2 flex-wrap font-mono">
                <span>📱 {order?.riderPhone || '+250 788 123 456'}</span>
                <span>•</span>
                <span className="text-amber-400 font-bold">{order?.riderPlate || order?.riderVehicle || 'Motorcycle'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            {order?.verification_pin && (
              <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-amber-500/40 flex items-center gap-1.5 text-xs font-mono">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Pickup PIN:</span>
                <span className="text-amber-300 font-black tracking-widest">{order.verification_pin}</span>
              </div>
            )}

            <a
              href={`tel:${order?.riderPhone || '+250788123456'}`}
              className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call Courier</span>
            </a>

            <a
              href={`https://wa.me/${(order?.riderPhone || '250788123456').replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      )}

      {/* Customer Delivery Confirmation Card */}
      {order?.status !== 'cancelled' && (
        <div className={`p-5 rounded-2xl border transition-all shadow-xl flex flex-wrap items-center justify-between gap-4 ${
          order?.status === 'delivered'
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
            : 'bg-linear-to-r from-[#14171F] via-[#1A1D24] to-[#14171F] border-slate-800'
        }`}>
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
              order?.status === 'delivered'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-linear-to-br from-orange-500 to-amber-600 text-white shadow-orange-500/20'
            }`}>
              {order?.status === 'delivered' ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <Bike className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="text-sm font-black text-white flex items-center gap-2">
                {order?.status === 'delivered' ? '✅ Delivery Confirmed & Completed!' : 'Has your delivery arrived?'}
                <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase ${
                  order?.status === 'delivered'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  {order?.status === 'delivered' ? 'DELIVERED' : 'Awaiting Physical Handover'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
                {order?.status === 'delivered'
                  ? 'You confirmed this meal was successfully received. The kitchen dashboard and rider status have been updated to DELIVERED. Murakoze!'
                  : 'When the courier arrives at your location and hands over your food, click "Confirm Delivery Received" to notify the kitchen that it was received.'}
              </p>
            </div>
          </div>

          {order?.status !== 'delivered' && (
            <button
              onClick={handleConfirmDelivery}
              disabled={isConfirmingDelivery}
              className="px-5 py-3 rounded-xl bg-linear-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isConfirmingDelivery ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Updating Kitchen...</span>
                </span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Delivery Received</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Order Grace Window Controls (Cancellation & Modification) */}
      {order?.status !== 'cancelled' && (
        <div className="p-4 rounded-2xl bg-[#14171F] border border-slate-800 flex flex-wrap items-center justify-between gap-4">
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
                  <span className="text-[10px] text-slate-500 font-normal">(Kitchen in progress - Lock active)</span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
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
              className={`px-3 py-1.5 rounded-xl bg-[#1F242D] border border-slate-700 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-all ${
                !canCancelOrModify ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              <span>Modify Note</span>
            </button>

            <button
              onClick={() => onCancelOrder && onCancelOrder(order.id)}
              disabled={!canCancelOrModify}
              className={`px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1.5 transition-all ${
                !canCancelOrModify ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              <XCircle className="w-3.5 h-3.5 text-red-400" />
              <span>Cancel Order</span>
            </button>
          </div>
        </div>
      )}

      {/* Editable Note Overlay */}
      {isEditingNote && (
        <div className="p-4 rounded-xl bg-[#1A1D24] border border-amber-500/40 space-y-3 animate-fade-in">
          <label className="text-xs font-bold text-amber-300 block">Modify Kitchen Special Instructions:</label>
          <input
            type="text"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="e.g. Extra hot chili sauce, deliver to back gate"
            className="w-full bg-[#14171F] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setIsEditingNote(false)} className="px-3 py-1.5 rounded-xl bg-[#1F242D] text-xs font-bold text-slate-300">
              Cancel
            </button>
            <button onClick={handleSaveNote} className="px-4 py-1.5 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 text-xs font-bold text-white shadow-md shadow-orange-500/20">
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Grid: Google Maps Live Telemetry + 5-Stage Stepper */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Google Map with Road Network Polyline & Live Heading Marker */}
        <div className="lg:col-span-2 h-105 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative bg-[#0F1117]">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Floating Live Telemetry HUD */}
          <div className="absolute top-4 left-4 z-10 bg-[#14171F]/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-800 text-xs space-y-2 shadow-2xl max-w-xs pointer-events-auto">
            <div className="font-bold text-white flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5">
                <Bike className="w-4 h-4 text-orange-400" />
                {order?.riderName ? `${order.riderName} (Courier)` : 'Eric Mugisha (Express Courier)'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-mono font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                GPS LIVE
              </span>
            </div>

            <div className="text-[11px] text-slate-400">
              {order?.riderPlate ? `${order.riderVehicle || 'Motorcycle'}: ${order.riderPlate}` : 'Motorcycle: Yamaha XTZ 125 • RAC 402B'}
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-1.5 text-[11px]">
              <div className="flex items-start gap-1.5 text-orange-400">
                <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Origin:</span>{' '}
                  <span className="text-slate-300">HotPot Kigali HQ (24G3+VHX, KK 15 Rd)</span>
                </div>
              </div>

              <div className="flex items-start gap-1.5 text-emerald-400">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="truncate">
                  <span className="font-bold">Drop-off:</span>{' '}
                  <span className="text-slate-300 truncate">{order?.deliveryAddress || order?.address || 'Kigali'}</span>
                </div>
              </div>
            </div>

            {/* Dynamic Speedometer & Compass Heading */}
            <div className="pt-2 border-t border-slate-800 grid grid-cols-3 gap-2 text-[10px] font-mono text-center">
              <div className="p-1.5 rounded-lg bg-[#1A1D24] border border-slate-800">
                <span className="text-slate-500 block uppercase text-[9px]">Speed</span>
                <span className="text-amber-400 font-bold">{riderSpeed}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-[#1A1D24] border border-slate-800">
                <span className="text-slate-500 block uppercase text-[9px]">Dist Left</span>
                <span className="text-orange-400 font-bold">{riderDistanceRemaining}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-[#1A1D24] border border-slate-800">
                <span className="text-slate-500 block uppercase text-[9px]">Heading</span>
                <span className="text-blue-400 font-bold">{Math.round(riderHeading)}°</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stepper Status Sidebar */}
        <div className="p-6 rounded-2xl bg-[#14171F] border border-slate-800 space-y-6 flex flex-col justify-between shadow-xl">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-400" />
            Order Timeline & Verification
          </h3>

          <div className="space-y-5 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
            {steps.map((step) => {
              const isDone = currentStep >= step.num;
              const isCurrent = currentStep === step.num;
              return (
                <div key={step.num} className="relative flex items-start gap-4">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs relative z-10 transition-all ${
                    isDone
                      ? 'bg-linear-to-br from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/30'
                      : 'bg-[#1A1D24] text-slate-500 border border-slate-800'
                  }`}>
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : step.num}
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold ${isCurrent ? 'text-orange-400' : isDone ? 'text-white' : 'text-slate-500'}`}>
                      {step.label}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3.5 rounded-xl bg-[#10131A] border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="font-bold text-white flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-orange-400" /> Delivery Address:
            </div>
            <div className="text-slate-300">{order?.deliveryAddress || order?.address || 'Kigali, Rwanda'}</div>
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
