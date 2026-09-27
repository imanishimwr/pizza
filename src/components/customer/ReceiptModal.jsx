import React, { useRef, useState } from 'react';
import { X, Printer, CheckCircle2, Flame, Download, Loader2 } from 'lucide-react';
import { downloadOrderReceiptPdf } from '../../utils/receiptGenerator';

export default function ReceiptModal({ isOpen, onClose, order }) {
  if (!isOpen || !order) return null;

  const receiptRef = useRef(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      downloadOrderReceiptPdf(order);
    } catch (err) {
      console.error('PDF Generation Error:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in print:p-0 print:bg-white print:static print:block">
      <div className="bg-surface-dark border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6 print:bg-white print:text-black print:border-none print:shadow-none print:max-w-full print:w-full">
        
        {/* Header Actions */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-text-main">Official Order Receipt</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-50"
              title="Download PDF receipt"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-amber-400" />
              )}
              {isGeneratingPdf ? 'Generating...' : 'PDF'}
            </button>
            <button
              onClick={handlePrint}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-primary" />
              Print
            </button>
            <button onClick={onClose} className="p-1.5 text-text-muted hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div ref={receiptRef} className="p-4 bg-surface-card rounded-xl border border-white/5 space-y-4 font-mono text-xs print:p-0 print:bg-white print:border-none">
          
          {/* Logo Header */}
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-white/20 print:border-black/20">
            <div className="flex items-center justify-center gap-1.5 font-extrabold text-base text-primary print:text-black">
              <Flame className="w-5 h-5 text-primary print:text-black" />
              HOTPOT DELIGHTS KIGALI
            </div>
            <div className="text-[11px] text-text-muted print:text-gray-600">
              KG 7 Ave, Kimihurura, Kigali, Rwanda
            </div>
            <div className="text-[11px] text-text-muted print:text-gray-600">
              Tel: +250 788 000 000 • TIN: 102938475
            </div>
          </div>

          {/* Metadata */}
          <div className="space-y-1 text-text-muted print:text-gray-800">
            <div className="flex justify-between">
              <span>Receipt No:</span>
              <span className="font-bold text-text-main print:text-black">#{order.id}</span>
            </div>
            <div className="flex justify-between">
              <span>Date & Time:</span>
              <span>{order.orderTime || new Date().toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Customer:</span>
              <span className="font-bold text-text-main print:text-black">{order.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span>Phone:</span>
              <span>{order.phone}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Address:</span>
              <span className="line-clamp-1">{order.address}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment Method:</span>
              <span className="font-bold text-emerald-400 print:text-black">{order.paymentMethod || 'MTN Mobile Money'}</span>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="pt-2 border-t border-dashed border-white/20 print:border-black/20 space-y-2">
            <div className="flex justify-between font-bold text-text-main print:text-black uppercase text-[11px]">
              <span>Item</span>
              <span>Qty x Price</span>
            </div>

            <div className="space-y-1.5">
              {(order.items || []).map((item, idx) => (
                <div key={idx} className="flex justify-between text-text-muted print:text-black">
                  <div>
                    <div className="font-semibold text-text-main print:text-black">{item.name}</div>
                    {item.spice && <div className="text-[10px] text-orange-400 print:text-gray-700">Spice: {item.spice}</div>}
                  </div>
                  <div className="text-right">
                    <div>{item.qty} x {(Number(item.price) || 0)?.toLocaleString() ?? ''}</div>
                    <div className="font-bold text-text-main print:text-black">
                      {(item.qty * (Number(item.price) || 0))?.toLocaleString() ?? ''} RWF
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total Summary */}
          <div className="pt-3 border-t border-dashed border-white/20 print:border-black/20 space-y-1">
            <div className="flex justify-between text-text-muted print:text-black">
              <span>Subtotal:</span>
              <span>{(order.totalRWF || 0)?.toLocaleString() ?? ''} RWF</span>
            </div>
            <div className="flex justify-between text-text-muted print:text-black">
              <span>Delivery Fee (Kigali):</span>
              <span>FREE</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-primary print:text-black pt-1 border-t border-white/10">
              <span>TOTAL PAID:</span>
              <span>{(order.totalRWF || 0)?.toLocaleString() ?? ''} RWF</span>
            </div>
          </div>


          {/* Footer Note */}
          <div className="text-center text-[10px] text-text-subdued pt-4 print:text-gray-500">
            Murakoze! Thank you for ordering with HotPot Delights.
            <br />Enjoy your authentic gourmet meal!
          </div>

        </div>

      </div>
    </div>
  );
}

