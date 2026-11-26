"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-[#154a9b] text-white hover:bg-[#103f85] focus-visible:ring-[#154a9b]/30",
  secondary:
    "border border-[#cdd9e7] bg-white text-[#263b58] hover:bg-[#f7f9fc] focus-visible:ring-[#154a9b]/20",
  ghost: "text-[#52647d] hover:bg-[#eef3f9] hover:text-[#154a9b] focus-visible:ring-[#154a9b]/20",
  danger: "bg-[#b72e3f] text-white hover:bg-[#9c2332] focus-visible:ring-[#b72e3f]/30",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    >
      {loading ? <LoadingSpinner label="" /> : null}
      {children}
    </button>
  );
}
