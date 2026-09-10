"use client";

import Link from "next/link";
import QRCode from "qrcode";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Barcode, ChevronLeft, MapPin, QrCode, Radio, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PaginationControls } from "@/components/admin/PaginationControls";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { useToast } from "@/components/ui/ToastProvider";
import { useAdminTranslations } from "@/hooks/useAdminTranslations";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { useDebounce } from "@/hooks/useDebounce";
import { attendanceMessages } from "@/i18n/attendance-messages";
import { env } from "@/lib/env";
import { formatDate } from "@/lib/event-form";
import { queryKeys } from "@/lib/query-keys";
import { attendanceService } from "@/services/attendance";
import { eventService } from "@/services/events";
import type { AttendanceDirection } from "@/types/attendance";

function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is unavailable"));
      return;
    }
    let best: GeolocationPosition | null = null;
    let watchId = 0;
    const finish = () => {
      navigator.geolocation.clearWatch(watchId);
      if (best) resolve(best);
      else reject(new Error("Unable to obtain device location"));
    };
    const timer = window.setTimeout(finish, 20_000);
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!best || position.coords.accuracy < best.coords.accuracy) best = position;
        if (position.coords.accuracy <= 100) {
          window.clearTimeout(timer);
          finish();
        }
      },
      (error) => {
        window.clearTimeout(timer);
        navigator.geolocation.clearWatch(watchId);
        reject(error);
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 10_000 },
    );
  });
}

