import { prisma } from "@config/prisma";
import { createPaginationMeta, type PaginationParams } from "@utils/pagination";
import { ApiError } from "@utils/ApiError";

export async function listMine(userId: string, params: PaginationParams) {
  const where = { userId };
  const [total, unread, items] = await prisma.$transaction([
    prisma.userNotification.count({ where }),
    prisma.userNotification.count({ where: { userId, readAt: null } }),
    prisma.userNotification.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: params.skip,
      take: params.limit,
    }),
  ]);
  return { items, unread, pagination: createPaginationMeta(total, params) };
}

export async function markRead(userId: string, id: string) {
  const updated = await prisma.userNotification.updateMany({
    where: { id, userId },
    data: { readAt: new Date() },
  });
  if (!updated.count) throw new ApiError(404, "Notification not found");
  return prisma.userNotification.findUnique({ where: { id } });
}

export async function markAllRead(userId: string) {
  const result = await prisma.userNotification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: result.count };
}
