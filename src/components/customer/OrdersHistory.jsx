import React, { useState } from 'react';
import { ShoppingBag, Clock, MapPin, CheckCircle2, ChevronRight, FileText } from 'lucide-react';
import ReceiptModal from './ReceiptModal';

export default function OrdersHistory({ orders, onSelectOrder }) {
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-text-main flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-primary" />
            Your HotPot Order History
          </h2>
          <p className="text-xs text-text-muted">Track your live orders or review past gourmet hotpot deliveries</p>
        </div>
      </div>

      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="py-16 text-center bg-surface-card rounded-2xl border border-white/5 space-y-2">
            <ShoppingBag className="w-10 h-10 text-text-subdued mx-auto" />
            <p className="text-text-muted text-sm font-medium">You haven't placed any orders yet.</p>
          </div>
        ) : (
          orders.map((order) => (
            <div 
              key={order.id}
              className="p-5 rounded-2xl bg-surface-card border border-white/5 hover:border-primary/40 transition-all cursor-pointer space-y-3"
              onClick={() => onSelectOrder(order)}
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
                </div>
              </div>

              {/* Items Summary */}
              <div className="space-y-1">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs text-text-muted">
                    <span>{item.qty}x {item.name} {item.spice ? `(${item.spice})` : ''}</span>
                    <span className="font-mono">{item.price.toLocaleString()} RWF</span>
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
                    Total: {order.totalRWF.toLocaleString()} RWF
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
    </div>
  );
}
