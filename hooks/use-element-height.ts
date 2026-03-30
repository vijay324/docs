"use client";

import * as React from "react";

/**
 * Tracks an element's offset height (updates on resize, including when children change).
 * Useful for offsetting scrollable main content under an absolutely positioned header.
 */
export function useElementHeight(elementRef: React.RefObject<HTMLElement | null>) {
  const [height, setHeight] = React.useState<number | null>(null);

  React.useLayoutEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    const update = () => {
      setHeight(el.offsetHeight);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [elementRef]);

  return height;
}
