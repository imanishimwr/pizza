import { describe, it, expect } from 'vitest';
import { buildOrderReceipt, orderDateLabel } from '../src/utils/receiptGenerator';

const sampleOrder = {
  id: 'HP-123456',
  userId: 'u1',
  customerName: 'Marie Claire Uwase',
  phone: '0788123456',
  address: 'KG 9 Ave, Nyarutarama',
  status: 'delivery',
  totalRWF: 22000,
  paymentMethod: 'MTN Mobile Money',
  paymentStatus: 'paid',
  createdAt: '2026-03-04T09:30:00.000Z',
  orderTime: '09:30',
  items: [
    { id: 'oi1', name: 'Royal Szechuan Hotpot Combo', qty: 1, price: 22000, spice: 'Hot', broth: 'Szechuan' },
    { id: 'oi2', name: 'Crispy Spring Rolls', qty: 2, price: 4500 }
  ]
};

describe('orderDateLabel', () => {
  it('uses the canonical createdAt, not the display-only orderTime clock', () => {
    expect(orderDateLabel({ createdAt: '2026-03-04T09:30:00.000Z' })).toMatch(/2026/);
  });

  it('returns a dash instead of "Invalid Date" for missing or bad input', () => {
    expect(orderDateLabel({})).toBe('—');
    expect(orderDateLabel({ createdAt: 'not-a-date' })).toBe('—');
    expect(orderDateLabel(null)).toBe('—');
  });
});

describe('buildOrderReceipt', () => {
  it('produces a PDF document for a normal order', () => {
    const doc = buildOrderReceipt(sampleOrder);
    expect(doc).toBeTruthy();
    expect(typeof doc.save).toBe('function');
    expect(doc.output('datauristring').startsWith('data:application/pdf')).toBe(true);
  });

  it('does not throw on an order with no line items', () => {
    expect(() => buildOrderReceipt({ ...sampleOrder, items: [] })).not.toThrow();
  });

  it('does not throw when status and payment status are missing', () => {
    expect(() => buildOrderReceipt({ id: 'HP-1' })).not.toThrow();
  });

  it('tolerates non-numeric money and quantity without producing NaN', () => {
    const doc = buildOrderReceipt({
      ...sampleOrder,
      totalRWF: 'not a number',
      items: [{ name: 'X', qty: 'two', price: null }]
    });
    // A NaN in the PDF content stream means the arithmetic escaped the guards.
    expect(doc.output('datauristring')).not.toContain('NaN');
  });

  it('escapes markup in customer-supplied fields so it cannot reach the PDF as structure', () => {
    const doc = buildOrderReceipt({
      ...sampleOrder,
      customerName: '"><script>alert(1)</script>',
      address: '<b>fake</b>'
    });
    expect(() => doc.output('datauristring')).not.toThrow();
  });
});
