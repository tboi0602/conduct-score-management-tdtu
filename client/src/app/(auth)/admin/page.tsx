"use client";

import Link from "next/link";

import { AuthSplitShell } from "@/components/auth/AuthSplitShell";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
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
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#263b58]">
            {message.admin.username}
          </label>
          <input
            id="email"
            name="email"
            type="text"
            autoComplete="username"
            required
            placeholder={message.admin.usernamePlaceholder}
            className="min-h-12 w-full rounded-xl border border-[#cad5e5] bg-[#fbfcfe] px-4 text-sm text-[#102a50] outline-none transition placeholder:text-[#98a4b5] hover:border-[#afc1d7] focus:border-[#154a9b] focus:bg-white focus:ring-4 focus:ring-[#154a9b]/10"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-4">
            <label htmlFor="password" className="text-sm font-medium text-[#263b58]">
              {message.admin.password}
            </label>
            <span className="text-xs text-[#7a8799]">{message.admin.passwordHint}</span>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder={message.admin.passwordPlaceholder}
            className="min-h-12 w-full rounded-xl border border-[#cad5e5] bg-[#fbfcfe] px-4 text-sm text-[#102a50] outline-none transition placeholder:text-[#98a4b5] hover:border-[#afc1d7] focus:border-[#154a9b] focus:bg-white focus:ring-4 focus:ring-[#154a9b]/10"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-12 w-full rounded-xl bg-[#154a9b] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_30px_-18px_rgba(21,74,155,.85)] transition hover:-translate-y-0.5 hover:bg-[#103f85] focus-visible:ring-4 focus-visible:ring-[#154a9b]/20 active:translate-y-0 active:scale-[.99] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-65"
        >
          {isSubmitting ? (
            <LoadingSpinner label={message.admin.submitting} />
          ) : (
            message.admin.submit
          )}
        </button>

        {error ? (
          <p role="alert" className="text-sm leading-5 text-red-600">
            {error}
          </p>
        ) : null}
      </form>

      <div className="my-6 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-[#e1e8f2]" />
        <span className="text-xs font-semibold uppercase tracking-wider text-[#7a8799]">
          {message.admin.orGoogle}
        </span>
        <span className="h-px flex-1 bg-[#e1e8f2]" />
      </div>

      <GoogleSignInButton mode="ADMIN" />

      <div className="mt-8 border-t border-[#e1e8f2] pt-6 text-center">
        <Link href="/login" className="text-sm font-medium text-[#154a9b] hover:underline">
          {message.admin.back}
        </Link>
      </div>
    </AuthSplitShell>
  );
}
