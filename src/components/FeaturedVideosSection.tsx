import React from 'react';
import { SupportedLang, TRANSLATIONS } from '../translations';
import { FeaturedVideo } from '../types';
import { PlayCircle, ExternalLink } from 'lucide-react';

interface FeaturedVideosSectionProps {
  videos: FeaturedVideo[];
  currentLang: SupportedLang;
}

export const FeaturedVideosSection: React.FC<FeaturedVideosSectionProps> = ({
  videos,
  currentLang,
}) => {
  const t = TRANSLATIONS[currentLang];

  if (videos.length === 0) return null;

  return (
    <section id="featured-videos-section" className="my-10 scroll-mt-20">
      <div className="flex items-start gap-3 mb-5">
        <div className="p-2.5 rounded-xl bg-red-50 text-red-600 mt-0.5 shrink-0">
          <PlayCircle className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{t.featuredVideosTitle}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{t.featuredVideosSubtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {videos.map((video) => (
          <a
            key={video.id}
            href={video.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group block bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-shadow"
          >
            <div className="relative aspect-video bg-slate-100 overflow-hidden">
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <PlayCircle className="w-12 h-12 text-white drop-shadow-lg opacity-90" />
              </div>
            </div>
            <div className="p-4">
              <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug">
                {video.title}
              </h3>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-slate-500 truncate">{video.channelName}</span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 shrink-0 ml-2">
                  {t.featuredVideosWatchBtn}
                  <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
};
