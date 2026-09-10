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
  labelNames: ["result", "source", "direction"] as const,
  registers: [registry],
});

export const attendanceQueueRetryTotal = new client.Counter({
  name: "attendance_queue_retry_total",
  help: "Attendance messages routed to a retry queue",
  labelNames: ["reason"] as const,
  registers: [registry],
});

export const attendanceDlqTotal = new client.Counter({
  name: "attendance_dlq_total",
  help: "Attendance messages routed to the dead-letter queue",
  labelNames: ["reason"] as const,
  registers: [registry],
});

export const attendanceScanRequestsTotal = new client.Counter({
  name: "attendance_scan_requests_total",
  help: "Attendance scan requests accepted by the API",
  labelNames: ["source", "direction"] as const,
  registers: [registry],
});

export const attendanceScanHttpDuration = new client.Histogram({
  name: "attendance_scan_http_duration_seconds",
  help: "Attendance scan submission HTTP duration",
  labelNames: ["source", "result"] as const,
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2],
  registers: [registry],
});

export const attendanceRateLimitRejectionsTotal = new client.Counter({
  name: "attendance_rate_limit_rejections_total",
  help: "Attendance scan requests rejected by rate limiting",
  registers: [registry],
});

export const attendanceProcessingDuration = new client.Histogram({
  name: "attendance_processing_duration_seconds",
  help: "Attendance worker processing time",
  labelNames: ["result", "source", "direction"] as const,
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2],
  registers: [registry],
});

export const attendanceOutboxPending = new client.Gauge({
  name: "attendance_outbox_pending",
  help: "Unpublished attendance outbox messages",
  registers: [registry],
});

export const attendanceOutboxPublishTotal = new client.Counter({
  name: "attendance_outbox_publish_total",
  help: "Attendance outbox publish attempts",
  labelNames: ["result"] as const,
  registers: [registry],
});

export const attendanceGeofenceRejections = new client.Counter({
  name: "attendance_geofence_rejections_total",
  help: "Attendance requests rejected by geofence validation",
  labelNames: ["reason"] as const,
  registers: [registry],
});

export const attendanceIdempotencyHits = new client.Counter({
  name: "attendance_idempotency_hits_total",
  help: "Duplicate attendance messages ignored",
  registers: [registry],
});

export const attendanceWorkerInflight = new client.Gauge({
  name: "attendance_worker_inflight",
  help: "Attendance messages currently processed",
  registers: [registry],
});

export const attendanceQrValidationTotal = new client.Counter({
  name: "attendance_qr_validation_total",
  help: "QR token validation results",
  labelNames: ["result"] as const,
  registers: [registry],
});

// Số client SSE đang kết nối tại một thời điểm.
export const sseClientsConnected = new client.Gauge({
  name: "sse_clients_connected",
  help: "Currently connected SSE clients",
  registers: [registry],
});

export const attendanceSseConnections = new client.Gauge({
  name: "attendance_sse_connections",
  help: "Currently connected attendance SSE clients",
  labelNames: ["scope"] as const,
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
