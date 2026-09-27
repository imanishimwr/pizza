import React, { useEffect, useRef, useState } from 'react';
import { X, HelpCircle, Phone, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

/**
 * Overlay plumbing: focus enters the dialog and returns to whatever opened it,
 * Escape closes, Tab is kept inside the panel, and the page behind cannot
 * scroll. The listener is bound once per open/close cycle (not per render) so
 * an inline `onClose` cannot thrash it, and every effect cleans up after itself
 * under React.StrictMode's double invoke.
 */
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

const FAQS = [
  {
    q: 'Which areas in Kigali do you deliver to?',
    a: 'We deliver across all Kigali neighborhoods including Nyarutarama, Kimihurura, Gacuriro, Kiyovu, Kacyiru, Remera, Kicukiro, and Down Town.'
  },
  {
    q: 'How do Mobile Money (MTN / Airtel) payments work?',
    a: 'When checking out, select MTN MoMo or Airtel Money and enter your Rwanda phone number. You will receive an instant USSD popup on your mobile phone to enter your PIN.'
  },
  {
    q: 'Can I customize the spice level or broth base of my Hotpot?',
    a: 'Yes! When selecting any Hotpot or broth item, click on it to open the customization modal. You can choose your spice level (Mild, Medium, Extra Fire Hot) and broth base.'
  },
  {
    q: 'Can I change my delivery address after placing an order?',
    a: 'If your order is still in "Pending" or "Kitchen Preparation" status, you can contact our support team at +250 788 000 000 to update your dropoff location.'
  }
];

export default function HelpModal({ isOpen, onClose }) {
  // Hooks first, always. The early return for a closed modal comes after them so
  // the hook order never changes between renders.
  const [openFaq, setOpenFaq] = useState(0);
  const panelRef = useOverlayA11y(Boolean(isOpen), onClose);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="bg-surface-dark border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 text-primary flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5" aria-hidden="true" focusable="false" />
            </div>
            <div>
              <h2 id="help-modal-title" className="text-lg font-bold text-text-main">
                Help &amp; Frequently Asked Questions
              </h2>
              <p className="text-xs text-text-muted">Kigali Delivery Support Center</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help and support"
            className="p-2 text-text-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" focusable="false" />
          </button>
        </div>

        {/* Contact Quick Links */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <a
            href="tel:+250788000000"
            className="p-3 rounded-xl bg-surface-card border border-white/5 hover:border-primary/40 transition-all flex items-center gap-2"
          >
            <Phone className="w-4 h-4 text-primary shrink-0" aria-hidden="true" focusable="false" />
            <div>
              <div className="font-bold text-text-main">Call Customer Care</div>
              <div className="text-[10px] text-text-subdued">+250 788 000 000</div>
            </div>
          </a>

          <a
            href="https://wa.me/250788000000"
            target="_blank"
            rel="noreferrer"
            className="p-3 rounded-xl bg-surface-card border border-white/5 hover:border-emerald-500/40 transition-all flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" focusable="false" />
            <div>
              <div className="font-bold text-text-main">WhatsApp Live Chat</div>
              <div className="text-[10px] text-text-subdued">Instant Support</div>
            </div>
          </a>
        </div>

        {/* FAQs Accordion */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Frequently Asked Questions
          </h3>

          <div className="space-y-2">
            {FAQS.map((faq, idx) => {
              const expanded = openFaq === idx;
              const panelId = `help-faq-panel-${idx}`;
              return (
                <div key={faq.q} className="rounded-xl bg-surface-card border border-white/5 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(expanded ? null : idx)}
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    className="w-full p-3.5 text-left text-xs font-bold text-text-main flex items-center justify-between gap-2"
                  >
                    <span>{faq.q}</span>
                    {expanded ? (
                      <ChevronUp className="w-4 h-4 text-primary shrink-0" aria-hidden="true" focusable="false" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-text-muted shrink-0" aria-hidden="true" focusable="false" />
                    )}
                  </button>

                  {expanded && (
                    <div id={panelId} className="px-3.5 pb-3.5 text-xs text-text-muted leading-relaxed border-t border-white/5 pt-2">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
