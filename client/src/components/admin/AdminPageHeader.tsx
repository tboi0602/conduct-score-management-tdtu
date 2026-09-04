import type { ReactNode } from "react";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[11px] font-bold tracking-[0.18em] text-[#154a9b]">{eyebrow}</p>
        <h1 className="mt-2 text-[2rem] font-bold tracking-[-.035em] text-[#102a50]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66758a]">{description}</p>
      </div>
      {action}
    </header>
  );
}
