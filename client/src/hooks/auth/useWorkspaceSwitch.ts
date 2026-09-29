"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { clearAuthSession, saveAuthSession } from "@/lib/auth-storage";
import { logoutSession, switchAccessMode, type LoginMode } from "@/services/auth";

const MANAGEMENT_ROLES = new Set(["ADMIN", "STUDENT_AFFAIRS", "EVENT_ORGANIZER"]);

export function useWorkspaceSwitch(roleNames: string[]) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { locale } = useLanguage();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: (mode: LoginMode) => switchAccessMode(mode),
    onSuccess: (session, mode) => {
      saveAuthSession(session);
      queryClient.clear();
      showToast(
        mode === "STUDENT"
          ? locale === "vi"
            ? "Đã chuyển sang khu vực sinh viên."
            : "Switched to the student workspace."
          : locale === "vi"
            ? "Đã chuyển sang khu vực quản lý."
            : "Switched to the management workspace.",
      );
      router.replace(mode === "STUDENT" ? "/dashboard" : "/admin/dashboard");
    },
    onError: () => {
      showToast(
        locale === "vi"
          ? "Không thể chuyển khu vực. Vui lòng thử lại."
          : "Unable to switch workspace. Please try again.",
        "error",
      );
    },
  });

  return {
    canUseStudentWorkspace: roleNames.includes("STUDENT"),
    canUseManagementWorkspace: roleNames.some((role) => MANAGEMENT_ROLES.has(role)),
    isSwitching: mutation.isPending,
    switchWorkspace: mutation.mutate,
    logout: async () => {
      await logoutSession().catch(() => undefined);
      queryClient.clear();
      clearAuthSession();
      router.replace("/login");
    },
  };
}
