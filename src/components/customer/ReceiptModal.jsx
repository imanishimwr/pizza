import React, { useEffect, useRef, useState } from 'react';
import { X, Printer, CheckCircle2, Flame, Download, Loader2, AlertTriangle as TriangleAlert } from 'lucide-react';
import { downloadOrderReceiptPdf } from '../../utils/receiptGenerator';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

const rwf = (value) => Number(value || 0).toLocaleString();
const DASH = '—';

function useOverlayA11y(isOpen, onClose) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return undefined;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const first = panel ? panel.querySelector(FOCUSABLE_SELECTOR) : null;
    if (first instanceof HTMLElement) first.focus();
    else if (panel instanceof HTMLElement) panel.focus();
    return () => {
      if (trigger && document.contains(trigger)) trigger.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (typeof closeRef.current === 'function') closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const nodes = Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR));
      if (nodes.length === 0) {
        event.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === first || active === panel || !panel.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  return panelRef;
}

/**
 * Printable / downloadable receipt. Rendered by OrdersHistory, LiveTracking and
 * CustomerDashboard with `{ isOpen, onClose, order }` — that signature is fixed.
 */
export default function ReceiptModal({ isOpen, onClose, order }) {
  // Hooks first, unconditionally: the early return for "closed" must come after
  // them or React throws "Rendered fewer hooks than expected" on open.
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const open = Boolean(isOpen) && Boolean(order);
  const panelRef = useOverlayA11y(open, onClose);
  const receiptRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setIsGeneratingPdf(false);
      setErrorMsg('');
    }
  }, [open]);

  if (!open) return null;

  const items = Array.isArray(order.items) ? order.items : [];
  const total = Number(order.totalRWF) || 0;

  const handlePrint = () => window.print();

  const handleDownloadPdf = async () => {
    setErrorMsg('');
    setIsGeneratingPdf(true);
    try {
      downloadOrderReceiptPdf(order);
    } catch (err) {
      console.error('[ReceiptModal] PDF generation failed:', err);
      setErrorMsg(err?.message || 'Could not generate the PDF receipt.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity duration-200 print:p-0 print:bg-white print:static print:block"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-modal-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="bg-surface-dark border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6 print:bg-white print:text-black print:border-none print:shadow-none print:max-w-full print:w-full"
      >
        {/* Header Actions */}
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" focusable="false" />
            <h2 id="receipt-modal-title" className="text-base font-bold text-text-main">
              Official Order Receipt
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" aria-hidden="true" focusable="false" />
              ) : (
                <Download className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" focusable="false" />
              )}
              {isGeneratingPdf ? 'Generating...' : 'PDF'}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-primary" aria-hidden="true" focusable="false" />
              Print
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close receipt"
              className="p-1.5 text-text-muted hover:text-white rounded-lg hover:bg-white/5"
            >
              <X className="w-5 h-5" aria-hidden="true" focusable="false" />
            </button>
          </div>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="flex items-start gap-2 p-2.5 rounded-xl bg-red-950/70 border border-red-500/40 text-red-300 text-xs font-semibold print:hidden"
          >
            <TriangleAlert className="w-4 h-4 shrink-0" aria-hidden="true" focusable="false" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Printable Receipt Body */}
        <div
          ref={receiptRef}
          className="p-4 bg-surface-card rounded-xl border border-white/5 space-y-4 font-mono text-xs print:p-0 print:bg-white print:border-none"
        >
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-white/20 print:border-black/20">
            <div className="flex items-center justify-center gap-1.5 font-extrabold text-base text-primary print:text-black">
              <Flame className="w-5 h-5 text-primary print:text-black" aria-hidden="true" focusable="false" />
              HOTPOT DELIGHTS KIGALI
            </div>
            <div className="text-[11px] text-text-muted print:text-gray-600">
              KG 7 Ave, Kimihurura, Kigali, Rwanda
            </div>
            <div className="text-[11px] text-text-muted print:text-gray-600">
              Tel: +250 788 000 000 • TIN: 102938475
            </div>
          </div>

          <div className="space-y-1 text-text-muted print:text-gray-800">
            <div className="flex justify-between gap-4">
              <span>Receipt No:</span>
              <span className="font-bold text-text-main print:text-black">#{order.id}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Date &amp; Time:</span>
              <span className="text-right">
                {order.createdAt
                  ? new Date(order.createdAt).toLocaleString()
                  : order.orderTime || new Date().toLocaleTimeString()}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Customer:</span>
              <span className="font-bold text-text-main print:text-black">
                {order.customerName || DASH}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Phone:</span>
              <span>{order.phone || DASH}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Delivery Address:</span>
              <span className="text-right line-clamp-2">{order.address || DASH}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Payment Method:</span>
              <span className="font-bold text-emerald-400 print:text-black text-right">
                {order.paymentMethod || DASH}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Payment Status:</span>
              <span className="text-right">{order.paymentStatus || DASH}</span>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="pt-2 border-t border-dashed border-white/20 print:border-black/20 space-y-2">
            <div className="flex justify-between font-bold text-text-main print:text-black uppercase text-[11px]">
              <span>Item</span>
              <span>Qty x Price</span>
            </div>

            <div className="space-y-1.5">
              {items.length === 0 ? (
                <div className="text-text-subdued">No items recorded for this order.</div>
              ) : (
                items.map((item, idx) => {
                  const price = Number(item?.price) || 0;
                  const qty = Number(item?.qty ?? item?.quantity) || 1;
                  return (
                    <div
                      key={item?.id ?? `${item?.name}-${idx}`}
                      className="flex justify-between gap-4 text-text-muted print:text-black"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-text-main print:text-black truncate">
                          {item?.name || 'Item'}
                        </div>
                        {item?.spice && (
                          <div className="text-[10px] text-orange-400 print:text-gray-700">
                            Spice: {item.spice}
                          </div>
                        )}
                        {item?.broth && (
                          <div className="text-[10px] text-amber-300 print:text-gray-700">
                            Broth: {item.broth}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div>
                          {qty} x {rwf(price)}
                        </div>
                        <div className="font-bold text-text-main print:text-black">{rwf(price * qty)} RWF</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Total Summary */}
          <div className="pt-3 border-t border-dashed border-white/20 print:border-black/20 space-y-1">
            <div className="flex justify-between text-text-muted print:text-black">
              <span>Subtotal:</span>
              <span>{rwf(total)} RWF</span>
            </div>
            <div className="flex justify-between text-text-muted print:text-black">
              <span>Delivery Fee (Kigali):</span>
              <span>FREE</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-primary print:text-black pt-1 border-t border-white/10">
              <span>TOTAL PAID:</span>
              <span>{rwf(total)} RWF</span>
            </div>
          </div>

          <div className="text-center text-[10px] text-text-subdued pt-4 print:text-gray-500">
            Murakoze! Thank you for ordering with HotPot Delights.
            <br />Enjoy your authentic gourmet meal!
          </div>
        </div>
      </div>
    </div>
  );
}
