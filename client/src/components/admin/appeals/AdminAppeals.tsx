"use client";

import { CheckCircle2, Eye, MessageSquareWarning, XCircle } from "lucide-react";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Modal } from "@/components/ui/Modal";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { useAdminAppeals } from "@/hooks/appeals/useAdminAppeals";
import type { AppealStatus } from "@/types/appeal";

const failureLabels = {
  NETWORK_ERROR: { vi: "Lỗi mạng", en: "Network error" },
  QR_ERROR: { vi: "Lỗi quét QR", en: "QR scan error" },
  SESSION_EXPIRED: { vi: "Phiên điểm danh đã kết thúc", en: "Session expired" },
  TIMEOUT: { vi: "Quá thời gian chờ", en: "Request timeout" },
  LOCATION_ERROR: { vi: "Lỗi vị trí", en: "Location error" },
  SERVICE_ERROR: { vi: "Lỗi dịch vụ", en: "Service error" },
  OTHER: { vi: "Lỗi khác", en: "Other error" },
} as const;

const tones = {
  PENDING: "bg-amber-50 text-amber-800",
  APPROVED: "bg-emerald-50 text-emerald-800",
  REJECTED: "bg-red-50 text-red-700",
} as const;

export function AdminAppeals() {
  const { locale } = useLanguage();
  const vi = locale === "vi";
  const statusLabel = (value: AppealStatus) =>
    vi
      ? { PENDING: "Chờ xử lý", APPROVED: "Đã chấp nhận", REJECTED: "Đã từ chối" }[value]
      : { PENDING: "Pending", APPROVED: "Approved", REJECTED: "Rejected" }[value];
  const {
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
  } = useAdminAppeals(vi);
  if (list.isPending) return <PageLoadingSkeleton />;
  return (
    <section>
      <header className="flex flex-col gap-4 border-b border-[#dfe7f0] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[#154a9b]">
            <MessageSquareWarning size={17} /> TDTU Admin
          </div>
          <h1 className="mt-3 text-3xl font-bold text-[#102a50]">
            {vi ? "Khiếu nại điểm danh" : "Attendance appeals"}
          </h1>
          <p className="mt-2 text-sm text-[#66758a]">
            {vi
              ? "Xem xét minh chứng và điều chỉnh kết quả điểm danh."
              : "Review evidence and correct attendance results."}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={vi ? "Tên, MSSV hoặc sự kiện" : "Name, student ID or event"}
            className="min-h-11 rounded-xl border border-[#cdd9e7] px-3 text-sm outline-none focus:border-[#154a9b]"
          />
          <CustomSelect
            className="w-full sm:w-48"
            value={status}
            onChange={(value) => setStatus(value as AppealStatus | "")}
            placeholder={vi ? "Tất cả trạng thái" : "All statuses"}
            options={[
              { value: "PENDING", label: vi ? "Chờ xử lý" : "Pending" },
              { value: "APPROVED", label: vi ? "Đã duyệt" : "Approved" },
              { value: "REJECTED", label: vi ? "Từ chối" : "Rejected" },
            ]}
          />
        </div>
      </header>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-[#d9e3ee] bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-[#f7f9fc] text-xs uppercase text-[#60728a]">
            <tr>
              <th className="p-4">{vi ? "Sinh viên" : "Student"}</th>
              <th className="p-4">{vi ? "Sự kiện" : "Event"}</th>
              <th className="p-4">{vi ? "Lần" : "Attempt"}</th>
              <th className="p-4">{vi ? "Trạng thái" : "Status"}</th>
              <th className="p-4 text-right">{vi ? "Thao tác" : "Action"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf1f5]">
            {(list.data?.data ?? []).map((item) => (
              <tr key={item.id}>
                <td className="p-4">
                  <strong className="block text-[#263b58]">{item.student.user.name}</strong>
                  <span className="text-xs text-[#718096]">{item.student.studentCode}</span>
                </td>
                <td className="p-4 text-[#40546f]">{item.event.name}</td>
                <td className="p-4">{item.attemptNumber}/3</td>
                <td className="p-4">
                  <span className={`rounded-lg px-2 py-1 text-xs font-bold ${tones[item.status]}`}>
                    {statusLabel(item.status)}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(item);
                      setNote(item.reviewNote ?? "");
                      setError("");
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 font-bold text-[#154a9b]"
                  >
                    <Eye size={16} />
                    {vi ? "Xem" : "View"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.data?.data.length ? (
          <p className="py-12 text-center text-sm text-[#718096]">
            {vi ? "Không có khiếu nại phù hợp." : "No matching appeals."}
          </p>
        ) : null}
      </div>
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={vi ? "Chi tiết khiếu nại" : "Appeal details"}
        size="lg"
      >
        {selected ? (
          <div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold uppercase text-[#718096]">
                  {vi ? "Sinh viên" : "Student"}
                </dt>
                <dd className="mt-1 font-semibold text-[#263b58]">
                  {selected.student.user.name} · {selected.student.studentCode}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-[#718096]">
                  {vi ? "Sự kiện" : "Event"}
                </dt>
                <dd className="mt-1 font-semibold text-[#263b58]">{selected.event.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-[#718096]">
                  {vi ? "Lần gửi" : "Attempt"}
                </dt>
                <dd className="mt-1 text-[#40546f]">{selected.attemptNumber}/3</dd>
              </div>
            </dl>
            {selected.failureCategory ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <strong>{vi ? "Lỗi do thiết bị báo cáo:" : "Device-reported failure:"}</strong>{" "}
                {failureLabels[selected.failureCategory][locale]}
                {selected.failedAt
                  ? ` · ${new Date(selected.failedAt).toLocaleString(locale)}`
                  : ""}
              </div>
            ) : null}
            <div className="mt-5 rounded-xl bg-[#f6f8fb] p-4 text-sm leading-6 text-[#40546f]">
              {selected.explanation}
            </div>
            <button
              type="button"
              onClick={() => void openEvidence(selected.id)}
              className="mt-4 inline-flex items-center gap-2 font-bold text-[#154a9b]"
            >
              <Eye size={17} />
              {vi ? "Mở ảnh minh chứng" : "Open evidence"}
            </button>
            {selected.status === "PENDING" ? (
              <>
                <label className="mt-5 block text-sm font-semibold text-[#40546f]">
                  {vi ? "Ghi chú xử lý / lý do từ chối" : "Review note / rejection reason"}
                </label>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={1000}
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-[#cdd9e7] p-3 text-sm outline-none focus:border-[#154a9b]"
                />
                {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
                <div className="mt-5 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    disabled={review.isPending}
                    onClick={() => review.mutate("REJECTED")}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-50 px-4 font-bold text-red-700"
                  >
                    <XCircle size={17} />
                    {vi ? "Từ chối" : "Reject"}
                  </button>
                  <button
                    type="button"
                    disabled={review.isPending}
                    onClick={() => review.mutate("APPROVED")}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#154a9b] px-4 font-bold text-white"
                  >
                    <CheckCircle2 size={17} />
                    {vi ? "Chấp nhận" : "Approve"}
                  </button>
                </div>
              </>
            ) : selected.reviewNote ? (
              <p className="mt-5 rounded-xl border p-3 text-sm text-[#52647d]">
                {selected.reviewNote}
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
