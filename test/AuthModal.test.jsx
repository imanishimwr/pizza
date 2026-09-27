import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthModal from '../src/components/customer/AuthModal';

/**
 * Regression coverage for the crash that made the sign-in dialog unusable:
 * `useState` calls after an early `return null` threw
 * "Rendered more hooks than during the previous render" the second time the
 * modal was opened.
 */
describe('AuthModal', () => {
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

  it('renders nothing when closed', () => {
    const { container } = render(<AuthModal isOpen={false} onClose={() => {}} onSuccess={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('can be opened and closed repeatedly without a hook-order crash', async () => {
    const user = userEvent.setup();
    // The parent owns `isOpen`, so the harness has to actually flip it — the
    // original crash only appeared on the second mount.
    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Reopen
          </button>
          <AuthModal isOpen={open} onClose={() => setOpen(false)} onSuccess={() => {}} />
        </>
      );
    }
    render(<Harness />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /close sign-in dialog/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^reopen$/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /close sign-in dialog/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AuthModal isOpen onClose={onClose} onSuccess={() => {}} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('surfaces the server error rather than signing in', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Invalid email address or password.' }, { ok: false, status: 401 }));

    render(<AuthModal isOpen onClose={() => {}} onSuccess={onSuccess} />);
    await user.type(screen.getByLabelText(/email address/i), 'nobody@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/invalid email address or password/i));
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('enforces the minimum password length on the register form', async () => {
    const user = userEvent.setup();
    render(<AuthModal isOpen onClose={() => {}} onSuccess={() => {}} />);

    await user.click(screen.getByRole('tab', { name: /create account/i }));
    await user.type(screen.getByLabelText(/full name/i), 'Aline Umutoni');
    await user.type(screen.getByLabelText(/email address/i), 'aline@example.com');
    await user.type(screen.getByLabelText(/^password/i, { selector: '#auth-password' }), 'short');
    await user.type(screen.getByLabelText(/confirm password/i), 'short');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/at least 8 characters/i));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('gives the mode toggle and the submit button distinct accessible names', () => {
    render(<AuthModal isOpen onClose={() => {}} onSuccess={() => {}} />);
    // The toggle is a tablist, so it no longer collides with the submit button.
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
  });

  it('never promotes a user to admin based on their email address', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    // The server says "customer" for this account even though the address
    // contains the word "admin".
    fetchMock.mockResolvedValue(
      jsonResponse({ token: 't', user: { id: 'u9', name: 'A', email: 'admin-wannabe@example.com', role: 'customer' } })
    );

    render(<AuthModal isOpen onClose={() => {}} onSuccess={onSuccess} />);
    await user.type(screen.getByLabelText(/email address/i), 'admin-wannabe@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onSuccess.mock.calls[0][0].role).toBe('customer');
  });

  it('does not show a fake "reset link sent" confirmation', async () => {
    const user = userEvent.setup();
    render(<AuthModal isOpen onClose={() => {}} onSuccess={() => {}} />);

    await user.click(screen.getByRole('button', { name: /forgot password/i }));
    expect(screen.getByText(/not available on this deployment/i)).toBeInTheDocument();
    expect(screen.queryByText(/reset link sent/i)).not.toBeInTheDocument();
  });
});
