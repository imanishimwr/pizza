import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Flame, Lock, Mail, User, Phone, Eye, EyeOff, AlertCircle, ArrowRight, UserPlus, Loader2, LogIn } from 'lucide-react';
import { register } from '../../services/apiService';
import AuthHeroPanel from '../../components/auth/AuthHeroPanel';
import AuthRoadCircuit from '../../components/auth/AuthRoadCircuit';

const MIN_PASSWORD = 8;

export default function RegisterPage({ onRegisterSuccess }) {
  const navigate = useNavigate();
  const location = useLocation();
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

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (fullName.trim().length < 2) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setErrorMsg(`Password must be at least ${MIN_PASSWORD} characters long.`);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('The two passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await register({
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        password,
      });

      if (typeof onRegisterSuccess === 'function') {
        onRegisterSuccess(user);
      }
      if (safeRedirect) {
        navigate(safeRedirect, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center py-6 sm:py-12 px-3 sm:px-6">
      {/* 3D Road Circuit Wrapping the Entire Register Page */}
      <AuthRoadCircuit>
        {/* Outer Card with Split-Screen Layout */}
        <div className="relative w-full min-h-[580px] bg-white dark:bg-[#14121a] border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden flex flex-col md:flex-row">
          
          {/* Left Panel: Hero Graphic with HotPot Express Visual & 3D Stage */}
          <AuthHeroPanel
            title="Join HotPot"
            subtitle="Fast Gourmet Delivery across Kigali"
          />

          {/* Right Panel: Form Section with 3D Controls */}
          <div className="flex-1 flex flex-col justify-center p-6 sm:p-10 lg:p-12 bg-white/95 dark:bg-[#14121a]/95 backdrop-blur-xl relative">
            
            {/* Subtle Ambient Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 w-full max-w-md mx-auto auth-stagger">
              
              {/* Logo with Soft Orange Flame Glow Pulse & Scale on Hover */}
              <div className="flex items-center gap-3.5 mb-6">
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
                    Create an Account
                  </h1>
                </div>
              </div>

              {/* Error Message Alert */}
              {errorMsg && (
                <div
                  role="alert"
                  className="mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-500/30 flex items-start gap-3 animate-fade-in"
                >
                  <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
                  <div className="text-xs font-semibold text-red-700 dark:text-red-300 leading-snug">
                    {errorMsg}
                  </div>
                </div>
              )}

              {/* Registration Form with 3D Controls */}
              <form onSubmit={handleRegister} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                      type="text"
                      required
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full input-3d-well pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
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
                      className="w-full input-3d-well pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Phone Number (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                      type="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+250 788 000 000"
                      className="w-full input-3d-well pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                      Password
                    </label>
                    <div className="relative flex items-center">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="min 8 chars"
                        className="w-full input-3d-well pl-10 pr-10 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="btn-3d-round absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="repeat pass"
                        className="w-full input-3d-well pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Primary 3D Push Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full btn-3d-primary py-3.5 px-4 text-sm font-black flex items-center justify-center gap-2 cursor-pointer mt-4"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 shrink-0" />
                      <span>Register</span>
                      <ArrowRight className="w-4 h-4 shrink-0 ml-1" />
                    </>
                  )}
                </button>
              </form>

              {/* 3D Switch to Sign In */}
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-center gap-2">
                <span>Already have an account?</span>
                <Link
                  to={safeRedirect ? `/login?redirect=${encodeURIComponent(safeRedirect)}` : '/login'}
                  className="btn-3d-secondary px-3.5 py-1.5 text-orange-600 dark:text-orange-400 font-extrabold inline-flex items-center gap-1"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In here</span>
                </Link>
              </div>
            </div>
          </div>

        </div>
      </AuthRoadCircuit>
    </div>
  );
}
