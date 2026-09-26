import React, { useState } from 'react';
import { ShoppingBag, Clock, MapPin, CheckCircle2, ChevronRight, FileText, RefreshCw, Download, Star, Pizza, ArrowRight } from 'lucide-react';
import ReceiptModal from '../../components/customer/ReceiptModal';
import PostDeliveryFeedbackModal from '../../components/customer/PostDeliveryFeedbackModal';
import { downloadOrderReceiptPdf } from '../../utils/receiptGenerator';

export default function OrdersHistory({ orders = [], onSelectOrder, onAddToCart, onExploreMenu }) {
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [reorderedId, setReorderedId] = useState(null);
  const [feedbackOrder, setFeedbackOrder] = useState(null);

  const handleReorder = (e, order) => {
    e.stopPropagation();
    if (!onAddToCart) return;
    (order.items || []).forEach((item) => {
      onAddToCart(item);
    });
    setReorderedId(order.id);
    setTimeout(() => setReorderedId(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-text-main flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-primary" />
            Your HotPot Order History
          </h2>
          <p className="text-xs text-text-muted">Track your live orders, rate pizza & rider, or review past deliveries</p>
        </div>
      </div>

      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="py-16 text-center bg-surface-card rounded-3xl border border-white/10 space-y-4 p-8 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No Orders Placed Yet</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                The order history is available after you place your first order. Browse our delicious pizzas and gourmet hotpots!
              </p>
            </div>
            {onExploreMenu && (
              <button
                onClick={onExploreMenu}
                className="btn-primary py-2.5 px-6 text-xs font-bold inline-flex items-center gap-2 shadow-lg shadow-primary/20"
              >
                <span>Browse Menu & Order</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          orders.map((order) => (
            <div 
              key={order.id}
              className="p-5 rounded-2xl bg-surface-card border border-white/5 hover:border-primary/40 transition-all cursor-pointer space-y-3"
              onClick={() => onSelectOrder && onSelectOrder(order)}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-amber-400">Order #{order.id}</span>
                  <span className="text-xs text-text-muted">• {order.orderTime}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                    order.status === 'delivered' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40' :
                    order.status === 'delivery' ? 'bg-amber-950/80 text-amber-400 border border-amber-500/40' :
                    'bg-blue-950/80 text-blue-400 border border-blue-500/40'
                  }`}>
                    {order.status}
                  </span>

                  <button
                    onClick={(e) => handleReorder(e, order)}
                    className="p-1.5 px-3 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary font-bold transition-all flex items-center gap-1.5 text-[11px]"
                    title="Reorder all items in this order"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${reorderedId === order.id ? 'animate-spin' : ''}`} />
                    {reorderedId === order.id ? 'Added to Cart!' : '1-Click Reorder'}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadOrderReceiptPdf(order);
                    }}
                    className="p-1.5 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 transition-colors flex items-center gap-1 text-[11px] font-bold"
                    title="Download PDF Receipt"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    PDF
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedReceipt(order);
                    }}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-text-muted hover:text-white transition-colors flex items-center gap-1 text-[11px]"
                    title="View & Print Receipt"
                  >
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    Receipt
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFeedbackOrder(order);
                    }}
                    className="p-1.5 px-2.5 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-yellow-300 transition-colors flex items-center gap-1 text-[11px] font-bold"
                    title="Rate Pizza & Rider"
                  >
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    Rate Pizza & Rider
                  </button>
                </div>
              </div>

              {/* Items Summary */}
              <div className="space-y-1">
                {(order.items || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs text-text-muted">
                    <span>{item.qty}x {item.name} {item.spice ? `(${item.spice})` : ''}</span>
                    <span className="font-mono">{(item.price || 0)?.toLocaleString() ?? ''} RWF</span>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="pt-2 flex items-center justify-between border-t border-white/5 text-xs">
                <div className="flex items-center gap-1.5 text-text-muted">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span className="line-clamp-1">{order.address}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono font-extrabold text-sm text-primary">
                    Total: {(order.totalRWF || 0)?.toLocaleString() ?? ''} RWF
                  </span>
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                </div>
              </div>
            </div>
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
