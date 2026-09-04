import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Tooltip } from "@/components/ui/Tooltip";

const tones = {
  brand: "border-[#bfd0e8] bg-[#edf4fc] text-[#154a9b] hover:bg-[#154a9b] hover:text-white",
  neutral: "border-[#dce4ef] bg-white text-[#52647d] hover:border-[#aabbd1] hover:text-[#102a50]",
  danger: "border-[#f2c9ce] bg-[#fff2f3] text-[#bd3343] hover:bg-[#bd3343] hover:text-white",
};

export function IconButton({
  label,
  children,
  tone = "neutral",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
  tone?: keyof typeof tones;
}) {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        aria-label={label}
        className={`inline-grid h-9 w-9 place-items-center rounded-xl border transition-all duration-200 active:scale-[.96] disabled:pointer-events-none disabled:opacity-30 ${tones[tone]} ${className}`}
        {...props}
      >
        {children}
      </button>
    </Tooltip>
  );
}
