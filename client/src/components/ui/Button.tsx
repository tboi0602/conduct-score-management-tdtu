"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

const variants: Record<string, string> = {
  primary: "bg-brand text-white hover:bg-brand-700",
  secondary: "bg-gray-100 text-gray-800 hover:bg-gray-200",
  ghost: "bg-transparent hover:bg-gray-100",
  danger: "bg-danger text-white hover:bg-danger-700",
};

const sizes: Record<string, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: Props) {
  return (
    <button
      className={`rounded-xl font-medium transition-colors ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}