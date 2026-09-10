"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, LocateFixed, MapPin, XCircle } from "lucide-react";
import { useEffect } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { attendanceMessages } from "@/i18n/attendance-messages";
import { env } from "@/lib/env";
import { queryKeys } from "@/lib/query-keys";
import { attendanceService } from "@/services/attendance";

function locate() {
  return new Promise<GeolocationPosition>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 0,
    }),
  );
}

export function StudentCheckIn({ token }: { token: string }) {
  const { locale } = useLanguage();
  const t = attendanceMessages[locale];
  const { showToast } = useToast();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      const position = await locate();
      return attendanceService.studentQr({
        token,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy,
      });
    },
    onError: () => showToast(t.actionError, "error"),
  });
  const requestId = mutation.data?.data.requestId ?? "";
  const requestQuery = useQuery({
    queryKey: queryKeys.attendance.request(requestId),
    queryFn: () => attendanceService.myRequest(requestId).then((response) => response.data),
    enabled: Boolean(requestId),
    refetchInterval: (query) => (query.state.data?.status === "PENDING" ? 1_500 : false),
  });
  useEffect(() => {
    if (!requestId) return;
    let source: EventSource | null = null;
    void attendanceService
      .studentTicket()
      .then(({ data }) => {
        source = new EventSource(
          `${env.apiBaseUrl}/api/v1/attendance/stream?ticket=${encodeURIComponent(data.ticket)}`,
        );
        source.addEventListener(
          "message",
          () =>
            void client.invalidateQueries({ queryKey: queryKeys.attendance.request(requestId) }),
        );
      })
      .catch(() => undefined);
    return () => source?.close();
  }, [client, requestId]);
  const status = requestQuery.data?.status;
  return (
    <section className="mx-auto max-w-xl">
      <Link href="/events" className="text-sm font-semibold text-[#154a9b]">
        ← {t.back}
      </Link>
      <div className="mt-5 rounded-[26px] border border-[#dce4ef] bg-white p-7 text-center shadow-[0_24px_50px_-36px_rgba(31,67,111,.55)]">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#edf4fc] text-[#154a9b]">
          {status === "ACCEPTED" ? (
            <CheckCircle2 size={30} />
          ) : status === "REJECTED" ? (
            <XCircle size={30} />
          ) : (
            <LocateFixed size={30} />
          )}
        </span>
        <h1 className="mt-5 text-2xl font-bold text-[#102a50]">{t.studentTitle}</h1>
        <p className="mt-2 text-sm leading-6 text-[#66758a]">{t.studentDescription}</p>
        {!token ? (
          <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            {t.invalidQr}
          </p>
        ) : null}
        {status ? (
          <div
            className={`mt-6 rounded-xl p-4 text-sm font-bold ${status === "ACCEPTED" ? "bg-emerald-50 text-emerald-700" : status === "REJECTED" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}
          >
            {status === "ACCEPTED"
              ? t.accepted
              : status === "REJECTED"
                ? `${t.rejected}${requestQuery.data?.rejectionReason ? `: ${requestQuery.data.rejectionReason}` : ""}`
                : t.pending}
          </div>
        ) : (
          <button
            type="button"
            disabled={!token || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#154a9b] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            <MapPin size={18} />
            {mutation.isPending ? t.locating : t.sendCheckIn}
          </button>
        )}
      </div>
    </section>
  );
}
