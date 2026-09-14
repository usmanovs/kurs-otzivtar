import React from 'react';

/**
 * Windows ships no glyphs for regional-indicator pairs, so a flag emoji that
 * looks right on macOS/iOS/Android renders there as bare letters or empty
 * boxes. Detect it once and fall back to a legible code chip rather than
 * emitting a character the reader's system cannot draw.
 *
 * The test relies on the pair ligating into a single glyph where flags are
 * supported: that glyph is narrower than the two letters drawn separately.
 */
let flagSupport: boolean | null = null;

function supportsFlagEmoji(): boolean {
  if (flagSupport !== null) return flagSupport;
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      flagSupport = false;
      return flagSupport;
    }
    ctx.font = '24px sans-serif';
    const pair = ctx.measureText('\u{1F1F0}\u{1F1EC}').width;
    const single = ctx.measureText('\u{1F1F0}').width;
    // Ligated: roughly one glyph wide. Unsupported: two glyphs side by side.
    flagSupport = pair < single * 1.5;
  } catch {
    flagSupport = false;
  }
  return flagSupport;
}

function flagEmoji(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join('');
}

interface CountryTagProps {
  country: string;
  city?: string;
}

export const CountryTag: React.FC<CountryTagProps> = ({ country, city }) => {
  if (!/^[A-Za-z]{2}$/.test(country)) return null;
  const code = country.toUpperCase();
  const label = city ? `${code} · ${city}` : code;

  return supportsFlagEmoji() ? (
    <span title={label}>
      {flagEmoji(code)}
      {city ? ` ${city}` : ''}
    </span>
  ) : (
    <span
      title={label}
      className="inline-flex items-center gap-1 align-middle px-1.5 py-px rounded bg-slate-100 border border-slate-200 text-[10px] font-bold tracking-wide text-slate-600"
    >
      {code}
      {city && <span className="font-medium text-slate-500">{city}</span>}
    </span>
  );
};
