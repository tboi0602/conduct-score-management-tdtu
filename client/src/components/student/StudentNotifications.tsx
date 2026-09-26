"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { queryKeys } from "@/lib/query-keys";
import { notificationService } from "@/services/notifications";

export function StudentNotifications() {
  const { locale } = useLanguage();
  const vi = locale === "vi";
  const [open, setOpen] = useState(false);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.notifications.mine,
    queryFn: notificationService.mine,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
  const refresh = () => client.invalidateQueries({ queryKey: queryKeys.notifications.mine });
  const read = useMutation({
    mutationFn: notificationService.markRead,
    onSuccess: refresh,
  });
  const readAll = useMutation({
    mutationFn: notificationService.markAllRead,
    onSuccess: refresh,
  });
  const unread = query.data?.unread ?? 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={vi ? "Thông báo" : "Notifications"}
        className="relative grid h-10 w-10 place-items-center rounded-xl text-white transition hover:bg-white/15"
      >
        <Bell size={19} />
        {unread ? (
          <span className="absolute right-0 top-0 min-w-4 rounded-full bg-white px-1 text-center text-[10px] font-black text-[#b42332]">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="fixed right-3 top-[62px] z-50 max-h-[70vh] w-[min(360px,calc(100vw-24px))] overflow-y-auto rounded-2xl border border-[#eadde0] bg-white p-3 text-[#34242a] shadow-xl md:absolute md:left-0 md:right-auto md:top-12 md:w-80">
          <div className="flex items-center justify-between gap-3 px-2 py-1">
            <strong>{vi ? "Thông báo" : "Notifications"}</strong>
            {unread ? (
              <button
                type="button"
                onClick={() => readAll.mutate()}
                className="text-xs font-bold text-[#154a9b]"
              >
                {vi ? "Đã đọc tất cả" : "Mark all read"}
              </button>
            ) : null}
          </div>
          <div className="mt-2 space-y-2">
            {(query.data?.data ?? []).map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => !item.readAt && read.mutate(item.id)}
                className={`w-full rounded-xl p-3 text-left ${item.readAt ? "bg-white" : "bg-[#fff1f3]"}`}
              >
                <span className="block text-sm font-bold">
                  {item.type === "APPEAL_APPROVED"
                    ? vi
                      ? "Khiếu nại đã được chấp nhận"
                      : "Appeal approved"
                    : vi
                      ? "Khiếu nại đã bị từ chối"
                      : "Appeal rejected"}
                </span>
                <span className="mt-1 block text-xs leading-5 text-[#765f66]">
                  {vi ? "Sự kiện" : "Event"}: {item.title}
                  {item.message ? ` · ${item.message}` : ""}
                </span>
                <span className="mt-1 block text-[11px] text-[#9a858b]">
                  {new Date(item.createdAt).toLocaleString(locale)}
                </span>
              </button>
            ))}
            {!query.data?.data.length ? (
              <p className="p-5 text-center text-sm text-[#8b747b]">
                {vi ? "Chưa có thông báo." : "No notifications."}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
