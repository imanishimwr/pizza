import React, { useState } from 'react';
import { X, Gift, Copy, Check, Share2, Sparkles } from 'lucide-react';

export default function ReferralModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [copied, setCopied] = useState(false);
  const referralCode = 'HOTPOT-KIGALI-2026';

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-surface-dark border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-main">Invite Friends & Earn Rewards</h2>
              <p className="text-xs text-text-muted">HotPot Delights Referral Program</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-text-muted hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hero Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-tr from-amber-950/60 to-orange-950/40 border border-amber-500/30 space-y-2 text-center">
          <Sparkles className="w-8 h-8 text-amber-400 mx-auto" />
          <h3 className="text-base font-extrabold text-white">Give 2,000 RWF, Get 2,000 RWF!</h3>
          <p className="text-xs text-amber-200/80 leading-relaxed">
            Share HotPot with your friends! After they sign up and place their first order, you both get a 2,000 RWF discount voucher.
          </p>
        </div>

        {/* Code Box */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">
            Your Unique Referral Code
          </label>
          <div className="flex items-center gap-2 p-2 bg-black/40 border border-white/10 rounded-xl">
            <span className="font-mono font-bold text-sm text-amber-400 flex-1 px-3">
              {referralCode}
            </span>
            <button
              onClick={handleCopy}
              className="btn-primary text-xs py-2 px-3 bg-amber-600 hover:bg-amber-700"
            >
              {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 pt-2 text-center text-xs">
          <div className="p-3 rounded-xl bg-surface-card border border-white/5 space-y-1">
            <span className="text-text-subdued block uppercase font-bold">Friends Joined</span>
            <span className="text-lg font-mono font-bold text-text-main">3 Friends</span>
          </div>
          <div className="p-3 rounded-xl bg-surface-card border border-white/5 space-y-1">
            <span className="text-text-subdued block uppercase font-bold">Vouchers Earned</span>
            <span className="text-lg font-mono font-bold text-emerald-400">6,000 RWF</span>
          </div>
        </div>

      </div>
    </div>
  );
}
