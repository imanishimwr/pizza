import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Flame, Lock, Mail, Eye, EyeOff, LogIn, AlertCircle, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { login, normalizeRole } from '../../services/apiService';
import AuthHeroPanel from '../../components/auth/AuthHeroPanel';

export default function LoginPage({ onLoginSuccess }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const redirectTarget = searchParams.get('redirect') || location.state?.from?.pathname || location.state?.from;
  const safeRedirect =
    redirectTarget &&
    typeof redirectTarget === 'string' &&
    redirectTarget.startsWith('/') &&
    !redirectTarget.startsWith('/login') &&
    !redirectTarget.startsWith('/register')
      ? redirectTarget
      : null;

  const handleLogin = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    setErrorMsg('');

    const targetEmail = email.trim().toLowerCase();
    const targetPassword = password;

    if (!targetEmail || !targetPassword) {
      setErrorMsg('Please enter both email address and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await login({ email: targetEmail, password: targetPassword });
      if (typeof onLoginSuccess === 'function') {
        onLoginSuccess(user);
      }

      // Route according to role or return path
      const role = normalizeRole(user.role);
      if (safeRedirect) {
        navigate(safeRedirect, { replace: true });
      } else if (role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (role === 'kitchen') {
        navigate('/kitchen', { replace: true });
      } else if (role === 'delivery') {
        navigate('/delivery', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center py-6 sm:py-12 px-3 sm:px-6">
      {/* Outer Card with Split-Screen Layout */}
      <div className="relative w-full max-w-4xl min-h-[580px] bg-white dark:bg-[#14121a] border border-slate-200 dark:border-white/10 rounded-3xl shadow-[0_24px_70px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Panel: Hero Graphic with HotPot Scooter & Animations */}
        <AuthHeroPanel
          title="HotPot Delights"
          subtitle="Fast Gourmet Delivery across Kigali"
        />

        {/* Right Panel: Form Section with Glassmorphism & Staggered Transitions */}
        <div className="flex-1 flex flex-col justify-center p-6 sm:p-10 lg:p-12 bg-white/90 dark:bg-[#14121a]/95 backdrop-blur-xl relative">
          
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 w-full max-w-md mx-auto auth-stagger">
            
            {/* Logo with Soft Orange Flame Glow Pulse & Scale on Hover */}
            <div className="flex items-center gap-3.5 mb-6">
              <div
                className="logo-animated-glow w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF5722] to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30 ring-2 ring-orange-500/30 shrink-0 cursor-pointer"
                title="HotPot Delights"
              >
                <Flame className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Sign In to HotPot
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Gourmet hotpot, fired pizzas &amp; real-time tracking
                </p>
              </div>
            </div>

            {/* Error Message Alert */}
            {errorMsg && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-500/30 flex items-start gap-3 animate-fade-in"
              >
                <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="text-xs font-semibold text-red-700 dark:text-red-300 leading-snug">
                  {errorMsg}
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                    Password
                  </label>
                  <span className="text-[11px] text-orange-600 dark:text-orange-400 font-bold hover:underline cursor-pointer">
                    Forgot password?
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Primary Sign In Button with Interactive Shimmer & Hover Lift */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary-interactive group py-3.5 px-4 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer mt-3"
              >
                <span className="btn-shimmer" />
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 shrink-0" />
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4 shrink-0 btn-icon-slide ml-1" />
                  </>
                )}
              </button>
            </form>

            {/* Switch to Register */}
            <div className="mt-8 pt-5 border-t border-slate-200 dark:border-white/10 text-center text-xs text-slate-500 dark:text-slate-400">
              Don&apos;t have an account yet?{' '}
              <Link
                to={safeRedirect ? `/register?redirect=${encodeURIComponent(safeRedirect)}` : '/register'}
                className="text-orange-600 dark:text-orange-400 font-bold hover:underline inline-flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Create an Account</span>
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
