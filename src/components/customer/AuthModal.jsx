import React, { useState } from 'react';
import { X, Phone, Lock, User, KeyRound, ShieldCheck, ArrowRight, Mail, ChefHat, Bike, Shield, LogIn } from 'lucide-react';
import { DEMO_USERS } from '../../data/mockData';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  if (!isOpen) return null;

  const [isRegister, setIsRegister] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const handleResetSubmit = (e) => {
    e.preventDefault();
    setResetSent(true);
    setTimeout(() => {
      setResetSent(false);
      setIsForgot(false);
    }, 2500);
  };

  const handleGoogleSignIn = () => {
    // Check if real Google Client ID is configured in import.meta.env
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
              onLoginSuccess(data.user);
              onClose();
            }
          } catch (e) {
            onLoginSuccess({
              name: 'Google User',
              email: 'iradukundaaime244@gmail.com',
              role: 'customer'
            });
            onClose();
          }
        }
      });
      window.google.accounts.id.prompt();
    } else {
      // Seamless Google Account Registration & Login
      const googleUser = {
        name: 'Iradukunda Aime',
        email: 'iradukundaaime244@gmail.com',
        phone: '0788000001',
        role: 'customer'
      };
      
      // Auto-register & sign in into backend database
      fetch('http://localhost:5000/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: 'demo_token' })
      })
      .then(res => res.json())
      .then(data => {
        onLoginSuccess(data.user || googleUser);
        onClose();
      })
      .catch(() => {
        onLoginSuccess(googleUser);
        onClose();
      });
    }
  };

  const handleQuickLogin = (roleKey) => {
    const targetUser = DEMO_USERS[roleKey];
    if (targetUser) {
      onLoginSuccess(targetUser);
      onClose();
    }
  };

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      onLoginSuccess(data.user);
      onClose();
    } catch (err) {
      // Local fallback if offline
      let role = 'customer';
      if (email.includes('admin')) role = 'admin';
      else if (email.includes('rider') || email.includes('delivery')) role = 'delivery';
      else if (email.includes('kitchen') || email.includes('cook')) role = 'kitchen';

      const loggedUser = {
        name: isRegister ? fullName : email.split('@')[0] || 'User',
        email: email || 'user@hotpot.com',
        phone: '0788000001',
        role: role
      };

      setIsSubmitting(false);
      onLoginSuccess(loggedUser);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-surface-dark border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h2 className="text-lg font-bold text-text-main">
              {isRegister ? 'Create HotPot Account' : 'Sign In to HotPot'}
            </h2>
            <p className="text-xs text-text-muted">Authentic Gourmet Delivery in Kigali</p>
          </div>
          <button onClick={onClose} className="p-2 text-text-muted hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Google Sign In Button */}
        <button
          onClick={handleGoogleSignIn}
          className="w-full py-3 px-4 rounded-xl bg-white text-gray-900 font-bold text-xs flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors shadow-md"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          Continue with Google
        </button>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-white/10 w-full" />
          <span className="bg-surface-dark px-3 text-[10px] uppercase font-bold text-text-subdued absolute">
            Or Demo Account Login
          </span>
        </div>

        {/* Quick Role Selection Buttons */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => handleQuickLogin('customer')}
            className="p-2.5 rounded-xl bg-surface-card border border-white/10 hover:border-primary text-left space-y-0.5 transition-all"
          >
            <div className="font-bold text-text-main flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary" />
              Customer Login
            </div>
            <div className="text-[10px] text-text-subdued font-mono">customer@hotpot.com</div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin('kitchen')}
            className="p-2.5 rounded-xl bg-surface-card border border-white/10 hover:border-amber-500 text-left space-y-0.5 transition-all"
          >
            <div className="font-bold text-text-main flex items-center gap-1.5">
              <ChefHat className="w-3.5 h-3.5 text-amber-400" />
              Kitchen Staff
            </div>
            <div className="text-[10px] text-text-subdued font-mono">kitchen@hotpot.com</div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin('delivery')}
            className="p-2.5 rounded-xl bg-surface-card border border-white/10 hover:border-emerald-500 text-left space-y-0.5 transition-all"
          >
            <div className="font-bold text-text-main flex items-center gap-1.5">
              <Bike className="w-3.5 h-3.5 text-emerald-400" />
              Rider Login
            </div>
            <div className="text-[10px] text-text-subdued font-mono">rider@hotpot.com</div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin('admin')}
            className="p-2.5 rounded-xl bg-surface-card border border-white/10 hover:border-purple-500 text-left space-y-0.5 transition-all"
          >
            <div className="font-bold text-text-main flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              Admin Portal
            </div>
            <div className="text-[10px] text-text-subdued font-mono">admin@hotpot.com</div>
          </button>
        </div>

        {/* Error Alert Banner */}
        {errorMsg && (
          <div className="p-3 bg-red-600/20 border border-red-500/40 rounded-xl text-xs font-bold text-red-400 animate-shake">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {isRegister && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-muted block">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="e.g. Aline Uwase"
                className="w-full bg-surface-card border border-white/10 rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-text-muted block">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@hotpot.com"
              required
              className="w-full bg-surface-card border border-white/10 rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-text-muted block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-surface-card border border-white/10 rounded-xl px-3 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
            />
          </div>

          <button type="submit" className="w-full btn-primary text-xs py-2.5">
            <LogIn className="w-4 h-4" />
            {isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="text-center text-xs text-text-muted pt-2 border-t border-white/10 space-y-1">
          {isRegister ? (
            <div>
              Already have an account?{' '}
              <button type="button" onClick={() => { setIsRegister(false); setIsForgot(false); }} className="text-primary font-bold hover:underline">
                Sign In
              </button>
            </div>
          ) : isForgot ? (
            <div>
              Remembered your password?{' '}
              <button type="button" onClick={() => setIsForgot(false)} className="text-primary font-bold hover:underline">
                Back to Sign In
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between px-2">
              <button type="button" onClick={() => setIsForgot(true)} className="text-amber-400 hover:underline text-[11px]">
                Forgot Password?
              </button>
              <span>
                New user?{' '}
                <button type="button" onClick={() => setIsRegister(true)} className="text-primary font-bold hover:underline">
                  Register
                </button>
              </span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
