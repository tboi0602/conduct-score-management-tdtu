"use client";

import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useAdminTranslations } from "@/hooks/layout/useAdminTranslations";
import { useToast } from "@/components/ui/ToastProvider";
import { extractServerErrorMessage } from "@/hooks/api/useApi";
import type { BulkActionResponse } from "@/types/admin";

export function useBulkAction({
  mutationFn,
  queryKeys,
}: {
  mutationFn: (ids: string[]) => Promise<BulkActionResponse>;
  queryKeys: QueryKey[];
}) {
  const client = useQueryClient();
  const { t } = useAdminTranslations();
  const { showToast } = useToast();

  return useMutation({
    mutationFn,
    onSuccess: async ({ data }) => {
      await Promise.all(queryKeys.map((queryKey) => client.invalidateQueries({ queryKey })));
      const succeeded = data.succeededIds.length;
      const failed = data.failed.length;
      if (failed === 0) {
        showToast(t.bulkSuccess.replace("{succeeded}", String(succeeded)));
      } else {
        showToast(
          t.bulkPartialError
            .replace("{succeeded}", String(succeeded))
            .replace("{failed}", String(failed)),
          "error",
        );
      }
    },
    onError: (error) => {
      showToast(extractServerErrorMessage(error, t.bulkActionError), "error");
    },
  });
}
