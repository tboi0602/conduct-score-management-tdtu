"use client";

import { Check, LoaderCircle, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { SelectOption } from "@/components/ui/CustomSelect";

export function SearchableCombobox({
  selected,
  search,
  onSearchChange,
  onSelect,
  options,
  placeholder,
  ariaLabel,
  clearLabel,
  loadingLabel,
  emptyMessage,
  minimumCharactersMessage,
  errorMessage,
  retryLabel,
  onRetry,
  loading = false,
  disabled = false,
  minimumSearchLength = 3,
}: {
  selected: SelectOption | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (option: SelectOption | null) => void;
  options: SelectOption[];
  placeholder: string;
  ariaLabel: string;
  clearLabel: string;
  loadingLabel: string;
  emptyMessage: string;
  minimumCharactersMessage: string;
  errorMessage?: string;
  retryLabel: string;
  onRetry?: () => void;
  loading?: boolean;
  disabled?: boolean;
  minimumSearchLength?: number;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const trimmedSearch = search.trim();
  const searchTooShort = trimmedSearch.length > 0 && trimmedSearch.length < minimumSearchLength;
  const visibleOptions = searchTooShort ? [] : options;

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  useEffect(() => {
    setActiveIndex(visibleOptions.length > 0 ? 0 : -1);
  }, [options, searchTooShort]);

  const choose = (option: SelectOption) => {
    onSelect(option);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search
          size={17}
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#718096]"
        />
        <input
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          aria-activedescendant={
            open && activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
          }
          aria-label={ariaLabel}
          aria-busy={loading}
          disabled={disabled}
          value={search}
          placeholder={placeholder}
          autoComplete="off"
          maxLength={100}
          onFocus={(event) => {
            setOpen(true);
            if (selected) event.currentTarget.select();
          }}
          onChange={(event) => {
            onSearchChange(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
              return;
            }
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              if (visibleOptions.length === 0) return;
              const step = event.key === "ArrowDown" ? 1 : -1;
              setActiveIndex((current) => {
                const startingIndex = current < 0 ? (step > 0 ? -1 : 0) : current;
                return (startingIndex + step + visibleOptions.length) % visibleOptions.length;
              });
              return;
            }
            if (event.key === "Enter" && open && activeIndex >= 0) {
              event.preventDefault();
              const option = visibleOptions[activeIndex];
              if (option) choose(option);
            }
          }}
          className="h-11 w-full rounded-xl border border-[#cdd9e7] bg-white pl-10 pr-20 text-sm text-[#263b58] outline-none transition placeholder:text-[#8997aa] focus:border-[#154a9b] focus:ring-4 focus:ring-[#154a9b]/10 disabled:cursor-not-allowed disabled:bg-[#f1f4f7]"
        />
        {loading ? (
          <span
            role="status"
            aria-label={loadingLabel}
            className="absolute right-11 top-1/2 -translate-y-1/2 text-[#154a9b]"
          >
            <LoaderCircle size={17} className="animate-spin" />
          </span>
        ) : null}
        {search || selected ? (
          <button
            type="button"
            aria-label={clearLabel}
            onClick={() => {
              onSearchChange("");
              onSelect(null);
              setOpen(true);
            }}
            disabled={disabled}
            className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-[#718096] transition hover:bg-[#edf2f8] hover:text-[#154a9b] disabled:opacity-40"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>

      {open ? (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-[#d8e1ec] bg-white p-1.5 shadow-[0_18px_42px_-18px_rgba(16,42,80,.35)]"
        >
          {searchTooShort ? (
            <p className="px-3 py-2.5 text-sm text-[#66758a]">{minimumCharactersMessage}</p>
          ) : errorMessage ? (
            <div className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm text-[#b72e3f]">
              <span>{errorMessage}</span>
              {onRetry ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className="shrink-0 font-bold text-[#154a9b] hover:underline"
                >
                  {retryLabel}
                </button>
              ) : null}
            </div>
          ) : loading && visibleOptions.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-[#66758a]">{loadingLabel}</p>
          ) : visibleOptions.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-[#66758a]">{emptyMessage}</p>
          ) : (
            visibleOptions.map((option, index) => (
              <button
                id={`${listId}-option-${index}`}
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === selected?.value}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                  index === activeIndex || option.value === selected?.value
                    ? "bg-[#eaf2fb] font-semibold text-[#154a9b]"
                    : "text-[#40546f] hover:bg-[#f3f6fa]"
                }`}
              >
                <span className="truncate">{option.label}</span>
                {option.value === selected?.value ? <Check size={15} className="shrink-0" /> : null}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
