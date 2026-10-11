import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  X, Lock, User, Mail, LogIn, ArrowRight, Flame, Phone,
  Eye, EyeOff, AlertCircle, Sparkles, KeyRound, ChevronLeft,
  Zap, ShieldCheck, Star,
} from 'lucide-react';
import { login, register, loginWithGoogle } from '../../services/apiService';
import QuickLoginHelper from '../auth/QuickLoginHelper';

/* â”€â”€ Constants â”€â”€ */
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const MIN_PASSWORD = 8;

/* â”€â”€ Style tokens â”€â”€ */
const fieldClass =
  'w-full bg-white/70 dark:bg-black/30 border border-slate-200 dark:border-white/10 ' +
  'rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white ' +
  'placeholder-slate-400 dark:placeholder-white/30 ' +
  'focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 ' +
  'transition-all duration-200 backdrop-blur-sm';
const toggleFieldClass = `${fieldClass} pr-10`;
const labelClass = 'text-[11px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest block mb-1';

/* â”€â”€ Shimmer primary button â”€â”€ */
function PrimaryBtn({ children, disabled, ...rest }) {
  return (
    <button
      {...rest}
      disabled={disabled}
      className={
        'relative w-full overflow-hidden group ' +
        'bg-gradient-to-r from-orange-600 via-red-500 to-orange-500 ' +
        'hover:from-orange-500 hover:via-red-400 hover:to-orange-400 ' +
        'text-white text-sm py-3 font-black rounded-xl ' +
        'shadow-lg shadow-orange-600/30 hover:shadow-orange-600/50 ' +
        'transition-all duration-200 active:scale-[0.98] ' +
        'flex items-center justify-center gap-2 cursor-pointer ' +
        'disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none'
      }
    >
      <span
        aria-hidden="true"
        className={
          'pointer-events-none absolute inset-0 -translate-x-full ' +
          'bg-gradient-to-r from-transparent via-white/20 to-transparent ' +
          'group-hover:translate-x-full transition-transform duration-700'
        }
      />
      {children}
    </button>
  );
}

