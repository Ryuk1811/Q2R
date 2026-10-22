import React, { useState } from 'react';
import { dispatchSupportInquiry, STRICT_SUPPORT_EMAIL } from '../services/cloudflare';

interface StaticPagesProps {
  section: 'about' | 'privacy' | 'contact';
  onNavigate: (section: 'about' | 'privacy' | 'contact') => void;
  onToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export const StaticPages: React.FC<StaticPagesProps> = ({ section, onNavigate, onToast }) => {
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactTopic, setContactTopic] = useState('general');
  const [contactMessage, setContactMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<{ id: string; email: string } | null>(null);

  const handleSubmitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      onToast('Please fill out all required fields.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await dispatchSupportInquiry({
        name: contactName.trim(),
        email: contactEmail.trim(),
        topic: contactTopic,
        message: contactMessage.trim(),
      });

      setSubmittedTicket({
        id: res.ticketId || `ticket_${Date.now()}`,
        email: STRICT_SUPPORT_EMAIL,
      });

      onToast(`Inquiry dispatched to ${STRICT_SUPPORT_EMAIL}`, 'success');
      setContactName('');
      setContactEmail('');
      setContactMessage('');
    } catch {
      onToast('Failed to dispatch inquiry. Please try again or email us directly.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      {/* Editorial Section Header */}
      <div className="mb-10 border-b border-stone-200/80 pb-6">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
          {section === 'privacy' && 'Privacy Policy'}
          {section === 'about' && 'About Q2R (Quick 2 Redirect)'}
          {section === 'contact' && 'Contact Support & Feedback'}
        </h1>
        <p className="mt-3 text-stone-600 max-w-2xl text-sm leading-relaxed">
          {section === 'privacy' &&
            'We believe in absolute data sovereignty. QR codes are generated entirely on your device, and short links never track personal identifiers.'}
          {section === 'about' &&
            'Q2R (Quick 2 Redirect) is a sovereign utility uniting instant vector QR code creation and privacy-shielded relay redirects with zero restrictions.'}
          {section === 'contact' &&
            `Have a question, feedback, or need enterprise support? Inquiries are strictly handled via ${STRICT_SUPPORT_EMAIL}.`}
        </p>

        {/* Section switcher */}
        <div className="flex items-center gap-6 mt-6 text-xs font-medium">
          <button
            onClick={() => onNavigate('about')}
            className={`pb-1 transition-colors cursor-pointer ${
              section === 'about'
                ? 'font-bold text-stone-900 border-b-2 border-stone-900'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            About Us
          </button>
          <button
            onClick={() => onNavigate('privacy')}
            className={`pb-1 transition-colors cursor-pointer ${
              section === 'privacy'
                ? 'font-bold text-stone-900 border-b-2 border-stone-900'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            Privacy Policy
          </button>
          <button
            onClick={() => onNavigate('contact')}
            className={`pb-1 transition-colors cursor-pointer ${
              section === 'contact'
                ? 'font-bold text-stone-900 border-b-2 border-stone-900'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            Contact
          </button>
        </div>
      </div>

      {/* PRIVACY POLICY */}
      {section === 'privacy' && (
        <div className="space-y-8 text-stone-700 leading-relaxed text-sm">
          <div className="bento-card p-6 bg-[#FAF4F0] border-[#C88D77]/20">
            <h2 className="text-sm font-bold text-stone-900 mb-2">
              Our Privacy Commitment
            </h2>
            <p className="text-xs text-stone-600 leading-relaxed">
              Unlike online generators that expire your links after a trial period or sell your traffic, Q2R generates clean, permanent codes. What you create belongs to you forever.
            </p>
          </div>

          <section className="space-y-3">
            <h3 className="text-base font-bold text-stone-900 tracking-tight">
              1. 100% Client-Side QR Generation
            </h3>
            <p>
              When you generate a QR code for your Wi-Fi credentials, business cards, cryptocurrency addresses, plain text, or direct web URLs, <strong>your data never leaves your browser</strong>. All mathematical rendering and image generation happen locally on your device.
            </p>
            <p>
              Your sensitive Wi-Fi passwords and personal contacts are never sent to external servers or logged in any database.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-base font-bold text-stone-900 tracking-tight">
              2. Privacy-Conscious Link Shortening
            </h3>
            <p>
              When you choose to use our link shortener:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-stone-600">
              <li>
                <strong>Minimal Storage:</strong> We only save the destination URL, short alias, creation date, and total click counter.
              </li>
              <li>
                <strong>No Tracking or Profiling:</strong> We do not log raw IP addresses, fingerprint devices, or use cookies to track user behavior across the web.
              </li>
              <li>
                <strong>Referrer Protection:</strong> All redirects include strict privacy headers so the target website cannot track where your visitors came from.
              </li>
              <li>
                <strong>Optional Privacy Shield:</strong> You can enable preview mode on any link, allowing visitors to inspect the destination domain before being redirected.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-base font-bold text-stone-900 tracking-tight">
              3. Permanent Data Control &amp; Deletion
            </h3>
            <p>
              You can delete any short links you create at any time directly through the Short Links dashboard. Deletions are permanent and immediate across our global network and cloud storage. For privacy inquiries or audit requests, contact our privacy desk directly at{' '}
              <a href={`mailto:${STRICT_SUPPORT_EMAIL}`} className="font-semibold underline text-stone-900">
                {STRICT_SUPPORT_EMAIL}
              </a>.
            </p>
          </section>
        </div>
      )}

      {/* ABOUT SECTION */}
      {section === 'about' && (
        <div className="space-y-8 text-stone-700 leading-relaxed text-sm">
          <section className="space-y-3">
            <h3 className="text-base font-bold text-stone-900 tracking-tight">
              Simple, Sovereign, and Fast
            </h3>
            <p>
              Q2R (Quick 2 Redirect) was built to fix what is broken about online utility tools. Most QR generators are overloaded with invasive ads, artificial limitations, and complex subscription tiers.
            </p>
            <p>
              We built Q2R with a clean Bento design system and a distributed global network: fast, distraction-free, and designed with high aesthetic standards.
            </p>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bento-card p-5">
              <h4 className="text-sm font-bold text-stone-900">
                Vector Precision
              </h4>
              <p className="mt-1 text-xs text-stone-600 leading-relaxed">
                Export crisp vector SVGs or print-ready PNGs up to 2048px resolution with zero blurriness.
              </p>
            </div>

            <div className="bento-card p-5">
              <h4 className="text-sm font-bold text-stone-900">
                Sub-Millisecond Routing
              </h4>
              <p className="mt-1 text-xs text-stone-600 leading-relaxed">
                Lightning-fast link resolution paired with real-time route tracing and cloud vault asset storage.
              </p>
            </div>

            <div className="bento-card p-5">
              <h4 className="text-sm font-bold text-stone-900">
                Zero Friction
              </h4>
              <p className="mt-1 text-xs text-stone-600 leading-relaxed">
                Get started immediately without creating an account, entering credit cards, or verifying emails.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-base font-bold text-stone-900 tracking-tight">
              Universal Standards &amp; Compatibility
            </h3>
            <p className="text-xs text-stone-600">
              Every QR code produced adheres to international ISO/IEC 18004 standards and is thoroughly verified for instant scanning on Apple iOS, Google Android, and commercial industrial scanners.
            </p>
          </section>
        </div>
      )}

      {/* CONTACT */}
      {section === 'contact' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 text-stone-700">
          <div className="md:col-span-5 space-y-5 text-sm">
            <div>
              <h2 className="text-base font-bold text-stone-900 tracking-tight">
                Official Support &amp; Inquiries
              </h2>
              <p className="mt-1 text-xs text-stone-600 leading-relaxed">
                We'd love to hear from you. For technical support, partnerships, or enterprise questions, our team is available at our official address.
              </p>
            </div>

            <div className="space-y-4 pt-3 border-t border-stone-200/80 text-xs">
              <div className="p-3 bg-[#FAF4F0] border border-[#C88D77]/30 rounded-xl">
                <span className="text-stone-500 block font-medium text-[11px]">Primary Contact &amp; Support Email</span>
                <a
                  href={`mailto:${STRICT_SUPPORT_EMAIL}`}
                  className="text-stone-900 font-bold font-mono text-sm underline hover:text-[#C88D77] transition-colors block mt-0.5"
                >
                  {STRICT_SUPPORT_EMAIL}
                </a>
              </div>
              <div>
                <span className="text-stone-400 block font-medium">Enterprise &amp; API Inquiries</span>
                <a
                  href={`mailto:${STRICT_SUPPORT_EMAIL}`}
                  className="text-stone-900 font-semibold hover:underline"
                >
                  {STRICT_SUPPORT_EMAIL}
                </a>
              </div>
              <div>
                <span className="text-stone-400 block font-medium">Typical Response Time</span>
                <span className="text-stone-700 font-medium">Under 24 hours</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-7">
            {submittedTicket ? (
              <div className="bento-card p-8 text-center space-y-4 bg-white border border-[#607264]/30">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#EBF1ED] text-[#2C3830] flex items-center justify-center text-lg font-bold">
                  ✓
                </div>
                <h3 className="text-base font-bold text-stone-900">
                  Inquiry Dispatched
                </h3>
                <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
                  Your inquiry has been successfully logged to our Support Desk and routed directly to{' '}
                  <span className="font-semibold text-stone-900">{submittedTicket.email}</span>.
                </p>
                <div className="p-2.5 bg-stone-50 rounded-lg text-left max-w-xs mx-auto border border-stone-200 text-[11px] font-mono text-stone-600">
                  Ticket ID: <span className="font-bold text-stone-800">{submittedTicket.id}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSubmittedTicket(null)}
                  className="mt-4 px-4 py-2 text-xs font-semibold text-stone-900 border border-stone-300 rounded-lg hover:border-stone-900 transition-colors cursor-pointer"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitContact} className="bento-card p-6 space-y-4 bg-white">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Eleanor Vance"
                      className="w-full px-3.5 py-2 text-xs bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Your Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="contact@enterprise.com"
                      className="w-full px-3.5 py-2 text-xs bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    What can we help you with?
                  </label>
                  <select
                    value={contactTopic}
                    onChange={(e) => setContactTopic(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400 cursor-pointer"
                  >
                    <option value="general">General Support</option>
                    <option value="features">Feature Request</option>
                    <option value="business">Enterprise &amp; API Usage</option>
                    <option value="bug">Report an Issue</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Message *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Tell us what you need help with..."
                    className="w-full px-3.5 py-2 text-xs bg-[#FAF8F5] border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400 resize-y"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-6 py-2.5 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 transition-colors rounded-lg cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    {isSubmitting ? 'Dispatching...' : `Send to ${STRICT_SUPPORT_EMAIL}`}
                  </button>
                  <span className="text-[11px] text-stone-500">
                    Direct inquiries: {STRICT_SUPPORT_EMAIL}
                  </span>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
