import React, { useMemo, useState } from 'react';
import {
  Bike, Plus, RefreshCw, Users, CheckCircle2, Clock,
  Search, Filter, AlertCircle, Edit, Phone
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import {
  formatRwf, rwf, isRiderFree, isRiderBusy, normalizeOrderStatus
} from '../../utils/adminHelpers';
import {
  createRider, updateRider, setRiderAvailability, reassignRider
} from '../../services/apiService';
import { StatCard, Row, Field, ModalShell, RiderCardSkeleton, KpiCardSkeleton } from '../../components/admin/AdminComponents';

export default function AdminFleet() {
  const {
    riders, setRiders, ridersError, analytics, loading,
    isRefreshing, loadSnapshot, announce, orders
  } = useAdmin();

  // Search & Filter
  const [riderSearch, setRiderSearch] = useState('');
  const [riderStatusFilter, setRiderStatusFilter] = useState('all');
  const [togglingRiderId, setTogglingRiderId] = useState(null);

  // Add courier modal
  const [showAddRiderModal, setShowAddRiderModal] = useState(false);
  const [isSavingRider, setIsSavingRider] = useState(false);
  const [newRiderForm, setNewRiderForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    plateNumber: '',
    vehicleType: '',
    shift: 'Day Shift (08:00 - 16:00)'
  });

  // Edit courier modal
  const [editingRider, setEditingRider] = useState(null);
  const [isSavingEditRider, setIsSavingEditRider] = useState(false);
  const [editRiderForm, setEditRiderForm] = useState({
    name: '',
    phone: '',
    plateNumber: '',
    vehicleType: '',
    shift: 'Day Shift (08:00 - 16:00)'
  });

  // Reassign modal
  const [reassignTarget, setReassignTarget] = useState(null);
  const [reassignSelectedRider, setReassignSelectedRider] = useState('');
  const [isReassigning, setIsReassigning] = useState(false);

  // Active orders assigned to each rider
  const activeOrdersByRider = useMemo(() => {
    const map = {};
    (orders || []).forEach((o) => {
      const norm = normalizeOrderStatus(o.status);
      if (['ongoing', 'ready'].includes(norm) && o.riderId) {
        const key = String(o.riderId);
        if (!map[key]) map[key] = [];
        map[key].push(o);
      }
    });
    return map;
  }, [orders]);

  const filteredRiders = useMemo(() => {
    const q = riderSearch.trim().toLowerCase();
    const list = Array.isArray(riders) ? riders : [];
    return list.filter((rider) => {
      const matchQuery =
        !q ||
        String(rider.name || '').toLowerCase().includes(q) ||
        String(rider.phone || '').includes(q) ||
        String(rider.plateNumber || '').toLowerCase().includes(q) ||
        String(rider.vehicleType || '').toLowerCase().includes(q);

      if (!matchQuery) return false;
      const count = (activeOrdersByRider[String(rider.id)] || []).length;
      if (riderStatusFilter === 'available') return isRiderFree(rider, count);
      if (riderStatusFilter === 'busy') return isRiderBusy(rider, count);
      if (riderStatusFilter === 'off_duty') return !rider.is_available && !isRiderBusy(rider, count);
      return true;
    });
  }, [riders, riderSearch, riderStatusFilter, activeOrdersByRider]);

  const handleToggleRiderAvailability = async (rider) => {
    if (togglingRiderId) return;
    setTogglingRiderId(rider.id);
    try {
      const updated = await setRiderAvailability(rider.id, !rider.is_available);
      setRiders((prev) => prev.map((r) => (String(r.id) === String(rider.id) ? updated : r)));
      announce('success', `${rider.name} is now ${updated.is_available ? 'on duty' : 'off duty'}.`);
    } catch (err) {
      announce('error', err?.message || `Could not change duty status for ${rider.name}.`);
    } finally {
      setTogglingRiderId(null);
    }
  };

  const handleCreateRider = async (e) => {
    e.preventDefault();
    if (!newRiderForm.name.trim() || !newRiderForm.phone.trim()) return;
    setIsSavingRider(true);
    try {
      const created = await createRider({
        name: newRiderForm.name.trim(),
        email: newRiderForm.email.trim(),
        password: newRiderForm.password.trim(),
        phone: newRiderForm.phone.trim(),
        plateNumber: newRiderForm.plateNumber.trim(),
        vehicleType: newRiderForm.vehicleType.trim(),
        shift: newRiderForm.shift
      });
      setRiders((prev) => [created, ...prev]);
      setShowAddRiderModal(false);
      setNewRiderForm({
        name: '',
        email: '',
        password: '',
        phone: '',
        plateNumber: '',
        vehicleType: '',
        shift: 'Day Shift (08:00 - 16:00)'
      });
      announce('success', `${created.name} added to the fleet.`);
    } catch (err) {
      announce('error', err?.message || 'Could not register courier.');
    } finally {
      setIsSavingRider(false);
    }
  };

  const handleOpenEditRider = (rider) => {
    setEditingRider(rider);
    setEditRiderForm({
      name: rider.name || '',
      phone: rider.phone || '',
      plateNumber: rider.plateNumber || '',
      vehicleType: rider.vehicleType || '',
      shift: rider.shift || 'Day Shift (08:00 - 16:00)'
    });
  };

  const handleSaveEditRider = async (e) => {
    e.preventDefault();
    if (!editingRider) return;
    setIsSavingEditRider(true);
    try {
      const updated = await updateRider(editingRider.id, editRiderForm);
      setRiders((prev) => prev.map((r) => (String(r.id) === String(editingRider.id) ? { ...r, ...updated } : r)));
      announce('success', `${editRiderForm.name} profile updated.`);
      setEditingRider(null);
      await loadSnapshot({ quiet: true });
    } catch (err) {
      announce('error', err?.message || 'Could not update courier details.');
    } finally {
      setIsSavingEditRider(false);
    }
  };

  const handleReassignRider = async ({ orderId, newRiderId }) => {
    if (isReassigning) return;
    setIsReassigning(true);
    try {
      await reassignRider(orderId, newRiderId || null);
      announce('success', newRiderId ? `Order #${orderId} reassigned.` : `Order #${orderId} released back to ready queue.`);
      setReassignTarget(null);
      await loadSnapshot({ quiet: true });
    } catch (err) {
      announce('error', err?.message || `Could not reassign order #${orderId}.`);
    } finally {
      setIsReassigning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#1A1D24] p-4 sm:px-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2.5">
            <Bike className="w-5 h-5 text-orange-400" aria-hidden="true" />
            Rider fleet
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Duty status, earnings and emergency reassignment.</p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => loadSnapshot()}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl bg-[#1F242D] border border-slate-700/50 hover:bg-slate-700/50 text-slate-300 hover:text-white transition-all min-h-11 min-w-11 flex items-center justify-center disabled:opacity-60"
            title="Refresh the courier fleet"
            aria-label="Refresh the courier fleet"
          >
            <RefreshCw className={`w-4 h-4 text-orange-400 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setShowAddRiderModal(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all min-h-11"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Register courier</span>
          </button>
        </div>
      </div>

      {ridersError ? (
        <div role="alert" className="p-5 rounded-2xl bg-[#1A1D24] border border-red-500/50 space-y-2">
          <p className="text-sm font-bold text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" aria-hidden="true" />
            The courier fleet could not be loaded
          </p>
          <p className="text-xs text-slate-300">{ridersError}</p>
          <p className="text-xs text-slate-400">Sign in with a staff account to manage couriers. No fleet data is shown until the server answers.</p>
        </div>
      ) : (
        <>
          {/* KPI Stat Cards */}
          {loading && riders.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCardSkeleton />
              <KpiCardSkeleton />
              <KpiCardSkeleton />
              <KpiCardSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Registered couriers"
                value={String(riders.length)}
                icon={<Users className="w-4 h-4" aria-hidden="true" />}
                tone="orange"
                caption={analytics ? `Server total: ${analytics.ridersTotal ?? riders.length}` : 'Server total unavailable'}
              />
              <StatCard
                title="On duty and free"
                value={String(riders.filter(isRiderFree).length)}
                icon={<CheckCircle2 className="w-4 h-4" aria-hidden="true" />}
                tone="emerald"
                caption="Available for a new handover."
              />
              <StatCard
                title="On a delivery"
                value={String(riders.filter(isRiderBusy).length)}
                icon={<Bike className="w-4 h-4" aria-hidden="true" />}
                tone="blue"
                caption="Holding an order right now."
              />
              <StatCard
                title="Off duty"
                value={String(riders.filter((r) => !r.is_available && !isRiderBusy(r)).length)}
                icon={<Clock className="w-4 h-4" aria-hidden="true" />}
                tone="slate"
                caption="Not taking assignments."
              />
            </div>
          )}

          {/* Search, Filter & List */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#1A1D24] border border-slate-800 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <label htmlFor="rider-search" className="sr-only">
                  Search couriers
                </label>
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  id="rider-search"
                  type="text"
                  value={riderSearch}
                  onChange={(e) => setRiderSearch(e.target.value)}
                  placeholder="Search by name, phone, plate or vehicle"
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#12141A] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" aria-hidden="true" />
                <label htmlFor="rider-filter" className="sr-only">
                  Filter couriers by duty status
                </label>
                <select
                  id="rider-filter"
                  value={riderStatusFilter}
                  onChange={(e) => setRiderStatusFilter(e.target.value)}
                  className="bg-[#12141A] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="all">All statuses</option>
                  <option value="available">On duty and free</option>
                  <option value="busy">On a delivery</option>
                  <option value="off_duty">Off duty</option>
                </select>
              </div>
            </div>

            {loading && filteredRiders.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <RiderCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredRiders.length === 0 ? (
              <p className="py-12 text-center text-slate-400 text-xs">
                {riders.length === 0 ? 'No couriers are registered yet.' : 'No couriers matched your search.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRiders.map((rider) => {
                  const assignedOrders = activeOrdersByRider[String(rider.id)] || [];
                  const activeCount = assignedOrders.length;
                  const busy = isRiderBusy(rider, activeCount);
                  const free = isRiderFree(rider, activeCount);
                  return (
                    <article
                      key={rider.id}
                      className={`p-4 sm:p-5 rounded-2xl bg-[#12141A] border transition-all shadow-lg flex flex-col justify-between space-y-4 ${
                        busy ? 'border-blue-500/40' : free ? 'border-emerald-500/40' : 'border-slate-800'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center font-bold text-base shrink-0">
                              {rider.name ? rider.name.charAt(0).toUpperCase() : '?'}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-black text-white truncate">{rider.name}</h4>
                              <span className="font-mono text-xs font-bold text-amber-400">
                                {rider.plateNumber || 'No plate on file'}
                              </span>
                            </div>
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-black border shrink-0 ${
                              busy
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                                : free
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {busy
                              ? `Busy (${activeCount} active)`
                              : free
                              ? 'Free to take order'
                              : 'Off duty'}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs bg-[#1A1D24] p-3 rounded-xl border border-slate-800">
                          <Row label="Vehicle" value={rider.vehicleType || 'not recorded'} />
                          <Row label="Shift" value={rider.shift || 'not recorded'} />
                          <div className="flex items-center justify-between text-slate-300">
                            <span className="text-slate-400">Phone</span>
                            {rider.phone ? (
                              <a href={`tel:${rider.phone}`} className="font-mono text-emerald-400 hover:underline">
                                {rider.phone}
                              </a>
                            ) : (
                              <span className="font-mono text-slate-500">not recorded</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                            <span className="text-slate-400">Today</span>
                            <span className="font-mono text-white font-bold">
                              {rwf(rider.completed_today)} trips &middot; {formatRwf(rider.earnings_today)} RWF
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Current deliveries</span>
                            <span className={`font-mono font-bold ${activeCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {activeCount === 0 ? 'Free (0 active)' : `${activeCount} active ${activeCount === 1 ? 'delivery' : 'deliveries'}`}
                            </span>
                          </div>
                        </div>

                        {/* Assigned Orders List */}
                        {assignedOrders.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Assigned Deliveries ({assignedOrders.length})
                            </p>
                            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                              {assignedOrders.map((ord) => (
                                <div
                                  key={ord.id}
                                  className="p-2 rounded-xl bg-[#181B22] border border-slate-700/60 flex items-center justify-between gap-2 text-xs"
                                >
                                  <div className="min-w-0">
                                    <p className="text-white font-bold truncate">#{ord.id} &middot; {ord.customerName}</p>
                                    <p className="text-[10px] text-slate-400 truncate">{ord.address}</p>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setReassignTarget({ orderId: ord.id, fromRiderId: rider.id })}
                                      className="px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold hover:bg-amber-500/30"
                                      title="Reassign order"
                                    >
                                      Reassign
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleReassignRider({ orderId: ord.id, newRiderId: null })}
                                      className="px-2 py-1 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-bold hover:bg-red-500/30"
                                      title="Release courier"
                                    >
                                      Release
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditRider(rider)}
                          className="px-3 py-1.5 rounded-xl bg-[#1F242D] border border-slate-700/50 hover:bg-slate-700/50 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all"
                        >
                          <Edit className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />
                          <span>Edit info</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleRiderAvailability(rider)}
                          disabled={togglingRiderId === rider.id || busy}
                          title={busy ? 'This courier is mid-delivery and cannot change duty' : 'Toggle duty status'}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border min-h-9 disabled:opacity-50 ${
                            rider.is_available
                              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${rider.is_available ? 'bg-emerald-400' : 'bg-slate-500'}`}
                            aria-hidden="true"
                          />
                          <span>{togglingRiderId === rider.id ? 'Saving...' : rider.is_available ? 'Set off duty' : 'Set on duty'}</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Register courier modal */}
      {showAddRiderModal && (
        <ModalShell
          title="Register a new courier"
          icon={<Bike className="w-5 h-5 text-orange-400" aria-hidden="true" />}
          onClose={() => setShowAddRiderModal(false)}
          label="Close the register courier dialog"
        >
          <form onSubmit={handleCreateRider} className="space-y-4">
            <Field label="Full name" id="rider-name">
              <input
                id="rider-name"
                type="text"
                required
                placeholder="Eric Mugisha"
                value={newRiderForm.name}
                onChange={(e) => setNewRiderForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full bg-[#1F242D] border border-slate-700/50 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Email (for login)" id="rider-email">
                <input
                  id="rider-email"
                  type="email"
                  placeholder="eric@hotpot.rw"
                  value={newRiderForm.email}
                  onChange={(e) => setNewRiderForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-[#1F242D] border border-slate-700/50 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </Field>
              <Field label="Password" id="rider-password">
                <input
                  id="rider-password"
                  type="password"
                  placeholder="••••••••"
                  value={newRiderForm.password}
                  onChange={(e) => setNewRiderForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full bg-[#1F242D] border border-slate-700/50 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Phone" id="rider-phone">
                <input
                  id="rider-phone"
                  type="tel"
                  required
                  placeholder="+250 788 000 000"
                  value={newRiderForm.phone}
                  onChange={(e) => setNewRiderForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full bg-[#1F242D] border border-slate-700/50 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </Field>
              <Field label="Plate number" id="rider-plate">
                <input
                  id="rider-plate"
                  type="text"
                  placeholder="RAC 123 B"
                  value={newRiderForm.plateNumber}
                  onChange={(e) => setNewRiderForm((prev) => ({ ...prev, plateNumber: e.target.value }))}
                  className="w-full bg-[#1F242D] border border-slate-700/50 rounded-xl px-3.5 py-2.5 text-sm font-mono uppercase text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Vehicle type" id="rider-vehicle">
                <input
                  id="rider-vehicle"
                  type="text"
                  placeholder="TVS Apache 160"
                  value={newRiderForm.vehicleType}
                  onChange={(e) => setNewRiderForm((prev) => ({ ...prev, vehicleType: e.target.value }))}
                  className="w-full bg-[#1F242D] border border-slate-700/50 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </Field>
              <Field label="Shift schedule" id="rider-shift">
                <select
                  id="rider-shift"
                  value={newRiderForm.shift}
                  onChange={(e) => setNewRiderForm((prev) => ({ ...prev, shift: e.target.value }))}
                  className="w-full bg-[#1F242D] border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="Day Shift (08:00 - 16:00)">Day Shift (08:00 - 16:00)</option>
                  <option value="Evening Shift (16:00 - 00:00)">Evening Shift (16:00 - 00:00)</option>
                  <option value="Night Shift (18:00 - 02:00)">Night Shift (18:00 - 02:00)</option>
                </select>
              </Field>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddRiderModal(false)}
                className="px-4 py-2.5 rounded-xl bg-[#1F242D] hover:bg-slate-700/50 text-slate-300 font-bold text-xs transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingRider}
                className="px-5 py-2.5 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 text-white font-bold text-xs transition-all disabled:opacity-60"
              >
                {isSavingRider ? 'Registering...' : 'Register courier'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Reassign modal */}
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
            Move this delivery to another courier, or release it back to unassigned.
          </p>
          <div className="space-y-4">
            <Field label="Choose courier" id="reassign-rider">
              <select
                id="reassign-rider"
                value={reassignSelectedRider}
                onChange={(e) => setReassignSelectedRider(e.target.value)}
                className="w-full bg-[#1F242D] border border-slate-700/50 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
              >
                <option value="">-- Choose a courier --</option>
                {riders
                  .filter((r) => String(r.id) !== String(reassignTarget.fromRiderId))
                  .map((r) => {
                    const count = (activeOrdersByRider[String(r.id)] || []).length;
                    const isFree = isRiderFree(r, count);
                    return (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.plateNumber || 'No plate'}) — {isFree ? 'Free to take client order (0 active)' : `${count} active ${count === 1 ? 'delivery' : 'deliveries'}`}
                      </option>
                    );
                  })}
              </select>
            </Field>
            <div className="flex items-center justify-end gap-3 pt-2">
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
                onClick={() => {
                  handleReassignRider({ orderId: reassignTarget.orderId, newRiderId: null });
                  setReassignSelectedRider('');
                }}
                disabled={isReassigning}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all disabled:opacity-60"
              >
                {isReassigning ? 'Releasing...' : 'Release courier'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (reassignSelectedRider) {
                    handleReassignRider({ orderId: reassignTarget.orderId, newRiderId: reassignSelectedRider });
                    setReassignSelectedRider('');
                  }
                }}
                disabled={!reassignSelectedRider || isReassigning}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-all disabled:opacity-60"
              >
                {isReassigning ? 'Reassigning...' : 'Reassign courier'}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Edit courier details modal */}
      {editingRider && (
        <ModalShell
          title={`Edit ${editingRider.name}`}
          icon={<Edit className="w-5 h-5 text-orange-400" aria-hidden="true" />}
          onClose={() => setEditingRider(null)}
          label="Close edit courier dialog"
        >
          <form onSubmit={handleSaveEditRider} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Full name" id="edit-rider-name">
                <input
                  id="edit-rider-name"
                  type="text"
                  required
                  value={editRiderForm.name}
                  onChange={(e) => setEditRiderForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-[#1F242D] border border-slate-700/50 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </Field>
              <Field label="Phone number" id="edit-rider-phone">
                <input
                  id="edit-rider-phone"
                  type="tel"
                  required
                  value={editRiderForm.phone}
                  onChange={(e) => setEditRiderForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full bg-[#1F242D] border border-slate-700/50 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-orange-500"
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Motorcycle plate number" id="edit-rider-plate">
                <input
                  id="edit-rider-plate"
                  type="text"
                  value={editRiderForm.plateNumber}
                  onChange={(e) => setEditRiderForm((prev) => ({ ...prev, plateNumber: e.target.value }))}
                  className="w-full bg-[#1F242D] border border-slate-700/50 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-orange-500"
                />
              </Field>
              <Field label="Vehicle type" id="edit-rider-vehicle">
                <input
                  id="edit-rider-vehicle"
                  type="text"
                  value={editRiderForm.vehicleType}
                  onChange={(e) => setEditRiderForm((prev) => ({ ...prev, vehicleType: e.target.value }))}
                  className="w-full bg-[#1F242D] border border-slate-700/50 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </Field>
            </div>
            <Field label="Shift schedule" id="edit-rider-shift">
              <select
                id="edit-rider-shift"
                value={editRiderForm.shift}
                onChange={(e) => setEditRiderForm((prev) => ({ ...prev, shift: e.target.value }))}
                className="w-full bg-[#1F242D] border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
              >
                <option value="Day Shift (08:00 - 16:00)">Day Shift (08:00 - 16:00)</option>
                <option value="Evening Shift (16:00 - 00:00)">Evening Shift (16:00 - 00:00)</option>
                <option value="Night Shift (18:00 - 02:00)">Night Shift (18:00 - 02:00)</option>
              </select>
            </Field>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingRider(null)}
                className="px-4 py-2.5 rounded-xl bg-[#1F242D] hover:bg-slate-700/50 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingEditRider}
                className="px-5 py-2.5 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 text-white font-bold text-xs transition-all disabled:opacity-60"
              >
                {isSavingEditRider ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
