import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Flame, Lock, Mail, Eye, EyeOff, LogIn, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { login, normalizeRole } from '../../services/apiService';
import QuickLoginHelper from '../../components/auth/QuickLoginHelper';

export default function LoginPage({ onLoginSuccess }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = location.state?.from?.pathname;

  const handleLogin = async (e, customEmail, customPass) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    setErrorMsg('');

    const targetEmail = (customEmail !== undefined ? customEmail : email).trim().toLowerCase();
    const targetPassword = customPass !== undefined ? customPass : password;

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
      if (from && from !== '/login' && from !== '/register') {
        navigate(from, { replace: true });
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
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4">
      <div className="relative w-full max-w-md bg-[#16161a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-0 w-48 h-48 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-primary to-orange-500 flex items-center justify-center text-white shadow-lg shadow-primary/30 ring-2 ring-primary/20 shrink-0">
            <Flame className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Sign In to HotPot</h1>
            <p className="text-xs text-text-muted">Access gourmet hotpot, pizzas & live tracking</p>
          </div>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="mb-5 p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 flex items-start gap-3 animate-fade-in"
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="text-xs font-semibold text-red-300 leading-snug">{errorMsg}</div>
          </div>
        )}

        <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-text-subdued focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-text-subdued focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-white"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-linear-to-r from-primary to-orange-600 hover:from-primary-hover hover:to-orange-500 text-white text-sm py-3 font-bold rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{isSubmitting ? 'Authenticating...' : 'Sign In'}</span>
          </button>
        </form>

        <QuickLoginHelper
          disabled={isSubmitting}
          onSelect={(demoEmail, demoPass) => {
            setEmail(demoEmail);
            setPassword(demoPass);
          }}
          onInstantLogin={(demoEmail, demoPass) => {
            setEmail(demoEmail);
            setPassword(demoPass);
            handleLogin(null, demoEmail, demoPass);
          }}
        />

        <div className="mt-6 text-center text-xs text-text-muted">
          Don't have an account yet?{' '}
          <Link to="/register" className="text-primary font-bold hover:underline">
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
}
