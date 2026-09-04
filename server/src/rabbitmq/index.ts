import { rabbitConnection } from "@rabbitmq/connection";
import { rabbitConsumer } from "@rabbitmq/consumer";
import { publish } from "@rabbitmq/publisher";
import { assertTopology } from "@rabbitmq/topology";

export const rabbitClient = {
  connect: () => rabbitConnection.connect(),
  close: async () => {
    await rabbitConsumer.stop();
    await rabbitConnection.close();
  },
  isConnected: () => rabbitConnection.isConnected(),
  getChannel: () => rabbitConnection.getChannel(),
  assertTopology: () => {
    const channel = rabbitConnection.getChannel();
    if (!channel) throw new Error("[rabbitmq] channel not ready");
    return assertTopology(channel);
  },
  publish,
  consume: (queue: string, handler: import("@rabbitmq/consumer").MessageHandler) =>
    rabbitConsumer.consume(queue, handler),
  stopConsuming: () => rabbitConsumer.stop(),
};

export { RABBITMQ_CONFIG } from "@rabbitmq/config";
export type { MessageHandler } from "@rabbitmq/consumer";
