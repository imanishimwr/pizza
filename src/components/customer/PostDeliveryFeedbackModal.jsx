import React, { useState } from 'react';
import { Star, Heart, DollarSign, X, Check, MessageSquare, ShieldCheck } from 'lucide-react';

export default function PostDeliveryFeedbackModal({ isOpen, onClose, order }) {
  if (!isOpen || !order) return null;

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [tipAmount, setTipAmount] = useState(1000);
  const [customTip, setCustomTip] = useState('');
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const predefinedTips = [500, 1000, 2000, 3000];

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      onClose();
      setSubmitted(false);
    }, 2000);
  };

  const activeTip = customTip ? parseInt(customTip, 10) || 0 : tipAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-surface-dark border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-text-muted hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-8 space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto animate-bounce">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">Murakoze Cyane! Thank You!</h3>
            <p className="text-xs text-text-muted">
              Your feedback and {activeTip > 0 ? `${activeTip.toLocaleString()} RWF tip` : 'review'} have been sent to rider Eric & our kitchen team!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="text-center space-y-1">
              <span className="badge-tag badge-primary text-[10px]">ORDER COMPLETED</span>
              <h2 className="text-xl font-extrabold text-white">Rate Your Delivery</h2>
              <p className="text-xs text-text-muted">Order #{order.id} • {order?.riderName || 'Your Rider'}</p>
            </div>

            {/* Star Rating */}
            <div className="space-y-2 text-center">
              <label className="text-xs font-bold uppercase tracking-wider text-text-muted block">
                How was your food & delivery experience?
              </label>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-125 focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        (hoverRating || rating) >= star
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-text-subdued'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs text-amber-400 font-semibold">
                {rating === 5 ? ' Excellent! Hot & Fast' :
                 rating === 4 ? ' Very Good' :
                 rating === 3 ? ' Average' : ' Poor'}
              </p>
            </div>

            {/* Driver Tipping */}
            <div className="space-y-3 pt-2 border-t border-white/10">
              <label className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-primary">
                  <Heart className="w-4 h-4 fill-primary" /> Add Tip for Rider Eric
                </span>
                <span className="text-[10px] text-text-subdued">100% goes to driver</span>
              </label>

              <div className="grid grid-cols-4 gap-2">
                {predefinedTips.map((amount) => (
                  <button
                    type="button"
                    key={amount}
                    onClick={() => {
                      setTipAmount(amount);
                      setCustomTip('');
                    }}
                    className={`py-2 rounded-xl border text-xs font-mono font-bold transition-all ${
                      tipAmount === amount && !customTip
                        ? 'bg-primary text-white border-primary shadow-md'
                        : 'bg-surface-card border-white/10 text-text-muted hover:border-white/20'
                    }`}
                  >
                    {amount} RWF
                  </button>
                ))}
              </div>

              <input
                type="number"
                value={customTip}
                onChange={(e) => setCustomTip(e.target.value)}
                placeholder="Or enter custom tip (RWF)"
                className="w-full bg-surface-card border border-white/10 rounded-xl px-4 py-2.5 text-xs text-text-main placeholder-text-subdued focus:outline-none focus:border-primary"
              />
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-primary" /> Delivery Feedback (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                placeholder="Share compliment for Eric or kitchen note..."
                className="w-full bg-surface-card border border-white/10 rounded-xl p-3 text-xs text-text-main placeholder-text-subdued focus:outline-none focus:border-primary resize-none"
              />
            </div>

            {/* Submit Button */}
            <button type="submit" className="w-full btn-primary py-3 text-xs">
              Submit Review & {activeTip > 0 ? `Pay ${activeTip.toLocaleString()} RWF Tip` : 'Finish'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
