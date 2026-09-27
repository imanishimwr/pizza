import jsPDF from 'jspdf';

/**
 * Renders an order receipt as a PDF and triggers the download.
 *
 * Everything printed comes from the order object. There is no invented line
 * item, no "PAID" default, and no silent substitution of `new Date()` for a
 * missing order date — the old version printed a fabricated "Gourmet meal
 * selection" row for an empty basket and labelled every receipt "TOTAL PAID"
 * regardless of whether a payment had actually been collected.
 */

const PAGE = { width: 148, height: 210, margin: 14 };
const RWF = (value) => `${Math.round(Number(value) || 0).toLocaleString('en-US')} RWF`;

const STATUS_LABELS = {
  pending: 'Received',
  preparing: 'In the kitchen',
  ready: 'Ready for pickup',
  delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};

/** Truncate on a word boundary where possible, and always mark the cut. */
function clip(text, max) {
  const value = String(text ?? '').trim();
  if (value.length <= max) return value;
  const cut = value.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** The canonical creation timestamp, not the display-only `orderTime` clock. */
export function orderDateLabel(order) {
  const raw = order?.createdAt;
  if (!raw) return '—';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function buildOrderReceipt(order) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const { width: pageWidth, margin, height: pageHeight } = PAGE;
  const contentWidth = pageWidth - margin * 2;
  const status = String(order?.status || 'pending').toLowerCase();
  const paymentStatus = String(order?.paymentStatus || 'pending').toLowerCase();
  const isPaid = paymentStatus === 'paid';
  const items = Array.isArray(order?.items) ? order.items : [];
  const total = Math.round(Number(order?.totalRWF) || 0);
  const computedTotal = items.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0), 0);

  let y = 16;

  // --- Header -------------------------------------------------------------
  doc.setFillColor(28, 25, 23);
  doc.rect(margin, y, contentWidth, 24, 'F');
  doc.setTextColor(249, 115, 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('HOTPOT DELIGHTS', pageWidth / 2, y + 9, { align: 'center' });
  doc.setTextColor(214, 211, 209);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Artisanal Hotpot & Pizza · Nyarutarama, Kigali', pageWidth / 2, y + 15, { align: 'center' });
  doc.text('Tel: +250 788 000 001  |  orders@hotpotdelights.rw', pageWidth / 2, y + 20, { align: 'center' });
  y += 30;

  // --- Title + order status ----------------------------------------------
  doc.setFillColor(245, 245, 244);
  doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F');
  doc.setTextColor(28, 25, 23);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('ORDER RECEIPT', margin + 4, y + 6.5);
  doc.setTextColor(120, 113, 108);
  doc.setFontSize(8);
  doc.text(STATUS_LABELS[status] || status, pageWidth - margin - 4, y + 6.5, { align: 'right' });
  y += 16;

  // --- Details ------------------------------------------------------------
  const col2 = margin + 65;
  doc.setTextColor(120, 113, 108);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('ORDER INFO', margin, y);
  doc.text('CUSTOMER INFO', col2, y);
  y += 5;

  doc.setTextColor(41, 37, 36);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Order: #${order?.id || '—'}`, margin, y);
  doc.text(clip(order?.customerName || '—', 26), col2, y);
  y += 4.5;
  doc.text(`Date: ${orderDateLabel(order)}`, margin, y);
  doc.text(`Phone: ${order?.phone || '—'}`, col2, y);
  y += 4.5;
  doc.text(clip(order?.paymentMethod || '—', 30), margin, y);
  doc.text(`Addr: ${clip(order?.address || '—', 26)}`, col2, y);
  y += 9;

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // --- Line items ---------------------------------------------------------
  doc.setFillColor(243, 244, 246);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setTextColor(75, 85, 99);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('ITEM', margin + 3, y + 4.8);
  doc.text('QTY', margin + 78, y + 4.8, { align: 'center' });
  doc.text('PRICE', margin + 100, y + 4.8, { align: 'right' });
  doc.text('TOTAL', pageWidth - margin - 3, y + 4.8, { align: 'right' });

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(31, 41, 55);

  if (items.length === 0) {
    // Say nothing was recorded rather than inventing a purchase.
    doc.setTextColor(120, 113, 108);
    doc.text('No line items were recorded on this order.', margin + 3, y);
    y += 6;
  } else {
    for (const item of items) {
      if (y > pageHeight - 58) {
        doc.setTextColor(120, 113, 108);
        doc.text('…continued on the next page', margin + 3, y);
        y += 6;
        break;
      }
      const qty = Number(item?.qty) || 0;
      const unitPrice = Number(item?.price) || 0;
      const lineTotal = qty * unitPrice;

      doc.setTextColor(31, 41, 55);
      doc.setFont('helvetica', 'bold');
      doc.text(clip(item?.name || 'Item', 34), margin + 3, y);
      doc.setFont('helvetica', 'normal');
      doc.text(String(qty), margin + 78, y, { align: 'center' });
      doc.text(String(unitPrice), margin + 100, y, { align: 'right' });
      doc.text(RWF(lineTotal), pageWidth - margin - 3, y, { align: 'right' });

      const notes = [item?.spice, item?.broth, item?.specialNote].filter(Boolean).join(' • ');
      if (notes) {
        y += 3.5;
        doc.setTextColor(120, 113, 108);
        doc.setFontSize(7);
        doc.text(clip(notes, 46), margin + 3, y);
        doc.setFontSize(8.5);
      }
      y += 5.5;
    }
  }

  y += 2;
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // --- Totals -------------------------------------------------------------
  // When the line items disagree with the stored total, show the computed sum
  // and say so. Silently printing the larger number hides a real bug.
  const mismatch = items.length > 0 && computedTotal !== total;
  const displayTotal = items.length > 0 ? computedTotal : total;

  doc.setTextColor(31, 41, 55);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Subtotal:', margin + 65, y);
  doc.text(RWF(items.length > 0 ? computedTotal : total), pageWidth - margin - 3, y, { align: 'right' });
  y += 5;
  doc.text('Delivery (Kigali):', margin + 65, y);
  doc.text('Included', pageWidth - margin - 3, y, { align: 'right' });
  y += 6;

  doc.setFillColor(249, 115, 22);
  doc.roundedRect(margin + 55, y - 4, contentWidth - 55, 10, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(isPaid ? 'TOTAL PAID:' : 'TOTAL DUE:', margin + 59, y + 2.5);
  doc.text(RWF(displayTotal), pageWidth - margin - 4, y + 2.5, { align: 'right' });
  y += 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 113, 108);
  doc.text(
    isPaid ? 'Payment confirmed.' : `Payment status: ${paymentStatus}.`,
    margin,
    y
  );
  if (mismatch) {
    y += 4;
    doc.text(`Stored total ${RWF(total)} did not match the line items.`, margin, y);
  }

  // --- Footer -------------------------------------------------------------
  const footerY = pageHeight - 22;
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
  doc.setTextColor(120, 113, 108);
  doc.setFontSize(7.5);
  doc.text('Murakoze cyane — thank you for dining with HotPot Delights.', pageWidth / 2, footerY, {
    align: 'center'
  });
  doc.text('hotpotdelights.rw · +250 788 000 001', pageWidth / 2, footerY + 4, { align: 'center' });

  return doc;
}

export function downloadOrderReceiptPdf(order) {
  if (!order) {
    console.warn('downloadOrderReceiptPdf called without an order.');
    return false;
  }
  try {
    const doc = buildOrderReceipt(order);
    doc.save(`HotPot_Receipt_${order.id || 'order'}.pdf`);
    return true;
  } catch (err) {
    console.error('Failed to generate PDF receipt:', err);
    return false;
  }
}
