// The canonical RabbitMQ client lives in config/rabbitmq.ts so that the
// API and Worker share one topology definition. This module re-exports it
// as the producer entry point.
export { rabbitClient } from "../config/rabbitmq";
