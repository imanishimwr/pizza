import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  session,
  cart,
  wishlist,
  trackedOrder,
  ApiError,
  getMeals,
  login,
  register,
  cancelOrder,
  onAuthLost
} from '../src/services/apiService';

describe('local storage helpers', () => {
  beforeEach(() => localStorage.clear());

  it('returns the fallback for a missing or corrupt entry', () => {
    expect(cart.get()).toEqual([]);
    expect(wishlist.get()).toEqual([]);
    expect(trackedOrder.get()).toBeNull();

    localStorage.setItem('hotpot_cart_v1', '{not json');
    expect(cart.get()).toEqual([]);
    // The corrupt value is dropped so it cannot break every later read.
    expect(localStorage.getItem('hotpot_cart_v1')).toBeNull();
  });

  it('round-trips the cart and coerces non-arrays to an empty list', () => {
    cart.set([{ meal: { id: 'hp-01' }, quantity: 2 }]);
    expect(cart.get()).toHaveLength(1);

    cart.set('nonsense');
    expect(cart.get()).toEqual([]);
  });

  it('clears the tracked order id when set to a falsy value', () => {
    trackedOrder.set('HP-123456');
    expect(trackedOrder.get()).toBe('HP-123456');
    trackedOrder.set(null);
    expect(trackedOrder.get()).toBeNull();
  });
});

describe('session', () => {
  beforeEach(() => localStorage.clear());

  it('stores the token and user, and normalises the role to lowercase', () => {
    session.set({ token: 'jwt-123', user: { id: 'u1', role: 'ADMIN', email: 'a@b.c' } });
    expect(session.isAuthenticated()).toBe(true);
    expect(session.getToken()).toBe('jwt-123');
    expect(session.role()).toBe('admin');
  });

  it('reports no role when signed out', () => {
    expect(session.role()).toBeNull();
    expect(session.isAuthenticated()).toBe(false);
  });

  it('clears both token and user on logout', () => {
    session.set({ token: 'jwt-123', user: { id: 'u1', role: 'customer' } });
    session.clear();
    expect(session.getToken()).toBeNull();
    expect(session.getUser()).toBeNull();
  });
});

describe('request behaviour', () => {
  let fetchMock;

  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const jsonResponse = (body, { status = 200, ok = true } = {}) => ({
    ok,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body
  });

  it('rejects with the server message instead of returning an empty list', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Failed to fetch meals' }, { ok: false, status: 500 }));
    await expect(getMeals()).rejects.toThrow('Failed to fetch meals');
  });

  it('turns a network failure into a readable message rather than empty data', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(getMeals()).rejects.toThrow(/cannot reach the server/i);
  });

  it('fails loudly when an authenticated call has no token', async () => {
    await expect(cancelOrder('HP-1')).rejects.toBeInstanceOf(ApiError);
    await expect(cancelOrder('HP-1')).rejects.toThrow(/sign in/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('signs the user out and notifies listeners when the server returns 401', async () => {
    session.set({ token: 'stale', user: { id: 'u1', role: 'admin' } });
    const lost = vi.fn();
    const off = onAuthLost(lost);

    fetchMock.mockResolvedValue(jsonResponse({ error: 'Invalid session.' }, { ok: false, status: 401 }));
    await expect(cancelOrder('HP-1')).rejects.toThrow('Invalid session.');

    expect(session.getToken()).toBeNull();
    expect(lost).toHaveBeenCalledOnce();
    off();
  });

  it('sends a register request with no role field and no auth header', async () => {
    session.set({ token: 'jwt-abc', user: { id: 'u1', role: 'customer' } });
    fetchMock.mockResolvedValue(
      jsonResponse({ token: 'jwt-abc', user: { id: 'u1', name: 'A', email: 'a@b.c', role: 'customer' } })
    );

    // A caller that tries to self-assign a staff role must not be able to send it,
    // and registration itself must not require a token.
    await register({ name: 'A', email: 'a@b.c', password: 'password123', role: 'admin' });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/auth\/register$/);
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBeUndefined();
    expect(JSON.parse(options.body)).not.toHaveProperty('role');
  });

  it('attaches the bearer token to an authenticated call', async () => {
    session.set({ token: 'jwt-abc', user: { id: 'u1', role: 'admin' } });
    fetchMock.mockResolvedValue(jsonResponse({ id: 'HP-1' }));

    await cancelOrder('HP-1');

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/orders\/HP-1$/);
    expect(options.method).toBe('DELETE');
    expect(options.headers.Authorization).toBe('Bearer jwt-abc');
  });

  it('signs in and persists the session returned by the server', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ token: 'jwt-new', user: { id: 'u2', name: 'B', email: 'b@b.c', role: 'kitchen' } })
    );
    const user = await login({ email: 'B@B.C', password: 'password123' });

    expect(user.role).toBe('kitchen');
    expect(session.getToken()).toBe('jwt-new');
    expect(session.role()).toBe('kitchen');
  });
});
