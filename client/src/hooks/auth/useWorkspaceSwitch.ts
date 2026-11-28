"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { useToast } from "@/components/ui/ToastProvider";
import { extractServerErrorMessage } from "@/hooks/api/useApi";
import { clearAuthSession, saveAuthSession } from "@/lib/auth-storage";
import { logoutSession, switchAccessMode, type LoginMode } from "@/services/auth";

const STUDENT_ONLY_PERMISSIONS = new Set([
  "event.read-own",
  "conduct-score.read-own",
  "appeal.read-own",
  "appeal.create",
  "notification.read-own",
  "attendance.scan",
  "profile.update-own",
]);

export function useWorkspaceSwitch(
  isStudent?: boolean,
  permissions: Array<{ permission: string }> = [],
) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useAdminTranslations();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: (mode: LoginMode) => switchAccessMode(mode),
    onSuccess: (session, mode) => {
      saveAuthSession(session);
      queryClient.clear();
      showToast(mode === "STUDENT" ? t.switchedToStudent : t.switchedToManagement);
      router.replace(mode === "STUDENT" ? "/dashboard" : "/admin/dashboard");
    },
    onError: (error) => {
      showToast(extractServerErrorMessage(error, t.switchWorkspaceError), "error");
    },
  });

  const hasManagementAccess = permissions.some(
    ({ permission }) => permission === "*" || !STUDENT_ONLY_PERMISSIONS.has(permission),
  );

  return {
    canUseStudentWorkspace: isStudent === true,
    canUseManagementWorkspace: isStudent === false || hasManagementAccess,
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
