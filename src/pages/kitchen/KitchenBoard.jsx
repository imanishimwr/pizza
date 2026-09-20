import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChefHat, Clock, CheckCircle2, ArrowRight, Volume2, VolumeX,
  CheckSquare, Square, Plus, RefreshCw, TrendingUp, Loader2
} from 'lucide-react';
import { apiService } from '../../services/apiService';
import { io } from 'socket.io-client';
import AddWalkInModal from './AddWalkInModal';

const API_WS = 'http://localhost:5000';

export default function KitchenBoard() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [checkedItems, setCheckedItems] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const socketRef = useRef(null);
  // Only send an auth token when the session actually has kitchen/admin rights.
  // A customer token sent to staff-only endpoints gets rejected (403), which
  // breaks the board display and actions — so treat it as anonymous.
  const signedInUser = apiService.getUser();
  const isStaff = !!signedInUser && ['KITCHEN', 'ADMIN'].includes(String(signedInUser.role || '').toUpperCase());
  const token = isStaff ? localStorage.getItem('token') : null;

  // --------------- Data Fetching ---------------
  const fetchQueue = useCallback(async () => {
    try {
      const data = await apiService.getKitchenQueue(token);
      setOrders(data.orders || []);
      setStats(data.stats || {});
      setError(null);
    } catch (e) {
      setError('Could not reach server. Check backend is running.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchQueue();
    apiService.getMeals().then(setMeals).catch(() => {});
  }, [fetchQueue]);

  // --------------- WebSocket ---------------
  useEffect(() => {
    const socket = io(API_WS, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('kitchen_orders_updated', () => fetchQueue());
    socket.on('new_order_placed', () => {
      fetchQueue();
      if (soundEnabled) playChime();
    });

    return () => socket.disconnect();
  }, [fetchQueue, soundEnabled]);

  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(); osc.stop(ctx.currentTime + 0.5);
    } catch (_) {}
  };

  // --------------- Actions ---------------
  const handleStatusUpdate = async (orderId, newStatus) => {
    setActionError(null);
    try {
      const result = await apiService.updateKitchenOrderStatus(orderId, newStatus, token);
      setOrders(prev => prev.map(o => o.id === orderId ? result.order : o));
      if (result.stats) setStats(result.stats);
    } catch (e) {
      setActionError(e.message || 'Could not update the order. Please try again.');
    }
  };

  const handleAddWalkIn = async (orderData) => {
    setSubmitting(true);
    try {
      await apiService.createWalkInOrder(orderData, token);
      setShowAddModal(false);
      await fetchQueue();
    } catch (e) {
      alert('Failed to place walk-in order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCheck = (orderId, idx) => {
    const key = `${orderId}-${idx}`;
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // --------------- Derived ---------------
  const pending = orders.filter(o => o.status === 'pending');
  const preparing = orders.filter(o => o.status === 'preparing');
  const ready = orders.filter(o => o.status === 'ready' || o.status === 'delivery');

  if (loading) return (
    <div className="flex items-center justify-center py-32 text-amber-400 gap-3">
      <Loader2 className="w-6 h-6 animate-spin" />
      <span className="text-sm font-medium">Loading kitchen queue…</span>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <p className="text-sm text-red-400">{error}</p>
      <button onClick={fetchQueue} className="btn-primary text-xs py-2 px-4 flex items-center gap-2">
        <RefreshCw className="w-4 h-4" /> Retry
      </button>
    </div>
  );

  return (
    <>
      <AddWalkInModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        meals={meals}
        onOrderCreated={handleAddWalkIn}
        isSubmitting={submitting}
      />

      <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
        {/* Sidebar */}
        <aside className="w-full lg:w-60 shrink-0 bg-surface-card border border-amber-500/30 rounded-3xl p-5 space-y-5 h-fit sticky top-28 shadow-xl">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white">Kitchen Board</div>
              <div className="text-[10px] text-amber-300 font-semibold">Head Chef Console</div>
            </div>
          </div>

          {/* Counts */}
          <nav className="space-y-2 text-xs">
            {[
              { label: 'Pending', count: pending.length, cls: 'bg-amber-500/20 text-amber-300' },
              { label: 'Cooking', count: preparing.length, cls: 'bg-blue-500/20 text-blue-300' },
              { label: 'Ready', count: ready.length, cls: 'bg-emerald-500/20 text-emerald-300' },
            ].map(({ label, count, cls }) => (
              <div key={label} className={`p-2.5 rounded-xl font-bold flex items-center justify-between ${cls}`}>
                <span>{label}</span>
                <span className="font-mono text-white">{count}</span>
              </div>
            ))}
          </nav>

          {/* Avg Prep Time */}
          {stats.avgPrepMinutes != null && (
            <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <div className="text-[10px]">
                <div className="text-text-muted">Avg prep time</div>
                <div className="font-bold text-white">{stats.avgPrepMinutes} min</div>
              </div>
            </div>
          )}

          {/* Add Walk-in */}
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
          >
            <Plus className="w-4 h-4" /> New Walk-in Order
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(s => !s)}
            className={`w-full p-2.5 rounded-xl text-xs font-bold flex items-center justify-between border transition-all ${
              soundEnabled ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' : 'bg-black/40 border-white/10 text-text-muted'
            }`}
          >
            <span className="flex items-center gap-2">
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
              Order Sound
            </span>
            <span className="text-[10px] font-mono">{soundEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </aside>

        {/* Main Board */}
        <div className="flex-1 space-y-5 min-w-0">
          {/* Header */}
          <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow">
                <ChefHat className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-white">Kitchen Dispatch Board</h2>
                <p className="text-xs text-amber-200/70">Live order queue · WebSocket connected</p>
              </div>
            </div>
            <button onClick={fetchQueue} className="p-2 rounded-xl hover:bg-white/10 text-text-muted transition-colors" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {actionError && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300" role="alert">
              {actionError}
            </div>
          )}

          {/* Kanban */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Pending */}
            <KanbanColumn
              title="New Orders"
              count={pending.length}
              color="amber"
              pulse="ping"
              emptyMsg="No pending orders"
            >
              {pending.map(order => (
                <OrderCard key={order.id} order={order} color="amber" checkedItems={checkedItems}>
                  <button
                    onClick={() => handleStatusUpdate(order.id, 'preparing')}
                    className="w-full btn-primary py-2 text-xs bg-amber-600 hover:bg-amber-700 flex items-center justify-center gap-2"
                  >
                    Start Cooking <ArrowRight className="w-4 h-4" />
                  </button>
                </OrderCard>
              ))}
            </KanbanColumn>

            {/* Preparing */}
            <KanbanColumn
              title="Cooking & Packing"
              count={preparing.length}
              color="blue"
              pulse="pulse"
              emptyMsg="No meals cooking"
            >
              {preparing.map(order => (
                <OrderCard key={order.id} order={order} color="blue" checkedItems={checkedItems} onToggleCheck={toggleCheck}>
                  <button
                    onClick={() => handleStatusUpdate(order.id, 'ready')}
                    className="w-full btn-primary py-2 text-xs bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Mark Ready
                  </button>
                </OrderCard>
              ))}
            </KanbanColumn>

            {/* Ready */}
            <KanbanColumn
              title="Ready for Dispatch"
              count={ready.length}
              color="emerald"
              icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              emptyMsg="No orders waiting for rider"
            >
              {ready.map(order => (
                <OrderCard key={order.id} order={order} color="emerald" checkedItems={checkedItems} />
              ))}
            </KanbanColumn>
          </div>
        </div>
      </div>
    </>
  );
}

// ---- Sub-components ----

function KanbanColumn({ title, count, color, pulse, icon, emptyMsg, children }) {
  const colors = {
    amber: 'text-amber-400',
    blue: 'text-blue-400',
    emerald: 'text-emerald-400',
  };
  const dotColors = {
    amber: 'bg-amber-400',
    blue: 'bg-blue-400',
    emerald: 'bg-emerald-400',
  };

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-xl bg-surface-card border border-white/10 flex items-center gap-2">
        {icon || <span className={`w-2.5 h-2.5 rounded-full ${dotColors[color]} animate-${pulse}`} />}
        <span className={`text-xs font-bold uppercase tracking-wider ${colors[color]}`}>
          {title} ({count})
        </span>
      </div>
      <div className="space-y-3">
        {count === 0
          ? <div className="p-8 text-center bg-surface-card/40 rounded-xl border border-dashed border-white/10 text-xs text-text-subdued">{emptyMsg}</div>
          : children
        }
      </div>
    </div>
  );
}

function OrderCard({ order, color, checkedItems = {}, onToggleCheck, children }) {
  const borderColors = { amber: 'border-amber-500/30', blue: 'border-blue-500/30', emerald: 'border-emerald-500/30' };
  const textColors = { amber: 'text-amber-400', blue: 'text-blue-400', emerald: 'text-emerald-400' };

  return (
    <div className={`card-item p-4 space-y-3 ${borderColors[color]}`}>
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <span className={`font-mono font-bold text-sm ${textColors[color]}`}>#{order.id?.slice(-6) || order.id}</span>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[10px] text-text-muted">{order.customerName || 'Walk-in'}</span>
          {order.address === 'Counter' && (
            <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full font-bold">Counter</span>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="space-y-1.5 bg-black/20 p-2.5 rounded-xl border border-white/5">
        <span className="text-[10px] font-bold text-text-muted uppercase block">Items</span>
        {(order.items || []).map((item, idx) => {
          const key = `${order.id}-${idx}`;
          const checked = checkedItems[key];
          return (
            <div
              key={idx}
              onClick={() => onToggleCheck?.(order.id, idx)}
              className={`text-xs flex items-center gap-2 p-1 rounded transition-colors ${
                onToggleCheck ? 'cursor-pointer' : ''
              } ${checked ? 'line-through text-emerald-400/60 bg-emerald-950/20' : 'text-text-main hover:bg-white/5'}`}
            >
              {onToggleCheck && (checked
                ? <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                : <Square className="w-3.5 h-3.5 text-text-muted shrink-0" />
              )}
              <span>{item.qty}× {item.name}</span>
              {item.spice && <span className="text-red-400 text-[9px] font-bold ml-auto">{item.spice}</span>}
            </div>
          );
        })}
      </div>

      {/* Time badge */}
      <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
        <Clock className="w-3 h-3" />
        <span>{order.orderTime || '—'}</span>
        {order.totalRWF > 0 && <span className="ml-auto text-amber-400 font-mono font-bold">{Number(order.totalRWF).toLocaleString()} RWF</span>}
      </div>

      {children}
    </div>
  );
}
