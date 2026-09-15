import React from 'react';

/**
 * lucide-react carries no brand marks, so this is the one icon the project
 * draws itself. Sized and stroked to match a lucide icon at the same
 * className, and inherits currentColor like the rest.
 */
export const TikTokIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    className={className}
  >
    <path d="M16.5 3a5.6 5.6 0 0 0 4.5 4.4v2.8a8.4 8.4 0 0 1-4.4-1.4v5.9a6.1 6.1 0 1 1-5.3-6v2.9a3.2 3.2 0 1 0 2.4 3.1V3h2.8Z" />
  </svg>
);
