"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SelectOption = {
  value: string;
  label: string;
};

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
  name,
  disabled = false,
  className = "",
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder: string;
  name?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setMenuPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
      }
    };
    updatePosition();
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!containerRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ?? placeholder}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            setOpen(false);
          }
        }}
        onClick={() => setOpen((current) => !current)}
        className={`flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-white px-2.5 text-left text-xs outline-none transition focus-visible:outline-none ${
          open ? "border-[#154a9b]" : "border-[#cdd9e7] hover:border-[#9eb3cd]"
        } disabled:cursor-not-allowed disabled:bg-[#f1f4f7] disabled:text-[#9ba7b7]`}
      >
        <span className={`truncate ${selected ? "text-[#263b58]" : "text-[#8997aa]"}`}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-[#6e8199] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && menuPos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={dropdownRef}
              role="listbox"
              style={{
                position: "fixed",
                top: menuPos.top,
                left: menuPos.left,
                width: menuPos.width,
                zIndex: 9999,
              }}
              className="max-h-64 overflow-y-auto rounded-md border border-[#d8e1ec] bg-white p-1 shadow-[0_18px_42px_-18px_rgba(16,42,80,.35)]"
            >
              <button
                type="button"
                role="option"
                aria-selected={!value}
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm text-[#738298] transition hover:bg-[#f1f5fa]"
              >
                <span>{placeholder}</span>
                {!value ? <Check size={15} className="text-[#154a9b]" /> : null}
              </button>
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left text-sm transition ${
                    option.value === value
                      ? "bg-[#eaf2fb] font-semibold text-[#154a9b]"
                      : "text-[#40546f] hover:bg-[#f3f6fa]"
                  }`}
                >
                  <span>{option.label}</span>
                  {option.value === value ? <Check size={15} className="shrink-0" /> : null}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
