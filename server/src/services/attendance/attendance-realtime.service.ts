import { randomUUID } from "crypto";
import type { Response } from "express";
import { prisma } from "@config/prisma";
import { redisClient } from "@redis";
import { sseHub } from "@realtime/sse";
import { eventScope, type EventAccess } from "@services/events/event-access.service";
import { ApiError } from "@utils/ApiError";
import { env } from "@config/env";

const ticketKey = (ticket: string) => `attendance:sse-ticket:${ticket}`;
const ticketTtlSeconds = env.attendanceSseTicketTtlSeconds;
async function issue(channels: string[]) {
  const ticket = randomUUID();
  await redisClient
    .getClient()
    .set(ticketKey(ticket), JSON.stringify(channels), "EX", ticketTtlSeconds);
  return { ticket, expiresInSeconds: ticketTtlSeconds };
}
export function issueStudentTicket(userId: string) {
  return issue([`sse:student:${userId}`]);
}
export async function issueEventTicket(access: EventAccess, eventId: string) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, ...eventScope(access) },
    select: { id: true },
  });
  if (!event) throw new ApiError(404, "Event not found");
  return issue([`sse:event:${eventId}`]);
}
export async function consumeTicket(ticket: string): Promise<string[]> {
  if (!ticket) throw new ApiError(401, "SSE ticket is required");
  const script =
    "local value = redis.call('get', KEYS[1]); if value then redis.call('del', KEYS[1]); end; return value";
  const raw = await redisClient.getClient().eval(script, 1, ticketKey(ticket));
  if (typeof raw !== "string")
    throw new ApiError(401, "SSE ticket is invalid or expired", "SSE_TICKET_EXPIRED");
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string"))
    throw new ApiError(401, "Invalid SSE ticket");
  return parsed;
}
export function connectStream(res: Response, channels: string[]): void {
  sseHub.addClient(res, channels);
}
