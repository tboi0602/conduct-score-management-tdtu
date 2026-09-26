"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileImage, Send, ShieldAlert } from "lucide-react";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { queryKeys } from "@/lib/query-keys";
import { attendanceFailureStore } from "@/lib/attendance-failure-store";
import { getAuthSession } from "@/lib/auth-storage";
import { appealService } from "@/services/appeals";

const statusTone = {
  PENDING: "bg-amber-50 text-amber-800",
  APPROVED: "bg-emerald-50 text-emerald-800",
  REJECTED: "bg-red-50 text-red-700",
} as const;

export function StudentAppeals() {
  const { locale } = useLanguage();
  const vi = locale === "vi";
  const statusLabel = (status: "PENDING" | "APPROVED" | "REJECTED") =>
    vi
      ? { PENDING: "Chờ xử lý", APPROVED: "Đã chấp nhận", REJECTED: "Đã từ chối" }[status]
      : { PENDING: "Pending", APPROVED: "Approved", REJECTED: "Rejected" }[status];
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
  const submit = useMutation({
    mutationFn: async () => {
      if (!eventId) throw new Error(vi ? "Vui lòng chọn sự kiện." : "Please select an event.");
      if (explanation.trim().length < 20)
        throw new Error(
          vi
            ? `Phần giải thích cần ít nhất 20 ký tự (hiện có ${explanation.trim().length}).`
            : `Explanation requires at least 20 characters (currently ${explanation.trim().length}).`,
        );
      if (!file)
        throw new Error(vi ? "Vui lòng chọn ảnh minh chứng." : "Please select an evidence image.");
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
        throw new Error(
          vi ? "Ảnh phải có định dạng JPG, PNG hoặc WebP." : "Image must be JPG, PNG or WebP.",
        );
      if (file.size > 5 * 1024 * 1024)
        throw new Error(vi ? "Ảnh vượt quá 5 MB." : "Image exceeds 5 MB.");
      const upload = (await appealService.upload(file.type)).data;
      const form = new FormData();
      Object.entries(upload.fields).forEach(([key, value]) => form.append(key, value));
      form.append("file", file);
      const response = await fetch(upload.url, { method: "POST", body: form });
      if (!response.ok) throw new Error(vi ? "Không thể tải ảnh lên." : "Unable to upload image.");
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
  if (eligible.isPending || history.isPending) return <PageLoadingSkeleton />;
  return (
    <section className="mx-auto max-w-6xl">
      <header className="border-b border-[#dfe7f0] pb-6">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[#154a9b]">
          <ShieldAlert size={17} /> TDTU Student
        </div>
        <h1 className="mt-3 text-3xl font-bold text-[#102a50]">
          {vi ? "Khiếu nại điểm danh" : "Attendance appeals"}
        </h1>
        <p className="mt-2 text-sm text-[#66758a]">
          {vi
            ? "Gửi minh chứng trong vòng 7 ngày sau khi sự kiện kết thúc."
            : "Submit evidence within seven days after an event ends."}
        </p>
      </header>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <article className="rounded-2xl border border-[#d9e3ee] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-[#102a50]">
            {vi ? "Tạo khiếu nại" : "Create appeal"}
          </h2>
          <label className="mt-5 block text-sm font-semibold text-[#40546f]">
            {vi ? "Sự kiện" : "Event"}
          </label>
          <CustomSelect
            className="mt-2"
            value={eventId}
            onChange={(value) => {
              setEventId(value);
              setError("");
            }}
            placeholder={vi ? "Chọn sự kiện" : "Select event"}
            options={(eligible.data ?? []).map((event) => ({ value: event.id, label: event.name }))}
          />
          <label className="mt-4 block text-sm font-semibold text-[#40546f]">
            {vi ? "Giải thích" : "Explanation"}
          </label>
          <textarea
            value={explanation}
            onChange={(event) => {
              setExplanation(event.target.value);
              setError("");
            }}
            maxLength={2000}
            rows={5}
            className="mt-2 w-full rounded-xl border border-[#cdd9e7] p-3 text-sm outline-none focus:border-[#154a9b] focus:ring-4 focus:ring-[#154a9b]/10"
            placeholder={
              vi
                ? "Mô tả lỗi điểm danh (ít nhất 20 ký tự)"
                : "Describe the attendance issue (at least 20 characters)"
            }
          />
          <p
            className={`mt-1 text-right text-xs ${explanation.trim().length < 20 ? "text-amber-700" : "text-emerald-700"}`}
          >
            {explanation.trim().length}/20 {vi ? "ký tự tối thiểu" : "minimum characters"}
          </p>
          <label className="mt-4 block text-sm font-semibold text-[#40546f]">
            {vi ? "Ảnh minh chứng" : "Evidence image"}
          </label>
          <input
            id="appeal-evidence"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setError("");
            }}
            className="sr-only"
          />
          <label
            htmlFor="appeal-evidence"
            className="mt-2 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-[#cdd9e7] bg-white px-3.5 text-sm transition hover:border-[#9eb3cd] hover:bg-[#f8faff]"
          >
            <span className="shrink-0 rounded-lg bg-[#edf4fc] px-3 py-1.5 font-bold text-[#154a9b]">
              {vi ? "Chọn ảnh" : "Choose image"}
            </span>
            <span className={`truncate ${file ? "text-[#40546f]" : "text-[#8997aa]"}`}>
              {file ? file.name : vi ? "Chưa chọn ảnh" : "No image selected"}
            </span>
          </label>
          {file ? (
            <p className="mt-2 text-xs text-[#52647d]">
              {(file.size / 1024 / 1024).toFixed(2)} MB · JPG, PNG, WebP
            </p>
          ) : null}
          {preview ? (
            <img
              src={preview}
              alt="Evidence preview"
              className="mt-3 max-h-52 w-full rounded-xl border object-contain"
            />
          ) : null}
          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
          <button
            type="button"
            disabled={submit.isPending}
            onClick={() => submit.mutate()}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#154a9b] px-5 text-sm font-bold text-white disabled:opacity-50"
          >
            <Send size={17} />
            {submit.isPending
              ? vi
                ? "Đang gửi..."
                : "Submitting..."
              : vi
                ? "Gửi khiếu nại"
                : "Submit appeal"}
          </button>
        </article>
        <article className="rounded-2xl border border-[#d9e3ee] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-[#102a50]">
            {vi ? "Lịch sử khiếu nại" : "Appeal history"}
          </h2>
          <div className="mt-4 space-y-3">
            {(history.data?.data ?? []).map((item) => (
              <div key={item.id} className="rounded-xl border border-[#e1e8f0] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <strong className="text-[#263b58]">{item.event.name}</strong>
                    <p className="mt-1 text-xs text-[#718096]">
                      {vi ? "Lần" : "Attempt"} {item.attemptNumber}
                    </p>
                  </div>
                  <span
                    className={`rounded-lg px-2 py-1 text-xs font-bold ${statusTone[item.status]}`}
                  >
                    {statusLabel(item.status)}
                  </span>
                </div>
                <p className="mt-3 text-sm text-[#52647d]">{item.explanation}</p>
                {item.failureCategory ? (
                  <p className="mt-2 text-xs font-semibold text-amber-700">
                    {vi ? "Lỗi thiết bị ghi nhận" : "Device-reported failure"}:{" "}
                    {item.failureCategory}
                  </p>
                ) : null}
                {item.reviewNote ? (
                  <p className="mt-2 rounded-lg bg-[#f6f8fb] p-2 text-sm text-[#52647d]">
                    {item.reviewNote}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => void openEvidence(item.id)}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#154a9b]"
                >
                  <FileImage size={16} />
                  {vi ? "Xem minh chứng" : "View evidence"}
                </button>
              </div>
            ))}
            {!history.data?.data.length ? (
              <p className="py-8 text-center text-sm text-[#718096]">
                {vi ? "Chưa có khiếu nại." : "No appeals yet."}
              </p>
            ) : null}
          </div>
        </article>
      </div>
    </section>
  );
}
