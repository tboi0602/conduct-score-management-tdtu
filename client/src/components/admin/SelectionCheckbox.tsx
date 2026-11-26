"use client";

import { useEffect, useRef } from "react";

export function SelectionCheckbox({
  checked,
  indeterminate = false,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={label}
      disabled={disabled}
      className="h-4 w-4 rounded border-[#aebdce] accent-[#154a9b] disabled:cursor-not-allowed disabled:opacity-40"
    />
  );
}
