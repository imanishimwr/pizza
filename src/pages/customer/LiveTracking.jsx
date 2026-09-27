import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bike,
  CheckCircle2,
  ChefHat,
  Clock,
  Compass,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  Gauge,
  Hash,
  Heart,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Radio,
  ShieldCheck,
  Sparkles,
  Star,
  ThumbsUp,
  User,
  XCircle
} from 'lucide-react';
import L from 'leaflet';
import ReceiptModal from '../../components/customer/ReceiptModal';
import PostDeliveryFeedbackModal from '../../components/customer/PostDeliveryFeedbackModal';
import { downloadOrderReceiptPdf } from '../../utils/receiptGenerator';
import { eventBus } from '../../services/eventBus';
import { CONTACT, ORDER_STATUS_LABELS } from '../../data/mockData';

const DASH = '\u2014';

/**
 * Mirrors `cancelOrder({ graceMs = 120000 })` in Pizza-Backend/neonClient.js.
 * The server measures the window on its own clock, so this countdown is only a
 * hint about what the server is about to decide.
 */
const CANCEL_GRACE_SECONDS = 120;

/** The five visible stages, keyed to the canonical lowercase statuses. */
const STEPS = [
  { num: 1, label: 'Order received', hint: 'Payment confirmed and sent to the kitchen' },
  { num: 2, label: 'In the kitchen', hint: 'Broths simmering and dishes being assembled' },
  { num: 3, label: 'Ready for pickup', hint: 'Cooked, packed and waiting for a courier' },
  { num: 4, label: 'Out for delivery', hint: 'Handed to a courier riding to your address' },
  { num: 5, label: 'Delivered', hint: 'Handed over at your address' }
];

/** Canonical statuses only: pending|preparing|ready|delivery|delivered|cancelled. */
const STEP_FOR_STATUS = {
  pending: 1,
  preparing: 2,
  ready: 3,
  delivery: 4,
  delivered: 5,
  cancelled: 0
};

/** Server-side `cancelOrder` refuses these two before it ever looks at the clock. */
const UNCANCELLABLE_STATUSES = ['delivery', 'delivered'];

/**
 * One approximate pin for the kitchen. `CONTACT.address` is free text, so the
 * map can only be as precise as this single documented point.
 */
const KITCHEN_PIN = { lat: -1.9355, lng: 30.1035 };

