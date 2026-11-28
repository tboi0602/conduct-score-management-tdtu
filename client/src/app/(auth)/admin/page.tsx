"use client";

import Link from "next/link";

import { AuthSplitShell } from "@/components/auth/AuthSplitShell";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAdminLogin } from "@/hooks/auth/useAdminLogin";

export default function AdminLoginPage() {
  const { message } = useLanguage();
  const { error, handleSubmit, isSubmitting } = useAdminLogin();

  return (
    <AuthSplitShell
      eyebrow={message.admin.eyebrow}
      title={message.admin.title}
      description={message.admin.description}
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <Input
          id="email"
          name="email"
          type="text"
          autoComplete="username"
          required
          label={message.admin.username}
          placeholder={message.admin.usernamePlaceholder}
          className="min-h-12 rounded-xl bg-[#fbfcfe] px-4"
        />

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-4">
            <label htmlFor="password" className="text-sm font-medium text-[#263b58]">
              {message.admin.password}
            </label>
            <span className="text-xs text-[#7a8799]">{message.admin.passwordHint}</span>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder={message.admin.passwordPlaceholder}
            className="min-h-12 rounded-xl bg-[#fbfcfe] px-4"
          />
        </div>

        <Button
          type="submit"
          loading={isSubmitting}
          className="min-h-12 w-full rounded-xl text-sm font-bold"
        >
          {isSubmitting ? message.admin.submitting : message.admin.submit}
        </Button>

        {error ? (
          <p role="alert" className="text-sm leading-5 text-red-600">
            {error}
          </p>
        ) : null}
      </form>

      <div className="mt-8 border-t border-[#e1e8f2] pt-6 text-center">
        <Link href="/login" className="text-sm font-medium text-[#154a9b] hover:underline">
          {message.admin.back}
        </Link>
      </div>
    </AuthSplitShell>
  );
}
