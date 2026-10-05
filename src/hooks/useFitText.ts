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

        const cs = window.getComputedStyle(container);
        const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
        const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);

        const availW = container.clientWidth - padX;
        const availH = container.clientHeight - padY;

        if (availW <= 10 || availH <= 10) {
          isFitting = false;
          return;
        }

        const isMobile = window.innerWidth < 700;
        const minFont = isMobile ? 11 : 13;
        const maxFont = Math.max(minFont, isMobile ? Math.min(window.innerWidth * 0.12, 40) : Math.min(window.innerWidth * 0.12, 120));

        const checkOverflow = (fontSize: number) => {
          // 1. Text rendered height exceeds container available height
          if (textEl.offsetHeight > availH + 0.5) return true;

          // 2. Line clamp: if text wrapped past 4 lines, scrollHeight exceeds offsetHeight by > half a line
          if ((textEl.scrollHeight - textEl.offsetHeight) > (fontSize * 0.6)) return true;

          // 3. Horizontal overflow: any word or line wider than available width
          if (textEl.scrollWidth > availW + 2) return true;

          // 4. Container scroll overflow: container itself must not scroll
          if (container.scrollHeight > container.clientHeight + 0.5) return true;
          if (container.scrollWidth > container.clientWidth + 0.5) return true;

          return false;
        };

        // Binary search between minFont and maxFont across 14 steps for high precision
        let low = minFont;
        let high = maxFont;
        let best = minFont;

        for (let i = 0; i < 14; i++) {
          const mid = (low + high) / 2;
          textEl.style.fontSize = `${mid}px`;

          if (!checkOverflow(mid)) {
            best = mid;
            low = mid; // fits: try larger
          } else {
            high = mid; // overflows: try smaller
          }
        }

        let finalSize = Math.floor(best);
        textEl.style.fontSize = `${finalSize}px`;

        // Verification safety loop: decrement by 1px if needed
        while (finalSize > minFont && checkOverflow(finalSize)) {
          finalSize -= 1;
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
