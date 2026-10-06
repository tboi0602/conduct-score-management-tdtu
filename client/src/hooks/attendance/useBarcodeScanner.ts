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

  const submit = useCallback(
    async (codeToSubmit: string, source: ScanSource) => {
      const code = codeToSubmit.trim();
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
    [disabled, onSubmit],
  );

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const next = event.target.value;
      const now = performance.now();
      if (!next) {
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
      // Nếu quét bằng máy quét mã vạch (ví dụ 9 ký tự đổ vào cùng lúc hoặc thời gian nhập cực nhanh < 150ms)
      if (trimmed.length >= 8 && trimmed.length <= 12) {
        const duration = now - firstCharacterAt.current;
        // Máy quét barcode bắn toàn bộ chuỗi gần như tức thì (< 150ms)
        if (duration < 150) {
          void submit(trimmed, "STAFF_BARCODE");
        }
      }
    },
    [submit],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter" || disabled) return;
      event.preventDefault();
      const code = value.trim();
      if (!code) return;
      const duration = lastCharacterAt.current - firstCharacterAt.current;
      const source: ScanSource =
        code.length >= 4 && duration <= 800 ? "STAFF_BARCODE" : "MANUAL_ENTRY";
      void submit(code, source);
    },
    [disabled, submit, value],
  );

  return { value, inputRef, onChange, onKeyDown };
}
