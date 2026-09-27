import React, { useState } from 'react';
import { X, Lock, User, Mail, LogIn, ArrowRight, Flame, Phone, Eye, EyeOff, CheckCircle2, AlertCircle, Sparkles, ShieldCheck } from 'lucide-react';
import { apiService } from '../../services/apiService';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  if (!isOpen) return null;

  const [isRegister, setIsRegister] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);


  const handleResetSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    setErrorMsg('');
    setResetSent(true);
    setTimeout(() => {
      setResetSent(false);
      setIsForgot(false);
    }, 2500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Client-side validations
    if (isRegister) {
      if (!fullName.trim() || fullName.trim().length < 2) {
        setErrorMsg('Please enter your full name (at least 2 characters).');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setErrorMsg('Please enter a valid email address.');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match. Please re-enter your password.');
        return;
      }
    } else {
      if (!email.trim() || !password) {
        setErrorMsg('Please enter both email and password.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let data;
      if (isRegister) {
        data = await apiService.register({
          name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || null,
          password
        });
      } else {
        data = await apiService.login({
          email: email.trim().toLowerCase(),
          password
        });
      }

      if (data.token) {
        localStorage.setItem('token', data.token);
      }

      const safeUser = { ...data.user };
      const roleStr = (safeUser.role || '').toLowerCase();
      if (roleStr === 'admin' || (safeUser.email && safeUser.email.toLowerCase().includes('admin'))) {
        safeUser.role = 'admin';
      } else {
        safeUser.role = roleStr || 'customer';
      }

      setIsSubmitting(false);
      onLoginSuccess(safeUser);
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      setErrorMsg(
        err.message?.includes('Failed to fetch')
          ? 'Cannot connect to backend server. Please ensure the backend is running.'
          : (err.message || 'Authentication error occurred.')
      );
    }
  };

  return (
    <div className="fixed inset-0 z-1200 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-md bg-[#16161a] border border-white/10 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle decorative glowing background accents */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-0 w-48 h-48 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-linear-to-tr from-primary to-orange-500 flex items-center justify-center text-white shadow-lg shadow-primary/30 ring-2 ring-primary/20">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                {isForgot ? 'Reset Password' : isRegister ? 'Join HotPot Delights' : 'Welcome Back'}
              </h2>
              <p className="text-xs text-text-muted">
                {isForgot 
                  ? 'We will send you a reset link' 
                  : isRegister 
                  ? 'Create your account for Kigali fast gourmet delivery' 
                  : 'Sign in to track orders and order delicious meals'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-text-muted hover:text-white flex items-center justify-center transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="px-6 py-5 overflow-y-auto space-y-4 flex-1">
          {/* Segmented Tab Switcher */}
          {!isForgot && (
            <div className="grid grid-cols-2 p-1 bg-black/40 border border-white/10 rounded-2xl">
              <button
                type="button"
                onClick={() => { setIsRegister(false); setErrorMsg(''); }}
                className={`py-2 rounded-xl text-xs font-extrabold transition-all text-center flex items-center justify-center gap-1.5 ${
                  !isRegister 
                    ? 'bg-linear-to-r from-primary to-orange-600 text-white shadow-md shadow-primary/20' 
                    : 'text-text-muted hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsRegister(true); setErrorMsg(''); }}
                className={`py-2 rounded-xl text-xs font-extrabold transition-all text-center flex items-center justify-center gap-1.5 ${
                  isRegister 
                    ? 'bg-linear-to-r from-primary to-orange-600 text-white shadow-md shadow-primary/20' 
                    : 'text-text-muted hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Create Account
              </button>
            </div>
          )}

          {/* Feedback & Alert Messages */}
          {errorMsg && (
            <div className="p-3 bg-red-950/80 border border-red-500/40 rounded-2xl text-xs font-semibold text-red-200 flex items-start gap-2.5 shadow-sm animate-fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          {resetSent && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-2xl text-xs font-semibold text-emerald-200 flex items-center gap-2.5 shadow-sm animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Password reset link sent to <strong>{email}</strong>!</span>
            </div>
          )}

          {/* Forgot Password Flow */}
          {isForgot ? (
            <form onSubmit={handleResetSubmit} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-text-subdued focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full bg-linear-to-r from-primary to-orange-600 hover:from-primary-hover hover:to-orange-500 text-white text-sm py-3 font-bold rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2"
              >
                Send Reset Link
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsForgot(false)}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  ← Back to Sign In
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Google Sign In Container (when available) */}
              <div id="google-signin-btn-container" className="w-full flex justify-center empty:hidden"></div>

              {/* Main Auth Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {isRegister && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                          placeholder="e.g. Marie Claire Uwase"
                          className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-text-subdued focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">
                        Phone Number (Rwanda)
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="0788 123 456"
                          className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-text-subdued focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-text-subdued focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">
                      {isRegister ? 'Password (min. 6 chars)' : 'Password'}
                    </label>
                    {!isRegister && (
                      <button
                        type="button"
                        onClick={() => setIsForgot(true)}
                        className="text-xs text-amber-400 hover:text-amber-300 font-semibold transition-colors"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-text-subdued focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white p-1"
                      tabIndex={-1}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isRegister && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-text-subdued focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white p-1"
                        tabIndex={-1}
                        aria-label="Toggle confirm password visibility"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-red-400 font-semibold mt-1">Passwords do not match</p>
                    )}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 bg-linear-to-r from-primary to-orange-600 hover:from-primary-hover hover:to-orange-500 text-white font-extrabold text-sm py-3 px-4 rounded-xl shadow-lg shadow-primary/25 transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>{isRegister ? 'Creating your account...' : 'Signing you in...'}</span>
                    </span>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>{isRegister ? 'Create HotPot Account' : 'Sign In to HotPot'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Bottom Switcher */}
              <div className="text-center text-xs text-text-muted pt-2 border-t border-white/5">
                {isRegister ? (
                  <div>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setIsRegister(false); setErrorMsg(''); }}
                      className="text-primary font-bold hover:underline"
                    >
                      Sign In
                    </button>
                  </div>
                ) : (
                  <div>
                    Don't have an account yet?{' '}
                    <button
                      type="button"
                      onClick={() => { setIsRegister(true); setErrorMsg(''); }}
                      className="text-primary font-bold hover:underline"
                    >
                      Create one now
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
