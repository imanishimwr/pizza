import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, X, Check, RefreshCw, Printer, Navigation,
  Phone, Bike, AlertCircle, Trash2
} from 'lucide-react';
import L from 'leaflet';
import { jsPDF } from 'jspdf';
import { useAdmin } from '../../context/AdminContext';
import {
  RESTAURANT, ORDER_STATUSES, formatRwf, formatWhen, formatClock,
  statusLabel, statusBadge, isLiveStatus, isRiderFree, destinationFor, normalizeOrderStatus
} from '../../utils/adminHelpers';
import { assignRider, reassignRider, deleteOrder as apiDeleteOrder } from '../../services/apiService';
import { notificationService } from '../../services/notificationService';
import { Pager, ModalShell, Field, OrderCardSkeleton, ConfirmModal } from '../../components/admin/AdminComponents';

export default function AdminOrders() {
  const {
    orders, loading, onUpdateStatus, onCancelOrder, onDeleteOrder,
    riders, loadSnapshot, soundEnabled, announce, ridersError
  } = useAdmin();

  const [searchParams, setSearchParams] = useSearchParams();

  // Filters & Pagination
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderPage, setOrderPage] = useState(1);
  const ordersPerPage = 6;

  // Status transitions & dispatching state
  const [pendingStatusChange, setPendingStatusChange] = useState(null);
  const [dispatchingOrderId, setDispatchingOrderId] = useState(null);
  const [deletingOrderId, setDeletingOrderId] = useState(null);
  const [riderDraft, setRiderDraft] = useState({});
  const [reassignTarget, setReassignTarget] = useState(null);
  const [reassignSelectedRider, setReassignSelectedRider] = useState('');
  const [isReassigning, setIsReassigning] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // Tracking modal state
  const [trackingOrderId, setTrackingOrderId] = useState(() => searchParams.get('track') || null);
  const [mapNode, setMapNode] = useState(null);
  const mapRef = useRef(null);
  const staticLayersRef = useRef([]);
  const riderMarkerRef = useRef(null);

  // Sync trackingOrderId with URL if param changes
  useEffect(() => {
    const trackParam = searchParams.get('track');
    if (trackParam && trackParam !== trackingOrderId) {
      setTrackingOrderId(trackParam);
    }
  }, [searchParams, trackingOrderId]);

  const [locallyDeletedIds, setLocallyDeletedIds] = useState(() => new Set());

  const displayOrders = useMemo(() => {
    const list = Array.isArray(orders) ? orders : [];
    if (locallyDeletedIds.size === 0) return list;
    return list.filter((o) => !locallyDeletedIds.has(String(o.id)));
  }, [orders, locallyDeletedIds]);
  const readyOrders = useMemo(() => displayOrders.filter((o) => normalizeOrderStatus(o.status) === 'ready'), [displayOrders]);
  const freeRiders = useMemo(() => (Array.isArray(riders) ? riders.filter(isRiderFree) : []), [riders]);

  const riderDeliveryCounts = useMemo(() => {
    const counts = {};
    (displayOrders || []).forEach((o) => {
      const norm = normalizeOrderStatus(o.status);
      if (['ongoing', 'ready'].includes(norm) && o.riderId) {
        const key = String(o.riderId);
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [displayOrders]);

  const trackingOrder = useMemo(
    () => (trackingOrderId ? displayOrders.find((o) => String(o.id) === String(trackingOrderId)) || null : null),
    [displayOrders, trackingOrderId]
  );

  const assignedRider = useMemo(() => {
    if (!trackingOrder?.riderId) return null;
    return riders.find((r) => String(r.id) === String(trackingOrder.riderId)) || null;
  }, [riders, trackingOrder]);

  const trackingDestination = useMemo(() => destinationFor(trackingOrder), [trackingOrder]);
  const riderHasFix = useMemo(() => {
    if (!assignedRider) return false;
    const lat = Number(assignedRider.lastLat);
    const lng = Number(assignedRider.lastLng);
    return Number.isFinite(lat) && Number.isFinite(lng);
  }, [assignedRider]);

  // Leaflet map setup for tracking
  useEffect(() => {
    if (!mapNode) return undefined;
    const map = L.map(mapNode).setView(RESTAURANT, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);
    mapRef.current = map;

    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      map.remove();
      mapRef.current = null;
    };
  }, [mapNode]);

  // Static tracking layers (restaurant, destination, polyline) — only rebuilt on order switch
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !trackingOrder) return undefined;

    staticLayersRef.current.forEach((l) => l.remove());
    staticLayersRef.current = [];

    const destination = destinationFor(trackingOrder);
    const bounds = destination ? [RESTAURANT, destination] : [RESTAURANT];

    const restaurantMarker = L.circleMarker(RESTAURANT, {
      radius: 9,
      color: '#ffffff',
      weight: 2,
      fillColor: '#AE3200',
      fillOpacity: 1
    }).addTo(map);
    restaurantMarker.bindPopup('HotPot Delights kitchen');
    staticLayersRef.current.push(restaurantMarker);

    if (destination) {
      const destinationMarker = L.circleMarker(destination, {
        radius: 9,
        color: '#ffffff',
        weight: 2,
        fillColor: '#128731',
        fillOpacity: 1
      }).addTo(map);
      destinationMarker.bindPopup(trackingOrder.customerName || 'Drop-off point');
      staticLayersRef.current.push(destinationMarker);

      const routeLine = L.polyline([RESTAURANT, destination], {
        color: '#AE3200',
        weight: 4,
        dashArray: '8 8',
        opacity: 0.85
      }).addTo(map);
      staticLayersRef.current.push(routeLine);
    }

    map.fitBounds(bounds, { padding: [45, 45] });

    return () => {
      staticLayersRef.current.forEach((l) => l.remove());
      staticLayersRef.current = [];
    };
  }, [mapNode, trackingOrderId]);

  // Live courier marker — updates coordinates without rebuilding static map layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;

    if (!assignedRider) {
      if (riderMarkerRef.current) {
        riderMarkerRef.current.remove();
        riderMarkerRef.current = null;
      }
      return undefined;
    }

    const live = [assignedRider.lastLat, assignedRider.lastLng].map(Number);
    const hasFix = Number.isFinite(live[0]) && Number.isFinite(live[1]);
    const position = hasFix ? live : RESTAURANT;

    if (!riderMarkerRef.current) {
      riderMarkerRef.current = L.circleMarker(position, {
        radius: 8,
        color: '#60a5fa',
        weight: 3,
        fillColor: '#2563eb',
        fillOpacity: 1
      })
        .addTo(map)
        .bindPopup(assignedRider.name || 'Courier');
    } else {
      riderMarkerRef.current.setLatLng(position);
      riderMarkerRef.current.setPopupContent(assignedRider.name || 'Courier');
    }

    return () => {
      if (riderMarkerRef.current) {
        riderMarkerRef.current.remove();
        riderMarkerRef.current = null;
      }
    };
  }, [assignedRider]);

  // Transitions: ongoing -> ready -> delivered
  const transitionsFor = (order) => {
    if (!onUpdateStatus) return [];
    const status = normalizeOrderStatus(order.status);
    if (status === 'ongoing') return [{ to: 'ready', label: 'Mark Ready', tone: 'emerald' }];
    if (status === 'ready') return [{ to: 'delivered', label: 'Mark Delivered', tone: 'emerald' }];
    return [];
  };

  const toneClass = {
    blue: 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-600 hover:text-white',
    emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600 hover:text-white'
  };

  const handleUpdateStatus = async (order, to) => {
    const key = `${order.id}:${to}`;
    if (pendingStatusChange) return;
    setPendingStatusChange(key);
    try {
      await onUpdateStatus(order.id, to);
      if (soundEnabled) notificationService.playChime('status_update');
      announce('success', `Order #${order.id} is now ${statusLabel(to).toLowerCase()}.`);
    } catch (err) {
      announce('error', err?.message || `Could not move order #${order.id} to ${to}.`);
    } finally {
      setPendingStatusChange(null);
    }
  };

  const handleCancelOrder = (order) => {
    if (!onCancelOrder || pendingStatusChange) return;
    setConfirmAction({
      title: `Cancel order #${order.id}?`,
      message: `Are you sure you want to cancel order #${order.id}? The customer and kitchen will be notified immediately. This action cannot be undone.`,
      confirmText: 'Cancel order',
      cancelText: 'Keep order',
      tone: 'danger',
      onConfirm: async () => {
        setConfirmAction(null);
        setPendingStatusChange(`${order.id}:cancelled`);
        try {
          await onCancelOrder(order.id);
          announce('success', `Order #${order.id} cancelled.`);
        } catch (err) {
          announce('error', err?.message || `Could not cancel order #${order.id}.`);
        } finally {
          setPendingStatusChange(null);
        }
      }
    });
  };

  const handleDeleteOrder = (order) => {
    if (deletingOrderId) return;
    const targetId = order.id;
    setConfirmAction({
      title: `Permanently delete order #${targetId}?`,
      message: `This will remove order #${targetId} from the system and cannot be undone.`,
      confirmText: 'Delete permanently',
      cancelText: 'Cancel',
      tone: 'danger',
      onConfirm: async () => {
        // 1. Immediately dismiss modal so user doesn't wait
        setConfirmAction(null);
        // 2. Immediately remove order from UI optimistically
        setLocallyDeletedIds((prev) => new Set(prev).add(String(targetId)));
        setDeletingOrderId(targetId);

        try {
          if (onDeleteOrder) {
            await onDeleteOrder(targetId);
          } else {
            await apiDeleteOrder(targetId);
          }
          announce('success', `Order #${targetId} has been permanently deleted.`);
          await loadSnapshot({ quiet: true });
        } catch (err) {
          // Rollback on failure
          setLocallyDeletedIds((prev) => {
            const next = new Set(prev);
            next.delete(String(targetId));
            return next;
          });
          announce('error', err?.message || `Could not delete order #${targetId}.`);
        } finally {
          setDeletingOrderId(null);
        }
      }
    });
  };

  const handleAssignRider = async (order, riderId) => {
    if (!riderId) {
      announce('error', 'Choose a motorcyclist before assigning.');
      return;
    }
    if (dispatchingOrderId) return;
    setDispatchingOrderId(order.id);
    try {
      await assignRider(order.id, riderId);
      if (soundEnabled) notificationService.playChime('order_ready');
      const rider = riders.find((r) => String(r.id) === String(riderId));
      announce('success', `Order #${order.id} assigned to ${rider?.name || 'motorcyclist'}.`);
      setRiderDraft((prev) => {
        const next = { ...prev };
        delete next[order.id];
        return next;
      });
      await loadSnapshot({ quiet: true });
    } catch (err) {
      announce('error', err?.message || `Could not assign order #${order.id}.`);
    } finally {
      setDispatchingOrderId(null);
    }
  };

  const handleReassignRider = async ({ orderId, newRiderId }) => {
    if (isReassigning) return;
    setIsReassigning(true);
    try {
      await reassignRider(orderId, newRiderId || null);
      announce('success', newRiderId ? `Order #${orderId} reassigned.` : `Order #${orderId} released back to the ready queue.`);
      setReassignTarget(null);
      setReassignSelectedRider('');
      await loadSnapshot({ quiet: true });
    } catch (err) {
      announce('error', err?.message || `Could not reassign order #${orderId}.`);
    } finally {
      setIsReassigning(false);
    }
  };

  const handlePrintTicket = (order) => {
    try {
      const width = 80;
      const margin = 4;
      const doc = new jsPDF({ unit: 'mm', format: [width, 150] });
      let y = 8;

      doc.setFont('courier', 'bold');
      doc.setFontSize(11);
      doc.text('HOTPOT DELIGHTS', width / 2, y, { align: 'center' });
      y += 4.5;
      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      doc.text('Kigali Kitchen & Dispatch Station', width / 2, y, { align: 'center' });
      y += 3;
      doc.setDrawColor(0);
      doc.setLineDashPattern([0.6, 0.6], 0);
      doc.line(margin, y, width - margin, y);
      y += 5;

      doc.setFont('courier', 'bold');
      doc.setFontSize(10);
      doc.text(`ORDER #${order.id}`, margin, y);
      y += 4.5;
      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.text(`Date: ${formatWhen(order.createdAt) || 'unknown'}`, margin, y);
      y += 4;
      doc.text(`Status: ${(order.status || 'unknown').toUpperCase()}`, margin, y);
      y += 4;
      doc.text(`Customer: ${order.customerName || 'Walk-in'}`, margin, y);
      y += 4;
      doc.text(`Phone: ${order.phone || 'N/A'}`, margin, y);
      y += 4;
      doc.text(`Dest: ${order.address || 'Kigali'}`, margin, y);
      y += 4;
      if (order.riderName) {
        doc.text(`Rider: ${order.riderName}`, margin, y);
        y += 4;
      }
      doc.line(margin, y, width - margin, y);
      y += 5;

      doc.setFont('courier', 'bold');
      doc.text('ITEMS:', margin, y);
      y += 4;
      doc.setFont('courier', 'normal');
      (order.items || []).forEach((item) => {
        const itemLine = `${item.qty || 1}x ${item.name}`;
        const priceLine = `${formatRwf(item.price)} RWF`;
        doc.text(itemLine.slice(0, 24), margin, y);
        doc.text(priceLine, width - margin, y, { align: 'right' });
        y += 4;
      });

      doc.line(margin, y, width - margin, y);
      y += 5;
      doc.setFont('courier', 'bold');
      doc.setFontSize(9);
      doc.text('TOTAL:', margin, y);
      doc.text(`${formatRwf(order.totalRWF)} RWF`, width - margin, y, { align: 'right' });
      y += 6;
      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      doc.text('Thank you for dining with HotPot Delights!', width / 2, y, { align: 'center' });

      doc.save(`HotPot_Kitchen_Ticket_${order.id}.pdf`);
    } catch (err) {
      announce('error', err?.message || `Could not build ticket for order #${order.id}.`);
    }
  };

  // Filtered & Paginated orders
  const filteredOrders = useMemo(() => {
    return displayOrders.filter((o) => {
      if (orderStatusFilter !== 'all' && normalizeOrderStatus(o.status) !== orderStatusFilter) {
        return false;
      }
      if (orderSearch.trim()) {
        const query = orderSearch.toLowerCase();
        const matchesId = String(o.id).toLowerCase().includes(query);
        const matchesCust = o.customerName?.toLowerCase().includes(query);
        const matchesPhone = o.phone?.toLowerCase().includes(query);
        const matchesAddr = o.address?.toLowerCase().includes(query);
        if (!matchesId && !matchesCust && !matchesPhone && !matchesAddr) return false;
      }
      return true;
    });
  }, [displayOrders, orderStatusFilter, orderSearch]);

  const totalOrderPages = Math.ceil(filteredOrders.length / ordersPerPage) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (orderPage - 1) * ordersPerPage;
    return filteredOrders.slice(start, start + ordersPerPage);
  }, [filteredOrders, orderPage]);

  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <label htmlFor="order-search" className="sr-only">
            Search orders
          </label>
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            id="order-search"
            type="text"
            value={orderSearch}
            onChange={(e) => {
              setOrderSearch(e.target.value);
              setOrderPage(1);
            }}
            placeholder="Search by id, customer, phone or address"
            className="w-full bg-[#1F242D] border border-slate-700/50 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/70"
          />
          {orderSearch && (
            <button
              type="button"
              onClick={() => {
                setOrderSearch('');
                setOrderPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-white"
              aria-label="Clear order search"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[{ id: 'all', label: 'All' }, ...ORDER_STATUSES.map((s) => ({ id: s, label: statusLabel(s) }))].map(
            (st) => {
              const count = st.id === 'all'
                ? displayOrders.length
                : displayOrders.filter((o) => normalizeOrderStatus(o.status) === st.id).length;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    setOrderStatusFilter(st.id);
                    setOrderPage(1);
                  }}
                  aria-pressed={orderStatusFilter === st.id}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    orderStatusFilter === st.id
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60'
                      : 'bg-[#1F242D] text-slate-300 hover:text-white border border-slate-700/50'
                  }`}
                >
                  {st.label} ({count})
                </button>
              );
            }
          )}
        </div>
      </div>

      {loading && filteredOrders.length === 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <OrderCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-sm bg-[#1A1D24] rounded-2xl border border-slate-800">
          No orders matched your search or status filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {paginatedOrders.map((order) => {
            const transitions = transitionsFor(order);
            const isDispatching = dispatchingOrderId === order.id;
            const draftRider = riderDraft[order.id] ?? '';
            const isOrderBusy = (pendingStatusChange && pendingStatusChange.startsWith(order.id + ':')) || isDispatching;

            return (
              <article
                key={order.id}
                className="p-5 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-xl space-y-4 hover:border-orange-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-white text-sm">#{order.id}</span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${statusBadge(order.status)}`}>
                          {statusLabel(order.status)}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white mt-1 truncate">{order.customerName || 'Customer'}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{order.phone || 'No phone on file'}</span>
                        <span aria-hidden="true">&middot;</span>
                        <span className="truncate">{order.address || 'Kigali'}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-black font-mono text-orange-400">{formatRwf(order.totalRWF)} RWF</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{formatClock(order.createdAt) || 'time unknown'}</div>
                    </div>
                  </div>

                  <div className="py-2 space-y-1.5">
                    {(order.items || []).length === 0 ? (
                      <p className="text-xs text-slate-500">No line items on this order.</p>
                    ) : (
                      order.items.map((item, idx) => (
                        <div key={item.id ?? `${order.id}-item-${idx}`} className="text-xs text-slate-400 flex items-center justify-between gap-2">
                          <span className="truncate">
                            <strong className="text-white">{item.qty || 1}x</strong> {item.name}
                            {item.spice && <span className="text-orange-400 text-[10px] ml-1">({item.spice})</span>}
                          </span>
                          <span className="font-mono text-white text-[11px] shrink-0">{formatRwf(item.price)} RWF</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Motorcyclist Assignment Section */}
                {['ongoing', 'ready'].includes(normalizeOrderStatus(order.status)) && (
                  <div className="p-3.5 rounded-xl bg-[#12141A] border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Bike className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />
                        <span>Motorcyclist Assignment</span>
                      </p>
                      {order.riderId ? (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                          (riderDeliveryCounts[String(order.riderId)] || 0) <= 1
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        }`}>
                          {(riderDeliveryCounts[String(order.riderId)] || 0) <= 1
                            ? 'Free (only this order)'
                            : `${riderDeliveryCounts[String(order.riderId)]} active deliveries`}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          No motorcyclist assigned
                        </span>
                      )}
                    </div>

                    {order.riderId ? (
                      <div className="space-y-2">
                        {(() => {
                          const riderInfo = riders.find((r) => String(r.id) === String(order.riderId));
                          return (
                            <div className="p-2.5 rounded-lg bg-[#181B22] border border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-white">
                                    {order.riderName || riderInfo?.name || 'Motorcyclist'}
                                  </span>
                                  {riderInfo?.plateNumber && (
                                    <span className="font-mono text-[11px] font-bold text-amber-400">
                                      {riderInfo.plateNumber}
                                    </span>
                                  )}
                                  {riderInfo?.vehicleType && (
                                    <span className="text-[10px] text-slate-400">
                                      ({riderInfo.vehicleType})
                                    </span>
                                  )}
                                </div>
                                {riderInfo?.phone && (
                                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                                    <Phone className="w-3 h-3 text-emerald-400" aria-hidden="true" />
                                    <a href={`tel:${riderInfo.phone}`} className="text-emerald-400 hover:underline font-mono">
                                      {riderInfo.phone}
                                    </a>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReassignSelectedRider('');
                                    setReassignTarget({ orderId: order.id, fromRiderId: order.riderId });
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-200 text-[11px] font-bold hover:bg-amber-500/25 transition-all"
                                >
                                  Reassign
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConfirmAction({
                                      title: `Release motorcyclist from order #${order.id}?`,
                                      message: `Detach ${order.riderName || 'the motorcyclist'} from order #${order.id}?`,
                                      confirmText: 'Release',
                                      cancelText: 'Cancel',
                                      tone: 'warning',
                                      onConfirm: async () => {
                                        setConfirmAction(null);
                                        await handleReassignRider({ orderId: order.id, newRiderId: null });
                                      }
                                    });
                                  }}
                                  disabled={isReassigning}
                                  className="px-2.5 py-1.5 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 text-[11px] font-bold hover:bg-red-500/25 disabled:opacity-60 transition-all"
                                >
                                  Release
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : ridersError ? (
                      <p role="alert" className="text-[11px] text-red-300">
                        {ridersError}
                      </p>
                    ) : riders.length === 0 ? (
                      <p className="text-[11px] text-slate-400">
                        No motorcyclists registered yet. Go to Fleet to register couriers.
                      </p>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <label htmlFor={`rider-${order.id}`} className="sr-only">
                          Motorcyclist for order #{order.id}
                        </label>
                        <select
                          id={`rider-${order.id}`}
                          value={draftRider}
                          onChange={(e) => setRiderDraft((prev) => ({ ...prev, [order.id]: e.target.value }))}
                          className="flex-1 bg-[#181B22] border border-slate-700/60 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 min-h-11"
                        >
                          <option value="">-- Choose motorcyclist --</option>
                          {riders.map((rider) => {
                            const count = riderDeliveryCounts[String(rider.id)] || 0;
                            const isFree = isRiderFree(rider, count);
                            return (
                              <option key={rider.id} value={rider.id}>
                                {rider.name} ({rider.plateNumber || 'No plate'}) — {isFree ? 'Free to take client order (0 active)' : `${count} active ${count === 1 ? 'delivery' : 'deliveries'}`}
                              </option>
                            );
                          })}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleAssignRider(order, draftRider)}
                          disabled={isOrderBusy || !draftRider}
                          className="px-3 py-2 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 min-h-11 disabled:opacity-60 transition-all shadow-md"
                        >
                          {isDispatching ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Bike className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                          <span>{isDispatching ? 'Assigning...' : 'Assign'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* If order is delivered, show rider summary */}
                {normalizeOrderStatus(order.status) === 'delivered' && order.riderName && (
                  <div className="p-2.5 rounded-xl bg-[#12141A] border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Bike className="w-3.5 h-3.5 text-teal-400" aria-hidden="true" />
                      Delivered by:
                    </span>
                    <strong className="text-white font-medium">{order.riderName}</strong>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {transitions.map((t) => {
                      const isPending = pendingStatusChange === `${order.id}:${t.to}`;
                      return (
                        <button
                          key={t.to}
                          type="button"
                          onClick={() => handleUpdateStatus(order, t.to)}
                          disabled={Boolean(pendingStatusChange)}
                          className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all min-h-11 flex items-center justify-center gap-1.5 disabled:opacity-60 ${
                            toneClass[t.tone]
                          }`}
                        >
                          {isPending ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                          <span>{isPending ? 'Saving...' : t.label}</span>
                        </button>
                      );
                    })}
                    {onCancelOrder && isLiveStatus(order.status) && (
                      <button
                        type="button"
                        onClick={() => handleCancelOrder(order)}
                        disabled={Boolean(pendingStatusChange) || deletingOrderId === order.id}
                        className="px-3 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30 text-xs font-bold hover:bg-red-600 hover:text-white transition-all min-h-11 disabled:opacity-60"
                      >
                        Cancel order
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteOrder(order)}
                      disabled={deletingOrderId === order.id || Boolean(pendingStatusChange)}
                      className="px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all min-h-11 disabled:opacity-60"
                      title={`Permanently delete order #${order.id}`}
                      aria-label={`Permanently delete order #${order.id}`}
                    >
                      {deletingOrderId === order.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      <span>{deletingOrderId === order.id ? 'Deleting...' : 'Delete'}</span>
                    </button>
                    {order.status === 'ready' && (
                      <p className="text-[10px] text-slate-500 max-w-48">
                        Pickup is confirmed by the courier with the handover code, not from here.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handlePrintTicket(order)}
                      className="px-3 py-2 rounded-xl bg-[#1F242D] hover:bg-white/10 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-700/50 min-h-11"
                    >
                      <span className="sr-only">Print 80mm kitchen slip for order #{order.id}: </span>
                      <Printer className="w-3.5 h-3.5 text-orange-400 shrink-0" aria-hidden="true" />
                      <span aria-hidden="true">Print ticket</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTrackingOrderId(order.id);
                        setSearchParams({ track: order.id });
                      }}
                      className="px-3 py-2 rounded-xl bg-orange-500/20 hover:bg-orange-500 text-orange-400 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all border border-orange-500/30 min-h-11"
                    >
                      <span className="sr-only">Track order #{order.id} on the map: </span>
                      <Navigation className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span aria-hidden="true">Track</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {totalOrderPages > 1 && (
        <Pager page={orderPage} pageCount={totalOrderPages} onChange={setOrderPage} noun="orders" />
      )}

      {/* Reassign courier modal */}
      {reassignTarget && (
        <ModalShell
          title={`Reassign order #${reassignTarget.orderId}`}
          icon={<AlertCircle className="w-5 h-5 text-amber-400" aria-hidden="true" />}
          onClose={() => {
            setReassignTarget(null);
            setReassignSelectedRider('');
          }}
          label="Close the reassign dialog"
        >
          <p className="text-xs text-slate-300">
            Move this delivery to another courier, or release it back to the ready queue.
          </p>
          <div className="space-y-4">
            <Field label="Available courier" id="reassign-rider">
              <select
                id="reassign-rider"
                value={reassignSelectedRider}
                onChange={(e) => setReassignSelectedRider(e.target.value)}
                className="w-full bg-[#1F242D] border border-slate-700/50 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
              >
                <option value="">-- Choose a courier --</option>
                {freeRiders
                  .filter((r) => String(r.id) !== String(reassignTarget.fromRiderId))
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.plateNumber || 'no plate'}) &middot; {r.phone || 'no phone'}
                    </option>
                  ))}
              </select>
            </Field>
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setReassignTarget(null);
                  setReassignSelectedRider('');
                }}
                className="px-4 py-2.5 rounded-xl bg-[#1F242D] hover:bg-slate-700/50 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleReassignRider({ orderId: reassignTarget.orderId, newRiderId: null })}
                disabled={isReassigning}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all disabled:opacity-60"
              >
                {isReassigning ? 'Releasing...' : 'Release courier'}
              </button>
              <button
                type="button"
                onClick={() => handleReassignRider({ orderId: reassignTarget.orderId, newRiderId: reassignSelectedRider })}
                disabled={isReassigning || !reassignSelectedRider}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-all disabled:opacity-60"
              >
                {isReassigning ? 'Reassigning...' : 'Reassign courier'}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Tracking modal with Map */}
      {trackingOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div
            className="bg-[#1A1D24] border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-7 w-full max-w-4xl shadow-2xl space-y-5 my-auto"
            role="dialog"
            aria-modal="true"
            aria-label={`Tracking order ${trackingOrder.id}`}
          >
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/40 flex items-center justify-center shrink-0">
                  <Navigation className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-black text-white">Order #{trackingOrder.id}</h3>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${statusBadge(trackingOrder.status)}`}>
                      {statusLabel(trackingOrder.status)}
                    </span>
                    <p className="text-xs text-slate-400 truncate">
                      {trackingOrder.customerName || 'Customer'} &middot; {trackingOrder.phone || 'no phone'} &middot;{' '}
                      {trackingOrder.address || 'Kigali'}
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTrackingOrderId(null);
                  const nextParams = new URLSearchParams(searchParams);
                  nextParams.delete('track');
                  setSearchParams(nextParams);
                }}
                className="p-2 rounded-xl bg-[#1F242D] hover:bg-slate-700/50 border border-slate-700/50 text-slate-400 hover:text-white transition-colors"
                aria-label="Close tracking"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 h-72 sm:h-80 rounded-2xl overflow-hidden border border-slate-800 relative shadow-inner">
                <div ref={setMapNode} className="w-full h-full" />
                <div className="absolute top-3 left-3 z-400 bg-[#12141A]/95 backdrop-blur-md p-2.5 rounded-xl border border-slate-800 text-xs shadow-xl space-y-1 pointer-events-none">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <Bike className="w-4 h-4 text-orange-400 shrink-0" aria-hidden="true" />
                    <span>{assignedRider?.name || trackingOrder.riderName || 'No courier assigned'}</span>
                  </div>
                  <div className="text-[10px] font-mono text-amber-400">
                    {riderHasFix
                      ? `Live position &middot; fix ${formatWhen(assignedRider.lastSeenAt) || 'unknown'}`
                      : 'No live GPS fix reported yet'}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    {trackingDestination
                      ? `Route ${trackingOrder.distanceKm ?? '-'} km &middot; ETA ${trackingOrder.etaMinutes ?? '-'} min`
                      : 'No coordinates on this order, showing the kitchen only'}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#12141A] border border-slate-800 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-400 text-xs uppercase tracking-wider">Ordered dishes</h4>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {(trackingOrder.items || []).map((item, idx) => (
                      <div key={item.id ?? idx} className="text-xs text-slate-400 flex justify-between gap-2">
                        <span className="truncate">
                          <strong className="text-white">{item.qty || 1}x</strong> {item.name}
                        </span>
                        <span className="font-mono text-white shrink-0">{formatRwf(item.price)} RWF</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-xs">
                    <span className="text-slate-400">Total</span>
                    <span className="font-mono font-black text-orange-400 text-sm">{formatRwf(trackingOrder.totalRWF)} RWF</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  {trackingOrder.phone && (
                    <a
                      href={`tel:${trackingOrder.phone}`}
                      className="w-full py-2 rounded-xl bg-[#1F242D] hover:bg-slate-700/50 text-white text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700/50 transition-all min-h-11"
                    >
                      <Phone className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />
                      <span>Call customer</span>
                    </a>
                  )}
                  {trackingOrder.riderId && (
                    <p className="text-[10px] text-slate-500">
                      Pickup and delivery are confirmed by the courier on their device.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmAction && (
        <ConfirmModal
          isOpen={Boolean(confirmAction)}
          onClose={() => setConfirmAction(null)}
          onConfirm={confirmAction.onConfirm}
          title={confirmAction.title}
          message={confirmAction.message}
          confirmText={confirmAction.confirmText}
          cancelText={confirmAction.cancelText || 'Keep order'}
          tone={confirmAction.tone || 'danger'}
          isBusy={Boolean(pendingStatusChange || deletingOrderId || isReassigning)}
        />
      )}
    </div>
  );
}
