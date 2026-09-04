import { randomUUID } from "crypto";

import { RABBITMQ_CONFIG } from "@rabbitmq/config";
import { rabbitConnection } from "@rabbitmq/connection";

export function publish(
  routingKey: string,
  payload: Record<string, unknown>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const channel = rabbitConnection.getChannel();
    if (!channel) return reject(new Error("[rabbitmq] publish before connect"));

    channel.publish(
      RABBITMQ_CONFIG.exchange,
      routingKey,
      Buffer.from(JSON.stringify(payload)),
      {
        persistent: true,
        contentType: "application/json",
        messageId: randomUUID(),
        timestamp: Math.floor(Date.now() / 1000),
      },
      (error) => (error ? reject(error) : resolve()),
    );
  });
}
