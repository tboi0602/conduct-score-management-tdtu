/**
 * Single public entry point for client translations.
 *
 * Keep translation definitions in this folder, but import them from this
 * module in application code. This prevents locale data from being wired up
 * differently in individual components.
 */
export { messages } from "./messages";
export type { Locale } from "./messages";

export { adminMessages } from "./admin-messages";
export { attendanceMessages } from "./attendance-messages";
export { conductScoreMessages } from "./conduct-score-messages";
export { dashboardMessages } from "./dashboard-messages";
export { eventMessages } from "./event-messages";
export { scheduleMessages } from "./schedule-messages";
export { studentEventMessages } from "./student-event-messages";
export { studentNotificationMessages } from "./student-notification-messages";
export { academicMessages, organizerMessages, appealFailureMessages } from "./management-messages";
export { reportMessages } from "./report-messages";

import { adminMessages } from "./admin-messages";
import { attendanceMessages } from "./attendance-messages";
import { conductScoreMessages } from "./conduct-score-messages";
import { dashboardMessages } from "./dashboard-messages";
import { eventMessages } from "./event-messages";
import { messages } from "./messages";
import { scheduleMessages } from "./schedule-messages";
import { studentEventMessages } from "./student-event-messages";
import { studentNotificationMessages } from "./student-notification-messages";

/** All translation bundles available to LanguageProvider. */
export const translations = {
  common: messages,
  admin: adminMessages,
  attendance: attendanceMessages,
  conductScore: conductScoreMessages,
  dashboard: dashboardMessages,
  event: eventMessages,
  schedule: scheduleMessages,
  studentEvent: studentEventMessages,
  studentNotification: studentNotificationMessages,
} as const;
