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
    <header className="relative flex flex-col gap-5 border-b border-[#dfe7f0] pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <span className="h-px w-7 bg-[#154a9b]" aria-hidden="true" />
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#154a9b]">
            {eyebrow}
          </p>
        </div>
        <h1 className="mt-3 text-[2rem] font-bold leading-tight tracking-[-.035em] text-[#102a50] sm:text-[2.25rem]">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#60728a]">{description}</p>
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </header>
  );
}
