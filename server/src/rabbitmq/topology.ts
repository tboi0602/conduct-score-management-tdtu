import type { ConfirmChannel } from "amqplib";

import {
  DLX_EXCHANGE,
  RABBITMQ_CONFIG,
  RETRY_EXCHANGE,
} from "@rabbitmq/config";

export async function assertTopology(channel: ConfirmChannel): Promise<void> {
  await channel.assertExchange(RABBITMQ_CONFIG.exchange, "direct", { durable: true });
  await channel.assertExchange(DLX_EXCHANGE, "direct", { durable: true });
  await channel.assertExchange(RETRY_EXCHANGE, "direct", { durable: true });

  for (const queue of Object.values(RABBITMQ_CONFIG.queues)) {
    await channel.assertQueue(queue.name, queue.options);
    for (const binding of queue.bindings) {
      await channel.bindQueue(queue.name, binding.exchange, binding.routingKey);
    }
  }
}
