import React, { useEffect, useRef, useState } from 'react';
import { Star, Bike, UtensilsCrossed, X, Check, MessageSquare, AlertTriangle as TriangleAlert, Loader2 } from 'lucide-react';
import { submitReview } from '../../services/apiService';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

const STARS = [1, 2, 3, 4, 5];

const FOOD_LABELS = {
  5: 'Outstanding! Fresh, hot & delicious',
  4: 'Very Good taste & quality',
  3: 'Average experience',
  2: 'Below expectations',
  1: 'Poor'
};

const RIDER_LABELS = {
  5: 'Super fast, polite & great courier service',
  4: 'Punctual & professional',
  3: 'Acceptable delivery time',
  2: 'Delayed delivery',
  1: 'Poor delivery service'
};

function useOverlayA11y(isOpen, onClose) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return undefined;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const first = panel ? panel.querySelector(FOCUSABLE_SELECTOR) : null;
    if (first instanceof HTMLElement) first.focus();
    else if (panel instanceof HTMLElement) panel.focus();
    return () => {
      if (trigger && document.contains(trigger)) trigger.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (typeof closeRef.current === 'function') closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const nodes = Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR));
      if (nodes.length === 0) {
        event.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === first || active === panel || !panel.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  return panelRef;
}

/**
 * Post-delivery rating. This component owns the `submitReview` call and routes
 * the real outcome: the server rejects a review unless the order is `delivered`
 * and belongs to the signed-in customer, so a failure is shown to the user
 * (and passed to `onError`) instead of a fake "thanks!" screen.
 */
export default function PostDeliveryFeedbackModal({ isOpen, onClose, order, onSubmitted, onError }) {
  // Hooks first, always — the "closed" early return comes after them.
  const [pizzaRating, setPizzaRating] = useState(5);
  const [hoverPizzaRating, setHoverPizzaRating] = useState(0);
  const [riderRating, setRiderRating] = useState(5);
  const [hoverRiderRating, setHoverRiderRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const closeTimer = useRef(null);
  // Rating is only meaningful once the order was actually delivered.
  const open = Boolean(isOpen) && Boolean(order) && order.status === 'delivered';
  const panelRef = useOverlayA11y(open, onClose);

  const notifySubmitted = typeof onSubmitted === 'function' ? onSubmitted : null;
  const notifyError = typeof onError === 'function' ? onError : null;

  // Fresh form for every order, and no timer left running after unmount.
  useEffect(() => {
    if (!open) return;
    setPizzaRating(5);
    setHoverPizzaRating(0);
    setRiderRating(5);
    setHoverRiderRating(0);
    setComment('');
    setSubmitted(false);
    setSubmitting(false);
    setErrorMsg('');
  }, [open, order?.id]);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    []
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || !order) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      await submitReview({
        orderId: order.id,
        pizzaRating,
        riderRating,
        comment: comment.trim()
      });
      // Only a resolved promise means the review is really stored.
      setSubmitted(true);
      if (notifySubmitted) {
        notifySubmitted(`Thanks! Your review for order #${order.id} was saved.`);
      }
      closeTimer.current = setTimeout(() => {
        closeTimer.current = null;
        if (typeof onClose === 'function') onClose();
      }, 2200);
    } catch (err) {
      const message = err?.message || 'We could not save your rating. Please try again.';
      setErrorMsg(message);
      setSubmitted(false);
      if (notifyError) notifyError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="bg-[#14171F] border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-5 transition-transform duration-200"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close feedback form"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-all"
        >
          <X className="w-5 h-5" aria-hidden="true" focusable="false" />
        </button>

        {submitted ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 animate-bounce">
              <Check className="w-8 h-8" aria-hidden="true" focusable="false" />
            </div>
            <h2 id="feedback-modal-title" className="text-xl font-black text-white">
              Murakoze! Feedback received.
            </h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Your ratings for order{' '}
              <strong className="text-amber-400 font-mono">#{order.id}</strong> and your delivery
              courier have been saved.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="text-center space-y-1">
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                Order delivered to you
              </span>
              <h2 id="feedback-modal-title" className="text-xl font-black text-white pt-1">
                Rate Your Delivery Experience
              </h2>
              <p className="text-xs text-slate-400">
                Order #{order.id} &bull; {order.customerName || 'Customer'}
              </p>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="flex items-start gap-2 p-2.5 rounded-xl bg-red-950/70 border border-red-500/40 text-red-300 text-xs font-semibold"
              >
                <TriangleAlert className="w-4 h-4 shrink-0" aria-hidden="true" focusable="false" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Food Quality Rating */}
            <fieldset className="space-y-2.5 p-4 rounded-2xl bg-[#1A1D24] border border-slate-800">
              <legend className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-orange-400" aria-hidden="true" focusable="false" />
                Food Quality &amp; Taste
              </legend>
              <StarRow
                name="food-rating"
                value={pizzaRating}
                hover={hoverPizzaRating}
                onChange={setPizzaRating}
                onPreview={setHoverPizzaRating}
              />
              <p className="text-[11px] text-amber-400 font-semibold text-center" aria-live="polite">
                {FOOD_LABELS[hoverPizzaRating || pizzaRating]}
              </p>
            </fieldset>

            {/* Rider Delivery Rating */}
            <fieldset className="space-y-2.5 p-4 rounded-2xl bg-[#1A1D24] border border-slate-800">
              <legend className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Bike className="w-4 h-4 text-amber-400" aria-hidden="true" focusable="false" />
                Courier Speed &amp; Service
              </legend>
              <StarRow
                name="rider-rating"
                value={riderRating}
                hover={hoverRiderRating}
                onChange={setRiderRating}
                onPreview={setHoverRiderRating}
              />
              <p className="text-[11px] text-amber-400 font-semibold text-center" aria-live="polite">
                {RIDER_LABELS[hoverRiderRating || riderRating]}
              </p>
            </fieldset>

            {/* Written Comment */}
            <div className="space-y-1.5">
              <label
                htmlFor="feedback-comment"
                className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" focusable="false" />
                Note for Kitchen &amp; Courier (Optional)
              </label>
              <textarea
                id="feedback-comment"
                name="comment"
                rows={2}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Tell us about food temperature, delivery speed or rider politeness..."
                className="w-full bg-[#1A1D24] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-400 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-linear-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-extrabold text-xs shadow-lg shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" focusable="false" />
                  Submitting Ratings...
                </span>
              ) : (
                'Submit Rating &amp; Feedback'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/** Real radio inputs behind the stars: keyboard and screen-reader accessible. */
function StarRow({ name, value, hover, onChange, onPreview }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {STARS.map((star) => (
        <label
          key={star}
          className="p-1 cursor-pointer rounded transition-transform hover:scale-125 focus-within:ring-2 focus-within:ring-amber-400"
        >
          <input
            type="radio"
            name={name}
            value={star}
            checked={value === star}
            onChange={() => onChange(star)}
            onMouseEnter={() => onPreview(star)}
            onMouseLeave={() => onPreview(0)}
            onFocus={() => onPreview(star)}
            onBlur={() => onPreview(0)}
            className="sr-only"
          />
          {`${star} out of ${STARS.length}`}
          <Star
            aria-hidden="true"
            focusable="false"
            className={`w-7 h-7 ${
              (hover || value) >= star ? 'fill-amber-400 text-amber-400 drop-shadow-md' : 'text-slate-600'
            }`}
          />
        </label>
      ))}
    </div>
  );
}