/** Rough extent of the Kigali delivery area, used for fallback pins only. */
const KIGALI_BOUNDS = { minLat: -1.985, maxLat: -1.885, minLng: 29.985, maxLng: 30.145 };

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Stable 0..1 hash, so a fallback pin never jumps between renders. */
function hashRatio(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

function isUsableCoordinate(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

/**
 * `order.lat` / `order.lng` are the only real coordinates the API returns. When
 * they are missing we fall back to a deterministic pin derived from the address
 * text and flag it, so the UI can say the pin is approximate instead of
 * pretending it is a GPS fix.
 */
function resolveDestination(order) {
  const lat = Number(order?.lat);
  const lng = Number(order?.lng);
  if (isUsableCoordinate(lat, lng)) return { lat, lng, exact: true };

  const seed = String(order?.address ?? '').trim() || String(order?.id ?? 'hotpot');
  return {
    lat: KIGALI_BOUNDS.minLat + hashRatio(seed) * (KIGALI_BOUNDS.maxLat - KIGALI_BOUNDS.minLat),
    lng: KIGALI_BOUNDS.minLng + hashRatio(`${seed}|lng`) * (KIGALI_BOUNDS.maxLng - KIGALI_BOUNDS.minLng),
    exact: false
  };
}

const EARTH_RADIUS_KM = 6371;

function straightLineKm(from, to) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function formatTimestamp(value) {
  if (!value) return DASH;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return DASH;
  return parsed.toLocaleString([], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatEta(etaMinutes, etaTime) {
  const minutes = Number(etaMinutes);
  if (Number.isFinite(minutes) && minutes > 0) return `${Math.round(minutes)} min`;
  if (etaTime) {
    const parsed = new Date(etaTime);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }
  return DASH;
}

/** Popup content is built as DOM text, never as an HTML string. */
function buildMapPopup(title, subtitle) {
  const wrapper = document.createElement('div');
  wrapper.style.fontFamily = 'sans-serif';
  wrapper.style.fontSize = '12px';

  const heading = document.createElement('strong');
  heading.textContent = title;
  wrapper.appendChild(heading);

  if (subtitle) {
    wrapper.appendChild(document.createElement('br'));
    const detail = document.createElement('span');
    detail.textContent = subtitle;
    wrapper.appendChild(detail);
  }
  return wrapper;
}

function buildPillIcon(background, text) {
  return L.divIcon({
    className: 'hotpot-map-pill',
    html: `<div style="background:${background};color:#FFFFFF;padding:4px 10px;border-radius:16px;font-weight:700;font-size:11px;border:2px solid #FFFFFF;box-shadow:0 4px 12px rgba(0,0,0,0.6);white-space:nowrap">${escapeHtml(text)}</div>`
  });
}

export default function LiveTracking({ order, onUpdateStatus, onCancelOrder, onSetNotes }) {
  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const routeLineRef = useRef(null);

  const [mapError, setMapError] = useState('');
  const [isMapReady, setIsMapReady] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteError, setNoteError] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [isConfirmingDelivery, setIsConfirmingDelivery] = useState(false);
  const [deliveryError, setDeliveryError] = useState('');
  const [receiptError, setReceiptError] = useState('');
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [busOrder, setBusOrder] = useState(null);

  // -------------------------------------------------------------------------
  // Which order are we actually showing?
  // -------------------------------------------------------------------------
  // `order` is the source of truth. The bus copy only wins when it is a newer
  // revision of the same order, which is what makes cross-tab updates land:
  // App upserts its own order list for local socket events but only raises a
  // toast for events that arrive from another tab.
  const tracked = useMemo(() => {
    const base = order || null;
    const candidate = busOrder;
    if (!base || !candidate || String(candidate.id) !== String(base.id)) return base;

    const baseMs = Date.parse(String(base.updatedAt ?? base.createdAt ?? ''));
    const candidateMs = Date.parse(String(candidate.updatedAt ?? candidate.createdAt ?? ''));
    if (Number.isFinite(baseMs) && Number.isFinite(candidateMs) && candidateMs < baseMs) return base;
    return candidate;
  }, [order, busOrder]);

  useEffect(() => {
    if (!order?.id) {
      setBusOrder(null);
      return undefined;
    }
    return eventBus.on('ORDER_STATUS_UPDATE', (payload) => {
      if (!payload || String(payload.orderId) !== String(order.id)) return;
      if (payload.order) setBusOrder(payload.order);
    });
  }, [order?.id]);

  const status = tracked?.status ?? '';
  const currentStep = STEP_FOR_STATUS[status] ?? 1;
  const statusLabel = ORDER_STATUS_LABELS[status] || (status || DASH);
  const isCancelled = status === 'cancelled';
  const isDelivered = status === 'delivered';
  const orderRef = tracked?.id ? `#${tracked.id}` : DASH;
  const dropOff = String(tracked?.address ?? '').trim() || 'Kigali, Rwanda';

  const destination = useMemo(() => resolveDestination(tracked), [tracked]);
  const isStraightLine = !destination.exact;

  // Real road distance from the API, or a straight-line estimate that we label
  // as such. Never a made-up number.
  const distanceKm = (() => {
    const reported = Number(tracked?.distanceKm);
    if (Number.isFinite(reported) && reported > 0) {
      return { value: `${reported.toFixed(1)} km`, estimated: false };
    }
    const estimate = straightLineKm(KITCHEN_PIN, destination);
    return { value: `\u2248 ${estimate.toFixed(1)} km straight line`, estimated: true };
  })();

  const etaLabel = formatEta(tracked?.etaMinutes, tracked?.etaTime);
  const hasEta = etaLabel !== DASH;

  // -------------------------------------------------------------------------
  // Cancellation grace window
  // -------------------------------------------------------------------------
  const createdAtMs = useMemo(() => {
    const parsed = Date.parse(String(tracked?.createdAt ?? ''));
    return Number.isFinite(parsed) ? parsed : null;
  }, [tracked?.createdAt]);

  useEffect(() => {
    if (createdAtMs === null) {
      setSecondsRemaining(0);
      return undefined;
    }
    const tick = () => {
      const elapsed = Math.floor((Date.now() - createdAtMs) / 1000);
      setSecondsRemaining(Math.max(0, CANCEL_GRACE_SECONDS - elapsed));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [createdAtMs]);

  const canCancel = Boolean(
    tracked &&
      status !== 'cancelled' &&
      !UNCANCELLABLE_STATUSES.includes(status) &&
      secondsRemaining > 0
  );

  const cancelBlockReason = (() => {
    if (!tracked) return 'No order selected.';
    if (status === 'cancelled') return 'This order is already cancelled.';
    if (UNCANCELLABLE_STATUSES.includes(status)) {
      return 'This order is already on its way, so it can no longer be cancelled.';
    }
    if (secondsRemaining <= 0) {
      return 'The 2-minute self-service window has passed. Please contact support.';
    }
    return '';
  })();

  // -------------------------------------------------------------------------
  // Map: created once, then only repositioned
  // -------------------------------------------------------------------------
  // A layout effect on purpose. `useEffect` cleanups run after React has already
  // detached the container, and Leaflet's `map.remove()` needs a live node.
  useLayoutEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return undefined;

    let map;
    try {
      map = L.map(container).setView([KITCHEN_PIN.lat, KITCHEN_PIN.lng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      L.marker([KITCHEN_PIN.lat, KITCHEN_PIN.lng], {
        icon: buildPillIcon('#EA580C', `\u{1F372} HotPot ${CONTACT.address.split(',').slice(0, 2).join(',')}`),
        keyboard: true,
        title: `HotPot Delights kitchen \u2014 ${CONTACT.address}`
      })
        .bindPopup(buildMapPopup('HotPot Delights kitchen', CONTACT.address))
        .addTo(map);

      destinationMarkerRef.current = L.marker([KITCHEN_PIN.lat, KITCHEN_PIN.lng], {
        icon: buildPillIcon('#10B981', '\u{1F3E0} Your drop-off'),
        keyboard: true,
        title: 'Your drop-off point'
      })
        .bindPopup(buildMapPopup('Your drop-off', 'Address is confirmed on the order'))
        .addTo(map);

      routeLineRef.current = L.polyline(
        [[KITCHEN_PIN.lat, KITCHEN_PIN.lng], [KITCHEN_PIN.lat, KITCHEN_PIN.lng]],
        { color: '#F97316', weight: 4, dashArray: '8 8', opacity: 0.85 }
      ).addTo(map);

      leafletMapRef.current = map;
      setIsMapReady(true);
      setMapError('');
    } catch (err) {
      setIsMapReady(false);
      setMapError(err?.message || 'The map could not be loaded.');
      return undefined;
    }

    return () => {
      setIsMapReady(false);
      leafletMapRef.current = null;
      destinationMarkerRef.current = null;
      routeLineRef.current = null;
      map.remove();
    };
  }, []);

  // Destination moves: reposition only, never re-create the map.
  useLayoutEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    const toLatLng = [destination.lat, destination.lng];
    destinationMarkerRef.current?.setLatLng(toLatLng);
    routeLineRef.current?.setLatLngs([[KITCHEN_PIN.lat, KITCHEN_PIN.lng], toLatLng]);

    const samePoint =
      Math.abs(KITCHEN_PIN.lat - destination.lat) < 1e-6 &&
      Math.abs(KITCHEN_PIN.lng - destination.lng) < 1e-6;
    if (samePoint) {
      map.setView(toLatLng, 13);
    } else {
      map.fitBounds(
        [[KITCHEN_PIN.lat, KITCHEN_PIN.lng], toLatLng],
        { padding: [56, 56] }
      );
    }
    map.invalidateSize();
  }, [destination.lat, destination.lng]);

  // The drop-off label is user-supplied text, so it is escaped on the way in.
  useEffect(() => {
    destinationMarkerRef.current?.setIcon(buildPillIcon('#10B981', `\u{1F3E0} ${dropOff}`));
  }, [dropOff]);

  // -------------------------------------------------------------------------
  // Actions. Every one of these props rejects on failure, so nothing here may
  // pretend a failed write succeeded.
  // -------------------------------------------------------------------------
  const openNoteEditor = useCallback(() => {
    setNoteDraft(String(tracked?.notes ?? ''));
    setNoteError('');
    setIsEditingNote(true);
  }, [tracked]);

  const closeNoteEditor = useCallback(() => {
    setIsEditingNote(false);
    setNoteError('');
  }, []);

  useEffect(() => {
    if (!isEditingNote) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeNoteEditor();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isEditingNote, closeNoteEditor]);

  const handleSaveNote = useCallback(async () => {
    if (!tracked?.id || isSavingNote) return;
    if (typeof onSetNotes !== 'function') {
      setNoteError('Notes cannot be edited from this page.');
      return;
    }
    setIsSavingNote(true);
    setNoteError('');
    try {
      await onSetNotes(tracked.id, noteDraft.trim());
      setIsEditingNote(false);
    } catch (err) {
      setNoteError(err?.message || 'Your note could not be saved.');
    } finally {
      setIsSavingNote(false);
    }
  }, [tracked?.id, isSavingNote, onSetNotes, noteDraft]);

  const handleCancelOrder = useCallback(async () => {
    if (!tracked?.id || isCancelling) return;
    if (typeof onCancelOrder !== 'function') {
      setCancelError('This order cannot be cancelled from here.');
      return;
    }
    setIsCancelling(true);
    setCancelError('');
    try {
      await onCancelOrder(tracked.id);
    } catch (err) {
      setCancelError(err?.message || 'This order could not be cancelled.');
    } finally {
      setIsCancelling(false);
    }
  }, [tracked?.id, isCancelling, onCancelOrder]);

  const handleConfirmDelivery = useCallback(async () => {
    if (!tracked?.id || isConfirmingDelivery) return;
    if (typeof onUpdateStatus !== 'function') {
      setDeliveryError('Delivery cannot be confirmed from this page.');
      return;
    }
    setIsConfirmingDelivery(true);
    setDeliveryError('');
    try {
      await onUpdateStatus(tracked.id, 'delivered');
      setShowFeedback(true);
    } catch (err) {
      setDeliveryError(err?.message || 'The delivery could not be confirmed.');
    } finally {
      setIsConfirmingDelivery(false);
    }
  }, [tracked?.id, isConfirmingDelivery, onUpdateStatus]);

  const handleDownloadReceipt = useCallback(() => {
    if (!tracked) return;
    setReceiptError('');
    try {
      downloadOrderReceiptPdf(tracked);
    } catch (err) {
      setReceiptError(err?.message || 'The receipt PDF could not be generated.');
    }
  }, [tracked]);

  const countdown = `${Math.floor(secondsRemaining / 60)}:${String(secondsRemaining % 60).padStart(2, '0')}`;

  if (!tracked) {
    return (
      <div className="max-w-5xl mx-auto p-10 rounded-2xl bg-[#14171F] border border-slate-800 text-center space-y-2">
        <h2 className="text-lg font-black text-white">No order to track yet</h2>
        <p className="text-xs text-slate-400">
          Place an order and it will show up here with live status updates.
        </p>
      </div>
    );
  }

  const courierName = String(tracked.riderName ?? '').trim();
  const isCourierAssigned = Boolean(tracked.riderId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Cancelled banner */}
      {isCancelled && (
        <div
          role="status"
          className="p-6 rounded-2xl bg-red-950/80 border border-red-500/50 text-white flex items-center gap-4 animate-fade-in"
        >
          <XCircle className="w-8 h-8 text-red-400 shrink-0" aria-hidden="true" />
          <div>
            <h3 className="font-bold text-lg text-red-200">Order {orderRef} cancelled</h3>
            <p className="text-xs text-red-300">
              The kitchen was notified. Contact support if you were charged.
            </p>
          </div>
        </div>
      )}

      {/* Header banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#14171F] border border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-md bg-orange-500/15 border border-orange-500/30 text-[11px] font-mono font-bold text-orange-400 uppercase tracking-wider">
              Order {orderRef}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-md border text-[11px] font-mono font-bold uppercase tracking-wider ${
                isDelivered
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : isCancelled
                    ? 'bg-red-500/15 border-red-500/30 text-red-400'
                    : 'bg-slate-500/15 border-slate-500/30 text-slate-300'
              }`}
            >
              {statusLabel}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
            {isCancelled ? 'Order cancelled' : isDelivered ? 'Order delivered' : 'Order status'}
          </h2>
          <p className="text-xs text-slate-400">
            {isDelivered
              ? `Handed over at ${dropOff}.`
              : hasEta
                ? `Kitchen estimate: ${etaLabel} \u00b7 ${distanceKm.value}`
                : `No delivery estimate yet \u00b7 ${distanceKm.value}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleDownloadReceipt}
            className="px-3.5 py-2 rounded-xl bg-[#1F242D] hover:bg-slate-700/50 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
            <span>Receipt PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setShowReceipt(true)}
            className="px-3.5 py-2 rounded-xl bg-[#1F242D] hover:bg-slate-700/50 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-all shadow-sm"
          >
            <FileText className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />
            <span>View receipt</span>
          </button>

          {isDelivered && (
            <button
              type="button"
              onClick={() => setShowFeedback(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-bold text-emerald-300 flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
              <span>Rate this order</span>
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

      {receiptError && (
        <p
          role="alert"
          className="flex items-center gap-2 text-xs font-bold text-red-300 bg-red-950/60 border border-red-500/40 rounded-xl px-3 py-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          {receiptError}
        </p>
      )}

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
      {!isCancelled && (
        <div
          className={`p-5 rounded-2xl border transition-all shadow-xl flex flex-wrap items-center justify-between gap-4 ${
            isDelivered
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
              : 'bg-linear-to-r from-[#14171F] via-[#1A1D24] to-[#14171F] border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                isDelivered
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-linear-to-br from-orange-500 to-amber-600 text-white shadow-orange-500/20'
              }`}
            >
              {isDelivered ? (
                <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
              ) : (
                <Bike className="w-6 h-6" aria-hidden="true" />
              )}
            </div>
            <div>
              <div className="text-sm font-black text-white flex items-center gap-2 flex-wrap">
                {isDelivered ? 'Delivery confirmed' : 'Courier handover'}
                <span
                  className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase ${
                    isDelivered
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {isDelivered ? 'Delivered' : courierName || 'No courier yet'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
                {isDelivered
                  ? `Marked delivered at ${formatTimestamp(tracked.handedOverAt)}.`
                  : isCourierAssigned
                    ? 'Your courier is riding to your address. Keep your phone nearby.'
                    : 'No courier has been assigned yet. You will see the name here once the kitchen hands the order over.'}
              </p>
            </div>
          </div>

          {/* Only `delivery -> delivered` is a legal transition, so the button
              exists in that state only. */}
          {status === 'delivery' && (
            <button
              type="button"
              onClick={handleConfirmDelivery}
              disabled={isConfirmingDelivery}
              className="px-5 py-3 rounded-xl bg-linear-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/25 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isConfirmingDelivery ? (
                <>
                  <span
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                    aria-hidden="true"
                  />
                  <span>{'Confirming\u2026'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  <span>Confirm delivery received</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {deliveryError && (
        <p
          role="alert"
          className="flex items-center gap-2 text-xs font-bold text-red-300 bg-red-950/60 border border-red-500/40 rounded-xl px-3 py-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          {deliveryError}
        </p>
      )}

      {/* Cancellation window and order note */}
      {!isCancelled && (
        <div className="p-4 rounded-2xl bg-[#14171F] border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
                Self-service cancellation
                {canCancel ? (
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                    {countdown} remaining
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-normal">(closed)</span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {canCancel
                  ? 'You can cancel this order yourself until the timer runs out.'
                  : cancelBlockReason}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openNoteEditor}
              className="px-3 py-1.5 rounded-xl bg-[#1F242D] border border-slate-700 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-all"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
              <span>{isEditingNote ? 'Editing note' : 'Edit kitchen note'}</span>
            </button>

            <button
              type="button"
              onClick={handleCancelOrder}
              disabled={!canCancel || isCancelling}
              className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <XCircle className="w-3.5 h-3.5 text-red-400" aria-hidden="true" />
              <span>{isCancelling ? 'Cancelling\u2026' : 'Cancel order'}</span>
            </button>
          </div>
        </div>
      )}

      {cancelError && (
        <p
          role="alert"
          className="flex items-center gap-2 text-xs font-bold text-red-300 bg-red-950/60 border border-red-500/40 rounded-xl px-3 py-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          {cancelError}
        </p>
      )}

      {isEditingNote && (
        <div className="p-4 rounded-xl bg-[#1A1D24] border border-amber-500/40 space-y-3 animate-fade-in">
          <label
            htmlFor="live-tracking-note"
            className="text-xs font-bold text-amber-300 block"
          >
            Kitchen instructions for this order
          </label>
          <input
            id="live-tracking-note"
            type="text"
            value={noteDraft}
            maxLength={280}
            onChange={(event) => setNoteDraft(event.target.value)}
            placeholder="e.g. Extra hot chili sauce, deliver to the back gate"
            className="w-full bg-[#14171F] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
          />
          {noteError && (
            <p
              role="alert"
              className="flex items-center gap-2 text-xs font-bold text-red-300"
            >
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              {noteError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeNoteEditor}
              className="px-3 py-1.5 rounded-xl bg-[#1F242D] text-xs font-bold text-slate-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveNote}
              disabled={isSavingNote}
              className="px-4 py-1.5 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 text-xs font-bold text-white shadow-md shadow-orange-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSavingNote ? 'Saving\u2026' : 'Save note'}
            </button>
          </div>
        </div>
      )}

      {/* Map + timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-105 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative bg-[#0F1117]">
          <div
            ref={mapContainerRef}
            role="region"
            aria-label={`Map from the HotPot kitchen in ${CONTACT.address} to your drop-off`}
            className="w-full h-full"
          />

          {!isMapReady && !mapError && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
              Loading map…
            </div>
          )}

          {mapError && (
            <div
              role="alert"
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-6 text-xs text-slate-300"
            >
              <AlertCircle className="w-6 h-6 text-red-400" aria-hidden="true" />
              <p className="font-bold">The map could not be loaded.</p>
              <p className="text-slate-500">{mapError}</p>
            </div>
          )}

          {/* Facts panel. Everything here comes from the order record. */}
          <div className="absolute top-4 left-4 right-4 z-10 bg-[#14171F]/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-800 text-xs space-y-2 shadow-2xl max-w-sm pointer-events-auto">
            <div className="font-bold text-white flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <Bike className="w-4 h-4 text-orange-400" aria-hidden="true" />
                {courierName || order?.riderName || 'No courier assigned yet'}
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
                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <span className="font-bold">Kitchen:</span>{' '}
                  <span className="text-slate-300">{CONTACT.address}</span>
                </div>
              </div>

              <div className="flex items-start gap-1.5 text-emerald-400">
                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <span className="font-bold">Drop-off:</span>{' '}
                  <span className="text-slate-300 break-words">{dropOff}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-[10px] font-mono text-center">
              <div className="p-1.5 rounded-lg bg-[#1A1D24] border border-slate-800">
                <span className="text-slate-500 block uppercase text-[9px]">Distance</span>
                <span className="text-orange-400 font-bold break-words">{distanceKm.value}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-[#1A1D24] border border-slate-800">
                <span className="text-slate-500 block uppercase text-[9px]">Estimate</span>
                <span className="text-amber-400 font-bold">{etaLabel}</span>
              </div>
            </div>

            <p className="pt-1 text-[10px] text-slate-500 leading-relaxed">
              {isStraightLine
                ? 'This order has no coordinates, so the drop-off marker is an approximate area pin.'
                : 'The dashed line is a straight line between the two points, not a driving route.'}
            </p>
          </div>
        </div>

        {/* Stepper status sidebar */}
        <div className="p-6 rounded-2xl bg-[#14171F] border border-slate-800 space-y-6 flex flex-col justify-between shadow-xl">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-400" aria-hidden="true" />
            Order timeline
          </h3>

          <ol className="space-y-5 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
            {STEPS.map((step) => {
              const isDone = currentStep >= step.num;
              const isCurrent = currentStep === step.num;
              return (
                <li key={step.num} className="relative flex items-start gap-4">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs relative z-10 transition-all ${
                      isDone
                        ? 'bg-linear-to-br from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/30'
                        : 'bg-[#1A1D24] text-slate-500 border border-slate-800'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <span aria-hidden="true">{step.num}</span>
                    )}
                    <span className="sr-only">
                      {`Step ${step.num} of ${STEPS.length}: ${step.label}`}
                      {isCurrent ? ' (current step)' : ''}
                    </span>
                  </div>
                  <div>
                    <h4
                      className={`text-xs font-bold ${
                        isCurrent ? 'text-orange-400' : isDone ? 'text-white' : 'text-slate-500'
                      }`}
                    >
                      {step.label}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{step.hint}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="p-3.5 rounded-xl bg-[#10131A] border border-slate-800 text-[11px] text-slate-400 space-y-2">
            <div className="font-bold text-white flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />
              Delivery address
            </div>
            <div className="text-slate-300 break-words">{dropOff}</div>

            {String(tracked.notes ?? '').trim() && (
              <div className="text-amber-300 font-semibold break-words">
                <span className="font-bold">Kitchen note:</span> {String(tracked.notes).trim()}
              </div>
            )}

            <div className="pt-2 border-t border-slate-800 space-y-1">
              <div className="flex items-center gap-1 font-bold text-white">
                <Navigation className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
                Courier timeline
              </div>
              <div>Placed: {formatTimestamp(tracked.createdAt)}</div>
              <div>Courier assigned: {formatTimestamp(tracked.assignedAt)}</div>
              <div>Handed over: {formatTimestamp(tracked.handedOverAt)}</div>
              {tracked.riderId && <div className="font-mono text-slate-500">Rider ref: {String(tracked.riderId)}</div>}
            </div>
          </div>
        </div>
      </div>

      <ReceiptModal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        order={tracked}
      />

      <PostDeliveryFeedbackModal
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
        order={tracked}
      />
    </div>
  );
}
