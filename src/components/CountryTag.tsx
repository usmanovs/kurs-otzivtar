import React, { useState } from 'react';

/**
 * Flag emoji was the obvious way to do this and the wrong one: Windows ships
 * no glyphs for regional-indicator pairs, so every flag rendered there as bare
 * letters or empty boxes while looking correct on macOS and on phones.
 *
 * Serving the flag as an image takes the reader's font out of the equation —
 * everyone sees the same thing, and no support-detection guesswork is needed.
 * Files are same-origin and cached, and only the countries that actually
 * appear are ever requested. A country with no file falls back to its code
 * rather than a broken image.
 *
 * Flags: lipis/flag-icons (MIT), stored at public/flags/<code>.svg.
 */
const AVAILABLE = new Set([
  'kg', 'us', 'de', 'gb', 'ru', 'kz', 'uz', 'tr', 'tj', 'cn', 'kr', 'ae',
]);

interface CountryTagProps {
  country: string;
  city?: string;
}

export const CountryTag: React.FC<CountryTagProps> = ({ country, city }) => {
  const [failed, setFailed] = useState(false);
  if (!/^[A-Za-z]{2}$/.test(country)) return null;

  const code = country.toUpperCase();
  const lower = country.toLowerCase();
  const label = city ? `${code} · ${city}` : code;
  const showImage = AVAILABLE.has(lower) && !failed;

  return (
    <span className="inline-flex items-center gap-1 align-middle" title={label}>
      {showImage ? (
        <img
          src={`/flags/${lower}.svg`}
          alt={code}
          width={16}
          height={12}
          loading="lazy"
          onError={() => setFailed(true)}
          className="w-4 h-3 rounded-[2px] object-cover ring-1 ring-slate-900/10 shrink-0"
        />
      ) : (
        <span className="px-1 py-px rounded bg-slate-100 border border-slate-200 text-[10px] font-bold tracking-wide text-slate-600">
          {code}
        </span>
      )}
      {city && <span>{city}</span>}
    </span>
  );
};
