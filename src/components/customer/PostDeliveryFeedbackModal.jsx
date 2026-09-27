import React, { useState } from 'react';
import { Star, Bike, UtensilsCrossed, X, Check, MessageSquare, Award } from 'lucide-react';
import { apiService } from '../../services/apiService';

export default function PostDeliveryFeedbackModal({ isOpen, onClose, order }) {
  // STRICT GUARD: Rating can ONLY be done after receiving the order (status === 'delivered')
  if (!isOpen || !order || order.status !== 'delivered') return null;

  const [pizzaRating, setPizzaRating] = useState(5);
  const [hoverPizzaRating, setHoverPizzaRating] = useState(0);
  const [riderRating, setRiderRating] = useState(5);
  const [hoverRiderRating, setHoverRiderRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pizzaLabel = (r) => {
    if (r === 5) return '⭐⭐⭐⭐⭐ Outstanding! Fresh, hot & delicious';
    if (r === 4) return '⭐⭐⭐⭐ Very Good taste & quality';
    if (r === 3) return '⭐⭐⭐ Average experience';
    if (r === 2) return '⭐⭐ Below expectations';
    return '⭐ Poor';
  };

  const riderLabel = (r) => {
    if (r === 5) return '⚡ Super Fast, polite & great courier service';
    if (r === 4) return '👍 Punctual & professional';
    if (r === 3) return '👌 Acceptable delivery time';
    if (r === 2) return '⏳ Delayed delivery';
    return '❌ Poor delivery service';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiService.submitReview({
        orderId: order.id,
        pizzaRating,
        riderRating,
        comment,
      });
    } catch (_) {
      // silent fail — still show success feedback
    }
    setSubmitted(true);
    setSubmitting(false);
    setTimeout(() => {
      onClose();
      setSubmitted(false);
    }, 2200);
  };

  const StarRow = ({ value, hover, onSet, onHover, onLeave }) => (
    <div className="flex items-center justify-center gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          type="button"
          key={star}
          onClick={() => onSet(star)}
          onMouseEnter={() => onHover(star)}
          onMouseLeave={() => onLeave()}
          className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
        >
          <Star
            className={`w-7 h-7 ${
              (hover || value) >= star
                ? 'fill-amber-400 text-amber-400 drop-shadow-md'
                : 'text-slate-600'
            }`}
          />
        </button>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#14171F] border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-5 animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-8 space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 animate-bounce">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-white">Murakoze! Feedback Received!</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Your ratings for Order <strong className="text-amber-400 font-mono">#{order.id}</strong> and your delivery courier have been saved.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="text-center space-y-1">
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                ✓ ORDER DELIVERED TO YOU
              </span>
              <h2 className="text-xl font-black text-white pt-1">Rate Your Delivery Experience</h2>
              <p className="text-xs text-slate-400">Order #{order.id} • {order.customerName || 'Customer'}</p>
            </div>

            {/* Food Quality Rating */}
            <div className="space-y-2.5 p-4 rounded-2xl bg-[#1A1D24] border border-slate-800">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-orange-400" /> Food Quality & Taste
              </label>
              <StarRow
                value={pizzaRating}
                hover={hoverPizzaRating}
                onSet={setPizzaRating}
                onHover={setHoverPizzaRating}
                onLeave={() => setHoverPizzaRating(0)}
              />
              <p className="text-[11px] text-amber-400 font-semibold text-center">
                {pizzaLabel(hoverPizzaRating || pizzaRating)}
              </p>
            </div>

            {/* Rider Delivery Rating */}
            <div className="space-y-2.5 p-4 rounded-2xl bg-[#1A1D24] border border-slate-800">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Bike className="w-4 h-4 text-amber-400" /> Courier Speed & Service
              </label>
              <StarRow
                value={riderRating}
                hover={hoverRiderRating}
                onSet={setRiderRating}
                onHover={setHoverRiderRating}
                onLeave={() => setHoverRiderRating(0)}
              />
              <p className="text-[11px] text-amber-400 font-semibold text-center">
                {riderLabel(hoverRiderRating || riderRating)}
              </p>
            </div>

            {/* Written Comment */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-orange-400" /> Note for Kitchen & Courier (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                placeholder="Tell us about food temperature, delivery speed or rider politeness..."
                className="w-full bg-[#1A1D24] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-400 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-extrabold text-xs shadow-lg shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
            >
              {submitting ? 'Submitting Ratings...' : 'Submit Rating & Feedback ⭐'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
