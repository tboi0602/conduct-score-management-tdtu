import type { ReactNode } from "react";

export function AdminFormPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-7 border border-[#dbe3ef] bg-white p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-[#102a50]">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}
