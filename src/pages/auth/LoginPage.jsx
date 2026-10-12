import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Flame, Lock, Mail, Eye, EyeOff, LogIn, AlertCircle, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { login, normalizeRole } from '../../services/apiService';
import AuthHeroPanel from '../../components/auth/AuthHeroPanel';
import AuthRoadCircuit from '../../components/auth/AuthRoadCircuit';

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
    <div className="min-h-[85vh] flex items-center justify-center py-2 sm:py-4 px-2 sm:px-4">
      {/* 3D Road Circuit Wrapping the Entire Login Page */}
      <AuthRoadCircuit>
        {/* Outer Card with Split-Screen Layout */}
        <div className="relative w-full bg-white dark:bg-[#14121a] border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl">
          
          {/* Left Panel: Hero Graphic with HotPot Express Visual & Floating 3D Elements */}
          <AuthHeroPanel
            title="HotPot"
            subtitle="Fast Gourmet Delivery across Kigali"
          />

          {/* Right Panel: Form Section with 3D Controls & Tactile Buttons */}
          <div className="flex-1 flex flex-col justify-center p-4 sm:p-6 lg:p-7 bg-white/95 dark:bg-[#14121a]/95 backdrop-blur-xl relative">
            
            {/* Subtle Ambient Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 w-full max-w-md mx-auto auth-stagger">
              
              {/* Logo with Soft Orange Flame Glow Pulse & Scale on Hover */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="logo-animated-glow w-12 h-12 rounded-2xl bg-black border border-white/20 p-1 flex items-center justify-center shadow-lg shadow-orange-500/30 ring-2 ring-orange-500/30 shrink-0 cursor-pointer overflow-hidden"
                  title="HotPot"
                >
                  <img
                    src="/hotpot-logo.png"
                    alt="HotPot Logo"
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    Sign In
                  </h1>
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

              {/* Login Form with 3D Inset Wells and 3D Buttons */}
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
                      className="w-full input-3d-well pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all"
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
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full input-3d-well pl-10 pr-11 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="btn-3d-round absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Primary 3D Tactile Push Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full btn-3d-primary py-3.5 px-4 text-sm font-black flex items-center justify-center gap-2 cursor-pointer mt-3"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 shrink-0" />
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4 shrink-0 ml-1" />
                    </>
                  )}
                </button>
              </form>


              {/* 3D Switch to Register Link Badge */}
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-center gap-2">
                <span>Don&apos;t have an account yet?</span>
                <Link
                  to={safeRedirect ? `/register?redirect=${encodeURIComponent(safeRedirect)}` : '/register'}
                  className="btn-3d-secondary px-3.5 py-1.5 text-orange-600 dark:text-orange-400 font-extrabold inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Create an Account</span>
                </Link>
              </div>
            </div>
          </div>

        </div>
      </AuthRoadCircuit>
    </div>
  );
}
