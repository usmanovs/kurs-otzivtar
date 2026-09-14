import { useEffect } from 'react';

/**
 * Freezes the page behind an open modal.
 *
 * Without this the document keeps its own scroll, so a drag inside the modal
 * can chain out to the page underneath — the modal reads as stuck even though
 * its scroll container is working fine. overscroll-contain helps at the
 * boundaries but does not stop the document scrolling in the first place.
 *
 * Reference counted, because these modals nest: the detail modal opens the
 * verify and response modals on top of itself, and the inner one closing must
 * not unfreeze the page while the outer one is still up.
 */
let lockCount = 0;
let release: (() => void) | null = null;

export function useBodyScrollLock(active = true): void {
  useEffect(() => {
    if (!active) return;

    if (lockCount === 0) {
      const { body, documentElement } = document;
      const scrollY = window.scrollY;
      const prevOverflow = body.style.overflow;
      const prevPaddingRight = body.style.paddingRight;
      // Desktop loses its scrollbar when we hide overflow; pad by its width so
      // the layout underneath does not jump sideways.
      const scrollbarWidth = window.innerWidth - documentElement.clientWidth;

      body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

      release = () => {
        body.style.overflow = prevOverflow;
        body.style.paddingRight = prevPaddingRight;
        // Some browsers reset scroll position when overflow is restored.
        window.scrollTo(0, scrollY);
      };
    }

    lockCount += 1;

    return () => {
      lockCount -= 1;
      if (lockCount === 0 && release) {
        release();
        release = null;
      }
    };
  }, [active]);
}
