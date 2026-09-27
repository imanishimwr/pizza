import React, { useEffect, useState } from 'react';
import { ShoppingBag, MapPin, FileText, Download, Star, ArrowRight, Navigation } from 'lucide-react';
import ReceiptModal from '../../components/customer/ReceiptModal';
import PostDeliveryFeedbackModal from '../../components/customer/PostDeliveryFeedbackModal';
import { downloadOrderReceiptPdf } from '../../utils/receiptGenerator';

/** Rwandan francs are plain numbers; a missing total shows a dash, never a fake 0. */
const formatRWF = (value) =>
  Number.isFinite(Number(value)) ? `${Number(value).toLocaleString()} RWF` : '—';

const STATUS_LABELS = {
  pending: 'Pending',
  preparing: 'Preparing',
  ready: 'Ready',
  delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};

const statusLabel = (status) => STATUS_LABELS[status] || 'Unknown';

const badgeFor = (status) => {
  if (status === 'delivered') return 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40';
  if (status === 'cancelled') return 'bg-red-950/80 text-red-400 border border-red-500/40';
  if (status === 'ready') return 'bg-amber-950/80 text-amber-400 border border-amber-500/40';
  return 'bg-blue-950/80 text-blue-400 border border-blue-500/40';
};

export default function OrdersHistory({ orders = [], onSelectOrder, onExploreMenu }) {
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [feedbackOrder, setFeedbackOrder] = useState(null);
  const [pdfError, setPdfError] = useState('');

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-text-main flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-primary" aria-hidden="true" />
            Your HotPot Order History
          </h2>
          <p className="text-xs text-text-muted">
            Follow a live order, download a receipt, or review a past delivery
          </p>
        </div>
      </div>

      {pdfError && (
        <p
          role="alert"
          className="text-xs font-semibold text-red-300 bg-red-500/10 border border-red-500/40 rounded-xl px-3.5 py-2.5"
        >
          {pdfError}
        </p>
      )}

      <div className="space-y-4">
        {orderList.length === 0 ? (
          <div className="py-16 text-center bg-surface-card rounded-3xl border border-white/10 space-y-4 p-8 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary">
              <ShoppingBag className="w-8 h-8" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No Orders Placed Yet</h3>
              <p className="text-xs text-text-muted leading-relaxed">
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
              className="p-5 rounded-2xl bg-surface-card border border-white/5 hover:border-primary/40 transition-all space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-amber-400">Order #{order.id}</span>
                  <span className="text-xs text-text-muted">
                    • {order.orderTime || 'Time unavailable'}
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
                      className="p-1.5 px-3 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary font-bold transition-all flex items-center gap-1.5 text-[11px]"
                      title="Open this order in live tracking"
                    >
                      <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
                      Track order
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDownloadReceipt(order)}
                    className="p-1.5 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 transition-colors flex items-center gap-1 text-[11px] font-bold"
                    title="Download PDF Receipt"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                    PDF
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedReceipt(order)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-text-muted hover:text-white transition-colors flex items-center gap-1 text-[11px]"
                    title="View & Print Receipt"
                  >
                    <FileText className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                    Receipt
                  </button>

                  {order.status === 'delivered' && (
                    <button
                      type="button"
                      onClick={() => setFeedbackOrder(order)}
                      className="p-1.5 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 transition-colors flex items-center gap-1 text-[11px] font-bold"
                      title="Rate Pizza & Rider"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                      Rate Pizza &amp; Rider
                    </button>
                  )}
                </div>
              </div>

              {/* Items Summary */}
              <div className="space-y-1">
                {(order.items || []).length === 0 ? (
                  <p className="text-xs text-text-muted">No items recorded for this order.</p>
                ) : (
                  (order.items || []).map((item, idx) => (
                    <div
                      key={`${item?.id ?? item?.mealId ?? 'item'}-${idx}`}
                      className="flex justify-between text-xs text-text-muted"
                    >
                      <span>
                        {Number(item?.qty) || 1}x {item?.name}
                        {item?.spice ? ` (${item.spice})` : ''}
                      </span>
                      <span className="font-mono">{formatRWF(item?.price)}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="pt-2 flex items-center justify-between gap-3 border-t border-white/5 text-xs">
                <div className="flex items-center gap-1.5 text-text-muted min-w-0">
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
