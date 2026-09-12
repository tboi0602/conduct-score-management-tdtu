"use client";

import Image from "next/image";
import type { ReactNode } from "react";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";

type AuthSplitShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthSplitShell({ eyebrow, title, description, children }: AuthSplitShellProps) {
  const { message } = useLanguage();

  return (
    <main className="min-h-[100dvh] bg-[#f3f6fa] lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
      <section className="relative hidden min-h-[100dvh] overflow-hidden lg:block">
        <Image
          src="/images/tdtu-campus.png"
          alt="Toàn cảnh khuôn viên Đại học Tôn Đức Thắng"
          fill
          priority
          sizes="60vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,32,70,0.08)_0%,rgba(8,32,70,0.18)_45%,rgba(8,32,70,0.88)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-white xl:p-14">
          <div className="max-w-xl">
            <p className="text-sm font-semibold tracking-[0.16em]">TDTU</p>
            <p className="mt-4 text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
              {message.campusTitle}
            </p>
            <p className="mt-4 max-w-lg text-sm leading-6 text-white/80">
              {message.campusDescription}
            </p>
          </div>
        </div>
      </section>

      <section className="flex min-h-[100dvh] items-center justify-center px-5 py-8 sm:px-10 lg:px-12 xl:px-20">
        <div className="w-full max-w-lg rounded-[28px] border border-[#dae4ef] bg-white p-6 shadow-[0_30px_70px_-48px_rgba(16,42,80,.7)] sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          <div className="flex items-start justify-between gap-6">
            <Image
              src="/images/logo.png"
              alt="Logo Đại học Tôn Đức Thắng"
              width={612}
              height={338}
              priority
              className="h-auto w-[190px] sm:w-[210px]"
            />
            <LanguageSwitcher />
          </div>

          <div className="mt-9 flex items-center gap-2.5">
            <span className="h-px w-7 bg-[#154a9b]" />
            <p className="text-xs font-bold uppercase tracking-[.14em] text-[#154a9b]">{eyebrow}</p>
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-[-.035em] text-[#102a50] sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-[#66758a]">{description}</p>

          <div className="mt-8">{children}</div>

          <p className="mt-10 text-xs leading-5 text-[#7a8799]">{message.terms}</p>
        </div>
      </section>
    </main>
  );
}
