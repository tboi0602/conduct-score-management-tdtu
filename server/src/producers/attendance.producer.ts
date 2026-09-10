import { rabbitClient } from "@rabbitmq";

export const attendanceRoutingKeys = {
  scanRequested: "attendance.scan.requested.v1",
  scanProcessed: "attendance.scan.processed.v1",
  sessionOpened: "attendance.session.opened.v1",
  sessionClosed: "attendance.session.closed.v1",
} as const;

export function publishAttendanceEvent(
  eventType: string,
  payload: Record<string, unknown>,
  metadata: { messageId: string; correlationId: string },
): Promise<void> {
  return rabbitClient.publish(eventType, payload, metadata);
}
