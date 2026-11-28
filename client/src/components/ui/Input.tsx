"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  prefixIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, prefixIcon, className = "", readOnly, ...props },
  ref,
) {
  const inputNode = (
    <div className="relative flex items-center">
      {prefixIcon ? (
        <span className="pointer-events-none absolute left-3 text-[#68788d]">{prefixIcon}</span>
      ) : null}
      <input
        ref={ref}
        readOnly={readOnly}
        className={`h-9 w-full rounded-lg border border-[#cdd9e7] px-3 text-sm text-[#102a50] outline-none transition focus:border-[#154a9b] focus-visible:outline-none ${
          prefixIcon ? "pl-9" : ""
        } ${readOnly ? "cursor-not-allowed bg-[#f4f7fb] text-[#68788d]" : "bg-white"} ${
          error ? "border-[#b72e3f]" : ""
        } ${className}`}
        {...props}
      />
    </div>
  );

  if (!label && !error) return inputNode;

  return (
    <label className="block text-sm font-semibold text-[#263b58]">
      {label ? <span className="mb-1.5 block">{label}</span> : null}
      {inputNode}
      {error ? (
        <span className="mt-1 block text-xs font-normal text-[#b72e3f]">{error}</span>
      ) : null}
    </label>
  );
});
