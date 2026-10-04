import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, XCircle, ShieldAlert, CheckCircle2, RefreshCw, X } from 'lucide-react';

const TONES = {
  danger: {
    badge: 'bg-red-500/15 text-red-400 border-red-500/30',
    btn: 'bg-linear-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-900/30',
    icon: Trash2
  },
  warning: {
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    btn: 'bg-linear-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-900/30',
    icon: AlertTriangle
  },
  auth: {
    badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    btn: 'bg-linear-to-r from-orange-500 to-amber-500 hover:brightness-110 text-white shadow-lg shadow-orange-900/30',
    icon: ShieldAlert
  },
  success: {
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    btn: 'bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-900/30',
    icon: CheckCircle2
  }
};

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  tone = 'danger',
  icon: CustomIcon,
  isBusy = false,
  showCancel = true
}) {
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isBusy && showCancel) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isBusy, showCancel, onClose]);

  if (!isOpen) return null;

  const currentTone = TONES[tone] || TONES.danger;
  const IconComponent = CustomIcon || currentTone.icon;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isBusy && showCancel) {
          onClose();
        }
      }}
    >
      <div
        className="bg-[#1A1D24] border border-slate-800 rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-message"
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${currentTone.badge}`}
          >
            <IconComponent className="w-6 h-6" aria-hidden="true" />
          </div>
          <div className="space-y-1.5 flex-1 min-w-0">
            <h3 id="confirm-modal-title" className="text-base sm:text-lg font-black text-white leading-snug">
              {title}
            </h3>
            <p id="confirm-modal-message" className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {message}
            </p>
          </div>
          {showCancel && !isBusy && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-500 hover:text-white transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
          {showCancel && (
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="px-4 py-2.5 rounded-xl bg-[#1F242D] hover:bg-slate-700/60 text-slate-300 hover:text-white text-xs font-bold transition-all border border-slate-700/50 min-h-11 disabled:opacity-50"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all min-h-11 disabled:opacity-50 ${currentTone.btn}`}
          >
            {isBusy && <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
