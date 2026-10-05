import { useEffect, useRef } from 'react';

/**
 * useFitText
 * Measures .name-area container (width/height via ResizeObserver) and binary-searches
 * for the largest font size that fits fully inside without clipping or overflowing.
 * Recomputes on resize, font load (document.fonts.ready) and reveal state changes.
 */
export function useFitText(text: string, isRevealed: boolean = true) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isRevealed || !text) return;

    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl) return;

    let isFitting = false;

    const fit = () => {
      if (isFitting) return;
      isFitting = true;

      requestAnimationFrame(() => {
        if (!container || !textEl) {
          isFitting = false;
          return;
        }

        const clientW = container.clientWidth;
        const clientH = container.clientHeight;

        if (clientW <= 0 || clientH <= 0) {
          isFitting = false;
          return;
        }

        const isMobile = window.innerWidth < 700;
        const minFont = 16;
        const maxFont = Math.max(minFont, isMobile ? window.innerWidth * 0.09 : window.innerWidth * 0.11);

        const checkOverflow = () => {
          if (container.scrollHeight > container.clientHeight) return true;
          if (container.scrollWidth > container.clientWidth) return true;
          if (textEl.scrollHeight > textEl.clientHeight) return true;
          if (textEl.scrollWidth > textEl.clientWidth) return true;

          const cRect = container.getBoundingClientRect();
          const tRect = textEl.getBoundingClientRect();
          if (tRect.height > cRect.height + 0.5) return true;
          if (tRect.width > cRect.width + 0.5) return true;

          return false;
        };

        // Binary search between min 16px and max 11vw (9vw mobile), 10 steps
        let low = minFont;
        let high = maxFont;
        let best = minFont;

        for (let i = 0; i < 10; i++) {
          const mid = (low + high) / 2;
          textEl.style.fontSize = `${mid}px`;

          if (!checkOverflow()) {
            best = mid;
            low = mid; // fits: try larger
          } else {
            high = mid; // overflows: try smaller
          }
        }

        let finalSize = Math.floor(best);
        textEl.style.fontSize = `${finalSize}px`;

        // Verification: reduce by 2px until it fits fully
        while (finalSize > 8 && checkOverflow()) {
          finalSize -= 2;
          textEl.style.fontSize = `${finalSize}px`;
        }

        isFitting = false;
      });
    };

    fit();

    // 1. ResizeObserver for container
    const ro = new ResizeObserver(() => fit());
    ro.observe(container);

    // 2. Window resize listener
    window.addEventListener('resize', fit);

    // 3. Document font load
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => fit());
    }

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [text, isRevealed]);

  return { containerRef, textRef };
}
