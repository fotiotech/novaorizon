"use client";

import { useEffect, useState } from "react";

/**
 * Returns `true` when the viewport width is below Tailwind's `md` breakpoint
 * (768px), `false` otherwise.
 *
 * SSR-safe: the initial server render returns `false`, and the first client
 * effect corrects the value to match the actual viewport. Subsequent
 * orientation changes / resizes are observed via `matchMedia`.
 *
 * @param breakpoint  Max width (in px) considered "mobile". Defaults to 767.
 */
export function useIsMobile(breakpoint: number = 767): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const update = () => setIsMobile(mql.matches);

    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [breakpoint]);

  return isMobile;
}

export default useIsMobile;
