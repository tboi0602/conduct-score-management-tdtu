export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-[var(--border)] bg-[var(--surface)] p-5 lg:border-b-0 lg:border-r">
        <p className="font-semibold">Conduct Score</p>
        <p className="mt-1 text-sm text-[var(--muted)]">Application shell</p>
      </aside>
      <main className="min-w-0 p-5 sm:p-8">{children}</main>
    </div>
  );
}
