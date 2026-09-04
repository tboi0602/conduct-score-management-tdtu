import client from "prom-client";

export const registry = new client.Registry();
// Thu thập sẵn các metric mặc định của Node (CPU, RAM, event loop...).
client.collectDefaultMetrics({ register: registry });

// Metric cho API
// Đếm tổng số request HTTP, phân theo method/route/status.
export const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests processed",
  labelNames: ["method", "route", "status"] as const,
  registers: [registry],
});

// Đo thời gian xử lý mỗi request (giây).
export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"] as const,
  buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5],
  registers: [registry],
});

// ============================================================
// Metric cho Worker / pipeline xử lý điểm danh
// ============================================================

// Đếm số event quét mã đã tiêu thụ từ queue.
// result: ack = thành công, duplicate = trùng lặp,
// retry = đang thử lại, dlq = hỏng nặng đã vào DLQ.
export const attendanceEventsConsumed = new client.Counter({
  name: "attendance_events_consumed_total",
  help: "Attendance scan events consumed from the queue",
  labelNames: ["result"] as const,
  registers: [registry],
});

// Số client SSE đang kết nối tại một thời điểm.
export const sseClientsConnected = new client.Gauge({
  name: "sse_clients_connected",
  help: "Currently connected SSE clients",
  registers: [registry],
});

// Trạng thái kết nối RabbitMQ (1 = đang nối, 0 = mất).
export const rabbitConnected = new client.Gauge({
  name: "rabbitmq_connected",
  help: "1 when the RabbitMQ connection is open",
  registers: [registry],
});

// Trạng thái kết nối Redis (1 = sẵn sàng, 0 = mất).
export const redisConnected = new client.Gauge({
  name: "redis_connected",
  help: "1 when the Redis connection is ready",
  registers: [registry],
});
