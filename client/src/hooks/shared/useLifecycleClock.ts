"use client";

import { useEffect, useMemo, useState } from "react";

const MAX_TIMEOUT_MILLISECONDS = 2_147_483_647;

export function useLifecycleClock(boundaries: Array<number | null | undefined>) {
  const [now, setNow] = useState(() => Date.now());
  const boundaryKey = useMemo(
    () =>
      boundaries
        .filter((boundary): boundary is number => Number.isFinite(boundary))
        .sort((left, right) => left - right)
        .join(","),
    [boundaries],
  );

  useEffect(() => {
    const parsedBoundaries = boundaryKey
      ? boundaryKey.split(",").map((boundary) => Number(boundary))
      : [];

    const refresh = () => setNow(Date.now());
    const currentTime = Date.now();
    const nextBoundary = parsedBoundaries.find((boundary) => boundary > currentTime);
    const delay = nextBoundary
      ? Math.min(Math.max(nextBoundary - currentTime + 25, 0), MAX_TIMEOUT_MILLISECONDS)
      : null;
    const timer = delay === null ? null : window.setTimeout(refresh, delay);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", refresh);

    return () => {
      if (timer !== null) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", refresh);
    };
  }, [boundaryKey, now]);

  return now;
}
