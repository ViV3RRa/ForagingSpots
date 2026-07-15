import { useCallback, useEffect, useState, type CSSProperties } from 'react';

/*
 * Scroll-edge tracking for the bottom sheets' pinned header/footer affordances
 * (design: SHEET_CHANGES.md). Thresholds and styles come straight from the
 * prototype: edges at 2px, the detail header's pill collapse at 12px.
 */

interface ScrollEdgeFlags {
  /** scrollTop <= 2 — header hairline/shadow hidden. */
  atTop: boolean;
  /** Bottom edge reached (or content fits) — footer hairline/shadow hidden. */
  atBottom: boolean;
  /** scrollTop > 2. */
  scrolled: boolean;
  /** scrollTop > 12 — the detail sheet's collapsed-pill state. */
  collapsed: boolean;
}

const REST: ScrollEdgeFlags = { atTop: true, atBottom: true, scrolled: false, collapsed: false };

export function useScrollEdges(): ScrollEdgeFlags & {
  /** Attach to the scrollable node (callback ref — the sheets mount their body conditionally). */
  ref: (node: HTMLElement | null) => void;
} {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [flags, setFlags] = useState<ScrollEdgeFlags>(REST);

  const ref = useCallback((next: HTMLElement | null) => setNode(next), []);

  useEffect(() => {
    if (!node) {
      setFlags(REST); // next mount starts affordance-free until measured
      return;
    }

    const measure = () => {
      const { scrollTop, clientHeight, scrollHeight } = node;
      const next: ScrollEdgeFlags = {
        atTop: scrollTop <= 2,
        atBottom: scrollTop + clientHeight >= scrollHeight - 2,
        scrolled: scrollTop > 2,
        collapsed: scrollTop > 12,
      };
      // Only re-render on a boolean flip, not per scrolled pixel
      setFlags((prev) =>
        prev.atTop === next.atTop &&
        prev.atBottom === next.atBottom &&
        prev.scrolled === next.scrolled &&
        prev.collapsed === next.collapsed
          ? prev
          : next
      );
    };

    measure();
    node.addEventListener('scroll', measure, { passive: true });
    // Content growing/shrinking (e.g. images loading) changes atBottom without
    // a scroll event — watch the node and its top-level content blocks.
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    for (const child of Array.from(node.children)) observer.observe(child);

    return () => {
      node.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [node]);

  return { ref, ...flags };
}

/* Shared affordance styles so the three sheets stay identical. */

export const headerEdgeClass = (atTop: boolean) =>
  `border-b transition-[box-shadow,border-color] duration-200 ${
    atTop ? 'border-transparent' : 'border-line2 shadow-[0_8px_16px_-10px_rgba(20,15,8,0.32)]'
  }`;

export const footerEdgeClass = (atBottom: boolean) =>
  `border-t transition-[box-shadow,border-color] duration-200 ${
    atBottom ? 'border-transparent' : 'border-line2 shadow-[0_-6px_16px_-10px_rgba(20,15,8,0.22)]'
  }`;

/** Soft 22px fade under the header once scrolled (mask gradients aren't Tailwind-able). */
export const topMaskStyle = (atTop: boolean): CSSProperties => {
  const mask = atTop ? 'none' : 'linear-gradient(to bottom, transparent 0, #000 22px)';
  return { WebkitMaskImage: mask, maskImage: mask };
};
