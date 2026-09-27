import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { X, Lock, User, Mail, LogIn, ArrowRight, Flame, Phone, Eye, EyeOff, AlertCircle, Sparkles, KeyRound } from 'lucide-react';
import { login, register, loginWithGoogle } from '../../services/apiService';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const MIN_PASSWORD = 8;

const fieldClass =
  'w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-text-subdued focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all';
const toggleFieldClass = `${fieldClass} pr-10`;
const labelClass = 'text-xs font-bold text-text-muted uppercase tracking-wider block';
const primaryButton =
  'w-full bg-linear-to-r from-primary to-orange-600 hover:from-primary-hover hover:to-orange-500 text-white text-sm py-3 font-bold rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed';

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  // Every hook runs unconditionally. The previous version returned early before
  // its useState calls, which threw "Rendered more hooks than during the previous
  // render" the moment the modal was opened a second time.
  const [mode, setMode] = useState('signin'); // 'signin' | 'register' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);

  const dialogRef = useRef(null);
  const emailRef = useRef(null);
  const googleButtonHost = useRef(null);
  const titleId = useId();

  const reset = useCallback(() => {
    setMode('signin');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setPhone('');
    setShowPassword(false);
    setErrorMsg('');
    setIsSubmitting(false);
  }, []);

  const close = useCallback(() => {
    reset();
    onClose?.();
  }, [reset, onClose]);

  // Reset whenever the modal is re-opened so a previous attempt never leaks
  // into the next one (a typed password used to survive being closed).
  useEffect(() => {
    if (isOpen) {
      reset();
      const raf = requestAnimationFrame(() => emailRef.current?.focus());
      return () => cancelAnimationFrame(raf);
    }
    return undefined;
  }, [isOpen, reset]);

  // Escape to dismiss, Tab to stay inside the dialog.
  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusables = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, close]);

  // Google Identity Services. Only initialised when a client id is configured —
  // the SDK used to be loaded unconditionally and the container left empty.
  useEffect(() => {
    if (!isOpen || !GOOGLE_CLIENT_ID) return undefined;
    const host = googleButtonHost.current;
    if (!host) return undefined;

    let cancelled = false;
    const render = () => {
      if (cancelled || !window.google?.accounts?.id) return;
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async ({ credential }) => {
            setIsSubmitting(true);
            try {
              // The server verifies this token against Google and rejects it
              // otherwise. There is no demo fallback.
              const user = await loginWithGoogle(credential);
              onSuccess?.(user);
            } catch (err) {
              setErrorMsg(err.message || 'Google sign-in failed.');
            } finally {
              setIsSubmitting(false);
            }
          }
        });
        host.replaceChildren();
        window.google.accounts.id.renderButton(host, {
          theme: 'filled_black',
          size: 'large',
          width: 320,
          text: 'continue_with'
        });
        setGoogleReady(true);
      } catch (err) {
        console.error('Google sign-in button failed to render:', err);
      }
    };

    if (window.google?.accounts?.id) render();
    else window.addEventListener('load', render, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener('load', render);
      setGoogleReady(false);
    };
  }, [isOpen, onSuccess]);

  const validate = () => {
    if (mode === 'forgot') {
      if (!email.trim()) return 'Please enter the email address on your account.';
      return '';
    }
    if (mode === 'register') {
      if (fullName.trim().length < 2) return 'Please enter your full name.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Please enter a valid email address.';
      if (password.length < MIN_PASSWORD) return `Password must be at least ${MIN_PASSWORD} characters long.`;
      if (password !== confirmPassword) return 'The two passwords do not match.';
      if (phone && !/^[0-9+\s-]{7,20}$/.test(phone.trim())) return 'Please enter a valid phone number.';
      return '';
    }
    if (!email.trim() || !password) return 'Please enter both your email address and password.';
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMsg('');

    const problem = validate();
    if (problem) {
      setErrorMsg(problem);
      return;
    }

    // Self-service password reset is not implemented on this deployment. We say
    // so plainly rather than showing a fake "reset link sent" confirmation.
    if (mode === 'forgot') {
      setErrorMsg('');
      return;
    }

    setIsSubmitting(true);
    try {
      const user =
        mode === 'register'
          ? await register({
              name: fullName.trim(),
              email: email.trim().toLowerCase(),
              phone: phone.trim() || null,
              password
            })
          : await login({ email: email.trim().toLowerCase(), password });

      // The role is whatever the server issued. It is never inferred from the
      // email address — the old check promoted anyone whose address contained
      // "admin" straight into the admin dashboard.
      onSuccess?.(user);
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const heading =
    mode === 'forgot' ? 'Reset your password' : mode === 'register' ? 'Join HotPot Delights' : 'Welcome back';
  const subheading =
    mode === 'forgot'
      ? 'Password recovery is handled by our support team'
      : mode === 'register'
        ? 'Create an account for fast gourmet delivery in Kigali'
        : 'Sign in to track your orders';

  return (
    <div
      className="fixed inset-0 z-1200 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={close}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md bg-[#16161a] border border-white/10 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-0 w-48 h-48 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative px-6 pt-6 pb-4 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-linear-to-tr from-primary to-orange-500 flex items-center justify-center text-white shadow-lg shadow-primary/30 ring-2 ring-primary/20">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <h2 id={titleId} className="text-lg font-black text-white tracking-tight">
                {heading}
              </h2>
              <p className="text-xs text-text-muted">{subheading}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-text-muted hover:text-white flex items-center justify-center transition-colors"
            aria-label="Close sign-in dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto space-y-4 flex-1">
          {/* A real tablist. It used to be two plain buttons, so the mode toggle
              and the submit button both announced as "Sign in" / "Create
              account" — two controls, one name, and no way to tell them apart
              with a screen reader. */}
          {mode !== 'forgot' && (
            <div
              role="tablist"
              aria-label="Sign in or create an account"
              className="grid grid-cols-2 p-1 bg-black/40 border border-white/10 rounded-2xl"
            >
              <button
                type="button"
                role="tab"
                id="auth-tab-signin"
                aria-selected={mode === 'signin'}
                aria-controls="auth-panel"
                onClick={() => {
                  setMode('signin');
                  setErrorMsg('');
                }}
                className={`py-2 rounded-xl text-xs font-extrabold transition-all text-center flex items-center justify-center gap-1.5 ${
                  mode === 'signin'
                    ? 'bg-linear-to-r from-primary to-orange-600 text-white shadow-md shadow-primary/20'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" /> Sign In
              </button>
              <button
                type="button"
                role="tab"
                id="auth-tab-register"
                aria-selected={mode === 'register'}
                aria-controls="auth-panel"
                onClick={() => {
                  setMode('register');
                  setErrorMsg('');
                }}
                className={`py-2 rounded-xl text-xs font-extrabold transition-all text-center flex items-center justify-center gap-1.5 ${
                  mode === 'register'
                    ? 'bg-linear-to-r from-primary to-orange-600 text-white shadow-md shadow-primary/20'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" /> Create Account
              </button>
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="p-3 bg-red-950/80 border border-red-500/40 rounded-2xl text-xs font-semibold text-red-200 flex items-start gap-2.5 animate-fade-in"
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          {GOOGLE_CLIENT_ID && mode !== 'forgot' && (
            <div className="space-y-2">
              <div ref={googleButtonHost} className="flex justify-center min-h-[44px]" />
              {googleReady && (
                <>
                  <div className="flex items-center gap-3 text-[11px] text-text-subdued">
                    <span className="h-px flex-1 bg-white/10" />
                    or
                    <span className="h-px flex-1 bg-white/10" />
                  </div>
                </>
              )}
            </div>
          )}

          {mode === 'forgot' ? (
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label htmlFor="auth-email" className={labelClass}>
                  Registered email address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    id="auth-email"
                    ref={emailRef}
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.com"
                    className={fieldClass}
                  />
                </div>
              </div>

              <p className="text-xs text-text-muted bg-white/5 border border-white/10 rounded-xl p-3 leading-relaxed">
                <KeyRound className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                Self-service password reset is not available on this deployment. Email{' '}
                <a className="text-primary font-semibold" href="mailto:hello@hotpotdelights.rw">
                  hello@hotpotdelights.rw
                </a>{' '}
                or call <span className="font-semibold">+250 788 000 001</span> and we will help you
                get back in.
              </p>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMsg('');
                  }}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  Back to sign in
                </button>
              </div>
            </form>
          ) : (
            <form
              id="auth-panel"
              role="tabpanel"
              aria-labelledby={mode === 'register' ? 'auth-tab-register' : 'auth-tab-signin'}
              onSubmit={handleSubmit}
              className="space-y-3.5"
              noValidate
            >
              {mode === 'register' && (
                <>
                  <div className="space-y-1.5">
                    <label htmlFor="auth-name" className={labelClass}>
                      Full name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        id="auth-name"
                        type="text"
                        autoComplete="name"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        placeholder="e.g. Marie Claire Uwase"
                        className={fieldClass}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="auth-phone" className={labelClass}>
                      Phone number (optional)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        id="auth-phone"
                        type="tel"
                        autoComplete="tel"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="0788 123 456"
                        className={fieldClass}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <label htmlFor="auth-email" className={labelClass}>
                  Email address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    id="auth-email"
                    ref={emailRef}
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.com"
                    className={fieldClass}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="auth-password" className={labelClass}>
                    Password
                    {mode === 'register' && <span className="normal-case tracking-normal"> (min. {MIN_PASSWORD} characters)</span>}
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setErrorMsg('');
                      }}
                      className="text-xs text-amber-400 hover:text-amber-300 font-semibold transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    className={toggleFieldClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {mode === 'register' && (
                <div className="space-y-1.5">
                  <label htmlFor="auth-confirm" className={labelClass}>
                    Confirm password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      id="auth-confirm"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="••••••••"
                      aria-invalid={Boolean(confirmPassword) && confirmPassword !== password}
                      className={toggleFieldClass}
                    />
                  </div>
                  {confirmPassword && confirmPassword !== password && (
                    <p className="text-xs text-red-400 font-semibold mt-1">The two passwords do not match.</p>
                  )}
                </div>
              )}

              <button type="submit" disabled={isSubmitting} className={`${primaryButton} mt-2`}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {mode === 'register' ? 'Creating your account…' : 'Signing you in…'}
                  </span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>{mode === 'register' ? 'Create account' : 'Sign in'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {mode !== 'forgot' && (
            <div className="text-center text-xs text-text-muted pt-2 border-t border-white/5">
              {mode === 'register' ? (
                <p>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setErrorMsg('');
                    }}
                    className="text-primary font-bold hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              ) : (
                <p>
                  New here?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setErrorMsg('');
                    }}
                    className="text-primary font-bold hover:underline"
                  >
                    Create an account
                  </button>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
