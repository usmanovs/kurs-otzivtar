import React from 'react';
import { ExternalLink, Handshake } from 'lucide-react';
import { TRANSLATIONS } from '../translations';
import { useLang } from '../lib/i18n';

/** Partner firms shown on the homepage. Add an entry here (and its copy in translations.partners) for the next one. */
const PARTNERS = [
  { id: 'legalFeeAudit' as const, name: 'Legal Fee Audit', url: 'https://www.legalfeeaudit.com/', host: 'legalfeeaudit.com' },
];

export const PartnersSection: React.FC = () => {
  const t = TRANSLATIONS[useLang()].partners;

  return (
    <section aria-labelledby="partners-title" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
      <h2 id="partners-title" className="text-sm font-bold uppercase tracking-wide text-slate-500">
        {t.title}
      </h2>
      <ul className="mt-4 grid gap-4 grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(340px,460px))]">
        {PARTNERS.map((p) => (
          <li key={p.id}>
            <a
              // sponsored: the safe default for a partner link, so it is never read as an undisclosed paid link.
              href={p.url}
              target="_blank"
              rel="noopener sponsored"
              className="group flex h-full gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-indigo-300 hover:shadow-md"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Handshake className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                  {t.badge}
                </span>
                <span className="mt-1.5 block text-base font-bold text-slate-900 group-hover:text-indigo-700">{p.name}</span>
                <span className="mt-1 block text-sm leading-relaxed text-slate-600">{t[p.id].blurb}</span>
                <span className="mt-1.5 block text-xs leading-relaxed text-slate-400">{t[p.id].scope}</span>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600">
                  {t.visit} · {p.host}
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
};
