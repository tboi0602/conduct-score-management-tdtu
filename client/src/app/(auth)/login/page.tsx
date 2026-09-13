"use client";

import Link from "next/link";

import { AuthSplitShell } from "@/components/auth/AuthSplitShell";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { useLanguage } from "@/components/i18n/LanguageProvider";

export default function LoginPage() {
  const { message } = useLanguage();

  return (
    <AuthSplitShell
      eyebrow={message.login.eyebrow}
      title={message.login.title}
      description={message.login.description}
    >
      <GoogleSignInButton mode="STUDENT" />

      <p className="mt-5 text-center text-xs leading-5 text-[#7a8799]">
        {message.login.emailPrefix} <strong>@student.tdtu.edu.vn</strong>{" "}
        {message.login.emailConnector} <strong>@tdtu.edu.vn</strong>.
      </p>

      <div className="mt-10 border-t border-[#e1e8f2] pt-6 text-center">
        <Link href="/admin" className="text-sm font-medium text-[#154a9b] hover:underline">
          {message.login.adminLink}
        </Link>
      </div>
    </AuthSplitShell>
  );
}
