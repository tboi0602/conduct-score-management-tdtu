import Redis from "ioredis";
import type { Response } from "express";
import { logger } from "../config/logger";
import { REDIS_CONFIG } from "../config/redis";
import { sseClientsConnected } from "../metrics";

/**
 * SSE hub dựa trên Redis Pub/Sub.
 *
 * Khi có nhiều instance API phía sau Nginx, stream SSE của client có thể
 * nằm trên instance khác với instance phát sinh event. Nên publish phải
 * đi qua Redis để mọi instance đều nhận được message, và instance nào
 * đang giữ kết nối sẽ đẩy xuống đúng client.
 *
 * Tên kênh theo quy ước `sse:<scope>`, trong đó scope là id sinh viên,
 * id sự kiện, hoặc "broadcast" cho tất cả mọi người.
 */

// Chu kỳ gửi heartbeat để giữ kết nối SSE không bị ngắt bởi proxy.
const HEARTBEAT_INTERVAL_MS = 25_000;

type SSEClient = {
  id: string;
  res: Response;
  channels: Set<string>;
};

class SSEHub {
  private clients = new Map<string, SSEClient>();
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private heartbeat: NodeJS.Timeout | null = null;
  private seq = 0;

  // Tạo kết nối Redis dùng riêng cho việc publish (lazy).
  private ensurePublisher(): Redis {
    if (!this.publisher) {
      this.publisher = new Redis(REDIS_CONFIG.url);
      this.publisher.on("error", (err) =>
        logger.error(`[sse] publisher error: ${err.message}`),
      );
    }
    return this.publisher;
  }

  // Tạo kết nối Redis dùng riêng cho việc subscribe (lazy).
  private ensureSubscriber(): Redis {
    if (this.subscriber) return this.subscriber;

    this.subscriber = new Redis(REDIS_CONFIG.url);
    this.subscriber.on("error", (err) =>
      logger.error(`[sse] subscriber error: ${err.message}`),
    );
    // Khi nhận message từ Redis, đẩy xuống mọi client đang đăng ký kênh đó.
    this.subscriber.on("message", (channel, raw) => {
      for (const client of this.clients.values()) {
        if (client.channels.has(channel) && !client.res.writableEnded) {
          client.res.write(`event: message\ndata: ${raw}\n\n`);
        }
      }
    });
    return this.subscriber;
  }

  // Khởi động heartbeat (chỉ chạy 1 lần cho dù có nhiều client).
  private startHeartbeat(): void {
    if (this.heartbeat) return;
    this.heartbeat = setInterval(() => {
      for (const client of this.clients.values()) {
        if (!client.res.writableEnded) client.res.write(": ping\n\n");
      }
    }, HEARTBEAT_INTERVAL_MS);
    this.heartbeat.unref();
  }

  // Publish một event SSE đến tất cả instance qua Redis.
  async publish(channel: string, payload: Record<string, unknown>): Promise<void> {
    await this.ensurePublisher().publish(channel, JSON.stringify(payload));
  }

  // Gắn một HTTP response thành stream SSE và đăng ký các kênh lắng nghe.
  addClient(res: Response, channels: string[]): void {
    this.ensureSubscriber();
    this.startHeartbeat();

    const id = `${Date.now()}-${++this.seq}`;
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Báo Nginx không buffer response, SSE cần đẩy ngay lập tức.
      "X-Accel-Buffering": "no",
    });
    res.write(`event: connected\ndata: {"id":"${id}"}\n\n`);

    this.clients.set(id, { id, res, channels: new Set(channels) });
    sseClientsConnected.set(this.clients.size);
    logger.debug(`[sse] client ${id} connected on ${channels.join(",")}`);

    // Dọn dẹp khi client ngắt kết nối.
    res.on("close", () => {
      this.clients.delete(id);
      sseClientsConnected.set(this.clients.size);
      logger.debug(`[sse] client ${id} disconnected`);
    });
  }

  // Đóng toàn bộ hub: ngừng heartbeat, ngắt mọi client và Redis.
  async close(): Promise<void> {
    if (this.heartbeat) clearInterval(this.heartbeat);
    for (const client of this.clients.values()) client.res.end();
    this.clients.clear();
    sseClientsConnected.set(0);
    await Promise.all([
      this.publisher?.quit(),
      this.subscriber?.quit(),
    ]).catch(() => undefined);
    this.publisher = null;
    this.subscriber = null;
  }
}

export const sseHub = new SSEHub();