export function AttendanceWorkspace({ eventId }: { eventId: string }) {
  const { locale } = useAdminTranslations();
  const t = attendanceMessages[locale];
  const { showToast } = useToast();
  const client = useQueryClient();
  const [direction, setDirection] = useState<AttendanceDirection>("CHECK_IN");
  const [attendanceStatus, setAttendanceStatus] = useState<"ATTENDED" | "LATE">("ATTENDED");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [recordStatuses, setRecordStatuses] = useState<
    Record<string, "ATTENDED" | "LATE" | "ABSENT">
  >({});
  const [page, setPage] = useState(1);
  const [qrImage, setQrImage] = useState("");
  const [clock, setClock] = useState(Date.now());
  const search = useDebounce(searchTerm.trim(), 500);
  const eventQuery = useQuery({
    queryKey: queryKeys.events.detail(eventId),
    queryFn: () => eventService.get(eventId).then((response) => response.data),
  });
  const sessionQuery = useQuery({
    queryKey: queryKeys.attendance.session(eventId),
    queryFn: () => attendanceService.activeSession(eventId).then((response) => response.data),
    refetchInterval: 15_000,
  });
  const qrQuery = useQuery({
    queryKey: queryKeys.attendance.qr(eventId),
    queryFn: () => attendanceService.qr(eventId).then((response) => response.data),
    enabled: Boolean(sessionQuery.data),
    refetchInterval: 15_000,
  });
  const requestsQuery = useQuery({
    queryKey: [...queryKeys.attendance.requests(eventId, search, filterStatus), page],
    queryFn: () => attendanceService.requests(eventId, page, search, filterStatus),
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (!qrQuery.data?.scanUrl) {
      setQrImage("");
      return;
    }
    void QRCode.toDataURL(qrQuery.data.scanUrl, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: "M",
    }).then(setQrImage);
  }, [qrQuery.data?.scanUrl]);
  useEffect(() => {
    let source: EventSource | null = null;
    void attendanceService
      .eventTicket(eventId)
      .then(({ data }) => {
        source = new EventSource(
          `${env.apiBaseUrl}/api/v1/attendance/stream?ticket=${encodeURIComponent(data.ticket)}`,
        );
        source.addEventListener(
          "message",
          () =>
            void client.invalidateQueries({
              queryKey: queryKeys.attendance.requests(eventId, search, filterStatus),
            }),
        );
      })
      .catch(() => undefined);
    return () => source?.close();
  }, [client, eventId, filterStatus, search]);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const open = useMutation({
    mutationFn: async () => {
      const position = await currentPosition();
      return attendanceService.openSession(eventId, {
        direction,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy,
      });
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.attendance.session(eventId) });
      void client.invalidateQueries({ queryKey: queryKeys.attendance.qr(eventId) });
    },
    onError: (error) => {
      const isLocationError =
        typeof error === "object" && error !== null && "code" in error && "message" in error;
      showToast(isLocationError ? t.locationError : t.actionError, "error");
    },
  });
  const close = useMutation({
    mutationFn: () => attendanceService.closeSession(eventId),
    onSuccess: () => {
      client.setQueryData(queryKeys.attendance.session(eventId), null);
      client.removeQueries({ queryKey: queryKeys.attendance.qr(eventId) });
    },
    onError: () => showToast(t.actionError, "error"),
  });
  const scan = useMutation({
    mutationFn: ({ source, code }: { source: "STAFF_BARCODE" | "MANUAL_ENTRY"; code: string }) =>
      attendanceService.scanManaged(eventId, {
        studentCode: code,
        direction,
        source,
        status: attendanceStatus,
      }),
    onSuccess: () => {
      showToast(t.scanSuccess);
    },
    onError: () => showToast(t.actionError, "error"),
  });
  const submitBarcode = useCallback(
    (code: string, source: "STAFF_BARCODE" | "MANUAL_ENTRY") => scan.mutateAsync({ source, code }),
    [scan],
  );
  const barcode = useBarcodeScanner({ disabled: scan.isPending, onSubmit: submitBarcode });
  const adjust = useMutation({
    mutationFn: ({
      recordId,
      status,
    }: {
      recordId: string;
      status: "ATTENDED" | "LATE" | "ABSENT";
    }) => attendanceService.adjustStatus(eventId, recordId, status),
    onSuccess: () => {
      void client.invalidateQueries({
        queryKey: queryKeys.attendance.requests(eventId, search, filterStatus),
      });
      showToast(t.adjusted);
    },
    onError: () => showToast(t.actionError, "error"),
  });
  if (eventQuery.isPending) return <PageLoadingSkeleton />;
  const event = eventQuery.data;
  if (!event) return null;
  const directionOptions = [
    { value: "CHECK_IN", label: t.checkIn },
    ...(event.checkInMode === "TWO_WAY" ? [{ value: "CHECK_OUT", label: t.checkOut }] : []),
  ];
  return (
    <section>
      <Link
        href="/admin/attendance"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#154a9b]"
      >
        <ChevronLeft size={17} />
        {t.title}
      </Link>
      <header className="mt-4 rounded-[24px] border border-[#dce4ef] bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.14em] text-[#154a9b]">
              {t.ongoing}
            </p>
            <h1 className="mt-2 text-2xl font-bold text-[#102a50]">{event.name}</h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-[#66758a]">
              <MapPin size={16} />
              {event.location}
            </p>
          </div>
          <span className="rounded-xl bg-[#edf4fc] px-3 py-2 text-sm font-bold text-[#154a9b]">
            {event.registeredCount}/{event.capacity ?? "∞"}
          </span>
        </div>
      </header>
      <div className="mt-5 grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <div className="space-y-5">
          <div className="rounded-[22px] border border-[#dce4ef] bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold text-[#102a50]">
                <QrCode size={19} />
                {t.session}
              </h2>
              {sessionQuery.data ? (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                  <Radio size={13} />
                  {t.ongoing}
                </span>
              ) : null}
            </div>
            <div className="mt-4">
              <CustomSelect
                ariaLabel={t.direction}
                placeholder={t.direction}
                value={direction}
                disabled={Boolean(sessionQuery.data)}
                onChange={(value) => setDirection(value as AttendanceDirection)}
                options={directionOptions}
              />
            </div>
            {sessionQuery.data && qrImage ? (
              <div className="mt-4 text-center">
                <img src={qrImage} alt="Event attendance QR" className="mx-auto w-64 rounded-xl" />
                <p className="mt-2 text-xs text-[#66758a]">
                  {t.qrRefresh}:{" "}
                  {qrQuery.data
                    ? `${Math.max(0, Math.ceil((new Date(qrQuery.data.expiresAt).getTime() - clock) / 1_000))}s`
                    : "—"}
                </p>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => (sessionQuery.data ? close.mutate() : open.mutate())}
              disabled={open.isPending || close.isPending}
              className="mt-4 w-full rounded-xl bg-[#154a9b] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {sessionQuery.data ? t.closeSession : open.isPending ? t.getLocation : t.openSession}
            </button>
          </div>
          <div className="rounded-[22px] border border-[#dce4ef] bg-white p-5">
            <h2 className="flex items-center gap-2 font-bold text-[#102a50]">
              <Barcode size={19} />
              {t.scanBarcode}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#66758a]">{t.scannerReady}</p>
            <input
              ref={barcode.inputRef}
              autoFocus
              autoComplete="off"
              disabled={scan.isPending}
              value={barcode.value}
              onChange={barcode.onChange}
              onKeyDown={barcode.onKeyDown}
              placeholder={t.enterCode}
              className="mt-4 h-12 w-full rounded-xl border border-[#cdd9e7] px-4 font-mono text-base font-semibold tracking-wide outline-none focus:border-[#154a9b] focus:ring-4 focus:ring-[#154a9b]/10"
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <CustomSelect
                ariaLabel={t.direction}
                placeholder={t.direction}
                value={direction}
                onChange={(value) => setDirection(value as AttendanceDirection)}
                options={directionOptions}
              />
              <CustomSelect
                ariaLabel={t.result}
                placeholder={t.result}
                value={attendanceStatus}
                onChange={(value) => setAttendanceStatus(value as "ATTENDED" | "LATE")}
                options={[
                  { value: "ATTENDED", label: t.attended },
                  { value: "LATE", label: t.late },
                ]}
              />
            </div>
            <p className="mt-3 text-xs text-[#718096]">{t.manualEnterHint}</p>
          </div>
        </div>
        <div className="rounded-[22px] border border-[#dce4ef] bg-white p-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={searchTerm}
              onChange={(input) => {
                setSearchTerm(input.target.value);
                setPage(1);
              }}
              placeholder={t.search}
              className="h-11 flex-1 rounded-xl border border-[#cdd9e7] px-3 text-sm"
            />
            <CustomSelect
              ariaLabel={t.result}
              placeholder={t.result}
              value={filterStatus}
              onChange={(value) => {
                setFilterStatus(value);
                setPage(1);
              }}
              options={[
                { value: "", label: t.all },
                { value: "PENDING", label: t.pending },
                { value: "ACCEPTED", label: t.accepted },
                { value: "REJECTED", label: t.rejected },
              ]}
            />
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-[#718096]">
                <tr>
                  <th className="py-3">#</th>
                  <th>{t.student}</th>
                  <th>{t.direction}</th>
                  <th>{t.source}</th>
                  <th>{t.result}</th>
                  <th>{t.adjustStatus}</th>
                  <th>{t.time}</th>
                </tr>
              </thead>
              <tbody>
                {(requestsQuery.data?.data ?? []).map((item, index) => (
                  <tr key={item.id} className="border-b border-[#edf1f5]">
                    <td className="py-3">{(page - 1) * 20 + index + 1}</td>
                    <td>
                      <p className="font-semibold text-[#263b58]">{item.student.user.name}</p>
                      <p className="text-xs text-[#718096]">{item.student.studentCode}</p>
                    </td>
                    <td>{item.direction === "CHECK_IN" ? t.checkIn : t.checkOut}</td>
                    <td>{item.source}</td>
                    <td>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-bold ${item.status === "ACCEPTED" ? "bg-emerald-50 text-emerald-700" : item.status === "REJECTED" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td>
                      {item.attendanceRecord ? (
                        <div className="flex min-w-52 items-center gap-2">
                          <CustomSelect
                            ariaLabel={t.adjustStatus}
                            placeholder={t.adjustStatus}
                            value={
                              recordStatuses[item.attendanceRecord.id] ??
                              item.attendanceRecord.status
                            }
                            onChange={(value) =>
                              setRecordStatuses((current) => ({
                                ...current,
                                [item.attendanceRecord!.id]: value as
                                  "ATTENDED" | "LATE" | "ABSENT",
                              }))
                            }
                            options={[
                              { value: "ATTENDED", label: t.attended },
                              { value: "LATE", label: t.late },
                              { value: "ABSENT", label: t.absent },
                            ]}
                          />
                          <button
                            type="button"
                            aria-label={t.saveStatus}
                            disabled={adjust.isPending}
                            onClick={() =>
                              adjust.mutate({
                                recordId: item.attendanceRecord!.id,
                                status:
                                  recordStatuses[item.attendanceRecord!.id] ??
                                  item.attendanceRecord!.status,
                              })
                            }
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#154a9b] text-white disabled:opacity-50"
                          >
                            <Save size={16} />
                          </button>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{formatDate(item.createdAt, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(requestsQuery.data?.pagination.totalPages ?? 0) > 1 ? (
            <PaginationControls
              pagination={requestsQuery.data!.pagination}
              onPageChange={setPage}
              disabled={requestsQuery.isFetching}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
