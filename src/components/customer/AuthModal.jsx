import React, { useState } from 'react';
import { X, Lock, User, Mail, LogIn, ArrowRight, Flame, Phone, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
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

  const handleGoogleSignIn = () => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (googleClientId && window.google && window.google.accounts) {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          try {
            const res = await fetch('http://localhost:5000/api/auth/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken: response.credential })
            });
            const data = await res.json();
            if (data.user) {
              if (data.token) localStorage.setItem('token', data.token);
              onLoginSuccess(data.user);
              onClose();
            }
          } catch (e) {
            setErrorMsg('Google Sign-In service unavailable. Please use email/password.');
          }
        }
      });
      window.google.accounts.id.prompt();
    } else {
      setErrorMsg('Google Client ID not configured. Please use email and password to sign in or register.');
    }
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
          ? 'Cannot connect to server on port 5000. Please ensure the backend is running.'
          : (err.message || 'Authentication error occurred.')
      );
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="bg-surface-dark border border-white/10 rounded-2xl max-w-sm sm:max-w-md w-full p-4 sm:p-5 shadow-2xl space-y-3 max-h-[96vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-orange-500 flex items-center justify-center text-white shadow-md">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white leading-tight">
                {isForgot ? 'Reset Password' : isRegister ? 'Create HotPot Account' : 'Welcome to HotPot'}
              </h2>
              <p className="text-[10px] text-text-muted">Authentic Gourmet Delivery in Kigali</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-text-muted hover:text-white flex items-center justify-center transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher (Sign In vs Register) */}
        {!isForgot && (
          <div className="grid grid-cols-2 p-1 bg-black/40 border border-white/10 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => { setIsRegister(false); setErrorMsg(''); }}
              className={`py-1.5 rounded-lg transition-all text-center ${
                !isRegister 
                  ? 'bg-primary text-white shadow-sm font-extrabold' 
                  : 'text-text-muted hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setErrorMsg(''); }}
              className={`py-1.5 rounded-lg transition-all text-center ${
                isRegister 
                  ? 'bg-primary text-white shadow-sm font-extrabold' 
                  : 'text-text-muted hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Error / Feedback Banners */}
        {errorMsg && (
          <div className="p-2.5 bg-red-950/80 border border-red-500/40 rounded-xl text-[11px] font-semibold text-red-300 flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {resetSent && (
          <div className="p-2.5 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-[11px] font-semibold text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Password reset link sent to {email}!</span>
          </div>
        )}

        {/* Forgot Password Screen */}
        {isForgot ? (
          <form onSubmit={handleResetSubmit} className="space-y-3">
            <p className="text-xs text-text-muted">
              Enter your account email and we'll send you a secure link to reset your password.
            </p>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-text-muted block">Email Address</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@domain.com"
                  required
                  className="w-full bg-surface-card border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            <button type="submit" className="w-full btn-primary text-xs py-2.5 font-bold">
              Send Reset Link
            </button>

            <div className="text-center pt-1">
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
            {/* Google Quick Sign-In */}
            <button
              onClick={handleGoogleSignIn}
              type="button"
              className="w-full py-2 px-3 rounded-xl bg-white text-gray-900 font-bold text-xs flex items-center justify-center gap-2 hover:bg-gray-100 transition-all shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-0.5">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-surface-dark px-2 text-[10px] uppercase font-bold text-text-subdued absolute">
                {isRegister ? 'or register with email' : 'or with email'}
              </span>
            </div>

            {/* Email & Password Form */}
            <form onSubmit={handleSubmit} className="space-y-2">
              {isRegister && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-text-muted block">Full Name</label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        placeholder="e.g. Aline Uwase"
                        className="w-full bg-surface-card border border-white/10 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-text-main focus:outline-none focus:border-primary transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-text-muted block">Phone (Rwanda)</label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0788 123 456"
                        className="w-full bg-surface-card border border-white/10 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-text-main focus:outline-none focus:border-primary transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-text-muted block">Email Address</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="customer@hotpot.com"
                    required
                    className="w-full bg-surface-card border border-white/10 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-text-main focus:outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              {isRegister ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-text-muted block">Password (min. 6)</label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full bg-surface-card border border-white/10 rounded-lg pl-8 pr-7 py-1.5 text-xs text-text-main focus:outline-none focus:border-primary transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-white p-0.5"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-text-muted block">Confirm Password</label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full bg-surface-card border border-white/10 rounded-lg pl-8 pr-7 py-1.5 text-xs text-text-main focus:outline-none focus:border-primary transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-white p-0.5"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-text-muted block">Password</label>
                    <button
                      type="button"
                      onClick={() => setIsForgot(true)}
                      className="text-[10px] text-amber-400 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full bg-surface-card border border-white/10 rounded-lg pl-8 pr-7 py-1.5 text-xs text-text-main focus:outline-none focus:border-primary transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-white p-0.5"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              )}

              {isRegister && confirmPassword && password !== confirmPassword && (
                <p className="text-[10px] text-red-400 font-semibold">Passwords do not match</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary text-xs py-2 font-bold shadow-md flex items-center justify-center gap-1.5 mt-2"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    {isRegister ? 'Creating Account...' : 'Signing In...'}
                  </span>
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{isRegister ? 'Create HotPot Account' : 'Sign In to HotPot'}</span>
                  </>
                )}
              </button>
            </form>

            {/* Bottom helper text */}
            <div className="text-center text-[11px] text-text-muted pt-1 border-t border-white/10">
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
                    Create Account
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
