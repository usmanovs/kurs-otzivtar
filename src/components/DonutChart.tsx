import React from 'react';

export interface DonutSlice {
  label: string;
  count: number;
  percent: number;
  /** Stroke colour for the arc. */
  color: string;
  /** Matching background for the legend chip. */
  chipClass: string;
}

interface DonutChartProps {
  slices: DonutSlice[];
  /** Big number in the hole. */
  centerValue: string;
  centerLabel: string;
  ariaLabel: string;
}

const SIZE = 112;
const STROKE = 14;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;
// Wide enough to clear the rounded caps on both neighbours.
const GAP = 7;

export const DonutChart: React.FC<DonutChartProps> = ({
  slices,
  centerValue,
  centerLabel,
  ariaLabel,
}) => {
  // A zero-width arc is not a wedge — dropping these also avoids a stray gap
  // notch where an empty category would have been.
  const drawn = slices.filter((s) => s.percent > 0);
  const single = drawn.length === 1;

  let offset = 0;

  return (
    <div className="flex items-center justify-center gap-5 sm:gap-7 flex-wrap sm:flex-nowrap">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={ariaLabel}
        className="shrink-0"
      >
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="#f8fafc"
            strokeWidth={STROKE}
          />
          {drawn.map((s) => {
            const len = (s.percent / 100) * C;
            // Round caps add ~STROKE/2 of visual length at each end, so the
            // gap has to absorb that as well as separate the arcs.
            const dash = single ? C : Math.max(len - GAP, 1);
            const el = (
              <circle
                key={s.label}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke={s.color}
                strokeWidth={STROKE}
                strokeLinecap={single ? 'butt' : 'round'}
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={-(offset + GAP / 2)}
              />
            );
            offset += len;
            return el;
          })}
        </g>
        <text
          x="50%"
          y="45%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-slate-900 font-extrabold"
          style={{ fontSize: 24, letterSpacing: '-0.02em' }}
        >
          {centerValue}
        </text>
        <text
          x="50%"
          y="62%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-slate-400 font-medium"
          style={{ fontSize: 9.5 }}
        >
          {centerLabel}
        </text>
      </svg>

      {/* Every slice is named and numbered here, so identity never rests on
          colour alone. */}
      {/* Fixed width rather than flex-1: stretching it left short labels like
          "Эркек" marooned from their own numbers. */}
      <ul className="w-full sm:w-auto sm:min-w-[190px] space-y-2.5">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.chipClass}`} aria-hidden="true" />
            <span className="text-sm text-slate-600 flex-1 min-w-0 leading-tight pr-2">{s.label}</span>
            <span className="text-sm font-bold text-slate-900 tabular-nums shrink-0">
              {s.percent.toFixed(0)}%
            </span>
            <span className="text-xs text-slate-400 w-8 text-right tabular-nums shrink-0">
              {s.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
