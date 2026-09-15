import React from 'react';

export const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void; label: string; id: string }> = ({
  checked,
  onChange,
  label,
  id,
}) => (
  <button
    type="button"
    id={id}
    role="switch"
    aria-checked={checked}
    onClick={onChange}
    className="inline-flex items-center gap-2 cursor-pointer"
  >
    <span
      className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-indigo-600' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
        }`}
      />
    </span>
    <span className="text-xs sm:text-sm font-medium text-slate-700 whitespace-nowrap">{label}</span>
  </button>
);
