import type { Semester } from "@/types/events";

export type ClassSession = { id: string; name: string; startTime: string; endTime: string };
export type ScheduleSlot = { id?: string; dayOfWeek: number; classSessionId: string };
export type ScheduleExceptionStatus = "HAS_CLASS" | "NO_CLASS";
export type ScheduleException = {
  id?: string;
  date: string;
  classSessionId: string;
  status: ScheduleExceptionStatus;
};
export type MySchedule = { semester: Semester; sessions: ClassSession[]; slots: ScheduleSlot[] };
export type MyScheduleWeek = MySchedule & {
  weekStart: string;
  today: string;
  exceptions: ScheduleException[];
};
