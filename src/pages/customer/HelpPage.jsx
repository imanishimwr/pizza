import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HelpCircle, Phone, MessageSquare, ChevronDown, ChevronUp,
  ArrowLeft, MapPin, Clock, CreditCard, Flame, Package, Star, Bike
} from 'lucide-react';

const FAQS = [
  {
    category: 'Delivery',
    icon: Bike,
    items: [
      {
        q: 'Which areas in Kigali do you deliver to?',
        a: 'We deliver across all Kigali neighborhoods including Nyarutarama, Kimihurura, Gacuriro, Kiyovu, Kacyiru, Remera, Kicukiro, and Down Town. Enter your address at checkout to confirm coverage.'
      },
      {
        q: 'How long does delivery take?',
        a: 'Standard delivery takes 25–45 minutes depending on your location and order volume. You can track your rider in real time on the Live Tracking page once your order is dispatched.'
      },
      {
        q: 'Can I change my delivery address after placing an order?',
        a: 'If your order is still in "Pending" or "Kitchen Preparation" status, contact our support team at +250 788 000 000 to update your drop-off location. Once a rider is dispatched, the address cannot be changed.'
      }
    ]
  },
  {
    category: 'Payments',
    icon: CreditCard,
    items: [
      {
        q: 'How do Mobile Money (MTN / Airtel) payments work?',
        a: 'Select MTN MoMo or Airtel Money at checkout and enter your Rwanda phone number. You will receive an instant USSD popup on your mobile phone to confirm with your PIN. No app download needed.'
      },
      {
        q: 'Is my payment information secure?',
        a: 'Yes. We never store card or Mobile Money credentials. All payment flows are handled via the respective mobile operator\'s secure USSD gateway or Stripe\'s PCI-DSS compliant infrastructure.'
      }
    ]
  },
  {
    category: 'Menu & Customization',
    icon: Flame,
    items: [
      {
        q: 'Can I customize the spice level or broth base of my Hotpot?',
        a: 'Yes! Click on any Hotpot or broth item to open the product page. You can choose your spice level (Mild, Medium, Extra Fire Hot) and broth base before adding to cart.'
      },
      {
        q: 'Do you have vegetarian or vegan options?',
        a: 'Yes. Filter by the "Vegetarian" or "Vegan" category on the home menu. All dietary tags are reviewed and updated regularly.'
      }
    ]
  },
  {
    category: 'Orders & Tracking',
    icon: Package,
    items: [
      {
        q: 'How do I track my order?',
        a: 'Once your order is confirmed, go to My Orders or click "Track Order" from the notification. You\'ll see a live map with your rider\'s position and an estimated arrival time.'
      },
      {
        q: 'Can I cancel my order?',
        a: 'Orders can be cancelled while still in "Pending" status before the kitchen starts preparation. Go to My Orders → select the order → Cancel. After preparation begins, cancellations must be handled by support.'
      }
    ]
  },
  {
    category: 'Feedback & Ratings',
    icon: Star,
    items: [
      {
        q: 'How do I leave a review?',
        a: 'After your order is delivered you\'ll receive a feedback prompt. You can also go to My Orders, select the completed order, and tap "Leave Review" at any time.'
      }
    ]
  }
];

function FaqAccordion({ items }) {
  const [openIdx, setOpenIdx] = useState(null);
  return (
    <div className="space-y-2">
      {items.map((faq, idx) => {
        const expanded = openIdx === idx;
        const panelId = `faq-panel-${idx}`;
        return (
          <div key={faq.q} className="rounded-xl bg-surface-card border border-white/5 overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setOpenIdx(expanded ? null : idx)}
              aria-expanded={expanded}
              aria-controls={panelId}
              className="w-full px-4 py-3.5 text-left text-sm font-semibold text-text-main flex items-center justify-between gap-3 hover:bg-white/5 transition-colors"
            >
              <span>{faq.q}</span>
              {expanded
                ? <ChevronUp className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                : <ChevronDown className="w-4 h-4 text-text-muted shrink-0" aria-hidden="true" />}
            </button>
            {expanded && (
              <div
                id={panelId}
                className="px-4 pb-4 pt-1 text-sm text-text-muted leading-relaxed border-t border-white/5"
              >
                {faq.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function HelpPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface-dark">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-surface-dark/90 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="p-2 rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-bold text-text-main leading-tight">Help &amp; FAQ</h1>
          <p className="text-xs text-text-muted">Kigali Delivery Support Center</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-10">

        {/* Hero */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 text-primary mx-auto">
            <HelpCircle className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-text-main">How can we help?</h2>
          <p className="text-sm text-text-muted max-w-sm mx-auto">
            Find quick answers below, or reach our support team directly.
          </p>
        </div>

        {/* Contact cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <a
            href="tel:+250788000000"
            className="group flex items-center gap-3 p-4 rounded-xl bg-surface-card border border-white/5 hover:border-primary/40 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary/30 transition-colors">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-text-main">Call Us</div>
              <div className="text-xs text-text-muted">+250 788 000 000</div>
            </div>
          </a>

          <a
            href="https://wa.me/250788000000"
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-3 p-4 rounded-xl bg-surface-card border border-white/5 hover:border-emerald-500/40 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/30 transition-colors">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-text-main">WhatsApp</div>
              <div className="text-xs text-text-muted">Instant support</div>
            </div>
          </a>

          <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-card border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-text-main">Hours</div>
              <div className="text-xs text-text-muted">Daily 8 AM – 11 PM</div>
            </div>
          </div>
        </div>

        {/* Delivery zone note */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20">
          <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-text-muted">
            <span className="font-semibold text-text-main">Serving all of Kigali — </span>
            Nyarutarama, Kimihurura, Gacuriro, Kiyovu, Kacyiru, Remera, Kicukiro, Down Town and more.
          </p>
        </div>

        {/* FAQ sections */}
        <div className="space-y-8">
          <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted">
            Frequently Asked Questions
          </h3>

          {FAQS.map(({ category, icon: Icon, items }) => (
            <section key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-primary" aria-hidden="true" />
                <h4 className="text-sm font-bold text-text-main">{category}</h4>
              </div>
              <FaqAccordion items={items} />
            </section>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="text-center pb-6">
          <p className="text-xs text-text-muted">
            Still have a question?{' '}
            <a href="tel:+250788000000" className="text-primary hover:underline font-semibold">
              Call +250 788 000 000
            </a>{' '}
            or{' '}
            <a href="https://wa.me/250788000000" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline font-semibold">
              WhatsApp us
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
