import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { useDebounce } from "@/hooks/shared/useDebounce";
import { queryKeys } from "@/lib/query-keys";
import { appealService } from "@/services/appeals";
import type { AppealStatus, AttendanceAppeal } from "@/types/appeal";
import { useLanguage } from "@/components/i18n/LanguageProvider";

export function useAdminAppeals() {
  const { message } = useLanguage();
  const t = message.common;
  const client = useQueryClient();
  const [status, setStatus] = useState<AppealStatus | "">("PENDING");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AttendanceAppeal | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const debounced = useDebounce(search, 500);
  const list = useQuery({
    queryKey: queryKeys.appeals.managed(status, debounced),
    queryFn: () => appealService.list(status, debounced),
  });
  const review = useMutation({
    mutationFn: (decision: "APPROVED" | "REJECTED") => {
      if (!selected) throw new Error(t.noAppealSelected);
      if (decision === "REJECTED" && !note.trim()) {
        throw new Error(t.rejectionReasonRequired);
      }
      return appealService.review(selected.id, decision, note.trim() || undefined);
    },
    onSuccess: async () => {
      setSelected(null);
      setNote("");
      setError("");
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.appeals.all }),
        client.invalidateQueries({ queryKey: queryKeys.conductScores.all }),
        client.invalidateQueries({ queryKey: ["admin", "dashboard"] }),
      ]);
    },
    onError: (cause) => setError((cause as Error).message),
  });
  const openEvidence = async (id: string) => {
    const response = await appealService.evidence(id, false);
    window.open(response.data.url, "_blank", "noopener,noreferrer");
  };
  return {
    error,
    list,
    note,
    openEvidence,
    review,
    search,
    selected,
    setError,
    setNote,
    setSearch,
    setSelected,
    setStatus,
    status,
  };
}
