/**
 * Pure-logic tests for the data layer. No database required — these cover the
 * pieces that were previously the source of silent data corruption: money
 * coercion, the status state machine, and the snake_case -> camelCase mapping.
 */
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost/test';

const test = require('node:test');
const assert = require('node:assert/strict');
const client = require('../neonClient');

test('toRWF coerces Postgres NUMERIC strings to integers', () => {
  assert.equal(client.toRWF('22000'), 22000);
  assert.equal(client.toRWF('22000.00'), 22000);
  assert.equal(client.toRWF(22000.4), 22000);
  assert.equal(client.toRWF(null), 0);
  assert.equal(client.toRWF(undefined), 0);
  assert.equal(client.toRWF(''), 0);
  assert.equal(client.toRWF('not a number'), 0);
});

test('toStringArray accepts arrays, JSON and Postgres brace literals', () => {
  assert.deepEqual(client.toStringArray(['a', 'b']), ['a', 'b']);
  assert.deepEqual(client.toStringArray('["a","b"]'), ['a', 'b']);
  assert.deepEqual(client.toStringArray('{a,b}'), ['a', 'b']);
  assert.deepEqual(client.toStringArray(null), []);
  assert.deepEqual(client.toStringArray(''), []);
});

test('order status machine allows only forward moves plus cancellation', () => {
  assert.ok(client.canTransition('pending', 'preparing'));
  assert.ok(client.canTransition('preparing', 'ready'));
  assert.ok(client.canTransition('ready', 'delivery'));
  assert.ok(client.canTransition('delivery', 'delivered'));

  // A customer cannot skip the kitchen and put an order straight on the road.
  assert.equal(client.canTransition('pending', 'delivery'), false);
  assert.equal(client.canTransition('pending', 'delivered'), false);
  assert.equal(client.canTransition('preparing', 'delivered'), false);

  // Terminal states are terminal.
  assert.equal(client.canTransition('delivered', 'pending'), false);
  assert.equal(client.canTransition('cancelled', 'pending'), false);

  // Idempotent re-set is fine; a backwards move is not.
  assert.ok(client.canTransition('preparing', 'preparing'));
  assert.equal(client.canTransition('delivery', 'ready'), false);
});

test('serializeOrder emits camelCase only, with no snake_case leakage', () => {
  const order = client.serializeOrder(
    {
      id: 'HP-123456',
      user_id: 'user-1',
      customer_name: 'Aline',
      phone: '0780000000',
      address: 'Kicukiro',
      status: 'pending',
      total_rwf: '22000',
      rider_name: null,
      payment_method: 'MTN Mobile Money',
      payment_status: 'paid',
      created_at: '2026-01-01T10:00:00.000Z',
      updated_at: '2026-01-01T10:00:00.000Z'
    },
    [{ id: 'oi-1', name: 'Royal Szechuan', qty: '2', price: '22000', special_note: 'no cilantro' }]
  );

  assert.equal(order.customerName, 'Aline');
  assert.equal(order.totalRWF, 22000);
  assert.equal(order.paymentStatus, 'paid');
  assert.equal(order.items.length, 1);
  assert.equal(order.items[0].qty, 2);
  assert.equal(order.items[0].specialNote, 'no cilantro');

  for (const key of Object.keys(order)) {
    assert.ok(!key.includes('_') || key === 'x', `unexpected snake_case key "${key}"`);
  }
});

test('serializeOrder only reveals the handover code when asked', () => {
  const row = { id: 'HP-1', verification_pin: '123456' };
  assert.equal(client.serializeOrder(row, []).verificationPin, undefined);
  assert.equal(client.serializeOrder(row, [], { includePin: true }).verificationPin, '123456');
});

test('serializeUser normalises role casing', () => {
  assert.equal(client.serializeUser({ id: '1', name: 'A', email: 'a@b.c', role: 'ADMIN' }).role, 'admin');
  assert.equal(client.serializeUser({ id: '1', name: 'A', email: 'a@b.c', role: null }).role, 'customer');
});

test('serializeMeal converts stock and review fields to booleans and numbers', () => {
  const meal = client.serializeMeal({
    id: 'hp-01',
    name: 'Royal Szechuan',
    category: 'hotpot',
    price: '22000',
    rating: '4.90',
    reviews_count: '12',
    spicy: true,
    out_of_stock: false,
    spice_levels: '["Hot"]',
    broths: '{Szechuan,Tomato}'
  });
  assert.equal(meal.price, 22000);
  assert.equal(meal.reviews, 12);
  assert.equal(meal.spicy, true);
  assert.equal(meal.outOfStock, false);
  assert.deepEqual(meal.spiceLevels, ['Hot']);
  assert.deepEqual(meal.broths, ['Szechuan', 'Tomato']);
});

test('makeId is unique and prefixed', () => {
  const ids = new Set(Array.from({ length: 200 }, () => client.makeId('user')));
  assert.equal(ids.size, 200);
  for (const id of ids) assert.ok(String(id).startsWith('user-'));
});
