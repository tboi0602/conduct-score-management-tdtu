"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

type ScanSource = "STAFF_BARCODE" | "MANUAL_ENTRY";

export function useBarcodeScanner({
  disabled,
  onSubmit,
}: {
  disabled: boolean;
  onSubmit: (code: string, source: ScanSource) => Promise<unknown>;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const firstCharacterAt = useRef(0);
  const lastCharacterAt = useRef(0);
  const submitting = useRef(false);

  const onChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    const now = performance.now();
    if (!next) firstCharacterAt.current = 0;
    else if (!firstCharacterAt.current) firstCharacterAt.current = now;
    lastCharacterAt.current = now;
    setValue(next);
  }, []);

  const submit = useCallback(
    async (source: ScanSource) => {
      const code = value.trim();
      if (!code || disabled || submitting.current) return;
      submitting.current = true;
      try {
        await onSubmit(code, source);
        setValue("");
        firstCharacterAt.current = 0;
        lastCharacterAt.current = 0;
      } catch {
        // The mutation displays the localized error toast.
      } finally {
        submitting.current = false;
        inputRef.current?.focus();
      }
    },
    [disabled, onSubmit, value],
  );

  useEffect(() => {
    const code = value.trim();
    if (disabled || code.length < 4) return;
    const duration = lastCharacterAt.current - firstCharacterAt.current;
    const scannerThreshold = Math.max(80, (code.length - 1) * 50);
    if (duration > scannerThreshold) return;
    const timer = window.setTimeout(() => void submit("STAFF_BARCODE"), 100);
    return () => window.clearTimeout(timer);
  }, [disabled, submit, value]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter" || disabled) return;
      event.preventDefault();
      const duration = lastCharacterAt.current - firstCharacterAt.current;
      const source: ScanSource =
        value.trim().length >= 4 && duration <= 800 ? "STAFF_BARCODE" : "MANUAL_ENTRY";
      void submit(source);
    },
    [disabled, submit, value],
  );

  return { value, inputRef, onChange, onKeyDown };
}
