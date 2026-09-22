import React, { useEffect, useState } from 'react';
import { readStoredLang } from '../lib/lang';
import { Link } from 'react-router-dom';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { submitContactMessage } from '../lib/api';
import { setPageMeta } from '../lib/pageMeta';
import { DONATE_URL } from '../lib/donate';
import {
  ArrowLeft,
  GraduationCap,
  MailCheck,
  ShieldCheck,
  CircleDashed,
  ChevronDown,
  Send,
  Loader2,
  CheckCircle2,
  Heart,
} from 'lucide-react';


/**
 * A real page on the site, reachable from the navbar on every screen.
 * Structured around what actually ships today: how a review reaches
 * publication, what the verification badges do and don't mean, what
 * recourse exists (and what doesn't yet), and who runs the platform.
 */
export const AboutFeaturesPage: React.FC = () => {
  const [currentLang] = useState<SupportedLang>(readStoredLang);
  const t = TRANSLATIONS[currentLang];
  const a = t.aboutPage;
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactFieldError, setContactFieldError] = useState('');
  const [contactStatus, setContactStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactFieldError('');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      setContactFieldError(a.operator.contactForm.errorEmailInvalid);
      return;
    }
    if (!contactMessage.trim()) {
      setContactFieldError(a.operator.contactForm.errorMessageRequired);
      return;
    }

    setContactStatus('sending');
    try {
      await submitContactMessage(contactName, contactEmail.trim(), contactMessage.trim());
      setContactStatus('sent');
      setContactName('');
      setContactEmail('');
      setContactMessage('');
    } catch {
      setContactStatus('error');
    }
  };

  useEffect(() => {
    setPageMeta({ title: `${a.title} — Kursotzyv.org`, description: a.subtitle, path: '/about' });
  }, [a]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {a.backBtn}
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="text-center max-w-xl mx-auto mb-12 sm:mb-16">
          <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full mb-3">
            {a.eyebrow}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
            {a.title}
          </h1>
          <p className="text-sm sm:text-base text-slate-500 mt-3">{a.subtitle}</p>
        </div>

        {/* 1. Purpose */}
        <section className="mb-14 sm:mb-20">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3">{a.purpose.title}</h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">{a.purpose.body}</p>
        </section>

        {/* 2. How reviews work — numbered flow */}
        <section className="mb-14 sm:mb-20">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-6">{a.howItWorks.title}</h2>
          <ol className="space-y-5">
            {a.howItWorks.steps.map((step, i) => (
              <li key={i} className="flex gap-4">
                <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center">
                  {i + 1}
                </div>
                <div className="pt-0.5">
                  <h3 className="text-sm font-bold text-slate-900">{step.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed mt-1">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 3. What verification means */}
        <section className="mb-14 sm:mb-20">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">{a.verification.title}</h2>
          <p className="text-sm text-slate-500 mb-6">{a.verification.intro}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 flex flex-col gap-2">
              <MailCheck className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">{a.verification.email.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{a.verification.email.body}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 flex flex-col gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">{a.verification.attendance.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{a.verification.attendance.body}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 flex flex-col gap-2">
              <CircleDashed className="w-5 h-5 text-slate-400" />
              <h3 className="text-sm font-bold text-slate-900">{a.verification.unverified.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{a.verification.unverified.body}</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 italic mt-4">{a.verification.caveat}</p>
        </section>

        {/* 4. Fairness and corrections */}
        <section className="mb-14 sm:mb-20">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-6">{a.fairness.title}</h2>
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5">
              <h3 className="text-sm font-bold text-slate-900">{a.fairness.reply.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed mt-1">{a.fairness.reply.body}</p>
            </div>
            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
              <h3 className="text-sm font-bold text-slate-900">{a.fairness.reporting.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed mt-1">{a.fairness.reporting.body}</p>
            </div>
            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
              <h3 className="text-sm font-bold text-slate-900">{a.fairness.corrections.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed mt-1">{a.fairness.corrections.body}</p>
            </div>
          </div>
        </section>

        {/* 5. Who runs the platform */}
        <section className="mb-14 sm:mb-20">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3">{a.operator.title}</h2>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6 space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">{a.operator.body}</p>
            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-4">
              {a.operator.conflictNote}
            </p>
            <a
              href={DONATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors"
            >
              <Heart className="w-3.5 h-3.5 shrink-0 fill-rose-100" />
              {t.navDonate}
            </a>
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">
                {a.operator.contactLabel}
              </div>

              {contactStatus === 'sent' ? (
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  {a.operator.contactForm.successMsg}
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-3">
                  <p className="text-sm text-slate-500">{a.operator.contactForm.intro}</p>

                  <div>
                    <label htmlFor="contact-name" className="block text-xs font-semibold text-slate-600 mb-1">
                      {a.operator.contactForm.nameLabel}
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder={a.operator.contactForm.namePlaceholder}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-email" className="block text-xs font-semibold text-slate-600 mb-1">
                      {a.operator.contactForm.emailLabel}
                    </label>
                    <input
                      id="contact-email"
                      type="text"
                      inputMode="email"
                      autoComplete="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder={a.operator.contactForm.emailPlaceholder}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-message" className="block text-xs font-semibold text-slate-600 mb-1">
                      {a.operator.contactForm.messageLabel}
                    </label>
                    <textarea
                      id="contact-message"
                      rows={4}
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder={a.operator.contactForm.messagePlaceholder}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                    />
                  </div>

                  {contactFieldError && (
                    <p className="text-xs font-semibold text-red-600">{contactFieldError}</p>
                  )}
                  {contactStatus === 'error' && (
                    <p className="text-xs font-semibold text-red-600">{a.operator.contactForm.errorMsg}</p>
                  )}

                  <button
                    type="submit"
                    disabled={contactStatus === 'sending'}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold text-sm rounded-full transition-colors cursor-pointer"
                  >
                    {contactStatus === 'sending' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {a.operator.contactForm.sending}
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        {a.operator.contactForm.submitBtn}
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* FAQ — passwordless login & anti-spam details, accessible accordion */}
        <section className="mb-14 sm:mb-20">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-4">{a.faq.title}</h2>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs divide-y divide-slate-100">
            {a.faq.items.map((item, i) => {
              const isOpen = openFaqIndex === i;
              const panelId = `faq-panel-${i}`;
              const buttonId = `faq-button-${i}`;
              return (
                <div key={i}>
                  <h3>
                    <button
                      type="button"
                      id={buttonId}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpenFaqIndex(isOpen ? null : i)}
                      className="w-full flex items-center justify-between gap-3 text-left px-5 py-4 cursor-pointer"
                    >
                      <span className="text-sm font-semibold text-slate-900">{item.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </h3>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    hidden={!isOpen}
                    className="px-5 pb-4"
                  >
                    <p className="text-sm text-slate-500 leading-relaxed">{item.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-4">{a.ctaTitle}</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/#teachers-section"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-full transition-colors shadow-xs"
            >
              {a.ctaViewBtn}
            </Link>
            <Link
              to="/#write-review"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-indigo-50 text-indigo-600 font-semibold text-sm rounded-full transition-colors border border-indigo-200"
            >
              {a.ctaReviewBtn}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};
