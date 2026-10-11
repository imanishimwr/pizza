import React, { useEffect, useState } from 'react';
import { ShoppingBag, MapPin, FileText, Download, Star, ArrowRight, Navigation, Trash2 } from 'lucide-react';
import ReceiptModal from '../../components/customer/ReceiptModal';
import PostDeliveryFeedbackModal from '../../components/customer/PostDeliveryFeedbackModal';
import { downloadOrderReceiptPdf } from '../../utils/receiptGenerator';

/** Rwandan francs are plain numbers; a missing total shows a dash, never a fake 0. */
const formatRWF = (value) =>
  Number.isFinite(Number(value)) ? `${Number(value).toLocaleString()} RWF` : '—';

const STATUS_LABELS = {
  pending: 'Pending',
  payment_review: 'Payment Review',
  preparing: 'Preparing',
  ready: 'Ready',
  delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Declined'
};

const statusLabel = (status) => STATUS_LABELS[status] || 'Unknown';

const formatKigaliTime = (order) => {
  const raw = order?.created_at || order?.createdAt;
  if (raw) {
    try {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Africa/Kigali'
        });
      }
    } catch {}
  }
  return order?.orderTime || 'Time unavailable';
};

const badgeFor = (status) => {
  if (status === 'delivered') return 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40';
  if (status === 'cancelled') return 'bg-red-950/80 text-red-400 border border-red-500/40';
  if (status === 'ready') return 'bg-amber-950/80 text-amber-400 border border-amber-500/40';
  return 'bg-blue-950/80 text-blue-400 border border-blue-500/40';
};

export default function OrdersHistory({ orders = [], onSelectOrder, onExploreMenu, onDeleteOrder, onClearAll }) {
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [feedbackOrder, setFeedbackOrder] = useState(null);
  const [pdfError, setPdfError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  // Escape closes whatever this page has open.
  useEffect(() => {
    if (!selectedReceipt && !feedbackOrder) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setSelectedReceipt(null);
      setFeedbackOrder(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selectedReceipt, feedbackOrder]);

  const orderList = Array.isArray(orders) ? orders : [];

  // The receipt generator talks to jsPDF and can throw; never let a silent
  // failure look like a successful download.
  const handleDownloadReceipt = async (order) => {
    setPdfError('');
    try {
      await downloadOrderReceiptPdf(order);
    } catch (err) {
      console.error('Receipt download failed', err);
      setPdfError(err?.message || 'The PDF receipt could not be generated. Please try again.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-primary" aria-hidden="true" />
            Your HotPot Order History
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Follow a live order, download a receipt, or review a past delivery
          </p>
        </div>
        {onClearAll && orderList.length > 0 && (
          confirmClearAll ? (
            <div className="flex items-center gap-2 bg-red-500/15 border border-red-500/30 px-3 py-1.5 rounded-xl">
              <span className="text-xs text-red-600 dark:text-red-300 font-semibold">Clear all dashboard history?</span>
              <button
                type="button"
                onClick={() => {
                  onClearAll();
                  setConfirmClearAll(false);
                }}
                className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors"
              >
                Yes, Clear All
              </button>
              <button
                type="button"
                onClick={() => setConfirmClearAll(false)}
                className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmClearAll(true)}
              className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors flex items-center gap-1.5 text-xs font-bold"
              title="Clear all orders from your dashboard history"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              Clear History
            </button>
          )
        )}
      </div>

      {pdfError && (
        <p
          role="alert"
          className="text-xs font-semibold text-red-600 dark:text-red-300 bg-red-500/10 border border-red-500/40 rounded-xl px-3.5 py-2.5"
        >
          {pdfError}
        </p>
      )}

      <div className="space-y-4">
        {orderList.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-[#1A1D24] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs dark:shadow-md space-y-4 p-8 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary">
              <ShoppingBag className="w-8 h-8" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">No Orders Placed Yet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                The order history is available after you place your first order. Browse our delicious pizzas and
                gourmet hotpots!
              </p>
            </div>
            {onExploreMenu && (
              <button
                type="button"
                onClick={onExploreMenu}
                className="btn-primary py-2.5 px-6 text-xs font-bold inline-flex items-center gap-2 shadow-lg shadow-primary/20"
              >
                <span>Browse Menu &amp; Order</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        ) : (
          orderList.map((order) => (
            <article
              key={order.id}
              className="p-5 rounded-2xl bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-slate-800 hover:border-orange-500/50 shadow-xs dark:shadow-md transition-all space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-orange-500 dark:text-amber-400">Order #{order.id}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    • {formatKigaliTime(order)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${badgeFor(
                      order.status
                    )}`}
                  >
                    {statusLabel(order.status)}
                  </span>

                  {onSelectOrder && (
                    <button
                      type="button"
                      onClick={() => onSelectOrder(order)}
                      className="p-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 dark:text-slate-100 dark:border-slate-700 btn-secondary-interactive font-bold flex items-center gap-1.5 text-[11px]"
                      title="Open this order in live tracking"
                    >
                      <Navigation className="w-3.5 h-3.5 text-orange-500" aria-hidden="true" />
                      Track Order
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDownloadReceipt(order)}
                    className="p-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 dark:text-slate-100 dark:border-slate-700 btn-secondary-interactive flex items-center gap-1 text-[11px] font-bold"
                    title="Download PDF Receipt"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" aria-hidden="true" />
                    Download PDF
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedReceipt(order)}
                    className="p-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 dark:text-slate-100 dark:border-slate-700 btn-secondary-interactive flex items-center gap-1 text-[11px] font-bold"
                    title="View & Print Receipt"
                  >
                    <FileText className="w-3.5 h-3.5 text-orange-500" aria-hidden="true" />
                    Receipt
                  </button>

                  {order.status === 'delivered' && (
                    <button
                      type="button"
                      onClick={() => setFeedbackOrder(order)}
                      className="p-1.5 px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-300 transition-colors flex items-center gap-1 text-[11px] font-bold"
                      title="Rate Pizza & Rider"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                      Rate Pizza &amp; Rider
                    </button>
                  )}

                  {onDeleteOrder && (
                    confirmDeleteId === order.id ? (
                      <div className="flex items-center gap-1.5 bg-red-500/15 border border-red-500/30 px-2 py-1 rounded-lg">
                        <span className="text-[11px] text-red-600 dark:text-red-300 font-semibold">Delete?</span>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteOrder(order.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold transition-colors"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 text-[11px] transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(order.id)}
                        className="p-1.5 px-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors flex items-center gap-1 text-[11px] font-bold"
                        title="Delete this order from your dashboard history only"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        Delete
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Items Summary */}
              <div className="space-y-1">
                {(order.items || []).length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">No items recorded for this order.</p>
                ) : (
                  (order.items || []).map((item, idx) => (
                    <div
                      key={`${item?.id ?? item?.mealId ?? 'item'}-${idx}`}
                      className="flex justify-between text-xs text-slate-600 dark:text-slate-300"
                    >
                      <span>
                        {Number(item?.qty) || 1}x {item?.name}
                        {item?.spice ? ` (${item.spice})` : ''}
                      </span>
                      <span className="font-mono text-slate-500 dark:text-slate-400">{formatRWF(item?.price)}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                  <span className="line-clamp-1">{order.address || 'No address on file'}</span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono font-extrabold text-sm text-primary">Total: {formatRWF(order.totalRWF)}</span>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      <ReceiptModal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        order={selectedReceipt}
      />

      <PostDeliveryFeedbackModal
        isOpen={!!feedbackOrder}
        onClose={() => setFeedbackOrder(null)}
        order={feedbackOrder}
      />
    </div>
  );
}
