import React, { useState } from 'react';
import { X, HelpCircle, Phone, MessageSquare, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';

export default function HelpModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [openFaq, setOpenFaq] = useState(0);

  const faqs = [
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-surface-dark border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 text-primary flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-main">Help & Frequently Asked Questions</h2>
              <p className="text-xs text-text-muted">Kigali Delivery Support Center</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-text-muted hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contact Quick Buttons */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <a
            href="tel:+250788000000"
            className="p-3 rounded-xl bg-surface-card border border-white/5 hover:border-primary/40 transition-all flex items-center gap-2"
          >
            <Phone className="w-4 h-4 text-primary" />
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
            <MessageSquare className="w-4 h-4 text-emerald-400" />
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
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="rounded-xl bg-surface-card border border-white/5 overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-3.5 text-left text-xs font-bold text-text-main flex items-center justify-between gap-2"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                  </button>

                  {isOpen && (
                    <div className="px-3.5 pb-3.5 text-xs text-text-muted leading-relaxed border-t border-white/5 pt-2">
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
