"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AuthSplitShell } from "@/components/auth/AuthSplitShell";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useApi } from "@/hooks/api/useApi";
import { saveAuthSession } from "@/lib/auth-storage";
import { loginStudent } from "@/services/auth";

export default function LoginPage() {
  const router = useRouter();
  const { locale, message } = useLanguage();
  const { execute, isLoading, error } = useApi();
  const [studentCode, setStudentCode] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await execute(() => loginStudent(studentCode, password), {
      onSuccess: (session) => {
        saveAuthSession(session);
        router.replace("/dashboard");
      },
    });
  };

  return (
    <AuthSplitShell
      eyebrow={message.login.eyebrow}
      title={message.login.title}
      description={message.login.description}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={locale === "vi" ? "Mã số sinh viên" : "Student code"}
          value={studentCode}
          onChange={(e) => setStudentCode(e.target.value)}
          placeholder="52200001"
          required
          autoComplete="username"
        />
        <Input
          label={locale === "vi" ? "Mật khẩu" : "Password"}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        {error ? (
          <p className="rounded-lg bg-[#fff1f2] px-3 py-2 text-xs text-[#b72e3f]">{error}</p>
        ) : null}
        <Button type="submit" loading={isLoading} className="w-full">
          {locale === "vi" ? "Đăng nhập" : "Sign in"}
        </Button>
      </form>

      <div className="mt-10 border-t border-[#e1e8f2] pt-6 text-center">
        <Link href="/admin" className="text-sm font-medium text-[#154a9b] hover:underline">
          {message.login.adminLink}
        </Link>
      </div>
    </AuthSplitShell>
  );
}
