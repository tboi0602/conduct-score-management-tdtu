// Client RabbitMQ chuẩn nằm ở config/rabbitmq.ts để API và Worker dùng
// chung một định nghĩa topology. Module này chỉ re-export lại làm điểm
// vào cho phía producer.
export { rabbitClient } from "@rabbitmq";
