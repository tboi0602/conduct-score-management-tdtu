"use client";

import Link from "next/link";
import { WifiOff } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";

export default function OfflinePage() {
  const { locale } = useLanguage();
  const vi = locale === "vi";
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[#f5f7fa] p-5">
      <section className="w-full max-w-lg rounded-[28px] border border-[#d9e3ee] bg-white p-8 text-center shadow-[0_24px_60px_-42px_rgba(16,42,80,.65)]">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#edf4fc] text-[#154a9b]">
          <WifiOff />
        </span>
        <h1 className="mt-5 text-2xl font-bold text-[#102a50]">
          {vi ? "Bạn đang ngoại tuyến" : "You are offline"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#66758a]">
          {vi
            ? "Tài nguyên đã mở trước đó vẫn có thể dùng. Dữ liệu sẽ được đồng bộ khi kết nối trở lại."
            : "Previously opened resources remain available. Data will sync when the connection returns."}
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-[#154a9b] px-5 text-sm font-bold text-white"
        >
          {vi ? "Về tổng quan" : "Back to dashboard"}
        </Link>
      </section>
    </main>
  );
}
