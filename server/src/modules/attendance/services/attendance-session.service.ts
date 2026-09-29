import { randomUUID } from "crypto";
import { AttendanceDirection, Prisma } from "@prisma/client";

import { env } from "@config/env";
import { prisma } from "@config/prisma";
import { rabbitClient } from "@rabbitmq";
import { attendanceRoutingKeys } from "@producers/attendance.producer";
import { redisClient } from "@redis";
import { eventScope, type EventAccess } from "@services/events/event-access.service";
import { createAttendanceQrToken } from "@utils/attendanceQr";
import { ApiError } from "@utils/ApiError";
const ACTIVE_SESSION_TTL_SECONDS = 24 * 60 * 60;
const ORGANIZER_MAX_ACCURACY_METERS = env.attendanceOrganizerMaxAccuracyMeters;
export const activeSessionKey = (eventId: string) => `attendance:active-session:${eventId}`;
export type Coordinates = { latitude: number; longitude: number; accuracyMeters: number };

export function validateCoordinates(input: Coordinates): void {
  if (
    !Number.isFinite(input.latitude) ||
    input.latitude < -90 ||
    input.latitude > 90 ||
    !Number.isFinite(input.longitude) ||
    input.longitude < -180 ||
    input.longitude > 180 ||
    !Number.isFinite(input.accuracyMeters) ||
    input.accuracyMeters <= 0
  )
    throw new ApiError(400, "Invalid device coordinates");
}

export async function managedEvent(eventId: string, access: EventAccess) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, ...eventScope(access) },
    select: {
      id: true,
      name: true,
      checkInMode: true,
      deliveryMode: true,
      attendanceRadiusMeters: true,
      timeStart: true,
      timeEnd: true,
    },
  });
  if (!event) throw new ApiError(404, "Event not found");
  return event;
}

export function outboxData(
  aggregateId: string,
  eventType: string,
  correlationId: string,
  payload: Prisma.InputJsonObject,
) {
  return { aggregateType: "attendance", aggregateId, eventType, correlationId, payload };
}

export async function openSession(
  access: EventAccess,
  eventId: string,
  direction: AttendanceDirection,
  coordinates: Coordinates,
) {
  if (redisClient.getClient().status !== "ready" || !rabbitClient.isConnected()) {
    throw new ApiError(503, "Attendance processing service is temporarily unavailable");
  }
  validateCoordinates(coordinates);
  if (coordinates.accuracyMeters > ORGANIZER_MAX_ACCURACY_METERS) {
    throw new ApiError(
      409,
      `Organizer location accuracy must be ${ORGANIZER_MAX_ACCURACY_METERS} meters or better`,
    );
  }
  const event = await managedEvent(eventId, access);
  if (event.checkInMode === "ONE_WAY" && direction === "CHECK_OUT")
    throw new ApiError(409, "One-way events do not support check-out");
  const correlationId = randomUUID();
  const now = new Date();
  const session = await prisma.$transaction(async (tx) => {
    await tx.attendanceSession.updateMany({
      where: { eventId, status: "OPEN" },
      data: { status: "CLOSED", closedAt: now, closedByUserId: access.userId },
    });
    const created = await tx.attendanceSession.create({
      data: {
        eventId,
        direction,
        centerLatitude: coordinates.latitude,
        centerLongitude: coordinates.longitude,
        centerAccuracyMeters: coordinates.accuracyMeters,
        radiusMeters: event.attendanceRadiusMeters,
        openedByUserId: access.userId,
      },
    });
    await tx.outboxEvent.create({
      data: outboxData(created.id, attendanceRoutingKeys.sessionOpened, correlationId, {
        schemaVersion: 1,
        eventId,
        sessionId: created.id,
        direction,
        occurredAt: now.toISOString(),
        correlationId,
      }),
    });
    return created;
  });
  try {
    await redisClient
      .getClient()
      .set(activeSessionKey(eventId), session.id, "EX", ACTIVE_SESSION_TTL_SECONDS);
  } catch {
    await prisma.attendanceSession.update({
      where: { id: session.id },
      data: { status: "CLOSED", closedAt: new Date(), closedByUserId: access.userId },
    });
    throw new ApiError(503, "Attendance realtime service is unavailable");
  }
  return session;
}

export async function closeSession(access: EventAccess, eventId: string) {
  await managedEvent(eventId, access);
  const current = await prisma.attendanceSession.findFirst({
    where: { eventId, status: "OPEN" },
    orderBy: { openedAt: "desc" },
  });
  if (!current) throw new ApiError(409, "No active attendance session");
  const correlationId = randomUUID();
  const closedAt = new Date();
  const closed = await prisma.$transaction(async (tx) => {
    const updated = await tx.attendanceSession.update({
      where: { id: current.id },
      data: { status: "CLOSED", closedAt, closedByUserId: access.userId },
    });
    await tx.outboxEvent.create({
      data: outboxData(updated.id, attendanceRoutingKeys.sessionClosed, correlationId, {
        schemaVersion: 1,
        eventId,
        sessionId: updated.id,
        direction: updated.direction,
        occurredAt: closedAt.toISOString(),
        correlationId,
      }),
    });
    return updated;
  });
  await redisClient
    .getClient()
    .del(activeSessionKey(eventId))
    .catch(() => undefined);
  return closed;
}

export async function getActiveSession(access: EventAccess, eventId: string) {
  await managedEvent(eventId, access);
  return prisma.attendanceSession.findFirst({
    where: { eventId, status: "OPEN" },
    orderBy: { openedAt: "desc" },
    include: { event: { select: { name: true, timeEnd: true } } },
  });
}

export async function getQr(access: EventAccess, eventId: string) {
  const session = await getActiveSession(access, eventId);
  if (!session) throw new ApiError(409, "No active attendance session");
  const activeId = await redisClient.getClient().get(activeSessionKey(eventId));
  if (activeId !== session.id) throw new ApiError(503, "Attendance session cache is unavailable");
  const qr = createAttendanceQrToken(session.id);
  const origin = env.clientOrigin;
  const query = new URLSearchParams({
    token: qr.token,
    eventId: session.eventId,
    direction: session.direction,
    eventName: session.event.name,
    eventEnd: session.event.timeEnd.toISOString(),
  });
  return {
    ...qr,
    scanUrl: `${origin}/events/check-in?${query.toString()}`,
    session,
  };
}
