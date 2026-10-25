const DAY_MS = 86_400_000;

export const CONDUCT_SCORE_WARNING_THRESHOLD = 80;
export const FINAL_WARNING_WINDOW_DAYS = 14;

export type ConductScoreWarningMilestone = "MIDPOINT" | "FINAL_WINDOW";

function utcDateOnly(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function dateInVietnam(value: Date): Date {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
  return new Date(`${date}T00:00:00.000Z`);
}

export function semesterMidpoint(startDate: Date, endDate: Date): Date {
  const start = utcDateOnly(startDate).getTime();
  const end = utcDateOnly(endDate).getTime();
  const durationDays = Math.max(0, Math.floor((end - start) / DAY_MS));
  return new Date(start + Math.floor(durationDays / 2) * DAY_MS);
}

export function warningMilestonesForDate(
  startDate: Date,
  endDate: Date,
  now: Date,
): ConductScoreWarningMilestone[] {
  const current = dateInVietnam(now).getTime();
  const end = utcDateOnly(endDate).getTime();
  if (current < utcDateOnly(startDate).getTime() || current > end) return [];

  const milestones: ConductScoreWarningMilestone[] = [];
  if (current === semesterMidpoint(startDate, endDate).getTime()) milestones.push("MIDPOINT");
  if (current >= end - FINAL_WARNING_WINDOW_DAYS * DAY_MS) milestones.push("FINAL_WINDOW");
  return milestones;
}

export function warningNotificationTitle(milestone: ConductScoreWarningMilestone): string {
  return milestone === "MIDPOINT"
    ? "CONDUCT_SCORE_WARNING_MIDPOINT"
    : "CONDUCT_SCORE_WARNING_FINAL_WINDOW";
}
