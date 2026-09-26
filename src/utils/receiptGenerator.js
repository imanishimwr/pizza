import jsPDF from 'jspdf';

/**
 * Generates and triggers the immediate download of an official PDF receipt for an order.
 * @param {Object} order - The order object
 */
export function downloadOrderReceiptPdf(order) {
  if (!order) return;

  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a5' // 148mm x 210mm
    });

    const pageWidth = 148;
    const margin = 14;
    const contentWidth = pageWidth - (margin * 2);
    let y = 16;

    // Header banner with dark warm background
    doc.setFillColor(28, 25, 23); // #1c1917
    doc.rect(margin, y, contentWidth, 24, 'F');

    // Brand Name
    doc.setTextColor(249, 115, 22); // Orange #f97316
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('HOTPOT DELIGHTS', pageWidth / 2, y + 9, { align: 'center' });

    // Subtitle
    doc.setTextColor(214, 211, 209);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Artisanal Gourmet & Pizza - Nyarutarama, Kigali', pageWidth / 2, y + 15, { align: 'center' });
    doc.text('Tel: +250 788 000 001  |  Email: orders@hotpot.rw', pageWidth / 2, y + 20, { align: 'center' });

    y += 30;

    // Receipt Title & Status Bar
    doc.setFillColor(245, 245, 244);
    doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F');

    doc.setTextColor(28, 25, 23);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('OFFICIAL PAYMENT RECEIPT', margin + 4, y + 6.5);

    const isPaid = (order.paymentStatus || 'PAID').toUpperCase() === 'PAID';
    doc.setTextColor(isPaid ? 22 : 180, isPaid ? 101 : 83, isPaid ? 52 : 9); // Emerald or Amber
    doc.setFontSize(9);
    doc.text(isPaid ? 'PAID - VERIFIED' : 'PAYMENT PENDING', pageWidth - margin - 4, y + 6.5, { align: 'right' });

    y += 16;

    // Order & Customer Details (2 columns)
    doc.setTextColor(120, 113, 108);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('ORDER INFO', margin, y);
    doc.text('CUSTOMER INFO', margin + 65, y);

    y += 5;
    doc.setTextColor(41, 37, 36);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    doc.text(`Order No: #${order.id || 'N/A'}`, margin, y);
    doc.text(`Customer: ${order.customerName || 'Valued Guest'}`, margin + 65, y);
    y += 4.5;

    const orderDate = order.orderTime ? new Date(order.orderTime)?.toLocaleString() ?? '' : new Date()?.toLocaleString() ?? '';
    doc.text(`Date: ${orderDate}`, margin, y);
    doc.text(`Phone: ${order.phone || 'N/A'}`, margin + 65, y);
    y += 4.5;

    doc.text(`Payment: ${order.paymentMethod || 'Mobile Money'}`, margin, y);
    const addr = (order.address || order.deliveryAddress || 'Kigali, Rwanda');
    const truncatedAddr = addr.length > 30 ? addr.substring(0, 28) + '...' : addr;
    doc.text(`Address: ${truncatedAddr}`, margin + 65, y);

    y += 9;

    // Divider Line
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageWidth - margin, y);

    y += 6;

    // Items Table Header
    doc.setFillColor(243, 244, 246);
    doc.rect(margin, y, contentWidth, 7, 'F');

    doc.setTextColor(75, 85, 99);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('ITEM DESCRIPTION', margin + 3, y + 4.8);
    doc.text('QTY', margin + 78, y + 4.8, { align: 'center' });
    doc.text('PRICE', margin + 98, y + 4.8, { align: 'right' });
    doc.text('TOTAL', pageWidth - margin - 3, y + 4.8, { align: 'right' });

    y += 10;

    // Items Rows
    const items = Array.isArray(order.items) ? order.items : [];
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(31, 41, 55);

    if (items.length === 0) {
      doc.text('Gourmet meal selection', margin + 3, y);
      doc.text('1', margin + 78, y, { align: 'center' });
      doc.text(`${Number(order.totalRWF || 0)?.toLocaleString() ?? ''} RWF`, margin + 98, y, { align: 'right' });
      doc.text(`${Number(order.totalRWF || 0)?.toLocaleString() ?? ''} RWF`, pageWidth - margin - 3, y, { align: 'right' });
      y += 6;
    } else {
      items.forEach((item) => {
        if (y > 175) return; // Prevent page overflow
        const itemName = item.name || 'HotPot Meal';
        const truncatedName = itemName.length > 32 ? itemName.substring(0, 30) + '..' : itemName;
        const qty = item.qty || item.quantity || 1;
        const unitPrice = Number(item.price) || 0;
        const lineTotal = qty * unitPrice;

        doc.setFont('helvetica', 'bold');
        doc.text(truncatedName, margin + 3, y);
        doc.setFont('helvetica', 'normal');
        doc.text(String(qty), margin + 78, y, { align: 'center' });
        doc.text(`${unitPrice?.toLocaleString() ?? ''}`, margin + 98, y, { align: 'right' });
        doc.text(`${lineTotal?.toLocaleString() ?? ''} RWF`, pageWidth - margin - 3, y, { align: 'right' });

        if (item.spice || item.broth) {
          y += 3.5;
          doc.setTextColor(156, 163, 175);
          doc.setFontSize(7);
          const meta = [item.spice, item.broth].filter(Boolean).join(' • ');
          doc.text(`   [${meta}]`, margin + 3, y);
          doc.setFontSize(8.5);
          doc.setTextColor(31, 41, 55);
        }

        y += 5.5;
      });
    }

    y += 2;
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y, pageWidth - margin, y);

    y += 6;

    // Totals Section
    const grandTotal = Number(order.totalRWF || 0);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Subtotal:', margin + 65, y);
    doc.text(`${grandTotal?.toLocaleString() ?? ''} RWF`, pageWidth - margin - 3, y, { align: 'right' });
    y += 5;

    doc.text('Delivery Fee (Kigali):', margin + 65, y);
    doc.text('Included / Free', pageWidth - margin - 3, y, { align: 'right' });
    y += 6;

    // Highlighted Total Box
    doc.setFillColor(249, 115, 22, 0.12);
    doc.roundedRect(margin + 55, y - 4, contentWidth - 55, 10, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(234, 88, 12);
    doc.text('TOTAL PAID:', margin + 60, y + 2.5);
    doc.text(`${grandTotal?.toLocaleString() ?? ''} RWF`, pageWidth - margin - 4, y + 2.5, { align: 'right' });

    y += 18;

    // Thank you & Footer note
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'F');

    doc.setTextColor(75, 85, 99);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Murakoze cyane! Thank you for dining with HotPot Delights.', pageWidth / 2, y + 5.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(156, 163, 175);
    doc.text('Present this receipt upon courier delivery if required. Support: +250 788 000 001', pageWidth / 2, y + 10, { align: 'center' });

    // Save and trigger file download
    const filename = `HotPot_Receipt_${order.id || 'Order'}.pdf`;
    doc.save(filename);
    return true;
  } catch (err) {
    console.error('Failed to generate PDF receipt:', err);
    return false;
  }
}
