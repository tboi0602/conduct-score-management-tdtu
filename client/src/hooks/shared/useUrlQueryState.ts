"use client";

import { useCallback, useEffect, useState } from "react";

export function useUrlQueryState(key: string, defaultValue = "") {
  const [value, setValue] = useState<string>(() => {
    if (typeof window === "undefined") return defaultValue;
    const params = new URLSearchParams(window.location.search);
    return params.get(key) ?? defaultValue;
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const current = params.get(key) ?? defaultValue;
    if (current !== value) setValue(current);
  }, [key, defaultValue]);

  const update = useCallback(
    (next: string) => {
      setValue(next);
      if (typeof window === "undefined") return;
      const url = new URL(window.location.href);
      if (!next || next === defaultValue) {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, next);
      }
      window.history.replaceState(null, "", url.pathname + url.search);
    },
    [key, defaultValue],
  );

  return [value, update] as const;
}
