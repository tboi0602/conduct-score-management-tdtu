"use client";

import { useEffect, useState } from "react";

export function useClock(intervalMilliseconds = 1_000) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), intervalMilliseconds);
    return () => window.clearInterval(timer);
  }, [intervalMilliseconds]);

  return now;
}
