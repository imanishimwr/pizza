import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Flame, Lock, Mail, User, Phone, Eye, EyeOff, AlertCircle, ArrowRight, UserPlus } from 'lucide-react';
import { register } from '../../services/apiService';

const MIN_PASSWORD = 8;

export default function RegisterPage({ onRegisterSuccess }) {
  const navigate = useNavigate();
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
        password
      });

      if (typeof onRegisterSuccess === 'function') {
        onRegisterSuccess(user);
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed. Please try again.');
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
            <h1 className="text-xl font-black text-white tracking-tight">Create an Account</h1>
            <p className="text-xs text-text-muted">Fast gourmet delivery across Kigali</p>
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

        <form onSubmit={handleRegister} className="space-y-3.5">
          <div>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                required
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-text-subdued focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1">
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
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-text-subdued focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1">
              Phone Number (Optional)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+250 788 000 000"
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-text-subdued focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1">
              Password (min {MIN_PASSWORD} characters)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-10 py-2 text-sm text-white placeholder-text-subdued focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
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

          <div>
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-text-subdued focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-linear-to-r from-primary to-orange-600 hover:from-primary-hover hover:to-orange-500 text-white text-sm py-3 font-bold rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-3"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isSubmitting ? 'Creating account...' : 'Create Account'}</span>
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-text-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-bold hover:underline">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}
