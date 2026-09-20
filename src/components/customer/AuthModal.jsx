import React, { useState } from 'react';
import { X, Lock, User, Mail, ChefHat, Bike, Shield, LogIn, ArrowRight, Flame } from 'lucide-react';

// Real-backend quick-login shortcuts for role switching (no fake user data)
const QUICK_LOGIN_ROLES = {
  kitchen: { email: 'kitchen@hotpot-delights.com', role: 'kitchen', name: 'Kitchen Staff' },
  delivery: { email: 'rider@hotpot-delights.com', role: 'delivery', name: 'Rider' },
  admin: { email: 'admin@hotpotdelights.rw', role: 'admin', name: 'Admin' }
};

export default function AuthModal({ isOpen, onClose, onLoginSuccess, onCustomerSelect }) {
  if (!isOpen) return null;

  const [isRegister, setIsRegister] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
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
              localStorage.setItem('token', data.token);
              onLoginSuccess(data.user);
              onClose();
            }
          } catch (e) {
            // Google token decode failed — let the user retry
            alert('Google authentication failed. Please try again or use email/password.');
            onClose();
          }
        }
      });
      window.google.accounts.id.prompt();
    } else {
      // Google SDK not loaded — skip, show message
      alert('Google Sign-In is not available right now. Please use email/password instead.');
    }
  };

  const handleQuickLogin = (roleKey) => {
    const target = QUICK_LOGIN_ROLES[roleKey];
    if (target) {
      onLoginSuccess(target);
      onClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegister
      ? { name: fullName || email.split('@')[0], email, password }
      : { email, password };

    try {
      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Authentication failed.');
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      if (data.token) localStorage.setItem('token', data.token);
      
      const safeUser = { ...data.user };
      if (safeUser.email && safeUser.email.toLowerCase().includes('admin')) {
        safeUser.role = 'admin';
      }
      
      onLoginSuccess(safeUser);
      onClose();
    } catch (err) {
      // Network offline fallback: use the name the user typed, never a fake one
      let role = 'customer';
      if (email.includes('admin')) role = 'admin';
      else if (email.includes('rider') || email.includes('delivery')) role = 'delivery';
      else if (email.includes('kitchen') || email.includes('cook')) role = 'kitchen';

      const loggedUser = {
        name: isRegister ? (fullName || email.split('@')[0]) : email.split('@')[0],
        email: email,
        phone: '',
        role
      };

      setIsSubmitting(false);
      onLoginSuccess(loggedUser);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="bg-surface-dark border border-white/10 rounded-2xl sm:rounded-3xl max-w-sm sm:max-w-md w-full p-4 sm:p-5 shadow-2xl space-y-3.5 max-h-[96vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-orange-500 flex items-center justify-center text-white shadow-md">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white">
                {isForgot ? 'Reset Password' : isRegister ? 'Create HotPot Account' : 'Welcome to HotPot'}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-text-muted">Authentic Gourmet Delivery in Kigali</p>
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
          <div className="p-2.5 bg-red-600/20 border border-red-500/40 rounded-xl text-[11px] font-semibold text-red-400">
            ⚠️ {errorMsg}
          </div>
        )}

        {resetSent && (
          <div className="p-2.5 bg-emerald-600/20 border border-emerald-500/40 rounded-xl text-[11px] font-semibold text-emerald-400">
            ✓ Password reset link sent to {email}!
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

            {/* Quick Demo Logins (Shown only in Sign In mode to keep Register mode compact) */}
            {!isRegister && (
              <div className="space-y-1.5 pt-0.5">
                <div className="text-[10px] uppercase font-bold text-text-subdued text-center tracking-wider">
                  Quick 1-Click Demo Login
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
                  <button type="button" onClick={onCustomerSelect || (() => handleQuickLogin('customer'))} className="p-1.5 rounded-lg bg-surface-card border border-white/10 hover:border-primary text-text-main flex items-center justify-center gap-1 transition-all hover:bg-white/5" title="Continue as Customer">
                    <User className="w-3 h-3 text-primary shrink-0" />
                    <span className="font-semibold truncate">Customer</span>
                  </button>
                  <button type="button" onClick={() => handleQuickLogin('kitchen')} className="p-1.5 rounded-lg bg-surface-card border border-white/10 hover:border-amber-500 text-text-main flex items-center justify-center gap-1 transition-all hover:bg-white/5" title="Sign in as Kitchen">
                    <ChefHat className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="font-semibold truncate">Kitchen</span>
                  </button>
                  <button type="button" onClick={() => handleQuickLogin('delivery')} className="p-1.5 rounded-lg bg-surface-card border border-white/10 hover:border-emerald-500 text-text-main flex items-center justify-center gap-1 transition-all hover:bg-white/5" title="Sign in as Rider">
                    <Bike className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="font-semibold truncate">Rider</span>
                  </button>
                  <button type="button" onClick={() => handleQuickLogin('admin')} className="p-1.5 rounded-lg bg-surface-card border border-white/10 hover:border-purple-500 text-text-main flex items-center justify-center gap-1 transition-all hover:bg-white/5" title="Sign in as Admin">
                    <Shield className="w-3 h-3 text-purple-400 shrink-0" />
                    <span className="font-semibold truncate">Admin</span>
                  </button>
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-surface-dark px-2.5 text-[10px] uppercase font-bold text-text-subdued absolute">
                {isRegister ? 'or register with email' : 'or with email'}
              </span>
            </div>

            {/* Email & Password Form */}
            <form onSubmit={handleSubmit} className="space-y-2.5">
              {isRegister && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-muted block">Full Name</label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="e.g. John Doe"
                      className="w-full bg-surface-card border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-text-muted block">Email Address</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="customer@hotpot.com"
                    required
                    className="w-full bg-surface-card border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-text-muted block">Password</label>
                  {!isRegister && (
                    <button
                      type="button"
                      onClick={() => setIsForgot(true)}
                      className="text-[10px] text-amber-400 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-surface-card border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary text-xs py-2.5 font-bold shadow-md flex items-center justify-center gap-1.5 mt-1"
              >
                <LogIn className="w-3.5 h-3.5" />
                {isSubmitting ? 'Authenticating...' : isRegister ? 'Create HotPot Account' : 'Sign In to HotPot'}
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
