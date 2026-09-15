import React, { useEffect, useState } from 'react';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { PenLine, Globe, Menu, X, ShieldCheck, LogOut } from 'lucide-react';

interface NavbarProps {
  currentLang: SupportedLang;
  isAdmin: boolean;
  onSelectLang: (lang: SupportedLang) => void;
  onOpenAddReview: () => void;
  onOpenAdminLogin: () => void;
  onOpenModeration: () => void;
  onSignOutAdmin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentLang,
  isAdmin,
  onSelectLang,
  onOpenAddReview,
  onOpenAdminLogin,
  onOpenModeration,
  onSignOutAdmin,
}) => {
  const t = TRANSLATIONS[currentLang];
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const navLinks = [
    { id: 'leaderboard-section', label: t.navLeaderboard },
    { id: 'teachers-section', label: t.navTeachers },
    { id: 'featured-videos-section', label: t.navVideos },
    { id: 'report-scam-section', label: t.navReportScam },
    { id: 'stats-section', label: t.navStats },
  ];

  useEffect(() => {
    if (!isDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isDrawerOpen]);

  const scrollToSection = (id: string) => {
    setIsDrawerOpen(false);
    // Let the drawer unmount first so the sticky header height is settled
    // before we measure the scroll target.
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="flex items-center justify-between gap-2 h-14 sm:h-20">
          {/* Logo & Brand */}
          <button
            type="button"
            id="logo-scroll-top-btn"
            onClick={scrollToTop}
            className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center text-white font-bold shadow-md ring-1 ring-indigo-600/20 shrink-0">
              <span>K</span>
            </div>
            <div className="min-w-0">
              <span className="block text-sm sm:text-xl font-bold tracking-tight text-slate-800 uppercase truncate">
                {t.siteTitle}
              </span>
              <p className="text-xs text-slate-500 hidden lg:block truncate">{t.siteSubtitle}</p>
            </div>
          </button>

          {/* Section links — desktop only; on smaller screens they live in the drawer */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.id}
                type="button"
                id={`navlink-${link.id}`}
                onClick={() => scrollToSection(link.id)}
                className="shrink-0 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors cursor-pointer whitespace-nowrap"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Core utilities: language, primary CTA, menu */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <div className="flex items-center bg-slate-100 rounded-full p-0.5 sm:p-1 border border-slate-200 text-xs font-medium shrink-0">
              <Globe className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-1 hidden lg:inline" />
              {(['ky', 'ru'] as SupportedLang[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  id={`lang-btn-${lang}`}
                  onClick={() => onSelectLang(lang)}
                  className={`px-2 sm:px-2.5 py-1 rounded-full whitespace-nowrap transition-all cursor-pointer ${
                    currentLang === lang
                      ? 'bg-white text-indigo-600 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="sm:hidden">{lang === 'ky' ? 'KG' : 'RU'}</span>
                  <span className="hidden sm:inline">{lang === 'ky' ? 'Кыргызча' : 'Рус'}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              id="submit-review-header-btn"
              onClick={onOpenAddReview}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-indigo-600 bg-transparent border border-indigo-200 hover:bg-indigo-50 active:bg-indigo-100 rounded-full transition-colors whitespace-nowrap cursor-pointer"
            >
              <PenLine className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{t.submitReviewBtn}</span>
              <span className="sm:hidden">{t.headerReviewBtn}</span>
            </button>

            <button
              type="button"
              id="nav-menu-btn"
              onClick={() => setIsDrawerOpen(true)}
              aria-label={t.navMenu.open}
              aria-expanded={isDrawerOpen}
              className="lg:hidden p-2 -mr-1 rounded-full text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

    </header>

    {isDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t.navMenu.title}
            className="absolute inset-y-0 right-0 w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-5 h-14 border-b border-slate-200">
              <span className="text-sm font-bold text-slate-900">{t.navMenu.title}</span>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                aria-label={t.navMenu.close}
                className="p-2 -mr-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-2">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  id={`drawer-navlink-${link.id}`}
                  onClick={() => scrollToSection(link.id)}
                  className="w-full text-left px-5 py-3.5 text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer"
                >
                  {link.label}
                </button>
              ))}

              <div className="my-2 border-t border-slate-100" />

              {isAdmin ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      onOpenModeration();
                    }}
                    className="w-full text-left px-5 py-3.5 text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer inline-flex items-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    {t.moderation.openButton}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      onSignOutAdmin();
                    }}
                    className="w-full text-left px-5 py-3.5 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer inline-flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>{t.adminAuth.signOut}</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsDrawerOpen(false);
                    onOpenAdminLogin();
                  }}
                  className="w-full text-left px-5 py-3.5 text-sm font-medium text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors cursor-pointer inline-flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>{t.adminAuth.signIn}</span>
                </button>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
};
