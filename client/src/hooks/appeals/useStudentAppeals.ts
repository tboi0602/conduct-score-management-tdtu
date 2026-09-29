import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { attendanceFailureStore } from "@/lib/attendance-failure-store";
import { getAuthSession } from "@/lib/auth-storage";
import { queryKeys } from "@/lib/query-keys";
import { appealService } from "@/services/appeals";

export function useStudentAppeals(vi: boolean) {
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
      if (!eventId) throw new Error(vi ? "Vui lòng chọn sự kiện." : "Please select an event.");
      if (explanation.trim().length < 20) {
        throw new Error(
          vi
            ? `Phần giải thích cần ít nhất 20 ký tự (hiện có ${explanation.trim().length}).`
            : `Explanation requires at least 20 characters (currently ${explanation.trim().length}).`,
        );
      }
      if (!file)
        throw new Error(vi ? "Vui lòng chọn ảnh minh chứng." : "Please select an evidence image.");
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        throw new Error(
          vi ? "Ảnh phải có định dạng JPG, PNG hoặc WebP." : "Image must be JPG, PNG or WebP.",
        );
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error(vi ? "Ảnh vượt quá 5 MB." : "Image exceeds 5 MB.");
      }
      const upload = (await appealService.upload(file.type)).data;
      await appealService.uploadEvidenceFile(upload, file).catch(() => {
        throw new Error(vi ? "Không thể tải ảnh lên." : "Unable to upload image.");
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
