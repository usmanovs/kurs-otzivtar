import React from 'react';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { Landmark, PhoneCall, FileWarning, Globe2, Scale, Info } from 'lucide-react';

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

      <div className="flex items-start gap-2 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>{t.reportScamDisclaimer}</span>
      </div>
    </section>
  );
};
