import React from 'react';
import { SupportedLang, TRANSLATIONS } from '../translations';
import {
  Landmark,
  PhoneCall,
  FileWarning,
  Globe2,
  Scale,
  Info,
  ShieldCheck,
  Newspaper,
  ExternalLink,
} from 'lucide-react';

// Kyrgyz outlets, both languages. Titles and sources live in translations so
// each reads in the language the visitor chose.
const READING = [
  {
    href: 'https://24.kg/obschestvo/289078_vse_chto_doljen_znat_potrebitel_kak_zaschitit_svoi_prava_ikto_mojet_pomoch/',
    titleKey: 'reading1',
    srcKey: 'reading1Src',
  },
  {
    href: 'https://vesti.kg/obshchestvo/item/97636-kto-v-kyrgyzstane-zashchishchaet-prava-potrebitelej-pozhalovatsya-mozhno-dazhe-onlajn.html',
    titleKey: 'reading2',
    srcKey: 'reading2Src',
  },
  {
    href: 'https://economist.kg/dengi/2026/09/08/moshenniki-dostavka-onlain-pokupki/',
    titleKey: 'reading3',
    srcKey: 'reading3Src',
  },
  {
    href: 'https://kaktus.media/doc/516955_kibermoshenniki_obchishaut_kyrgyzstancev_za_sekyndy_novymi_i_starymi_sposobami._kak_byt.html',
    titleKey: 'reading4',
    srcKey: 'reading4Src',
  },
] as const;

interface ReportScamSectionProps {
  currentLang: SupportedLang;
}

export const ReportScamSection: React.FC<ReportScamSectionProps> = ({ currentLang }) => {
  const t = TRANSLATIONS[currentLang];

  const steps = [
    { icon: FileWarning, title: t.reportScamStep1Title, text: t.reportScamStep1Text },
    { icon: Landmark, title: t.reportScamStep2Title, text: t.reportScamStep2Text },
    { icon: PhoneCall, title: t.reportScamStep3Title, text: t.reportScamStep3Text },
    { icon: Globe2, title: t.reportScamStep4Title, text: t.reportScamStep4Text },
    { icon: Scale, title: t.reportScamStep5Title, text: t.reportScamStep5Text },
  ];

  return (
    <section id="report-scam-section" className="my-10 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs scroll-mt-20">
      <div className="flex items-start gap-3 mb-5">
        <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 mt-0.5 shrink-0">
          <Landmark className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{t.reportScamTitle}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{t.reportScamSubtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={i} className="flex flex-col gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <Icon className="w-4 h-4 text-indigo-600 shrink-0" />
              <strong className="text-sm text-slate-900 font-semibold leading-snug">{step.title}</strong>
              <span className="text-xs text-slate-600 leading-relaxed">{step.text}</span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-5">
        <a
          href="tel:102"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-full transition-colors"
        >
          <PhoneCall className="w-3.5 h-3.5" />
          <span>102 — {currentLang === 'ky' ? 'Милиция' : 'Полиция'}</span>
        </a>
        <a
          href="https://e.mvd.kg/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
        >
          <Globe2 className="w-3.5 h-3.5" />
          <span>{t.reportScamLinkMvd}</span>
        </a>
        <a
          href="https://prokuror.kg/ru"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
        >
          <Scale className="w-3.5 h-3.5" />
          <span>{t.reportScamLinkProkuror}</span>
        </a>
      </div>

      {/* The five steps above are the criminal route. Most complaints here
          describe paying for a service and not receiving it, which rarely
          clears the bar for Article 209 — hence the "уголовное дело не
          возбуждают" in the reviews. The consumer route accepts those. */}
      <div className="mt-5 pt-5 border-t border-slate-100">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-emerald-950">{t.consumerTitle}</h3>
              <p className="text-xs text-emerald-900/80 mt-1 leading-relaxed">{t.consumerBody}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <a
                  href="https://antimonopolia.gov.kg/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-full transition-colors"
                >
                  <Globe2 className="w-3.5 h-3.5" />
                  <span>{t.consumerAgency}</span>
                </a>
                <a
                  href="tel:0312574610"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-emerald-900 bg-white border border-emerald-200 hover:bg-emerald-100 rounded-full transition-colors"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>{t.consumerAgencyMeta}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-5 border-t border-slate-100">
        <h3 className="text-sm font-bold text-slate-900">{t.readingTitle}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{t.readingSubtitle}</p>
        <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {READING.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-2 p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors h-full"
              >
                <Newspaper className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-slate-800 leading-snug group-hover:text-indigo-700">
                    {t[item.titleKey]}
                  </span>
                  <span className="block text-2xs text-slate-400 mt-0.5">{t[item.srcKey]}</span>
                </span>
                <ExternalLink className="w-3 h-3 text-slate-300 shrink-0 mt-0.5 group-hover:text-indigo-400" />
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-start gap-2 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>{t.reportScamDisclaimer}</span>
      </div>
    </section>
  );
};
