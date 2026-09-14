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

const SIZE = 132;
const STROKE = 20;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;
// Surface-coloured gap so neighbouring arcs read as separate wedges.
const GAP = 2;

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
    <div className="flex items-center gap-5 flex-wrap sm:flex-nowrap">
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
            stroke="#f1f5f9"
            strokeWidth={STROKE}
          />
          {drawn.map((s) => {
            const len = (s.percent / 100) * C;
            const dash = single ? C : Math.max(len - GAP, 0.5);
            const el = (
              <circle
                key={s.label}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke={s.color}
                strokeWidth={STROKE}
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return el;
          })}
        </g>
        <text
          x="50%"
          y="47%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-slate-900 font-extrabold"
          style={{ fontSize: 22 }}
        >
          {centerValue}
        </text>
        <text
          x="50%"
          y="63%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-slate-400"
          style={{ fontSize: 9 }}
        >
          {centerLabel}
        </text>
      </svg>

      {/* Every slice is named and numbered here, so identity never rests on
          colour alone. */}
      <ul className="flex-1 min-w-0 space-y-2">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${s.chipClass}`} aria-hidden="true" />
            <span className="text-sm text-slate-600 flex-1 min-w-0 leading-tight">{s.label}</span>
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