/* â”€â”€ Hero panel (left side) â”€â”€ */
function HeroPanel() {
  const perks = [
    { icon: Zap,         label: 'Lightning-fast delivery across Kigali' },
    { icon: Star,        label: 'Curated gourmet meals, freshly prepared' },
    { icon: ShieldCheck, label: 'Secure orders & real-time tracking' },
  ];
  return (
    <div className="hidden md:flex flex-col relative w-[45%] min-h-full overflow-hidden bg-gradient-to-br from-[#1a0900] via-[#2d1100] to-[#0f0500]">
      {/* Ambient blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-orange-600/20 blur-[80px] animate-soft-glow" />
        <div className="absolute bottom-0 -left-16 w-64 h-64 rounded-full bg-red-700/15 blur-[70px] animate-soft-glow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full border border-orange-500/10 auth-ping-slow" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-orange-500/5 auth-ping-slow" style={{ animationDelay: '1s' }} />
      </div>
      {/* Speed-line stripes */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{ backgroundImage: 'repeating-linear-gradient(-30deg,#FF6B00 0,#FF6B00 1px,transparent 0,transparent 50%)', backgroundSize: '32px 32px' }} />
      {/* Brand mark */}
      <div className="relative z-10 px-8 pt-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 to-red-500 flex items-center justify-center shadow-xl ring-2 ring-orange-400/30" style={{ filter: 'drop-shadow(0 0 10px rgba(255,87,34,0.5))' }}>
          <Flame className="w-5 h-5 text-white" />
        </div>
        <span className="text-white font-black text-lg tracking-tight">HotPot <span className="text-orange-400">Delights</span></span>
      </div>
      {/* Scooter illustration */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-6">
        <img
          src="/assets/delivery_rider_hotpot.png"
          alt="HotPot delivery scooter"
          className="w-full max-w-[300px] object-contain drop-shadow-[0_20px_40px_rgba(255,87,34,0.3)]"
          style={{ animation: 'authScooterEntrance 0.9s cubic-bezier(0.22,1,0.36,1) forwards, authScooterFloat 3.5s ease-in-out infinite 0.9s' }}
        />
      </div>
      {/* Perk list */}
      <div className="relative z-10 px-8 pb-8 space-y-3">
        {perks.map(({ icon: Icon, label }, i) => (
          <div key={label} className="flex items-center gap-3" style={{ animation: `authFadeUp 0.5s ease-out ${0.2 + i * 0.1}s both` }}>
            <div className="w-7 h-7 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0">
              <Icon className="w-3.5 h-3.5 text-orange-400" />
            </div>
            <span className="text-sm text-white/70 font-medium leading-snug">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* â”€â”€ Main component â”€â”€ */
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

  // Google Identity Services. Only initialised when a client id is configured â€”
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
      // email address â€” the old check promoted anyone whose address contained
      // "admin" straight into the admin dashboard.
      onSuccess?.(user);
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInstantLogin = async (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const user = await login({ email: demoEmail.trim().toLowerCase(), password: demoPass });
      onSuccess?.(user);
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const heading =
    mode === 'forgot' ? 'Reset your password'
    : mode === 'register' ? 'Create your account'
    : 'Welcome back';
  const subheading =
    mode === 'forgot' ? 'Our support team will help you recover access'
    : mode === 'register' ? 'Join HotPot Delights â€” fast gourmet delivery in Kigali'
    : 'Sign in to track and manage your orders';

  return (
    <>
      {/* Keyframe animations */}
      <style>{`
        @keyframes authScooterEntrance {
          from { opacity: 0; transform: translateX(-60px) scale(0.92); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes authScooterFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%       { transform: translateY(-8px) rotate(-1deg); }
        }
        @keyframes authFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes authFormIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .auth-form-panel { animation: authFormIn 0.45s cubic-bezier(0.22,1,0.36,1) both; }
        .auth-stagger > *:nth-child(1) { animation: authFadeUp 0.4s ease-out 0.08s both; }
        .auth-stagger > *:nth-child(2) { animation: authFadeUp 0.4s ease-out 0.16s both; }
        .auth-stagger > *:nth-child(3) { animation: authFadeUp 0.4s ease-out 0.24s both; }
        .auth-stagger > *:nth-child(4) { animation: authFadeUp 0.4s ease-out 0.32s both; }
        .auth-stagger > *:nth-child(5) { animation: authFadeUp 0.4s ease-out 0.40s both; }
        .auth-stagger > *:nth-child(6) { animation: authFadeUp 0.4s ease-out 0.48s both; }
        .logo-flame-btn { transition: transform 0.25s ease, filter 0.25s ease; }
        .logo-flame-btn:hover, .logo-flame-btn:focus {
          transform: scale(1.08);
          filter: drop-shadow(0 0 14px rgba(255,87,34,0.55));
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
        onClick={close}
      >
        {/* Dialog shell */}
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="relative flex w-full max-w-3xl max-h-[94vh] rounded-3xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.7)] ring-1 ring-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* LEFT: Hero panel */}
          <HeroPanel />

          {/* RIGHT: Form panel */}
          <div className="flex flex-col flex-1 bg-white dark:bg-[#13101a] overflow-y-auto">
            {/* Close button */}
            <div className="flex justify-end px-5 pt-5 shrink-0">
              <button
                type="button"
                onClick={close}
                aria-label="Close sign-in dialog"
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/[0.08] hover:bg-slate-200 dark:hover:bg-white/[0.15] text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form body â€” key=mode so it re-mounts with entrance animation on tab switch */}
            <div key={mode} className="auth-form-panel auth-stagger px-6 pb-8 pt-1 flex flex-col gap-4 flex-1">

              {/* Logo + heading */}
              <div className="flex items-center gap-3">
                <div className="logo-flame-btn w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-600 to-red-500 flex items-center justify-center text-white shadow-lg ring-2 ring-orange-500/20">
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <h2 id={titleId} className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                    {heading}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-white/40 leading-snug mt-0.5">{subheading}</p>
                </div>
              </div>

              {/* Mode tabs */}
              {mode !== 'forgot' && (
                <div
                  role="tablist"
                  aria-label="Sign in or create an account"
                  className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/[0.08] rounded-2xl"
                >
                  {[
                    { id: 'signin',   icon: LogIn,    label: 'Sign In' },
                    { id: 'register', icon: Sparkles, label: 'Register' },
                  ].map(({ id, icon: Icon, label }) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      id={`auth-tab-${id}`}
                      aria-selected={mode === id}
                      aria-controls="auth-panel"
                      onClick={() => { setMode(id); setErrorMsg(''); }}
                      className={`py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                        mode === id
                          ? 'bg-gradient-to-r from-orange-600 to-red-500 text-white shadow-md shadow-orange-600/25'
                          : 'text-slate-500 dark:text-white/40 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />{label}
                    </button>
                  ))}
                </div>
              )}

              {/* Error banner */}
              {errorMsg && (
                <div role="alert" className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-500/30 rounded-2xl text-xs font-semibold text-red-600 dark:text-red-300 flex items-start gap-2.5 animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Google SSO */}
              {GOOGLE_CLIENT_ID && mode !== 'forgot' && (
                <div className="space-y-3">
                  <div ref={googleButtonHost} className="flex justify-center min-h-11" />
                  {googleReady && (
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-white/30">
                      <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                      or continue with email
                      <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                    </div>
                  )}
                </div>
              )}

              {/* Forgot password */}
              {mode === 'forgot' ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="auth-forgot-email" className={labelClass}>Registered email address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30" />
                      <input id="auth-forgot-email" ref={emailRef} type="email" autoComplete="email"
                        value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com" className={fieldClass} />
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-white/50 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 leading-relaxed">
                    <KeyRound className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5 text-orange-500" />
                    Self-service reset is not available here. Email{' '}
                    <a className="text-orange-500 font-semibold hover:underline" href="mailto:hello@hotpotdelights.rw">hello@hotpotdelights.rw</a>
                    {' '}or call <span className="font-semibold">+250 788 000 001</span>.
                  </p>
                  <button type="button" onClick={() => { setMode('signin'); setErrorMsg(''); }}
                    className="flex items-center gap-1 text-xs text-orange-500 font-bold hover:underline">
                    <ChevronLeft className="w-3.5 h-3.5" /> Back to sign in
                  </button>
                </form>

              ) : (
                /* Sign-in / Register form */
                <form id="auth-panel" role="tabpanel"
                  aria-labelledby={mode === 'register' ? 'auth-tab-register' : 'auth-tab-signin'}
                  onSubmit={handleSubmit} className="space-y-3.5" noValidate>

                  {mode === 'register' && (
                    <>
                      <div>
                        <label htmlFor="auth-name" className={labelClass}>Full name</label>
                        <div className="relative">
                          <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30" />
                          <input id="auth-name" type="text" autoComplete="name" value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="e.g. Marie Claire Uwase" className={fieldClass} />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="auth-phone" className={labelClass}>
                          Phone number <span className="normal-case tracking-normal opacity-60">(optional)</span>
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30" />
                          <input id="auth-phone" type="tel" autoComplete="tel" value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="0788 123 456" className={fieldClass} />
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <label htmlFor="auth-email" className={labelClass}>Email address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30" />
                      <input id="auth-email" ref={emailRef} type="email" autoComplete="email" value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com" className={fieldClass} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="auth-password" className={`${labelClass} mb-0`}>
                        Password
                        {mode === 'register' && <span className="normal-case tracking-normal opacity-60"> (min. {MIN_PASSWORD})</span>}
                      </label>
                      {mode === 'signin' && (
                        <button type="button" onClick={() => { setMode('forgot'); setErrorMsg(''); }}
                          className="text-[11px] text-orange-500 hover:text-orange-400 font-bold transition-colors">
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30" />
                      <input id="auth-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                        value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" className={toggleFieldClass} />
                      <button type="button" onClick={() => setShowPassword((p) => !p)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30 hover:text-slate-700 dark:hover:text-white/70 p-1 transition-colors">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {mode === 'register' && (
                    <div>
                      <label htmlFor="auth-confirm" className={labelClass}>Confirm password</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30" />
                        <input id="auth-confirm"
                          type={showPassword ? 'text' : 'password'} autoComplete="new-password"
                          value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                          aria-invalid={Boolean(confirmPassword) && confirmPassword !== password}
                          className={toggleFieldClass} />
                      </div>
                      {confirmPassword && confirmPassword !== password && (
                        <p className="text-xs text-red-500 font-semibold mt-1">Passwords don&apos;t match.</p>
                      )}
                    </div>
                  )}

                  <PrimaryBtn type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {mode === 'register' ? 'Creating your accountâ€¦' : 'Signing you inâ€¦'}
                      </span>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>{mode === 'register' ? 'Create account' : 'Sign in'}</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </PrimaryBtn>

                  {mode === 'signin' && (
                    <QuickLoginHelper
                      disabled={isSubmitting}
                      onSelect={(demoEmail, demoPass) => { setEmail(demoEmail); setPassword(demoPass); }}
                      onInstantLogin={handleInstantLogin}
                    />
                  )}

                  <div className="text-center text-xs text-slate-500 dark:text-white/40 pt-1 border-t border-slate-100 dark:border-white/5">
                    {mode === 'register' ? (
                      <p>Already have an account?{' '}
                        <button type="button" onClick={() => { setMode('signin'); setErrorMsg(''); }}
                          className="text-orange-500 font-bold hover:underline">Sign in</button>
                      </p>
                    ) : (
                      <p>New here?{' '}
                        <button type="button" onClick={() => { setMode('register'); setErrorMsg(''); }}
                          className="text-orange-500 font-bold hover:underline">Create an account</button>
                      </p>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

