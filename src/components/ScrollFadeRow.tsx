import React, { useCallback, useEffect, useRef, useState } from 'react';

interface ScrollFadeRowProps {
  className?: string;
  children: React.ReactNode;
}

// Narrow on purpose: at 28px the fade washed out the leading letters of the
// next pill, which read as truncated text rather than as "keep scrolling".
const FADE = 14; // px

/**
 * Horizontal scroller that fades whichever edge still has content behind it.
 *
 * Hiding the scrollbar leaves no hint that the row scrolls at all; a fixed
 * right-edge fade errs the other way, showing a cut-off cue even once you've
 * reached the end. Measuring instead means the fade is always truthful — and
 * it costs nothing at wider breakpoints, where the row wraps rather than
 * scrolls and so reports no overflow to fade.
 */
export const ScrollFadeRow: React.FC<ScrollFadeRowProps> = ({ className = '', children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const start = el.scrollLeft > 1;
    const end = el.scrollLeft < max - 1;
    // Bail on an unchanged result: this runs after every render, and a fresh
    // object would re-render forever.
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, []);

  // No dep array — re-measures when the children change too (switching
  // language re-flows the pills without resizing the container).
  useEffect(measure);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Catches the breakpoint flip to a wrapping row, which fires no re-render.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  const maskImage =
    edges.start || edges.end
      ? `linear-gradient(to right, ${
          edges.start ? `transparent 0, #000 ${FADE}px` : '#000 0'
        }, ${edges.end ? `#000 calc(100% - ${FADE}px), transparent 100%` : '#000 100%'})`
      : undefined;

  return (
    <div
      ref={ref}
      onScroll={measure}
      style={maskImage ? { maskImage, WebkitMaskImage: maskImage } : undefined}
      className={className}
    >
      {children}
    </div>
  );
};
