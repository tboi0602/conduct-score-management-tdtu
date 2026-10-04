import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { attendanceFailureStore } from "@/lib/attendance-failure-store";
import { getAuthSession } from "@/lib/auth-storage";
import { queryKeys } from "@/lib/query-keys";
import { appealService } from "@/services/appeals";
import { useLanguage } from "@/components/i18n/LanguageProvider";

export function useStudentAppeals() {
  const { message } = useLanguage();
  const t = message.common;
  const client = useQueryClient();
  const [eventId, setEventId] = useState("");
  const [explanation, setExplanation] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const eligible = useQuery({
    queryKey: queryKeys.appeals.eligible,
    queryFn: () => appealService.eligible().then((value) => value.data),
  });
  const history = useQuery({ queryKey: queryKeys.appeals.mine, queryFn: appealService.mine });
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const submit = useMutation({
    mutationFn: async () => {
      if (!eventId) throw new Error(t.selectEvent);
      if (explanation.trim().length < 20) {
        throw new Error(t.explanationMin.replace("{count}", String(explanation.trim().length)));
      }
      if (!file) throw new Error(t.selectEvidence);
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        throw new Error(t.imageFormat);
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error(t.imageTooLarge);
      }
      const upload = (await appealService.upload(file.type)).data;
      await appealService.uploadEvidenceFile(upload, file).catch(() => {
        throw new Error(t.imageUploadError);
      });
      const session = getAuthSession();
      const drafts = session ? await attendanceFailureStore.listForUser(session.user.id) : [];
      const matchingDraft = drafts
        .filter(
          (draft) =>
            draft.eventId === eventId &&
            draft.status === "FAILED" &&
            new Date(draft.eventEnd) < new Date(),
        )
        .sort((left, right) => right.failedAt.localeCompare(left.failedAt))[0];
      const created = await appealService.create({
        eventId,
        explanation: explanation.trim(),
        failureCategory: matchingDraft?.failureCategory,
        failedAt: matchingDraft?.failedAt,
        evidenceKey: upload.key,
        evidenceName: file.name,
        evidenceMime: file.type,
        evidenceSize: file.size,
      });
      return { created, draftId: matchingDraft?.clientAttemptId };
    },
    onSuccess: async ({ draftId }) => {
      if (draftId) await attendanceFailureStore.remove(draftId);
      setEventId("");
      setExplanation("");
      setFile(null);
      setError("");
      await client.invalidateQueries({ queryKey: queryKeys.appeals.all });
    },
    onError: (cause) => setError((cause as Error).message),
  });
  const openEvidence = async (id: string) => {
    const response = await appealService.evidence(id, true);
    window.open(response.data.url, "_blank", "noopener,noreferrer");
  };
  return {
    eligible,
    error,
    eventId,
    explanation,
    file,
    history,
    openEvidence,
    preview,
    setError,
    setEventId,
    setExplanation,
    setFile,
    submit,
  };
}
