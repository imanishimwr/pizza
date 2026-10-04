import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import {
  Navigation, Bike, MapPin, Phone, User, Search, CheckCircle2,
  Clock, AlertTriangle, ShieldCheck, ArrowRight, ExternalLink,
  ChevronRight, RefreshCw, Radio, Layers, Sparkles, Filter
} from 'lucide-react';
import L from 'leaflet';
import { useKitchen } from '../../context/KitchenContext';
import { apiService } from '../../services/apiService';

const KITCHEN_PIN = { lat: -1.9355, lng: 30.1035 };
const KIGALI_BOUNDS = { minLat: -1.985, maxLat: -1.885, minLng: 29.985, maxLng: 30.145 };

function hashRatio(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

function resolveDropoffCoordinates(order) {
  const lat = Number(order?.lat);
  const lng = Number(order?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
    return { lat, lng };
  }
  const seed = String(order?.deliveryAddress || order?.address || order?.customerName || order?.id || 'Kigali');
  return {
    lat: KIGALI_BOUNDS.minLat + hashRatio(seed) * (KIGALI_BOUNDS.maxLat - KIGALI_BOUNDS.minLat),
    lng: KIGALI_BOUNDS.minLng + hashRatio(`${seed}|lng`) * (KIGALI_BOUNDS.maxLng - KIGALI_BOUNDS.minLng)
  };
}

function resolveRiderCoordinates(rider, destination) {
  const lat = Number(rider?.last_lat || rider?.lat);
  const lng = Number(rider?.last_lng || rider?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
    return { lat, lng };
  }
  // If rider is en route to destination, place them midway between kitchen and destination
  if (destination) {
    const progress = 0.45 + (hashRatio(String(rider?.id || 'rider')) * 0.35); // 45% - 80% along path
    return {
      lat: KITCHEN_PIN.lat + (destination.lat - KITCHEN_PIN.lat) * progress,
      lng: KITCHEN_PIN.lng + (destination.lng - KITCHEN_PIN.lng) * progress
    };
  }
  // Otherwise near kitchen
  return {
    lat: KITCHEN_PIN.lat + (hashRatio(`${rider?.id || 'rider'}|lat`) - 0.5) * 0.02,
    lng: KITCHEN_PIN.lng + (hashRatio(`${rider?.id || 'rider'}|lng`) - 0.5) * 0.02
  };
}

function buildPillIcon(background, text, icon = '📍') {
  return L.divIcon({
    className: 'hotpot-tracking-pin',
    html: `
      <div style="
        background: ${background};
        color: #ffffff;
        padding: 4px 10px;
        border-radius: 9999px;
        font-weight: 800;
        font-size: 11px;
        font-family: sans-serif;
        border: 2px solid #ffffff;
        box-shadow: 0 4px 14px rgba(0,0,0,0.6);
        white-space: nowrap;
        display: flex;
        align-items: center;
        gap: 4px;
      ">
        <span>${icon}</span>
        <span>${String(text).replace(/</g, '&lt;')}</span>
      </div>
    `,
    iconSize: [120, 30],
    iconAnchor: [60, 15]
  });
}

export default function KitchenTracking() {
  const { orders = [], riders = [], onUpdateStatus, triggerToast } = useKitchen();

  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedRiderId, setSelectedRiderId] = useState('all');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'delivery' | 'ready'
  const [viewTab, setViewTab] = useState('split'); // 'split' | 'map' | 'list' (on mobile)

  // Map references
  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersLayerRef = useRef(null);
  const routeLineRef = useRef(null);

  // Active trackable orders (out for delivery or ready with rider assigned)
  const activeDeliveries = useMemo(() => {
    return orders.filter(o => {
      const isOutForDelivery = o.status === 'delivery';
      const isReadyWithRider = o.status === 'ready' && (o.assigned_rider_id || o.riderName);
      return isOutForDelivery || isReadyWithRider;
    });
  }, [orders]);

  // Working riders (on duty or currently assigned to an active delivery)
  const workingRiders = useMemo(() => {
    return riders.filter(r => {
      const isAvailable = r.is_available === true || r.status === 'AVAILABLE';
      const hasActiveOrder = activeDeliveries.some(o => String(o.assigned_rider_id) === String(r.id));
      return isAvailable || hasActiveOrder;
    });
  }, [riders, activeDeliveries]);

  // Filtered deliveries based on:
  // 1) Selected rider
  // 2) Customer name search
  // 3) Delivery status filter
  const filteredDeliveries = useMemo(() => {
    let list = activeDeliveries;

    // Filter by selected rider
    if (selectedRiderId !== 'all') {
      list = list.filter(o => String(o.assigned_rider_id) === String(selectedRiderId));
    }

    // Filter by status tab
    if (statusFilter !== 'all') {
      list = list.filter(o => o.status === statusFilter);
    }

    // Filter by customer name / search query
    if (customerSearch.trim()) {
      const q = customerSearch.toLowerCase();
      list = list.filter(o =>
        String(o.customerName || '').toLowerCase().includes(q) ||
        String(o.phone || '').toLowerCase().includes(q) ||
        String(o.id || '').toLowerCase().includes(q) ||
        String(o.deliveryAddress || o.address || '').toLowerCase().includes(q) ||
        String(o.riderName || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [activeDeliveries, selectedRiderId, statusFilter, customerSearch]);

  // Currently focused order
  const activeOrder = useMemo(() => {
    if (selectedOrderId) {
      const found = activeDeliveries.find(o => String(o.id) === String(selectedOrderId));
      if (found) return found;
    }
    // If rider selected, pick that rider's order
    if (selectedRiderId !== 'all') {
      const riderOrder = activeDeliveries.find(o => String(o.assigned_rider_id) === String(selectedRiderId));
      if (riderOrder) return riderOrder;
    }
    // Default to first filtered delivery
    return filteredDeliveries[0] || null;
  }, [selectedOrderId, selectedRiderId, activeDeliveries, filteredDeliveries]);

  // Currently focused rider
  const activeRider = useMemo(() => {
    if (activeOrder?.assigned_rider_id) {
      const r = riders.find(x => String(x.id) === String(activeOrder.assigned_rider_id));
      if (r) return r;
    }
    if (selectedRiderId !== 'all') {
      const r = riders.find(x => String(x.id) === String(selectedRiderId));
      if (r) return r;
    }
    if (activeOrder?.riderName) {
      return {
        name: activeOrder.riderName,
        phone: activeOrder.riderPhone || '',
        plateNumber: activeOrder.riderPlate || '',
        vehicleType: activeOrder.riderVehicle || 'Motorcycle Express'
      };
    }
    return workingRiders[0] || null;
  }, [activeOrder, selectedRiderId, riders, workingRiders]);

  // Auto-select initial order if none selected
  useEffect(() => {
    if (!selectedOrderId && filteredDeliveries.length > 0) {
      setSelectedOrderId(filteredDeliveries[0].id);
    }
  }, [filteredDeliveries, selectedOrderId]);

  // Handle choosing a rider
  const handleSelectRider = (riderId) => {
    setSelectedRiderId(riderId);
    if (riderId !== 'all') {
      const riderOrder = activeDeliveries.find(o => String(o.assigned_rider_id) === String(riderId));
      if (riderOrder) {
        setSelectedOrderId(riderOrder.id);
      }
    }
  };

  // Handle choosing a customer delivery
  const handleSelectOrder = (order) => {
    setSelectedOrderId(order.id);
    if (order.assigned_rider_id) {
      setSelectedRiderId(String(order.assigned_rider_id));
    }
  };

  // ---------------------------------------------------------------------------
  // Leaflet Map Initialization & Updates
  // ---------------------------------------------------------------------------
  useLayoutEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return undefined;

    let map;
    try {
      map = L.map(container, {
        zoomControl: false,
        attributionControl: false
      }).setView([KITCHEN_PIN.lat, KITCHEN_PIN.lng], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      // Custom zoom control in bottom-right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      leafletMapRef.current = map;
    } catch (err) {
      console.warn('KitchenTracking: Map init error', err);
      return undefined;
    }

    return () => {
      markersLayerRef.current = null;
      leafletMapRef.current = null;
      map.remove();
    };
  }, []);

  // Update Markers & Polyline whenever activeOrder or activeRider changes
  useEffect(() => {
    const map = leafletMapRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    // 1. Kitchen HQ Pin
    const kitchenMarker = L.marker([KITCHEN_PIN.lat, KITCHEN_PIN.lng], {
      icon: buildPillIcon('#EA580C', 'HotPot Kitchen HQ', '🍲')
    }).bindPopup('<b>HotPot Kitchen HQ</b><br/>Nyarutarama, Kigali').addTo(layer);

    const boundsPoints = [[KITCHEN_PIN.lat, KITCHEN_PIN.lng]];

    // 2. If an active order is selected, show Route, Destination and Assigned Rider
    if (activeOrder) {
      const dropoff = resolveDropoffCoordinates(activeOrder);
      const riderPos = resolveRiderCoordinates(activeRider, dropoff);

      boundsPoints.push([dropoff.lat, dropoff.lng]);
      boundsPoints.push([riderPos.lat, riderPos.lng]);

      // Route line: Kitchen -> Rider -> Customer
      const routePoints = [
        [KITCHEN_PIN.lat, KITCHEN_PIN.lng],
        [riderPos.lat, riderPos.lng],
        [dropoff.lat, dropoff.lng]
      ];

      L.polyline(routePoints, {
        color: '#F97316',
        weight: 4,
        dashArray: '8 8',
        opacity: 0.85
      }).addTo(layer);

      // Customer Dropoff Pin
      L.marker([dropoff.lat, dropoff.lng], {
        icon: buildPillIcon('#10B981', activeOrder.customerName || 'Customer', '🏠')
      }).bindPopup(`<b>${activeOrder.customerName || 'Customer'}</b><br/>${activeOrder.deliveryAddress || activeOrder.address || 'Kigali'}`).addTo(layer);

      // Rider Pin
      const riderName = activeRider?.name || activeOrder.riderName || 'Courier';
      L.marker([riderPos.lat, riderPos.lng], {
        icon: buildPillIcon('#3B82F6', `${riderName} • En Route`, '🛵')
      }).bindPopup(`<b>${riderName}</b><br/>Plate: ${activeRider?.plateNumber || 'Moto'}<br/>Order #${activeOrder.id}`).addTo(layer);

      // Fit map to encompass route
      try {
        map.fitBounds(L.latLngBounds(boundsPoints), { padding: [50, 50], maxZoom: 15 });
      } catch (e) {
        map.setView([riderPos.lat, riderPos.lng], 14);
      }
    } else {
      // No single order selected: Show all working riders on map
      workingRiders.forEach(r => {
        const rPos = resolveRiderCoordinates(r);
        boundsPoints.push([rPos.lat, rPos.lng]);
        L.marker([rPos.lat, rPos.lng], {
          icon: buildPillIcon('#3B82F6', `${r.name} • On Duty`, '🛵')
        }).bindPopup(`<b>${r.name}</b><br/>${r.plateNumber || 'Motorcycle'}`).addTo(layer);
      });

      try {
        if (boundsPoints.length > 1) {
          map.fitBounds(L.latLngBounds(boundsPoints), { padding: [40, 40], maxZoom: 14 });
        } else {
          map.setView([KITCHEN_PIN.lat, KITCHEN_PIN.lng], 13);
        }
      } catch (e) {
        map.setView([KITCHEN_PIN.lat, KITCHEN_PIN.lng], 13);
      }
    }
  }, [activeOrder, activeRider, workingRiders]);

  // Mark order as delivered directly from kitchen console
  const handleMarkDelivered = async (orderId) => {
    if (!onUpdateStatus) return;
    try {
      await onUpdateStatus(orderId, 'delivered');
      triggerToast?.(`✅ Order #${orderId} marked as delivered!`);
    } catch (err) {
      triggerToast?.(`⚠️ Could not complete delivery: ${err.message}`);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0c0d12] text-white font-sans select-none">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 1. TOP DISPATCH & TRACKING HEADER                           */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="p-3 sm:p-4 bg-surface-card border-b border-white/10 shrink-0 space-y-3 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <Navigation className="w-5 h-5 text-amber-400 animate-pulse" />
              Delivery Tracking
            </h1>
            <p className="text-xs text-text-muted mt-0.5">
              Live radar for every delivery in Kigali. Track by working rider or customer name.
            </p>
          </div>

          {/* Quick Counter Pills */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/40 text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping shrink-0" />
              <span>{activeDeliveries.length} Active Deliveries</span>
            </span>
            <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm">
              <Bike className="w-3.5 h-3.5 text-emerald-400" />
              <span>{workingRiders.length} Riders at Work</span>
            </span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* WORKING RIDERS SELECTOR ("CHOSE ANY RIDER IN WORK")        */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="space-y-1.5 pt-1 border-t border-white/5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Bike className="w-3.5 h-3.5 text-amber-400" />
              Choose Rider in Work:
            </span>
            <span className="text-text-subdued font-mono text-[10px]">
              {workingRiders.length} Active Couriers
            </span>
          </label>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              type="button"
              onClick={() => handleSelectRider('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                selectedRiderId === 'all'
                  ? 'bg-amber-500/25 text-amber-300 border-amber-500/60 shadow-sm ring-1 ring-amber-500/30'
                  : 'bg-black/40 border-white/10 text-text-muted hover:text-white'
              }`}
            >
              <span>All Riders ({workingRiders.length})</span>
            </button>

            {workingRiders.map(rider => {
              const riderOrders = activeDeliveries.filter(o => String(o.assigned_rider_id) === String(rider.id));
              const isSelected = String(selectedRiderId) === String(rider.id);
              const isDelivering = riderOrders.length > 0;

              return (
                <button
                  key={rider.id}
                  type="button"
                  onClick={() => handleSelectRider(rider.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap shrink-0 flex items-center gap-2 ${
                    isSelected
                      ? 'bg-blue-600/30 text-blue-200 border-blue-500/70 shadow-md ring-1 ring-blue-500/40'
                      : 'bg-black/40 border-white/10 text-text-muted hover:text-white hover:border-white/20'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${isDelivering ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                  <span>{rider.name}</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {rider.plateNumber ? `(${rider.plateNumber})` : ''}
                  </span>
                  {isDelivering && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-300 text-[10px] font-mono font-bold">
                      {riderOrders.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 2. SPLIT LAYOUT: MAP + CUSTOMER DELIVERIES PANEL            */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden relative">
        {/* LEFT / SIDEBAR: CUSTOMER NAME SEARCH & ACTIVE ORDERS */}
        <div className="w-full lg:w-96 bg-surface-dark border-r border-white/10 flex flex-col shrink-0 overflow-hidden shadow-lg">
          {/* Customer Search Bar */}
          <div className="p-3 border-b border-white/10 bg-surface-card/60 space-y-2 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search customer name, phone, order #..."
                className="w-full pl-9 pr-7 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-text-subdued focus:outline-none focus:border-amber-500 transition-colors"
              />
              {customerSearch && (
                <button
                  type="button"
                  onClick={() => setCustomerSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Status Filter Chips */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`flex-1 py-1 rounded-lg text-[11px] font-bold border transition-all text-center ${
                  statusFilter === 'all'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-black/30 border-white/5 text-text-muted hover:text-white'
                }`}
              >
                All ({activeDeliveries.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('delivery')}
                className={`flex-1 py-1 rounded-lg text-[11px] font-bold border transition-all text-center ${
                  statusFilter === 'delivery'
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    : 'bg-black/30 border-white/5 text-text-muted hover:text-white'
                }`}
              >
                On the Way
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ready')}
                className={`flex-1 py-1 rounded-lg text-[11px] font-bold border transition-all text-center ${
                  statusFilter === 'ready'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-black/30 border-white/5 text-text-muted hover:text-white'
                }`}
              >
                Waiting Rider
              </button>
            </div>
          </div>

          {/* Customer Deliveries List */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-2.5 space-y-2.5">
            {filteredDeliveries.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-subdued space-y-2 p-4">
                <Navigation className="w-7 h-7 text-text-subdued mx-auto opacity-30" />
                <p className="font-bold text-white">No deliveries match</p>
                <p className="text-[11px]">
                  {customerSearch ? 'Try a different customer name or phone.' : 'When food is packed or assigned to a rider, it will appear here.'}
                </p>
              </div>
            ) : (
              filteredDeliveries.map(order => {
                const isSelected = activeOrder?.id === order.id;
                const rider = riders.find(r => String(r.id) === String(order.assigned_rider_id)) || {
                  name: order.riderName || 'Courier'
                };

                return (
                  <div
                    key={order.id}
                    onClick={() => handleSelectOrder(order)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-500/70 shadow-md ring-1 ring-amber-500/40'
                        : 'bg-black/30 border-white/10 hover:border-white/20 hover:bg-black/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-amber-400 text-xs">#{order.id}</span>
                          <span className="text-xs sm:text-sm font-bold text-white truncate">
                            {order.customerName || 'Customer'}
                          </span>
                        </div>
                        <span className="text-[11px] text-text-muted flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-amber-400" />
                          <span className="font-mono">{order.phone || '+250 788 000 000'}</span>
                        </span>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 border ${
                        order.status === 'delivery'
                          ? 'bg-blue-950 text-blue-300 border-blue-500/40'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                      }`}>
                        {order.status === 'delivery' ? '🛵 ON THE WAY' : '📦 WAITING RIDER'}
                      </span>
                    </div>

                    {/* Address snippet */}
                    <div className="text-[11px] text-text-muted flex items-center gap-1.5 truncate">
                      <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="truncate">{order.deliveryAddress || order.address || 'Kigali Dropoff'}</span>
                    </div>

                    {/* Assigned Rider & Items */}
                    <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px]">
                      <div className="flex items-center gap-1 text-blue-300 font-bold">
                        <Bike className="w-3 h-3" />
                        <span className="truncate">{rider.name}</span>
                      </div>
                      <span className="font-mono text-amber-300 font-bold">
                        {Number(order.totalRWF || 0)?.toLocaleString()} RWF
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT / MAIN: LEAFLET MAP + LIVE INSPECTOR CARD */}
        <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
          {/* LEAFLET MAP CONTAINER */}
          <div className="flex-1 w-full h-full relative">
            <div ref={mapContainerRef} className="w-full h-full" />

            {/* Recenter Map Button Overlay */}
            {activeOrder && (
              <button
                type="button"
                onClick={() => {
                  const map = leafletMapRef.current;
                  if (!map) return;
                  const dropoff = resolveDropoffCoordinates(activeOrder);
                  const riderPos = resolveRiderCoordinates(activeRider, dropoff);
                  map.fitBounds(L.latLngBounds([[KITCHEN_PIN.lat, KITCHEN_PIN.lng], [dropoff.lat, dropoff.lng], [riderPos.lat, riderPos.lng]]), {
                    padding: [60, 60],
                    maxZoom: 15
                  });
                }}
                className="absolute top-3 right-3 z-10 p-2 sm:px-3 sm:py-2 rounded-xl bg-black/80 hover:bg-black border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-md shadow-lg transition-all active:scale-95"
                title="Fit full route in view"
              >
                <Navigation className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Fit Route</span>
              </button>
            )}
          </div>

          {/* BOTTOM FLOATING INSPECTOR CARD */}
          {activeOrder && (
            <div className="p-3 sm:p-4 bg-surface-card/95 backdrop-blur-md border-t border-white/10 shrink-0 shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                {/* 1. Customer Dropoff Information */}
                <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
                      Customer Dropoff
                    </span>
                    <span className="font-mono text-amber-400 font-black text-xs">#{activeOrder.id}</span>
                  </div>
                  <div className="font-bold text-white text-sm truncate">{activeOrder.customerName || 'Customer'}</div>
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <a href={`tel:${activeOrder.phone || '+250788000000'}`} className="font-mono text-amber-400 hover:underline flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {activeOrder.phone || '+250 788 000 000'}
                    </a>
                    <span className="text-[11px] text-text-subdued truncate max-w-40" title={activeOrder.deliveryAddress || activeOrder.address}>
                      {activeOrder.deliveryAddress || activeOrder.address}
                    </span>
                  </div>
                </div>

                {/* 2. Courier In Work Information */}
                <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
                      Courier in Work
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                      ON DUTY
                    </span>
                  </div>
                  <div className="font-bold text-white text-sm flex items-center gap-1.5 truncate">
                    <Bike className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="truncate">{activeRider?.name || activeOrder.riderName || 'Assigned Courier'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <a href={`tel:${activeRider?.phone || activeOrder.riderPhone || '+250788000000'}`} className="font-mono text-blue-300 hover:underline flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {activeRider?.phone || activeOrder.riderPhone || 'Call Courier'}
                    </a>
                    <span className="font-mono text-[11px] text-slate-400">
                      {activeRider?.plateNumber || activeOrder.riderPlate || 'Moto Express'}
                    </span>
                  </div>
                </div>

                {/* 3. Verification PIN & Quick Actions */}
                <div className="p-3 rounded-xl bg-linear-to-r from-amber-500/10 via-orange-500/10 to-blue-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider block">
                      Pickup PIN
                    </span>
                    <div className="font-mono font-black text-amber-300 text-lg tracking-widest">
                      {activeOrder.verification_pin || '4829'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${activeOrder.phone || '+250788000000'}`}
                      className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1 transition-all"
                      title="Call Customer"
                    >
                      <Phone className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden sm:inline">Call</span>
                    </a>

                    {activeOrder.status === 'delivery' && (
                      <button
                        type="button"
                        onClick={() => handleMarkDelivered(activeOrder.id)}
                        className="px-4 py-2 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                        title="Mark order as delivered"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Done ✅</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
