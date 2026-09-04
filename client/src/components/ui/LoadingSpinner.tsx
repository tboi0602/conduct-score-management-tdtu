type LoadingSpinnerProps = {
  label: string;
  tone?: "light" | "brand";
};

export function LoadingSpinner({ label, tone = "light" }: LoadingSpinnerProps) {
  return (
    <span role="status" className="inline-flex items-center justify-center">
      <span
        aria-hidden="true"
        className={`size-5 animate-spin rounded-full border-2 ${tone === "brand" ? "border-[#154a9b]/25 border-t-[#154a9b]" : "border-white/40 border-t-white"}`}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
