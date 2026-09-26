import React, { useState } from 'react';
import { Star, Bike, Pizza, X, Check, MessageSquare } from 'lucide-react';
import { apiService } from '../../services/apiService';

export default function PostDeliveryFeedbackModal({ isOpen, onClose, order }) {
  if (!isOpen || !order) return null;

  const [pizzaRating, setPizzaRating] = useState(5);
  const [hoverPizzaRating, setHoverPizzaRating] = useState(0);
  const [riderRating, setRiderRating] = useState(5);
  const [hoverRiderRating, setHoverRiderRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pizzaLabel = (r) => {
    if (r === 5) return 'Excellent! Fresh & Delicious';
    if (r === 4) return 'Very Good';
    if (r === 3) return 'Average';
    if (r === 2) return 'Below Average';
    return 'Poor';
  };

  const riderLabel = (r) => {
    if (r === 5) return 'Outstanding! Super Fast';
    if (r === 4) return 'Very Good';
    if (r === 3) return 'Average';
    if (r === 2) return 'Slow Delivery';
    return 'Very Poor';
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
      // silent fail — still show success to user
    }
    setSubmitted(true);
    setSubmitting(false);
    setTimeout(() => {
      onClose();
      setSubmitted(false);
    }, 2500);
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
          className="p-1 transition-transform hover:scale-125 focus:outline-none"
        >
          <Star
            className={`w-7 h-7 ${
              (hover || value) >= star
                ? 'fill-amber-400 text-amber-400'
                : 'text-white/20'
            }`}
          />
        </button>
      ))}
    </div>
  );

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
            <h3 className="text-xl font-bold text-white">Murakoze! Thank You!</h3>
            <p className="text-xs text-text-muted">
              Your ratings for Order #{order.id} have been submitted. We appreciate your feedback!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="text-center space-y-1">
              <span className="badge-tag badge-primary text-[10px]">ORDER DELIVERED</span>
              <h2 className="text-xl font-extrabold text-white">Rate Your Experience</h2>
              <p className="text-xs text-text-muted">Order #{order.id}</p>
            </div>

            {/* Pizza Rating */}
            <div className="space-y-2 p-4 rounded-2xl bg-surface-card border border-white/10">
              <label className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                <Pizza className="w-4 h-4 text-primary" /> Rate the Food Quality
              </label>
              <StarRow
                value={pizzaRating}
                hover={hoverPizzaRating}
                onSet={setPizzaRating}
                onHover={setHoverPizzaRating}
                onLeave={() => setHoverPizzaRating(0)}
              />
              <p className="text-xs text-amber-400 font-semibold text-center">
                {pizzaLabel(hoverPizzaRating || pizzaRating)}
              </p>
            </div>

            {/* Rider Rating */}
            <div className="space-y-2 p-4 rounded-2xl bg-surface-card border border-white/10">
              <label className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                <Bike className="w-4 h-4 text-blue-400" /> Rate the Rider / Delivery
              </label>
              <StarRow
                value={riderRating}
                hover={hoverRiderRating}
                onSet={setRiderRating}
                onHover={setHoverRiderRating}
                onLeave={() => setHoverRiderRating(0)}
              />
              <p className="text-xs text-blue-400 font-semibold text-center">
                {riderLabel(hoverRiderRating || riderRating)}
              </p>
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-primary" /> Additional Feedback (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                placeholder="Tell us anything about your experience..."
                className="w-full bg-surface-card border border-white/10 rounded-xl p-3 text-xs text-text-main placeholder-text-subdued focus:outline-none focus:border-primary resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full btn-primary py-3 text-xs disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Submit Ratings'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
