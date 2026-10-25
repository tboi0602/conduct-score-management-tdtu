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
  const autoSubmitTimer = useRef<number | null>(null);

  const clearAutoSubmitTimer = useCallback(() => {
    if (autoSubmitTimer.current !== null) {
      window.clearTimeout(autoSubmitTimer.current);
      autoSubmitTimer.current = null;
    }
  }, []);

  const submit = useCallback(
    async (codeToSubmit: string, source: ScanSource) => {
      const code = codeToSubmit.trim();
      if (!code || disabled || submitting.current) return;
      clearAutoSubmitTimer();
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
    [clearAutoSubmitTimer, disabled, onSubmit],
  );

  useEffect(() => clearAutoSubmitTimer, [clearAutoSubmitTimer]);

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const next = event.target.value.toUpperCase();
      const now = performance.now();
      if (!next) {
        clearAutoSubmitTimer();
        firstCharacterAt.current = 0;
        lastCharacterAt.current = 0;
        setValue("");
        return;
      }

      if (!firstCharacterAt.current) {
        firstCharacterAt.current = now;
      }
      lastCharacterAt.current = now;
      setValue(next);

      const trimmed = next.trim();
      clearAutoSubmitTimer();
      if (trimmed.length >= 4 && trimmed.length <= 20) {
        autoSubmitTimer.current = window.setTimeout(() => {
          autoSubmitTimer.current = null;
          const duration = lastCharacterAt.current - firstCharacterAt.current;
          if (duration <= 800) void submit(trimmed, "STAFF_BARCODE");
        }, 100);
      }
    },
    [clearAutoSubmitTimer, submit],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter" || disabled) return;
      event.preventDefault();
      clearAutoSubmitTimer();
      const code = value.trim();
      if (!code) return;
      const duration = lastCharacterAt.current - firstCharacterAt.current;
      const source: ScanSource =
        code.length >= 4 && duration <= 800 ? "STAFF_BARCODE" : "MANUAL_ENTRY";
      void submit(code, source);
    },
    [clearAutoSubmitTimer, disabled, submit, value],
  );

  const submitManual = useCallback(() => submit(value, "MANUAL_ENTRY"), [submit, value]);

  return { value, inputRef, onChange, onKeyDown, submitManual };
}
