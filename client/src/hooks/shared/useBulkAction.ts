"use client";

import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useToast } from "@/components/ui/ToastProvider";
import type { BulkActionResponse } from "@/types/admin";

export function useBulkAction({
  mutationFn,
  queryKeys,
}: {
  mutationFn: (ids: string[]) => Promise<BulkActionResponse>;
  queryKeys: QueryKey[];
}) {
  const client = useQueryClient();
  const { locale } = useLanguage();
  const { showToast } = useToast();

  return useMutation({
    mutationFn,
    onSuccess: async ({ data }) => {
      await Promise.all(queryKeys.map((queryKey) => client.invalidateQueries({ queryKey })));
      const succeeded = data.succeededIds.length;
      const failed = data.failed.length;
      if (failed === 0) {
        showToast(
          locale === "vi"
            ? `Đã xử lý thành công ${succeeded} mục.`
            : `${succeeded} item(s) processed successfully.`,
        );
      } else {
        showToast(
          locale === "vi"
            ? `Đã xử lý ${succeeded} mục; ${failed} mục không thể xử lý.`
            : `${succeeded} item(s) processed; ${failed} item(s) could not be processed.`,
          "error",
        );
      }
    },
    onError: () => {
      showToast(
        locale === "vi"
          ? "Không thể thực hiện thao tác hàng loạt. Vui lòng thử lại."
          : "Unable to complete the bulk action. Please try again.",
        "error",
      );
    },
  });
}
