import { authHttp } from "@/services/http";
import type { MySchedule, MyScheduleWeek, ScheduleException, ScheduleSlot } from "@/types/schedule";

const json = { "Content-Type": "application/json" };

export const scheduleService = {
  get: (semesterId: string) =>
    authHttp<{ ok: true; data: MySchedule }>(`/api/v1/schedules/me?semesterId=${semesterId}`),
  replace: (semesterId: string, slots: ScheduleSlot[]) =>
    authHttp<{ ok: true; data: MySchedule }>("/api/v1/schedules/me", {
      method: "PUT",
      headers: json,
      body: JSON.stringify({ semesterId, slots }),
    }),
  week: (semesterId: string, weekStart: string) =>
    authHttp<{ ok: true; data: MyScheduleWeek }>(
      `/api/v1/schedules/me/week?semesterId=${semesterId}&weekStart=${weekStart}`,
    ),
  replaceWeek: (semesterId: string, weekStart: string, exceptions: ScheduleException[]) =>
    authHttp<{ ok: true; data: MyScheduleWeek }>("/api/v1/schedules/me/week", {
      method: "PUT",
      headers: json,
      body: JSON.stringify({ semesterId, weekStart, exceptions }),
    }),
};
